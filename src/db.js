const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.PGHOST || 'localhost',
  port: parseInt(process.env.PGPORT, 10) || 5432,
  user: process.env.PGUSER || process.env.POSTGRES_USER || 'postgres',
  password: process.env.PGPASSWORD || process.env.POSTGRES_PASSWORD || 'changeme',
  database: process.env.PGDATABASE || process.env.POSTGRES_DB || 'surveillance',
});

async function connect() {
  const client = await pool.connect();
  await client.query('SELECT 1');
  client.release();
  return true;
}

async function healthCheck() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');
    client.release();
    return true;
  } catch {
    return false;
  }
}

module.exports = { pool, connect, healthCheck };
