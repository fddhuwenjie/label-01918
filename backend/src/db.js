const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');

const DB_PATH = process.env.DB_PATH || path.join(__dirname, '..', 'data', 'database.sqlite');
let db = null;

// 获取北京时间字符串 (UTC+8)
function getBeijingTime() {
  const now = new Date();
  const beijingOffset = 8 * 60; // UTC+8 in minutes
  const utcTime = now.getTime() + (now.getTimezoneOffset() * 60000);
  const beijingTime = new Date(utcTime + (beijingOffset * 60000));
  return beijingTime.toISOString().replace('T', ' ').substring(0, 19);
}

function getDB() {
  return db;
}

async function initDB() {
  const SQL = await initSqlJs();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  if (fs.existsSync(DB_PATH)) {
    const buf = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buf);
  } else {
    db = new SQL.Database();
  }

  db.run("PRAGMA foreign_keys = ON");

  db.run(`CREATE TABLE IF NOT EXISTS departments (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, parent_id TEXT, description TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS roles (
    id TEXT PRIMARY KEY, name TEXT NOT NULL UNIQUE, description TEXT, permissions TEXT DEFAULT '{}',
    created_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, email TEXT NOT NULL UNIQUE, password TEXT NOT NULL, name TEXT NOT NULL,
    phone TEXT, role_id TEXT, department_id TEXT, status TEXT DEFAULT 'active', avatar TEXT,
    last_login TEXT, created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT, phone TEXT, company TEXT, address TEXT,
    region TEXT, industry TEXT, status TEXT DEFAULT 'active', notes TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), created_by TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS consultants (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, email TEXT NOT NULL UNIQUE, phone TEXT,
    department_id TEXT, hire_date TEXT, status TEXT DEFAULT 'active', user_id TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS contracts (
    id TEXT PRIMARY KEY, contract_number TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
    value REAL DEFAULT 0, start_date TEXT, end_date TEXT, status TEXT DEFAULT 'draft',
    customer_id TEXT, consultant_id TEXT, description TEXT, version INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now')), created_by TEXT
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS contract_media (
    id TEXT PRIMARY KEY, contract_id TEXT NOT NULL, url TEXT NOT NULL,
    type TEXT DEFAULT 'image', title TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS contract_versions (
    id TEXT PRIMARY KEY, contract_id TEXT NOT NULL, version INTEGER NOT NULL,
    data TEXT NOT NULL, changed_by TEXT, change_summary TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS contract_approvals (
    id TEXT PRIMARY KEY, contract_id TEXT NOT NULL, approver_id TEXT,
    status TEXT DEFAULT 'pending', comments TEXT, step INTEGER DEFAULT 1,
    step_name TEXT DEFAULT '审批',
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS customer_contacts (
    id TEXT PRIMARY KEY, customer_id TEXT NOT NULL, type TEXT DEFAULT 'note',
    content TEXT, created_by TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY, user_id TEXT, action TEXT NOT NULL, entity_type TEXT,
    entity_id TEXT, details TEXT, ip_address TEXT, created_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS saved_filters (
    id TEXT PRIMARY KEY, user_id TEXT NOT NULL, name TEXT NOT NULL,
    module TEXT NOT NULL, filters TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now'))
  )`);
  db.run(`CREATE TABLE IF NOT EXISTS system_settings (
    key TEXT PRIMARY KEY, value TEXT, updated_at TEXT DEFAULT (datetime('now')), updated_by TEXT
  )`);

  saveDB();
}

function saveDB() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

