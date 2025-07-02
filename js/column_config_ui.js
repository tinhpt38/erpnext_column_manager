/**
 * Column Configuration UI
 * Giao diện để cấu hình và quản lý cột
 */

class ColumnConfigUI {
    constructor(columnManager) {
        this.columnManager = columnManager;
        this.doctype = columnManager.doctype;
        this.dialog = null;
        this.availableFields = [];
        this.draggedElement = null;
        
        this.loadAvailableFields();
    }
    
    /**
     * Hiển thị dialog cấu hình
     */
    show() {
        if (this.dialog) {
            this.dialog.show();
            this.refreshUI();
            return;
        }
        
        this.createDialog();
        this.dialog.show();
    }
    
    /**
     * Tạo dialog
     */
    createDialog() {
        this.dialog = new frappe.ui.Dialog({
            title: `Cấu hình cột - ${this.doctype}`,
            size: 'extra-large',
            fields: this.getDialogFields(),
            primary_action_label: 'Lưu thay đổi',
            primary_action: () => {
                this.saveChanges();
            },
            secondary_action_label: 'Hủy',
            secondary_action: () => {
                this.dialog.hide();
            }
        });
        
        // Custom styling
        this.dialog.$wrapper.addClass('column-config-dialog');
        
        // Bind events sau khi dialog được render
        this.dialog.$wrapper.on('shown.bs.modal', () => {
            this.bindEvents();
            this.refreshUI();
        });
    }
    
    /**
     * Lấy fields cho dialog
     */
    getDialogFields() {
        return [
            {
                fieldtype: 'HTML',
                fieldname: 'column_config_html',
                options: this.getConfigHTML()
            }
        ];
    }
    
