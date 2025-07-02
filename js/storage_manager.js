/**
 * Storage Manager
 * Quản lý việc lưu trữ và đồng bộ cấu hình cột
 */

class StorageManager {
    constructor(doctype) {
        this.doctype = doctype;
        this.storageKey = `column_config_${doctype}`;
        this.userStorageKey = `column_config_${doctype}_${frappe.session.user}`;
        this.syncEnabled = false; // Có thể bật để sync với server
    }
    
    /**
     * Lưu cấu hình vào localStorage
     */
    saveConfiguration(config) {
        try {
            // Lưu theo user
            localStorage.setItem(this.userStorageKey, JSON.stringify(config));
            
            // Lưu global backup
            localStorage.setItem(this.storageKey, JSON.stringify(config));
            
            // Sync với server nếu được bật
            if (this.syncEnabled) {
                this.syncToServer(config);
            }
            
            console.log(`Configuration saved for ${this.doctype}`);
            return true;
            
        } catch (error) {
            console.error('Error saving configuration:', error);
            frappe.show_alert({
                message: 'Lỗi khi lưu cấu hình cột',
                indicator: 'red'
            });
            return false;
        }
    }
    
    /**
     * Tải cấu hình từ localStorage
     */
    loadConfiguration() {
        try {
            // Ưu tiên cấu hình theo user
            let config = localStorage.getItem(this.userStorageKey);
            
            if (!config) {
                // Fallback to global config
                config = localStorage.getItem(this.storageKey);
            }
            
            if (config) {
                const parsed = JSON.parse(config);
                
                // Validate configuration
                if (this.validateConfiguration(parsed)) {
                    console.log(`Configuration loaded for ${this.doctype}`);
                    return parsed;
                }
            }
            
            // Sync từ server nếu không có local config
            if (this.syncEnabled) {
                return this.syncFromServer();
            }
            
            return null;
            
        } catch (error) {
            console.error('Error loading configuration:', error);
            return null;
        }
    }
    
    /**
     * Validate cấu hình
     */
    validateConfiguration(config) {
        if (!config || typeof config !== 'object') {
            return false;
        }
        
        // Check required fields
        if (!config.doctype || !Array.isArray(config.columns)) {
            return false;
        }
        
        // Check if doctype matches
        if (config.doctype !== this.doctype) {
            return false;
        }
        
        // Validate columns structure
        for (const column of config.columns) {
            if (!column.id || !column.label || typeof column.visible !== 'boolean') {
                return false;
            }
        }
        
        return true;
    }
    
    /**
     * Xóa cấu hình
     */
    clearConfiguration() {
        try {
            localStorage.removeItem(this.userStorageKey);
            localStorage.removeItem(this.storageKey);
            
            if (this.syncEnabled) {
                this.deleteFromServer();
            }
            
            console.log(`Configuration cleared for ${this.doctype}`);
            return true;
            
        } catch (error) {
            console.error('Error clearing configuration:', error);
            return false;
        }
    }
    
    /**
     * Lấy danh sách tất cả cấu hình đã lưu
     */
    getAllConfigurations() {
        const configs = {};
        
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            
            if (key && key.startsWith('column_config_')) {
                try {
                    const config = JSON.parse(localStorage.getItem(key));
                    if (config && config.doctype) {
                        configs[config.doctype] = config;
                    }
                } catch (error) {
                    console.error(`Error parsing config for key ${key}:`, error);
                }
            }
        }
        
