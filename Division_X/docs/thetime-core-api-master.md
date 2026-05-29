## TheTime + core-api — Master Technical Documentation (Combined)

This document is a **combined, long-form technical reference** for:

- **`thetime`** (frontend Next.js application)
- **`core-api`** (backend Fastify service)
- **Shared packages** (`@divisionx/api-client`, `@divisionx/contracts`)
- **End-to-end workflows and data flow** across UI → API → Database → real-time notifications

It is intended to be used as:

- A single onboarding guide for engineers
- A reference for product/feature behavior
- A map for debugging production/local issues
- A baseline for future extensions (new modules, endpoints, org-level features, observability)

For “what remains / drift risks / under-documented areas”, see:

- `docs/thetime-core-api-remaining-gaps.md`

---

## 1) Repository context (monorepo)

This lives inside the `Division_X` workspace, using PNPM workspaces + Turbo.

Key locations:

- **Frontend app**: `Division_X/apps/thetime`
- **Backend service**: `Division_X/services/core-api`
- **Shared API wrapper**: `Division_X/packages/api-client`
- **Shared type contracts**: `Division_X/packages/contracts`
- **Cross-cutting docs**: `Division_X/docs/*`

---

## 2) Product overview (what we built)

### TheTime (what the user experiences)

TheTime is a premium time tracking and work management web app that supports:

- **Time tracking**: start/stop/resume tracking with descriptions and optional catalog associations
- **Timesheets**: list, filter, edit, delete entries (role dependent)
- **Approvals**: managers can approve entries individually or in bulk
- **Projects/Tasks/Tags/Clients**: structured catalog management to organize work
- **Teams**: grouping members and binding teams to projects to control visibility
- **Break + Pomodoro**: focus/break cycles and break sessions with notifications
- **Activity monitoring**:
  - live client-side input activity signals (keystrokes, pointer travel, clicks)
  - idle detection + policy-driven auto-pause behavior
  - timeline reconstruction (ACTIVE/BREAK/IDLE/OFFLINE)
- **Attendance**: clock-in and “today” state
- **Audit logs**: operational/compliance trace of important actions
- **Enterprise organizations**: multi-workspace parent org + compliance aggregation

### core-api (what enables the product)

`core-api` is the authoritative system of record for:

- Identity & sessions
- Tenant boundaries (workspace)
- Role + permissions enforcement
- Storage and retrieval of time entries, break sessions, and policies
- Reporting aggregation and exports
- Compliance primitives (audit logs, org-level aggregations)
- Real-time notifications for admins/owners via WebSocket

---

## 3) System architecture (components and responsibilities)

### 3.1 Frontend: `apps/thetime`

**Framework**: Next.js 14 (App Router) + React 18.

Responsibilities:

- Render UI routes (dashboard, tracker, timesheet, reports, workspace admin views)
- Maintain user session client-side (localStorage)
- Call backend through `@divisionx/api-client`
- Handle UX states (loading, toast notifications, empty states)
- Run client-side activity monitoring while tracking is active
- Trigger browser notifications (idle, long-running timers, pomodoro boundaries)

### 3.2 Shared API client: `packages/api-client`

`@divisionx/api-client` is the only network boundary the UI uses. It provides:

- A base `fetch` wrapper to call `core-api`
- Automatic **token refresh** on 401
- Local storage persistence helpers (`persistAuth`, `clearAuth`)
- Typed request/response usage where contracts exist

Base URL configuration:

- **`NEXT_PUBLIC_CORE_API_URL`** (defaults to `http://localhost:5000`)

Authentication strategy:

- Uses **Bearer access tokens** from `localStorage["thetime_token"]`
- Refreshes token using `localStorage["thetime_refresh_token"]`

#### Contract coverage and auth token naming consistency

Type contracts live under `packages/contracts`, but contract coverage is smaller than the total `api-client` surface, so drift is possible.

Make sure auth token field naming is consistent across:

- backend responses (`services/core-api`)
- frontend expectations (`packages/api-client`)
- contract types (`packages/contracts`)

If you encounter `accessToken` in contracts but `token` in runtime payloads, align them (treat it as a correctness issue, not just “docs”).

### 3.3 Backend: `services/core-api`

**Framework**: Fastify 4 + a module adapter layer.