    /**
     * Lấy HTML cho giao diện cấu hình
     */
    getConfigHTML() {
        return `
            <div class="column-config-container">
                <div class="row">
                    <div class="col-md-4">
                        <div class="available-fields-panel">
                            <h4>Trường có sẵn</h4>
                            <div class="field-search-container">
                                <input type="text" class="form-control field-search" 
                                       placeholder="Tìm kiếm trường...">
                            </div>
                            <div class="field-categories">
                                <div class="btn-group btn-group-sm" role="group">
                                    <button type="button" class="btn btn-default active" data-category="all">
                                        Tất cả
                                    </button>
                                    <button type="button" class="btn btn-default" data-category="standard">
                                        Chuẩn
                                    </button>
                                    <button type="button" class="btn btn-default" data-category="custom">
                                        Tùy chỉnh
                                    </button>
                                </div>
                            </div>
                            <div class="available-fields-list">
                                <!-- Fields sẽ được render ở đây -->
                            </div>
                            <div class="custom-field-creator">
                                <h5>Tạo cột tùy chỉnh</h5>
                                <button class="btn btn-sm btn-primary create-custom-field">
                                    <i class="fa fa-plus"></i> Tạo cột mới
                                </button>
                            </div>
                        </div>
                    </div>
                    
                    <div class="col-md-8">
                        <div class="active-columns-panel">
                            <div class="panel-header">
                                <h4>Cột đang hiển thị</h4>
                                <div class="panel-actions">
                                    <button class="btn btn-sm btn-default" id="reset-columns">
                                        <i class="fa fa-refresh"></i> Reset
                                    </button>
                                    <button class="btn btn-sm btn-default" id="export-config">
                                        <i class="fa fa-download"></i> Export
                                    </button>
                                    <button class="btn btn-sm btn-default" id="import-config">
                                        <i class="fa fa-upload"></i> Import
                                    </button>
                                </div>
                            </div>
                            <div class="active-columns-list">
                                <!-- Active columns sẽ được render ở đây -->
                            </div>
                            <div class="column-settings">
                                <h5>Cài đặt chung</h5>
                                <div class="row">
                                    <div class="col-md-6">
                                        <label>
                                            <input type="checkbox" id="auto-resize"> Tự động điều chỉnh kích thước
                                        </label>
                                    </div>
                                    <div class="col-md-6">
                                        <label>
                                            <input type="checkbox" id="horizontal-scroll"> Cuộn ngang
                                        </label>
                                    </div>
                                </div>
                                <div class="row">
                                    <div class="col-md-6">
                                        <label>
                                            <input type="checkbox" id="compact-mode"> Chế độ compact
                                        </label>
                                    </div>
                                    <div class="col-md-6">
                                        <label>Số cột tối đa:</label>
                                        <input type="number" class="form-control" id="max-columns" 
                                               min="1" max="50" value="20">
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            
            <style>
                .column-config-container {
                    min-height: 500px;
                }
                
                .available-fields-panel,
                .active-columns-panel {
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    padding: 15px;
                    height: 600px;
                    overflow-y: auto;
                }
                
                .field-search-container {
                    margin-bottom: 15px;
                }
                
                .field-categories {
                    margin-bottom: 15px;
                }
                
                .available-fields-list,
                .active-columns-list {
                    min-height: 300px;
                    margin-bottom: 20px;
                }
                
                .field-item {
                    padding: 10px;
                    margin: 5px 0;
                    border: 1px solid #e0e0e0;
                    border-radius: 4px;
                    cursor: grab;
                    background: #f9f9f9;
                    transition: all 0.2s;
                }
                
                .field-item:hover {
                    background: #f0f0f0;
                    border-color: #ccc;
                }
                
                .field-item.dragging {
                    opacity: 0.5;
                    transform: rotate(5deg);
                }
                
                .field-item.custom {
                    border-left: 3px solid #007bff;
                    background: #f0f8ff;
                }
                
                .field-info {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                
                .field-label {
                    font-weight: 500;
                }
                
                .field-type {
                    font-size: 12px;
                    color: #666;
                    background: #e9ecef;
                    padding: 2px 6px;
                    border-radius: 3px;
                }
                
                .column-config-item {
                    padding: 15px;
                    margin: 10px 0;
                    border: 1px solid #e0e0e0;
                    border-radius: 4px;
                    background: white;
                }
                
                .column-config-item.custom {
                    border-left: 3px solid #007bff;
                    background: #f0f8ff;
                }
                
                .column-config-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 10px;
                }
                
                .column-config-controls {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                }
                
                .width-control {
                    display: flex;
                    align-items: center;
                    gap: 5px;
                }
                
                .width-slider {
                    width: 100px;
                }
                
                .panel-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    margin-bottom: 15px;
                    padding-bottom: 10px;
                    border-bottom: 1px solid #eee;
                }
                
                .panel-actions {
                    display: flex;
                    gap: 5px;
                }
                
                .custom-field-creator {
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 1px solid #eee;
                }
                
                .column-settings {
                    margin-top: 20px;
                    padding-top: 15px;
                    border-top: 1px solid #eee;
                }
                
                .drop-zone {
                    min-height: 50px;
                    border: 2px dashed #ccc;
                    border-radius: 4px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    color: #999;
                    margin: 10px 0;
                }
                
                .drop-zone.drag-over {
                    border-color: #007bff;
                    background: #f0f8ff;
                    color: #007bff;
                }
            </style>
        `;
    }
    
    /**
     * Bind events
     */
    bindEvents() {
        const $wrapper = this.dialog.$wrapper;
        
        // Field search
        $wrapper.find('.field-search').on('input', (e) => {
            this.filterFields(e.target.value);
        });
        
        // Category filter
        $wrapper.find('[data-category]').on('click', (e) => {
            const category = $(e.target).data('category');
            this.filterByCategory(category);
            
            // Update active button
            $wrapper.find('[data-category]').removeClass('active');
            $(e.target).addClass('active');
        });
        
        // Create custom field
        $wrapper.find('.create-custom-field').on('click', () => {
            this.showCustomFieldDialog();
        });
        
        // Panel actions
        $wrapper.find('#reset-columns').on('click', () => {
            this.resetColumns();
        });
        
        $wrapper.find('#export-config').on('click', () => {
            this.columnManager.exportConfiguration();
        });
        
        $wrapper.find('#import-config').on('click', () => {
            this.showImportDialog();
        });
        
        // Settings
        $wrapper.find('#auto-resize').on('change', (e) => {
            this.columnManager.settings.autoResize = e.target.checked;
        });
        
        $wrapper.find('#horizontal-scroll').on('change', (e) => {
            this.columnManager.settings.horizontalScroll = e.target.checked;
        });
        
        $wrapper.find('#compact-mode').on('change', (e) => {
            this.columnManager.settings.compactMode = e.target.checked;
        });
        
        $wrapper.find('#max-columns').on('change', (e) => {
            this.columnManager.settings.maxColumns = parseInt(e.target.value) || 20;
        });
        
        // Drag and drop
        this.bindDragDropEvents();
    }
    
