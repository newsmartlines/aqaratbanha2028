# Dalil — Real Estate Marketplace (عقارات الإسكندرية)

A full-stack Arabic-language real estate marketplace platform for Alexandria, Egypt. Lists properties for sale and rent, supports user/provider/admin roles, map search, subscriptions, and an admin panel. Production domain: **aqaralex.com**

## Stack

- **Frontend**: React 19 + Vite + Tailwind CSS 4 (RTL/Arabic)
- **Backend**: Node.js + Express 5 + TypeScript
- **Database**: PostgreSQL via Drizzle ORM
- **Monorepo**: pnpm workspaces (`artifacts/marketplace`, `artifacts/api-server`, `lib/db`)

## How to Run

The **Start application** workflow runs everything:

```
pnpm --filter @workspace/marketplace run dev & pnpm --filter @workspace/api-server run dev & node health-server.mjs & wait
```

- Frontend (Vite) listens on `VITE_PORT` (default 5000)
- API server listens on `PORT` (default 8080)
- `health-server.mjs` reverse-proxies port 5000 → 20787 for the Replit preview

## Database

- Replit's built-in PostgreSQL is used — `DATABASE_URL` is runtime-managed
- Schema is managed with Drizzle Kit: `pnpm db:push` to apply schema changes
- Seeds run automatically on API server startup

## Environment Variables

| Key | Notes |
|-----|-------|
| `DATABASE_URL` | Runtime-managed by Replit (do not set manually) |
| `SESSION_SECRET` | Set as a Replit Secret ✓ |
| `PORT` | API server port (shared env: `8080`) |
| `VITE_PORT` | Frontend dev port (shared env: `5000`) |
| `NODE_ENV` | `development` / `production` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Optional — Google OAuth |
| `OPENAI_API_KEY` | Optional — AI email generation in Admin panel |
| `CORS_ORIGIN` | Production: `https://aqaralex.com,https://www.aqaralex.com` |

## Key Commands

```bash
pnpm install          # Install all dependencies
pnpm db:push          # Push schema to database
pnpm build:deploy     # Build for production
```

## Setup Verification (July 27, 2026)

- Ran `pnpm install` — all workspace dependencies installed successfully
- Ran `pnpm db:push` — Drizzle schema applied to Replit PostgreSQL (changes applied)
- Started "Start application" workflow — Vite frontend on :5000, API server on :8080, health proxy on :20787
- App confirmed running via screenshot: homepage renders correctly with Arabic RTL UI

## User Preferences

- Keep the existing project structure and monorepo layout
- Arabic RTL UI — do not change the language or layout direction
- Platform targets: محافظة الإسكندرية only — all regions/areas must be Alexandria
- Production domain: aqaralex.com (set CORS_ORIGIN secret before deploying)
