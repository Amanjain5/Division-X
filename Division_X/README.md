# Division_X Platform

Multi-brand monorepo scaffold for apps, services, shared packages, and infrastructure.

## Workspace overview

- `apps/` contains frontend apps built with Next.js (e.g., divisionx, happywedding-web, wolfcasa-web, thetime)
- `services/` contains backend services and APIs
- `packages/` contains reusable shared libraries
- `domains/` contains domain-aligned code boundaries and internal modules
- `infra/`, `database/`, `env/`, and `docs/` contain infrastructure, environment configuration, database schema, and architecture documentation

## Product documentation

- `docs/products/thetime.md` — TheTime frontend architecture, routes, and features
- `docs/services/core-api.md` — core-api backend architecture, endpoints, and data model
- `docs/architecture/thetime-core-api-dataflow.md` — end-to-end workflows and data flow
- `docs/thetime-core-api-master.md` — combined master document (frontend + backend + data flow)

## Getting started

1. Install dependencies:
   ```bash
   pnpm install
   ```

2. Start the primary local development workflow:
   ```bash
   pnpm dev
   ```

3. Run the full workspace dev workflow:
   ```bash
   pnpm dev:workspace
   ```

## Common scripts

- `pnpm lint`
- `pnpm test`
- `pnpm build`
- `pnpm typecheck`
- `pnpm format`
- `pnpm format:write`
- `pnpm dev:apps` to start all frontend apps
- `pnpm dev:services` to start all backend services
- `pnpm dev:local` to start Docker compose for local development

## Node version

This workspace requires Node.js `>=18.16.0` as defined in `package.json`.

{
  "name": "division-x-platform",
  "private": true,
  "packageManager": "pnpm@9.12.0",
  "engines": {
    "node": ">=18.16.0"
  },
  "scripts": {
    "dev": "turbo run dev --parallel --filter=@divisionx/divisionx --filter=@divisionx/core-api",
    "dev:workspace": "turbo run dev --parallel",
    "dev:apps": "turbo run dev --parallel --filter=./apps/*",
    "dev:services": "turbo run dev --parallel --filter=./services/*",
    "dev:local": "docker compose -f docker-compose.dev.yml up --build",
    "docker:dev": "docker compose -f docker-compose.dev.yml up --build",
    "docker:prod": "docker compose -f docker-compose.prod.yml up --build",
    "lint": "turbo run lint",
    "typecheck": "turbo run typecheck",
    "test": "turbo run test",
    "build": "turbo run build",
    "e2e": "turbo run e2e",
    "format": "prettier --check .",
    "format:write": "prettier --write .",
    "contracts:check": "pnpm --filter @divisionx/contracts test && pnpm --filter @divisionx/core-api test:contracts"
  },
  "devDependencies": {
    "@typescript-eslint/eslint-plugin": "^8.9.0",
    "@typescript-eslint/parser": "^8.9.0",
    "eslint": "^9.12.0",
    "eslint-plugin-import": "^2.31.0",
    "prettier": "^3.3.3",
    "turbo": "^2.1.3",
    "typescript": "^5.6.3",
    "vitest": "^2.1.1",
    "zod": "^3.23.8"
  }
}