Key design choice: `core-api` uses a **routing adapter**:

- Fastify receives requests
- A `preHandler` hook authenticates and assigns `req.ctx`
- A universal adapter converts the incoming call into a standard Web `Request`
- A module handler returns `Response | null`
- If `null`, adapter falls through and returns 404

This creates a clean separation:

- Fastify handles IO (HTTP, WebSocket, compression, rate-limit)
- Modules implement business behavior in portable, testable functions

### 3.4 Database layer (Postgres + Prisma)

The database is PostgreSQL accessed through Prisma.

- Prisma schema: `services/core-api/prisma/schema.prisma`
- Models encode:
  - tenant separation (`Workspace`)
  - membership and roles (`WorkspaceMember`, `Role`)
  - work catalog (`Project`, `Task`, `Client`, `Tag`, `Team`)
  - tracking (`TimeEntry`, `RunningTimer`, `BreakSession`)
  - compliance (`AuditLog`, `AttendanceLog`)
  - enterprise (`Organization`, `OrganizationMember`)

The API enforces that nearly every query is scoped by `workspaceId` from `req.ctx`, ensuring multi-tenant data isolation.

#### 3.4.1 Soft deletes (non-obvious but important)

Some catalog-like models are **soft-deleted** (via `deletedAt`) rather than physically removed. This behavior is implemented in:

- `services/core-api/src/core/prisma.ts`

Operational implications:

- a “delete” can behave like an update that sets `deletedAt`
- reads can implicitly filter out soft-deleted rows (`deletedAt: null`)

#### 3.4.2 WorkspacePolicy caching (in-memory, per process)

Workspace policy reads are cached in-memory (per running server instance) and invalidated on writes. This is also implemented in:

- `services/core-api/src/core/prisma.ts`

---

## 4) TheTime frontend (routes, features, and client-side flows)

### 4.1 Route map (Next.js App Router)

Routes are implemented as pages under `apps/thetime/src/app`.

#### Public routes

- **`/auth/login`**: login UI; stores session data client-side
- **`/auth/signup`**: creates a workspace (or joins one via policy-based self-registration)
- **`/auth/forgot-password`**: requests reset link email
- **`/auth/reset-password`**: sets password using reset token
- **`/auth/accept-invite`**: accepts invite token to join workspace

#### Protected routes

Protected routes are guarded by `AuthGuard` which checks `@divisionx/api-client.isLoggedIn()` and redirects to `/auth/login` if needed.

- **`/dashboard`**: aggregates:
  - `getWorkspaceBootstrap()`
  - `getReport()` time summary
  - `getActivityReport()` team overview (manager+)
  - `clockInAttendance()` and attendance widget integration
- **`/tracker`**: the main daily tool:
  - timer lifecycle (start/stop/resume/running state)
  - break + pomodoro controls
  - kanban task board with drag-and-drop status updates
  - live forensics HUD + idle policy enforcement
  - long-running timer alerts
- **`/timesheet`**: calendar-style timesheet viewer and scheduler UI (see calendar subsystem note below)
- **`/reports`**: reporting filters + grouping + export URL
- **`/workspace/*`**: admin & management tools:
  - activity: timeline + metrics
  - audit: logs (manager+)
  - approvals: pending approvals queue (manager+)
  - teams: membership, invites, role changes, stop-member timer, active timers
  - projects/clients/tags: catalog management (manager+ mutations)
  - settings: workspace + policy (owner/admin)
  - organization: enterprise org + compliance aggregation

### 4.2 Session model (frontend)

TheTime uses `localStorage` as its “session store”:

- `thetime_token`: JWT access token
- `thetime_refresh_token`: refresh token (stored server-side in `Session` table)
- `thetime_user_id`: current user id
- `thetime_workspace_id`: current workspace id
- `thetime_role`: current role within the current workspace
- `thetime_workspaces`: optional list returned by login for workspace switching

Implication:

- New tabs share session.
- Clearing site storage logs out locally.
- Access token expiry is managed by the refresh flow in `@divisionx/api-client`.

### 4.3 API usage pattern in pages

Pages generally follow this shape:

- show a skeleton/loading state
- call 1–3 API functions via `@divisionx/api-client`
- render interactive UI
- on action:
  - optimistic update for trivial UI state where safe
  - otherwise call API then refresh list/state
