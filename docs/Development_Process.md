# Development Process

## Workflow Overview

The development process followed an iterative, branch-based workflow rather than a linear waterfall model. Each major feature was developed in a dedicated feature branch through a sequence of phases, with each phase producing a working, testable increment.

```
Requirements Analysis
        │
        ▼
  Architecture Design
        │
        ▼
  Feature Branch (from main)
        │
        ▼
  Database Schema (migration)
        │
        ▼
  Backend Implementation (API + controllers)
        │
        ▼
  Frontend Implementation (pages + logic)
        │
        ▼
  Manual Testing
        │
        ▼
  Refactoring (if needed)
        │
        ▼
  Merge to main
```

This cycle was repeated for each of the nine MVPs that constituted the project.

## Development Timeline

The project was developed over approximately ten weeks, with each MVP building on the foundation of the previous one. The timeline below shows the order in which features were implemented.

```
Week  1 ██████████████  Project foundation & database connection
Week  2 ██████████████  User management & authentication
Week  3 ██████████████  Observation system
Week  4 ██████████████  Observation management & permissions
Week  5 ██████████████  Map visualization & location integration
Week  6 ██████████████  Map intelligence (filters, clustering, heatmap)
Week  7 ██████████████  Profile management & user preferences
Week  8 ██████████████████████████  Administration & moderation (part 1)
Week  9 ██████████████  Administration (part 2) & security review
Week 10 ██████████████  Final testing & documentation
```

| MVP | Feature Branch | Weeks | Key Deliverables |
|-----|---------------|-------|------------------|
| 1 | — | 1 | Project structure, Docker, Express setup |
| 2 | `feature/database-connection` | 1 | PostgreSQL connection, health endpoint |
| 3 | `feature/user-management` | 1 | Registration, login, JWT, roles |
| 4 | `feature/observations` | 1 | Observation CRUD, homepage |
| 5 | `feature/observation-management` | 1 | Ownership rules, modification requests |
| 6 | `feature/map-visualization` | 1 | Leaflet map, public observation markers |
| 7 | `feature/map-intelligence` | 1 | Filters, clustering, heatmap, sidebar, search |
| 8 | `feature/profile-management` | 1 | Profile editing, password, preferences, deletion |
| 9 | `feature/administration` | 2 | Dashboard, user/role management, moderation, audit |
| 10 | `feature/documentation` | 1 | Architecture documentation, README |

The timeline represents the primary development focus per week; it was not strictly sequential. Earlier features continued to be extended and refined while later ones were developed. For example, the audit logging subsystem was added during the administration phase and subsequently extended to record profile actions; the geocoding service, first introduced for observation creation, was later reused by the profile module to derive coordinates from a user's city. The security review in week 9 revisited earlier modules, hardening authorization on the status toggle and verifying that role changes take effect immediately. Documentation was drafted incrementally throughout the project and consolidated in the final documentation branch.

## Why This Workflow

### Iterative Development

Each feature was broken into small, independently deliverable phases. A typical feature branch consisted of five to eight phases, each building on the previous one. For example, the administration module was developed across six phases: role system, dashboard, user management, observation moderation, request handling, and audit logging. Each phase was tested before moving to the next, reducing integration risk.

This approach was chosen over a monolithic delivery because:

- **Early feedback**: Working increments were available after each phase, allowing course correction before the full feature was complete.
- **Reduced complexity**: Each phase had a narrow scope, making implementation and debugging more manageable.
- **Clear rollback points**: If a phase introduced a defect, only that phase needed to be reverted.

### Branch-Based Isolation

Every MVP was developed on its own feature branch:

```
feature/database-connection
feature/user-management
feature/observations
feature/observation-management
feature/map-visualization
feature/map-intelligence
feature/profile-management
feature/administration
feature/documentation
```

Branching provided several advantages:

- **Isolation**: Work-in-progress code never affected the stable `main` branch. Incomplete features could be committed without breaking the deployed application.
- **Parallel work**: Multiple features could be developed independently, though in practice the sequential nature of the project meant branches were used one at a time.
- **Clean history**: Each merge to `main` represented a complete, tested feature. The commit history on `main` serves as a high-level changelog.

### Database-First Order

Within each feature branch, the implementation order was consistent:

1. Database schema (tables, columns, constraints)
2. Backend (controllers, routes, middleware)
3. Frontend (pages, JavaScript logic, styling)

This order ensured that the data layer was defined and tested before any code depended on it. The backend API was functional before the frontend was built, which meant the frontend could be tested against a real API from the start rather than against mock data.

## Phase Structure

Each phase within a feature branch followed a consistent pattern:

