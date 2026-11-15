# AGENTS.md

TixWar frontend. Flash-sale ticketing web app for the TixWar API (`../api`).

## Stack

- Vite + React 19 + TypeScript
- TanStack Router (file-based, `src/routes/`)
- TanStack Query
- Tailwind CSS v4 + shadcn/ui (CSS variables, light/dark theme)
- Biome (lint + format)
- Bun (package manager, scripts)
- `@hey-api/openapi-ts` (generated API client)

## Commands

```bash
bun install
bun run dev          # dev server, http://localhost:3000
bun run lint         # biome check .
bun run typecheck    # tsc -b --noEmit
bun run build        # tsc -b && vite build
bun run api:gen      # regenerate client + sync shared types
```

Run `lint`, `typecheck`, `build` before every commit. Do not proceed if any is red.

## Folder structure

```
src/
  components/ui/     shadcn primitives (button, input, card, ...)
  components/        shared presentational (status.tsx: loading/empty/error)
  features/<name>/   per-feature queries, hooks, forms (auth, events, orders, ...)
  routes/            TanStack Router file-based routes
  lib/               client (generated), api interceptor, auth, sse, utils
docs/api-types.d.ts  shared API types copied from ../api/docs/api-types.d.ts
```

## Rules

- Use the generated client (`@/lib/client`) for every API call. Never write manual `fetch`.
- Never invent endpoints. Only call functions generated from the API docs.
- Domain types come from `@api-types` (`components['schemas']['Order']`, `paths['/v1/orders']['post']`).
- All TanStack packages are pinned to exact versions in `package.json`.
- `.env` holds `VITE_API_BASE_URL`. Never commit secrets. Use `.env.example` as template.
- `src/lib/client/**` and `src/routeTree.gen.ts` are generated — do not hand-edit.

## Client interceptor

`src/lib/api.ts` configures the single client instance at startup (imported in `main.tsx`):

- Injects `Authorization: Bearer <accessToken>`.
- On 401: single-flight refresh, retries the request, logs out if refresh fails.
- On 429: maps `Retry-After` into `ApiError.retryAfterSeconds`.
- Maps every error to one type: `ApiError` (`src/lib/errors.ts`).

## State conventions

Every feature screen must render three states: loading (skeleton), empty, error. Use `src/components/status.tsx`.

Mobile-first. Respect `prefers-reduced-motion`. Keyboard navigation and ARIA labels required. No decorative/section-separator comments — only comments that explain non-obvious logic.
