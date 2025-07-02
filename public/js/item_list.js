/**
 * Item List View customization with Column Manager
 */

frappe.listview_settings['Item'] = {
    // Existing settings
    add_fields: ["item_name", "item_group", "brand", "stock_uom", "is_stock_item", "has_variants"],
    
    // Column Manager integration
    onload: function(listview) {
        // Initialize Column Manager
        if (window.ColumnManager) {
            try {
                listview.column_manager = new ColumnManager(listview);
                
                // Add some predefined custom columns for Item
                setTimeout(() => {
                    addItemCustomColumns(listview.column_manager);
                }, 500);
                
            } catch (error) {
                console.error('Error initializing Column Manager for Item:', error);
            }
        }
        
        // Add custom actions
        addItemCustomActions(listview);
    },
    
    // Custom formatters
    formatters: {
        item_name: function(val) {
            return val ? val.bold() : '';
        },
        is_stock_item: function(val) {
            return val ? '<span class="indicator green">Stock Item</span>' : '<span class="indicator gray">Non-Stock</span>';
        },
        has_variants: function(val) {
            return val ? '<span class="badge badge-info">Has Variants</span>' : '';
        }
    },
    
    // Custom indicators
    get_indicator: function(doc) {
        if (doc.disabled) {
            return [__("Disabled"), "red", "disabled,=,Yes"];
        } else if (doc.is_stock_item) {
            return [__("Stock Item"), "blue", "is_stock_item,=,Yes"];
        } else {
            return [__("Non-Stock"), "gray", "is_stock_item,=,No"];
        }
    }
};

/**
 * Add predefined custom columns for Item
 */
function addItemCustomColumns(columnManager) {
    if (!columnManager) return;
    
    // Check if custom columns already exist
    const existingColumns = columnManager.columns.map(col => col.id);
    
    // Predefined custom columns for Item
    const customColumns = [
        {
            id: 'stock_value',
            label: 'Stock Value',
            fieldtype: 'Currency',
            source_query: `
                SELECT 
                    item_code as name,
                    COALESCE(SUM(actual_qty * valuation_rate), 0) as stock_value
                FROM \`tabStock Ledger Entry\` 
                WHERE item_code IN %(doc_names)s 
                AND is_cancelled = 0
                GROUP BY item_code
            `,
            width: 120,
            is_custom: true
        },
        {
            id: 'available_qty',
            label: 'Available Qty',
            fieldtype: 'Float',
            source_query: `
                SELECT 
                    item_code as name,
                    COALESCE(SUM(actual_qty), 0) as available_qty
                FROM \`tabStock Ledger Entry\` 
                WHERE item_code IN %(doc_names)s 
                AND is_cancelled = 0
                GROUP BY item_code
            `,
            width: 100,
            is_custom: true
        },
        {
            id: 'last_purchase_rate',
            label: 'Last Purchase Rate',
            fieldtype: 'Currency',
            source_query: `
                SELECT 
                    pi.item_code as name,
                    pi.rate as last_purchase_rate
                FROM \`tabPurchase Invoice Item\` pi
                INNER JOIN \`tabPurchase Invoice\` p ON pi.parent = p.name
                WHERE pi.item_code IN %(doc_names)s 
                AND p.docstatus = 1
                AND p.posting_date = (
                    SELECT MAX(p2.posting_date) 
                    FROM \`tabPurchase Invoice Item\` pi2
                    INNER JOIN \`tabPurchase Invoice\` p2 ON pi2.parent = p2.name
                    WHERE pi2.item_code = pi.item_code 
                    AND p2.docstatus = 1
                )
                GROUP BY pi.item_code
            `,
            width: 130,
            is_custom: true
        },
        {
            id: 'profit_margin',
            label: 'Profit Margin %',
            fieldtype: 'Percent',
            formula: '({standard_rate} - {last_purchase_rate}) / {last_purchase_rate} * 100',
            width: 120,
            is_custom: true
        }
    ];
    
    // Add columns that don't exist yet
    customColumns.forEach(column => {
        if (!existingColumns.includes(column.id)) {
            try {
                columnManager.addColumn(column, true);
            } catch (error) {
                console.error(`Error adding custom column ${column.id}:`, error);
            }
        }
    });
}

