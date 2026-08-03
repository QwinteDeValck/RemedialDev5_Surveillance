# Testing

## Testing Strategy

The application was tested manually throughout development. No automated test framework was used; instead, verification relied on structured HTTP-level test scripts combined with browser-based checks. Each feature phase was tested before it was considered complete, and an integration pass was performed at the end of every feature branch.

The strategy was layered and consistent:

1. **API tests** verified every endpoint at the HTTP level, covering success, validation, authentication, and authorization scenarios.
2. **Security tests** verified the JWT lifecycle, role enforcement, and privilege-escalation resistance.
3. **Frontend tests** verified rendering, form submission, navigation, and role-dependent UI in the browser.
4. **Integration tests** exercised complete user flows across multiple endpoints.

This section describes each layer and the specific scenarios that were checked.

## Manual API Testing

Endpoints were tested immediately after implementation using PowerShell scripts built on `Invoke-RestMethod`. A typical script logged in a test user, captured the JSON Web Token from the response, and used it to call the endpoint under test while asserting the HTTP status code and the structure of the response body.

The following endpoint groups were covered:

| Group | Endpoints |
|-------|-----------|
| Authentication | `POST /api/auth/register`, `POST /api/auth/login` |
| Observations | `GET /api/observations/public`, `GET /api/observations`, `GET /api/observations/:id`, `POST /api/observations`, `PUT /api/observations/:id`, `DELETE /api/observations/:id` |
| Modification requests | `GET /api/observations/:id/requests`, `POST /api/observations/:id/request` |
| Profile | `GET /api/profile`, `PUT /api/profile`, `PUT /api/profile/password`, `GET /api/profile/preferences`, `PUT /api/profile/preferences`, `DELETE /api/profile` |
| Administration | `GET /api/admin/dashboard`, `GET /api/admin/users`, `PUT /api/admin/users/:id/role`, `PUT /api/admin/users/:id/status`, `GET /api/admin/observations`, `GET /api/admin/requests`, `PUT /api/admin/requests/:id/approve`, `PUT /api/admin/requests/:id/reject`, `GET /api/admin/audit` |

For each endpoint, four scenario categories were verified:

- **Success**: a valid request returned the expected status code (`200` or `201`) and the correct resource. For mutating requests, the change was confirmed directly against the database.
- **Validation**: malformed or missing input returned `400`. Examples include empty `title`, `category`, or `address` when creating an observation; a non-boolean `is_public` value; an invalid `role_name` or status `action` in the administration routes; and empty required fields in the registration and login forms.
- **Authentication**: requests without a token, with a malformed token, or with an expired token returned `401`.
- **Authorization**: requests from an authenticated user whose role is below the required minimum returned `403`.

## JWT Testing

The JSON Web Token is the basis of all authenticated requests, so its behavior was tested explicitly.

- **Login flow**: a registered user receives a token and a user object containing the ID, username, and role. The token was decoded to verify its claims and expiry (24 hours).
- **Missing token**: requests without an `Authorization` header returned `401 Authentication required.`
- **Malformed token**: a token that was altered or not a valid JWT returned `401 Invalid or expired token.`
- **Expired token**: a token signed with a short expiry was generated for testing and rejected with `401` after its expiry.
- **Stale token**: the critical role-synchronization case. A user logged in as `USER` was promoted to `MODERATOR` by an administrator; the original token was then reused and verified to be authorized for moderator endpoints immediately. This confirmed that authorization reads the database role rather than the token claim, as described in the security chapter.

## Permission Testing

Because every administration endpoint is role-guarded, permission testing verified the exact role matrix. Tokens were issued for each of the four roles — `USER`, `MODERATOR`, `ADMIN`, and `OWNER` — and every guarded endpoint was called with each token.

