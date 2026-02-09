import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Input, Select, Space, Tag, Modal, Form, InputNumber, DatePicker, message, Typography, Row, Col, Card } from 'antd';
import { PlusOutlined, SearchOutlined, ExportOutlined, EditOutlined, EyeOutlined, SendOutlined } from '@ant-design/icons';
import dayjs from 'dayjs';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

const statusColors = { draft: 'default', pending: 'processing', active: 'success', completed: 'blue', terminated: 'error' };
const statusMap = { draft: '草稿', pending: '待审批', active: '生效中', completed: '已完成', terminated: '已终止' };
const statusOptions = Object.entries(statusMap).map(([value, label]) => ({ label, value }));

export default function Contracts() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editRecord, setEditRecord] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [consultants, setConsultants] = useState([]);
  const [filters, setFilters] = useState({ search: '', status: '', page: 1, pageSize: 20 });
  const [form] = Form.useForm();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/contracts', { params });
      setData(res.data.data);
      setTotal(res.data.total);
    } catch (err) { message.error('加载合同失败'); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);
  useEffect(() => {
    api.get('/customers', { params: { pageSize: 1000 } }).then(r => setCustomers(r.data.data || []));
    api.get('/consultants', { params: { pageSize: 1000 } }).then(r => setConsultants(r.data.data || []));
  }, []);

  const handleSave = async (values) => {
    try {
      const payload = { ...values, start_date: values.start_date?.format('YYYY-MM-DD'), end_date: values.end_date?.format('YYYY-MM-DD'),
        media: values.media_urls ? values.media_urls.split('\n').filter(Boolean).map(url => ({ url: url.trim(), type: url.match(/\.(mp4|webm)/i) ? 'video' : 'image', title: '' })) : [] };
      delete payload.media_urls;
      if (editRecord) { await api.put(`/contracts/${editRecord.id}`, payload); message.success('合同已更新'); }
      else { await api.post('/contracts', payload); message.success('合同已创建'); }
      setModalOpen(false); form.resetFields(); setEditRecord(null); fetchData();
    } catch (err) { message.error(err.response?.data?.error || '保存失败'); }
  };

  const handleExport = () => {
    const rows = (selectedKeys.length ? data.filter(d => selectedKeys.includes(d.id)) : data);
    const csv = ['合同编号,合同名称,金额,状态,客户,顾问,开始日期,结束日期',
      ...rows.map(r => `${r.contract_number},${r.name},${r.value},${statusMap[r.status]||r.status},${r.customer_name || ''},${r.consultant_name || ''},${r.start_date || ''},${r.end_date || ''}`)].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = '合同列表.csv'; a.click();
  };

  const handleBulkStatus = async (status) => {
    if (!selectedKeys.length) return message.warning('请先选择记录');
    await api.post('/contracts/bulk-status', { ids: selectedKeys, status });
    message.success('状态已更新'); setSelectedKeys([]); fetchData();
  };

  const openEdit = (record) => {
    setEditRecord(record);
    form.setFieldsValue({ ...record, start_date: record.start_date ? dayjs(record.start_date) : null, end_date: record.end_date ? dayjs(record.end_date) : null, media_urls: '' });
    setModalOpen(true);
  };

  const handleSubmitApproval = async (record) => {
    try {
      await api.post(`/contracts/${record.id}/submit-approval`);
      message.success('已提交审批');
      fetchData();
    } catch (err) { message.error(err.response?.data?.error || '提交失败'); }
  };

  const columns = [
    { title: '合同编号', dataIndex: 'contract_number', sorter: (a, b) => a.contract_number.localeCompare(b.contract_number), width: 140 },
    { title: '合同名称', dataIndex: 'name', ellipsis: true },
    { title: '金额', dataIndex: 'value', render: v => `¥${(v || 0).toLocaleString()}`, sorter: (a, b) => a.value - b.value, width: 120 },
    { title: '状态', dataIndex: 'status', render: s => <Tag color={statusColors[s]}>{statusMap[s] || s}</Tag>, width: 100 },
    { title: '客户', dataIndex: 'customer_name', ellipsis: true },
    { title: '顾问', dataIndex: 'consultant_name', ellipsis: true },
    { title: '开始日期', dataIndex: 'start_date', width: 110 },
    { title: '操作', width: 160, render: (_, r) => (
      <Space>
        <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate(`/contracts/${r.id}`)} />
        {hasPermission('contracts', 'write') && r.status !== 'pending' && <Button type="link" size="small" icon={<EditOutlined />} onClick={() => openEdit(r)} />}
        {hasPermission('contracts', 'write') && r.status === 'draft' && (
          <Button type="link" size="small" icon={<SendOutlined />} onClick={() => handleSubmitApproval(r)}>提审</Button>
        )}
      </Space>
    )},
  ];

  return (
    <div>
      <Typography.Title level={4}>合同管理</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[8, 8]} align="middle">
          <Col flex="auto">
            <Space wrap>
              <Input placeholder="搜索..." prefix={<SearchOutlined />} value={filters.search} onChange={e => setFilters(f => ({ ...f, search: e.target.value, page: 1 }))} style={{ width: 220 }} allowClear />
              <Select placeholder="状态" value={filters.status || undefined} onChange={v => setFilters(f => ({ ...f, status: v || '', page: 1 }))} style={{ width: 130 }} allowClear options={statusOptions} />
            </Space>
          </Col>
          <Col>
            <Space>
              {selectedKeys.length > 0 && (
                <Select placeholder="批量改状态" style={{ width: 140 }} onChange={handleBulkStatus} options={statusOptions} />
              )}
              <Button icon={<ExportOutlined />} onClick={handleExport}>导出CSV</Button>
              {hasPermission('contracts', 'write') && <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditRecord(null); form.resetFields(); setModalOpen(true); }}>新建合同</Button>}
            </Space>
          </Col>
        </Row>
      </Card>
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
        rowSelection={{ selectedRowKeys: selectedKeys, onChange: setSelectedKeys }}
        pagination={{ current: filters.page, pageSize: filters.pageSize, total, showSizeChanger: true, showTotal: t => `共 ${t} 条`,
          onChange: (page, pageSize) => setFilters(f => ({ ...f, page, pageSize })) }}
        scroll={{ x: 900 }} size="middle" />

      <Modal title={editRecord ? '编辑合同' : '新建合同'} open={modalOpen} onCancel={() => setModalOpen(false)} onOk={() => form.submit()} width={640} destroyOnClose okText="保存" cancelText="取消">
        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="contract_number" label="合同编号" rules={[{ required: true, message: '请输入合同编号' }]}><Input /></Form.Item></Col>
            <Col span={12}><Form.Item name="name" label="合同名称" rules={[{ required: true, message: '请输入合同名称' }]}><Input /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="value" label="金额"><InputNumber style={{ width: '100%' }} min={0} precision={2} /></Form.Item></Col>
            <Col span={12}><Form.Item name="status" label="状态"><Select options={statusOptions} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="start_date" label="开始日期"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
            <Col span={12}><Form.Item name="end_date" label="结束日期"><DatePicker style={{ width: '100%' }} /></Form.Item></Col>
          </Row>
          <Row gutter={16}>
            <Col span={12}><Form.Item name="customer_id" label="客户"><Select showSearch optionFilterProp="label" options={customers.map(c => ({ label: c.name, value: c.id }))} allowClear /></Form.Item></Col>
            <Col span={12}><Form.Item name="consultant_id" label="顾问"><Select showSearch optionFilterProp="label" options={consultants.map(c => ({ label: c.name, value: c.id }))} allowClear /></Form.Item></Col>
          </Row>
          <Form.Item name="description" label="描述"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="media_urls" label="媒体链接（每行一个）"><Input.TextArea rows={3} placeholder="https://example.com/image.jpg" /></Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
