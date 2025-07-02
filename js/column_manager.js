/**
 * ERPNext Enhanced Column Manager
 * Core module để quản lý cột trong List View
 */

class ColumnManager {
    constructor(listView) {
        this.listView = listView;
        this.doctype = listView.doctype;
        this.columns = [];
        this.originalColumns = [];
        this.settings = {
            maxColumns: 20,
            autoResize: true,
            horizontalScroll: true,
            compactMode: false
        };
        
        this.storageManager = new StorageManager(this.doctype);
        this.dataHandler = new DataHandler(this.doctype);
        this.configUI = null;
        
        this.init();
    }
    
    /**
     * Khởi tạo Column Manager
     */
    init() {
        this.loadConfiguration();
        this.injectColumnManagerButton();
        this.overrideListViewRender();
        this.bindEvents();
        
        console.log(`Column Manager initialized for ${this.doctype}`);
    }
    
    /**
     * Tải cấu hình cột từ storage
     */
    loadConfiguration() {
        const savedConfig = this.storageManager.loadConfiguration();
        if (savedConfig) {
            this.columns = savedConfig.columns || [];
            this.settings = { ...this.settings, ...savedConfig.settings };
        }
        
        // Backup original columns
        this.originalColumns = this.getOriginalColumns();
        
        // Merge với original columns nếu chưa có cấu hình
        if (this.columns.length === 0) {
            this.columns = this.originalColumns.map((col, index) => ({
                id: col.fieldname || col.label.toLowerCase().replace(/\s+/g, '_'),
                label: col.label,
                fieldname: col.fieldname,
                fieldtype: col.fieldtype || 'Data',
                width: col.width || 150,
                visible: true,
                order: index,
                formatter: null,
                is_custom: false
            }));
        }
    }
    
    /**
     * Lấy danh sách cột gốc từ Frappe
     */
    getOriginalColumns() {
        const meta = frappe.get_meta(this.doctype);
        const listSettings = frappe.listview_settings[this.doctype] || {};
        
        let columns = [];
        
        // Lấy từ list settings
        if (listSettings.add_fields) {
            listSettings.add_fields.forEach(fieldname => {
                const field = meta.fields.find(f => f.fieldname === fieldname);
                if (field) {
                    columns.push({
                        label: field.label,
                        fieldname: field.fieldname,
                        fieldtype: field.fieldtype,
                        width: this.getFieldWidth(field.fieldtype)
                    });
                }
            });
        }
        
        // Thêm các trường mặc định
        const defaultFields = ['name', 'creation', 'modified'];
        defaultFields.forEach(fieldname => {
            if (!columns.find(c => c.fieldname === fieldname)) {
                const field = meta.fields.find(f => f.fieldname === fieldname) || 
                             { fieldname, label: fieldname.charAt(0).toUpperCase() + fieldname.slice(1), fieldtype: 'Data' };
                columns.push({
                    label: field.label,
                    fieldname: field.fieldname,
                    fieldtype: field.fieldtype,
                    width: this.getFieldWidth(field.fieldtype)
                });
            }
        });
        
        return columns;
    }
    
    /**
     * Tính toán độ rộng mặc định cho field type
     */
    getFieldWidth(fieldtype) {
        const widthMap = {
            'Check': 80,
            'Int': 100,
            'Float': 120,
            'Currency': 130,
            'Percent': 100,
            'Date': 120,
            'Datetime': 160,
            'Time': 100,
            'Link': 150,
            'Select': 130,
            'Data': 150,
            'Text': 200,
            'Small Text': 250,
            'Long Text': 300,
            'Text Editor': 300
        };
        
        return widthMap[fieldtype] || 150;
    }
    
    /**
     * Thêm nút Column Manager vào toolbar
     */
    injectColumnManagerButton() {
        const toolbar = this.listView.page.page_actions;
        
        const columnManagerBtn = $(`
            <button class="btn btn-default btn-sm column-manager-btn" 
                    title="Quản lý cột">
                <i class="fa fa-columns"></i>
                <span class="hidden-xs"> Quản lý cột</span>
            </button>
        `);
        
        columnManagerBtn.on('click', () => {
            this.openColumnManager();
        });
        
        toolbar.prepend(columnManagerBtn);
        
        // Thêm quick add column dropdown
        const addColumnBtn = $(`
            <div class="btn-group">
                <button class="btn btn-default btn-sm dropdown-toggle" 
                        data-toggle="dropdown" title="Thêm cột nhanh">
                    <i class="fa fa-plus"></i>
                    <span class="hidden-xs"> Thêm cột</span>
                    <span class="caret"></span>
                </button>
                <ul class="dropdown-menu" id="quick-add-column-menu">
                    <li><a href="#" data-fieldname="loading">Đang tải...</a></li>
                </ul>
            </div>
        `);
        
        toolbar.prepend(addColumnBtn);
        
        // Load available fields for quick add
        this.loadQuickAddFields();
    }
    
