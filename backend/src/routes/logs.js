const express = require('express');
const { queryAll, queryOne } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize('Admin', 'Manager'), function(req, res) {
  try {
    var user_id = req.query.user_id, action = req.query.action, entity_type = req.query.entity_type;
    var date_from = req.query.date_from, date_to = req.query.date_to;
    var page = parseInt(req.query.page) || 1, pageSize = parseInt(req.query.pageSize) || 50;
    var where = ['1=1'], params = [];

    if (user_id) { where.push("al.user_id = ?"); params.push(user_id); }
    if (action) { where.push("al.action LIKE ?"); params.push('%'+action+'%'); }
    if (entity_type) { where.push("al.entity_type = ?"); params.push(entity_type); }
    if (date_from) { where.push("al.created_at >= ?"); params.push(date_from); }
    if (date_to) { where.push("al.created_at <= ?"); params.push(date_to + ' 23:59:59'); }

    var w = where.join(' AND ');
    var total = queryOne('SELECT COUNT(*) as total FROM activity_logs al WHERE ' + w, params).total;
    var offset = (page - 1) * pageSize;
    var data = queryAll('SELECT al.*, u.name as user_name, u.email as user_email FROM activity_logs al LEFT JOIN users u ON al.user_id = u.id WHERE ' + w + ' ORDER BY al.created_at DESC LIMIT ? OFFSET ?', params.concat([pageSize, offset]));
    res.json({ data: data, total: total, page: page, pageSize: pageSize });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
