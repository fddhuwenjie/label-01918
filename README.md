# 合同管理平台 (Contract Management Platform)

企业级合同全生命周期管理系统，支持合同创建、审批流程、客户管理、销售顾问管理、数据分析与报表等功能。

## 项目介绍

本系统为 B 端管理后台，面向企业内部合同管理场景，主要功能包括：

- 合同管理：创建、编辑、状态流转（草稿→待审批→生效→完成/终止）、版本控制与回退、媒体文件关联
- 审批工作流：提交审批后根据合同金额和提交人角色自动路由审批人（≥5万由管理员审批，<5万由经理审批，经理提交的合同统一由管理员审批），支持通过/拒绝/取消
- 客户管理：客户信息维护、搜索过滤、批量操作、联系记录
- 销售顾问管理：顾问档案、部门分配
- 数据分析：合同状态分布、收入趋势、顾问绩效等可视化图表
- 报表中心：合同汇总、顾问绩效、客户分析、收入报表，支持 CSV 导出
- 系统管理：用户管理、角色权限（RBAC）、操作日志、系统设置

技术栈：
- 前端：React 18 + Ant Design 5 + Recharts + React Router 6
- 后端：Node.js + Express + sql.js（纯 WASM SQLite）
- 部署：Docker + Docker Compose + Nginx 反向代理

## 如何运行

确保已安装 Docker 和 Docker Compose，在项目根目录执行：

```bash
docker-compose up --build -d
```

启动完成后访问管理后台：http://localhost:8085

如需重置数据库（清除所有数据重新初始化）：

```bash
docker-compose down -v && docker-compose up --build -d
```

## 服务列表

| 服务 | 端口 | 说明 |
|------|------|------|
| frontend-admin | 8085 | 管理后台（React + Ant Design + Nginx） |
| backend | 3002 | REST API 服务（Node.js + Express + SQLite） |

前端通过 Nginx 反向代理将 `/api/*` 请求转发到后端服务，无需跨域配置。

## 测试账号

系统初始化时自动创建以下测试账号：

| 角色 | 邮箱 | 密码 | 权限说明 |
|------|------|------|----------|
| 管理员 (Admin) | admin@example.com | admin123 | 全部权限，可审批所有合同 |
| 经理 (Manager) | manager@example.com | user123 | 合同/客户/顾问管理，可审批<5万合同 |
| 顾问 (Consultant) | consultant@example.com | user123 | 合同/客户读写，提交审批 |
| 观察者 (Viewer) | viewer@example.com | user123 | 只读权限 |

## 审批规则

合同提交审批后，系统根据提交人角色和合同金额自动分配审批人：

| 提交人 | 合同金额 | 审批人 | 说明 |
|--------|----------|--------|------|
| 管理员 (Admin) | 任意 | 自动通过 | 管理员提交的合同无需审批 |
| 经理 (Manager) | 任意 | 管理员 | 经理提交的合同统一由管理员审批，避免自审 |
| 顾问 (Consultant) | ≥5万 | 管理员 | 大额合同需管理员审批 |
| 顾问 (Consultant) | <5万 | 经理 | 小额合同由经理审批 |

合同状态流转：草稿 → 待审批 → 生效中 → 已完成/已终止

## 题目 / Prompt

以下是用于生成本项目的原始提示词：