    /**
     * Tải danh sách trường có thể thêm nhanh
     */
    loadQuickAddFields() {
        const meta = frappe.get_meta(this.doctype);
        const availableFields = meta.fields.filter(field => 
            !this.columns.find(col => col.fieldname === field.fieldname) &&
            ['Data', 'Link', 'Select', 'Int', 'Float', 'Currency', 'Check', 'Date'].includes(field.fieldtype)
        );
        
        const menu = $('#quick-add-column-menu');
        menu.empty();
        
        if (availableFields.length === 0) {
            menu.append('<li><a href="#">Không có trường nào</a></li>');
            return;
        }
        
        availableFields.slice(0, 10).forEach(field => {
            const item = $(`<a href="#" data-fieldname="${field.fieldname}">${field.label}</a>`);
            item.on('click', (e) => {
                e.preventDefault();
                this.addColumn(field);
            });
            menu.append($('<li>').append(item));
        });
        
        if (availableFields.length > 10) {
            menu.append('<li class="divider"></li>');
            menu.append('<li><a href="#" class="open-full-manager">Xem tất cả...</a></li>');
            menu.find('.open-full-manager').on('click', (e) => {
                e.preventDefault();
                this.openColumnManager();
            });
        }
    }
    
    /**
     * Override render method của List View
     */
    overrideListViewRender() {
        const originalRender = this.listView.render.bind(this.listView);
        
        this.listView.render = () => {
            originalRender();
            this.applyCustomColumns();
        };
        
        // Override get_list_row_html nếu có thể
        if (this.listView.get_list_row_html) {
            const originalGetRowHtml = this.listView.get_list_row_html.bind(this.listView);
            
            this.listView.get_list_row_html = (doc) => {
                const html = originalGetRowHtml(doc);
                return this.modifyRowHtml(html, doc);
            };
        }
    }
    
    /**
     * Áp dụng cấu hình cột tùy chỉnh
     */
    applyCustomColumns() {
        if (!this.listView.$result || this.columns.length === 0) return;
        
        const $listContainer = this.listView.$result.find('.list-row-container');
        if ($listContainer.length === 0) return;
        
        // Remove Bootstrap column limitations
        this.removeBootstrapLimitations();
        
        // Apply custom column widths and visibility
        this.applyColumnStyles();
        
        // Add custom columns
        this.renderCustomColumns();
        
        // Enable horizontal scroll if needed
        if (this.settings.horizontalScroll) {
            this.enableHorizontalScroll();
        }
    }
    
    /**
     * Loại bỏ giới hạn 12 cột của Bootstrap
     */
    removeBootstrapLimitations() {
        const style = `
            <style id="column-manager-override">
                .list-row-container {
                    display: flex !important;
                    flex-wrap: nowrap !important;
                    width: max-content !important;
                    min-width: 100% !important;
                }
                
                .list-row-col {
                    flex: 0 0 auto !important;
                    width: var(--column-width, 150px) !important;
                    max-width: none !important;
                    padding: 0 8px !important;
                    border-right: 1px solid #e7e7e7;
                }
                
                .list-row-col:last-child {
                    border-right: none;
                }
                
                .custom-column {
                    background-color: #f8f9ff !important;
                    border-left: 2px solid #4285f4 !important;
                }
                
                .list-row-head {
                    position: sticky;
                    top: 0;
                    background: white;
                    z-index: 10;
                    box-shadow: 0 2px 4px rgba(0,0,0,0.1);
                }
                
                .column-resizer {
                    position: absolute;
                    right: 0;
                    top: 0;
                    bottom: 0;
                    width: 4px;
                    cursor: col-resize;
                    background: transparent;
                    z-index: 5;
                }
                
                .column-resizer:hover {
                    background: #4285f4;
                }
                
                .column-header {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    user-select: none;
                }
                
                .column-menu {
                    opacity: 0;
                    transition: opacity 0.2s;
                    cursor: pointer;
                    padding: 2px 4px;
                    border-radius: 2px;
                }
                
                .column-header:hover .column-menu {
                    opacity: 1;
                }
                
                .column-menu:hover {
                    background: #e7e7e7;
                }
            </style>
        `;
        
        if ($('#column-manager-override').length === 0) {
            $('head').append(style);
        }
    }
    
    /**
     * Áp dụng style cho các cột
     */
    applyColumnStyles() {
        this.columns.forEach((column, index) => {
            const $col = this.listView.$result.find(`.list-row-col:nth-child(${index + 1})`);
            if ($col.length > 0) {
                $col.css('--column-width', `${column.width}px`);
                $col.toggle(column.visible);
                
                if (column.is_custom) {
                    $col.addClass('custom-column');
                }
            }
        });
    }
    
