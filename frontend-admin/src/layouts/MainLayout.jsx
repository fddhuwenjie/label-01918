import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Avatar, Dropdown, Space, theme } from 'antd';
import {
  DashboardOutlined, FileTextOutlined, TeamOutlined, UserOutlined,
  BarChartOutlined, FileSearchOutlined, SettingOutlined, AuditOutlined,
  LogoutOutlined, MenuFoldOutlined, MenuUnfoldOutlined, SolutionOutlined,
  CheckSquareOutlined
} from '@ant-design/icons';
import { useAuth } from '../contexts/AuthContext';

const { Header, Sider, Content } = Layout;

const roleNameMap = { Admin: '管理员', Manager: '经理', Consultant: '顾问', Viewer: '观察者' };

export default function MainLayout() {
  const [collapsed, setCollapsed] = useState(false);
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { token: { colorBgContainer, borderRadiusLG } } = theme.useToken();

  const menuItems = [
    { key: '/', icon: <DashboardOutlined />, label: '工作台' },
    { key: '/contracts', icon: <FileTextOutlined />, label: '合同管理' },
    { key: '/approvals', icon: <CheckSquareOutlined />, label: '审批中心' },
    { key: '/customers', icon: <TeamOutlined />, label: '客户管理' },
    { key: '/consultants', icon: <SolutionOutlined />, label: '销售顾问' },
    { key: '/analytics', icon: <BarChartOutlined />, label: '数据分析' },
    { key: '/reports', icon: <FileSearchOutlined />, label: '报表中心' },
    ...(user?.role_name === 'Admin' || user?.role_name === 'Manager' ? [
      { key: '/users', icon: <UserOutlined />, label: '用户管理' },
      { key: '/logs', icon: <AuditOutlined />, label: '操作日志' },
    ] : []),
    ...(user?.role_name === 'Admin' ? [
      { key: '/settings', icon: <SettingOutlined />, label: '系统设置' },
    ] : []),
  ];

  const userMenu = {
    items: [
      { key: 'profile', label: `${user?.name}（${roleNameMap[user?.role_name] || user?.role_name}）`, disabled: true },
      { type: 'divider' },
      { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: () => { logout(); navigate('/login'); } },
    ]
  };

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider trigger={null} collapsible collapsed={collapsed} theme="dark">
        <div className="logo">{collapsed ? '合同' : '合同管理系统'}</div>
        <Menu theme="dark" mode="inline" selectedKeys={[location.pathname]}
          items={menuItems} onClick={({ key }) => navigate(key)} />
      </Sider>
      <Layout>
        <Header style={{ padding: '0 16px', background: colorBgContainer, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          {React.createElement(collapsed ? MenuUnfoldOutlined : MenuFoldOutlined, {
            onClick: () => setCollapsed(!collapsed), style: { fontSize: 18, cursor: 'pointer' }
          })}
          <Dropdown menu={userMenu} placement="bottomRight">
            <Space style={{ cursor: 'pointer' }}>
              <Avatar icon={<UserOutlined />} />
              {user?.name}
            </Space>
          </Dropdown>
        </Header>
        <Content style={{ margin: 16, padding: 24, background: colorBgContainer, borderRadius: borderRadiusLG, overflow: 'auto' }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
