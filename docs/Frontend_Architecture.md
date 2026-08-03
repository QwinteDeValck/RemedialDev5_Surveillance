# Frontend Architecture

## Overview

The frontend is built with vanilla JavaScript, HTML5, and CSS3 — no frameworks, build tools, or package managers. This decision was made intentionally: the application is a content-oriented CRUD system with moderate interactivity, and a framework would introduce unnecessary complexity and build overhead. The frontend communicates with the backend exclusively through REST API calls using the native `fetch` API. Authentication state is managed using a JWT stored in `localStorage`.

## Frontend Request Flow

When a user interacts with the frontend, each action follows the same request flow:

```
User Action (click, form submit)
        │
        ▼
Event Listener (DOM event handler)
        │
        ▼
API Call (fetch with JWT header)
        │
        ▼
Server Response (JSON)
        │
        ▼
DOM Update (innerHTML or element manipulation)
        │
        ▼
User sees result
```

Authentication-protected actions include the JWT in the request header. Unauthorized responses (401) trigger a redirect to the login page. Error responses (400, 403, 404) display inline messages or modal dialogs depending on the context. Network errors display a generic connection failure message. This flow is consistent across all pages and actions.

## API Communication

All API requests use the native `fetch` API without an abstraction layer or HTTP client library. The JWT token is attached to every authenticated request through the `Authorization: Bearer <token>` header. Error handling is performed inline within each page's script: non-OK responses display user-facing error messages, and network failures fall back to generic connection error alerts. This approach was chosen over a centralized HTTP client because each page handles errors differently — inline messages, modal dialogs, or redirects — making a unified handler impractical without introducing excessive conditionals.

## Feature-Based Organization

Each feature of the application has its own JavaScript file. This keeps related logic co-located and avoids large, monolithic files.

```
public/js/
├── app.js                   # Shared: auth helpers, navigation, role constants
├── login.js                 # Login form
├── register.js              # Registration form
├── profile.js               # Profile management
├── observations.js          # Observation list
├── observations-list.js     # Reusable observation list component
├── observations-detail.js   # Observation detail page
├── observations-edit.js     # Observation edit page
├── map.js                   # Map visualization
├── filters.js               # Category and date filter logic
└── admin.js                 # Administration dashboard
```

## Shared Module — app.js

The `app.js` file is loaded on every page and provides three categories of shared functionality:

- **Authentication helpers**: Functions to retrieve the JWT token and user object from `localStorage`, check login status, and log out.
- **Role constants**: A numeric mapping for the four role levels (USER=1, MODERATOR=2, ADMIN=3, OWNER=4), used throughout the frontend to conditionally render UI elements.
- **Navigation bar**: Dynamically rendered based on authentication state and role level. Authenticated users see links to Home, Observations, and Map. The Administration link is shown only when the user's role level is MODERATOR or higher. The user avatar and dropdown menu provide access to Profile and Logout. The dropdown uses a click-outside-to-close pattern to avoid a dependency on a third-party dropdown library.

## Page Structure

All HTML pages share a common layout consisting of a navigation bar (rendered dynamically by `app.js`), a main content container, and a footer. JavaScript files are loaded per-page: `app.js` is included on every page, while feature-specific scripts are loaded only on their respective pages. This reduces unnecessary script execution and keeps page load times minimal. The main content area is entirely static HTML; dynamic content is fetched from the API and inserted into the DOM using `innerHTML`.

### Page Overview

| Route | HTML Template | Primary Script | Purpose |
|-------|--------------|----------------|---------|
| `/` | `index.html` | — | Homepage with welcome message and recent observations |
| `/auth/login.html` | `login.html` | `login.js` | Email and password authentication |
| `/auth/register.html` | `register.html` | `register.js` | New user registration |
| `/observations/` | `observations.html` | `observations.js`, `observations-list.js`, `filters.js` | Observation listing with search and filters |
| `/observation/detail.html` | `detail.html` | `observations-detail.js` | Single observation view with moderation actions |
| `/observation/edit.html` | `edit.html` | `observations-edit.js` | Private observation editing |
| `/map/` | `map.html` | `map.js`, `filters.js` | Full-page map with three visualization modes |
| `/profile/` | `profile.html` | `profile.js` | User profile, preferences, and account management |
| `/admin/` | `admin/index.html` | `admin.js` | Role-based administration dashboard |

### Navigation Flow

