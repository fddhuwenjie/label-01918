import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Spin, Button, Space, Typography, Table, Tabs, Form, Input, Select, message, List } from 'antd';
import { ArrowLeftOutlined, PlusOutlined } from '@ant-design/icons';
import api from '../api';

const statusColors = { active: 'success', inactive: 'default', prospect: 'processing', archived: 'error' };
const statusMap = { active: '活跃', inactive: '停用', prospect: '潜在', archived: '归档' };
const contactTypeMap = { note: '备注', call: '电话', email: '邮件', meeting: '会议' };

export default function CustomerDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [noteForm] = Form.useForm();

  const fetchCustomer = () => {
    setLoading(true);
    api.get(`/customers/${id}`).then(r => setCustomer(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchCustomer(); }, [id]);

  const addNote = async (values) => {
    await api.post(`/customers/${id}/contacts`, values);
    message.success('记录已添加');
    noteForm.resetFields();
    fetchCustomer();
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!customer) return <Typography.Text>客户未找到</Typography.Text>;

  const items = [
    { key: 'details', label: '详细信息', children: (
      <Descriptions bordered column={{ xs: 1, sm: 2 }}>
        <Descriptions.Item label="姓名">{customer.name}</Descriptions.Item>
        <Descriptions.Item label="邮箱">{customer.email}</Descriptions.Item>
        <Descriptions.Item label="电话">{customer.phone}</Descriptions.Item>
        <Descriptions.Item label="公司">{customer.company}</Descriptions.Item>
        <Descriptions.Item label="地址">{customer.address}</Descriptions.Item>
        <Descriptions.Item label="地区">{customer.region}</Descriptions.Item>
        <Descriptions.Item label="行业">{customer.industry}</Descriptions.Item>
        <Descriptions.Item label="状态"><Tag color={statusColors[customer.status]}>{statusMap[customer.status] || customer.status}</Tag></Descriptions.Item>
        <Descriptions.Item label="创建时间">{customer.created_at}</Descriptions.Item>
        <Descriptions.Item label="备注" span={2}>{customer.notes || '-'}</Descriptions.Item>
      </Descriptions>
    )},
    { key: 'contracts', label: `关联合同 (${customer.contracts?.length || 0})`, children: (
      <Table dataSource={customer.contracts} rowKey="id" size="small" pagination={false}
        columns={[
          { title: '合同编号', dataIndex: 'contract_number' },
          { title: '合同名称', dataIndex: 'name' },
          { title: '金额', dataIndex: 'value', render: v => `¥${(v||0).toLocaleString()}` },
          { title: '状态', dataIndex: 'status', render: s => <Tag>{s}</Tag> },
          { title: '操作', render: (_, r) => <Button type="link" size="small" onClick={() => navigate(`/contracts/${r.id}`)}>查看</Button> },
        ]} />
    )},
    { key: 'contacts', label: `联系记录 (${customer.contacts?.length || 0})`, children: (
      <div>
        <Form form={noteForm} layout="inline" onFinish={addNote} style={{ marginBottom: 16 }}>
          <Form.Item name="type" initialValue="note"><Select style={{ width: 100 }} options={Object.entries(contactTypeMap).map(([value, label]) => ({ label, value }))} /></Form.Item>
          <Form.Item name="content" rules={[{ required: true, message: '请输入内容' }]}><Input placeholder="添加记录..." style={{ width: 400 }} /></Form.Item>
          <Form.Item><Button type="primary" htmlType="submit" icon={<PlusOutlined />}>添加</Button></Form.Item>
        </Form>
        <List dataSource={customer.contacts} renderItem={item => (
          <List.Item>
            <List.Item.Meta title={<><Tag>{contactTypeMap[item.type] || item.type}</Tag> {item.created_by_name} - {item.created_at}</>} description={item.content} />
          </List.Item>
        )} />
      </div>
    )},
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/customers')}>返回</Button>
        <Typography.Title level={4} style={{ margin: 0 }}>{customer.name}</Typography.Title>
      </Space>
      <Tabs items={items} />
    </div>
  );
}