    /**
     * Bind drag and drop events
     */
    bindDragDropEvents() {
        const $wrapper = this.dialog.$wrapper;
        
        // Make field items draggable
        $wrapper.on('dragstart', '.field-item', (e) => {
            this.draggedElement = e.target;
            $(e.target).addClass('dragging');
            
            e.originalEvent.dataTransfer.effectAllowed = 'move';
            e.originalEvent.dataTransfer.setData('text/html', e.target.outerHTML);
        });
        
        $wrapper.on('dragend', '.field-item', (e) => {
            $(e.target).removeClass('dragging');
            this.draggedElement = null;
        });
        
        // Drop zones
        $wrapper.on('dragover', '.active-columns-list', (e) => {
            e.preventDefault();
            e.originalEvent.dataTransfer.dropEffect = 'move';
            $(e.currentTarget).addClass('drag-over');
        });
        
        $wrapper.on('dragleave', '.active-columns-list', (e) => {
            $(e.currentTarget).removeClass('drag-over');
        });
        
        $wrapper.on('drop', '.active-columns-list', (e) => {
            e.preventDefault();
            $(e.currentTarget).removeClass('drag-over');
            
            if (this.draggedElement) {
                const fieldData = $(this.draggedElement).data('field');
                this.addFieldToActive(fieldData);
            }
        });
    }
    
    /**
     * Load available fields
     */
    loadAvailableFields() {
        const meta = frappe.get_meta(this.doctype);
        this.availableFields = [];
        
        // Standard fields
        meta.fields.forEach(field => {
            if (this.isFieldSupported(field)) {
                this.availableFields.push({
                    ...field,
                    category: field.is_custom_field ? 'custom' : 'standard'
                });
            }
        });
        
        // System fields
        const systemFields = [
            { fieldname: 'name', label: 'ID', fieldtype: 'Data', category: 'standard' },
            { fieldname: 'creation', label: 'Created', fieldtype: 'Datetime', category: 'standard' },
            { fieldname: 'modified', label: 'Modified', fieldtype: 'Datetime', category: 'standard' },
            { fieldname: 'owner', label: 'Created By', fieldtype: 'Link', category: 'standard' },
            { fieldname: 'modified_by', label: 'Modified By', fieldtype: 'Link', category: 'standard' }
        ];
        
        systemFields.forEach(field => {
            if (!this.availableFields.find(f => f.fieldname === field.fieldname)) {
                this.availableFields.push(field);
            }
        });
    }
    
    /**
     * Kiểm tra field có được support không
     */
    isFieldSupported(field) {
        const supportedTypes = [
            'Data', 'Link', 'Select', 'Int', 'Float', 'Currency', 'Percent',
            'Check', 'Date', 'Datetime', 'Time', 'Text', 'Small Text'
        ];
        
        return supportedTypes.includes(field.fieldtype) && 
               !field.hidden && 
               field.fieldname !== 'name';
    }
    
    /**
     * Refresh UI
     */
    refreshUI() {
        this.renderAvailableFields();
        this.renderActiveColumns();
        this.updateSettings();
    }
    
