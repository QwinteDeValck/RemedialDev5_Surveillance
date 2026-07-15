const db = require('../db');
const { CREATE_ROLES_TABLE, CREATE_USERS_TABLE, SEED_ROLES, CREATE_OBSERVATIONS_TABLE, CREATE_OBSERVATION_REQUESTS_TABLE, ADD_PREFERENCES_COLUMNS, ADD_DELETED_AT_COLUMN } = require('./init');

async function init() {
  const client = await db.pool.connect();
  try {
    await client.query(CREATE_ROLES_TABLE);
    await client.query(CREATE_USERS_TABLE);
    await client.query(SEED_ROLES);
    await client.query(CREATE_OBSERVATIONS_TABLE);
    await client.query(CREATE_OBSERVATION_REQUESTS_TABLE);
    await client.query(ADD_PREFERENCES_COLUMNS);
    await client.query(ADD_DELETED_AT_COLUMN);
    console.log('Database structure initialized');
  } finally {
    client.release();
  }
}

module.exports = { init };
