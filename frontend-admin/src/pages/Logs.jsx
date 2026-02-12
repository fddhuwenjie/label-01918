import React, { useState, useEffect, useCallback } from 'react';
import { Table, Input, Select, Typography, Card, Row, Col, Tag } from 'antd';
import { SearchOutlined } from '@ant-design/icons';
import api from '../api';

const actionMap = {
  login: '登录', logout: '登出', create_contract: '创建合同', update_contract: '更新合同',
  create_customer: '创建客户', update_customer: '更新客户', create_consultant: '创建顾问',
  bulk_update_contract: '批量更新合同', generate_report: '生成报表', contract_approval: '合同审批',
  create_user: '创建用户', update_user: '更新用户', deactivate_user: '停用用户',
  reset_password: '重置密码', password_change: '修改密码', archive_customer: '归档客户',
  terminate_contract: '终止合同', bulk_update_customer: '批量更新客户',
  submit_approval: '提交审批',
};
const actionColors = {
  login: 'blue', logout: 'default', create_contract: 'green', update_contract: 'orange',
  create_customer: 'green', update_customer: 'orange', create_consultant: 'green',
  bulk_update_contract: 'purple', generate_report: 'cyan', contract_approval: 'gold',
};
const entityMap = { user: '用户', customer: '客户', consultant: '顾问', contract: '合同', report: '报表' };

export default function Logs() {
  const [data, setData] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ action: '', entity_type: '', page: 1, pageSize: 50 });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      Object.entries(filters).forEach(([k, v]) => { if (v) params[k] = v; });
      const res = await api.get('/logs', { params });
      setData(res.data.data); setTotal(res.data.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filters]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const columns = [
    { title: '时间', dataIndex: 'created_at' },
    { title: '用户', dataIndex: 'user_name' },
    { title: '操作', dataIndex: 'action', render: a => <Tag color={actionColors[a] || 'default'}>{actionMap[a] || a}</Tag> },
    { title: '对象类型', dataIndex: 'entity_type', render: t => entityMap[t] || t },
    { title: '详情', dataIndex: 'details' },
  ];

  return (
    <div>
      <Typography.Title level={4}>操作日志</Typography.Title>
      <Card style={{ marginBottom: 16 }}>
        <Row gutter={[8, 8]}>
          <Col>
            <Select placeholder="对象类型" value={filters.entity_type || undefined} onChange={v => setFilters(f => ({ ...f, entity_type: v || '', page: 1 }))} style={{ width: 120 }} allowClear
              options={Object.entries(entityMap).map(([value, label]) => ({ label, value }))} />
          </Col>
          <Col>
            <Input placeholder="搜索操作..." prefix={<SearchOutlined />} value={filters.action} onChange={e => setFilters(f => ({ ...f, action: e.target.value, page: 1 }))} style={{ width: 200 }} allowClear />
          </Col>
        </Row>
      </Card>
      <Table rowKey="id" columns={columns} dataSource={data} loading={loading}
        pagination={{ current: filters.page, pageSize: filters.pageSize, total, showSizeChanger: true, showTotal: t => `共 ${t} 条`,
          onChange: (page, pageSize) => setFilters(f => ({ ...f, page, pageSize })) }}
        size="middle" />
    </div>
  );
}
