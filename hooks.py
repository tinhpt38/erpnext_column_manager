# -*- coding: utf-8 -*-
from __future__ import unicode_literals

app_name = "erpnext_column_manager"
app_title = "ERPNext Column Manager"
app_publisher = "Custom Development"
app_description = "Enhanced column management for ERPNext List Views"
app_icon = "octicon octicon-file-directory"
app_color = "grey"
app_email = "admin@example.com"
app_license = "MIT"

# Includes in <head>
# ------------------

# include js, css files in header of desk.html
app_include_css = "/assets/erpnext_column_manager/css/column_manager.css"
app_include_js = [
    "/assets/erpnext_column_manager/js/storage_manager.js",
    "/assets/erpnext_column_manager/js/data_handler.js", 
    "/assets/erpnext_column_manager/js/column_config_ui.js",
    "/assets/erpnext_column_manager/js/column_manager.js",
    "/assets/erpnext_column_manager/js/init.js"
]

# include js, css files in header of web template
# web_include_css = "/assets/erpnext_column_manager/css/column_manager.css"
# web_include_js = "/assets/erpnext_column_manager/js/column_manager.js"

# include custom scss in every website theme (without file extension ".scss")
# website_theme_scss = "erpnext_column_manager/public/scss/website"

# include js, css files in header of web form
# webform_include_js = {"doctype": "public/js/doctype.js"}
# webform_include_css = {"doctype": "public/css/doctype.css"}

# include js in page
# page_js = {"page" : "public/js/file.js"}

# include js in doctype views
doctype_js = {
    "Item": "public/js/item_list.js",
    "Customer": "public/js/customer_list.js",
    "Supplier": "public/js/supplier_list.js",
    "Sales Invoice": "public/js/sales_invoice_list.js",
    "Purchase Invoice": "public/js/purchase_invoice_list.js",
    "Sales Order": "public/js/sales_order_list.js",
    "Purchase Order": "public/js/purchase_order_list.js"
}

doctype_list_js = {
    "Item": "public/js/item_list.js",
    "Customer": "public/js/customer_list.js", 
    "Supplier": "public/js/supplier_list.js",
    "Sales Invoice": "public/js/sales_invoice_list.js",
    "Purchase Invoice": "public/js/purchase_invoice_list.js",
    "Sales Order": "public/js/sales_order_list.js",
    "Purchase Order": "public/js/purchase_order_list.js"
}

# include js in report
# report_js = {"report_name": "public/js/report.js"}

# include js in list view
# doctype_list_js = {"doctype" : "public/js/doctype_list.js"}

# include js in form view
# doctype_tree_js = {"doctype" : "public/js/doctype_tree.js"}
# doctype_calendar_js = {"doctype" : "public/js/doctype_calendar.js"}

# Home Pages
# ----------

# application home page (will override Website Settings)
# home_page = "login"

# website user home page (by Role)
# role_home_page = {
#	"Role": "home_page"
# }

# Generators
# ----------

# automatically create page for each record of this doctype
# website_generators = ["Web Page"]

# Installation
# ------------

# before_install = "erpnext_column_manager.install.before_install"
# after_install = "erpnext_column_manager.install.after_install"

# Desk Notifications
# ------------------
# See frappe.core.notifications.get_notification_config

# notification_config = "erpnext_column_manager.notifications.get_notification_config"

# Permissions
# -----------
# Permissions evaluated in scripted ways

# permission_query_conditions = {
# 	"Event": "frappe.desk.doctype.event.event.get_permission_query_conditions",
# }
#
# has_permission = {
# 	"Event": "frappe.desk.doctype.event.event.has_permission",
# }

# DocType Class
# ---------------
# Override standard doctype classes

# override_doctype_class = {
# 	"ToDo": "custom_app.overrides.CustomToDo"
# }

# Document Events
# ---------------
# Hook on document methods and events

# doc_events = {
# 	"*": {
# 		"on_update": "method",
# 		"on_cancel": "method",
# 		"on_trash": "method"
#	}
# }

# Scheduled Tasks
# ---------------

# scheduler_events = {
# 	"all": [
# 		"erpnext_column_manager.tasks.all"
# 	],
# 	"daily": [
# 		"erpnext_column_manager.tasks.daily"
# 	],
# 	"hourly": [
# 		"erpnext_column_manager.tasks.hourly"
# 	],
# 	"weekly": [
# 		"erpnext_column_manager.tasks.weekly"
# 	]
# 	"monthly": [
# 		"erpnext_column_manager.tasks.monthly"
# 	]
# }

# Testing
# -------

# before_tests = "erpnext_column_manager.install.before_tests"

# Overriding Methods
# ------------------------------
#
# override_whitelisted_methods = {
# 	"frappe.desk.doctype.event.event.get_events": "erpnext_column_manager.event.get_events"
# }
#
# each overriding function accepts a `data` argument;
# generated from the base implementation of the doctype dashboard,
# along with any modifications made in other Frappe apps
# override_doctype_dashboards = {
# 	"Task": "erpnext_column_manager.task.get_dashboard_data"
# }

# exempt linked doctypes from being automatically cancelled
#
# auto_cancel_exempted_doctypes = ["Auto Repeat"]


# User Data Protection
# --------------------

user_data_fields = [
    {
        "doctype": "{doctype_1}",
        "filter_by": "{filter_by}",
        "redact_fields": ["{field_1}", "{field_2}"],
        "partial": 1,
    },
    {
        "doctype": "{doctype_2}",
        "filter_by": "{filter_by}",
        "partial": 1,
    },
    {
        "doctype": "{doctype_3}",
        "strict": False,
    },
    {
        "doctype": "{doctype_4}"
    }
]

# Authentication and authorization
# --------------------------------

# auth_hooks = [
# 	"erpnext_column_manager.auth.validate"
# ]

# API whitelist
# -------------

# Whitelisted API methods for external access
override_whitelisted_methods = {
    "erpnext_column_manager.api.get_custom_column_data": "erpnext_column_manager.api.get_custom_column_data",
    "erpnext_column_manager.api.execute_custom_query": "erpnext_column_manager.api.execute_custom_query",
    "erpnext_column_manager.api.get_available_fields": "erpnext_column_manager.api.get_available_fields",
    "erpnext_column_manager.api.save_column_configuration": "erpnext_column_manager.api.save_column_configuration",
    "erpnext_column_manager.api.load_column_configuration": "erpnext_column_manager.api.load_column_configuration"
}

