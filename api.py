# -*- coding: utf-8 -*-
from __future__ import unicode_literals

import frappe
import json
from frappe import _
from frappe.utils import cstr, flt, cint, get_datetime
from frappe.model.meta import get_meta
import re

@frappe.whitelist()
def get_custom_column_data(doctype, column_config, doc_names=None):
    """
    Lấy dữ liệu cho các cột tùy chỉnh
    """
    try:
        if isinstance(column_config, str):
            column_config = json.loads(column_config)
        
        if isinstance(doc_names, str):
            doc_names = json.loads(doc_names)
        
        if not doc_names:
            # Lấy danh sách documents từ list view hiện tại
            doc_names = get_current_list_docs(doctype)
        
        results = {}
        
        for column in column_config:
            if not column.get('is_custom'):
                continue
                
            column_id = column.get('id')
            column_data = {}
            
            try:
                if column.get('source_query'):
                    column_data = execute_custom_query_for_column(column, doc_names)
                elif column.get('formula'):
                    column_data = calculate_formula_for_column(column, doc_names, doctype)
                elif column.get('fieldname'):
                    column_data = get_field_data_for_column(column, doc_names, doctype)
                
                results[column_id] = column_data
                
            except Exception as e:
                frappe.log_error(f"Error processing column {column_id}: {str(e)}")
                results[column_id] = {doc_name: "" for doc_name in doc_names}
        
        return results
        
    except Exception as e:
        frappe.log_error(f"Error in get_custom_column_data: {str(e)}")
        return {}

@frappe.whitelist()
def execute_custom_query(query, doc_names=None, doctype=None):
    """
    Thực thi custom SQL query
    """
    try:
        # Validate query để đảm bảo an toàn
        if not is_safe_query(query):
            frappe.throw(_("Query không được phép"))
        
        if isinstance(doc_names, str):
            doc_names = json.loads(doc_names)
        
        # Thực thi query với parameters
        results = frappe.db.sql(query, {
            'doc_names': doc_names,
            'doctype': doctype
        }, as_dict=True)
        
        return results
        
    except Exception as e:
        frappe.log_error(f"Error executing custom query: {str(e)}")
        frappe.throw(_("Lỗi khi thực thi query: {0}").format(str(e)))

@frappe.whitelist()
def get_available_fields(doctype):
    """
    Lấy danh sách các trường có thể sử dụng cho doctype
    """
    try:
        meta = get_meta(doctype)
        fields = []
        
        # Standard fields từ DocType
        for field in meta.fields:
            if is_field_supported(field):
                fields.append({
                    'fieldname': field.fieldname,
                    'label': field.label,
                    'fieldtype': field.fieldtype,
                    'options': field.options,
                    'is_custom': field.get('is_custom_field', False),
                    'category': 'custom' if field.get('is_custom_field') else 'standard'
                })
        
        # System fields
        system_fields = [
            {'fieldname': 'name', 'label': 'ID', 'fieldtype': 'Data', 'category': 'system'},
            {'fieldname': 'creation', 'label': 'Created', 'fieldtype': 'Datetime', 'category': 'system'},
            {'fieldname': 'modified', 'label': 'Modified', 'fieldtype': 'Datetime', 'category': 'system'},
            {'fieldname': 'owner', 'label': 'Created By', 'fieldtype': 'Link', 'category': 'system'},
            {'fieldname': 'modified_by', 'label': 'Modified By', 'fieldtype': 'Link', 'category': 'system'},
            {'fieldname': 'docstatus', 'label': 'Status', 'fieldtype': 'Int', 'category': 'system'}
        ]
        
        for field in system_fields:
            if not any(f['fieldname'] == field['fieldname'] for f in fields):
                fields.append(field)
        
        return fields
        
    except Exception as e:
        frappe.log_error(f"Error getting available fields: {str(e)}")
        return []

@frappe.whitelist()
def save_column_configuration(doctype, configuration):
    """
    Lưu cấu hình cột cho user
    """
    try:
        if isinstance(configuration, str):
            configuration = json.loads(configuration)
        
        user = frappe.session.user
        
        # Tạo hoặc update User Settings
        settings_name = f"column_config_{doctype}_{user}"
        
        if frappe.db.exists("User Settings", settings_name):
            doc = frappe.get_doc("User Settings", settings_name)
            doc.configuration = json.dumps(configuration)
            doc.save()
        else:
            doc = frappe.get_doc({
                "doctype": "User Settings",
                "name": settings_name,
                "user": user,
                "doctype_name": doctype,
                "configuration": json.dumps(configuration)
            })
            doc.insert()
        
        return {"status": "success", "message": "Configuration saved"}
        
    except Exception as e:
        frappe.log_error(f"Error saving column configuration: {str(e)}")
        return {"status": "error", "message": str(e)}

