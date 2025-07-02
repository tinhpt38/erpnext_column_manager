/**
 * Data Handler
 * Xử lý việc fetch và cache dữ liệu cho các cột tùy chỉnh
 */

class DataHandler {
    constructor(doctype) {
        this.doctype = doctype;
        this.cache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
        this.batchSize = 20;
        this.pendingRequests = new Map();
    }
    
    /**
     * Fetch dữ liệu cho các cột tùy chỉnh
     */
    async fetchCustomColumnData(customColumns, docNames = null) {
        if (!customColumns || customColumns.length === 0) {
            return {};
        }
        
        // Lấy danh sách documents hiện tại nếu không được cung cấp
        if (!docNames) {
            docNames = this.getCurrentDocNames();
        }
        
        const results = {};
        
        // Process từng custom column
        for (const column of customColumns) {
            try {
                const columnData = await this.fetchColumnData(column, docNames);
                results[column.id] = columnData;
            } catch (error) {
                console.error(`Error fetching data for column ${column.id}:`, error);
                results[column.id] = {};
            }
        }
        
        return results;
    }
    
    /**
     * Fetch dữ liệu cho một cột cụ thể
     */
    async fetchColumnData(column, docNames) {
        const cacheKey = `${column.id}_${docNames.join(',')}`;
        
        // Check cache
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey);
            if (Date.now() - cached.timestamp < this.cacheTimeout) {
                return cached.data;
            }
        }
        
        // Check pending requests
        if (this.pendingRequests.has(cacheKey)) {
            return await this.pendingRequests.get(cacheKey);
        }
        
        // Create new request
        const requestPromise = this.executeColumnQuery(column, docNames);
        this.pendingRequests.set(cacheKey, requestPromise);
        
        try {
            const data = await requestPromise;
            
            // Cache result
            this.cache.set(cacheKey, {
                data: data,
                timestamp: Date.now()
            });
            
            return data;
            
        } finally {
            this.pendingRequests.delete(cacheKey);
        }
    }
    
    /**
     * Thực thi query cho cột
     */
    async executeColumnQuery(column, docNames) {
        if (column.source_query) {
            return await this.executeCustomQuery(column, docNames);
        } else if (column.fieldname) {
            return await this.fetchFieldData(column, docNames);
        } else if (column.formula) {
            return await this.calculateFormula(column, docNames);
        }
        
        return {};
    }
    
    /**
     * Thực thi custom query
     */
    async executeCustomQuery(column, docNames) {
        const results = {};
        
        // Batch process để tránh quá tải
        for (let i = 0; i < docNames.length; i += this.batchSize) {
            const batch = docNames.slice(i, i + this.batchSize);
            
            try {
                const response = await frappe.call({
                    method: 'frappe.client.sql',
                    args: {
                        query: column.source_query,
                        values: {
                            doc_names: batch,
                            doctype: this.doctype
                        }
                    }
                });
                
                if (response.message) {
                    // Process query results
                    response.message.forEach(row => {
                        if (row.length >= 2) {
                            const docName = row[0];
                            const value = row[1];
                            results[docName] = this.formatValue(value, column.fieldtype);
                        }
                    });
                }
                
            } catch (error) {
                console.error(`Error executing custom query for ${column.id}:`, error);
                
                // Set default values for failed batch
                batch.forEach(docName => {
                    results[docName] = this.getDefaultValue(column.fieldtype);
                });
            }
        }
        
        return results;
    }
    
    /**
     * Fetch dữ liệu từ field có sẵn
     */
    async fetchFieldData(column, docNames) {
        const results = {};
        
        try {
            const response = await frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: this.doctype,
                    fields: ['name', column.fieldname],
                    filters: [['name', 'in', docNames]],
                    limit_page_length: docNames.length
                }
            });
            
            if (response.message) {
                response.message.forEach(doc => {
                    results[doc.name] = this.formatValue(doc[column.fieldname], column.fieldtype);
                });
            }
            
        } catch (error) {
            console.error(`Error fetching field data for ${column.fieldname}:`, error);
            
            // Set default values
            docNames.forEach(docName => {
                results[docName] = this.getDefaultValue(column.fieldtype);
            });
        }
        
        return results;
    }
    
    /**
     * Tính toán formula
     */
    async calculateFormula(column, docNames) {
        const results = {};
        
        // Lấy dữ liệu cần thiết cho formula
        const requiredFields = this.extractFieldsFromFormula(column.formula);
        
        if (requiredFields.length === 0) {
            docNames.forEach(docName => {
                results[docName] = this.getDefaultValue(column.fieldtype);
            });
            return results;
        }
        
        try {
            const response = await frappe.call({
                method: 'frappe.client.get_list',
                args: {
                    doctype: this.doctype,
                    fields: ['name', ...requiredFields],
                    filters: [['name', 'in', docNames]],
                    limit_page_length: docNames.length
                }
            });
            
            if (response.message) {
                response.message.forEach(doc => {
                    try {
                        const value = this.evaluateFormula(column.formula, doc);
                        results[doc.name] = this.formatValue(value, column.fieldtype);
                    } catch (error) {
                        console.error(`Error evaluating formula for ${doc.name}:`, error);
                        results[doc.name] = this.getDefaultValue(column.fieldtype);
                    }
                });
            }
            
        } catch (error) {
            console.error(`Error calculating formula for ${column.id}:`, error);
            
            docNames.forEach(docName => {
                results[docName] = this.getDefaultValue(column.fieldtype);
            });
        }
        
        return results;
    }
    
    /**
     * Extract field names từ formula
     */
    extractFieldsFromFormula(formula) {
        const fieldPattern = /\{(\w+)\}/g;
        const fields = [];
        let match;
        
        while ((match = fieldPattern.exec(formula)) !== null) {
            if (!fields.includes(match[1])) {
                fields.push(match[1]);
            }
        }
        
        return fields;
    }
    
    /**
     * Evaluate formula với dữ liệu document
     */
    evaluateFormula(formula, doc) {
        let expression = formula;
        
        // Replace field placeholders với values
        const fieldPattern = /\{(\w+)\}/g;
        expression = expression.replace(fieldPattern, (match, fieldName) => {
            const value = doc[fieldName];
            return value !== null && value !== undefined ? value : 0;
        });
        
        // Safe evaluation (chỉ cho phép các operation cơ bản)
        if (this.isSafeExpression(expression)) {
            try {
                return Function(`"use strict"; return (${expression})`)();
            } catch (error) {
                console.error('Formula evaluation error:', error);
                return 0;
            }
        }
        
        return 0;
    }
    
    /**
     * Kiểm tra expression có an toàn không
     */
    isSafeExpression(expression) {
        // Chỉ cho phép numbers, operators, parentheses, và một số functions cơ bản
        const safePattern = /^[0-9+\-*/.() \t\n\r]+$/;
        const dangerousPatterns = [
            /eval/i,
            /function/i,
            /return/i,
            /var/i,
            /let/i,
            /const/i,
            /import/i,
            /require/i,
            /process/i,
            /global/i,
            /window/i,
            /document/i
        ];
        
        if (!safePattern.test(expression)) {
            return false;
        }
        
        for (const pattern of dangerousPatterns) {
            if (pattern.test(expression)) {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Format value theo field type
     */
    formatValue(value, fieldtype) {
        if (value === null || value === undefined) {
            return this.getDefaultValue(fieldtype);
        }
        
        switch (fieldtype) {
            case 'Currency':
                return frappe.format(value, { fieldtype: 'Currency' });
            
            case 'Float':
                return parseFloat(value) || 0;
            
            case 'Int':
                return parseInt(value) || 0;
            
            case 'Percent':
                return `${(parseFloat(value) || 0).toFixed(2)}%`;
            
            case 'Date':
                return frappe.format(value, { fieldtype: 'Date' });
            
            case 'Datetime':
                return frappe.format(value, { fieldtype: 'Datetime' });
            
            case 'Check':
                return value ? '✓' : '';
            
            case 'Link':
                return `<a href="/app/${value.toLowerCase().replace(/\s+/g, '-')}/${encodeURIComponent(value)}">${value}</a>`;
            
            default:
                return String(value);
        }
    }
    
    /**
     * Lấy default value cho field type
     */
    getDefaultValue(fieldtype) {
        switch (fieldtype) {
            case 'Currency':
            case 'Float':
            case 'Int':
                return 0;
            
            case 'Percent':
                return '0%';
            
            case 'Check':
                return '';
            
            case 'Date':
            case 'Datetime':
                return '';
            
            default:
                return '';
        }
    }
    
    /**
     * Lấy danh sách document names hiện tại
     */
    getCurrentDocNames() {
        const docNames = [];
        
        // Từ list view hiện tại
        if (window.cur_list && window.cur_list.data) {
            window.cur_list.data.forEach(doc => {
                if (doc.name) {
                    docNames.push(doc.name);
                }
            });
        }
        
        return docNames;
    }
    
    /**
     * Clear cache
     */
    clearCache() {
        this.cache.clear();
        this.pendingRequests.clear();
        
        frappe.show_alert({
            message: 'Đã xóa cache dữ liệu cột',
            indicator: 'blue'
        });
    }
    
    /**
     * Preload dữ liệu cho các cột
     */
    async preloadData(columns, docNames) {
        const customColumns = columns.filter(col => col.is_custom);
        
        if (customColumns.length === 0) {
            return;
        }
        
        try {
            await this.fetchCustomColumnData(customColumns, docNames);
            console.log('Data preloaded for custom columns');
        } catch (error) {
            console.error('Error preloading data:', error);
        }
    }
    
    /**
     * Invalidate cache cho một document cụ thể
     */
    invalidateDocumentCache(docName) {
        const keysToDelete = [];
        
        for (const key of this.cache.keys()) {
            if (key.includes(docName)) {
                keysToDelete.push(key);
            }
        }
        
        keysToDelete.forEach(key => {
            this.cache.delete(key);
        });
    }
    
    /**
     * Lấy thống kê cache
     */
    getCacheStats() {
        const stats = {
            totalEntries: this.cache.size,
            pendingRequests: this.pendingRequests.size,
            cacheHitRate: 0,
            memoryUsage: 0
        };
        
        // Tính memory usage (ước tính)
        for (const [key, value] of this.cache.entries()) {
            stats.memoryUsage += JSON.stringify({ key, value }).length;
        }
        
        return stats;
    }
    
    /**
     * Cleanup expired cache entries
     */
    cleanupExpiredCache() {
        const now = Date.now();
        const expiredKeys = [];
        
        for (const [key, value] of this.cache.entries()) {
            if (now - value.timestamp > this.cacheTimeout) {
                expiredKeys.push(key);
            }
        }
        
        expiredKeys.forEach(key => {
            this.cache.delete(key);
        });
        
        if (expiredKeys.length > 0) {
            console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
        }
        
        return expiredKeys.length;
    }
    
    /**
     * Set cache timeout
     */
    setCacheTimeout(timeoutMs) {
        this.cacheTimeout = timeoutMs;
        console.log(`Cache timeout set to ${timeoutMs}ms`);
    }
    
    /**
     * Set batch size
     */
    setBatchSize(size) {
        this.batchSize = Math.max(1, Math.min(100, size));
        console.log(`Batch size set to ${this.batchSize}`);
    }
}

// Make DataHandler available globally
window.DataHandler = DataHandler;

