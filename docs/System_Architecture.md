# System Architecture

## Overview

The application follows a three-tier architecture with a clear separation between the frontend presentation layer, the backend API layer, and the database persistence layer. The frontend and backend communicate exclusively through RESTful HTTP endpoints.

```
┌─────────────────┐       HTTP/JSON       ┌─────────────────┐       SQL       ┌──────────────┐
│   Frontend      │ ◄──────────────────► │    Backend      │ ◄────────────► │  PostgreSQL  │
│  (Vanilla JS)   │                       │  (Express/Node) │                 │              │
│  Static HTML    │      JWT Auth         │   MVC Pattern   │                 │  JSONB, UUID │
└─────────────────┘                       └─────────────────┘                 └──────────────┘
```

### Technology Stack

| Layer | Technology |
|-------|------------|
| Frontend | HTML5, CSS3, Vanilla JavaScript |
| Backend | Node.js, Express.js |
| Database | PostgreSQL |
| Authentication | JWT |
| Password Hashing | scrypt (Node.js `crypto.scryptSync`, 64-byte key length) |
| Mapping | Leaflet |
| Map Provider | OpenStreetMap |
| Geocoding | Nominatim |
| Deployment | Docker Compose |

## Component Diagram

```
Browser (Chrome, Firefox, etc.)
     │
     ▼
──────────────────────────────────────────
  Frontend  (HTML / CSS / Vanilla JS)
  ┌────────────────────────────────────┐
  │  app.js (auth, navigation, roles)  │
  │  observations.js / map.js / ...    │
  │  admin.js                          │
  └─────────────┬──────────────────────┘
                │  HTTP / JSON / JWT
────────────────┼──────────────────────────
                ▼
  REST API  (Express.js)
  ┌────────────────────────────────────┐
  │  Middleware: authenticate → auth.  │
  │              authorize (RBAC)      │
  ├────────────────────────────────────┤
  │  /api/auth       ── Auth Module    │
  │  /api/profile    ── Profile Module │
  │  /api/observations ─ Obs Module    │
  │  /api/admin/*    ── Admin Module   │
  │  /api/admin/audit ─ Audit Module   │
  └─────────────┬──────────────────────┘
                │  SQL (parameterized)
────────────────┼──────────────────────────
                ▼
  PostgreSQL
  ┌────────────────────────────────────┐
  │  roles        (USER/MODERATOR/...) │
  │  users        (profiles, deleted)  │
  │  observations (public/private)     │
  │  observation_requests (EDIT/DELETE)│
  │  audit_log    (JSONB details)      │
  └────────────────────────────────────┘
```

## Architectural Principles

The architecture was designed according to the following principles:

- **Separation of Concerns**: Frontend (presentation), backend (business logic), and database (persistence) are fully independent layers. Each layer can be developed, tested, and deployed separately.
- **Single Responsibility Principle**: Every module has a clearly defined purpose. The auth module handles authentication only; the audit module handles logging only; the admin module handles administration only. No module mixes concerns.
- **Stateless Communication**: The API uses RESTful principles with stateless JWT authentication. No server-side session state is required, enabling horizontal scaling without session affinity.
- **Layered Architecture**: Requests flow through distinct layers — route → middleware → controller → database — with each layer responsible for a specific concern (routing, security, business logic, persistence).
- **Modular Feature Organization**: Both frontend and backend are organized by feature rather than by technical role. This reduces coupling between unrelated features and makes the codebase easier to navigate.
- **Defense in Depth**: Security is enforced at multiple layers — JWT verification, database-backed role authorization, input validation, parameterized queries, and audit logging — rather than relying on a single security mechanism.

## MVC Pattern

The backend adheres to the Model-View-Controller pattern, adapted for a RESTful API:

- **Models** are represented by the database schema and queries (no ORM). The `src/db.js` module provides the connection pool.
- **Views** are handled entirely by the frontend, which is served as static HTML.
- **Controllers** contain business logic, validation, and database interactions.
- **Routes** map HTTP methods and URL paths to controller functions and attach middleware.

```
Request → Router → Middleware (auth, authorization) → Controller → Database
            ↓
        Response (JSON) ← Controller ← Database
```

## Project Structure

```
/
├── public/                  # Static frontend files
│   ├── admin/               # Administration page
│   ├── css/                 # Global styles
│   ├── js/                  # Frontend JavaScript modules
│   └── *.html               # Application pages
├── src/                     # Backend source code
│   ├── controllers/         # Business logic (admin, audit, observations, auth, profile)
│   ├── database/            # Schema definitions and initialization
│   ├── middleware/           # Express middleware (auth, authorization)
│   ├── routes/              # Route definitions
│   ├── db.js                # Database connection pool
│   └── index.js             # Application entry point
├── docs/                    # Project documentation
├── compose.yaml             # Docker Compose configuration
└── Dockerfile               # Backend container image
```

## Frontend Architecture

The frontend is built with vanilla JavaScript, HTML, and CSS — no frameworks or build tools. Pages are served as static HTML files from the `public/` directory.

Key characteristics:

