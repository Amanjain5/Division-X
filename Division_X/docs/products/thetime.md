## TheTime (Frontend App) — Technical Documentation

## Overview

`thetime` is a Next.js (App Router) web application used for:

- Personal time tracking (start/stop/resume)
- Break + Pomodoro workflows
- Timesheet review (time entries list, edits, approvals)
- Team visibility (active timers, activity timeline/metrics, audits)
- Workspace administration (members, invites, policies, catalogs)

It integrates with the backend service `core-api` through the shared package `@divisionx/api-client`.

## Location

- App: `Division_X/apps/thetime`
- Routes (Next App Router): `Division_X/apps/thetime/src/app/*`
- Shared API client: `Division_X/packages/api-client`

## Tech stack

- **Framework**: Next.js `14.x`
- **UI**: React `18.x` with app-level CSS in `src/app/styles.css`
- **API integration**: `@divisionx/api-client` (workspace package)
- **Auth storage**: browser `localStorage` (JWT access token + refresh token + workspace context)

## Runtime configuration

The app expects a backend base URL via:

- **`NEXT_PUBLIC_CORE_API_URL`**: base URL for `core-api` (defaults to `http://localhost:5000` in `@divisionx/api-client`)

See also the example file:

- `Division_X/apps/thetime/.env.example`

## Navigation map (pages/routes)

All routes live under `src/app` and are rendered client-side for interactive workflows.

### Public routes

- **`/auth/login`**: login form; persists tokens in `localStorage`
- **`/auth/signup`**: signup flow
- **`/auth/forgot-password`**: triggers password reset email
- **`/auth/reset-password`**: sets new password (token-based)
- **`/auth/accept-invite`**: accept workspace invite token

### Authenticated routes

These are protected by `AuthGuard` (`src/components/auth-guard.tsx`) which redirects to `/auth/login` when no token is present.

- **`/dashboard`**: summary metrics (time + activity + workspace bootstrap)
- **`/tracker`**: timer, break/pomodoro controls, Kanban-style task board, live productivity forensics HUD
- **`/timesheet`**: time entries list, edits, approvals (role dependent)
- **`/reports`**: time report (filters + grouping) + CSV export link
- **`/workspace/activity`**: activity timeline + metrics
- **`/workspace/audit`**: audit log view (role dependent)
- **`/workspace/approvals`**: approvals queue for pending entries (manager+)
- **`/workspace/clients`**: manage clients (manager+ for mutations)
- **`/workspace/projects`**: manage projects and project-team bindings (manager+ for mutations)
- **`/workspace/tags`**: manage tags (manager+ for mutations)
- **`/workspace/teams`**: manage teams + invites + member role changes + stop member timer (admin/owner/manager features)
- **`/workspace/settings`**: workspace + policy configuration (owner/admin)
- **`/workspace/organization`**: enterprise org view + compliance aggregation

## Key features (what the app does)

### Authentication + workspace context

The app persists a session using `@divisionx/api-client`:

- Access token: `localStorage["thetime_token"]`
- Refresh token: `localStorage["thetime_refresh_token"]`
- User/workspace/role context: `thetime_user_id`, `thetime_workspace_id`, `thetime_role`

The API client automatically refreshes the access token on HTTP `401` responses.

### Time tracking (Timer lifecycle)

Core actions:

- Start timer (with optional project/task/tag references)
- Stop timer
- Resume from a previous entry
- Change running timer start time
- View running timer state

### Break + Pomodoro workflows

The tracker supports:

- **Break sessions**: start/stop break while timer is running
- **Pomodoro cycles**: focus + break phases, notifications, and backend break start/stop integration

### Activity monitoring (browser-side)

While a timer is running, `useActivityTracker` captures:

- Keystrokes
- Mouse movement distance
- Click counts
- A rolling “active score” over a sliding window

If idle minutes breach the policy threshold, the app calls `reportIdle(...)` to `core-api`, which can either:

- Trigger auto-pause behavior (if enabled by policy), or
- Return “idle detected” so the UI can show an alert

### Reports + exports

The reports UI calls `/v1/reports/time` with filters and uses `/v1/reports/time/export` for CSV export.

## API integration model

The app never calls the backend directly; it calls `@divisionx/api-client`.

### Where API calls originate

- Page components (`src/app/**/page.tsx`)
- Shared hooks (`src/hooks/use-activity-tracker.ts`)
- Shared UI shell (`src/components/app-shell.tsx`)

### How requests are authenticated

- The API client sends `Authorization: Bearer <token>` when present.
- If a request returns `401`, the client calls `/v1/auth/refresh` with the stored refresh token and retries.

## Error handling + UX states

Patterns used in pages:

- Loading skeletons (`src/components/skeleton.tsx`)
- Toast notifications (`src/components/toast.tsx`)
- Empty state UI (`src/components/table-empty-state.tsx`)

## Local development

From workspace root:

```bash
pnpm install
pnpm dev
```

This runs the filtered dev workflow for `@divisionx/divisionx` and `@divisionx/core-api` per `Division_X/README.md`. To run `thetime` specifically, use Turbo filter or run its `dev` script from `apps/thetime`.

