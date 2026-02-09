import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Input, Select, Space, Tag, Modal, Form, message, Typography, Row, Col, Card } from 'antd';
import { PlusOutlined, SearchOutlined, ExportOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

const statusColors = { active: 'success', inactive: 'default', prospect: 'processing', archived: 'error' };
const statusMap = { active: '活跃', inactive: '停用', prospect: '潜在', archived: '归档' };
const statusOptions = Object.entries(statusMap).map(([value, label]) => ({ label, value }));

export default function Customers() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [options, setOptions] = useState({ regions: [], industries: [], statuses: [] });
  const [filters, setFilters] = useState({ search: '', status: '', region: '', industry: '', page: 1, pageSize: 20 });
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/customers', { params });
      setData(res.data.data);
      setTotal(res.data.total);
    } catch (err) { message.error('加载客户失败'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { api.get('/customers/options').then(r => setOptions(r.data)); }, []);

  const handleSave = async (values) => {
    try {
      if (editRecord) { await api.put(`/customers/${editRecord.id}`, values); message.success('客户已更新'); }
      else { await api.post('/customers', values); message.success('客户已创建'); }
      setModalOpen(false); form.resetFields(); setEditRecord(null); fetchData();
    } catch (err) { message.error(err.response?.data?.error || '保存失败'); }
  };

  const handleExport = () => {
    const rows = selectedKeys.length ? data.filter(d => selectedKeys.includes(d.id)) : data;
    const csv = ['姓名,邮箱,电话,公司,地区,行业,状态',
      ...rows.map(r => `${r.name},${r.email},${r.phone},${r.company},${r.region},${r.industry},${statusMap[r.status]||r.status}`)].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '客户列表.csv'; a.click();
  };

  const handleBulkStatus = async (status) => {
    if (!selectedKeys.length) return message.warning('请先选择记录');
    await api.post('/customers/bulk-status', { ids: selectedKeys, status });
    message.success('状态已更新'); setSelectedKeys([]); fetchData();
  };

  const openEdit = (record) => { setEditRecord(record); form.setFieldsValue(record); setModalOpen(true); };

  const columns = [
    { title: '姓名', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: '邮箱', dataIndex: 'email', ellipsis: true },
    { title: '电话', dataIndex: 'phone', width: 120 },
    { title: '公司', dataIndex: 'company', ellipsis: true },
    { title: '地区', dataIndex: 'region', width: 80 },
    { title: '状态', dataIndex: 'status', render: s => <Tag color={statusColors[s]}>{statusMap[s] || s}</Tag>, width: 80 },
    { title: '操作', width: 100, render: (_, r) => (
      <Space>
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/customers/${r.id}`)} />
        {hasPermission('customers', 'write') && <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />}
      </Space>
    )},
  ];

  return (
    <div>
      <Typography.Title level={4}>客户管理</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[8, 8]} align="middle">
          <Col flex="auto">
            <Space wrap>
              <Input placeholder="搜索..." prefix={<SearchOutlined />} value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))} style={{ width: 200 }} allowClear />
              <Select placeholder="状态" value={filters.status || undefined} onChange={v => setFilters(f => ({ ...f, status: v || '', page: 1 }))} style={{ width: 100 }} allowClear options={statusOptions} />
              <Select placeholder="地区" value={filters.region || undefined} onChange={v => setFilters(f => ({ ...f, region: v || '', page: 1 }))} style={{ width: 120 }} allowClear
                options={options.regions.map(s => ({ label: s, value: s }))} />
              <Select placeholder="行业" value={filters.industry || undefined} onChange={v => setFilters(f => ({ ...f, industry: v || '', page: 1 }))} style={{ width: 130 }} allowClear
                options={options.industries.map(s => ({ label: s, value: s }))} />
            </Space>
          </Col>
          <Col>
            <Space>
              {selectedKeys.length > 0 && <Select placeholder="批量改状态" style={{ width: 130 }} onChange={handleBulkStatus} options={statusOptions} />}
              <Button icon={<ExportOutlined />} onClick={handleExport}>导出CSV</Button>
              {hasPermission('customers', 'write') && <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditRecord(null); form.resetFields(); setModalOpen(true); }}>新建客户</Button>}
            </Space>
          </Col>
        </Row>
      </Card>
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
        rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys }}
        pagination={{ current: filters.page, pageSize: filters.pageSize, total, showSizeChanger: true, showTotal: t => `共 ${t} 条`,
          onChange: (page, pageSize) => setFilters(f => ({ ...f, page, pageSize })) }}
        scroll={{ x: 800 }} size="middle" />

      <Modal title={editRecord ? '编辑客户' : '新建客户'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={640} destroyOnClose okText="保存" cancelText="取消">
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="email" label="邮箱"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="phone" label="电话"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="company" label="公司"><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="region" label="地区"><Select options={options.regions.map(s => ({ label: s, value: s }))} allowClear /></Form.Item></Col>
            <Col span={12}><Form.Item name="industry" label="行业"><Select options={options.industries.map(s => ({ label: s, value: s }))} allowClear /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="status" label="状态"><Select options={statusOptions} /></Form.Item></Col>
            <Col span={12}><Form.Item name="address" label="地址"><Input /></Form.Item></Col>
          </Row>
          <Form.Item name="notes" label="备注"><Input.TextArea rows={2} /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
