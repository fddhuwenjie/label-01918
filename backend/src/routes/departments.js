const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { queryAll, runSql } = require('../db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', authenticate, function(req, res) {
  res.json(queryAll('SELECT * FROM departments ORDER BY name'));
});

router.post('/', authenticate, authorize('Admin'), function(req, res) {
  try {
    var id = uuidv4();
    runSql('INSERT INTO departments (id, name, description, parent_id) VALUES (?, ?, ?, ?)', [id, req.body.name, req.body.description, req.body.parent_id || null]);
    res.status(201).json({ id: id, name: req.body.name });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id', authenticate, authorize('Admin'), function(req, res) {
  try {
    runSql('UPDATE departments SET name=?, description=?, parent_id=?, updated_at=datetime("now") WHERE id=?', [req.body.name, req.body.description, req.body.parent_id || null, req.params.id]);
    res.json({ message: 'Department updated' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id', authenticate, authorize('Admin'), function(req, res) {
  try {
    runSql('DELETE FROM departments WHERE id = ?', [req.params.id]);
    res.json({ message: 'Department deleted' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

module.exports = router;
