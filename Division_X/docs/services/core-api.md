## core-api (Backend) — Technical Documentation

## Overview

`core-api` is the backend for `thetime`. It is a Fastify-based HTTP server that:

- Authenticates requests (JWT bearer tokens; optional dev bypass headers in non-prod)
- Applies role + permission gates across endpoints
- Implements business modules (auth, workspace, catalog, time, reporting, activity, policies, audit, attendance, organizations)
- Persists data to Postgres using Prisma ORM
- Provides an admin WebSocket channel for real-time notifications

## Location

- Service: `Division_X/services/core-api`
- Entry point: `Division_X/services/core-api/src/main.ts`
- Prisma: `Division_X/services/core-api/prisma/schema.prisma`

## Tech stack

- **Runtime**: Node.js (TypeScript, ESM)
- **HTTP framework**: Fastify `4.x`
- **Validation**: Zod via `fastify-type-provider-zod`
- **Database**: PostgreSQL via Prisma `5.x`
- **Auth**: JWT (`jsonwebtoken`) + bcrypt password hashing (`bcryptjs`)
- **SSO**: SAML (`@node-saml/node-saml`)
- **Email**: `nodemailer`
- **Real-time**: WebSocket via `@fastify/websocket`

## Runtime configuration (env)

From `Division_X/services/core-api/.env.example`:

- **`SERVICE_NAME`**: `core-api`
- **`PORT`**: `3000` (example)

In code, the server listens on:

- **`CORE_API_PORT`** (defaults to `5000`)

Database config (from Prisma schema):

- **`DATABASE_URL`**: Postgres connection string
- **`DIRECT_URL`**: optional direct connection string (Prisma)

Auth config (used in code):

- **`JWT_ACCESS_SECRET`**: secret used to sign/verify access tokens (defaults to a dev value if unset)
- **`FRONTEND_URL`**: used for redirects in SSO callback and for building email links
- **`ENABLE_DEV_BYPASS`**: when `true` and `NODE_ENV !== 'production'`, allows header-driven auth

## Request lifecycle

### 1) Transport & server plugins

`src/main.ts` registers:

- CORS (origin `*`, allows `Authorization`, plus dev headers `x-user-id`, `x-workspace-id`, `x-role`)
- Compression, ETag, Rate limiting (stricter for auth endpoints)
- WebSocket plugin

### 2) Authentication hook

`src/core/http.ts` defines `authenticate` (registered as a `preHandler` hook). It:

- Allows public routes:
  - `/health`
  - `/v1/auth/*`
  - `/v1/workspace/invites/accept`
- Tries to resolve workspace by **custom domain** (host → `Workspace.customDomain`) with a 5-minute in-memory cache
- If `Authorization: Bearer <jwt>` is present, it verifies the token and sets `req.ctx`:
  - `userId`, `workspaceId`, `role`
- If dev bypass is enabled (non-prod), it reads:
  - `x-user-id`, `x-workspace-id`, `x-role`
- Otherwise, rejects non-public requests with `401`

### 3) Routing model

Instead of registering every endpoint with Fastify, the server uses a “prefix adapter”:

- Each module exports an async handler:
  - `authRoutes(req)`
  - `workspaceRoutes(req, ctx)`
  - `timeRoutes(req, ctx)` etc.
- `main.ts` installs `app.route({ method, url: `${prefix}*`, handler })` for a set of prefixes.
- The handler adapts a Fastify request into a **standard `Request` object**, then calls the module handler.

This design keeps modules portable and makes contract testing easier (module handlers are plain functions returning `Response | null`).

### 4) Permission gates

`main.ts` computes a **required permission** for certain URLs/methods and checks them via `hasPermission(role, permission)` before calling module handlers. This is in addition to role checks inside specific routes.

Examples:

- `POST /v1/time-entries/approve` → `time_entries:approve`
- `PATCH /v1/time-entries/:id` → `time_entries:edit`
- `DELETE /v1/time-entries/:id` → `time_entries:delete`
- Catalog mutations `/v1/projects|tasks|tags|clients` → relevant `*:create|update|delete`

## API surface (high-level)

Base path: `/v1/*` (plus `/health`)

### Health

- `GET /health` → `{ status, timestamp }`

### Auth (`/v1/auth/*`)

Implemented in `src/modules/auth/routes.ts`:

- `POST /v1/auth/signup`
- `POST /v1/auth/login`
- `POST /v1/auth/switch` (issue new session for another workspace membership)
- `POST /v1/auth/refresh` (refresh access token)
- `POST /v1/auth/forgot-password` (email reset link; always returns success to prevent enumeration)
- `POST /v1/auth/reset-password`
- `POST /v1/auth/logout`

SSO (native routes in `main.ts`):

- `GET /v1/auth/sso/login` (redirect to IdP)
- `POST /v1/auth/sso/callback` (validate SAML, find/create user, issue token, redirect back to frontend)

### Workspace + teams + invites (`/v1/workspace/*`, `/v1/teams/*`)

Implemented in `src/modules/workspace/routes.ts`:

- `GET /v1/workspace/me`
- `GET /v1/workspace/bootstrap` (single call for workspace + members + projects + running timer + attendance + policy)
- `PATCH /v1/workspace` (owner/admin)
- `PATCH /v1/workspace/members/:id/role` (owner/admin)
- `DELETE /v1/workspace/members/:id` (owner/admin)
- `GET /v1/workspace/active-timers` (manager+)
- Invites:
  - `GET /v1/workspace/invites` (owner/admin)
  - `POST /v1/workspace/invites` (owner/admin)
  - `DELETE /v1/workspace/invites/:inviteId` (owner/admin)
  - `POST /v1/workspace/invites/accept` (public)
