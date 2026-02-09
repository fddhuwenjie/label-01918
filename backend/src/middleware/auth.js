const jwt = require('jsonwebtoken');
const { queryOne, runSql } = require('../db');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'contract-mgmt-secret-key-2026';

function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Authentication required' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = queryOne(`
      SELECT u.*, r.name as role_name, r.permissions, d.name as department_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = ? AND u.status = 'active'
    `, [decoded.userId]);

    if (!user) return res.status(401).json({ error: 'User not found or inactive' });
    req.user = { ...user, permissions: JSON.parse(user.permissions || '{}') };
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

function authorize() {
  const allowedRoles = Array.from(arguments);
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Authentication required' });
    if (req.user.role_name === 'Admin') return next();
    if (allowedRoles.length && !allowedRoles.includes(req.user.role_name)) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    next();
  };
}

function logActivity(userId, action, entityType, entityId, details, ip) {
  runSql('INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, details, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)',
    [uuidv4(), userId, action, entityType, entityId, details, ip]);
}

module.exports = { authenticate, authorize, logActivity, JWT_SECRET };
