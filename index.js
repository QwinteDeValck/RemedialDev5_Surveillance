const express = require('express');
const db = require('./src/db');
const database = require('./src/database');
const usersRouter = require('./src/routes/users');

const app = express();
const port = process.env.PORT || 80;

app.use(express.static('public'));
app.use(express.json());

app.get('/health', async (req, res) => {
  const database = await db.healthCheck();
  res.json({
    server: 'running',
    database: database ? 'connected' : 'disconnected',
  });
});

app.use('/api/users', usersRouter);

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
