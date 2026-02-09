import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Spin, Button, Space, Typography, Table, Statistic, Row, Col } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import api from '../api';

const statusColors = { active: 'success', on_leave: 'warning', inactive: 'default' };
const statusMap = { active: '在职', on_leave: '休假', inactive: '离职' };

export default function ConsultantDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [consultant, setConsultant] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/consultants/${id}`).then(r => setConsultant(r.data)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!consultant) return <Typography.Text>顾问未找到</Typography.Text>;

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/consultants')}>返回</Button>
        <Typography.Title level={4} style={{ margin: 0 }}>{consultant.name}</Typography.Title>
      </Space>
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={12} sm={6}><Card><Statistic title="合同数" value={consultant.contract_count} /></Card></Col>
        <Col xs={12} sm={6}><Card><Statistic title="总金额" value={consultant.total_value} prefix="¥" precision={2} /></Card></Col>
      </Row>
      <Card style={{ marginBottom: 16 }}>
        <Descriptions bordered column={{ xs: 1, sm: 2 }}>
          <Descriptions.Item label="姓名">{consultant.name}</Descriptions.Item>
          <Descriptions.Item label="邮箱">{consultant.email}</Descriptions.Item>
          <Descriptions.Item label="电话">{consultant.phone}</Descriptions.Item>
          <Descriptions.Item label="部门">{consultant.department_name}</Descriptions.Item>
          <Descriptions.Item label="入职日期">{consultant.hire_date}</Descriptions.Item>
          <Descriptions.Item label="状态"><Tag color={statusColors[consultant.status]}>{statusMap[consultant.status] || consultant.status}</Tag></Descriptions.Item>
        </Descriptions>
      </Card>
      <Card title="负责合同">
        <Table dataSource={consultant.contracts} rowKey="id" size="small"
          columns={[
            { title: '合同编号', dataIndex: 'contract_number' },
            { title: '合同名称', dataIndex: 'name' },
            { title: '客户', dataIndex: 'customer_name' },
            { title: '金额', dataIndex: 'value', render: v => `¥${(v||0).toLocaleString()}` },
            { title: '状态', dataIndex: 'status', render: s => <Tag>{s}</Tag> },
            { title: '操作', render: (_, r) => <Button type="link" size="small" onClick={() => navigate(`/contracts/${r.id}`)}>查看</Button> },
          ]} />
      </Card>
    </div>
  );
}
