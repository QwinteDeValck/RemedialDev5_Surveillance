const express = require('express');
const db = require('./src/db');
const database = require('./src/database');
const usersRouter = require('./src/routes/users');
const authRouter = require('./src/routes/auth');

const app = express();
const port = process.env.PORT || 80;

app.use(express.static('public'));
app.use(express.json());

app.get('/register', (req, res) => res.sendFile('register.html', { root: 'public' }));
app.get('/login', (req, res) => res.sendFile('login.html', { root: 'public' }));

app.get('/health', async (req, res) => {
  const database = await db.healthCheck();
  res.json({
    server: 'running',
    database: database ? 'connected' : 'disconnected',
  });
});

app.use('/api/users', usersRouter);
app.use('/api/auth', authRouter);

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
