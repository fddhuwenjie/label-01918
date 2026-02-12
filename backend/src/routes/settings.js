const express = require('express');
const { queryAll, runSql } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, authorize('Admin'), function(req, res) {
  var settings = queryAll('SELECT * FROM system_settings ORDER BY key');
  var map = {};
  settings.forEach(function(s) { map[s.key] = s.value; });
  res.json(map);
});

router.put('/', authenticate, authorize('Admin'), function(req, res) {
  try {
    var settings = req.body;
    Object.keys(settings).forEach(function(key) {
      runSql('INSERT OR REPLACE INTO system_settings (key, value, updated_at, updated_by) VALUES (?, ?, datetime("now"), ?)', [key, String(settings[key]), req.user.id]);
    });
    res.json({ message: '设置已更新' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