- show `Toast` for success/failure

### 4.4 Tracker: timer + kanban + breaks + pomodoro + forensics

The tracker is the “richest” page, combining several systems:

- **Catalog** (projects/tasks)
  - `getCatalog('projects')`
  - `getCatalog('tasks')`
- **Timer lifecycle**
  - `startTimer(payload)`
  - `stopTimer()`
  - `getRunningTimer()`
  - `getTimeEntries(...)` to render history and compute durations
- **Break sessions**
  - `startBreak()` / `stopBreak()`
- **Pomodoro**
  - `startPomodoro()` (policy-aware focus + break minutes)
  - relies on local interval ticks for countdown UX
  - triggers start/stop break calls at boundaries
- **Idle detection**
  - `useActivityTracker` attaches listeners while a timer is active
  - after idle minutes threshold breach, it calls `reportIdle({ ... })`
  - based on backend response:
    - show idle banner, OR
    - show “auto-paused” state and refresh
- **Notifications**
  - requests browser permission once
  - uses critical notifications for idle and long-running timers

Important UX principles implemented here:

- isolate 1-second interval updates (active timer banner) to avoid re-rendering the entire page
- keep “catalog reload” and “transaction refresh” separate to avoid unnecessary API calls
- cache running timer in localStorage to reduce UI flicker on reload

#### Local caching that impacts debugging

The tracker persists a “running timer snapshot” to reduce flicker:

- `localStorage["thetime_running_timer"]`

This can cause the UI to show a timer immediately on load even before the backend confirms the running state; the subsequent refresh reconciles it.

### 4.5 Workspace bootstrap as a performance primitive

`GET /v1/workspace/bootstrap` is used as a single “initial load” call so that:

- dashboard and shell can render quickly with complete context
- the app avoids N+1 fetches (workspace + members + projects + policy + attendance + running timer)

This endpoint is one of the most important architectural optimizations in the system.

### 4.6 Timesheet calendar subsystem (what exists today)

The timesheet route is implemented primarily as a calendar/scheduler UI:

- `apps/thetime/src/app/timesheet/page.tsx`
- calendar components: `apps/thetime/src/components/calendar/*`

If you expect full CRUD (edit/delete) inside the timesheet view, confirm it is implemented in the current UI before documenting it as a completed capability.

### 4.7 Activity Monitoring (real-time HUD + barcode + WS ticker)

The Activity Monitoring page is a real-time team dashboard:

- `apps/thetime/src/app/workspace/activity/page.tsx`
- barcode visualization: `apps/thetime/src/components/daily-barcode.tsx`

It combines:

- a HUD grid of member states (ACTIVE/BREAK/IDLE/OFFLINE)
- a daily “barcode” timeline for the selected member
- weekly metrics scorecards
- a real-time WebSocket ticker feed driven by backend `sendGlobalNotification`

#### WebSocket URL and deployment note

In the current UI, the WebSocket URL can be hardcoded (e.g. `ws://localhost:5000/...`) rather than derived from `NEXT_PUBLIC_CORE_API_URL`. Document this as a deployment constraint and centralize it if you want production-grade configurability.

---

## 5) core-api backend (execution model and module design)

### 5.1 Bootstrapping and server plugins

The server sets up:

- **CORS**: broad origin for development, supports:
  - `Authorization`
  - `x-user-id`, `x-workspace-id`, `x-role` (for dev bypass)
- **Compression** and **ETag**: improves network performance
- **Rate limiting**:
  - stricter for auth endpoints (`/v1/auth/login`, `/v1/auth/signup`, `/v1/auth/forgot-password`)
- **WebSocket** for `/v1/notifications/ws`

### 5.2 Authentication and request context (`req.ctx`)

`authenticate` builds a request context:

- `userId`
- `workspaceId`
- `role`

Sources of truth:

- A verified JWT bearer token, OR
- (dev only) explicit headers if `ENABLE_DEV_BYPASS=true`

Custom domain handling:

- For non-localhost hosts, `core-api` attempts to map the host to `Workspace.customDomain`
- That workspace id overrides the JWT workspace id (useful for “workspace per domain” deployments)

#### Custom-domain cache

Custom-domain workspace lookups are cached in-memory for a short TTL (per-process), implemented in:

