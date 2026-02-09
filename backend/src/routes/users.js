const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { queryAll, queryOne, runSql } = require('../db');
const { authenticate, authorize, logActivity } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, function(req, res) {
  try {
    var search = req.query.search, role = req.query.role, department = req.query.department, status = req.query.status;
    var page = parseInt(req.query.page) || 1, pageSize = parseInt(req.query.pageSize) || 20;
    var where = ['1=1'], params = [];

    if (search) { where.push("(u.name LIKE ? OR u.email LIKE ?)"); params.push('%'+search+'%', '%'+search+'%'); }
    if (role) { where.push("r.name = ?"); params.push(role); }
    if (department) { where.push("u.department_id = ?"); params.push(department); }
    if (status) { where.push("u.status = ?"); params.push(status); }

    var total = queryOne('SELECT COUNT(*) as total FROM users u LEFT JOIN roles r ON u.role_id = r.id WHERE ' + where.join(' AND '), params).total;
    var offset = (page - 1) * pageSize;
    var dataParams = params.concat([pageSize, offset]);
    var data = queryAll('SELECT u.id, u.email, u.name, u.phone, u.status, u.last_login, u.created_at, u.department_id, r.name as role_name, r.id as role_id, d.name as department_name FROM users u LEFT JOIN roles r ON u.role_id = r.id LEFT JOIN departments d ON u.department_id = d.id WHERE ' + where.join(' AND ') + ' ORDER BY u.created_at DESC LIMIT ? OFFSET ?', dataParams);
    res.json({ data: data, total: total, page: page, pageSize: pageSize });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/roles', authenticate, function(req, res) {
  res.json(queryAll('SELECT * FROM roles ORDER BY name'));
});

router.post('/roles', authenticate, authorize('Admin'), function(req, res) {
  try {
    var id = uuidv4();
    runSql('INSERT INTO roles (id, name, description, permissions) VALUES (?, ?, ?, ?)', [id, req.body.name, req.body.description, JSON.stringify(req.body.permissions || {})]);
    res.status(201).json({ id: id, name: req.body.name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/roles/:id', authenticate, authorize('Admin'), function(req, res) {
  try {
    runSql('UPDATE roles SET name = ?, description = ?, permissions = ? WHERE id = ?', [req.body.name, req.body.description, JSON.stringify(req.body.permissions || {}), req.params.id]);
    res.json({ message: 'Role updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id', authenticate, function(req, res) {
  var user = queryOne('SELECT u.id, u.email, u.name, u.phone, u.status, u.last_login, u.created_at, u.department_id, r.name as role_name, r.id as role_id, d.name as department_name FROM users u LEFT JOIN roles r ON u.role_id = r.id LEFT JOIN departments d ON u.department_id = d.id WHERE u.id = ?', [req.params.id]);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

router.post('/', authenticate, authorize('Admin'), function(req, res) {
  try {
    var id = uuidv4();
    var hashed = bcrypt.hashSync(req.body.password || 'default123', 10);
    runSql('INSERT INTO users (id, email, password, name, phone, role_id, department_id) VALUES (?, ?, ?, ?, ?, ?, ?)', [id, req.body.email, hashed, req.body.name, req.body.phone, req.body.role_id, req.body.department_id]);
    logActivity(req.user.id, 'create_user', 'user', id, 'Created user ' + req.body.email, req.ip);
    res.status(201).json({ id: id, email: req.body.email, name: req.body.name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, authorize('Admin', 'Manager'), function(req, res) {
  try {
    runSql('UPDATE users SET email=?, name=?, phone=?, role_id=?, department_id=?, status=?, updated_at=datetime("now") WHERE id=?',
      [req.body.email, req.body.name, req.body.phone, req.body.role_id, req.body.department_id, req.body.status, req.params.id]);
    logActivity(req.user.id, 'update_user', 'user', req.params.id, 'Updated user', req.ip);
    res.json({ message: 'User updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/reset-password', authenticate, authorize('Admin'), function(req, res) {
  try {
    runSql('UPDATE users SET password = ?, updated_at = datetime("now") WHERE id = ?', [bcrypt.hashSync(req.body.newPassword || 'default123', 10), req.params.id]);
    logActivity(req.user.id, 'reset_password', 'user', req.params.id, 'Password reset by admin', req.ip);
    res.json({ message: 'Password reset' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, authorize('Admin'), function(req, res) {
  try {
    runSql('UPDATE users SET status = "inactive", updated_at = datetime("now") WHERE id = ?', [req.params.id]);
    logActivity(req.user.id, 'deactivate_user', 'user', req.params.id, 'User deactivated', req.ip);
    res.json({ message: 'User deactivated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
