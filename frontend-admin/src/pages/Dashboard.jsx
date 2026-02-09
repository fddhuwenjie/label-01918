import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Spin, Typography } from 'antd';
import { FileTextOutlined, DollarOutlined, TeamOutlined, SolutionOutlined } from '@ant-design/icons';
import { PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../api';

const COLORS = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1'];
const statusMap = { draft: '草稿', pending: '待审批', active: '生效中', completed: '已完成', terminated: '已终止' };

export default function Dashboard() {
  const [overview, setOverview] = useState(null);
  const [statusData, setStatusData] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/overview'),
      api.get('/analytics/contract-status'),
      api.get('/analytics/revenue-trend'),
    ]).then(([ov, st, rv]) => {
      setOverview(ov.data);
      setStatusData(st.data.map(d => ({ ...d, label: statusMap[d.status] || d.status })));
      setRevenueTrend(rv.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      <Typography.Title level={4} style={{ marginBottom: 16 }}>工作台</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="合同总数" value={overview?.totalContracts} prefix={<FileTextOutlined />} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="生效合同" value={overview?.activeContracts} prefix={<FileTextOutlined />} valueStyle={{ color: '#52c41a' }} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="总收入" value={overview?.totalRevenue} prefix={<DollarOutlined />} precision={2} /></Card>
        </Col>
        <Col xs={24} sm={12} lg={6}>
          <Card><Statistic title="在职顾问" value={overview?.activeConsultants} prefix={<SolutionOutlined />} /></Card>
        </Col>
      </Row>
      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="合同状态分布">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie data={statusData} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={100} label={({ label, count }) => `${label}: ${count}`}>
                  {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="收入趋势">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueTrend}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" stroke="#1677ff" name="收入" />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>
    </div>
  );
}