- Teams:
  - `GET /v1/teams`
  - `POST /v1/teams` (owner/admin)
  - `PATCH /v1/teams/:teamId` (owner/admin)
  - `DELETE /v1/teams/:teamId` (owner/admin)
  - `POST /v1/teams/:teamId/members` (manager+)
  - `DELETE /v1/teams/:teamId/members/:userId` (manager+)

### Catalog (`/v1/projects`, `/v1/tasks`, `/v1/tags`, `/v1/clients`)

Implemented in `src/modules/catalog/routes.ts`:

- Projects:
  - `GET /v1/projects` (members only see projects accessible via team bindings or unbound projects)
  - `POST /v1/projects` (manager+)
  - `PATCH /v1/projects/:id` (manager+)
  - `DELETE /v1/projects/:id` (manager+)
  - Project-team bindings:
    - `POST /v1/projects/:projectId/teams`
    - `DELETE /v1/projects/:projectId/teams/:teamId`
- Tasks:
  - `GET /v1/tasks` (members only see their tasks)
  - `POST /v1/tasks`
  - `PATCH /v1/tasks/:id` (members can edit own; manager+ can edit any)
  - `DELETE /v1/tasks/:id` (members can delete own; manager+ can delete any)
- Tags:
  - `GET /v1/tags`
  - `POST /v1/tags` (manager+)
  - `PATCH /v1/tags/:id` (manager+)
  - `DELETE /v1/tags/:id` (manager+)
- Clients:
  - `GET /v1/clients`
  - `POST /v1/clients` (manager+)
  - `PATCH /v1/clients/:id` (manager+)
  - `DELETE /v1/clients/:id` (manager+)

### Time (`/v1/timer/*`, `/v1/time-entries/*`)

Implemented in `src/modules/time/routes.ts`:

- Timer lifecycle:
  - `POST /v1/timer/start` (auto-stops any existing running entry)
  - `POST /v1/timer/stop`
  - `POST /v1/timer/resume`
  - `POST /v1/timer/change-start`
  - `GET /v1/timer/running`
  - `POST /v1/timer/stop-member` (manager+)
- Time entries:
  - `POST /v1/time-entries/manual` (manager+; blocked if `WorkspacePolicy.forceTimer`)
  - `PATCH /v1/time-entries/:id` (manager+)
  - `DELETE /v1/time-entries/:id` (member can delete own; manager+ can delete any)
  - `GET /v1/time-entries`
  - `GET /v1/time-entries/pending` (manager+)
  - `POST /v1/time-entries/approve` (manager+)
  - `POST /v1/time-entries/approve-bulk` (manager+)

Additional productivity endpoints are routed through `src/modules/time/productivity.routes.ts` via prefixes:

- `/v1/break/*`
- `/v1/pomodoro/*`
- `/v1/time/*` (idle reporting)

### Reporting (`/v1/reports/*`)

Implemented in `src/modules/reporting/routes.ts`:

- `GET /v1/reports/time` (filters + pagination + optional grouping)
- `GET /v1/reports/time/export` (CSV; manager+)
- `GET /v1/reports/activity` (team activity rollup; manager+)

### Activity (`/v1/activity/*`)

Implemented in `src/modules/activity/routes.ts`:

- `GET /v1/activity/timeline` (self; manager+ can view others)
- `GET /v1/activity/metrics` (self; manager+ can view others)

### Attendance (`/v1/attendance/*`)

Implemented in `src/modules/attendance/routes.ts`:

- `POST /v1/attendance/clock-in`
- `GET /v1/attendance/today`

### Audit (`/v1/audit`)

Implemented in `src/modules/audit/routes.ts`:

- `GET /v1/audit` (manager+; supports filters: `userId`, `action`, `targetType`)

### Organizations (`/v1/organizations/*`)

Implemented in `src/modules/organization/routes.ts`:

- `GET /v1/organizations/me`
- `POST /v1/organizations`
- `POST /v1/organizations/:orgId/workspaces` (bind workspace; requires ORG_ADMIN + workspace OWNER/ADMIN)
- `GET /v1/organizations/:orgId/compliance` (aggregate audit logs + counts; requires ORG_ADMIN)

### Notifications WebSocket (`/v1/notifications/ws`)

Defined in `src/main.ts`:

- Connect with querystring token: `?token=<accessToken>`
- Only allowed for roles `OWNER` and `ADMIN`
- Registers sockets by workspace and sends global notifications (used by timer + catalog events)

## Data model (Prisma)

The main entities are:

- **Identity**: `User`, `Session`
- **Tenant**: `Workspace`, `WorkspaceMember`, `WorkspacePolicy`, `Invite`
- **Work management**: `Project`, `Task`, `Tag`, `Client`, `Team`, `TeamMember`, `ProjectTeam`
- **Tracking**: `TimeEntry`, `RunningTimer`, `BreakSession`
- **Operations/compliance**: `AuditLog`, `AttendanceLog`
- **Enterprise**: `Organization`, `OrganizationMember`

See `Division_X/services/core-api/prisma/schema.prisma` for full schema.

## Local development

From workspace root:

```bash
pnpm install
pnpm dev
```

Or run the service directly from `services/core-api`:

```bash
pnpm dev
```

