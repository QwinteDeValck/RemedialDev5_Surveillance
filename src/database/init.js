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
  INSERT INTO roles (name) VALUES ('USER'), ('ADMIN')
  ON CONFLICT (name) DO NOTHING;
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

module.exports = { CREATE_ROLES_TABLE, CREATE_USERS_TABLE, SEED_ROLES, CREATE_OBSERVATIONS_TABLE };
