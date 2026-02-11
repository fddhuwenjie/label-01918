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
Contract Management Platform

Build a contract management platform with the following features:
1. User authentication and role-based access control (Admin, Manager, Consultant, Viewer)
2. Customer management with CRUD operations, search, filter, and bulk actions
3. Sales consultant management with department assignment
4. Contract lifecycle management (draft → pending → active → completed → terminated) with media attachments and version control
5. Advanced search and filtering with multiple criteria
6. Bulk operations and CSV data export
7. Analytics dashboard with key metrics, charts, and trends
8. Report generation (contract summary, consultant performance, customer analysis, revenue)
9. Contract versioning with history tracking and rollback capability
10. Approval workflow with automatic routing based on contract value
11. System administration (settings, user management, role permissions)
12. RBAC permission control with department-level data isolation
13. Performance optimization with pagination, debounced search, and responsive design
```