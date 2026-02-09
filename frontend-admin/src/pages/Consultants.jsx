import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Input, Select, Space, Tag, Modal, Form, DatePicker, message, Typography, Row, Col, Card } from 'antd';
import { PlusOutlined, SearchOutlined, ExportOutlined, EditOutlined, EyeOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

const statusColors = { active: 'success', on_leave: 'warning', inactive: 'default' };
const statusMap = { active: '在职', on_leave: '休假', inactive: '离职' };
const statusOptions = Object.entries(statusMap).map(([value, label]) => ({ label, value }));

export default function Consultants() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [filters, setFilters] = useState({ search: '', department: '', status: '', page: 1, pageSize: 20 });
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/consultants', { params });
      setData(res.data.data); setTotal(res.data.total);
    } catch (err) { message.error('加载失败'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => { api.get('/departments').then(r => setDepartments(r.data)); }, []);

  const handleSave = async (values) => {
    try {
      const payload = { ...values, hire_date: values.hire_date?.format('YYYY-MM-DD') };
      if (editRecord) { await api.put(`/consultants/${editRecord.id}`, payload); message.success('已更新'); }
      else { await api.post('/consultants', payload); message.success('已创建'); }
      setModalOpen(false); form.resetFields(); setEditRecord(null); fetchData();
    } catch (err) { message.error(err.response?.data?.error || '保存失败'); }
  };

  const handleExport = () => {
    const rows = selectedKeys.length ? data.filter(d => selectedKeys.includes(d.id)) : data;
    const csv = ['姓名,邮箱,电话,部门,状态,入职日期,合同数,总金额',
      ...rows.map(r => `${r.name},${r.email},${r.phone},${r.department_name||''},${statusMap[r.status]||r.status},${r.hire_date||''},${r.contract_count},${r.total_value}`)].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '顾问列表.csv'; a.click();
  };

  const openEdit = (record) => {
    setEditRecord(record);
    form.setFieldsValue({ ...record, hire_date: record.hire_date ? dayjs(record.hire_date) : null });
    setModalOpen(true);
  };

  const columns = [
    { title: '姓名', dataIndex: 'name', sorter: (a, b) => a.name.localeCompare(b.name) },
    { title: '邮箱', dataIndex: 'email', ellipsis: true },
    { title: '电话', dataIndex: 'phone', width: 120 },
    { title: '部门', dataIndex: 'department_name', width: 100 },
    { title: '状态', dataIndex: 'status', render: s => <Tag color={statusColors[s]}>{statusMap[s] || s}</Tag>, width: 80 },
    { title: '合同数', dataIndex: 'contract_count', width: 80, sorter: (a, b) => a.contract_count - b.contract_count },
    { title: '总金额', dataIndex: 'total_value', render: v => `¥${(v||0).toLocaleString()}`, width: 120, sorter: (a, b) => a.total_value - b.total_value },
    { title: '操作', width: 100, render: (_, r) => (
      <Space>
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/consultants/${r.id}`)} />
        {hasPermission('consultants', 'write') && <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />}
      </Space>
    )},
  ];

  return (
    <div>
      <Typography.Title level={4}>销售顾问</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[8, 8]} align="middle">
          <Col flex="auto">
            <Space wrap>
              <Input placeholder="搜索..." prefix={<SearchOutlined />} value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))} style={{ width: 200 }} allowClear />
              <Select placeholder="部门" value={filters.department || undefined} onChange={v => setFilters(f => ({ ...f, department: v || '', page: 1 }))} style={{ width: 130 }} allowClear
                options={departments.map(d => ({ label: d.name, value: d.id }))} />
              <Select placeholder="状态" value={filters.status || undefined} onChange={v => setFilters(f => ({ ...f, status: v || '', page: 1 }))} style={{ width: 100 }} allowClear options={statusOptions} />
            </Space>
          </Col>
          <Col>
            <Space>
              <Button icon={<ExportOutlined />} onClick={handleExport}>导出CSV</Button>
              {hasPermission('consultants', 'write') && <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditRecord(null); form.resetFields(); setModalOpen(true); }}>新建顾问</Button>}
            </Space>
          </Col>
        </Row>
      </Card>
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
        rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys }}
        pagination={{ current: filters.page, pageSize: filters.pageSize, total, showSizeChanger: true, showTotal: t => `共 ${t} 条`,
          onChange: (page, pageSize) => setFilters(f => ({ ...f, page, pageSize })) }}
        scroll={{ x: 900 }} size="middle" />

      <Modal title={editRecord ? '编辑顾问' : '新建顾问'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={560} destroyOnClose okText="保存" cancelText="取消">
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="name" label="姓名" rules={[{ required: true, message: '请输入姓名' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="email" label="邮箱" rules={[{ required: true, type: 'email', message: '请输入有效邮箱' }]}><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="phone" label="电话"><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="department_id" label="部门"><Select options={departments.map(d => ({ label: d.name, value: d.id }))} allowClear /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="hire_date" label="入职日期"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="status" label="状态"><Select options={statusOptions} /></Form.Item></Col>
          </Row>
        </Form>
      </Modal>
    </div>
  );
}
