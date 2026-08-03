# Security

This chapter describes the security measures implemented in the application and explains why each measure improves its security posture. The measures cover authentication, authorization, input handling, and accountability. They align with common web application security practices such as those described by the OWASP Top 10.

## JWT Authentication

Authentication is implemented with JSON Web Tokens issued by the `jsonwebtoken` library. On successful login, the server signs a token containing the user's ID, username, and role, with a validity of 24 hours. The signing secret is read from the environment (`JWT_SECRET`) rather than hard-coded.

The token serves as a bearer credential: the frontend stores it in `localStorage` and sends it in the `Authorization: Bearer` header of every API request. The `authenticate` middleware (`src/middleware/auth.js`) verifies the token signature and expiry on every request.

This improves security in two ways. First, a stateless token means the server does not need to maintain a session store, and a token cannot be forged without the signing secret. Second, the explicit expiry limit ensures that a leaked token becomes invalid within a bounded time. The token carries only the user's identity; it is not trusted as a source of authorization data, as described below.

The complete authentication and authorization flow is summarized below.

```
User Login
      │
      ▼
 Verify credentials
      │
      ▼
 Generate JWT
      │
      ▼
 Store in localStorage
      │
      ▼
 Authorization: Bearer <token>
      │
      ▼
 authenticate()
      │
      ▼
 authorize()
      │
      ▼
 Controller
```

## Password Hashing

Passwords are never stored in plain text. Registration hashes the password with Node's built-in `crypto` module using the scrypt key-derivation function:

- a random 16-byte salt is generated per password,
- the password is hashed with `crypto.scryptSync(password, salt, 64)`,
- the salt and derived key are stored together in the format `salt:hash`.

Verification re-derives the key from the submitted password and the stored salt, and compares it against the stored hash.

scrypt is a deliberately expensive, memory-hard key-derivation function designed to resist brute-force and GPU-based guessing attacks. Because every password has its own random salt, identical passwords produce different stored values, which defeats rainbow-table attacks and prevents attackers from detecting users who share a password. The use of a per-user salt also means an attacker cannot amortize a single computation across the whole user table.

## Role-Based Access Control

Access to administration functionality is governed by a role hierarchy defined in the database (`roles` table) and reflected in the authorization middleware. The application defines four roles with numeric levels:

| Role | Level |
|------|-------|
| `USER` | 1 |
| `MODERATOR` | 2 |
| `ADMIN` | 3 |
| `OWNER` | 4 |

A route that requires a role specifies the minimum level; any requester at or above that level is authorized, and anyone below it is rejected with `403 Forbidden`. This model keeps authorization declarative: each route declares its requirement, and the middleware enforces it uniformly, which reduces the risk of a route being accidentally left unprotected or of inconsistent permission checks across the application.

## Protected Routes

Every route that operates on protected data is guarded by middleware. The observation, profile, and administration routes all apply `authenticate` before reaching the controller, so unauthenticated requests receive `401` before any data is accessed. Administration routes additionally apply `authorize` with the required role. This ensures that protection is enforced at the routing layer rather than being left to each controller, which centralizes the security boundary and makes it visible in the route definitions.

## Authorization Middleware

The `authorize(minRoleName)` middleware compares the requester's role level against the required minimum:

```
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

Two properties of this middleware are security-relevant. First, it reads the role from the database on every request rather than from the token, so a role change takes effect immediately and an old token cannot retain elevated privileges. Second, the comparison uses the numeric level, which makes the hierarchy explicit and prevents errors that could arise from string equality checks. Additional controller-level rules supplement the middleware: the `OWNER` role cannot be changed or deactivated, a user cannot modify their own role, and only `OWNER` may grant the `ADMIN` role.

## Input Validation

User-supplied input is validated before it is used. Registration enforces a minimum username length, an email format check, and a minimum password length (`src/controllers/users.js`). Observation creation and editing validate that required fields such as title, category, and address are present and non-empty, and that the `is_public` flag is a boolean when supplied (`src/controllers/observations.js`). Administration routes validate that a `role_name` refers to an existing role and that a status `action` is one of the two allowed values.

Validation improves security by rejecting malformed input before it reaches the database or the business logic. It prevents type-confusion errors, ensures that invalid values cannot be persisted, and reduces the surface available to an attacker probing the API with unexpected payloads.

## SQL Injection Prevention

All database access uses parameterized queries with placeholder parameters (`$1`, `$2`, ...) from the `pg` library. User input is passed as parameters, never concatenated into SQL strings. For example, the login query binds the email as a parameter, and the observation queries bind all user-supplied fields.

Parameterized queries separate the query structure from the data, so user input cannot alter the structure of the SQL statement. Even an input containing SQL syntax is treated as literal data. This eliminates the entire class of SQL injection vulnerabilities, which is the most common critical web application flaw according to OWASP. The WHERE clauses that build dynamic filters (as in the audit log query) also bind their values as parameters, preserving this protection for dynamic queries.

## Privilege Escalation Prevention

Several layered measures prevent a user from acting above their assigned role:

- The numeric role-level comparison in `authorize` means a `USER` token cannot reach moderator or administrator routes; the middleware returns `403` at the routing layer.
- The audit-log route applies its own scope checks, so a `MODERATOR` cannot read administration-scoped audit entries.
- Controller-level checks prevent an `ADMIN` from promoting a user to `ADMIN` or `OWNER`, and prevent anyone from changing the `OWNER` role or deactivating the `OWNER` account.
- Observation ownership is enforced per resource: a private observation is only accessible to its author, and public observations cannot be edited or deleted.

Because authorization is evaluated against the current database role on every request and is checked at multiple layers (routing middleware and controller logic), there is no single point whose failure would silently grant elevated access.

## Audit Logging

Security-relevant actions are recorded in an `audit_log` table through a shared `logAction` function (`src/controllers/audit.js`). The recorded actions include role promotions and demotions, account activation and deactivation, and observation request approvals and rejections. Each entry stores the action type, the affected entity, the performing user, a timestamp, and optional details serialized as JSON.

Audit logging improves security by providing accountability: every privileged action can be traced to a specific user and time. This supports detection of misuse, investigation after a security incident, and verification that authorization rules are being enforced correctly in practice. The audit endpoint is itself restricted, with administration-scoped entries readable only by `ADMIN` and `OWNER`, so the record of privileged actions cannot be inspected by the users it monitors.

## Summary

The security measures form a defense-in-depth strategy. JWT and scrypt-based hashing protect authentication; the role-level middleware, protected routes, and controller rules enforce authorization; parameterized queries and input validation neutralize injection and malformed-input attacks; and audit logging provides accountability for privileged actions. Each measure addresses a distinct class of vulnerability, and together they ensure that a user can only access the data and functions that their role legitimately permits.