/**
 * Add custom actions for Item list
 */
function addItemCustomActions(listview) {
    // Bulk update prices action
    listview.page.add_action_item(__("Bulk Update Prices"), function() {
        const selected = listview.get_checked_items();
        
        if (selected.length === 0) {
            frappe.msgprint(__("Please select items to update prices"));
            return;
        }
        
        const dialog = new frappe.ui.Dialog({
            title: __("Bulk Update Item Prices"),
            fields: [
                {
                    fieldtype: 'Select',
                    fieldname: 'price_list',
                    label: 'Price List',
                    reqd: 1,
                    get_query: function() {
                        return {
                            doctype: "Price List",
                            filters: {
                                enabled: 1
                            }
                        };
                    }
                },
                {
                    fieldtype: 'Select',
                    fieldname: 'update_type',
                    label: 'Update Type',
                    options: 'Percentage\nFixed Amount',
                    default: 'Percentage',
                    reqd: 1
                },
                {
                    fieldtype: 'Float',
                    fieldname: 'value',
                    label: 'Value',
                    reqd: 1,
                    description: 'For percentage: enter 10 for 10% increase, -5 for 5% decrease'
                }
            ],
            primary_action_label: __("Update Prices"),
            primary_action: function(values) {
                bulkUpdateItemPrices(selected, values);
                dialog.hide();
            }
        });
        
        dialog.show();
    });
    
    // Export custom columns data
    listview.page.add_action_item(__("Export Enhanced Data"), function() {
        if (listview.column_manager) {
            exportEnhancedItemData(listview);
        } else {
            frappe.msgprint(__("Column Manager not available"));
        }
    });
}

/**
 * Bulk update item prices
 */
function bulkUpdateItemPrices(items, values) {
    frappe.call({
        method: 'erpnext_column_manager.api.bulk_update_item_prices',
        args: {
            items: items.map(item => item.name),
            price_list: values.price_list,
            update_type: values.update_type,
            value: values.value
        },
        callback: function(r) {
            if (r.message) {
                frappe.show_alert({
                    message: __("Prices updated successfully"),
                    indicator: 'green'
                });
                cur_list.refresh();
            }
        }
    });
}

/**
 * Export enhanced data with custom columns
 */
function exportEnhancedItemData(listview) {
    const columnManager = listview.column_manager;
    const visibleColumns = columnManager.columns.filter(col => col.visible);
    
    frappe.call({
        method: 'erpnext_column_manager.api.export_enhanced_data',
        args: {
            doctype: 'Item',
            columns: visibleColumns,
            filters: listview.filter_area.get()
        },
        callback: function(r) {
            if (r.message) {
                // Download the exported file
                const blob = new Blob([r.message], { type: 'text/csv' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `items_enhanced_${frappe.datetime.now_date()}.csv`;
                a.click();
                URL.revokeObjectURL(url);
                
                frappe.show_alert({
                    message: __("Data exported successfully"),
                    indicator: 'green'
                });
            }
        }
    });
}

// Add keyboard shortcuts specific to Item list
$(document).on('keydown', function(e) {
    if (cur_list && cur_list.doctype === 'Item') {
        // Ctrl+Shift+P: Quick price update
        if (e.ctrlKey && e.shiftKey && e.keyCode === 80) {
            e.preventDefault();
            
            const selected = cur_list.get_checked_items();
            if (selected.length > 0) {
                // Trigger bulk price update
                cur_list.page.actions.find('[data-label="Bulk Update Prices"]').click();
            } else {
                frappe.show_alert({
                    message: __("Please select items first"),
                    indicator: 'orange'
                });
            }
        }
    }
});

console.log('Item List View Column Manager integration loaded');