- `services/core-api/src/core/http.ts`

### 5.3 Module routing adapter (prefix-based)

The module adapter registers “prefix handlers” for:

- `/v1/auth` → `authRoutes`
- `/v1/workspace` and `/v1/teams` → `workspaceRoutes`
- `/v1/projects|tasks|tags|clients` → `catalogRoutes`
- `/v1/timer` and `/v1/time-entries` → `timeRoutes`
- `/v1/break|pomodoro|time` → productivity time routes
- `/v1/policies` → `policyRoutes`
- `/v1/reports` → `reportingRoutes`
- `/v1/audit` → `auditRoutes`
- `/v1/attendance` → `attendanceRoutes`
- `/v1/activity` → `activityRoutes`
- `/v1/organizations` → `organizationRoutes`

This architecture has a practical implication:

- The Fastify layer can be thin and stable, while modules evolve quickly.
- Shared behavior (auth, permission gating, logging, headers sanitation) is centralized.

### 5.3.1 Caching subsystems in core-api

core-api uses in-memory caching in multiple places:

- general memory cache utility: `services/core-api/src/core/cache/index.ts`
- WorkspacePolicy read caching: `services/core-api/src/core/prisma.ts`
- custom-domain workspace resolution cache: `services/core-api/src/core/http.ts`

These caches are per-process. In multi-instance deployments, behavior may differ between instances unless you introduce a shared cache.

### 5.4 Role model (RBAC)

Workspace role enum:

- `OWNER`
- `ADMIN`
- `MANAGER`
- `MEMBER`

Common enforcement patterns:

- **Owner/Admin**: workspace settings, policy changes, member role changes, member removal
- **Manager+**: approvals, activity reports, viewing other users’ activity/metrics, stopping member timers
- **Member**: can track their own time, view their own timeline, manage their own tasks

In addition to role checks inside modules, `core-api` also applies certain **permission** checks in the adapter layer based on URL + HTTP method (defense in depth).

#### Adapter-level permission mapping (important)

Some permissions are enforced by a URL/method mapping in `services/core-api/src/main.ts` (`getRequiredPermission`). When adding new endpoints, ensure they are either:

- covered by the adapter’s permission mapping, or
- explicitly checked inside the module handler (role/permission), or
- protected by a dedicated middleware layer.

---

## 6) API reference (by business domain)

This section is intentionally verbose: it’s the “API map” aligned to product features.

### 6.1 Health

- `GET /health`
  - **Purpose**: simple liveness check
  - **Returns**: `{ status: "healthy", timestamp }`

### 6.2 Auth

- `POST /v1/auth/signup`
  - creates a new workspace with owner membership by default
  - supports domain-based workspace policies that can attach self-signups to an existing workspace (if allowed)
- `POST /v1/auth/login`
  - verifies password, returns tokens and memberships/workspaces
- `POST /v1/auth/switch`
  - issues a new session for a different workspace where the user is a member
- `POST /v1/auth/refresh`
  - exchanges refresh token for a new access token
- `POST /v1/auth/forgot-password`
  - generates reset token and emails a link to the frontend
  - returns success even if user does not exist (prevents enumeration)
- `POST /v1/auth/reset-password`
  - sets new password for a valid reset token
- `POST /v1/auth/logout`
  - deletes session(s) for refresh token

SSO:

- `GET /v1/auth/sso/login` (redirect to IdP)
- `POST /v1/auth/sso/callback` (validates SAML profile, issues access token, redirects back to frontend)

### 6.3 Workspace bootstrap and administration

- `GET /v1/workspace/me`
- `GET /v1/workspace/bootstrap`
- `PATCH /v1/workspace` (owner/admin)

Members:

- `PATCH /v1/workspace/members/:id/role` (owner/admin)
- `DELETE /v1/workspace/members/:id` (owner/admin)

Active timers:

- `GET /v1/workspace/active-timers` (manager+)

Invites:

- `GET /v1/workspace/invites` (owner/admin)
- `POST /v1/workspace/invites` (owner/admin)
- `DELETE /v1/workspace/invites/:inviteId` (owner/admin)
- `POST /v1/workspace/invites/accept` (public)

Teams:

