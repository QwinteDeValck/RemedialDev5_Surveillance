const express = require('express');
const db = require('./src/db');
const database = require('./src/database');

const app = express();
const port = process.env.PORT || 80;

app.get('/health', async (req, res) => {
  const database = await db.healthCheck();
  res.json({
    server: 'running',
    database: database ? 'connected' : 'disconnected',
  });
});

async function start() {
  try {
    await db.connect();
    console.log('Database connected');
    await database.init();
  } catch (err) {
    console.error('Database connection failed:', err.message || err);
  }

  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}

start();
