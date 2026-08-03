# Backend Architecture

## Why MVC

The backend follows the **Model-View-Controller** pattern, adapted for a RESTful API where the view layer is handled by the frontend.

MVC was chosen because:

- **Separation of concerns**: Business logic (controllers), data access (models/database), and presentation (frontend) are independent layers. Changes to one layer do not affect the others.
- **Testability**: Controllers can be tested in isolation by mocking database queries.
- **Familiarity**: MVC is a widely understood pattern, making it easier for new developers to understand the codebase.
- **Express alignment**: Express's middleware-based routing naturally maps to the MVC pattern — routes delegate to controllers, which query the database and return responses.

## Folder Organization

```
src/
├── index.js                 # Application entry point — Express setup, middleware, routes
├── db.js                    # PostgreSQL connection pool (singleton)
├── controllers/             # Business logic per feature
│   ├── admin.js             # Dashboard, user management, observation moderation
│   ├── audit.js             # Audit log queries and logging utility
│   ├── auth.js              # Login (credential verification, JWT generation)
│   ├── observations.js      # Observation CRUD, geocoding, requests
│   ├── profile.js           # Profile editing, password change, preferences
│   └── users.js             # User creation, password hashing/verification
├── middleware/
│   └── auth.js              # authenticate() — JWT verification + DB role lookup
│                            # authorize() — role-level access control
├── routes/
│   ├── admin.js             # All /api/admin/* routes
│   ├── auth.js              # /api/auth/* routes
│   ├── observations.js      # /api/observations/* routes
│   └── profile.js           # /api/profile/* routes
└── database/
    └── init.js              # Schema definitions (CREATE TABLE, ALTER, SEED)
```

## Controllers

Controllers are plain JavaScript modules that export asynchronous functions. They receive parsed parameters from the route handler, execute business logic, perform database queries, and return results or error objects.

### Pattern

Every controller function follows the same pattern:

```javascript
async function functionName(params) {
  // 1. Validate input
  // 2. Query database
  // 3. Process result
  // 4. Return { data } or { error, status }
}
```

### Controller Overview

| Controller | Key Functions | Responsibility |
|-----------|--------------|----------------|
| **auth.js** | `login()` | Verify email/password, check deleted_at, return JWT |
| **users.js** | `createUser()`, `hashPassword()`, `verifyPassword()` | Registration, scrypt hashing |
| **profile.js** | `getProfile()`, `updateProfile()`, `updatePassword()`, `deleteAccount()`, `getPreferences()`, `savePreferences()` | Profile CRUD, map preferences |
| **observations.js** | `create()`, `getAll()`, `getById()`, `update()`, `delete()`, `createRequest()` | Observation CRUD, geocoding, modification requests |
| **admin.js** | `getDashboard()`, `getUsers()`, `updateUserRole()`, `toggleUserStatus()`, `getObservations()`, `getRequests()`, `approveRequest()`, `rejectRequest()` | Administration and moderation |
| **audit.js** | `logAction()`, `getAuditLog()` | Audit logging utility and queries |

### Audit Controller

The audit controller is implemented as a separate module because it is consumed by multiple controllers (admin, profile) and has a distinct responsibility — logging and retrieving audit entries.

`logAction()` is a fire-and-forget utility that inserts a row into the `audit_log` table:

```javascript
async function logAction({ action, entityType, entityId, performedBy, details }) {
  await db.pool.query(
    'INSERT INTO audit_log (action, entity_type, entity_id, performed_by, details) VALUES ($1, $2, $3, $4, $5)',
    [action, entityType || null, entityId || null, performedBy, details ? JSON.stringify(details) : null]
  );
}
```

`getAuditLog()` builds a parameterized query with optional filters for action, entity type, and user. It supports pagination and returns both the filtered entries and the total count.

## Routes

Routes define the URL structure and attach middleware chains to controller functions.

### Route Registration

```javascript
// src/index.js
const adminRoutes = require('./routes/admin');
app.use('/api/admin', adminRoutes);
```

### Middleware Chain per Route

```
Request → authenticate → authorize('ROLE') → controller function → Response
```

Example from `routes/admin.js`:

```javascript
router.put('/users/:id/role', authenticate, authorize('ADMIN'), async (req, res) => {
  try {
    const result = await updateUserRole(req.params.id, req.body.role_name, req.user.id);
    if (result.error) {
      return res.status(result.status || 400).json({ error: result.error });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role.' });
  }
});
```

### Route Table

| Method | Path | Auth | Min Role |
|--------|------|------|----------|
| POST | /api/auth/register | — | — |
| POST | /api/auth/login | — | — |
| GET | /api/profile | JWT | USER |
| PUT | /api/profile | JWT | USER |
| DELETE | /api/profile | JWT | USER |
| PUT | /api/profile/password | JWT | USER |
| GET | /api/profile/preferences | JWT | USER |
| PUT | /api/profile/preferences | JWT | USER |
| GET | /api/observations | — | — |
| POST | /api/observations | JWT | USER |
| GET | /api/observations/:id | — | — |
| PUT | /api/observations/:id | JWT | USER |
| DELETE | /api/observations/:id | JWT | USER |
| POST | /api/observations/:id/request | JWT | USER |
| GET | /api/admin/dashboard | JWT | MODERATOR |
| GET | /api/admin/users | JWT | MODERATOR |
| PUT | /api/admin/users/:id/role | JWT | ADMIN |
| PUT | /api/admin/users/:id/status | JWT | ADMIN |
| GET | /api/admin/observations | JWT | MODERATOR |
| GET | /api/admin/requests | JWT | MODERATOR |
| PUT | /api/admin/requests/:id/approve | JWT | MODERATOR |
| PUT | /api/admin/requests/:id/reject | JWT | MODERATOR |
| GET | /api/admin/audit | JWT | MODERATOR+ (scope-based) |