- `GET /v1/teams`
- `POST /v1/teams` (owner/admin)
- `PATCH /v1/teams/:teamId` (owner/admin)
- `DELETE /v1/teams/:teamId` (owner/admin)
- `POST /v1/teams/:teamId/members` (manager+)
- `DELETE /v1/teams/:teamId/members/:userId` (manager+)

### 6.4 Catalog (projects, tasks, tags, clients)

Projects:

- `GET /v1/projects`
  - member view is filtered via team bindings:
    - unbound projects are visible
    - bound projects are visible only if the member belongs to at least one bound team
- `POST /v1/projects` (manager+)
- `PATCH /v1/projects/:id` (manager+)
- `DELETE /v1/projects/:id` (manager+)
- `POST /v1/projects/:projectId/teams` (manager+)
- `DELETE /v1/projects/:projectId/teams/:teamId` (manager+)

Tasks:

- `GET /v1/tasks` (members see their own unless manager+)
- `POST /v1/tasks`
- `PATCH /v1/tasks/:id`
- `DELETE /v1/tasks/:id`

Tags:

- `GET /v1/tags`
- `POST /v1/tags` (manager+)
- `PATCH /v1/tags/:id` (manager+)
- `DELETE /v1/tags/:id` (manager+)

Clients:

- `GET /v1/clients`
- `POST /v1/clients` (manager+)
- `PATCH /v1/clients/:id` (manager+)
- `DELETE /v1/clients/:id` (manager+)

### 6.5 Time tracking and time entries

Timer lifecycle:

- `POST /v1/timer/start`
- `POST /v1/timer/stop`
- `POST /v1/timer/resume`
- `POST /v1/timer/change-start`
- `GET /v1/timer/running`
- `GET /v1/timer/alerts`
- `POST /v1/timer/stop-member` (manager+)

Time entries:

- `GET /v1/time-entries`
- `GET /v1/time-entries/pending` (manager+)
- `POST /v1/time-entries/manual` (manager+; blocked when `forceTimer=true`)
- `PATCH /v1/time-entries/:id` (manager+)
- `DELETE /v1/time-entries/:id` (member can delete own; manager+ can delete any)
- `POST /v1/time-entries/approve` (manager+)
- `POST /v1/time-entries/approve-bulk` (manager+)

Break + Pomodoro + idle reporting:

- `POST /v1/break/start`
- `POST /v1/break/stop`
- `POST /v1/pomodoro/start`
- `POST /v1/time/idle`

### 6.6 Policies

- `GET /v1/policies`
- `PATCH /v1/policies` (owner/admin)

Key policy fields and what they affect:

- `forceTimer`
  - blocks manual entry creation
- `idleMinutes`
  - inactivity threshold used for idle windows and UI timers
- `autoPauseOnIdle`
  - if enabled, idle reporting can stop timer + start break
- `pomodoroMinutes`, `breakMinutes`
  - default focus/break durations for Pomodoro UX
- `overtimeHours`, `longRunningMinutes`
  - thresholds used for alerting and reporting indicators
- `allowSelfRegistration`, `permittedDomains`
  - controls whether users can self-register into an existing workspace by corporate domain

### 6.7 Reporting

- `GET /v1/reports/time`
  - supports filtering by approved/billable/user/project/time range
  - supports pagination and optional grouping (e.g. groupBy=project)
  - returns totals and a mapped list of items with derived durationHours
- `GET /v1/reports/time/export` (manager+)
  - CSV export of time entries
- `GET /v1/reports/activity` (manager+)
  - team daily activity rollup:
    - todayHours
    - running minutes
    - overtime/long-running flags

### 6.8 Activity timeline and metrics

- `GET /v1/activity/timeline`
  - reconstructs a 24h day as segments with precedence:
    - `BREAK > IDLE > ACTIVE > OFFLINE`
  - merges adjacent identical segments to keep payload compact
- `GET /v1/activity/metrics`
  - computes weekly active/idle/break hours and an efficiency index
  - computes “consecutive active minutes” + a “break nudge” indicator

### 6.9 Attendance

- `POST /v1/attendance/clock-in`
- `GET /v1/attendance/today`

Attendance semantics:

- If already clocked in, endpoint returns existing record
- There is an auto-cap behavior after 5 PM if not clocked out (server-time behavior)

### 6.10 Audit logs