    /**
     * Render các cột tùy chỉnh
     */
    renderCustomColumns() {
        const customColumns = this.columns.filter(col => col.is_custom);
        if (customColumns.length === 0) return;
        
        // Fetch data for custom columns
        this.dataHandler.fetchCustomColumnData(customColumns)
            .then(data => {
                this.renderCustomColumnData(data);
            })
            .catch(err => {
                console.error('Error fetching custom column data:', err);
            });
    }
    
    /**
     * Render dữ liệu cho cột tùy chỉnh
     */
    renderCustomColumnData(data) {
        // Implementation sẽ được hoàn thiện trong phase tiếp theo
        console.log('Custom column data:', data);
    }
    
    /**
     * Bật horizontal scroll
     */
    enableHorizontalScroll() {
        const $wrapper = this.listView.$result.find('.frappe-list');
        $wrapper.css({
            'overflow-x': 'auto',
            'overflow-y': 'visible'
        });
    }
    
    /**
     * Bind các events
     */
    bindEvents() {
        // Column resize
        $(document).on('mousedown', '.column-resizer', (e) => {
            this.startColumnResize(e);
        });
        
        // Column context menu
        $(document).on('contextmenu', '.column-header', (e) => {
            e.preventDefault();
            this.showColumnContextMenu(e);
        });
        
        // Save configuration on page unload
        $(window).on('beforeunload', () => {
            this.saveConfiguration();
        });
    }
    
    /**
     * Bắt đầu resize cột
     */
    startColumnResize(e) {
        const $resizer = $(e.target);
        const $column = $resizer.closest('.list-row-col');
        const columnIndex = $column.index();
        const startX = e.pageX;
        const startWidth = $column.width();
        
        $(document).on('mousemove.column-resize', (e) => {
            const newWidth = Math.max(80, startWidth + (e.pageX - startX));
            $column.css('--column-width', `${newWidth}px`);
            
            // Update configuration
            if (this.columns[columnIndex]) {
                this.columns[columnIndex].width = newWidth;
            }
        });
        
        $(document).on('mouseup.column-resize', () => {
            $(document).off('.column-resize');
            this.saveConfiguration();
        });
    }
    
    /**
     * Hiển thị context menu cho cột
     */
    showColumnContextMenu(e) {
        const $header = $(e.target).closest('.column-header');
        const columnIndex = $header.closest('.list-row-col').index();
        const column = this.columns[columnIndex];
        
        if (!column) return;
        
        const menu = $(`
            <div class="column-context-menu" style="
                position: fixed;
                top: ${e.pageY}px;
                left: ${e.pageX}px;
                background: white;
                border: 1px solid #ccc;
                border-radius: 4px;
                box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                z-index: 1000;
                min-width: 150px;
            ">
                <div class="menu-item" data-action="hide">Ẩn cột</div>
                <div class="menu-item" data-action="sort-asc">Sắp xếp tăng dần</div>
                <div class="menu-item" data-action="sort-desc">Sắp xếp giảm dần</div>
                <div class="menu-item" data-action="filter">Lọc theo cột này</div>
                <div class="menu-divider"></div>
                <div class="menu-item" data-action="move-left">Di chuyển trái</div>
                <div class="menu-item" data-action="move-right">Di chuyển phải</div>
                <div class="menu-divider"></div>
                <div class="menu-item" data-action="remove">Xóa cột</div>
            </div>
        `);
        
        menu.find('.menu-item').on('click', (e) => {
            const action = $(e.target).data('action');
            this.handleColumnAction(action, column, columnIndex);
            menu.remove();
        });
        
        $('body').append(menu);
        
        // Remove menu when clicking outside
        setTimeout(() => {
            $(document).one('click', () => menu.remove());
        }, 100);
    }
    
    /**
     * Xử lý action từ context menu
     */
    handleColumnAction(action, column, columnIndex) {
        switch (action) {
            case 'hide':
                this.hideColumn(columnIndex);
                break;
            case 'sort-asc':
                this.sortByColumn(column.fieldname, 'asc');
                break;
            case 'sort-desc':
                this.sortByColumn(column.fieldname, 'desc');
                break;
            case 'filter':
                this.filterByColumn(column.fieldname);
                break;
            case 'move-left':
                this.moveColumn(columnIndex, columnIndex - 1);
                break;
            case 'move-right':
                this.moveColumn(columnIndex, columnIndex + 1);
                break;
            case 'remove':
                this.removeColumn(columnIndex);
                break;
        }
    }
    
