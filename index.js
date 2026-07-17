const express = require('express');
const db = require('./src/db');
const database = require('./src/database');
const usersRouter = require('./src/routes/users');
const authRouter = require('./src/routes/auth');
const observationsRouter = require('./src/routes/observations');
const requestsRouter = require('./src/routes/requests');
const profileRouter = require('./src/routes/profile');
const adminRouter = require('./src/routes/admin');

const app = express();
const port = process.env.PORT || 80;

app.use(express.static('public'));
app.use(express.json());

app.get('/register', (req, res) => res.sendFile('auth/register.html', { root: 'public' }));
app.get('/login', (req, res) => res.sendFile('auth/login.html', { root: 'public' }));

app.get('/health', async (req, res) => {
  const database = await db.healthCheck();
  res.json({
    server: 'running',
    database: database ? 'connected' : 'disconnected',
  });
});

app.use('/api/users', usersRouter);
app.use('/api/auth', authRouter);
app.use('/api/observations', observationsRouter);
app.use('/api/observations', requestsRouter);
app.use('/api/profile', profileRouter);
app.use('/api/admin', adminRouter);

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