@frappe.whitelist()
def load_column_configuration(doctype):
    """
    Tải cấu hình cột cho user
    """
    try:
        user = frappe.session.user
        settings_name = f"column_config_{doctype}_{user}"
        
        if frappe.db.exists("User Settings", settings_name):
            doc = frappe.get_doc("User Settings", settings_name)
            if doc.configuration:
                return json.loads(doc.configuration)
        
        return None
        
    except Exception as e:
        frappe.log_error(f"Error loading column configuration: {str(e)}")
        return None

def execute_custom_query_for_column(column, doc_names):
    """
    Thực thi custom query cho một cột
    """
    query = column.get('source_query', '')
    results = {}
    
    if not query:
        return results
    
    try:
        # Replace placeholders trong query
        processed_query = query.replace('%(doc_names)s', "({})".format(
            ','.join([f"'{name}'" for name in doc_names])
        ))
        
        # Thực thi query
        data = frappe.db.sql(processed_query, as_dict=True)
        
        # Process results
        for row in data:
            if 'name' in row or 'doc_name' in row:
                doc_name = row.get('name') or row.get('doc_name')
                # Lấy giá trị đầu tiên không phải name
                value = None
                for key, val in row.items():
                    if key not in ['name', 'doc_name']:
                        value = val
                        break
                
                if value is not None:
                    results[doc_name] = format_value(value, column.get('fieldtype', 'Data'))
        
        # Đảm bảo tất cả doc_names đều có giá trị
        for doc_name in doc_names:
            if doc_name not in results:
                results[doc_name] = get_default_value(column.get('fieldtype', 'Data'))
        
        return results
        
    except Exception as e:
        frappe.log_error(f"Error executing query for column: {str(e)}")
        return {doc_name: get_default_value(column.get('fieldtype', 'Data')) for doc_name in doc_names}

def calculate_formula_for_column(column, doc_names, doctype):
    """
    Tính toán formula cho một cột
    """
    formula = column.get('formula', '')
    results = {}
    
    if not formula:
        return results
    
    try:
        # Extract field names từ formula
        field_pattern = r'\{(\w+)\}'
        required_fields = list(set(re.findall(field_pattern, formula)))
        
        if not required_fields:
            return {doc_name: get_default_value(column.get('fieldtype', 'Data')) for doc_name in doc_names}
        
        # Lấy dữ liệu cho các fields cần thiết
        fields_to_fetch = ['name'] + required_fields
        data = frappe.get_all(doctype, 
                             filters=[['name', 'in', doc_names]], 
                             fields=fields_to_fetch)
        
        # Tính toán formula cho từng document
        for doc in data:
            try:
                expression = formula
                
                # Replace field placeholders
                for field in required_fields:
                    value = doc.get(field, 0)
                    if value is None:
                        value = 0
                    expression = expression.replace(f'{{{field}}}', str(value))
                
                # Evaluate expression (chỉ cho phép các operation an toàn)
                if is_safe_expression(expression):
                    result = eval(expression)
                    results[doc.name] = format_value(result, column.get('fieldtype', 'Data'))
                else:
                    results[doc.name] = get_default_value(column.get('fieldtype', 'Data'))
                    
            except Exception as e:
                frappe.log_error(f"Error evaluating formula for {doc.name}: {str(e)}")
                results[doc.name] = get_default_value(column.get('fieldtype', 'Data'))
        
        # Đảm bảo tất cả doc_names đều có giá trị
        for doc_name in doc_names:
            if doc_name not in results:
                results[doc_name] = get_default_value(column.get('fieldtype', 'Data'))
        
        return results
        
    except Exception as e:
        frappe.log_error(f"Error calculating formula: {str(e)}")
        return {doc_name: get_default_value(column.get('fieldtype', 'Data')) for doc_name in doc_names}

def get_field_data_for_column(column, doc_names, doctype):
    """
    Lấy dữ liệu từ field có sẵn
    """
    fieldname = column.get('fieldname')
    results = {}
    
    if not fieldname:
        return results
    
    try:
        data = frappe.get_all(doctype,
                             filters=[['name', 'in', doc_names]],
                             fields=['name', fieldname])
        
        for doc in data:
            value = doc.get(fieldname)
            results[doc.name] = format_value(value, column.get('fieldtype', 'Data'))
        
        # Đảm bảo tất cả doc_names đều có giá trị
        for doc_name in doc_names:
            if doc_name not in results:
                results[doc_name] = get_default_value(column.get('fieldtype', 'Data'))
        
        return results
        
    except Exception as e:
        frappe.log_error(f"Error getting field data: {str(e)}")
        return {doc_name: get_default_value(column.get('fieldtype', 'Data')) for doc_name in doc_names}