- `GET /v1/audit` (manager+)
  - supports filters: `userId`, `action`, `targetType`
  - enriches items with actor profile (name/email) when available

### 6.11 Enterprise organizations

- `GET /v1/organizations/me`
- `POST /v1/organizations`
- `POST /v1/organizations/:orgId/workspaces`
- `GET /v1/organizations/:orgId/compliance`

Org compliance returns:

- audit logs across all child workspaces
- total members and total projects counts

---

## 7) WebSocket: real-time notifications

Endpoint:

- `GET /v1/notifications/ws?token=<accessToken>`

Constraints:

- Only `OWNER` and `ADMIN` roles are allowed to connect
- Connections are registered per workspace so the server can fan-out messages

Sources of events:

- timer start/stop/resume
- break start/stop
- task creation
- other global events emitted via `sendGlobalNotification`

This channel is primarily intended for “admin visibility” and real-time operational feedback.

### 7.1 Notification delivery also includes email fanout

In addition to WebSocket delivery, the backend can email alerts to workspace owners/admins:

- WebSocket + fanout: `services/core-api/src/core/notifications.ts`
- SMTP templates (invites + password reset): `services/core-api/src/core/mail.ts`

---

## 8) Data model walkthrough (Prisma schema, explained)

This section explains the schema in a narrative way (why it exists, how it’s used).

### 8.1 Identity and sessions

- `User`
  - identity anchor (email unique)
  - password hash and optional reset token fields
- `Session`
  - refresh token storage + expiry
  - workspace scoped: session carries a `workspaceId` and a `role`

### 8.2 Tenant and membership

- `Workspace`
  - primary tenant boundary
  - optional `customDomain` supports “workspace-by-domain”
  - optional `organizationId` supports enterprise grouping
- `WorkspaceMember`
  - join table between users and workspaces
  - carries the **workspace role**
- `Invite`
  - token-based invitation to join a workspace
- `WorkspacePolicy`
  - singleton-per-workspace policy row (unique `workspaceId`)
  - drives time tracking rules, idle behavior, pomodoro defaults, domain registration policy

### 8.3 Work catalog and visibility

- `Client`
  - optional association for projects
- `Project`
  - trackable unit, optional client association
  - archived/deleted timestamps
- `Task`
  - can be attached to a project
  - includes status + priority fields (supports the Kanban UX)
- `Tag`
  - lightweight categorization
- `Team` + `TeamMember`
  - user grouping inside a workspace
- `ProjectTeam`
  - binds a project to a team to control member visibility

### 8.4 Tracking and productivity

- `TimeEntry`
  - immutable “work interval” (start time + optional end time)
  - references project/task/tag, plus billable/approved/invoiced flags
- `RunningTimer`
  - a unique “currently running” pointer per user
  - used for fast lookup and for preventing multiple concurrent timers
- `BreakSession`
  - intervals when the user is on break
  - used in timeline overlays and wellness metrics

### 8.5 Compliance and operations

- `AuditLog`
  - action + metadata log (e.g. `timer.start`, `idle.detected`, `policy.update`)
  - foundational for org compliance aggregation
- `AttendanceLog`
  - day-based clock in/out record

### 8.6 Enterprise

- `Organization`
  - parent grouping for workspaces
  - billingPlan placeholder (default ENTERPRISE)
- `OrganizationMember`
  - org-level membership (role string, default ORG_ADMIN)

---

## 9) End-to-end workflow deep dives (UI → API → DB)

### 9.1 Signup and workspace creation

1. UI submits `POST /v1/auth/signup`.
2. Backend checks if email domain matches a workspace policy:
   - if found and self-registration allowed, user is added to that workspace as MEMBER.
   - otherwise, a new workspace is created and user becomes OWNER.
3. Backend creates a `Session` with refresh token and returns access token + ids.
4. UI persists session via `persistAuth`.

### 9.2 Login and workspace switching

1. UI calls `POST /v1/auth/login`.
2. Backend verifies password and returns:
   - access token
   - refresh token
   - userId/workspaceId/role
   - optional list of workspaces from memberships
3. UI may call `POST /v1/auth/switch` to change active workspace context.

### 9.3 Invite flow (admin invites → user accepts)

1. Admin calls `POST /v1/workspace/invites` with email + role.
2. Backend creates `Invite` token and emails a link:
   - `/auth/accept-invite?token=...` on the frontend origin