| Step | Activity | Deliverable |
|------|----------|-------------|
| 1 | Database migration | New table or column definition |
| 2 | Controller implementation | Business logic functions |
| 3 | Route registration | HTTP endpoint with middleware |
| 4 | Manual API testing | Verified endpoint via curl or REST client |
| 5 | Frontend implementation | HTML page and JavaScript logic |
| 6 | Integration testing | End-to-end verification through the browser |
| 7 | Commit | Working state with descriptive message |

## Development Challenges

### JWT Authentication and Role Synchronization

The authentication system issues JSON Web Tokens that encode the user's ID, username, and role at the time of login. The token role becomes stale when an administrator changes a user's role, since the token remains valid until it expires. This was solved by treating the token as an identity credential only: the `authenticate` middleware verifies the token, extracts the user ID, and re-fetches the current role name from the database on every request (`getUserRoleName` in `src/middleware/auth.js`). All authorization decisions therefore read the database role rather than the token claim, so a role change takes effect immediately without requiring the user to log out and back in.

### Role-Based Authorization

The application defines four roles — `USER`, `MODERATOR`, `ADMIN`, and `OWNER` — ordered by a numeric level system (`ROLE_LEVELS`: `USER` = 1, `MODERATOR` = 2, `ADMIN` = 3, `OWNER` = 4). A single `authorize(minRoleName)` middleware compares the requester's database role level against the required minimum and returns `403 Forbidden` when insufficient. Each protected route composes `authenticate` and `authorize`, keeping authorization to a single line per route. Additional rules are enforced at the controller level: the `OWNER` role cannot be changed or deactivated, a user cannot modify their own role, and only `OWNER` can promote a user to `ADMIN`. The same level table is mirrored on the frontend in `public/js/app.js` to conditionally show the administration link to moderators and above.

### Geocoding Integration with Nominatim

Observation creation accepts a free-text address and derives coordinates from it using the OpenStreetMap Nominatim service. The geocoding logic is isolated in a dedicated service module (`src/services/geocoding.js`) that performs a forward-geocoding request to `https://nominatim.openstreetmap.org/search` using Node's built-in `https` module, setting a descriptive `User-Agent` header (`NeighborhoodSurveillance/1.0`) as required by Nominatim's usage policy. Because the external call is confined to this module, error handling is centralized: network failures, malformed responses, and empty results are all converted into a consistent `{ error }` result that the calling controller turns into a `400` response. The same service is reused by the profile module to derive coordinates from a user's stated city.

### Audit Logging

The administration module records security-relevant actions — role promotions and demotions, account activation and deactivation, and request approvals and rejections — in an `audit_log` table. The challenge was recording these entries without duplicating insert logic across controllers. The solution was a shared `logAction({ action, entityType, entityId, performedBy, details })` function in `src/controllers/audit.js` that serializes optional details to JSON and inserts a row. It is invoked at the point of action within the admin and profile controllers. The audit endpoint is scoped by role: moderators and above can read observation-related actions, while administration actions are restricted to `ADMIN` and `OWNER`. The endpoint supports filtering by action type, entity type, and performing user, together with pagination.

### Frontend/Backend Integration

The frontend consists of ten static HTML pages that communicate with the backend exclusively through the REST API, without a frontend framework. Authentication state is managed by four shared helper functions in `public/js/app.js` — `getToken`, `getUser`, `isLoggedIn`, and `logout` — which read and write the JWT and user object in `localStorage`. Every page attaches the token to its fetch calls via an `Authorization: Bearer` header and guards the page by redirecting unauthenticated visitors to the login page. Loading states, empty states, and error feedback elements are rendered per page. This separation keeps the API as the single source of truth: the frontend never duplicates business logic, and pages that are not signed in have no access to protected data.

## Commit Strategy

Commits were made after every working phase, not after every file change. Each commit represented a state where the application could be built and run without errors. Commit messages followed the Conventional Commits format:

```
feat: implement audit logging
fix: restrict status toggle to ADMIN and verify role against database
docs: add system architecture documentation
refactor: remove collapsible profile sections, always visible
```

This convention was chosen because it produces a readable changelog and makes it easy to identify the purpose of each commit.

## Testing Approach

Testing was performed manually throughout the development process. Because no automated test framework was used, verification relied on structured HTTP-level test scripts and browser-based checks, executed after every phase and consolidated into an integration pass at the end of each feature branch.

**API testing.** Endpoints were tested immediately after implementation using PowerShell scripts built on `Invoke-RestMethod`. Each test asserted the HTTP status code, the presence and shape of the response body, and the correct error payload. The covered endpoints included the authentication routes (`POST /api/auth/register`, `POST /api/auth/login`), the observation routes (`GET`/`POST`/`PUT`/`DELETE` on `/api/observations`, `GET /api/observations/public`, modification requests via `GET`/`POST` on `/api/observations/:id/requests`), the profile routes (`GET`/`PUT` on `/api/profile`, `/api/profile/password`, `/api/profile/preferences`, `DELETE /api/profile`), and the administration routes (`GET /api/admin/dashboard`, `/users`, `/observations`, `/requests`, `/audit`, and the `PUT` actions for role, status, and request moderation).

