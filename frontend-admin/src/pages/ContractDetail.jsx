import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, Descriptions, Tag, Spin, Button, Space, Typography, Table, Image, Tabs, Timeline, message, Popconfirm, Steps } from 'antd';
import { ArrowLeftOutlined, CloseOutlined, RollbackOutlined } from '@ant-design/icons';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

const statusColors = { draft: 'default', pending: 'processing', active: 'success', completed: 'blue', terminated: 'error' };
const statusMap = { draft: '草稿', pending: '待审批', active: '生效中', completed: '已完成', terminated: '已终止' };
const approvalColors = { approved: 'success', rejected: 'error', pending: 'processing', cancelled: 'default' };
const approvalMap = { approved: '已通过', rejected: '已拒绝', pending: '待审批', cancelled: '已取消' };

export default function ContractDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasPermission } = useAuth();
  const [contract, setContract] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchContract = () => {
    setLoading(true);
    api.get(`/contracts/${id}`).then(r => setContract(r.data)).finally(() => setLoading(false));
  };

  useEffect(() => { fetchContract(); }, [id]);

  const handleRevert = async (version) => {
    await api.post(`/contracts/${id}/revert/${version}`);
    message.success(`已回退到版本 ${version}`);
    fetchContract();
  };

  if (loading) return <Spin size="large" style={{ display: 'block', margin: '100px auto' }} />;
  if (!contract) return <Typography.Text>合同未找到</Typography.Text>;

  const items = [
    { key: 'details', label: '详细信息', children: (
      <Descriptions bordered column={{ xs: 1, sm: 2 }}>
        <Descriptions.Item label="合同编号">{contract.contract_number}</Descriptions.Item>
        <Descriptions.Item label="合同名称">{contract.name}</Descriptions.Item>
        <Descriptions.Item label="金额">¥{(contract.value || 0).toLocaleString()}</Descriptions.Item>
        <Descriptions.Item label="状态"><Tag color={statusColors[contract.status]}>{statusMap[contract.status] || contract.status}</Tag></Descriptions.Item>
        <Descriptions.Item label="客户">{contract.customer_name || '-'}</Descriptions.Item>
        <Descriptions.Item label="顾问">{contract.consultant_name || '-'}</Descriptions.Item>
        <Descriptions.Item label="开始日期">{contract.start_date || '-'}</Descriptions.Item>
        <Descriptions.Item label="结束日期">{contract.end_date || '-'}</Descriptions.Item>
        <Descriptions.Item label="版本">{contract.version}</Descriptions.Item>
        <Descriptions.Item label="创建时间">{contract.created_at}</Descriptions.Item>
        <Descriptions.Item label="描述" span={2}>{contract.description || '-'}</Descriptions.Item>
      </Descriptions>
    )},
    { key: 'media', label: `媒体文件 (${contract.media?.length || 0})`, children: (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16 }}>
        {contract.media?.map(m => (
          <Card key={m.id} size="small" style={{ width: 200 }}>
            {m.type === 'video' ? <video src={m.url} controls style={{ width: '100%' }} /> : <Image src={m.url} style={{ width: '100%' }} fallback="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mN8/+F/PQAJpAN42kzLSAAAAABJRU5ErkJggg==" />}
            <div style={{ marginTop: 4, fontSize: 12 }}>{m.title || m.type}</div>
          </Card>
        ))}
        {!contract.media?.length && <Typography.Text type="secondary">暂无媒体文件</Typography.Text>}
      </div>
    )},
    { key: 'versions', label: `版本历史 (${contract.versions?.length || 0})`, children: (
      <Timeline items={contract.versions?.map(v => ({
        children: (
          <div>
            <strong>版本 {v.version}</strong> - {v.change_summary} <br />
            <Typography.Text type="secondary">由 {v.changed_by_name} 于 {v.created_at}</Typography.Text>
            {hasPermission('contracts', 'write') && v.version < contract.version && (
              <Popconfirm title={`确定回退到版本 ${v.version}？`} onConfirm={() => handleRevert(v.version)} okText="确定" cancelText="取消">
                <Button type="link" size="small" icon={<RollbackOutlined />}>回退</Button>
              </Popconfirm>
            )}
          </div>
        )
      }))} />
    )},
    { key: 'approvals', label: '审批记录', children: (
      <div>
        {contract.status === 'pending' && (
          <div style={{ marginBottom: 16, padding: 12, background: '#fffbe6', border: '1px solid #ffe58f', borderRadius: 6 }}>
            <Typography.Text type="warning">该合同正在审批中，等待审批人处理。</Typography.Text>
          </div>
        )}
        {contract.approvals?.length > 0 ? (
          <div>
            <Typography.Text strong style={{ display: 'block', marginBottom: 12 }}>审批流程：</Typography.Text>
            <Steps
              direction="vertical"
              size="small"
              current={contract.approvals?.findIndex(a => a.status === 'pending') ?? contract.approvals?.length}
              items={contract.approvals?.map(a => ({
                title: (a.step_name || '审批') + ' - ' + (a.approver_name || '未分配'),
                description: (
                  <div>
                    <Tag color={approvalColors[a.status]}>{approvalMap[a.status] || a.status}</Tag>
                    {a.comments && <span style={{ marginLeft: 8 }}>{a.comments}</span>}
                    <br />
                    <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                      {a.status === 'pending' ? '等待审批' : a.updated_at || a.created_at}
                    </Typography.Text>
                  </div>
                ),
                status: a.status === 'approved' ? 'finish' : a.status === 'rejected' ? 'error' : a.status === 'cancelled' ? 'error' : 'process',
              }))}
            />
          </div>
        ) : (
          <Typography.Text type="secondary">暂无审批记录</Typography.Text>
        )}
      </div>
    )},
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/contracts')}>返回</Button>
        <Typography.Title level={4} style={{ margin: 0 }}>{contract.name}</Typography.Title>
      </Space>
      <Tabs items={items} />
    </div>
  );
}
