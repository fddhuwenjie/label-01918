const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { queryAll, queryOne, runSql } = require('../db');
const { authenticate, authorize, logActivity } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, function(req, res) {
  try {
    var search = req.query.search, status = req.query.status, region = req.query.region, industry = req.query.industry;
    var date_from = req.query.date_from, date_to = req.query.date_to;
    var page = parseInt(req.query.page) || 1, pageSize = parseInt(req.query.pageSize) || 20;
    var where = ['1=1'], params = [];

    if (search) { where.push("(c.name LIKE ? OR c.email LIKE ? OR c.phone LIKE ? OR c.company LIKE ?)"); params.push('%'+search+'%', '%'+search+'%', '%'+search+'%', '%'+search+'%'); }
    if (status) { where.push("c.status = ?"); params.push(status); }
    if (region) { where.push("c.region = ?"); params.push(region); }
    if (industry) { where.push("c.industry = ?"); params.push(industry); }
    if (date_from) { where.push("c.created_at >= ?"); params.push(date_from); }
    if (date_to) { where.push("c.created_at <= ?"); params.push(date_to + ' 23:59:59'); }

    var total = queryOne('SELECT COUNT(*) as total FROM customers c WHERE ' + where.join(' AND '), params).total;
    var offset = (page - 1) * pageSize;
    var data = queryAll('SELECT c.*, u.name as created_by_name FROM customers c LEFT JOIN users u ON c.created_by = u.id WHERE ' + where.join(' AND ') + ' ORDER BY c.created_at DESC LIMIT ? OFFSET ?', params.concat([pageSize, offset]));
    res.json({ data: data, total: total, page: page, pageSize: pageSize });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/options', authenticate, function(req, res) {
  var regions = queryAll("SELECT DISTINCT region FROM customers WHERE region IS NOT NULL ORDER BY region").map(function(r) { return r.region; });
  var industries = queryAll("SELECT DISTINCT industry FROM customers WHERE industry IS NOT NULL ORDER BY industry").map(function(r) { return r.industry; });
  res.json({ regions: regions, industries: industries, statuses: ['active', 'inactive', 'prospect', 'archived'] });
});

router.get('/:id', authenticate, function(req, res) {
  var customer = queryOne('SELECT c.*, u.name as created_by_name FROM customers c LEFT JOIN users u ON c.created_by = u.id WHERE c.id = ?', [req.params.id]);
  if (!customer) return res.status(404).json({ error: 'Customer not found' });
  var contacts = queryAll('SELECT cc.*, u.name as created_by_name FROM customer_contacts cc LEFT JOIN users u ON cc.created_by = u.id WHERE cc.customer_id = ? ORDER BY cc.created_at DESC', [req.params.id]);
  var contracts = queryAll('SELECT ct.id, ct.contract_number, ct.name, ct.value, ct.status, ct.start_date, ct.end_date FROM contracts ct WHERE ct.customer_id = ? ORDER BY ct.created_at DESC', [req.params.id]);
  customer.contacts = contacts;
  customer.contracts = contracts;
  res.json(customer);
});

router.post('/', authenticate, authorize('Admin', 'Manager', 'Consultant'), function(req, res) {
  try {
    var id = uuidv4();
    var b = req.body;
    runSql('INSERT INTO customers (id, name, email, phone, company, address, region, industry, status, notes, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [id, b.name, b.email, b.phone, b.company, b.address, b.region, b.industry, b.status || 'active', b.notes, req.user.id]);
    logActivity(req.user.id, 'create_customer', 'customer', id, 'Created customer ' + b.name, req.ip);
    res.status(201).json({ id: id, name: b.name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, authorize('Admin', 'Manager', 'Consultant'), function(req, res) {
  try {
    var b = req.body;
    runSql('UPDATE customers SET name=?,email=?,phone=?,company=?,address=?,region=?,industry=?,status=?,notes=?,updated_at=datetime("now") WHERE id=?',
      [b.name, b.email, b.phone, b.company, b.address, b.region, b.industry, b.status, b.notes, req.params.id]);
    logActivity(req.user.id, 'update_customer', 'customer', req.params.id, 'Updated customer', req.ip);
    res.json({ message: 'Customer updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, authorize('Admin', 'Manager'), function(req, res) {
  try {
    runSql('UPDATE customers SET status = "archived", updated_at = datetime("now") WHERE id = ?', [req.params.id]);
    logActivity(req.user.id, 'archive_customer', 'customer', req.params.id, 'Customer archived', req.ip);
    res.json({ message: 'Customer archived' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/contacts', authenticate, function(req, res) {
  try {
    var id = uuidv4();
    runSql('INSERT INTO customer_contacts (id, customer_id, type, content, created_by) VALUES (?,?,?,?,?)', [id, req.params.id, req.body.type || 'note', req.body.content, req.user.id]);
    res.status(201).json({ id: id });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/bulk-status', authenticate, authorize('Admin', 'Manager'), function(req, res) {
  try {
    var ids = req.body.ids, status = req.body.status;
    ids.forEach(function(id) { runSql('UPDATE customers SET status = ?, updated_at = datetime("now") WHERE id = ?', [status, id]); });
    logActivity(req.user.id, 'bulk_update_customer', 'customer', null, 'Bulk status update to ' + status + ': ' + ids.length + ' records', req.ip);
    res.json({ message: ids.length + ' customers updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/bulk-delete', authenticate, authorize('Admin'), function(req, res) {
  try {
    var ids = req.body.ids;
    ids.forEach(function(id) { runSql('UPDATE customers SET status = "archived", updated_at = datetime("now") WHERE id = ?', [id]); });
    res.json({ message: ids.length + ' customers archived' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
