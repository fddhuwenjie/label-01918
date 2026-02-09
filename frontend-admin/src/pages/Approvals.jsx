import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Select, Space, Tag, Modal, Input, message, Typography, Row, Col, Card, Tabs, Descriptions, Popconfirm } from 'antd';
import { CheckOutlined, CloseOutlined, EyeOutlined, SearchOutlined } from '@ant-design/icons';
import api from '../api';
import { useAuth } from '../contexts/AuthContext';

const approvalStatusMap = { pending: '待审批', approved: '已通过', rejected: '已拒绝', cancelled: '已取消' };
const approvalStatusColors = { pending: 'processing', approved: 'success', rejected: 'error', cancelled: 'default' };
const contractStatusMap = { draft: '草稿', pending: '待审批', active: '生效中', completed: '已完成', terminated: '已终止' };

export default function Approvals() {
  const [pendingData, setPendingData] = useState([]);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [allData, setAllData] = useState([]);
  const [allTotal, setAllTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [pendingPage, setPendingPage] = useState(1);
  const [allPage, setAllPage] = useState(1);
  const [allStatus, setAllStatus] = useState('');
  const [approvalModal, setApprovalModal] = useState(null); // { record, action }
  const [comments, setComments] = useState('');
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdminOrManager = user?.role_name === 'Admin' || user?.role_name === 'Manager';

  const fetchPending = useCallback(async () => {
    setLoading(true);
    try {
      var res = await api.get('/contracts/approvals/pending', { params: { page: pendingPage, pageSize: 20 } });
      setPendingData(res.data.data); setPendingTotal(res.data.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [pendingPage]);

  const fetchAll = useCallback(async () => {
    if (!isAdminOrManager) return;
    try {
      var params = { page: allPage, pageSize: 20 };
      if (allStatus) params.status = allStatus;
      var res = await api.get('/contracts/approvals/all', { params: params });
      setAllData(res.data.data); setAllTotal(res.data.total);
    } catch (err) { console.error(err); }
  }, [allPage, allStatus, isAdminOrManager]);

  useEffect(() => { fetchPending(); }, [fetchPending]);
  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleApproval = async () => {
    if (!approvalModal) return;
    try {
      await api.post('/contracts/' + approvalModal.record.contract_id + '/approvals', {
        approval_id: approvalModal.record.approval_id,
        status: approvalModal.action,
        comments: comments
      });
      message.success(approvalModal.action === 'approved' ? '审批通过' : '审批已拒绝');
      setApprovalModal(null); setComments('');
      fetchPending(); fetchAll();
    } catch (err) { message.error(err.response?.data?.error || '操作失败'); }
  };

  const pendingColumns = [
    { title: '合同编号', dataIndex: 'contract_number', width: 130, ellipsis: true },
    { title: '合同名称', dataIndex: 'contract_name', ellipsis: true, width: 150 },
    { title: '金额', dataIndex: 'value', render: v => `¥${(v||0).toLocaleString()}`, width: 110, ellipsis: true },
    { title: '客户', dataIndex: 'customer_name', ellipsis: true, width: 110 },
    { title: '提交人', dataIndex: 'created_by_name', width: 90, ellipsis: true },
    { title: '审批环节', dataIndex: 'step_name', width: 90, ellipsis: true },
    { title: '提交时间', dataIndex: 'submitted_at', width: 155, ellipsis: true },
    { title: '操作', width: 190, fixed: 'right', render: function(_, r) {
      return (
        <Space>
          <Button type="link" size="small" icon={<EyeOutlined />} onClick={() => navigate('/contracts/' + r.contract_id)}>查看</Button>
          <Button type="primary" size="small" icon={<CheckOutlined />} onClick={() => { setApprovalModal({ record: r, action: 'approved' }); setComments(''); }}>通过</Button>
          <Button danger size="small" icon={<CloseOutlined />} onClick={() => { setApprovalModal({ record: r, action: 'rejected' }); setComments(''); }}>拒绝</Button>
        </Space>
      );
    }},
  ];

  const allColumns = [
    { title: '合同编号', dataIndex: 'contract_number', width: 130, ellipsis: true },
    { title: '合同名称', dataIndex: 'contract_name', ellipsis: true, width: 140 },
    { title: '金额', dataIndex: 'value', render: v => `¥${(v||0).toLocaleString()}`, width: 110, ellipsis: true },
    { title: '客户', dataIndex: 'customer_name', width: 100, ellipsis: true },
    { title: '审批人', dataIndex: 'approver_name', width: 90, ellipsis: true },
    { title: '审批环节', dataIndex: 'step_name', width: 90, ellipsis: true },
    { title: '状态', dataIndex: 'approval_status', render: s => <Tag color={approvalStatusColors[s]}>{approvalStatusMap[s] || s}</Tag>, width: 85 },
    { title: '备注', dataIndex: 'comments', ellipsis: true, width: 120 },
    { title: '提交时间', dataIndex: 'submitted_at', width: 155, ellipsis: true },
    { title: '操作', width: 60, fixed: 'right', render: (_, r) => <Button type="link" size="small" onClick={() => navigate('/contracts/' + r.contract_id)}>查看</Button> },
  ];

  var tabItems = [
    { key: 'pending', label: '待我审批 (' + pendingTotal + ')', children: (
      <Table rowKey="approval_id" columns={pendingColumns} dataSource={pendingData} loading={loading}
        pagination={{ current: pendingPage, pageSize: 20, total: pendingTotal, showTotal: t => '共 ' + t + ' 条',
          onChange: function(p) { setPendingPage(p); } }}
        scroll={{ x: 1030 }} size="middle"
        locale={{ emptyText: '暂无待审批的合同' }} />
    )},
  ];

  if (isAdminOrManager) {
    tabItems.push({ key: 'all', label: '全部审批记录', children: (
      <div>
        <Space style={{ marginBottom: 16 }}>
          <Select placeholder="审批状态" value={allStatus || undefined} onChange={function(v) { setAllStatus(v || ''); setAllPage(1); }} style={{ width: 130 }} allowClear
            options={Object.entries(approvalStatusMap).map(function(e) { return { label: e[1], value: e[0] }; })} />
        </Space>
        <Table rowKey="approval_id" columns={allColumns} dataSource={allData}
          pagination={{ current: allPage, pageSize: 20, total: allTotal, showTotal: t => '共 ' + t + ' 条',
            onChange: function(p) { setAllPage(p); } }}
          scroll={{ x: 1080 }} size="middle"
          locale={{ emptyText: '暂无审批记录' }} />
      </div>
    )});
  }

  return (
    <div>
      <Typography.Title level={4}>审批中心</Typography.Title>
      <Card>
        <Tabs items={tabItems} />
      </Card>

      <Modal title={approvalModal?.action === 'approved' ? '确认通过' : '确认拒绝'}
        open={!!approvalModal} onCancel={() => setApprovalModal(null)} onOk={handleApproval}
        okText="确认" cancelText="取消"
        okButtonProps={{ danger: approvalModal?.action === 'rejected' }}>
        {approvalModal && (
          <div>
            <Descriptions column={1} size="small" style={{ marginBottom: 16 }}>
              <Descriptions.Item label="合同编号">{approvalModal.record.contract_number}</Descriptions.Item>
              <Descriptions.Item label="合同名称">{approvalModal.record.contract_name}</Descriptions.Item>
              <Descriptions.Item label="金额">¥{(approvalModal.record.value||0).toLocaleString()}</Descriptions.Item>
              <Descriptions.Item label="审批环节">{approvalModal.record.step_name}</Descriptions.Item>
            </Descriptions>
            <div style={{ marginBottom: 8 }}>审批意见：</div>
            <Input.TextArea rows={3} value={comments} onChange={e => setComments(e.target.value)}
              placeholder={approvalModal.action === 'approved' ? '同意（可选）' : '请填写拒绝原因'} />
          </div>
        )}
      </Modal>
    </div>
  );
}