```
Project: Contract Management Platform 
Overview 
An enterprise contract management system for managing contracts, sales consultants, customers, and organizational permissions. Built with Ant Design and REST API integration. The platform enables teams to track contracts with media files, manage sales consultants and customers, control access through role-based permissions, and generate insights through analytics and reporting. 
Phase 1: Authentication & User Management 
Foundation phase establishing secure user access and role-based permission system. 
Key Features 
User login and session management 
Role and permission definitions 
User account management (create, edit, deactivate) 
Department-based access control 
Tasks 
User login interface with email and password 
User session management and logout 
Create and manage user accounts (admin function) 
Assign user roles and permissions 
Department hierarchy and management 
User profile and password management 
Track user activity and login history 
Notes 
Connect to existing Node.js/Express API authentication endpoints 
Support multiple roles: Admin, Manager, Sales Consultant, Viewer 
Department-level and role-level permission enforcement required 
Phase 2: Customer Management 
Complete customer database management with search, filtering, and lifecycle tracking. 
Key Features 
Customer information database 
Search and advanced filtering by multiple criteria 
Customer status tracking 
Customer contact and communication history 
Bulk operations on customer records 
Tasks 
View all customers in searchable table 
Create new customer records (name, contact info, company, address, phone, email) 
Edit and update customer information 
Search customers by name, email, phone, company 
Filter customers by region, industry, status, creation date 
Export customer data to CSV/Excel 
Delete or deactivate customer records 
Bulk status updates for multiple customers 
Track customer contact history and notes 
Notes 
Customer data source: REST API backend 
Support date range filtering for customer creation and last activity 
Track customer status: Active, Inactive, Prospect, Archived 
Phase 3: Sales Consultant Management 
Management of sales team members with performance tracking capability. 
Key Features 
Sales consultant profiles and information 
Consultant assignment to customers and contracts 
Consultant status and availability tracking 
Performance metrics tracking 
Tasks 
View all sales consultants in searchable list 
Create and manage consultant profiles (name, email, phone, department, hire date) 
Edit consultant information and assign to departments 
Search consultants by name, department, status 
Filter consultants by department and availability status 
Track consultant status: Active, On Leave, Inactive 
Export consultant list to CSV/Excel 
Assign consultants to customer accounts 
View consultant performance summary 
Notes 
Consultant data source: REST API backend 
Track assignment history and workload distribution 
Support department-based filtering and access control 
Phase 4: Core Contract Management 
Central contract lifecycle management with document tracking and status workflows. 
Key Features 
Contract creation and information management 
Media file linking (images, videos via URLs) 
Contract status and workflow tracking 
Customer and consultant assignment to contracts 
Contract detail views and editing 
Tasks 
View all contracts in a searchable table with key information 
Create new contract with details (contract name, number, value, start date, end date, status) 
Assign customer and sales consultant to contract 
Add contract media links (image URLs, video URLs) 
Edit contract information and media links 
Track contract status (Draft, Pending, Active, Completed, Terminated) 
Delete or archive contracts 
View contract details page with all associated information 
Track contract created date and last modified date 
Link multiple media files to single contract 
Notes 
Store media as file URLs/links only (no direct file upload/storage) 
Media types: Images (JPG, PNG, GIF), Videos (MP4, WebM) 
Contract value tracking for revenue calculations 
Support contract renewal and extension workflows 
Phase 5: Advanced Search & Filtering 
Powerful search and filtering capabilities across all data types with date range and status filters. 
Key Features 
Multi-criteria advanced search 
Date range filtering for contracts 
Status-based filtering across modules 
Saved search filters 
Search results display with export option 
Tasks 
Search contracts by name, number, customer name, consultant name 
Filter contracts by status, date range, contract value range 
Filter contracts by assigned consultant and customer 
Combine multiple filters simultaneously 
Search across customers and consultants globally 
Save custom search filters for reuse 
Display search results with pagination 
Clear all filters and reset search 
Count matching results for active filters 
Notes 
Support complex AND/OR filter logic 
Date range: Start date and end date pickers 
Filters persist in URL for sharing/bookmarking 
Real-time search as user types (with debouncing) 
Phase 6: Bulk Operations & Data Export 
Batch processing capabilities for efficient data management and reporting. 
Key Features 
Bulk select functionality across tables 
Batch status updates 
Export to multiple formats 
Bulk delete with confirmation 
Tasks 
Select multiple records using checkboxes in tables 
Bulk update contract status for selected records 
Bulk update customer status for selected records 
Export selected contracts to CSV with all details 
Export selected customers to CSV 
Export selected consultants to CSV 
Export filtered contract list to Excel format 
Bulk delete with confirmation dialog 
Select all / deselect all checkbox functionality 
Notes 
Export includes timestamps and user who exported 
Bulk operations require appropriate permissions 
Confirmation required for destructive operations (delete) 
Phase 7: Analytics Dashboard 
Executive-level insights with key metrics, trends, and performance analytics. 
Key Features 
Key metrics cards (total contracts, revenue, active consultants) 
Contract status distribution visualization 
Revenue trends over time 
Consultant performance metrics 
Customer acquisition trends 
Tasks 
Display total active contracts and contract count metrics 
Display total contract revenue and average contract value 
Show contract status distribution (pie/bar chart) 
Display revenue trend over time (line chart) 
Show top performing sales consultants by revenue 
Display consultant performance metrics (contracts handled, total value) 
Show customer acquisition trend (monthly new customers) 
Filter analytics by date range 
Filter analytics by department 
Export dashboard data to PDF/Excel 
Notes 
Use Recharts for data visualization 
Real-time data updates from API 
Support year-to-date (YTD) and custom date range views 
Respect user department permissions in analytics display 
Phase 8: Report Generation 
Automated report creation for contracts, performance, and business intelligence. 
Key Features 
Contract summary reports 
Consultant performance reports 
Revenue and forecasting reports 
Custom report builder 
Scheduled report delivery 
Tasks 
Generate contract summary report (status, value, dates, participants) 
Generate consultant performance report (contracts handled, revenue, customer satisfaction) 
Generate customer report (acquisition date, contract count, total value, status) 
Generate revenue report by date range and consultant 
Create custom report with selected data fields 
Export reports to PDF format 
Export reports to Excel format 
Schedule automated report generation and email delivery 
View report history and download previous reports 
Notes 
Reports respect user permissions and department access 
Include visual charts where applicable 
Timestamp and generated-by information in all reports 
Phase 9: Contract Versioning & Document Workflow 
Contract version history, change tracking, and approval workflows. 
Key Features 
Version history tracking 
Change logs and audit trails 
E-signature workflow integration points 
Document comparison view 
Approval workflows 
Tasks 
Track contract versions with version numbers 
Display version history for each contract 
Show change log for contract updates (who changed what, when) 
Compare two contract versions side-by-side 
Revert to previous contract version 
Archive old versions with audit trail 
Document e-signature status tracking 
Create approval workflow state (Pending Approval, Approved, Rejected) 
Route contracts to approvers based on value or department rules 
Notes 
Full audit trail of all contract changes 
Support for comment/annotation on versions 
Track approval chain and signatures digitally (via URL fields) 
Phase 10: System Administration & Configuration 
Administrative panel for system-wide settings, user management, and data maintenance. 
Key Features 
System settings and configuration 
User account administration 
Role and permission management 
System logs and audit trails 
Data backup and maintenance 
Tasks 
Admin dashboard for system overview 
Manage user accounts (create, edit, disable, delete) 
Reset user passwords and manage access 
Create and modify roles with granular permissions 
Configure system-wide settings (contract number prefix, fiscal year, etc.) 
View system logs and audit trails 
Monitor API connection status and health 
Bulk import users from CSV 
Configure email notifications and alert settings 
Data export for backup and archiving 
Notes 
Admin-only access with strict permission checks 
All admin actions logged with user and timestamp 
Support role templates (Admin, Manager, Consultant, Viewer) 
Phase 11: Advanced Permission Control 
Complex role-based and data-level access control across the platform. 
Key Features 
Role-based access control (RBAC) 
Department-based data access 
Data-level permission rules 
Permission inheritance and hierarchy 
Custom permission sets 
Tasks 
Enforce role-based access to all modules (Admin, Manager, Consultant, Viewer) 
Restrict contract visibility by consultant ownership 
Restrict contract visibility by customer department assignment 
Limit customer data access by department 
Control export permissions by role 
Control report generation permissions by role 
Permission inheritance through department hierarchy 
Create custom permission rules for specific data 
Audit permission checks and access denials 
Notes 
Admin can view all data regardless of department 
Managers can see their department's data 
Consultants can see their assigned contracts/customers 
Viewer role is read-only across all modules 
Real-time permission enforcement on all API calls 
Phase 12: Performance Optimization & Polish 
Final phase for performance tuning, security hardening, and user experience refinement. 
Key Features 
API response optimization 
Data loading and caching strategies 
Security hardening 
User experience improvements 
Mobile responsiveness 
Tasks 
Implement pagination for large data sets 
Add data caching for frequently accessed information 
Optimize search and filter query performance 
Implement lazy loading for contract details and media 
Add request debouncing for real-time search 
Security audit and vulnerability fixes 
Input validation on all forms 
Rate limiting on API calls 
Responsive design testing across devices 
Error handling and user-friendly error messages 
Notes 
Use Ant Design components for consistent UI 
Implement loading states and skeleton screens 
Add success and error toast notifications 
Keyboard shortcuts for power users 
Accessibility compliance (WCAG AA)
```