// Helper to run queries and return results as array of objects
function queryAll(sql, params) {
  const stmt = db.prepare(sql);
  if (params && params.length) stmt.bind(params);
  const results = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

function queryOne(sql, params) {
  const results = queryAll(sql, params);
  return results.length > 0 ? results[0] : null;
}

function runSql(sql, params) {
  // 将 datetime("now") 替换为北京时间
  var beijingTime = getBeijingTime();
  sql = sql.replace(/datetime\("now"\)/g, '"' + beijingTime + '"');
  
  if (params && params.length) {
    db.run(sql, params);
  } else {
    db.run(sql);
  }
  saveDB();
}

function seedData() {
  const existing = queryOne('SELECT COUNT(*) as count FROM roles');
  if (existing && existing.count > 0) return;

  const roles = [
    { id: uuidv4(), name: 'Admin', description: 'Full system access', permissions: JSON.stringify({ all: true }) },
    { id: uuidv4(), name: 'Manager', description: 'Department management access', permissions: JSON.stringify({ contracts: ['read','write','delete'], customers: ['read','write'], consultants: ['read','write'], analytics: ['read'], reports: ['read','write'], users: ['read'] }) },
    { id: uuidv4(), name: 'Consultant', description: 'Sales consultant access', permissions: JSON.stringify({ contracts: ['read','write'], customers: ['read','write'], analytics: ['read'] }) },
    { id: uuidv4(), name: 'Viewer', description: 'Read-only access', permissions: JSON.stringify({ contracts: ['read'], customers: ['read'], consultants: ['read'], analytics: ['read'] }) },
  ];
  roles.forEach(r => runSql('INSERT INTO roles (id, name, description, permissions) VALUES (?, ?, ?, ?)', [r.id, r.name, r.description, r.permissions]));

  const depts = [
    { id: uuidv4(), name: 'Sales', description: 'Sales Department' },
    { id: uuidv4(), name: 'Operations', description: 'Operations Department' },
    { id: uuidv4(), name: 'Finance', description: 'Finance Department' },
    { id: uuidv4(), name: 'Legal', description: 'Legal Department' },
  ];
  depts.forEach(d => runSql('INSERT INTO departments (id, name, description) VALUES (?, ?, ?)', [d.id, d.name, d.description]));

  const adminPass = bcrypt.hashSync('admin123', 10);
  const userPass = bcrypt.hashSync('user123', 10);
  const adminRole = roles.find(r => r.name === 'Admin');
  const managerRole = roles.find(r => r.name === 'Manager');
  const consultantRole = roles.find(r => r.name === 'Consultant');
  const viewerRole = roles.find(r => r.name === 'Viewer');

  const users = [
    { id: uuidv4(), email: 'admin@example.com', password: adminPass, name: 'System Admin', role_id: adminRole.id, department_id: depts[1].id, status: 'active' },
    { id: uuidv4(), email: 'manager@example.com', password: userPass, name: 'Sales Manager', role_id: managerRole.id, department_id: depts[0].id, status: 'active' },
    { id: uuidv4(), email: 'consultant@example.com', password: userPass, name: 'John Consultant', role_id: consultantRole.id, department_id: depts[0].id, status: 'active' },
    { id: uuidv4(), email: 'viewer@example.com', password: userPass, name: 'Jane Viewer', role_id: viewerRole.id, department_id: depts[2].id, status: 'active' },
  ];
  users.forEach(u => runSql('INSERT INTO users (id, email, password, name, role_id, department_id, status) VALUES (?, ?, ?, ?, ?, ?, ?)', [u.id, u.email, u.password, u.name, u.role_id, u.department_id, u.status]));

  const consultants = [
    { id: uuidv4(), name: 'John Consultant', email: 'consultant@example.com', phone: '555-0101', department_id: depts[0].id, hire_date: '2024-01-15', status: 'active', user_id: users[2].id },
    { id: uuidv4(), name: 'Alice Sales', email: 'alice@example.com', phone: '555-0102', department_id: depts[0].id, hire_date: '2024-03-01', status: 'active', user_id: null },
    { id: uuidv4(), name: 'Bob Deal', email: 'bob@example.com', phone: '555-0103', department_id: depts[0].id, hire_date: '2024-06-15', status: 'active', user_id: null },
    { id: uuidv4(), name: 'Carol Rep', email: 'carol@example.com', phone: '555-0104', department_id: depts[0].id, hire_date: '2025-01-10', status: 'on_leave', user_id: null },
  ];
  consultants.forEach(c => runSql('INSERT INTO consultants (id, name, email, phone, department_id, hire_date, status, user_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [c.id, c.name, c.email, c.phone, c.department_id, c.hire_date, c.status, c.user_id]));

  const industries = ['Technology', 'Finance', 'Healthcare', 'Manufacturing', 'Retail', 'Education'];
  const regions = ['North', 'South', 'East', 'West', 'Central'];
  const custStatuses = ['active', 'inactive', 'prospect', 'archived'];
  const customers = [];
  for (let i = 1; i <= 20; i++) {
    const cust = { id: uuidv4(), name: `Customer ${i}`, email: `customer${i}@example.com`, phone: `555-${String(i).padStart(4,'0')}`,
      company: `Company ${i} Inc.`, address: `${i * 100} Main St`, region: regions[i % regions.length],
      industry: industries[i % industries.length], status: custStatuses[i % custStatuses.length],
      notes: `Notes for customer ${i}`, created_by: users[0].id };
    customers.push(cust);
    runSql('INSERT INTO customers (id, name, email, phone, company, address, region, industry, status, notes, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [cust.id, cust.name, cust.email, cust.phone, cust.company, cust.address, cust.region, cust.industry, cust.status, cust.notes, cust.created_by]);
  }

  const contractStatuses = ['draft', 'pending', 'active', 'completed', 'terminated'];
  const contracts = [];
  for (let i = 1; i <= 30; i++) {
    const startMonth = String(((i % 12) + 1)).padStart(2, '0');
    const year = i <= 15 ? '2025' : '2024';
    const ct = { id: uuidv4(), contract_number: `CTR-${String(i).padStart(5,'0')}`, name: `Contract ${i}`,
      value: Math.round((Math.random() * 100000 + 5000) * 100) / 100,
      start_date: `${year}-${startMonth}-01`, end_date: `${parseInt(year)+1}-${startMonth}-01`,
      status: contractStatuses[i % contractStatuses.length],
      customer_id: customers[i % customers.length].id,
      consultant_id: consultants[i % consultants.length].id,
      description: `Description for contract ${i}`, created_by: users[0].id };
    contracts.push(ct);
    runSql('INSERT INTO contracts (id, contract_number, name, value, start_date, end_date, status, customer_id, consultant_id, description, created_by) VALUES (?,?,?,?,?,?,?,?,?,?,?)',
      [ct.id, ct.contract_number, ct.name, ct.value, ct.start_date, ct.end_date, ct.status, ct.customer_id, ct.consultant_id, ct.description, ct.created_by]);
  }

  contracts.slice(0, 10).forEach((c, i) => {
    runSql('INSERT INTO contract_media (id, contract_id, url, type, title) VALUES (?,?,?,?,?)',
      [uuidv4(), c.id, `https://picsum.photos/800/600?random=${i}`, 'image', `Contract ${i+1} Image`]);
  });

  // 为 pending 状态的合同创建审批记录
  contracts.filter(c => c.status === 'pending').forEach(c => {
    var approverRole = c.value >= 50000 ? 'Admin' : 'Manager';
    var approverId = approverRole === 'Admin' ? users[0].id : users[1].id;
    var stepName = approverRole === 'Admin' ? '管理员审批' : '经理审批';
    runSql('INSERT INTO contract_approvals (id, contract_id, approver_id, status, comments, step, step_name, created_at, updated_at) VALUES (?,?,?,?,?,?,?,datetime("now"),datetime("now"))',
      [uuidv4(), c.id, approverId, 'pending', null, 1, stepName]);
  });

  console.log('Database seeded successfully');
  saveDB();
}

module.exports = { getDB, initDB, seedData, queryAll, queryOne, runSql, saveDB, getBeijingTime };
