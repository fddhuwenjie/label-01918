const jwt = require('jsonwebtoken');
const { queryOne, runSql } = require('../db');
const { v4: uuidv4 } = require('uuid');

const JWT_SECRET = process.env.JWT_SECRET || 'contract-mgmt-secret-key-2026';

function authenticate(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: '请先登录' });

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = queryOne(`
      SELECT u.*, r.name as role_name, r.permissions, d.name as department_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      LEFT JOIN departments d ON u.department_id = d.id
      WHERE u.id = ? AND u.status = 'active'
    `, [decoded.userId]);

    if (!user) return res.status(401).json({ error: '用户不存在或已停用' });
    req.user = { ...user, permissions: JSON.parse(user.permissions || '{}') };
    next();
  } catch (err) {
    return res.status(401).json({ error: '登录已过期，请重新登录' });
  }
}

function authorize() {
  const allowedRoles = Array.from(arguments);
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: '请先登录' });
    if (req.user.role_name === 'Admin') return next();
    if (allowedRoles.length && !allowedRoles.includes(req.user.role_name)) {
      return res.status(403).json({ error: '权限不足' });
    }
    next();
  };
}

function logActivity(userId, action, entityType, entityId, details, ip) {
  // 使用本地时间
  const now = new Date();
  const localTime = now.getFullYear() + '-' + 
    String(now.getMonth() + 1).padStart(2, '0') + '-' + 
    String(now.getDate()).padStart(2, '0') + ' ' + 
    String(now.getHours()).padStart(2, '0') + ':' + 
    String(now.getMinutes()).padStart(2, '0') + ':' + 
    String(now.getSeconds()).padStart(2, '0');
  runSql('INSERT INTO activity_logs (id, user_id, action, entity_type, entity_id, details, ip_address, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
    [uuidv4(), userId, action, entityType, entityId, details, ip, localTime]);
}

module.exports = { authenticate, authorize, logActivity, JWT_SECRET };