    /**
     * Mở Column Manager UI
     */
    openColumnManager() {
        if (!this.configUI) {
            this.configUI = new ColumnConfigUI(this);
        }
        this.configUI.show();
    }
    
    /**
     * Thêm cột mới
     */
    addColumn(field, isCustom = false) {
        const newColumn = {
            id: field.fieldname || `custom_${Date.now()}`,
            label: field.label,
            fieldname: field.fieldname,
            fieldtype: field.fieldtype || 'Data',
            width: field.width || this.getFieldWidth(field.fieldtype),
            visible: true,
            order: this.columns.length,
            formatter: field.formatter || null,
            is_custom: isCustom,
            source_query: field.source_query || null
        };
        
        this.columns.push(newColumn);
        this.saveConfiguration();
        this.refreshListView();
        
        frappe.show_alert({
            message: `Đã thêm cột "${field.label}"`,
            indicator: 'green'
        });
    }
    
    /**
     * Xóa cột
     */
    removeColumn(columnIndex) {
        if (columnIndex < 0 || columnIndex >= this.columns.length) return;
        
        const column = this.columns[columnIndex];
        this.columns.splice(columnIndex, 1);
        
        // Update order for remaining columns
        this.columns.forEach((col, index) => {
            col.order = index;
        });
        
        this.saveConfiguration();
        this.refreshListView();
        
        frappe.show_alert({
            message: `Đã xóa cột "${column.label}"`,
            indicator: 'orange'
        });
    }
    
    /**
     * Ẩn cột
     */
    hideColumn(columnIndex) {
        if (this.columns[columnIndex]) {
            this.columns[columnIndex].visible = false;
            this.saveConfiguration();
            this.refreshListView();
        }
    }
    
    /**
     * Di chuyển cột
     */
    moveColumn(fromIndex, toIndex) {
        if (fromIndex < 0 || fromIndex >= this.columns.length ||
            toIndex < 0 || toIndex >= this.columns.length) return;
        
        const column = this.columns.splice(fromIndex, 1)[0];
        this.columns.splice(toIndex, 0, column);
        
        // Update order
        this.columns.forEach((col, index) => {
            col.order = index;
        });
        
        this.saveConfiguration();
        this.refreshListView();
    }
    
    /**
     * Sắp xếp theo cột
     */
    sortByColumn(fieldname, order) {
        this.listView.sort_by = fieldname;
        this.listView.sort_order = order;
        this.listView.refresh();
    }
    
    /**
     * Lọc theo cột
     */
    filterByColumn(fieldname) {
        // Mở filter dialog với field được chọn
        this.listView.filter_area.add_filter(this.doctype, fieldname);
    }
    
    /**
     * Refresh List View
     */
    refreshListView() {
        this.listView.refresh();
    }
    
    /**
     * Lưu cấu hình
     */
    saveConfiguration() {
        const config = {
            doctype: this.doctype,
            columns: this.columns,
            settings: this.settings,
            timestamp: new Date().toISOString()
        };
        
        this.storageManager.saveConfiguration(config);
    }
    
    /**
     * Reset về cấu hình mặc định
     */
    resetToDefault() {
        this.columns = this.originalColumns.map((col, index) => ({
            id: col.fieldname || col.label.toLowerCase().replace(/\s+/g, '_'),
            label: col.label,
            fieldname: col.fieldname,
            fieldtype: col.fieldtype || 'Data',
            width: col.width || 150,
            visible: true,
            order: index,
            formatter: null,
            is_custom: false
        }));
        
        this.saveConfiguration();
        this.refreshListView();
        
        frappe.show_alert({
            message: 'Đã reset về cấu hình mặc định',
            indicator: 'blue'
        });
    }
    
    /**
     * Export cấu hình
     */
    exportConfiguration() {
        const config = {
            doctype: this.doctype,
            columns: this.columns,
            settings: this.settings,
            exported_at: new Date().toISOString(),
            version: '1.0'
        };
        
        const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${this.doctype}_column_config.json`;
        a.click();
        URL.revokeObjectURL(url);
    }
    
    /**
     * Import cấu hình
     */
    importConfiguration(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const config = JSON.parse(e.target.result);
                
                if (config.doctype !== this.doctype) {
                    frappe.msgprint('Cấu hình không phù hợp với DocType hiện tại');
                    return;
                }
                
                this.columns = config.columns || [];
                this.settings = { ...this.settings, ...config.settings };
                
                this.saveConfiguration();
                this.refreshListView();
                
                frappe.show_alert({
                    message: 'Đã import cấu hình thành công',
                    indicator: 'green'
                });
                
            } catch (err) {
                frappe.msgprint('Lỗi khi đọc file cấu hình');
                console.error(err);
            }
        };
        reader.readAsText(file);
    }
}

// Make ColumnManager available globally
window.ColumnManager = ColumnManager;

