# ERPNext Column Manager

![ERPNext Column Manager](https://img.shields.io/badge/ERPNext-Column%20Manager-blue)
![Version](https://img.shields.io/badge/version-1.0.0-green)
![License](https://img.shields.io/badge/license-MIT-blue)

Giải pháp JavaScript tùy chỉnh cho phép vượt qua giới hạn 12 cột của Frappe framework và tạo ra các List View linh hoạt, mạnh mẽ hơn trong ERPNext.

## 🚀 Tính năng chính

### ✨ Không giới hạn số cột
- Vượt qua giới hạn 12 cột của Bootstrap grid system
- Hiển thị bao nhiêu cột tùy ý với horizontal scroll mượt mà
- Tự động điều chỉnh kích thước theo nội dung

### 🎯 Cột tùy chỉnh đa dạng
- **Formula Columns**: Tính toán dựa trên các trường hiện có
- **Query Columns**: Lấy dữ liệu từ bảng khác qua SQL
- **Aggregation Columns**: Tổng hợp dữ liệu từ child tables
- **Computed Columns**: Xử lý logic phức tạp với JavaScript
- **External Data**: Tích hợp dữ liệu từ API bên ngoài

### 🎨 Giao diện người dùng thân thiện
- Drag & Drop để sắp xếp cột
- Resize cột bằng cách kéo handle
- Context menu với đầy đủ tùy chọn
- Giao diện cấu hình trực quan
- Responsive design cho mobile

### 💾 Quản lý cấu hình thông minh
- Lưu cấu hình tự động cho từng user
- Export/Import cấu hình giữa các máy
- Backup và restore toàn bộ settings
- Version control cho cấu hình
- Chia sẻ template giữa users

### ⚡ Hiệu suất cao
- Cache dữ liệu thông minh
- Lazy loading cho large datasets
- Batch processing cho custom queries
- Debounced updates
- Memory optimization

## 📋 Yêu cầu hệ thống

- **ERPNext**: v13.0+ (khuyến nghị v14.0+)
- **Frappe**: v13.0+ (khuyến nghị v14.0+)
- **Browser**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+
- **JavaScript**: ES6+ support required

## 🛠️ Cài đặt

### Cài đặt từ GitHub

```bash
# Clone repository
git clone https://github.com/your-repo/erpnext_column_manager.git

# Chuyển vào thư mục apps của ERPNext
cd /path/to/frappe-bench/apps

# Copy source code
cp -r /path/to/erpnext_column_manager .

# Install app
bench get-app erpnext_column_manager
bench --site [site-name] install-app erpnext_column_manager

# Restart server
bench restart
```

### Cài đặt thủ công

1. Download source code từ repository
2. Copy thư mục `erpnext_column_manager` vào `frappe-bench/apps/`
3. Chạy các lệnh cài đặt như trên

## 🎮 Sử dụng

### Khởi động nhanh

1. Mở bất kỳ List View nào được hỗ trợ (Item, Customer, Sales Invoice, v.v.)
2. Nhấn nút **"Quản lý cột"** trên toolbar
3. Hoặc sử dụng phím tắt `Ctrl+Shift+C`

### Thêm cột tùy chỉnh

#### Formula Column
```javascript
{
  "label": "Profit Margin %",
  "fieldtype": "Percent", 
  "formula": "({selling_price} - {buying_price}) / {buying_price} * 100"
}
```

#### Query Column
```javascript
{
  "label": "Stock Value",
  "fieldtype": "Currency",
  "source_query": `
    SELECT 
      item_code as name,
      SUM(actual_qty * valuation_rate) as stock_value
    FROM \`tabStock Ledger Entry\` 
    WHERE item_code IN %(doc_names)s 
    AND is_cancelled = 0
    GROUP BY item_code
  `
}
```

### Phím tắt

- `Ctrl+Shift+C`: Mở Column Manager
- `Ctrl+Shift+R`: Reset về cấu hình mặc định
- `Ctrl+Shift+E`: Export cấu hình
- `Ctrl+Shift+P`: Bulk update (cho Item list)

## 📚 API Reference

### JavaScript API

#### ColumnManager Class

```javascript
// Khởi tạo
const columnManager = new ColumnManager(listView);

// Thêm cột
columnManager.addColumn({
  label: 'Custom Column',
  fieldtype: 'Currency',
  formula: '{field1} + {field2}',
  width: 120
});

// Xóa cột
columnManager.removeColumn(columnIndex);

// Di chuyển cột
columnManager.moveColumn(fromIndex, toIndex);

// Lưu cấu hình
columnManager.saveConfiguration();

// Reset về mặc định
columnManager.resetToDefault();

// Export cấu hình
const config = columnManager.exportConfiguration();

// Import cấu hình
columnManager.importConfiguration(config);
```

#### StorageManager Class

```javascript
// Quản lý lưu trữ
const storage = new StorageManager(doctype);

// Lưu cấu hình
storage.saveConfiguration(config);

// Tải cấu hình
const config = storage.loadConfiguration();

// Backup tất cả
storage.backupAllConfigurations();

// Restore từ backup
storage.restoreFromBackup(backupData);
```

### Python API

#### Backend Endpoints

```python
# Lấy dữ liệu cho cột tùy chỉnh
@frappe.whitelist()
def get_custom_column_data(doctype, column_config, doc_names):
    # Implementation...
    return results

# Thực thi custom query an toàn
@frappe.whitelist() 
def execute_custom_query(query, doc_names, doctype):
    # Safe query execution...
    return frappe.db.sql(query, values)

# Lưu cấu hình cột
@frappe.whitelist()
def save_column_configuration(doctype, configuration):
    # Save to User Settings...
    return {"status": "success"}

# Tải cấu hình cột
@frappe.whitelist()
def load_column_configuration(doctype):
    # Load from User Settings...
    return configuration
```

## 🏗️ Kiến trúc

### Cấu trúc thư mục

```
erpnext_column_manager/
├── hooks.py                 # Frappe hooks configuration
├── api.py                   # Backend API endpoints  
├── __init__.py
├── js/
│   ├── column_manager.js    # Core column manager class
│   ├── storage_manager.js   # Configuration storage
│   ├── data_handler.js      # Data fetching & caching
│   ├── column_config_ui.js  # Configuration UI
│   └── init.js             # Initialization script
├── public/
│   ├── css/
│   │   └── column_manager.css
│   └── js/
│       ├── item_list.js     # Item-specific integration
│       ├── customer_list.js # Customer-specific integration
│       └── ...             # Other DocType integrations
├── templates/
│   └── column_config.html   # Configuration dialog template
├── fixtures/
│   └── custom_field.json    # Default custom fields
├── demo.html               # Interactive demo
└── README.md
```

### Luồng hoạt động

1. **Initialization**: `init.js` override ListView class và inject Column Manager
2. **Configuration**: User mở dialog cấu hình qua `ColumnConfigUI`
3. **Data Processing**: `DataHandler` xử lý formula và query columns
4. **Storage**: `StorageManager` lưu cấu hình vào User Settings
5. **Rendering**: Column Manager render lại List View với cấu hình mới

## 🎯 DocType được hỗ trợ

### Core Modules
- **Item**: Stock value, profit margin, purchase history
- **Customer**: Credit limit, outstanding amount, sales summary
- **Supplier**: Purchase summary, payment terms, performance metrics
- **Sales Invoice**: Profit analysis, payment status, aging
- **Purchase Invoice**: Approval workflow, payment tracking
- **Sales Order**: Delivery status, profitability analysis
- **Purchase Order**: Approval status, delivery tracking

### Additional Modules
- **Quotation**: Conversion rate, follow-up status
- **Delivery Note**: Shipping details, delivery performance
- **Purchase Receipt**: Quality metrics, supplier performance
- **Stock Entry**: Cost analysis, movement tracking
- **Material Request**: Approval workflow, fulfillment status
- **Project**: Progress tracking, resource utilization
- **Task**: Time tracking, productivity metrics
- **Employee**: Performance metrics, attendance summary

## 🔧 Tùy chỉnh

### Thêm DocType mới

```javascript
// Trong hooks.py
doctype_list_js = {
    "Your DocType": "public/js/your_doctype_list.js"
}

// Trong your_doctype_list.js
frappe.listview_settings['Your DocType'] = {
    onload: function(listview) {
        if (window.ColumnManager) {
            listview.column_manager = new ColumnManager(listview);
            
            // Thêm custom columns cho DocType này
            addCustomColumnsForYourDocType(listview.column_manager);
        }
    }
};
```

### Tạo Custom Column Type

```javascript
// Extend DataHandler để hỗ trợ loại cột mới
class CustomDataHandler extends DataHandler {
    async processCustomType(column, docNames) {
        // Implementation cho loại cột mới
        return processedData;
    }
}
```

## 🧪 Testing

### Unit Tests

```bash
# Chạy JavaScript tests
npm test

# Chạy Python tests  
bench --site [site-name] run-tests erpnext_column_manager
```

### Manual Testing

1. Mở demo.html trong browser
2. Test các tính năng drag & drop
3. Kiểm tra responsive design
4. Verify performance với large datasets

## 🐛 Troubleshooting

### Vấn đề thường gặp

**Column Manager không xuất hiện**
- Kiểm tra app đã được install chưa: `bench --site [site] list-apps`
- Clear cache: `bench --site [site] clear-cache`
- Restart server: `bench restart`

**Custom columns không load dữ liệu**
- Kiểm tra console browser để xem lỗi JavaScript
- Verify SQL query syntax trong column configuration
- Đảm bảo user có quyền truy cập dữ liệu

**Performance issues**
- Giảm số lượng custom columns
- Optimize SQL queries
- Enable caching trong settings

**Mobile display issues**
- Kiểm tra responsive CSS
- Adjust column widths cho mobile
- Enable compact mode

### Debug Mode

```javascript
// Enable debug logging
localStorage.setItem('column_manager_debug', 'true');

// View debug logs
console.log(window.ColumnManagerDebug.getLogs());
```

## 🤝 Đóng góp

### Development Setup

```bash
# Clone repository
git clone https://github.com/your-repo/erpnext_column_manager.git
cd erpnext_column_manager

# Install development dependencies
npm install

# Start development server
npm run dev

# Run tests
npm test
```

### Contribution Guidelines

1. Fork repository
2. Tạo feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Tạo Pull Request

### Code Style

- JavaScript: ESLint + Prettier
- Python: Black + Flake8
- CSS: Stylelint
- Commit messages: Conventional Commits

## 📄 License

Dự án này được phân phối dưới giấy phép MIT. Xem file `LICENSE` để biết thêm chi tiết.

## 🙏 Acknowledgments

- **Frappe Team**: Cho framework tuyệt vời
- **ERPNext Community**: Cho feedback và testing
- **Contributors**: Tất cả những người đóng góp cho dự án

## 📞 Hỗ trợ

- **Documentation**: [Wiki](https://github.com/your-repo/erpnext_column_manager/wiki)
- **Issues**: [GitHub Issues](https://github.com/your-repo/erpnext_column_manager/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-repo/erpnext_column_manager/discussions)
- **Email**: support@yourcompany.com

## 🗺️ Roadmap

### v1.1.0 (Q2 2024)
- [ ] Chart columns (inline charts)
- [ ] Advanced filtering for custom columns
- [ ] Column templates marketplace
- [ ] Performance dashboard

### v1.2.0 (Q3 2024)
- [ ] Real-time data updates
- [ ] Collaborative column sharing
- [ ] Advanced formula editor
- [ ] Mobile app support

### v2.0.0 (Q4 2024)
- [ ] AI-powered column suggestions
- [ ] Advanced analytics integration
- [ ] Custom visualization types
- [ ] Enterprise features

---

**Made with ❤️ for the ERPNext Community**

