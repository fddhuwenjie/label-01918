const express = require('express');
const { queryAll, queryOne } = require('../db');
const { authenticate, logActivity } = require('../middleware/auth');

const router = express.Router();

router.get('/contract-summary', authenticate, function(req, res) {
  try {
    var date_from = req.query.date_from, date_to = req.query.date_to, status = req.query.status, consultant_id = req.query.consultant_id;
    var where = ['1=1'], params = [];
    if (date_from) { where.push("ct.start_date >= ?"); params.push(date_from); }
    if (date_to) { where.push("ct.end_date <= ?"); params.push(date_to); }
    if (status) { where.push("ct.status = ?"); params.push(status); }
    if (consultant_id) { where.push("ct.consultant_id = ?"); params.push(consultant_id); }

    var data = queryAll('SELECT ct.contract_number, ct.name, ct.value, ct.status, ct.start_date, ct.end_date, cu.name as customer_name, co.name as consultant_name FROM contracts ct LEFT JOIN customers cu ON ct.customer_id = cu.id LEFT JOIN consultants co ON ct.consultant_id = co.id WHERE ' + where.join(' AND ') + ' ORDER BY ct.start_date DESC', params);
    var total_value = 0;
    var by_status = {};
    data.forEach(function(c) { total_value += (c.value || 0); by_status[c.status] = (by_status[c.status] || 0) + 1; });

    logActivity(req.user.id, 'generate_report', 'report', null, 'Contract summary report', req.ip);
    res.json({ summary: { total_contracts: data.length, total_value: total_value, by_status: by_status }, data: data, generated_at: new Date().toISOString(), generated_by: req.user.name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/consultant-performance', authenticate, function(req, res) {
  try {
    var data = queryAll("SELECT co.name, co.email, co.status, d.name as department_name, COUNT(ct.id) as contracts_handled, COALESCE(SUM(ct.value),0) as total_revenue, COALESCE(AVG(ct.value),0) as avg_contract_value, SUM(CASE WHEN ct.status = 'active' THEN 1 ELSE 0 END) as active_contracts, SUM(CASE WHEN ct.status = 'completed' THEN 1 ELSE 0 END) as completed_contracts FROM consultants co LEFT JOIN contracts ct ON co.id = ct.consultant_id LEFT JOIN departments d ON co.department_id = d.id GROUP BY co.id ORDER BY total_revenue DESC");
    logActivity(req.user.id, 'generate_report', 'report', null, 'Consultant performance report', req.ip);
    res.json({ data: data, generated_at: new Date().toISOString(), generated_by: req.user.name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/customer-report', authenticate, function(req, res) {
  try {
    var data = queryAll("SELECT cu.name, cu.email, cu.company, cu.region, cu.industry, cu.status, cu.created_at, COUNT(ct.id) as contract_count, COALESCE(SUM(ct.value),0) as total_value FROM customers cu LEFT JOIN contracts ct ON cu.id = ct.customer_id GROUP BY cu.id ORDER BY total_value DESC");
    logActivity(req.user.id, 'generate_report', 'report', null, 'Customer report', req.ip);
    res.json({ data: data, generated_at: new Date().toISOString(), generated_by: req.user.name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/revenue', authenticate, function(req, res) {
  try {
    var date_from = req.query.date_from, date_to = req.query.date_to, consultant_id = req.query.consultant_id;
    var where = ['1=1'], params = [];
    if (date_from) { where.push("ct.start_date >= ?"); params.push(date_from); }
    if (date_to) { where.push("ct.end_date <= ?"); params.push(date_to); }
    if (consultant_id) { where.push("ct.consultant_id = ?"); params.push(consultant_id); }

    var monthly = queryAll("SELECT strftime('%Y-%m', ct.start_date) as month, SUM(ct.value) as revenue, COUNT(*) as count FROM contracts ct WHERE " + where.join(' AND ') + " AND ct.start_date IS NOT NULL GROUP BY month ORDER BY month", params);
    var total = 0;
    monthly.forEach(function(m) { total += m.revenue; });
    logActivity(req.user.id, 'generate_report', 'report', null, 'Revenue report', req.ip);
    res.json({ monthly: monthly, total_revenue: total, generated_at: new Date().toISOString(), generated_by: req.user.name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