        return configs;
    }
    
    /**
     * Backup tất cả cấu hình
     */
    backupAllConfigurations() {
        const configs = this.getAllConfigurations();
        const backup = {
            timestamp: new Date().toISOString(),
            user: frappe.session.user,
            configurations: configs,
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `column_configs_backup_${new Date().toISOString().split('T')[0]}.json`;
        a.click();
        URL.revokeObjectURL(url);
        
        frappe.show_alert({
            message: 'Đã backup tất cả cấu hình cột',
            indicator: 'green'
        });
    }
    
    /**
     * Restore từ backup
     */
    restoreFromBackup(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const backup = JSON.parse(e.target.result);
                
                if (!backup.configurations || typeof backup.configurations !== 'object') {
                    throw new Error('Invalid backup format');
                }
                
                let restoredCount = 0;
                
                for (const [doctype, config] of Object.entries(backup.configurations)) {
                    if (this.validateConfiguration(config)) {
                        const storageKey = `column_config_${doctype}_${frappe.session.user}`;
                        localStorage.setItem(storageKey, JSON.stringify(config));
                        restoredCount++;
                    }
                }
                
                frappe.show_alert({
                    message: `Đã restore ${restoredCount} cấu hình`,
                    indicator: 'green'
                });
                
            } catch (error) {
                console.error('Error restoring backup:', error);
                frappe.msgprint('Lỗi khi restore backup');
            }
        };
        reader.readAsText(file);
    }
    
    /**
     * Sync cấu hình lên server
     */
    async syncToServer(config) {
        if (!this.syncEnabled) return;
        
        try {
            await frappe.call({
                method: 'frappe.client.set_value',
                args: {
                    doctype: 'User',
                    name: frappe.session.user,
                    fieldname: `column_config_${this.doctype}`,
                    value: JSON.stringify(config)
                }
            });
            
            console.log(`Configuration synced to server for ${this.doctype}`);
            
        } catch (error) {
            console.error('Error syncing to server:', error);
        }
    }
    
    /**
     * Sync cấu hình từ server
     */
    async syncFromServer() {
        if (!this.syncEnabled) return null;
        
        try {
            const response = await frappe.call({
                method: 'frappe.client.get_value',
                args: {
                    doctype: 'User',
                    name: frappe.session.user,
                    fieldname: `column_config_${this.doctype}`
                }
            });
            
            if (response.message && response.message[`column_config_${this.doctype}`]) {
                const config = JSON.parse(response.message[`column_config_${this.doctype}`]);
                
                if (this.validateConfiguration(config)) {
                    // Save to localStorage
                    localStorage.setItem(this.userStorageKey, JSON.stringify(config));
                    console.log(`Configuration synced from server for ${this.doctype}`);
                    return config;
                }
            }
            
            return null;
            
        } catch (error) {
            console.error('Error syncing from server:', error);
            return null;
        }
    }
    
    /**
     * Xóa cấu hình từ server
     */
    async deleteFromServer() {
        if (!this.syncEnabled) return;
        
        try {
            await frappe.call({
                method: 'frappe.client.set_value',
                args: {
                    doctype: 'User',
                    name: frappe.session.user,
                    fieldname: `column_config_${this.doctype}`,
                    value: null
                }
            });
            
            console.log(`Configuration deleted from server for ${this.doctype}`);
            
        } catch (error) {
            console.error('Error deleting from server:', error);
        }
    }
    
    /**
     * Bật/tắt sync với server
     */
    enableServerSync(enable = true) {
        this.syncEnabled = enable;
        
        if (enable) {
            frappe.show_alert({
                message: 'Đã bật đồng bộ với server',
                indicator: 'blue'
            });
        } else {
            frappe.show_alert({
                message: 'Đã tắt đồng bộ với server',
                indicator: 'orange'
            });
        }
    }
    
    /**
     * Lấy thông tin storage usage
     */
    getStorageInfo() {
        const configs = this.getAllConfigurations();
        const totalSize = JSON.stringify(configs).length;
        const configCount = Object.keys(configs).length;
        
        return {
            totalConfigurations: configCount,
            totalSize: totalSize,
            sizeFormatted: this.formatBytes(totalSize),
            syncEnabled: this.syncEnabled,
            lastModified: this.getLastModified()
        };
    }
    
    /**
     * Lấy thời gian sửa đổi cuối cùng
     */
    getLastModified() {
        try {
            const config = localStorage.getItem(this.userStorageKey);
            if (config) {
                const parsed = JSON.parse(config);
                return parsed.timestamp || null;
            }
        } catch (error) {
            console.error('Error getting last modified:', error);
        }
        return null;
    }
    
    /**
     * Format bytes thành string dễ đọc
     */
    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    /**
     * Cleanup old configurations
     */
    cleanupOldConfigurations(daysOld = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - daysOld);
        
        let cleanedCount = 0;
        
        for (let i = localStorage.length - 1; i >= 0; i--) {
            const key = localStorage.key(i);
            
            if (key && key.startsWith('column_config_')) {
                try {
                    const config = JSON.parse(localStorage.getItem(key));
                    if (config && config.timestamp) {
                        const configDate = new Date(config.timestamp);
                        if (configDate < cutoffDate) {
                            localStorage.removeItem(key);
                            cleanedCount++;
                        }
                    }
                } catch (error) {
                    // Remove invalid configs
                    localStorage.removeItem(key);
                    cleanedCount++;
                }
            }
        }
        
        if (cleanedCount > 0) {
            frappe.show_alert({
                message: `Đã dọn dẹp ${cleanedCount} cấu hình cũ`,
                indicator: 'blue'
            });
        }
        
        return cleanedCount;
    }
}

// Make StorageManager available globally
window.StorageManager = StorageManager;