## REST API Design

The backend exposes a RESTful API following common HTTP conventions.

| HTTP Method | Operation | Description |
|-------------|-----------|-------------|
| GET | Retrieve | Fetch one or more resources. Collection endpoints support filtering via query parameters. |
| POST | Create | Create a new resource. The request body contains the resource data. |
| PUT | Update | Replace or update an existing resource. The request body contains the fields to modify. |
| DELETE | Remove | Delete or archive a resource. Observations and users use soft deletion. |

### Why JWT

JWT was chosen over session-based authentication for the following reasons:

- **Statelessness**: The server does not store session state. Each request carries its own authentication token, which eliminates server-side session storage and enables horizontal scaling — any API instance can handle any request.
- **Frontend compatibility**: The frontend is a vanilla JavaScript SPA that stores the token in `localStorage`. JWT integrates naturally with this architecture without requiring cookie-based session management or CSRF protection.
- **Separation of concerns**: Authentication logic (token verification) and authorization logic (role checking) are cleanly separated across the `authenticate` and `authorize` middleware layers.

Responses are returned as JSON with appropriate HTTP status codes:

| Status Code | Usage |
|-------------|-------|
| 200 | Successful GET or PUT |
| 201 | Successful POST (resource created) |
| 400 | Invalid input or business logic violation |
| 401 | Missing or invalid JWT |
| 403 | Authenticated but insufficient permissions |
| 404 | Resource not found |
| 500 | Unexpected server error |

Collection endpoints support filtering through query parameters rather than request bodies, following standard REST conventions. For example:

```
GET /api/admin/users?role=MODERATOR&status=active
GET /api/admin/observations?category=noise&status=OPEN
GET /api/admin/audit?scope=observations&action=REQUEST_APPROVE
```

Error responses follow a consistent format:

```json
{ "error": "Descriptive error message." }
```

## Middleware

### authenticate

```javascript
async function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication required.' });
  }
  try {
    const token = header.split(' ')[1];
    req.user = jwt.verify(token, secret);
    req.user.role_name = await getUserRoleName(req.user.id);
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}
```

The middleware performs three tasks:
1. Extracts the JWT from the `Authorization` header
2. Verifies the token's cryptographic signature
3. Looks up the user's current role from the database (not from the JWT payload) to prevent stale role data

### authorize

```javascript
function authorize(minRoleName) {
  return async (req, res, next) => {
    const roleName = await getUserRoleName(req.user.id);
    if (ROLE_LEVELS[roleName] < ROLE_LEVELS[minRoleName]) {
      return res.status(403).json({ error: 'Insufficient permissions.' });
    }
    next();
  };
}
```

The authorization middleware:
1. Queries the database for the user's current role
2. Compares the role level against the required minimum using a numeric scale (USER=1, MODERATOR=2, ADMIN=3, OWNER=4)
3. Returns 403 Forbidden if the user lacks sufficient privileges

The role is always queried from the database rather than trusted from the JWT. This ensures that role changes take effect immediately without requiring the user to log in again.

## Authentication Flow

```
Login Request
  │
  ▼
POST /api/auth/login
  │
  ├─ Validate email + password presence
  ├─ SELECT user + role JOIN from database
  ├─ Check deleted_at (reject if deleted)
  ├─ Verify password with scrypt
  │     └─ Fail → return 401 "Invalid email or password."
  │
  └─ Generate JWT (sign with id, username, role_id, role_name)
       └─ Return { token, user }
```

## Authorization Flow

```
Protected Request
  │
  ▼
authenticate middleware
  ├─ Verify JWT signature
  └─ Query current role from database
       └─ Attach user to req.user
  │
  ▼
authorize('MODERATOR')  // or ADMIN
  ├─ Query current role from database
  ├─ Compare level: USER(1) vs MODERATOR(2)
  │     └─ Insufficient → 403 Forbidden
  └─ Sufficient → next()
  │
  ▼
Controller → Database → Response
```

## Input Validation

Input validation is performed at the controller level rather than as separate middleware. Each controller validates its specific inputs before processing:

- **Authentication**: Email format and password presence checked before database query
- **Profile**: Email uniqueness, username availability, password length (minimum 6 characters), current password confirmation
- **Observations**: Required fields (title, category, address) validated, visibility flag checked against boolean
- **Admin**: Role name validated against existing roles in database, action parameter checked against allowed values (`activate`/`deactivate`), request status verified as `PENDING` before processing

## SQL Injection Prevention

All database queries use **parameterized statements** with PostgreSQL's `$1`, `$2` syntax. User input is never concatenated directly into SQL strings. The `pg` library handles escaping and type coercion automatically.

```javascript
// Safe — parameterized
await db.pool.query('SELECT * FROM users WHERE email = $1', [email]);

// Unsafe — string concatenation (never used in this project)
await db.pool.query(`SELECT * FROM users WHERE email = '${email}'`);
```

## Error Handling

Every route handler wraps its controller call in a try/catch block. Expected errors (validation failures, not found, permission denied) are returned as JSON with appropriate HTTP status codes. Unexpected errors (database connection failures, programming errors) return a generic 500 response and are logged to the console.

```javascript
try {
  const result = await someController(params);
  if (result.error) {
    return res.status(result.status || 400).json({ error: result.error });
  }
  res.json(result);
} catch (err) {
  console.error('Route error:', err);
  res.status(500).json({ error: 'Internal server error.' });
}
```
