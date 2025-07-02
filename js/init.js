/**
 * Initialization script for Column Manager
 * Tự động khởi tạo Column Manager cho các List View
 */

(function() {
    'use strict';
    
    // Đợi Frappe framework load xong
    $(document).ready(function() {
        initializeColumnManager();
    });
    
    /**
     * Khởi tạo Column Manager
     */
    function initializeColumnManager() {
        // Override ListView class để tự động inject Column Manager
        if (frappe.views && frappe.views.ListView) {
            const OriginalListView = frappe.views.ListView;
            
            frappe.views.ListView = class extends OriginalListView {
                constructor(options) {
                    super(options);
                    this.column_manager = null;
                }
                
                setup_view() {
                    super.setup_view();
                    this.initColumnManager();
                }
                
                initColumnManager() {
                    // Chỉ khởi tạo cho các DocType được support
                    if (this.isColumnManagerSupported()) {
                        try {
                            this.column_manager = new ColumnManager(this);
                            console.log(`Column Manager initialized for ${this.doctype}`);
                        } catch (error) {
                            console.error(`Error initializing Column Manager for ${this.doctype}:`, error);
                        }
                    }
                }
                
                isColumnManagerSupported() {
                    // Danh sách DocType được support
                    const supportedDoctypes = [
                        'Item', 'Customer', 'Supplier', 'Sales Invoice', 'Purchase Invoice',
                        'Sales Order', 'Purchase Order', 'Quotation', 'Purchase Receipt',
                        'Delivery Note', 'Stock Entry', 'Material Request', 'Lead',
                        'Opportunity', 'Project', 'Task', 'Issue', 'Employee',
                        'Timesheet', 'Expense Claim', 'Leave Application'
                    ];
                    
                    return supportedDoctypes.includes(this.doctype);
                }
                
                refresh() {
                    super.refresh();
                    
                    // Apply custom columns sau khi refresh
                    if (this.column_manager) {
                        setTimeout(() => {
                            this.column_manager.applyCustomColumns();
                        }, 100);
                    }
                }
            };
            
            console.log('Column Manager ListView override applied');
        }
        
        // Backup method: Hook vào frappe.listview_settings
        hookIntoListViewSettings();
        
        // Setup global keyboard shortcuts
        setupKeyboardShortcuts();
        
        // Setup global CSS
        injectGlobalCSS();
    }
    
    /**
     * Hook vào frappe.listview_settings để inject Column Manager
     */
    function hookIntoListViewSettings() {
        const supportedDoctypes = [
            'Item', 'Customer', 'Supplier', 'Sales Invoice', 'Purchase Invoice',
            'Sales Order', 'Purchase Order', 'Quotation', 'Purchase Receipt',
            'Delivery Note', 'Stock Entry', 'Material Request', 'Lead',
            'Opportunity', 'Project', 'Task', 'Issue', 'Employee',
            'Timesheet', 'Expense Claim', 'Leave Application'
        ];
        
        supportedDoctypes.forEach(doctype => {
            if (!frappe.listview_settings[doctype]) {
                frappe.listview_settings[doctype] = {};
            }
            
            const originalOnload = frappe.listview_settings[doctype].onload;
            
            frappe.listview_settings[doctype].onload = function(listview) {
                // Call original onload if exists
                if (originalOnload && typeof originalOnload === 'function') {
                    originalOnload.call(this, listview);
                }
                
                // Initialize Column Manager
                try {
                    if (!listview.column_manager) {
                        listview.column_manager = new ColumnManager(listview);
                    }
                } catch (error) {
                    console.error(`Error in Column Manager onload for ${doctype}:`, error);
                }
            };
        });
    }
    
    /**
     * Setup keyboard shortcuts
     */
    function setupKeyboardShortcuts() {
        $(document).on('keydown', function(e) {
            // Ctrl+Shift+C: Mở Column Manager
            if (e.ctrlKey && e.shiftKey && e.keyCode === 67) {
                e.preventDefault();
                
                if (window.cur_list && window.cur_list.column_manager) {
                    window.cur_list.column_manager.openColumnManager();
                } else {
                    frappe.show_alert({
                        message: 'Column Manager không khả dụng cho trang này',
                        indicator: 'orange'
                    });
                }
            }
            
            // Ctrl+Shift+R: Reset columns
            if (e.ctrlKey && e.shiftKey && e.keyCode === 82) {
                e.preventDefault();
                
                if (window.cur_list && window.cur_list.column_manager) {
                    frappe.confirm('Reset về cấu hình cột mặc định?', () => {
                        window.cur_list.column_manager.resetToDefault();
                    });
                }
            }
        });
    }
    
    /**
     * Inject global CSS
     */
    function injectGlobalCSS() {
        if ($('#column-manager-global-css').length > 0) {
            return;
        }
        
        const css = `
            <style id="column-manager-global-css">
                /* Column Manager Global Styles */
                .column-manager-btn {
                    margin-right: 5px;
                }
                
                .column-manager-btn .fa-columns {
                    color: #5e64ff;
                }
                
                .list-row-container.enhanced {
                    display: flex !important;
                    flex-wrap: nowrap !important;
                    overflow-x: auto !important;
                    width: max-content !important;
                    min-width: 100% !important;
                }
                
                .list-row-col.enhanced {
                    flex: 0 0 auto !important;
                    width: var(--column-width, 150px) !important;
                    max-width: none !important;
                    min-width: 80px !important;
                    padding: 0 8px !important;
                    border-right: 1px solid #e7e7e7;
                    position: relative;
                }
                
                .list-row-col.enhanced:last-child {
                    border-right: none;
                }
                
                .list-row-col.custom-column {
                    background-color: #f8f9ff !important;
                    border-left: 2px solid #5e64ff !important;
                }
                
                .column-header-enhanced {
                    position: relative;
                    display: flex;
                    align-items: center;
                    justify-content: space-between;
                    user-select: none;
                    padding: 5px 0;
                }
                
                .column-resizer {
                    position: absolute;
                    right: -2px;
                    top: 0;
                    bottom: 0;
                    width: 4px;
                    cursor: col-resize;
                    background: transparent;
                    z-index: 5;
                    opacity: 0;
                    transition: opacity 0.2s;
                }
                
                .column-header-enhanced:hover .column-resizer {
                    opacity: 1;
                    background: #5e64ff;
                }
                
                .column-menu {
                    opacity: 0;
                    transition: opacity 0.2s;
                    cursor: pointer;
                    padding: 2px 4px;
                    border-radius: 2px;
                    font-size: 12px;
                    color: #666;
                }
                
                .column-header-enhanced:hover .column-menu {
                    opacity: 1;
                }
                
                .column-menu:hover {
                    background: #e7e7e7;
                    color: #333;
                }
                
                .column-context-menu {
                    background: white;
                    border: 1px solid #ddd;
                    border-radius: 4px;
                    box-shadow: 0 2px 10px rgba(0,0,0,0.1);
                    z-index: 1000;
                    min-width: 150px;
                    font-size: 13px;
                }
                
                .column-context-menu .menu-item {
                    padding: 8px 12px;
                    cursor: pointer;
                    border-bottom: 1px solid #f0f0f0;
                }
                
                .column-context-menu .menu-item:hover {
                    background: #f8f9fa;
                }
                
                .column-context-menu .menu-item:last-child {
                    border-bottom: none;
                }
                
                .column-context-menu .menu-divider {
                    height: 1px;
                    background: #e0e0e0;
                    margin: 5px 0;
                }
                
                /* Custom column badge */
                .custom-column-badge {
                    background: #5e64ff;
                    color: white;
                    font-size: 10px;
                    padding: 1px 4px;
                    border-radius: 2px;
                    margin-left: 5px;
                }
                
                /* Loading indicator */
                .column-loading {
                    display: inline-block;
                    width: 12px;
                    height: 12px;
                    border: 2px solid #f3f3f3;
                    border-top: 2px solid #5e64ff;
                    border-radius: 50%;
                    animation: column-spin 1s linear infinite;
                    margin-left: 5px;
                }
                
                @keyframes column-spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
                
                /* Responsive adjustments */
                @media (max-width: 768px) {
                    .column-manager-btn .hidden-xs {
                        display: none !important;
                    }
                    
                    .list-row-col.enhanced {
                        min-width: 100px !important;
                    }
                }
                
                /* Dialog customizations */
                .column-config-dialog .modal-dialog {
                    max-width: 90vw !important;
                    width: 1200px !important;
                }
                
                .column-config-dialog .modal-body {
                    max-height: 70vh;
                    overflow-y: auto;
                }
                
                /* Drag and drop styles */
                .field-item.dragging {
                    opacity: 0.5;
                    transform: rotate(2deg);
                    z-index: 1000;
                }
                
                .drop-zone.drag-over {
                    border-color: #5e64ff !important;
                    background: #f0f8ff !important;
                }
                
                /* Performance optimizations */
                .list-row-container.enhanced {
                    will-change: transform;
                }
                
                .column-resizer {
                    will-change: background;
                }
            </style>
        `;
        
        $('head').append(css);
    }
    
    /**
     * Utility function để check xem Column Manager có sẵn không
     */
    window.isColumnManagerAvailable = function() {
        return window.ColumnManager && 
               window.StorageManager && 
               window.DataHandler && 
               window.ColumnConfigUI;
    };
    
    /**
     * Utility function để lấy Column Manager instance hiện tại
     */
    window.getCurrentColumnManager = function() {
        if (window.cur_list && window.cur_list.column_manager) {
            return window.cur_list.column_manager;
        }
        return null;
    };
    
    /**
     * Global function để mở Column Manager từ console
     */
    window.openColumnManager = function() {
        const cm = window.getCurrentColumnManager();
        if (cm) {
            cm.openColumnManager();
        } else {
            console.log('Column Manager not available on current page');
        }
    };
    
    // Log initialization
    console.log('Column Manager initialization script loaded');
    
})();