def get_current_list_docs(doctype, limit=20):
    """
    Lấy danh sách documents hiện tại từ list view
    """
    try:
        docs = frappe.get_all(doctype, fields=['name'], limit=limit)
        return [doc.name for doc in docs]
    except Exception:
        return []

def is_safe_query(query):
    """
    Kiểm tra query có an toàn không
    """
    query_lower = query.lower()
    
    # Các từ khóa nguy hiểm
    dangerous_keywords = [
        'drop', 'delete', 'update', 'insert', 'alter', 'create',
        'truncate', 'grant', 'revoke', 'exec', 'execute',
        'sp_', 'xp_', 'into outfile', 'load_file'
    ]
    
    for keyword in dangerous_keywords:
        if keyword in query_lower:
            return False
    
    # Chỉ cho phép SELECT statements
    if not query_lower.strip().startswith('select'):
        return False
    
    return True

def is_safe_expression(expression):
    """
    Kiểm tra expression có an toàn để eval không
    """
    # Chỉ cho phép numbers, operators, parentheses
    safe_pattern = r'^[0-9+\-*/.() \t\n\r]+$'
    dangerous_patterns = [
        r'eval', r'exec', r'import', r'__', r'globals', r'locals'
    ]
    
    if not re.match(safe_pattern, expression):
        return False
    
    for pattern in dangerous_patterns:
        if re.search(pattern, expression, re.IGNORECASE):
            return False
    
    return True

def is_field_supported(field):
    """
    Kiểm tra field có được support không
    """
    supported_types = [
        'Data', 'Link', 'Select', 'Int', 'Float', 'Currency', 'Percent',
        'Check', 'Date', 'Datetime', 'Time', 'Text', 'Small Text'
    ]
    
    return (field.fieldtype in supported_types and 
            not field.hidden and 
            field.fieldname != 'name')

def format_value(value, fieldtype):
    """
    Format giá trị theo field type
    """
    if value is None:
        return get_default_value(fieldtype)
    
    try:
        if fieldtype == 'Currency':
            return frappe.utils.fmt_money(flt(value))
        elif fieldtype == 'Float':
            return flt(value)
        elif fieldtype == 'Int':
            return cint(value)
        elif fieldtype == 'Percent':
            return f"{flt(value):.2f}%"
        elif fieldtype == 'Date':
            if value:
                return frappe.utils.formatdate(value)
            return ""
        elif fieldtype == 'Datetime':
            if value:
                return frappe.utils.format_datetime(value)
            return ""
        elif fieldtype == 'Check':
            return "✓" if cint(value) else ""
        else:
            return cstr(value)
    except Exception:
        return get_default_value(fieldtype)

def get_default_value(fieldtype):
    """
    Lấy giá trị mặc định cho field type
    """
    defaults = {
        'Currency': 0,
        'Float': 0,
        'Int': 0,
        'Percent': '0%',
        'Check': '',
        'Date': '',
        'Datetime': '',
        'Data': '',
        'Text': '',
        'Small Text': ''
    }
    
    return defaults.get(fieldtype, '')

@frappe.whitelist()
def get_column_stats(doctype):
    """
    Lấy thống kê về việc sử dụng column manager
    """
    try:
        # Đếm số user đang sử dụng column manager cho doctype này
        user_count = frappe.db.count("User Settings", 
                                     filters={"doctype_name": doctype})
        
        # Lấy thông tin về các cột custom phổ biến
        configurations = frappe.get_all("User Settings",
                                       filters={"doctype_name": doctype},
                                       fields=["configuration"])
        
        custom_columns = {}
        for config in configurations:
            if config.configuration:
                try:
                    data = json.loads(config.configuration)
                    for column in data.get('columns', []):
                        if column.get('is_custom'):
                            label = column.get('label', 'Unknown')
                            custom_columns[label] = custom_columns.get(label, 0) + 1
                except Exception:
                    continue
        
        return {
            "user_count": user_count,
            "popular_custom_columns": custom_columns,
            "doctype": doctype
        }
        
    except Exception as e:
        frappe.log_error(f"Error getting column stats: {str(e)}")
        return {"user_count": 0, "popular_custom_columns": {}, "doctype": doctype}

