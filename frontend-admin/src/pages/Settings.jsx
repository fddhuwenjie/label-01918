import React, { useState, useEffect } from 'react';
import { Card, Form, Input, Button, message, Typography, Tabs, Table, Modal, Space, Popconfirm } from 'antd';
import { SaveOutlined, PlusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import api from '../api';

export default function Settings() {
  const [settingsForm] = Form.useForm();
  const [roleForm] = Form.useForm();
  const [deptForm] = Form.useForm();
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [roleModal, setRoleModal] = useState(false);
  const [deptModal, setDeptModal] = useState(false);
  const [editRole, setEditRole] = useState(null);
  const [editDept, setEditDept] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.get('/settings').then(r => settingsForm.setFieldsValue(r.data)).catch(() => {});
    api.get('/users/roles').then(r => setRoles(r.data));
    api.get('/departments').then(r => setDepartments(r.data));
  }, []);

  const saveSettings = async (values) => {
    setLoading(true);
    try { await api.put('/settings', values); message.success('设置已保存'); }
    catch (err) { message.error('保存失败'); }
    finally { setLoading(false); }
  };

  const saveRole = async (values) => {
    try {
      if (editRole) { await api.put(`/users/roles/${editRole.id}`, values); }
      else { await api.post('/users/roles', values); }
      message.success('角色已保存');
      setRoleModal(false); roleForm.resetFields(); setEditRole(null);
      api.get('/users/roles').then(r => setRoles(r.data));
    } catch (err) { message.error('保存失败'); }
  };

  const saveDept = async (values) => {
    try {
      if (editDept) { await api.put(`/departments/${editDept.id}`, values); }
      else { await api.post('/departments', values); }
      message.success('部门已保存');
      setDeptModal(false); deptForm.resetFields(); setEditDept(null);
      api.get('/departments').then(r => setDepartments(r.data));
    } catch (err) { message.error('保存失败'); }
  };

  const deleteDept = async (id) => {
    await api.delete(`/departments/${id}`);
    message.success('已删除');
    api.get('/departments').then(r => setDepartments(r.data));
  };

  const items = [
    { key: 'general', label: '基本设置', children: (
      <Form form={settingsForm} layout="vertical" onFinish={saveSettings} style={{ maxWidth: 500 }}>
        <Form.Item name="contract_prefix" label="合同编号前缀"><Input placeholder="CTR-" /></Form.Item>
        <Form.Item name="fiscal_year_start" label="财年起始日"><Input placeholder="01-01" /></Form.Item>
        <Form.Item name="company_name" label="公司名称"><Input /></Form.Item>
        <Form.Item name="default_currency" label="默认货币"><Input placeholder="CNY" /></Form.Item>
        <Form.Item><Button type="primary" htmlType="submit" icon={<SaveOutlined />} loading={loading}>保存设置</Button></Form.Item>
      </Form>
    )},
    { key: 'roles', label: '角色管理', children: (
      <div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditRole(null); roleForm.resetFields(); setRoleModal(true); }} style={{ marginBottom: 16 }}>新建角色</Button>
        <Table dataSource={roles} rowKey="id" size="small"
          columns={[
            { title: '名称', dataIndex: 'name' },
            { title: '描述', dataIndex: 'description' },
            { title: '操作', render: (_, r) => <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setEditRole(r); roleForm.setFieldsValue(r); setRoleModal(true); }} /> },
          ]} />
        <Modal title={editRole ? '编辑角色' : '新建角色'} open={roleModal} onCancel={() => setRoleModal(false)} onOk={() => roleForm.submit()} destroyOnClose okText="保存" cancelText="取消">
          <Form form={roleForm} layout="vertical" onFinish={saveRole}>
            <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input /></Form.Item>
            <Form.Item name="description" label="描述"><Input /></Form.Item>
          </Form>
        </Modal>
      </div>
    )},
    { key: 'departments', label: '部门管理', children: (
      <div>
        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditDept(null); deptForm.resetFields(); setDeptModal(true); }} style={{ marginBottom: 16 }}>新建部门</Button>
        <Table dataSource={departments} rowKey="id" size="small"
          columns={[
            { title: '名称', dataIndex: 'name' },
            { title: '描述', dataIndex: 'description' },
            { title: '操作', render: (_, r) => (
              <Space>
                <Button type="link" size="small" icon={<EditOutlined />} onClick={() => { setEditDept(r); deptForm.setFieldsValue(r); setDeptModal(true); }} />
                <Popconfirm title="确定删除？" onConfirm={() => deleteDept(r.id)} okText="确定" cancelText="取消"><Button type="link" size="small" danger icon={<DeleteOutlined />} /></Popconfirm>
              </Space>
            )},
          ]} />
        <Modal title={editDept ? '编辑部门' : '新建部门'} open={deptModal} onCancel={() => setDeptModal(false)} onOk={() => deptForm.submit()} destroyOnClose okText="保存" cancelText="取消">
          <Form form={deptForm} layout="vertical" onFinish={saveDept}>
            <Form.Item name="name" label="名称" rules={[{ required: true, message: '请输入名称' }]}><Input /></Form.Item>
            <Form.Item name="description" label="描述"><Input /></Form.Item>
          </Form>
        </Modal>
      </div>
    )},
  ];

  return (
    <div>
      <Typography.Title level={4}>系统设置</Typography.Title>
      <Card><Tabs items={items} /></Card>
    </div>
  );
}
