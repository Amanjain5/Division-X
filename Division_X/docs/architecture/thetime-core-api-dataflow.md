## TheTime ↔ core-api — Data Flow & Key Workflows

## High-level architecture

- `apps/thetime` (Next.js UI)
  - calls `packages/api-client`
- `packages/api-client` (fetch wrapper + auth/session persistence)
  - calls `services/core-api` over HTTP + WebSocket
- `services/core-api` (Fastify)
  - validates auth/role/permission
  - reads/writes Postgres via Prisma

## Request authentication flow

### Normal API calls

1. The UI calls a function like `getWorkspaceBootstrap()` from `@divisionx/api-client`.
2. The API client sends `Authorization: Bearer <accessToken>` if present.
3. `core-api` `preHandler` hook verifies the JWT and sets `req.ctx = { userId, workspaceId, role }`.
4. The request is routed to the matching module handler (e.g. `workspaceRoutes`).
5. Module returns a `Response` (JSON payload); adapter forwards it to the client.

### Token refresh flow (automatic)

1. If any API call returns `401`, the API client checks `localStorage["thetime_refresh_token"]`.
2. If present, it calls `POST /v1/auth/refresh` with `{ refreshToken }`.
3. On success, the API client updates `localStorage["thetime_token"]` and retries the original request once.

### Dev bypass flow (non-production)

If `ENABLE_DEV_BYPASS=true` and `NODE_ENV !== 'production'`, `core-api` accepts:

- `x-user-id`
- `x-workspace-id`
- `x-role`

This is useful for local development and rapid UI iteration.

## Workspace bootstrap (single-call initialization)

Endpoint:

- `GET /v1/workspace/bootstrap`

Purpose:

- Reduce “waterfall loading” by returning a consolidated payload:
  - workspace metadata (name/timezone/customDomain)
  - membership list
  - project catalog (with clients)
  - current running timer
  - today attendance log
  - workspace policy

Used by:

- `thetime` dashboard and other pages that need global state early.

## Timer lifecycle (start/stop/resume)

### Start timer

UI:

- `@divisionx/api-client.startTimer(payload)`

API:

- `POST /v1/timer/start`

Backend steps:

1. Validate references (project/task/tag must exist in the same workspace).
2. Stop any existing running entry for the user:
   - set `endedAt=now`
   - delete from `RunningTimer`
3. Create a new `TimeEntry` with `endedAt=null`.
4. Create/update `RunningTimer`.
5. Emit audit event (`timer.start`) and a global notification.

### Stop timer

API:

- `POST /v1/timer/stop`

Backend steps:

1. Find most recent `TimeEntry` with `endedAt=null` for user.
2. Set `endedAt=now` and remove `RunningTimer` entry.
3. Emit audit event (`timer.stop`) and notification.

### Resume timer

API:

- `POST /v1/timer/resume`

Backend steps:

1. Validate original entry exists in workspace.
2. Stop any currently running entry.
3. Create a new `TimeEntry` copying description/project/task/tag/billable.
4. Create `RunningTimer`, audit (`timer.resume`) and notification.

## Break + Pomodoro

UI actions:

- `startBreak()` / `stopBreak()`
- `startPomodoro()`

API routing:

- `core-api` routes `/v1/break/*` and `/v1/pomodoro/*` to the productivity handler (`productivity.routes.ts`)

Expected effect:

- A break session is recorded in `BreakSession`.
- The activity timeline overlays break sessions as `BREAK` state segments.

## Activity tracking + idle enforcement

### Browser capture

While the timer is running, `thetime` measures:

- keystrokes, mouse movement, clicks
- a rolling “activeScore” ratio

### Idle report

UI:

- calls `reportIdle({ keystrokes, mouseMovement, clicks })`

API:

- `POST /v1/time/idle` (handled under productivity time routes)

Backend behavior:

- Uses policy (e.g. `idleMinutes`, `autoPauseOnIdle`) to decide whether to:
  - Record an audit entry like `idle.detected`
  - Auto-pause/stop behavior (if enabled)
  - Return a result the UI uses to show either “idle detected” or “auto-paused”

### Activity timeline composition

Endpoint:

- `GET /v1/activity/timeline?userId&date`

Backend builds a consolidated timeline using:

- `TimeEntry` windows → `ACTIVE`
- `BreakSession` windows → `BREAK`
- `AuditLog` (`idle.detected`) windows → `IDLE`
- `AttendanceLog` clock-in/out overlay

Then it resolves overlaps by precedence:

`BREAK > IDLE > ACTIVE > OFFLINE`

Finally it merges adjacent identical segments to keep payload compact.

## Time approvals + reporting

### Approvals

Endpoints:

- `GET /v1/time-entries/pending`
- `POST /v1/time-entries/approve`
- `POST /v1/time-entries/approve-bulk`

Access:

- Manager+ roles (and permission-gated by adapter)

### Reporting

Endpoints:

- `GET /v1/reports/time` (filters + optional grouping)
- `GET /v1/reports/time/export` (CSV)
- `GET /v1/reports/activity` (team rollup)

## Real-time notifications (admin WebSocket)

Endpoint:

- `GET /v1/notifications/ws?token=<accessToken>`

Access:

- `OWNER` and `ADMIN` only

Uses:

- “global notifications” emitted by backend events like timer start/stop and catalog changes.

