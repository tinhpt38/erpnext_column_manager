# Hướng dẫn Cài đặt ERPNext Column Manager

## 📋 Yêu cầu hệ thống

### Phần mềm cần thiết
- **ERPNext**: v13.0+ (khuyến nghị v14.0+)
- **Frappe**: v13.0+ (khuyến nghị v14.0+)
- **Python**: 3.7+
- **Node.js**: 14.0+ (cho development)
- **Browser**: Chrome 80+, Firefox 75+, Safari 13+, Edge 80+

### Kiểm tra phiên bản hiện tại

```bash
# Kiểm tra phiên bản ERPNext
bench version

# Kiểm tra phiên bản Python
python3 --version

# Kiểm tra phiên bản Node.js (nếu cần development)
node --version
```

## 🚀 Cài đặt Production

### Phương pháp 1: Cài đặt từ GitHub (Khuyến nghị)

```bash
# 1. Chuyển vào thư mục bench
cd /path/to/your/frappe-bench

# 2. Get app từ GitHub
bench get-app https://github.com/your-repo/erpnext_column_manager.git

# 3. Install app cho site
bench --site [your-site-name] install-app erpnext_column_manager

# 4. Restart để áp dụng thay đổi
bench restart

# 5. Clear cache (tùy chọn)
bench --site [your-site-name] clear-cache
```

### Phương pháp 2: Cài đặt thủ công

```bash
# 1. Clone repository
git clone https://github.com/your-repo/erpnext_column_manager.git

# 2. Copy vào thư mục apps
cp -r erpnext_column_manager /path/to/frappe-bench/apps/

# 3. Chuyển vào thư mục bench
cd /path/to/frappe-bench

# 4. Install app
bench --site [your-site-name] install-app erpnext_column_manager

# 5. Restart server
bench restart
```

### Phương pháp 3: Cài đặt từ file ZIP

```bash
# 1. Download và extract file ZIP
wget https://github.com/your-repo/erpnext_column_manager/archive/main.zip
unzip main.zip

# 2. Rename và move vào apps
mv erpnext_column_manager-main erpnext_column_manager
mv erpnext_column_manager /path/to/frappe-bench/apps/

# 3. Install như bình thường
cd /path/to/frappe-bench
bench --site [your-site-name] install-app erpnext_column_manager
bench restart
```

## 🛠️ Cài đặt Development

### Setup môi trường development

```bash
# 1. Clone repository
git clone https://github.com/your-repo/erpnext_column_manager.git
cd erpnext_column_manager

# 2. Install Node.js dependencies (cho development tools)
npm install

# 3. Copy vào frappe-bench
cp -r . /path/to/frappe-bench/apps/erpnext_column_manager

# 4. Chuyển vào bench directory
cd /path/to/frappe-bench

# 5. Install app
bench --site [your-site-name] install-app erpnext_column_manager

# 6. Enable developer mode
bench --site [your-site-name] set-config developer_mode 1

# 7. Start development server
bench start
```

### Development tools

```bash
# Watch for file changes (trong thư mục app)
npm run watch

# Build production assets
npm run build

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

## ⚙️ Cấu hình

### Cấu hình cơ bản

Sau khi cài đặt, Column Manager sẽ tự động hoạt động. Không cần cấu hình thêm.

### Cấu hình nâng cao

Tạo file `site_config.json` trong thư mục site:

```json
{
  "column_manager": {
    "enabled": true,
    "max_columns": 50,
    "cache_timeout": 300,
    "enable_debug": false,
    "supported_doctypes": [
      "Item",
      "Customer", 
      "Supplier",
      "Sales Invoice",
      "Purchase Invoice"
    ]
  }
}
```

### Cấu hình Database

Nếu cần tạo custom tables cho lưu trữ:

```bash
# Migrate database
bench --site [your-site-name] migrate

# Rebuild search index (nếu cần)
bench --site [your-site-name] build-search-index
```

## 🔧 Customization

### Thêm DocType mới

1. Tạo file JavaScript cho DocType:

```bash
# Tạo file trong public/js/
touch apps/erpnext_column_manager/public/js/your_doctype_list.js
```

2. Thêm vào hooks.py:

```python
doctype_list_js = {
    "Your DocType": "public/js/your_doctype_list.js"
}
```

3. Implement integration:

```javascript
frappe.listview_settings['Your DocType'] = {
    onload: function(listview) {
        if (window.ColumnManager) {
            listview.column_manager = new ColumnManager(listview);
        }
    }
};
```

### Custom CSS

Tạo file CSS tùy chỉnh:

```bash
# Tạo custom CSS
touch apps/erpnext_column_manager/public/css/custom.css
```

Thêm vào hooks.py:

```python
app_include_css = [
    "/assets/erpnext_column_manager/css/column_manager.css",
    "/assets/erpnext_column_manager/css/custom.css"
]
```

## 🧪 Kiểm tra cài đặt

### Kiểm tra app đã được install

```bash
# List tất cả apps
bench --site [your-site-name] list-apps

