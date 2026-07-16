const CREATE_ROLES_TABLE = `
  CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`;

const CREATE_USERS_TABLE = `
  CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role_id INTEGER NOT NULL DEFAULT 1 REFERENCES roles(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`;

const SEED_ROLES = `
  INSERT INTO roles (name) VALUES ('USER'), ('MODERATOR'), ('ADMIN'), ('OWNER')
  ON CONFLICT (name) DO NOTHING;
`;

const SEED_OWNER = `
  INSERT INTO users (username, email, password, role_id)
  VALUES ('owner', 'owner@surveillance.local', '1cbec35db03a2efd67b085ce2b9d71c4:6d90cb255522a270567d5241757cc6dc3ca7641723de4d5ef6a18f164b6220408979b924ae3c7e250f86291cdb74eaa4caaf8d9675dff336e899333a1eb14a0a', (SELECT id FROM roles WHERE name = 'OWNER'))
  ON CONFLICT (email) DO NOTHING;
`;

const CREATE_OBSERVATIONS_TABLE = `
  CREATE TABLE IF NOT EXISTS observations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title VARCHAR(255) NOT NULL,
    category VARCHAR(100) NOT NULL,
    description TEXT,
    address TEXT NOT NULL,
    latitude DECIMAL(10,7),
    longitude DECIMAL(10,7),
    is_public BOOLEAN NOT NULL DEFAULT false,
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_by UUID NOT NULL REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`;

const CREATE_OBSERVATION_REQUESTS_TABLE = `
  CREATE TABLE IF NOT EXISTS observation_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    observation_id UUID NOT NULL REFERENCES observations(id),
    requested_by UUID NOT NULL REFERENCES users(id),
    type VARCHAR(20) NOT NULL CHECK (type IN ('EDIT', 'DELETE')),
    reason TEXT,
    status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
    created_at TIMESTAMPTZ DEFAULT NOW()
  );
`;

const ADD_PREFERENCES_COLUMNS = `
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS preferred_city VARCHAR(100),
  ADD COLUMN IF NOT EXISTS preferred_latitude DECIMAL(10,7),
  ADD COLUMN IF NOT EXISTS preferred_longitude DECIMAL(10,7);
`;

const ADD_DELETED_AT_COLUMN = `
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
`;

const ADD_PROPOSED_COLUMNS = `
  ALTER TABLE observation_requests
  ADD COLUMN IF NOT EXISTS proposed_title VARCHAR(255),
  ADD COLUMN IF NOT EXISTS proposed_category VARCHAR(100),
  ADD COLUMN IF NOT EXISTS proposed_description TEXT,
  ADD COLUMN IF NOT EXISTS proposed_address TEXT;
`;

module.exports = { CREATE_ROLES_TABLE, CREATE_USERS_TABLE, SEED_ROLES, SEED_OWNER, CREATE_OBSERVATIONS_TABLE, CREATE_OBSERVATION_REQUESTS_TABLE, ADD_PREFERENCES_COLUMNS, ADD_DELETED_AT_COLUMN, ADD_PROPOSED_COLUMNS };
