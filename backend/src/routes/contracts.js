const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { queryAll, queryOne, runSql } = require('../db');
const { authenticate, authorize, logActivity } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, function(req, res) {
  try {
    var search = req.query.search, status = req.query.status, customer_id = req.query.customer_id, consultant_id = req.query.consultant_id;
    var date_from = req.query.date_from, date_to = req.query.date_to, value_min = req.query.value_min, value_max = req.query.value_max;
    var page = parseInt(req.query.page) || 1, pageSize = parseInt(req.query.pageSize) || 20;
    var where = ['1=1'], params = [];

    if (search) { where.push("(ct.name LIKE ? OR ct.contract_number LIKE ? OR cu.name LIKE ? OR co.name LIKE ?)"); params.push('%'+search+'%', '%'+search+'%', '%'+search+'%', '%'+search+'%'); }
    if (status) { where.push("ct.status = ?"); params.push(status); }
    if (customer_id) { where.push("ct.customer_id = ?"); params.push(customer_id); }
    if (consultant_id) { where.push("ct.consultant_id = ?"); params.push(consultant_id); }
    if (date_from) { where.push("ct.start_date >= ?"); params.push(date_from); }
    if (date_to) { where.push("ct.end_date <= ?"); params.push(date_to); }
    if (value_min) { where.push("ct.value >= ?"); params.push(parseFloat(value_min)); }
    if (value_max) { where.push("ct.value <= ?"); params.push(parseFloat(value_max)); }

    var w = where.join(' AND ');
    var total = queryOne('SELECT COUNT(*) as total FROM contracts ct LEFT JOIN customers cu ON ct.customer_id = cu.id LEFT JOIN consultants co ON ct.consultant_id = co.id WHERE ' + w, params).total;
    var offset = (page - 1) * pageSize;
    var data = queryAll('SELECT ct.*, cu.name as customer_name, co.name as consultant_name FROM contracts ct LEFT JOIN customers cu ON ct.customer_id = cu.id LEFT JOIN consultants co ON ct.consultant_id = co.id WHERE ' + w + ' ORDER BY ct.created_at DESC LIMIT ? OFFSET ?', params.concat([pageSize, offset]));
    res.json({ data: data, total: total, page: page, pageSize: pageSize });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 获取待我审批的合同列表（必须在 /:id 之前）
router.get('/approvals/pending', authenticate, function(req, res) {
  try {
    var page = parseInt(req.query.page) || 1, pageSize = parseInt(req.query.pageSize) || 20;
    var offset = (page - 1) * pageSize;
    var total = queryOne("SELECT COUNT(*) as total FROM contract_approvals ca WHERE ca.approver_id = ? AND ca.status = 'pending'", [req.user.id]).total;
    var data = queryAll(
      "SELECT ca.id as approval_id, ca.contract_id, ca.status as approval_status, ca.step, ca.step_name, ca.created_at as submitted_at, " +
      "ct.contract_number, ct.name as contract_name, ct.value, ct.status as contract_status, ct.start_date, ct.end_date, " +
      "cu.name as customer_name, co.name as consultant_name, creator.name as created_by_name " +
      "FROM contract_approvals ca LEFT JOIN contracts ct ON ca.contract_id = ct.id LEFT JOIN customers cu ON ct.customer_id = cu.id " +
      "LEFT JOIN consultants co ON ct.consultant_id = co.id LEFT JOIN users creator ON ct.created_by = creator.id " +
      "WHERE ca.approver_id = ? AND ca.status = 'pending' ORDER BY ca.created_at DESC LIMIT ? OFFSET ?",
      [req.user.id, pageSize, offset]);
    res.json({ data: data, total: total, page: page, pageSize: pageSize });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 获取所有审批记录
router.get('/approvals/all', authenticate, authorize('Admin', 'Manager'), function(req, res) {
  try {
    var statusFilter = req.query.status;
    var page = parseInt(req.query.page) || 1, pageSize = parseInt(req.query.pageSize) || 20;
    var offset = (page - 1) * pageSize;
    var where = ['1=1'], params = [];
    if (statusFilter) { where.push("ca.status = ?"); params.push(statusFilter); }
    var w = where.join(' AND ');
    var total = queryOne('SELECT COUNT(*) as total FROM contract_approvals ca WHERE ' + w, params).total;
    var data = queryAll(
      "SELECT ca.id as approval_id, ca.contract_id, ca.status as approval_status, ca.step, ca.step_name, ca.comments, ca.created_at as submitted_at, ca.updated_at, " +
      "ct.contract_number, ct.name as contract_name, ct.value, ct.status as contract_status, " +
      "cu.name as customer_name, approver.name as approver_name, creator.name as created_by_name " +
      "FROM contract_approvals ca LEFT JOIN contracts ct ON ca.contract_id = ct.id LEFT JOIN customers cu ON ct.customer_id = cu.id " +
      "LEFT JOIN users approver ON ca.approver_id = approver.id LEFT JOIN users creator ON ct.created_by = creator.id " +
      "WHERE " + w + " ORDER BY ca.created_at DESC LIMIT ? OFFSET ?",
      params.concat([pageSize, offset]));
    res.json({ data: data, total: total, page: page, pageSize: pageSize });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, function(req, res) {
  var contract = queryOne('SELECT ct.*, cu.name as customer_name, cu.email as customer_email, co.name as consultant_name, co.email as consultant_email FROM contracts ct LEFT JOIN customers cu ON ct.customer_id = cu.id LEFT JOIN consultants co ON ct.consultant_id = co.id WHERE ct.id = ?', [req.params.id]);
  if (!contract) return res.status(404).json({ error: 'Contract not found' });
  contract.media = queryAll('SELECT * FROM contract_media WHERE contract_id = ? ORDER BY created_at', [req.params.id]);
  contract.versions = queryAll('SELECT cv.*, u.name as changed_by_name FROM contract_versions cv LEFT JOIN users u ON cv.changed_by = u.id WHERE cv.contract_id = ? ORDER BY cv.version DESC', [req.params.id]);
  contract.approvals = queryAll('SELECT ca.*, u.name as approver_name FROM contract_approvals ca LEFT JOIN users u ON ca.approver_id = u.id WHERE ca.contract_id = ? ORDER BY ca.created_at DESC', [req.params.id]);
  res.json(contract);
});

router.post('/', authenticate, authorize('Admin', 'Manager', 'Consultant'), function(req, res) {
  try {
    var id = uuidv4(), b = req.body;
    runSql('INSERT INTO contracts (id, contract_number, name, value, start_date, end_date, status, customer_id, consultant_id, description, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [id, b.contract_number, b.name, b.value || 0, b.start_date, b.end_date, b.status || 'draft', b.customer_id, b.consultant_id, b.description, req.user.id]);

    if (b.media && b.media.length) {
      b.media.forEach(function(m) { runSql('INSERT INTO contract_media (id, contract_id, url, type, title) VALUES (?,?,?,?,?)', [uuidv4(), id, m.url, m.type || 'image', m.title]); });
    }

    var contractData = queryOne('SELECT * FROM contracts WHERE id = ?', [id]);
    runSql('INSERT INTO contract_versions (id, contract_id, version, data, changed_by, change_summary) VALUES (?,?,?,?,?,?)',
      [uuidv4(), id, 1, JSON.stringify(contractData), req.user.id, 'Initial creation']);

    logActivity(req.user.id, 'create_contract', 'contract', id, 'Created contract ' + b.contract_number, req.ip);
    res.status(201).json({ id: id, contract_number: b.contract_number, name: b.name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, authorize('Admin', 'Manager', 'Consultant'), function(req, res) {
  try {
    var old = queryOne('SELECT * FROM contracts WHERE id = ?', [req.params.id]);
    if (!old) return res.status(404).json({ error: 'Contract not found' });
    if (old.status === 'pending') return res.status(400).json({ error: '待审批合同不可编辑' });

    var b = req.body;
    var newVersion = old.version + 1;
    runSql('UPDATE contracts SET contract_number=?,name=?,value=?,start_date=?,end_date=?,status=?,customer_id=?,consultant_id=?,description=?,version=?,updated_at=datetime("now") WHERE id=?',
      [b.contract_number, b.name, b.value, b.start_date, b.end_date, b.status, b.customer_id, b.consultant_id, b.description, newVersion, req.params.id]);

    if (b.media !== undefined) {
      runSql('DELETE FROM contract_media WHERE contract_id = ?', [req.params.id]);
      if (b.media && b.media.length) {
        b.media.forEach(function(m) { runSql('INSERT INTO contract_media (id, contract_id, url, type, title) VALUES (?,?,?,?,?)', [uuidv4(), req.params.id, m.url, m.type || 'image', m.title]); });
      }
    }

    var updated = queryOne('SELECT * FROM contracts WHERE id = ?', [req.params.id]);
    runSql('INSERT INTO contract_versions (id, contract_id, version, data, changed_by, change_summary) VALUES (?,?,?,?,?,?)',
      [uuidv4(), req.params.id, newVersion, JSON.stringify(updated), req.user.id, 'Updated by ' + req.user.name]);

    logActivity(req.user.id, 'update_contract', 'contract', req.params.id, 'Updated contract', req.ip);
    res.json({ message: 'Contract updated', version: newVersion });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, authorize('Admin', 'Manager'), function(req, res) {
  try {
    runSql('UPDATE contracts SET status = "terminated", updated_at = datetime("now") WHERE id = ?', [req.params.id]);
    logActivity(req.user.id, 'terminate_contract', 'contract', req.params.id, 'Contract terminated', req.ip);
    res.json({ message: 'Contract terminated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/bulk-status', authenticate, authorize('Admin', 'Manager'), function(req, res) {
  try {
    var ids = req.body.ids, status = req.body.status;
    ids.forEach(function(id) { runSql('UPDATE contracts SET status = ?, updated_at = datetime("now") WHERE id = ?', [status, id]); });
    logActivity(req.user.id, 'bulk_update_contract', 'contract', null, 'Bulk status update to ' + status, req.ip);
    res.json({ message: ids.length + ' contracts updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/bulk-delete', authenticate, authorize('Admin'), function(req, res) {
  try {
    var ids = req.body.ids;
    ids.forEach(function(id) { runSql('UPDATE contracts SET status = "terminated", updated_at = datetime("now") WHERE id = ?', [id]); });
    res.json({ message: ids.length + ' contracts terminated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 提交审批：将合同状态改为 pending，创建审批记录分配给审批人
router.post('/:id/submit-approval', authenticate, authorize('Admin', 'Manager', 'Consultant'), function(req, res) {
  try {
    var contract = queryOne('SELECT * FROM contracts WHERE id = ?', [req.params.id]);
    if (!contract) return res.status(404).json({ error: '合同不存在' });
    if (contract.status === 'pending') return res.status(400).json({ error: '合同已在审批中' });

    // 更新合同状态为 pending
    runSql('UPDATE contracts SET status = "pending", updated_at = datetime("now") WHERE id = ?', [req.params.id]);

    // 根据合同金额决定审批规则：>=50000 需要 Admin 审批，否则 Manager 即可
    var approverRole = contract.value >= 50000 ? 'Admin' : 'Manager';
    // 如果提交人本身就是 Admin，直接自动通过
    if (req.user.role_name === 'Admin') {
      var autoId = uuidv4();
      runSql('INSERT INTO contract_approvals (id, contract_id, approver_id, status, comments, step, step_name, created_at, updated_at) VALUES (?,?,?,?,?,?,?,datetime("now"),datetime("now"))',
        [autoId, req.params.id, req.user.id, 'approved', '管理员提交，自动通过', 1, '管理员审批']);
      runSql('UPDATE contracts SET status = "active", updated_at = datetime("now") WHERE id = ?', [req.params.id]);
      logActivity(req.user.id, 'contract_approval', 'contract', req.params.id, '管理员自动审批通过', req.ip);
      return res.json({ message: '管理员提交，已自动审批通过' });
    }

    // 找到审批人（按角色）
    var approvers = queryAll("SELECT u.id, u.name FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE r.name = ? AND u.status = 'active'", [approverRole]);
    if (!approvers.length) {
      // 没有对应角色的审批人，回退
      runSql('UPDATE contracts SET status = "draft", updated_at = datetime("now") WHERE id = ?', [req.params.id]);
      return res.status(400).json({ error: '没有可用的审批人（' + approverRole + '），请联系管理员' });
    }

    // 为每个审批人创建审批记录
    var step = 1;
    var stepName = approverRole === 'Admin' ? '管理员审批' : '经理审批';
    approvers.forEach(function(approver) {
      runSql('INSERT INTO contract_approvals (id, contract_id, approver_id, status, comments, step, step_name, created_at, updated_at) VALUES (?,?,?,?,?,?,?,datetime("now"),datetime("now"))',
        [uuidv4(), req.params.id, approver.id, 'pending', null, step, stepName]);
    });

    logActivity(req.user.id, 'submit_approval', 'contract', req.params.id, '提交审批，审批人角色：' + approverRole, req.ip);
    res.json({ message: '已提交审批，等待' + stepName });
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// 处理审批（通过/拒绝）
router.post('/:id/approvals', authenticate, authorize('Admin', 'Manager'), function(req, res) {
  try {
    var approvalId = req.body.approval_id;
    var status = req.body.status; // approved / rejected
    var comments = req.body.comments || '';

    if (!approvalId) {
      // 兼容旧逻辑：没有 approval_id 时直接创建一条
      var newId = uuidv4();
      runSql('INSERT INTO contract_approvals (id, contract_id, approver_id, status, comments, step, step_name, created_at, updated_at) VALUES (?,?,?,?,?,?,?,datetime("now"),datetime("now"))',
        [newId, req.params.id, req.user.id, status, comments, 1, '审批']);

      if (status === 'approved') {
        runSql('UPDATE contracts SET status = "active", updated_at = datetime("now") WHERE id = ?', [req.params.id]);
      } else if (status === 'rejected') {
        runSql('UPDATE contracts SET status = "draft", updated_at = datetime("now") WHERE id = ?', [req.params.id]);
      }
      logActivity(req.user.id, 'contract_approval', 'contract', req.params.id, '审批：' + status, req.ip);
      return res.status(201).json({ id: newId, status: status });
    }

    // 有 approval_id：更新对应审批记录
    var approval = queryOne('SELECT * FROM contract_approvals WHERE id = ?', [approvalId]);
    if (!approval) return res.status(404).json({ error: '审批记录不存在' });
    if (approval.approver_id !== req.user.id && req.user.role_name !== 'Admin') {
      return res.status(403).json({ error: '您不是该审批的审批人' });
    }
    if (approval.status !== 'pending') return res.status(400).json({ error: '该审批已处理' });

    // 更新审批记录
    runSql('UPDATE contract_approvals SET status = ?, comments = ?, updated_at = datetime("now") WHERE id = ?',
      [status, comments, approvalId]);

    if (status === 'rejected') {
      // 拒绝：合同回到草稿，取消该合同所有 pending 审批
      runSql('UPDATE contracts SET status = "draft", updated_at = datetime("now") WHERE id = ?', [req.params.id]);
      runSql("UPDATE contract_approvals SET status = 'cancelled', updated_at = datetime(\"now\") WHERE contract_id = ? AND status = 'pending' AND id != ?",
        [req.params.id, approvalId]);
    } else if (status === 'approved') {
      // 通过：检查该合同是否还有其他 pending 审批
      var remaining = queryOne("SELECT COUNT(*) as count FROM contract_approvals WHERE contract_id = ? AND status = 'pending'", [req.params.id]);
      if (remaining.count === 0) {
        // 所有审批都通过了，合同生效
        runSql('UPDATE contracts SET status = "active", updated_at = datetime("now") WHERE id = ?', [req.params.id]);
      }
    }

    logActivity(req.user.id, 'contract_approval', 'contract', req.params.id,
      (status === 'approved' ? '审批通过' : '审批拒绝') + (comments ? '：' + comments : ''), req.ip);
    res.json({ message: status === 'approved' ? '审批通过' : '审批已拒绝' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/revert/:version', authenticate, authorize('Admin', 'Manager'), function(req, res) {
  try {
    var ver = queryOne('SELECT * FROM contract_versions WHERE contract_id = ? AND version = ?', [req.params.id, parseInt(req.params.version)]);
    if (!ver) return res.status(404).json({ error: 'Version not found' });
    var data = JSON.parse(ver.data);
    var current = queryOne('SELECT version FROM contracts WHERE id = ?', [req.params.id]);
    var newVersion = current.version + 1;
    runSql('UPDATE contracts SET name=?,value=?,start_date=?,end_date=?,status=?,customer_id=?,consultant_id=?,description=?,version=?,updated_at=datetime("now") WHERE id=?',
      [data.name, data.value, data.start_date, data.end_date, data.status, data.customer_id, data.consultant_id, data.description, newVersion, req.params.id]);
    var updated = queryOne('SELECT * FROM contracts WHERE id = ?', [req.params.id]);
    runSql('INSERT INTO contract_versions (id, contract_id, version, data, changed_by, change_summary) VALUES (?,?,?,?,?,?)',
      [uuidv4(), req.params.id, newVersion, JSON.stringify(updated), req.user.id, 'Reverted to version ' + req.params.version]);
    res.json({ message: 'Reverted to version ' + req.params.version, version: newVersion });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
