const db = require('../db');
const { CREATE_ROLES_TABLE, CREATE_USERS_TABLE, SEED_ROLES } = require('./init');

async function init() {
  const client = await db.pool.connect();
  try {
    await client.query(CREATE_ROLES_TABLE);
    await client.query(CREATE_USERS_TABLE);
    await client.query(SEED_ROLES);
    console.log('Database structure initialized');
  } finally {
    client.release();
  }
}

module.exports = { init };