# Kiểm tra app status
bench --site [your-site-name] app-status erpnext_column_manager
```

### Kiểm tra trong ERPNext

1. Đăng nhập vào ERPNext
2. Mở bất kỳ List View nào (ví dụ: Item List)
3. Kiểm tra có nút "Quản lý cột" trên toolbar không
4. Thử phím tắt `Ctrl+Shift+C`

### Kiểm tra JavaScript console

Mở Developer Tools (F12) và kiểm tra:

```javascript
// Kiểm tra Column Manager có load không
console.log(window.ColumnManager);

// Kiểm tra current list view
console.log(window.cur_list);

// Kiểm tra column manager instance
console.log(window.cur_list?.column_manager);
```

## 🐛 Troubleshooting

### Lỗi thường gặp

#### 1. App không xuất hiện trong list

```bash
# Kiểm tra app có trong apps folder không
ls apps/ | grep column_manager

# Reinstall app
bench --site [your-site-name] uninstall-app erpnext_column_manager
bench --site [your-site-name] install-app erpnext_column_manager
```

#### 2. JavaScript không load

```bash
# Clear cache và rebuild
bench --site [your-site-name] clear-cache
bench build --app erpnext_column_manager
bench restart
```

#### 3. Permission errors

```bash
# Fix permissions
sudo chown -R [user]:[group] apps/erpnext_column_manager
chmod -R 755 apps/erpnext_column_manager
```

#### 4. Database migration errors

```bash
# Force migrate
bench --site [your-site-name] migrate --skip-failing

# Reset migrations (cẩn thận!)
bench --site [your-site-name] migrate --reset
```

### Debug mode

Enable debug để xem chi tiết lỗi:

```bash
# Enable debug mode
bench --site [your-site-name] set-config developer_mode 1
bench --site [your-site-name] set-config debug 1

# Restart
bench restart
```

### Log files

Kiểm tra log files:

```bash
# Frappe logs
tail -f logs/web.log
tail -f logs/worker.log

# Nginx logs (nếu có)
tail -f /var/log/nginx/error.log

# Browser console logs
# Mở Developer Tools > Console
```

## 🔄 Cập nhật

### Cập nhật từ GitHub

```bash
# Pull latest changes
cd apps/erpnext_column_manager
git pull origin main

# Migrate if needed
cd ../..
bench --site [your-site-name] migrate

# Restart
bench restart
```

### Cập nhật thủ công

```bash
# Backup current version
cp -r apps/erpnext_column_manager apps/erpnext_column_manager_backup

# Download new version
wget https://github.com/your-repo/erpnext_column_manager/archive/main.zip
unzip main.zip

# Replace files
rm -rf apps/erpnext_column_manager
mv erpnext_column_manager-main apps/erpnext_column_manager

# Migrate and restart
bench --site [your-site-name] migrate
bench restart
```

## 🗑️ Gỡ cài đặt

### Gỡ cài đặt hoàn toàn

```bash
# 1. Uninstall app từ site
bench --site [your-site-name] uninstall-app erpnext_column_manager

# 2. Remove app từ apps folder
rm -rf apps/erpnext_column_manager

# 3. Restart
bench restart

# 4. Clear cache
bench --site [your-site-name] clear-cache
```

### Backup trước khi gỡ

```bash
# Backup database
bench --site [your-site-name] backup

# Backup app files
cp -r apps/erpnext_column_manager ~/column_manager_backup
```

## 📞 Hỗ trợ

Nếu gặp vấn đề trong quá trình cài đặt:

1. **Kiểm tra Requirements**: Đảm bảo đáp ứng tất cả yêu cầu hệ thống
2. **Xem Logs**: Kiểm tra log files để tìm lỗi cụ thể
3. **GitHub Issues**: Tạo issue mới với thông tin chi tiết
4. **Community Forum**: Hỏi trên ERPNext Community Forum
5. **Email Support**: Liên hệ support@yourcompany.com

### Thông tin cần cung cấp khi báo lỗi

- Phiên bản ERPNext/Frappe
- Hệ điều hành
- Browser và phiên bản
- Log files liên quan
- Steps để reproduce lỗi
- Screenshots (nếu có)

---

**Chúc bạn cài đặt thành công! 🎉**

