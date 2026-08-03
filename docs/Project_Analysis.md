# Project Analysis

## Functional Requirements

The following functional requirements describe the expected behaviour of the application from the perspective of its users and administrators.

### Authentication & User Management

| ID | Requirement |
|----|-------------|
| F1 | Users must be able to register with a username, email, and password. |
| F2 | Users must be able to log in and receive a JWT. |
| F3 | Authenticated users must be able to view and edit their profile (username, email, password). |
| F4 | Users must be able to delete their account (soft delete). |
| F5 | Admins must be able to view, search, and filter all users. |
| F6 | Admins must be able to activate and deactivate user accounts. |
| F7 | Admins must be able to change user roles within permitted boundaries. |

### Observations

| ID | Requirement |
|----|-------------|
| F8 | Authenticated users must be able to create observations with a title, category, description, address, and visibility. |
| F9 | Users must be able to update and delete their own private observations. |
| F10 | Public observations must be visible to all users on the map and in listings. |
| F11 | Private observations must only be visible to the creator. |
| F12 | Observations must be geocoded (address to coordinates) during creation. |

### Map & Discovery

| ID | Requirement |
|----|-------------|
| F13 | Public observations must be displayed on a Leaflet map with OpenStreetMap tiles. |
| F14 | The map must support markers, clustering, and heatmap visualization modes. |
| F15 | Users must be able to filter observations by category and date range. |
| F16 | Users must be able to search for locations on the map using Nominatim. |
| F17 | A sidebar must list public observations and synchronize with the map. |

### Moderation

| ID | Requirement |
|----|-------------|
| F18 | Users must be able to submit edit or removal requests on public observations. |
| F19 | Moderators must be able to review pending requests. |
| F20 | Moderators must be able to approve or reject requests. |
| F21 | Approved edit requests must automatically update the observation. |
| F22 | Approved removal requests must archive the observation (set to private). |

### Administration

| ID | Requirement |
|----|-------------|
| F23 | The admin dashboard must display platform statistics. |
| F24 | All moderation actions must be recorded in an audit log. |
| F25 | Moderators must be able to view the observation audit log. |
| F26 | Admins must be able to view the full administration audit log. |
| F27 | Audit logs must be filterable by action and user. |

## Non-Functional Requirements

| ID | Requirement |
|----|-------------|
| NF1 | Passwords must be hashed using a salt-based algorithm (scrypt with 64-byte key length). |
| NF2 | All database queries must use parameterized statements to prevent SQL injection. |
| NF3 | API endpoints must be protected by JWT authentication and role-based authorization. |
| NF4 | The application must run in Docker containers for consistent deployment. |
| NF5 | The frontend must be responsive and functional on both desktop and mobile. |
| NF6 | Soft-deleted users and archived observations must retain referential integrity. |
| NF7 | Audit logs must be immutable — once written, entries cannot be modified. |

## Design Goals

### Scalability

The architecture separates frontend, backend, and database responsibilities, making future scaling and deployment easier.

The stateless JWT authentication model ensures that any API instance can handle any request without session affinity.

### Maintainability

The backend follows the MVC pattern, separating business logic (controllers) from routing and data access. Each feature has a clear boundary:

- **Controllers** contain request handling and validation
- **Routes** define URL structure and middleware chains
- **Database module** centralizes connection configuration
- **Middleware** encapsulates cross-cutting concerns (auth, authorization)

The frontend uses a feature-based directory structure where related pages, logic, and styles are co-located. This avoids the common problem of navigating through separate directories for related functionality.

### Security Goals

Security follows a defense-in-depth approach:

1. **Authentication layer**: JWT with 24-hour expiry, verified on every request
2. **Authorization layer**: Role-based middleware that queries the database for the current role (not trusting JWT claims alone)
3. **Input layer**: All user input is parameterized, validated for allowed values, and sanitized
4. **Persistence layer**: Passwords are securely hashed using a modern key derivation.
5. **Application layer**: Self-modification prevented, OWNER account protected, privilege escalation blocked

### Architectural Decisions

| Decision | Rationale |
|----------|-----------|
| **Vanilla JavaScript frontend** | Avoids framework lock-in for a relatively simple CRUD application; reduces bundle size and build complexity. |
| **PostgreSQL** | Provides JSONB support for audit log details, UUID primary keys, and robust indexing. |
| **Leaflet + OpenStreetMap** | Free, open-source mapping stack with no API key requirements. |
| **Feature branches with phases** | Enables iterative development with clear checkpoints and rollback points. |
| **Docker Compose** | Single-command environment setup ensures consistency between development and deployment. |
| **Soft deletes** | Preserves referential integrity and audit history; allows account recovery. |

## Requirements Traceability

| Requirement | Implemented In |
|-------------|----------------|
| F1 — User registration | Authentication Module |
| F2 — JWT login | Authentication Module |
| F3 — Profile management | Profile Module |
| F4 — Account deletion (soft) | Profile Module |
| F5 — Admin user overview | Administration Module |
| F6 — User activation/deactivation | Administration Module |
| F7 — Role changes | Administration Module |
| F8 — Create observation | Observation Module |
| F9 — Update/delete private observations | Observation Module |
| F10 — Public observation visibility | Observation Module |
| F11 — Private observation protection | Observation Module |
| F12 — Geocoding during creation | Observation Module |
| F13 — Map with public observations | Map Module |
| F14 — Markers, clusters, heatmap | Map Module |
| F15 — Category and date filters | Filter Module |
| F16 — Location search (Nominatim) | Map Module |
| F17 — Sidebar with observation list | Map Module |
| F18 — Edit and removal requests | Moderation Module |
| F19 — Request review | Moderation Module |
| F20 — Approve/reject requests | Moderation Module |
| F21 — Auto-apply approved edits | Moderation Module |
| F22 — Archive on removal approval | Moderation Module |
| F23 — Dashboard statistics | Administration Module |
| F24 — Audit logging | Audit Module |
| F25 — Observation audit log (Moderator+) | Audit Module |
| F26 — Administration audit log (Admin+) | Audit Module |
| F27 — Audit log filtering | Audit Module |

