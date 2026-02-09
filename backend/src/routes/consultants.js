const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { queryAll, queryOne, runSql } = require('../db');
const { authenticate, authorize, logActivity } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, function(req, res) {
  try {
    var search = req.query.search, department = req.query.department, status = req.query.status;
    var page = parseInt(req.query.page) || 1, pageSize = parseInt(req.query.pageSize) || 20;
    var where = ['1=1'], params = [];

    if (search) { where.push("(c.name LIKE ? OR c.email LIKE ?)"); params.push('%'+search+'%', '%'+search+'%'); }
    if (department) { where.push("c.department_id = ?"); params.push(department); }
    if (status) { where.push("c.status = ?"); params.push(status); }

    var total = queryOne('SELECT COUNT(*) as total FROM consultants c WHERE ' + where.join(' AND '), params).total;
    var offset = (page - 1) * pageSize;
    var data = queryAll('SELECT c.*, d.name as department_name, (SELECT COUNT(*) FROM contracts ct WHERE ct.consultant_id = c.id) as contract_count, (SELECT COALESCE(SUM(ct.value),0) FROM contracts ct WHERE ct.consultant_id = c.id) as total_value FROM consultants c LEFT JOIN departments d ON c.department_id = d.id WHERE ' + where.join(' AND ') + ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?', params.concat([pageSize, offset]));
    res.json({ data: data, total: total, page: page, pageSize: pageSize });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, function(req, res) {
  var consultant = queryOne('SELECT c.*, d.name as department_name, (SELECT COUNT(*) FROM contracts ct WHERE ct.consultant_id = c.id) as contract_count, (SELECT COALESCE(SUM(ct.value),0) FROM contracts ct WHERE ct.consultant_id = c.id) as total_value FROM consultants c LEFT JOIN departments d ON c.department_id = d.id WHERE c.id = ?', [req.params.id]);
  if (!consultant) return res.status(404).json({ error: 'Consultant not found' });
  consultant.contracts = queryAll('SELECT ct.*, cu.name as customer_name FROM contracts ct LEFT JOIN customers cu ON ct.customer_id = cu.id WHERE ct.consultant_id = ? ORDER BY ct.created_at DESC', [req.params.id]);
  res.json(consultant);
});

router.post('/', authenticate, authorize('Admin', 'Manager'), function(req, res) {
  try {
    var id = uuidv4(), b = req.body;
    runSql('INSERT INTO consultants (id, name, email, phone, department_id, hire_date, status) VALUES (?,?,?,?,?,?,?)', [id, b.name, b.email, b.phone, b.department_id, b.hire_date, b.status || 'active']);
    logActivity(req.user.id, 'create_consultant', 'consultant', id, 'Created consultant ' + b.name, req.ip);
    res.status(201).json({ id: id, name: b.name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, authorize('Admin', 'Manager'), function(req, res) {
  try {
    var b = req.body;
    runSql('UPDATE consultants SET name=?,email=?,phone=?,department_id=?,hire_date=?,status=?,updated_at=datetime("now") WHERE id=?', [b.name, b.email, b.phone, b.department_id, b.hire_date, b.status, req.params.id]);
    logActivity(req.user.id, 'update_consultant', 'consultant', req.params.id, 'Updated consultant', req.ip);
    res.json({ message: 'Consultant updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, authorize('Admin'), function(req, res) {
  try {
    runSql('UPDATE consultants SET status = "inactive", updated_at = datetime("now") WHERE id = ?', [req.params.id]);
    res.json({ message: 'Consultant deactivated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