- **Feature-based organization**: Each feature (observations, map, admin, profile) has its own JavaScript file co-located with the relevant pages.
- **Shared concerns**: Authentication state, API helper functions, and role level constants are centralized in `app.js`, which is loaded on every page.
- **Role-aware navigation**: The navigation bar conditionally renders links based on the user's role level (USER, MODERATOR, ADMIN, OWNER).
- **Leaflet integration**: The map module (map.js) handles map initialization, marker management, clustering, heatmap, and sidebar synchronization.

```
public/
├── js/
│   ├── app.js               # Auth, API helper, navigation, role constants
│   ├── login.js             # Login form logic
│   ├── register.js          # Registration form logic
│   ├── profile.js           # Profile management
│   ├── observations.js      # Observation listing
│   ├── observations-list.js # Observation list component
│   ├── observations-detail.js # Observation detail page
│   ├── observations-edit.js # Observation edit page
│   ├── map.js               # Map visualization
│   ├── filters.js           # Category and date filters
│   └── admin.js             # Administration dashboard
├── admin/
│   └── index.html           # Admin dashboard page
├── css/
│   └── style.css            # Global styles
├── index.html               # Homepage
├── map.html                 # Map page
├── observations.html        # Observations listing
├── profile.html             # Profile page
├── auth/
│   ├── login.html           # Login page
│   └── register.html        # Registration page
└── observation/
    ├── detail.html          # Observation detail
    └── edit.html            # Observation edit
```

## Backend Architecture

The backend is an Express.js application that exposes a RESTful JSON API.

### Route Structure

```
/api/auth
├── POST /register           # Create account
├── POST /login              # Authenticate, return JWT

/api/profile
├── GET /                    # Current user profile
├── PUT /                    # Update username/email
├── DELETE /                 # Delete account (soft)
├── PUT /password            # Change password
├── GET /preferences         # Map preferences
├── PUT /preferences         # Save map preferences

/api/observations
├── GET /                    # List observations (public or own)
├── POST /                   # Create observation
├── GET /:id                 # Get observation detail
├── PUT /:id                 # Update own private observation
├── DELETE /:id              # Delete own private observation
├── POST /:id/request        # Submit edit/removal request

/api/admin
├── GET /dashboard           # Platform statistics
├── GET /users               # List all users
├── PUT /users/:id/role      # Change user role
├── PUT /users/:id/status    # Activate/deactivate user
├── GET /observations        # List all observations
├── GET /requests            # List moderation requests
├── PUT /requests/:id/approve  # Approve request
├── PUT /requests/:id/reject   # Reject request
├── GET /audit               # Audit log entries
```

### Middleware Chain

```
Request → authenticate (JWT verify, DB role lookup)
        → authorize('ROLE') (role level check)
        → Controller
        → Response
```

The `authenticate` middleware:
1. Extracts the token from the `Authorization` header
2. Verifies the JWT signature
3. Looks up the user's current role from the database
4. Attaches user information to `req.user`

The `authorize` middleware:
1. Retrieves the user's current role name from the database
2. Compares it against the required minimum role using a numeric role level system
3. Returns 403 if the user lacks sufficient permissions

## Authentication Flow

```
User → Login Form → POST /api/auth/login
                        ↓
                Verify credentials (scrypt compare)
                        ↓
                Generate JWT (id, username, role_id, role_name)
                        ↓
                Return token → stored in localStorage
                        ↓
              Subsequent requests: Authorization: Bearer <token>
                        ↓
                authenticate middleware verifies JWT,
                looks up current role from DB,
                attaches user to req.user
```

## Authorization Flow

```
Request to admin endpoint → authenticate middleware
                                  ↓
                         authorize('MODERATOR') middleware
                                  ↓
                    Query DB: SELECT r.name FROM users u
                              JOIN roles r ON r.id = u.role_id
                              WHERE u.id = $1
                                  ↓
                    Compare against required level:
                    USER=1, MODERATOR=2, ADMIN=3, OWNER=4
                                  ↓
                    Sufficient? → next() or 403 Forbidden
```

## Data Flow

### Observation Creation

```
POST /api/observations
Body: { title, category, description, address, is_public }

  1. JWT authentication → extract user ID
  2. Geocode address via Nominatim → latitude, longitude
  3. Validate input fields
  4. INSERT into observations table
  5. Return created observation
```

### Request Moderation

```
PUT /api/admin/requests/:id/approve (Moderator+)

  1. JWT authentication + role authorization
  2. Verify request exists and is PENDING
  3. If EDIT type: apply proposed changes to observation
  4. If DELETE type: set observation is_public = false
  5. Update request status to APPROVED
  6. Log action to audit_log table
  7. Return success
```

## Database

The database is PostgreSQL with the following schema structure:

```
users ──── roles
  │           │
  │           └── (USER, MODERATOR, ADMIN, OWNER)
  │
  ├── observations (created_by → users.id)
  │     │
  │     └── observation_requests (observation_id → observations.id)
  │
  └── audit_log (performed_by → users.id)
```

A detailed schema description is provided in the Database Design chapter.
