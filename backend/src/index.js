const express = require('express');
const cors = require('cors');
const { initDB, seedData } = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Health check (available before DB init)
app.get('/api/health', function(req, res) {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function start() {
  await initDB();
  seedData();

  // Routes (loaded after DB init so queryAll/queryOne work)
  app.use('/api/auth', require('./routes/auth'));
  app.use('/api/users', require('./routes/users'));
  app.use('/api/departments', require('./routes/departments'));
  app.use('/api/customers', require('./routes/customers'));
  app.use('/api/consultants', require('./routes/consultants'));
  app.use('/api/contracts', require('./routes/contracts'));
  app.use('/api/analytics', require('./routes/analytics'));
  app.use('/api/reports', require('./routes/reports'));
  app.use('/api/settings', require('./routes/settings'));
  app.use('/api/logs', require('./routes/logs'));

  app.listen(PORT, '0.0.0.0', function() {
    console.log('Backend running on port ' + PORT);
  });
}

start().catch(function(err) {
  console.error('Failed to start:', err);
  process.exit(1);
});