3. User accepts from UI, calling `POST /v1/workspace/invites/accept`.
4. Backend:
   - validates invite, upserts `User`, creates/updates `WorkspaceMember`
   - marks invite accepted

### 9.4 Start timer (the most important transactional flow)

1. UI calls `startTimer({ description, projectId?, taskId?, tagId?, billable? })`.
2. Backend:
   - validates references belong to workspace
   - closes any existing running entry for the user
   - creates new `TimeEntry` with `endedAt = null`
   - creates `RunningTimer`
   - writes audit and sends notification
3. UI refreshes:
   - `getRunningTimer()`
   - `getTimeEntries(...)`

### 9.5 Idle policy enforcement (forensics + auto-pause)

1. While timer is running, UI collects input activity signals.
2. When inactive minutes exceed `WorkspacePolicy.idleMinutes`, UI calls `POST /v1/time/idle`.
3. Backend:
   - writes audit entry `idle.detected` with metadata (keys, mouse pixels, clicks)
   - if `autoPauseOnIdle=true`:
     - stops the running timer (closes `TimeEntry`, clears `RunningTimer`)
     - starts a `BreakSession`
     - returns `{ autoPaused: true }`
4. UI:
   - if auto-paused: refreshes and shows warning toast
   - if not auto-paused: shows idle banner, lets user decide whether to stop manually

### 9.6 Activity timeline reconstruction (how the barcode is built)

For a target day:

1. Start with a full-day OFFLINE segment.
2. Overlay attendance (clock-in → clock-out) as IDLE by default.
3. Overlay time entries as ACTIVE segments.
4. Overlay break sessions as BREAK segments.
5. Overlay idle audits as IDLE segments (policy-based idle window length).
6. Resolve overlaps using precedence:
   - BREAK wins over everything
   - IDLE wins over ACTIVE
   - ACTIVE wins over OFFLINE
7. Merge adjacent segments with identical state+metadata.

### 9.7 Approvals and reporting

- Approvals endpoints operate on `TimeEntry.approved` and are manager+ only.
- Reporting:
  - time report aggregates totals (billable vs total)
  - activity report computes per-member daily totals and flags
  - CSV export streams a file for external finance/billing workflows

---

## 10) Operational notes (debugging and extensions)

### 10.1 Common “where is this implemented?” map

- UI route logic: `apps/thetime/src/app/**/page.tsx`
- Auth guard: `apps/thetime/src/components/auth-guard.tsx`
- Activity tracker hook: `apps/thetime/src/hooks/use-activity-tracker.ts`
- API calls: `packages/api-client/src/index.ts`
- Fastify bootstrap + adapter: `services/core-api/src/main.ts`
- Auth hook: `services/core-api/src/core/http.ts`
- Prisma schema: `services/core-api/prisma/schema.prisma`

#### Important supporting systems

- caching utility: `services/core-api/src/core/cache/index.ts`
- Prisma soft-delete + policy caching: `services/core-api/src/core/prisma.ts`
- notifications + WS + admin email alerts: `services/core-api/src/core/notifications.ts`
- invite + password reset SMTP templates: `services/core-api/src/core/mail.ts`
- RBAC permissions matrix: `services/core-api/src/core/types.ts`

### 10.2 Adding a new feature (recommended pattern)

1. Define the data model (if needed) in Prisma.
2. Add a module handler or extend the relevant module routes file.
3. Add an API client wrapper in `@divisionx/api-client`.
4. Build the UI page or component calling the client wrapper.
5. Add audit/notifications if it’s operationally important.

### 10.3 Local development

From repository root:

```bash
pnpm install
pnpm dev
```

To run everything:

```bash
pnpm dev:workspace
```

### 10.4 Migration vs schema note (database setup)

The Prisma migration SQL in `services/core-api/prisma/migrations/**` may not fully reflect the current `schema.prisma` shape. If you are provisioning a fresh database, treat `schema.prisma` as the source of truth and ensure migrations are regenerated/updated accordingly.

---

## 11) References (other docs in this repo)

- `docs/products/thetime.md`
- `docs/services/core-api.md`
- `docs/architecture/thetime-core-api-dataflow.md`
- `docs/thetime-core-api-remaining-gaps.md`