```
                    ┌────────────────────────────────────────────┐
                    │            Navigation Bar                  │
                    │  Home │  Observations  │  Map  │  [Avatar] │
                    └───────┴────────────────┴───────┴───────────┘
                            │                        │
        ┌───────────────────┤              ┌─────────┘
        │                   │              │
        ▼                   ▼              ▼
  ┌──────────┐    ┌──────────────┐    ┌──────────┐
  │  Login   │    │ Observations │    │  Profile │
  │ Register │    │  ├── List    │    │  (avatar)│
  │          │    │  ├── Detail  │    │  Logout  │
  └──────────┘    │  └── Edit    │    └──────────┘
                  └──────┬───────┘
                         │
                     ┌───┴───┐
                     │  Map  │
                     │       │
                     └───────┘

  [Administration] — shown only for MODERATOR+

                  ┌──────────────────┐
                  │  Admin Dashboard │
                  │  ├── Users       │
                  │  ├── Obs         │
                  │  ├── Requests    │
                  │  └── Audit       │
                  └──────────────────┘
```

## Reusable Components

### Avatar

A utility function generates a colored circular avatar from a username. The color is deterministically derived from the first character's ASCII code, ensuring the same user always receives the same colour across all pages.

### Badges

Status indicators use a consistent set of CSS classes (e.g., `badge-active`, `badge-pending`, `badge-rejected`) across observations, requests, and audit logs. This ensures visual uniformity without duplicating styling rules.

### Review Modal

The administration interface includes a modal dialog for reviewing observation edit requests. It presents a side-by-side comparison of original and proposed values using a table with diff highlighting — changed rows are marked with red (removed) and green (added) backgrounds.

## Leaflet Integration

The map feature is implemented using Leaflet with OpenStreetMap tiles. The map is initialized with a configurable default location and zoom level.

### Visualization Modes

The map supports three modes, implemented as separate Leaflet layers that are toggled by the user:

| Mode | Implementation | Use Case |
|------|---------------|----------|
| Markers | Standard `L.marker` with popups | Default view, shows exact observation locations |
| Clusters | `L.markerClusterGroup` | Dense areas, groups nearby markers with a count |
| Heatmap | `L.heatLayer` | Spatial density visualization |

Only one layer is active at a time. Switching modes removes the current layer and adds the new one. The visualization mode is selected by the user through the interface, while the underlying observation dataset remains identical. Only the rendering layer changes.

### Sidebar Synchronization

The sidebar shares the same filtered dataset as the map. Clicking an observation in the sidebar zooms the map to its location and opens the popup; clicking a marker on the map highlights the corresponding entry in the sidebar. This bidirectional synchronization ensures consistency between the list and map views.

### Location Search

A search input uses the Nominatim API to convert free-form address text into map coordinates. The map then flies to the resulting location. This feature allows users to navigate the map without manual panning and zooming.

## State Management

The frontend does not use a state management library. State is managed through three mechanisms:

- **localStorage**: Persists the JWT token, serialised user object, and map preferences across sessions.
- **DOM state**: Form values are read directly from input elements at submission time.
- **JavaScript variables**: Filter selections, pagination offsets, and UI mode flags are stored in local variables within each page's script.

Three factors justify this approach: the application lacks complex interdependent state (no multi-step wizards or real-time updates); each page is independent and does not require state to persist across navigations beyond authentication; and introducing a state management library would add complexity without measurable benefit.

## Styling Approach

All styles are defined in a single `style.css` file. Class names follow a descriptive convention (e.g., `badge-active`, `nav-dropdown-menu`) without a formal naming methodology such as BEM, as the project scope does not warrant the overhead. The layout uses CSS Flexbox throughout, avoiding floats and legacy layout techniques. Colours, spacing, and typography are applied directly via class-specific properties rather than CSS custom properties, as the design system is small and does not benefit from the additional layer of indirection. This approach keeps the stylesheet straightforward while maintaining consistency across all pages.

## Responsive Design

The interface uses CSS Flexbox for layout adaptation across viewport sizes:

- The navigation bar collapses links behind the avatar dropdown on narrow screens
- Administration dashboard tables become horizontally scrollable on mobile
- The map sidebar renders as a toggleable overlay, preserving map visibility on small screens
- Form inputs and buttons use relative units (`rem`) for proportional scaling

## Key UI Decisions

- **Badge system**: Status indicators use consistent CSS classes across observations, requests, and audit logs, ensuring visual uniformity without duplication.
- **Overlay sidebar on map**: The sidebar is rendered as an overlay rather than a split layout, preserving the map viewport on mobile devices.
- **Click-outside dropdown**: The navigation dropdown closes when the user clicks outside it, avoiding a dedicated dropdown library dependency.