For each endpoint, four scenario categories were verified:

- **Success**: a valid request returns `200` or `201` with the expected resource, and mutations are confirmed against the database.
- **Validation**: malformed input returns `400`, e.g. missing `username`/`password`/`email` at registration, invalid `role_name` or status `action` values in the admin routes, and empty required fields such as category, title, or address for observations.
- **Authentication**: requests without a token, with a malformed token, or with an expired token return `401` with `Authentication required.` or `Invalid or expired token.`.
- **Authorization**: authenticated requests from an insufficient role return `403` with `Insufficient permissions.` or `Admin access required.`

**Permission testing.** Because authorization is role-dependent, every role-guarded endpoint was tested with tokens issued to each of the four roles (`USER`, `MODERATOR`, `ADMIN`, `OWNER`), verifying both that the required minimum role succeeds and that every lower role is rejected. The administration module, for example, was validated against a full permission matrix: unauthenticated requests, every role level against every endpoint, and the controller-level rules such as the inability to modify or deactivate the `OWNER` account and the restriction that only `OWNER` may promote to `ADMIN`. Stale-token behavior was also covered: a token captured before a role change was retried after the change to confirm that the database role governs the outcome.

**Frontend testing.** Pages were loaded in the browser after each phase to verify rendering, form submission, and navigation. Checks covered the visibility of role-dependent UI elements (the administration link only for moderators and above), correct display of the observation table with its filters, the map marker rendering from the API response, and the feedback messages shown for validation errors. The logout flow and the redirect of unauthenticated visitors to the login page were verified on each page.

**Integration testing.** At the end of each feature branch, a comprehensive test script exercised the endpoints in the order a real user would: registering, logging in, creating an observation, requesting a modification, moderating that request, and reading the resulting audit trail. The administration module's integration suite comprised 28 assertions spanning unauthenticated access, role-based access control across all four roles, validation edge cases, and stale-token rejection. All assertions were checked by hand against the actual API responses before the branch was merged.

## Refactoring

Refactoring was performed as part of the development process rather than as a separate phase. Common refactoring activities included:

- Consolidating duplicate code into shared utilities (e.g., the audit logging function is used by both the admin and profile controllers)
- Simplifying conditional logic in authorization checks
- Removing dead code identified during testing
- Renaming variables and functions for clarity

Refactoring was done immediately when an issue was identified, rather than deferred to a later cleanup phase. This kept the codebase consistent throughout development.

## Tools

| Tool | Purpose |
|------|---------|
| Git | Version control with feature branches |
| Docker Compose | Local development environment |
| Visual Studio Code | Primary editor |
| PowerShell | API testing scripts |
| pgAdmin / psql | Database inspection |
| OpenCode (CLI) | AI-assisted code generation and review |

## AI-Assisted Development

Development was supported by OpenCode, a command-line AI coding assistant. The tool was used as an aid during implementation, with the developer retaining responsibility for all design decisions and for the final state of the code. Its contributions fell into four categories.

**Code generation.** OpenCode produced initial versions of repetitive structural code: database migration statements, controller and route scaffolding, HTML pages, and frontend JavaScript. Typical inputs were natural-language descriptions of an endpoint's intended behavior or a page's required elements. The generated code served as a starting point and was routinely adapted to match the existing conventions of the codebase.

**Code review.** After a feature was implemented, the tool was asked to examine the code for defects, missing error handling, and inconsistencies. Several concrete improvements resulted from this review, including the adoption of consistent HTTP status codes and a uniform error response format across controllers.

**Refactoring.** When repeated patterns were identified, the tool suggested consolidations. The shared `logAction` audit function, the `authorize` middleware, and the `getToken`/`getUser` frontend helpers are examples of utilities whose introduction was prompted by such analysis. Refactoring was always performed by the developer, who evaluated whether the suggested change was appropriate.

**Documentation.** The architecture documentation and the present report were drafted with the tool's assistance, based on information and code the developer supplied. The resulting documents were then reviewed and corrected against the actual implementation.

The division of responsibility was explicit. The AI did not operate autonomously: no AI-generated code, test, or documentation was committed without first being reviewed, executed, and corrected by the developer. The AI did not make architectural decisions, choose libraries, or define the API — these remained the developer's responsibility throughout. This arrangement ensured that the tool accelerated routine work while all functional and technical decisions, and their verification, stayed under human control.