| Endpoint | Minimum role | Verified result |
|----------|-------------|-----------------|
| `GET /api/admin/dashboard` | `MODERATOR` | `403` for `USER`, `200` for `MODERATOR`+ |
| `GET /api/admin/users` | `MODERATOR` | `403` for `USER`, `200` for `MODERATOR`+ |
| `PUT /api/admin/users/:id/role` | `ADMIN` | `403` for `USER`/`MODERATOR`, `200` for `ADMIN`+ |
| `PUT /api/admin/users/:id/status` | `ADMIN` | `403` for `USER`/`MODERATOR`, `200` for `ADMIN`+ |
| `GET /api/admin/audit` (administration scope) | `ADMIN` | `403` for `MODERATOR`, `200` for `ADMIN`/`OWNER` |

This matrix confirmed that the `authorize` middleware rejects every role below the minimum and accepts every role at or above it.

## Role Testing

Beyond the middleware checks, controller-level role rules were tested:

- **OWNER protection**: attempts to change or deactivate the `OWNER` account were rejected with `403`.
- **Self-modification**: a user attempting to change their own role was rejected with `403`.
- **Promotion restrictions**: only `OWNER` could promote a user to `ADMIN`; an `ADMIN` attempting to grant `ADMIN` or `OWNER` was rejected.
- **Ownership rules for observations**: an observation created as private was visible, editable, and deletable only by its author; another user received `403`, and a public observation could not be edited or deleted at all.
- **Modification request approval**: the approval and rejection routes returned `404` for nonexistent requests and validated that the moderator approving a request has the required role.

## Frontend Testing

Frontend pages were loaded in the browser after each phase and checked for rendering, behavior, and navigation.

- **Authentication gates**: pages requiring authentication redirected unauthenticated visitors to the login page.
- **Navigation**: the navbar rendered the correct links per role. The administration link appeared only for `MODERATOR` and above, as determined by the role-level comparison in `public/js/app.js`.
- **Forms**: the registration, login, observation creation, and observation editing forms were submitted with valid and invalid input to verify server-side error messages were displayed in the feedback elements.
- **Data display**: the observation table, the profile page, and the administration panels were verified to render the data returned by the API, including empty states when no data was available.
- **Logout**: the logout flow cleared the stored token and user object and returned to the login page.

## Map Testing

The map is the most complex frontend component and received dedicated testing in the browser.

- **Marker rendering**: public observations from `GET /api/observations/public` appeared as markers at the correct coordinates.
- **Display modes**: switching between the clusters, individual markers, and heatmap modes re-rendered the map correctly.
- **Filters**: category and date filters reduced the markers and sidebar list to the matching observations; a filter matching nothing showed the "no observations" overlay.
- **Sidebar**: the sidebar list displayed titles, categories, and dates, and clicking an item moved the map to the corresponding marker.
- **Search**: searching for a location called the Nominatim API and placed a marker; an unknown location showed an error message.
- **Error states**: the map displayed appropriate messages when the Leaflet library failed to load, when observations could not be fetched, and when the user was not logged in.
- **Preferences**: the map centered on the user's preferred location when profile preferences contained coordinates.

## Security Testing

Security-specific scenarios were tested beyond the functional checks:

- **SQL injection**: inputs containing SQL fragments were submitted to endpoints and confirmed to have no effect beyond parameterized query behavior; the application uses parameterized queries exclusively, so injection attempts are neutralized at the database access layer.
- **Privilege escalation**: a `USER` token was used to call administration routes and confirmed to be rejected. The numeric role-level comparison in the `authorize` middleware and the controller-level OWNER restrictions prevent a user from acting above their role.
- **Unauthorized data access**: a user attempting to view, edit, or delete another user's private observation received `403`.
- **Validation bypass**: payloads that omitted required fields or supplied invalid types were rejected with `400` before any database operation.

## Limitations

Testing was manual and therefore not exhaustive in a statistical sense. The scenarios covered the main success and failure paths of every endpoint, but no automated regression suite was maintained. Changes made late in development were re-tested manually against the affected areas. A dedicated automated test suite is listed among the future improvements to this project.

Overall, the manual testing process demonstrated that the application satisfies the functional and security requirements defined for the project. All major user workflows, role-based authorization rules, and frontend interactions were verified before the final release.