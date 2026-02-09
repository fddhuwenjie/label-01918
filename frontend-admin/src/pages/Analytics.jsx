import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Statistic, Spin, Typography, Table, Tag } from 'antd';
import { PieChart, Pie, Cell, LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import api from '../api';

const COLORS = ['#1677ff', '#52c41a', '#faad14', '#ff4d4f', '#722ed1', '#13c2c2'];
const statusMap = { draft: '草稿', pending: '待审批', active: '生效中', completed: '已完成', terminated: '已终止' };

export default function Analytics() {
  const [overview, setOverview] = useState(null);
  const [statusData, setStatusData] = useState([]);
  const [revenueTrend, setRevenueTrend] = useState([]);
  const [consultantPerf, setConsultantPerf] = useState([]);
  const [customerTrend, setCustomerTrend] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/analytics/overview'),
      api.get('/analytics/contract-status'),
      api.get('/analytics/revenue-trend'),
      api.get('/analytics/consultant-performance'),
      api.get('/analytics/customer-trend'),
    ]).then(([ov, st, rv, cp, ct]) => {
      setOverview(ov.data);
      setStatusData(st.data.map(d => ({ ...d, label: statusMap[d.status] || d.status })));
      setRevenueTrend(rv.data); setConsultantPerf(cp.data); setCustomerTrend(ct.data);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;

  return (
    <div>
      <Typography.Title level={4}>数据分析</Typography.Title>
      <Row gutter={[16, 16]}>
        <Col xs={12} sm={8} lg={4}><Card><Statistic title="合同总数" value={overview?.totalContracts} /></Card></Col>
        <Col xs={12} sm={8} lg={4}><Card><Statistic title="生效合同" value={overview?.activeContracts} valueStyle={{ color: '#52c41a' }} /></Card></Col>
        <Col xs={12} sm={8} lg={4}><Card><Statistic title="总收入" value={overview?.totalRevenue} prefix="¥" precision={0} /></Card></Col>
        <Col xs={12} sm={8} lg={4}><Card><Statistic title="平均金额" value={overview?.avgValue} prefix="¥" precision={0} /></Card></Col>
        <Col xs={12} sm={8} lg={4}><Card><Statistic title="在职顾问" value={overview?.activeConsultants} /></Card></Col>
        <Col xs={12} sm={8} lg={4}><Card><Statistic title="客户总数" value={overview?.totalCustomers} /></Card></Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="合同状态分布">
            <ResponsiveContainer width="100%" height={300}>
              <PieChart><Pie data={statusData} dataKey="count" nameKey="label" cx="50%" cy="50%" outerRadius={100} label>
                {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie><Tooltip /><Legend /></PieChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="收入趋势">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={revenueTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend />
                <Line type="monotone" dataKey="revenue" stroke="#1677ff" name="收入" /></LineChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} style={{ marginTop: 16 }}>
        <Col xs={24} lg={12}>
          <Card title="顾问业绩排名">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={consultantPerf.slice(0, 10)}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" /><YAxis /><Tooltip /><Legend />
                <Bar dataKey="total_value" fill="#1677ff" name="总金额" /></BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="客户增长趋势">
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={customerTrend}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="month" /><YAxis /><Tooltip /><Legend />
                <Bar dataKey="count" fill="#52c41a" name="新增客户" /></BarChart>
            </ResponsiveContainer>
          </Card>
        </Col>
      </Row>

      <Card title="顾问业绩明细" style={{ marginTop: 16 }}>
        <Table dataSource={consultantPerf} rowKey="id" size="small" pagination={{ pageSize: 10 }}
          columns={[
            { title: '姓名', dataIndex: 'name' },
            { title: '部门', dataIndex: 'department_name' },
            { title: '状态', dataIndex: 'status', render: s => <Tag color={s === 'active' ? 'success' : 'default'}>{statusMap[s] || s}</Tag> },
            { title: '合同数', dataIndex: 'contract_count', sorter: (a, b) => a.contract_count - b.contract_count },
            { title: '总金额', dataIndex: 'total_value', render: v => `¥${(v||0).toLocaleString()}`, sorter: (a, b) => a.total_value - b.total_value },
            { title: '平均金额', dataIndex: 'avg_value', render: v => `¥${Math.round(v||0).toLocaleString()}` },
          ]} />
      </Card>
    </div>
  );
}
