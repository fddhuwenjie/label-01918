import React, { useState } from 'react';
import { Card, Button, Space, Typography, Table, DatePicker, message, Tabs, Statistic, Row, Col } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import api from '../api';

const { RangePicker } = DatePicker;

export default function Reports() {
  const [reportData, setReportData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState(null);

  const generateReport = async (type) => {
    setLoading(true);
    try {
      const params = {};
      if (dateRange) { params.date_from = dateRange[0].format('YYYY-MM-DD'); params.date_to = dateRange[1].format('YYYY-MM-DD'); }
      const res = await api.get(`/reports/${type}`, { params });
      setReportData({ type, ...res.data });
      message.success('报表已生成');
    } catch (err) { message.error('生成报表失败'); }
    finally { setLoading(false); }
  };

  const exportCSV = () => {
    if (!reportData?.data) return;
    const headers = Object.keys(reportData.data[0] || {}).join(',');
    const rows = reportData.data.map(r => Object.values(r).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + headers + '\n' + rows], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `${reportData.type}-报表.csv`; a.click();
  };

  const items = [
    { key: 'contract-summary', label: '合同汇总', children: (
      <div>
        <Space style={{ marginBottom: 16 }}>
          <RangePicker onChange={setDateRange} />
          <Button type="primary" loading={loading} onClick={() => generateReport('contract-summary')}>生成报表</Button>
        </Space>
        {reportData?.type === 'contract-summary' && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={8}><Card><Statistic title="合同总数" value={reportData.summary?.total_contracts} /></Card></Col>
              <Col span={8}><Card><Statistic title="总金额" value={reportData.summary?.total_value} prefix="¥" precision={2} /></Card></Col>
              <Col span={8}><Card><Statistic title="平均金额" value={reportData.summary?.total_contracts ? reportData.summary.total_value / reportData.summary.total_contracts : 0} prefix="¥" precision={2} /></Card></Col>
            </Row>
            <Table dataSource={reportData.data} rowKey="contract_number" size="small" pagination={{ pageSize: 20 }}
              columns={[
                { title: '合同编号', dataIndex: 'contract_number' },
                { title: '名称', dataIndex: 'name' },
                { title: '金额', dataIndex: 'value', render: v => `¥${(v||0).toLocaleString()}` },
                { title: '状态', dataIndex: 'status' },
                { title: '客户', dataIndex: 'customer_name' },
                { title: '顾问', dataIndex: 'consultant_name' },
                { title: '开始', dataIndex: 'start_date' },
                { title: '结束', dataIndex: 'end_date' },
              ]} />
          </>
        )}
      </div>
    )},
    { key: 'consultant-performance', label: '顾问业绩', children: (
      <div>
        <Button type="primary" loading={loading} onClick={() => generateReport('consultant-performance')} style={{ marginBottom: 16 }}>生成报表</Button>
        {reportData?.type === 'consultant-performance' && (
          <Table dataSource={reportData.data} rowKey="name" size="small"
            columns={[
              { title: '姓名', dataIndex: 'name' },
              { title: '部门', dataIndex: 'department_name' },
              { title: '状态', dataIndex: 'status' },
              { title: '合同数', dataIndex: 'contracts_handled' },
              { title: '总收入', dataIndex: 'total_revenue', render: v => `¥${(v||0).toLocaleString()}` },
              { title: '平均金额', dataIndex: 'avg_contract_value', render: v => `¥${Math.round(v||0).toLocaleString()}` },
              { title: '生效中', dataIndex: 'active_contracts' },
              { title: '已完成', dataIndex: 'completed_contracts' },
            ]} />
        )}
      </div>
    )},
    { key: 'customer-report', label: '客户报表', children: (
      <div>
        <Button type="primary" loading={loading} onClick={() => generateReport('customer-report')} style={{ marginBottom: 16 }}>生成报表</Button>
        {reportData?.type === 'customer-report' && (
          <Table dataSource={reportData.data} rowKey="name" size="small"
            columns={[
              { title: '姓名', dataIndex: 'name' },
              { title: '公司', dataIndex: 'company' },
              { title: '地区', dataIndex: 'region' },
              { title: '行业', dataIndex: 'industry' },
              { title: '状态', dataIndex: 'status' },
              { title: '合同数', dataIndex: 'contract_count' },
              { title: '总金额', dataIndex: 'total_value', render: v => `¥${(v||0).toLocaleString()}` },
            ]} />
        )}
      </div>
    )},
    { key: 'revenue', label: '收入报表', children: (
      <div>
        <Space style={{ marginBottom: 16 }}>
          <RangePicker onChange={setDateRange} />
          <Button type="primary" loading={loading} onClick={() => generateReport('revenue')}>生成报表</Button>
        </Space>
        {reportData?.type === 'revenue' && (
          <>
            <Card style={{ marginBottom: 16 }}><Statistic title="总收入" value={reportData.total_revenue} prefix="¥" precision={2} /></Card>
            <Table dataSource={reportData.monthly} rowKey="month" size="small"
              columns={[
                { title: '月份', dataIndex: 'month' },
                { title: '收入', dataIndex: 'revenue', render: v => `¥${(v||0).toLocaleString()}` },
                { title: '合同数', dataIndex: 'count' },
              ]} />
          </>
        )}
      </div>
    )},
  ];

  return (
    <div>
      <Row align="middle" justify="space-between" style={{ marginBottom: 16 }}>
        <Col><Typography.Title level={4} style={{ margin: 0 }}>报表中心</Typography.Title></Col>
        <Col>{reportData?.data && <Button icon={<DownloadOutlined />} onClick={exportCSV}>导出CSV</Button>}</Col>
      </Row>
      <Card>
        <Tabs items={items} />
        {reportData && <Typography.Text type="secondary" style={{ display: 'block', marginTop: 8 }}>生成时间：{reportData.generated_at}　生成人：{reportData.generated_by}</Typography.Text>}
      </Card>
    </div>
  );
}