    /**
     * Render available fields
     */
    renderAvailableFields() {
        const $container = this.dialog.$wrapper.find('.available-fields-list');
        $container.empty();
        
        const activeFieldNames = this.columnManager.columns.map(col => col.fieldname);
        const availableFields = this.availableFields.filter(field => 
            !activeFieldNames.includes(field.fieldname)
        );
        
        availableFields.forEach(field => {
            const $item = $(`
                <div class="field-item ${field.category}" draggable="true" data-fieldname="${field.fieldname}">
                    <div class="field-info">
                        <div>
                            <div class="field-label">${field.label}</div>
                            <small class="text-muted">${field.fieldname}</small>
                        </div>
                        <span class="field-type">${field.fieldtype}</span>
                    </div>
                </div>
            `);
            
            $item.data('field', field);
            $item.on('dblclick', () => {
                this.addFieldToActive(field);
            });
            
            $container.append($item);
        });
        
        if (availableFields.length === 0) {
            $container.append('<div class="text-muted text-center">Không có trường nào</div>');
        }
    }
    
    /**
     * Render active columns
     */
    renderActiveColumns() {
        const $container = this.dialog.$wrapper.find('.active-columns-list');
        $container.empty();
        
        this.columnManager.columns.forEach((column, index) => {
            const $item = $(`
                <div class="column-config-item ${column.is_custom ? 'custom' : ''}" data-index="${index}">
                    <div class="column-config-header">
                        <div>
                            <strong>${column.label}</strong>
                            <span class="field-type">${column.fieldtype}</span>
                            ${column.is_custom ? '<span class="badge badge-primary">Custom</span>' : ''}
                        </div>
                        <div class="column-config-controls">
                            <label>
                                <input type="checkbox" class="column-visible" ${column.visible ? 'checked' : ''}> 
                                Hiển thị
                            </label>
                            <div class="width-control">
                                <input type="range" class="width-slider" min="80" max="400" value="${column.width}">
                                <span class="width-display">${column.width}px</span>
                            </div>
                            <button class="btn btn-xs btn-default move-up" ${index === 0 ? 'disabled' : ''}>
                                <i class="fa fa-arrow-up"></i>
                            </button>
                            <button class="btn btn-xs btn-default move-down" ${index === this.columnManager.columns.length - 1 ? 'disabled' : ''}>
                                <i class="fa fa-arrow-down"></i>
                            </button>
                            <button class="btn btn-xs btn-danger remove-column">
                                <i class="fa fa-times"></i>
                            </button>
                        </div>
                    </div>
                    ${column.is_custom && column.formula ? `
                        <div class="custom-formula">
                            <small><strong>Formula:</strong> ${column.formula}</small>
                        </div>
                    ` : ''}
                </div>
            `);
            
            // Bind events for this item
            $item.find('.column-visible').on('change', (e) => {
                column.visible = e.target.checked;
            });
            
            $item.find('.width-slider').on('input', (e) => {
                const width = parseInt(e.target.value);
                column.width = width;
                $item.find('.width-display').text(`${width}px`);
            });
            
            $item.find('.move-up').on('click', () => {
                this.moveColumn(index, index - 1);
            });
            
            $item.find('.move-down').on('click', () => {
                this.moveColumn(index, index + 1);
            });
            
            $item.find('.remove-column').on('click', () => {
                this.removeColumn(index);
            });
            
            $container.append($item);
        });
        
        if (this.columnManager.columns.length === 0) {
            $container.append('<div class="text-muted text-center">Chưa có cột nào</div>');
        }
    }
    
    /**
     * Update settings UI
     */
    updateSettings() {
        const $wrapper = this.dialog.$wrapper;
        const settings = this.columnManager.settings;
        
        $wrapper.find('#auto-resize').prop('checked', settings.autoResize);
        $wrapper.find('#horizontal-scroll').prop('checked', settings.horizontalScroll);
        $wrapper.find('#compact-mode').prop('checked', settings.compactMode);
        $wrapper.find('#max-columns').val(settings.maxColumns);
    }
    
    /**
     * Filter fields
     */
    filterFields(searchTerm) {
        const $items = this.dialog.$wrapper.find('.available-fields-list .field-item');
        
        $items.each(function() {
            const $item = $(this);
            const label = $item.find('.field-label').text().toLowerCase();
            const fieldname = $item.data('fieldname').toLowerCase();
            
            if (label.includes(searchTerm.toLowerCase()) || 
                fieldname.includes(searchTerm.toLowerCase())) {
                $item.show();
            } else {
                $item.hide();
            }
        });
    }
    
