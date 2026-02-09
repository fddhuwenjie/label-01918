const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { queryOne, runSql } = require('../db');
const { authenticate, logActivity, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

router.post('/login', function(req, res) {
  try {
    var email = req.body.email;
    var password = req.body.password;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

    var user = queryOne(
      'SELECT u.*, r.name as role_name, r.permissions, d.name as department_name FROM users u LEFT JOIN roles r ON u.role_id = r.id LEFT JOIN departments d ON u.department_id = d.id WHERE u.email = ?',
      [email]
    );

    if (!user) return res.status(401).json({ error: 'Invalid credentials' });
    if (user.status !== 'active') return res.status(401).json({ error: 'Account is inactive' });
    if (!bcrypt.compareSync(password, user.password)) return res.status(401).json({ error: 'Invalid credentials' });

    runSql('UPDATE users SET last_login = datetime("now") WHERE id = ?', [user.id]);
    logActivity(user.id, 'login', 'user', user.id, 'User logged in', req.ip);

    var token = jwt.sign({ userId: user.id, role: user.role_name }, JWT_SECRET, { expiresIn: '24h' });
    var userInfo = Object.assign({}, user);
    delete userInfo.password;
    userInfo.permissions = JSON.parse(user.permissions || '{}');
    res.json({ token: token, user: userInfo });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/me', authenticate, function(req, res) {
  var user = Object.assign({}, req.user);
  delete user.password;
  res.json(user);
});

router.put('/password', authenticate, function(req, res) {
  try {
    var currentPassword = req.body.currentPassword;
    var newPassword = req.body.newPassword;
    var user = queryOne('SELECT * FROM users WHERE id = ?', [req.user.id]);
    if (!bcrypt.compareSync(currentPassword, user.password)) return res.status(400).json({ error: 'Current password incorrect' });
    runSql('UPDATE users SET password = ?, updated_at = datetime("now") WHERE id = ?', [bcrypt.hashSync(newPassword, 10), req.user.id]);
    logActivity(req.user.id, 'password_change', 'user', req.user.id, 'Password changed', req.ip);
    res.json({ message: 'Password updated' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/logout', authenticate, function(req, res) {
  logActivity(req.user.id, 'logout', 'user', req.user.id, 'User logged out', req.ip);
  res.json({ message: 'Logged out' });
});

module.exports = router;
