import React, { useState, useEffect, useCallback } from 'react';
import { Table, Button, Input, Select, Space, Tag, Modal, Form, message, Typography, Row, Col, Card, Popconfirm } from 'antd';
import { PlusOutlined, SearchOutlined, EditOutlined, StopOutlined, KeyOutlined } from '@ant-design/icons';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

const roleMap = { Admin: '管理员', Manager: '经理', Consultant: '顾问', Viewer: '观察者' };

export default function Users() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [roles, setRoles] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({ search: '', role: '', status: '', page: 1, pageSize: 20 });
  const [form] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [passwordUserId, setPasswordUserId] = useState(null);
  const { user } = useAuth();
  const isAdmin = user?.role_name === 'Admin';

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/users', { params });
      setData(res.data.data); setTotal(res.data.total);
    } catch (err) { message.error('加载失败'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    api.get('/users/roles').then(r => setRoles(r.data));
    api.get('/departments').then(r => setDepartments(r.data));
  }, []);

  const handleSave = async (values) => {
    try {
      if (editRecord) { await api.put(`/users/${editRecord.id}`, values); message.success('用户已更新'); }
      else { await api.post('/users', values); message.success('用户已创建'); }
      setModalOpen(false); form.resetFields(); setEditRecord(null); fetchData();
    } catch (err) { message.error(err.response?.data?.error || '保存失败'); }
  };

  const handleResetPassword = async (values) => {
    try {
      await api.put(`/users/${passwordUserId}/reset-password`, { newPassword: values.newPassword });
      message.success('密码已重置');
      setPasswordModalOpen(false);
      passwordForm.resetFields();
      setPasswordUserId(null);
    } catch (err) {
      message.error(err.response?.data?.error || '重置密码失败');
    }
  };

  const openPasswordModal = (id) => {
    setPasswordUserId(id);
    passwordForm.resetFields();
    setPasswordModalOpen(true);
  };

  const handleDeactivate = async (id) => {
    try {
      await api.delete(`/users/${id}`);
      message.success('用户已停用'); 
      fetchData();
    } catch (err) {
      message.error(err.response?.data?.error || '停用失败');
    }
  };

  const openEdit = (record) => { setEditRecord(record); form.setFieldsValue(record); setModalOpen(true); };

  const columns = [
    { title: '姓名', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: '邮箱', dataIndex: 'email', ellipsis: true },
    { title: '角色', dataIndex: 'role_name', width: 100, render: r => <Tag color="blue">{roleMap[r] || r}</Tag> },
    { title: '部门', dataIndex: 'department_name', width: 100 },
    { title: '状态', dataIndex: 'status', render: s => <Tag color={s === 'active' ? 'success' : 'default'}>{s === 'active' ? '启用' : '停用'}</Tag>, width: 80 },
    { title: '最后登录', dataIndex: 'last_login', width: 160 },
    { title: '操作', width: 150, render: (_, r) => (
      <Space>
        <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />
        {isAdmin && <Button type="link" size="small" icon={<KeyOutlined />} onClick={() => openPasswordModal(r.id)} />}
        {isAdmin && r.id !== user?.id && r.status === 'active' && (
          <Popconfirm title="确定停用该用户？" onConfirm={() => handleDeactivate(r.id)} okText="确定" cancelText="取消">
            <Button type="link" size="small" danger icon={<StopOutlined />} />
          </Popconfirm>
        )}
      </Space>
    )},
  ];

  return (
    <div>
      <Typography.Title level={4}>用户管理</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[8, 8]} align="middle">
          <Col flex="auto">
            <Space wrap>
              <Input placeholder="搜索..." prefix={<SearchOutlined />} value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))} style={{ width: 200 }} allowClear />
              <Select placeholder="角色" value={filters.role || undefined} onChange={v => setFilters(f => ({ ...f, role: v || '', page: 1 }))} style={{ width: 120 }} allowClear
                options={roles.map(r => ({ label: roleMap[r.name] || r.name, value: r.name }))} />
              <Select placeholder="状态" value={filters.status || undefined} onChange={v => setFilters(f => ({ ...f, status: v || '', page: 1 }))} style={{ width: 100 }} allowClear
                options={[{ label: '启用', value: 'active' }, { label: '停用', value: 'inactive' }]} />
            </Space>
          </Col>
          <Col>
            {isAdmin && <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditRecord(null); form.resetFields(); setModalOpen(true); }}>新建用户</Button>}
          </Col>
        </Row>
      </Card>
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
        pagination={{ current: filters.page, pageSize: filters.pageSize, total, showSizeChanger: true, showTotal: t => `共 ${t} 条`,
          onChange: (page, pageSize) => setFilters(f => ({ ...f, page, pageSize })) }}
        scroll={{ x: 800 }} size="middle" />

      <Modal title={editRecord ? '编辑用户' : '新建用户'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={560} destroyOnClose okText="保存" cancelText="取消">
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}><Input /></Form.Item></Col>
          </Row>
          {!editRecord && <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}><Input.Password /></Form.Item>}
          <Row gutter={16}>
            <Col span={12}><Form.Item name="phone" label="电话"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="role_id" label="角色" rules={[{ required: true, message: '请选择角色' }]}><Select options={roles.map(r => ({ label: roleMap[r.name] || r.name, value: r.id }))} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="department_id" label="部门"><Select options={departments.map(d => ({ label: d.name, value: d.id }))} allowClear /></Form.Item></Col>
            <Col span={12}><Form.Item name="status" label="状态"><Select options={[{ label: '启用', value: 'active' }, { label: '停用', value: 'inactive' }]} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>

      <Modal title="重置密码" open={passwordModalOpen} onCancel={() => { setPasswordModalOpen(false); setPasswordUserId(null); }} onOk={() => passwordForm.submit()} okText="确定" cancelText="取消" destroyOnClose>
        <Form form={passwordForm} layout="vertical" onFinish={handleResetPassword}>
          <Form.Item name="newPassword" label="新密码" rules={[{ required: true, message: '请输入新密码' }, { min: 6, message: '密码至少6位' }]}>
            <Input.Password placeholder="请输入新密码" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