    /**
     * Filter by category
     */
    filterByCategory(category) {
        const $items = this.dialog.$wrapper.find('.available-fields-list .field-item');
        
        if (category === 'all') {
            $items.show();
        } else {
            $items.each(function() {
                const $item = $(this);
                if ($item.hasClass(category)) {
                    $item.show();
                } else {
                    $item.hide();
                }
            });
        }
    }
    
    /**
     * Add field to active columns
     */
    addFieldToActive(field) {
        this.columnManager.addColumn(field);
        this.refreshUI();
    }
    
    /**
     * Remove column
     */
    removeColumn(index) {
        this.columnManager.removeColumn(index);
        this.refreshUI();
    }
    
    /**
     * Move column
     */
    moveColumn(fromIndex, toIndex) {
        this.columnManager.moveColumn(fromIndex, toIndex);
        this.refreshUI();
    }
    
    /**
     * Reset columns
     */
    resetColumns() {
        frappe.confirm('Bạn có chắc muốn reset về cấu hình mặc định?', () => {
            this.columnManager.resetToDefault();
            this.refreshUI();
        });
    }
    
    /**
     * Show custom field dialog
     */
    showCustomFieldDialog() {
        const customFieldDialog = new frappe.ui.Dialog({
            title: 'Tạo cột tùy chỉnh',
            fields: [
                {
                    fieldtype: 'Data',
                    fieldname: 'label',
                    label: 'Tên cột',
                    reqd: 1
                },
                {
                    fieldtype: 'Select',
                    fieldname: 'fieldtype',
                    label: 'Loại dữ liệu',
                    options: 'Data\nInt\nFloat\nCurrency\nPercent\nDate\nDatetime\nCheck',
                    default: 'Data',
                    reqd: 1
                },
                {
                    fieldtype: 'Small Text',
                    fieldname: 'formula',
                    label: 'Formula (tùy chọn)',
                    description: 'Sử dụng {field_name} để tham chiếu đến các trường. VD: {selling_price} - {buying_price}'
                },
                {
                    fieldtype: 'Code',
                    fieldname: 'source_query',
                    label: 'Custom Query (tùy chọn)',
                    description: 'SQL query để lấy dữ liệu. Sử dụng %(doc_name)s để tham chiếu document'
                }
            ],
            primary_action_label: 'Tạo cột',
            primary_action: (values) => {
                this.createCustomColumn(values);
                customFieldDialog.hide();
            }
        });
        
        customFieldDialog.show();
    }
    
    /**
     * Create custom column
     */
    createCustomColumn(values) {
        const customField = {
            fieldname: `custom_${values.label.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`,
            label: values.label,
            fieldtype: values.fieldtype,
            formula: values.formula,
            source_query: values.source_query,
            is_custom: true
        };
        
        this.columnManager.addColumn(customField, true);
        this.refreshUI();
    }
    
    /**
     * Show import dialog
     */
    showImportDialog() {
        const importDialog = new frappe.ui.Dialog({
            title: 'Import cấu hình cột',
            fields: [
                {
                    fieldtype: 'Attach',
                    fieldname: 'config_file',
                    label: 'File cấu hình',
                    reqd: 1
                }
            ],
            primary_action_label: 'Import',
            primary_action: (values) => {
                if (values.config_file) {
                    // Get file from attachment
                    const fileUrl = values.config_file;
                    fetch(fileUrl)
                        .then(response => response.blob())
                        .then(blob => {
                            this.columnManager.importConfiguration(blob);
                            this.refreshUI();
                        })
                        .catch(error => {
                            frappe.msgprint('Lỗi khi đọc file');
                            console.error(error);
                        });
                }
                importDialog.hide();
            }
        });
        
        importDialog.show();
    }
    
    /**
     * Save changes
     */
    saveChanges() {
        this.columnManager.saveConfiguration();
        this.columnManager.refreshListView();
        this.dialog.hide();
        
        frappe.show_alert({
            message: 'Đã lưu cấu hình cột',
            indicator: 'green'
        });
    }
}

// Make ColumnConfigUI available globally
window.ColumnConfigUI = ColumnConfigUI;

