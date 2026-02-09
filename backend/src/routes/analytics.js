const express = require('express');
const { queryAll, queryOne } = require('../db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.get('/overview', authenticate, function(req, res) {
  try {
    var totalContracts = queryOne('SELECT COUNT(*) as count FROM contracts').count;
    var activeContracts = queryOne("SELECT COUNT(*) as count FROM contracts WHERE status = 'active'").count;
    var totalRevenue = queryOne('SELECT COALESCE(SUM(value),0) as total FROM contracts').total;
    var avgValue = queryOne('SELECT COALESCE(AVG(value),0) as avg FROM contracts').avg;
    var activeConsultants = queryOne("SELECT COUNT(*) as count FROM consultants WHERE status = 'active'").count;
    var totalCustomers = queryOne('SELECT COUNT(*) as count FROM customers').count;
    res.json({ totalContracts: totalContracts, activeContracts: activeContracts, totalRevenue: Math.round(totalRevenue * 100) / 100, avgValue: Math.round(avgValue * 100) / 100, activeConsultants: activeConsultants, totalCustomers: totalCustomers });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/contract-status', authenticate, function(req, res) {
  try {
    res.json(queryAll("SELECT status, COUNT(*) as count, COALESCE(SUM(value),0) as value FROM contracts GROUP BY status"));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/revenue-trend', authenticate, function(req, res) {
  try {
    res.json(queryAll("SELECT strftime('%Y-%m', start_date) as month, COALESCE(SUM(value),0) as revenue, COUNT(*) as count FROM contracts WHERE start_date IS NOT NULL GROUP BY month ORDER BY month"));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/consultant-performance', authenticate, function(req, res) {
  try {
    res.json(queryAll("SELECT co.id, co.name, co.status, d.name as department_name, COUNT(ct.id) as contract_count, COALESCE(SUM(ct.value),0) as total_value, COALESCE(AVG(ct.value),0) as avg_value FROM consultants co LEFT JOIN contracts ct ON co.id = ct.consultant_id LEFT JOIN departments d ON co.department_id = d.id GROUP BY co.id ORDER BY total_value DESC"));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/customer-trend', authenticate, function(req, res) {
  try {
    res.json(queryAll("SELECT strftime('%Y-%m', created_at) as month, COUNT(*) as count FROM customers GROUP BY month ORDER BY month"));
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
