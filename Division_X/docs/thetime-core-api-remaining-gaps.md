## TheTime + core-api — Remaining Items / Gaps Inventory

This file lists **important subsystems, behaviors, and mismatches** that exist in the codebase but were either missing, under-documented, or have drift risk.

It is meant to be used as a **tracking checklist** and a **pointer index** (with file paths) for further documentation hardening.

---

## A) Cross-cutting / shared packages

### A1) Auth contract mismatch: `accessToken` vs `token`

- **Contracts**: `Division_X/packages/contracts/src/auth/v1/login.ts` defines `LoginResponse { accessToken: string }`.
- **API client + backend**: the app and service flows use `token` fields (access token) in multiple places (and refresh returns `{ token }`).

**Risk**: contract drift causes integration breakages, confusion in docs/tests, and typing errors.

**Where to fix/decide canonical naming**:

- `Division_X/packages/contracts/src/auth/v1/login.ts`
- `Division_X/packages/api-client/src/index.ts`
- `Division_X/services/core-api/src/modules/auth/routes.ts`

### A2) Thin contract coverage vs API surface

`@divisionx/contracts` currently types only a small portion of what `@divisionx/api-client` actually exposes, leaving many endpoints as `any`.

**Risk**: accidental breaking changes between backend and frontend are more likely, and documentation may drift.

---

## B) Backend (`services/core-api`) remaining “major” subsystems & gotchas

### B1) Prisma “soft delete” behavior (non-obvious)

Some models behave as soft-deleted via `deletedAt` and Prisma middleware/extension logic.

- **Where**: `Division_X/services/core-api/src/core/prisma.ts`
- **Models impacted**: `Team`, `Project`, `Task`, `Tag`, `Client`

**Operational gotchas**:

- `delete()` is effectively an `update({ deletedAt: now })`.
- many reads auto-append `deletedAt: null`, so “missing” rows might just be soft-deleted.

### B2) WorkspacePolicy caching (24h in-memory)

Workspace policy reads are cached per-process.

- **Where**: `Division_X/services/core-api/src/core/prisma.ts`
- **Invalidation**: cache invalidated by pattern delete on writes.

**Operational gotchas**:

- multiple service instances can have different caches
- “policy didn’t update” can be a cache/process issue

### B3) Custom-domain workspace resolution caching (5 minutes)

Host-based workspace mapping is cached per-process.

- **Where**: `Division_X/services/core-api/src/core/http.ts`

**Operational gotcha**:

- request workspace is `workspaceIdFromDomain || workspaceIdFromJWT`

### B4) General in-memory cache utility

- **Where**: `Division_X/services/core-api/src/core/cache/index.ts`
- **What**: TTL `MemoryCache` with `deletePattern`

### B5) Notifications are not just WebSocket (also admin email fanout)

- **Where**:
  - `Division_X/services/core-api/src/main.ts` (WS endpoint + auth/role checks + heartbeat)
  - `Division_X/services/core-api/src/core/notifications.ts` (WS fanout + admin email alerts)

**Operational gotchas**:

- WS close codes: missing token / non-admin
- heartbeat ping in server
- event IDs generated non-deterministically (`Math.random()` substring)
- admin alerts attempt SMTP; in dev they fallback to a stream transport

### B6) Mail subsystem + “mock mailer” fallback

- **Where**: `Division_X/services/core-api/src/core/mail.ts`
- **What**: invitation + password reset emails via SMTP (pooling) or streamTransport fallback

### B7) Adapter-level permission gating is partially hardcoded

Some permissions are enforced by a URL+method switch in `main.ts`, not solely by module code.

- **Where**:
  - `Division_X/services/core-api/src/main.ts` (`getRequiredPermission`)
  - `Division_X/services/core-api/src/core/types.ts` (permission matrix)

**Risk**: new endpoints may not automatically receive permission gates unless:

- the switch is updated, OR
- the module checks role/permission explicitly.

### B8) Migrations lag behind the current Prisma schema

- **Where**:
  - `Division_X/services/core-api/prisma/schema.prisma`
  - `Division_X/services/core-api/prisma/migrations/**`

**Risk**: setting up DB using migrations only may not match current model set.

---

## C) Frontend (`apps/thetime`) remaining “major” subsystems & gotchas

### C1) Timesheet is primarily a calendar viewer (not full CRUD)

- **Where**: `Division_X/apps/thetime/src/app/timesheet/page.tsx`
- **Calendar kit**: `Division_X/apps/thetime/src/components/calendar/*`

**Doc correction needed**: don’t claim “edit/delete/filter” exists in timesheet unless it’s actually implemented there.

### C2) Activity Monitoring is a real-time admin console (WS + HUD + ticker)

- **Where**: `Division_X/apps/thetime/src/app/workspace/activity/page.tsx`

**Gotchas**:

- Connects to WebSocket using a hardcoded `ws://localhost:5000/...` URL.
- It attempts a WS connection even without role gating in the UI (server should enforce, but UX can confuse).

### C3) Barcode visualization (daily inactivity heatmap)

- **Where**: `Division_X/apps/thetime/src/components/daily-barcode.tsx`

### C4) LocalStorage caches that influence UX and debugging

- tracker “de-flicker” cache: `thetime_running_timer`
  - **Where**: `Division_X/apps/thetime/src/app/tracker/page.tsx`
- workspace switcher caches: `thetime_workspaces`, `thetime_workspace_id`
  - **Where**: `Division_X/apps/thetime/src/components/app-shell.tsx`

### C5) Notification de-duplication via Notification tags + chime

- **Where**: `Division_X/apps/thetime/src/components/notification-manager.tsx`

---

## D) Recommended documentation add-ons (high value)

- **Document caching**: policy cache TTL, custom-domain cache TTL, and memory cache utility.
- **Document soft deletes**: which models are soft-deleted, and how reads filter them.
- **Document notifications**: WS + SMTP admin fanout, close codes, heartbeat, event payload shape.
- **Document calendar/timesheet**: what is implemented today, and what is stubbed/coming-soon.
- **Document contracts drift**: pick canonical token field naming and align contracts/client/service.

