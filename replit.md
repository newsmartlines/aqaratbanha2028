# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **Build**: esbuild (CJS bundle)
- **Frontend**: React + Vite + Tailwind CSS + shadcn/ui

## Artifacts

### Services Marketplace (`artifacts/marketplace`)
- Arabic RTL services marketplace **"دليل بلس"** — inspired by Haraj.com.sa
- Site name is dynamic from `siteSettings.siteName` API
- Teal + sand color palette, Tajawal Arabic font, full RTL layout
- **Fully connected to PostgreSQL backend via Express API**
- Vite dev proxy: `/api-server/*` → `http://localhost:8080`
- API client at `src/lib/api.ts`, data hook at `src/lib/use-api.ts`
- Preview path: `/`

**Marketplace Pages:**
- `/` — Homepage: hero with advanced search (keyword + category selector + city selector + GPS Near Me button), Haraj-style expandable categories, featured providers (horizontal scroll), providers grid with tabs, how-it-works steps, CTA from siteSettings, full footer with links
- `/categories` — Haraj-style expandable category rows with inline subcategories
- `/about` — Dynamic about page from siteSettings
- `/contact` — Contact page with info from siteSettings
- `/faq` — FAQ accordion from siteSettings JSON array
- `/search` — Search results with live filters (category/city/text), sort, grid/list toggle, sponsored ads, boost button
- `/provider/:id` — Provider profile with live services/reviews from DB, contact sidebar, upgrade CTA
- `/login` — Split-screen login
- `/register` — Account type selection
- `/onboarding` — 7-step provider registration wizard (Step 3: dynamic categories from DB with multi-select; Step 5: multi-select contact methods — Call/WhatsApp/Chat/Email)

**Provider Dashboard (`/dashboard/*`):**
- `/dashboard` — Overview with stats, subscription mini-card, recent orders
- `/dashboard/subscription` — Subscription management with progress bar, expiry alert, plan comparison, upgrade modal
- `/dashboard/services` — My Services: full CRUD with modal
- `/dashboard/orders` — Customer leads/requests
- `/dashboard/reviews` — Reviews with rating distribution and provider reply
- `/dashboard/payments` — Payment history
- `/dashboard/settings` — Profile edit (tabbed)

**User Dashboard (`/user/*`):**
- `/user/dashboard` — Overview with activity feed
- `/user/favorites` — Favorite providers (removable cards)
- `/user/requests` — My requests with inline rating
- `/user/reviews` — My reviews (edit/delete)
- `/user/settings` — Settings with tabs

**Admin Dashboard (`/admin/*`):**
- `/admin/login` — Dark-themed admin login
- `/admin/dashboard` — Stats, revenue/providers/category charts (Recharts)
- `/admin/providers` — Provider management with approve/reject/suspend + **Add Provider modal** (full form: name/email/phone/bio/avatar/banner/city/category/GPS coords) + **Edit Provider modal** (same form minus credentials)
- `/admin/listings` — Listings moderation
- `/admin/commission` — Commission rate config per category + subscription plan pricing
- `/admin/payments` — Payment transactions
- `/admin/reports` — Revenue charts + top providers
- `/admin/subscriptions` — Subscriber management
- `/admin/staff` — Staff & Roles management with CRUD (role: super_admin/admin/moderator, 7 permission toggles)
- `/admin/settings` — Dynamic tabbed settings (General/Contact/Pages/FAQ/Security) all persisted to siteSettings DB
- `/admin/users` — User management with full profile view modal (avatar, name, email, phone, role, status, join date), click any row to open profile
- `/admin/categories`, `/admin/orders` — Management pages

**Monetization features:**
- Sponsored ad cards in search results (إعلان مدفوع)
- Top Provider crown badge (مزود مميز)
- Boost listing hover CTA (رفع الإعلان)
- Upgrade CTA in provider profile sidebar
- Commission display (عمولة المنصة: 10%)

### Authentication & RBAC
- **Session-based auth**: bcryptjs passwords, in-memory session Map, `httpOnly` cookies
- **Roles**: `user`, `provider`, `admin`
- **Login redirect**: user → `/user/dashboard`, provider → `/dashboard`, admin → `/admin/dashboard`
- **Header**: authenticated users see avatar + name with role dropdown (dashboard, orders, favorites, logout); unauthenticated see login/register buttons; mobile-responsive
- **Admin notifications**: inserting registration events auto-creates a notification row (userId=null = admin-only) so the admin bell immediately shows new user/provider signups
- **ProtectedRoute** component in `App.tsx` checks session before rendering; shows spinner during load, "Access Denied" on wrong role
- **PublicOnlyRoute**: redirects already-authenticated users to their dashboard (login/register/admin-login pages)
- **Forgot password**: POST `/auth/forgot-password` → returns reset token (dev: returned in JSON; prod: would be emailed). POST `/auth/reset-password` validates token (30 min TTL), updates password, invalidates all user sessions
- `logout()` in `AuthContext` clears server session and local user state

### API Server (`artifacts/api-server`)
- Express 5 API on port 8080
- Cookie-based session authentication (bcryptjs passwords, in-memory session map)
- Auto-seeds database on first start
- Routes mounted at `/api/*`:
  - `GET/POST /api/auth/register|login|logout|me|forgot-password|reset-password`
  - `GET /api/categories`
  - `GET /api/providers` (with `?search=&category=&city=&featured=`)
  - `GET /api/providers/:id` (includes services + reviews)
  - `PUT /api/providers/:id`, `PATCH /api/providers/:id/approve|suspend`
  - `GET/POST /api/providers/:id/services`
  - `PUT/DELETE /api/providers/:id/services/:sid`
  - `GET/POST /api/providers/:id/reviews`
  - `PATCH /api/reviews/:id/reply`
  - `POST /api/requests`, `GET /api/providers/:id/requests`, `GET /api/users/:id/requests`
  - `PATCH /api/requests/:id/status`
  - `GET/POST /api/packages`, `PUT/DELETE /api/packages/:id`
  - `GET/POST /api/users/:id/favorites`
  - `DELETE /api/users/:id/favorites/:providerId`
  - `GET /api/listings` — all services with provider + category info (admin view)
  - `PATCH /api/listings/:id` — update any listing (admin)
  - `DELETE /api/listings/:id` — delete any listing (admin)
  - `POST /api/categories`, `PUT /api/categories/:id`, `DELETE /api/categories/:id` — category CRUD
  - `GET /api/categories/:id/subcategories`, `POST /api/categories/:id/subcategories` — subcategory CRUD
  - `GET /api/subcategories`, `PUT /api/subcategories/:id`, `DELETE /api/subcategories/:id`
  - `GET /api/users`, `GET /api/users/:id`, `PUT /api/users/:id`, `PATCH /api/users/:id/status`, `DELETE /api/users/:id` — admin user management
  - `GET /api/admin/providers` — all providers including unapproved/suspended (admin)
  - `PATCH /api/providers/:id/reject` — reject provider
  - `GET /api/requests` — all orders/requests (admin, full details with user+provider+service)
  - `PATCH /api/requests/:id` — update order status + notes
  - `GET /api/notifications`, `POST /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`, `DELETE /api/notifications/:id`
  - `POST /api/upload/avatar` — multipart file upload (field: `avatar`, max 5MB, jpg/png/webp). Files stored at `uploads/avatars/`. Returns `{ url: "/uploads/avatars/filename" }`
  - `POST /api/upload/banner` — multipart file upload (field: `banner`, max 5MB, jpg/png/webp). Files stored at `uploads/banners/`. Returns `{ url: "/uploads/banners/filename" }`. Both upload endpoints served via Vite proxy at `/api-server/uploads/...`
  - `POST /api/providers/:id/subscribe` — provider subscribes to a package. Body: `{ packageId }`. Creates new subscription row with `startDate = now`, `endDate = now + package.durationDays`
  - `POST /api/auth/change-password` — authenticated password change (currentPassword, newPassword)
  - `GET /api/providers/:id/stats` — provider stats including subscription details (daysLeft, isActive, durationDays, packageNameAr, packagePrice)
  - `GET /api/providers/nearby?lat=&lng=&radius=&category=` — Haversine-filtered list of approved providers within radius (km, default 5), sorted by `distanceKm`
  - `POST /api/stcpay/create-session` — provider→subscription payment session (kind=`subscription`)
  - `POST /api/stcpay/create-request-session` — customer→service-request payment session (kind=`service_request`, body `{ providerId, serviceId?, amount }`). On success the return/webhook handler creates the request row, splits the amount into provider net + admin commission (`siteSettings.commissionPercent`, default 10), upserts `provider_balances`, and writes two `wallet_transactions` ledger rows.
  - `GET /api/stcpay/return`, `POST /api/stcpay/webhook`, `GET /api/stcpay/status/:refId` — gateway return/webhook/status (dispatch by `tx.kind`)
  - `GET /api/wallet/me` — authenticated provider's balance + last 50 ledger entries
  - `GET /api/admin/wallet` — total platform commission + last 50 commission entries
- **Provider status**: new self-registered providers default to `approved = false`; shown as "Pending" in admin panel with "تحت المراجعة" banner in ProviderLayout
- **Service status**: new provider-added services default to `"pending"` (admin must approve); seed data uses `"active"`
- **File uploads**: `api.upload.avatar(file)` returns `{ url: "/api-server/uploads/avatars/..." }` (proxy-compatible)

## Database Schema (`lib/db/src/schema/`)
- `categories` — Service categories with Arabic names, slugs, icons, description, image
- `subcategories` — Subcategories linked to parent categories
- `notifications` — In-app notifications (userId nullable = global/admin notifications)
- `users` — Users with name, email, hashed password, role (user/provider/admin), status (active/suspended)
- `packages` — Subscription packages (Free/Bronze/Premium) with commission rates
- `providers` — Provider profiles linked to users and categories; includes `latitude`/`longitude` (numeric 10,7), `verified`, `featured`, `whatsapp`, `banner`, `district`, `contactMethods` (JSON text array: call/whatsapp/chat/email)
- `services` — Services offered by providers
- `subscriptions` — Provider subscriptions to packages with date ranges
- `payments` — Payment records
- `paymentTransactions` — STC Pay transactions (refId, providerId, packageId nullable, kind `subscription`/`service_request`, userId, serviceId, amount, commissionAmount, status)
- `providerBalances` — Per-provider running balance (providerId PK, balance, updatedAt)
- `walletTransactions` — Append-only ledger (id, providerId nullable for platform commissions, type `request_payment`/`commission`/etc, amount, refId, note)
- `requests` — Service requests from users to providers (now includes `paymentRef`, `paidAmount`, `paidAt` for paid requests)
- `reviews` — Provider reviews with ratings and provider replies
- `favorites` — User favorites (user-provider pairs)
- `siteSettings` — Key/value site settings (siteName, siteNameEn, logoUrl, aboutContent, contactEmail/Phone/Address, faqContent JSON array, heroTitle, heroSubtitle, ctaText, ctaButtonText)
- `adminStaff` — Admin staff with role enum (super_admin/admin/moderator) and permissions JSON

## Seed Data (auto-runs on startup)
- 6 categories, 3 subscription packages (Free/Bronze/Premium)
- 1 admin user (admin@dalel.sa / admin123)
- 6 providers with services, subscriptions, and reviews
- Provider login: *@dalel.sa / provider123

---

## Laravel API Backend (`laravel-api/`)

A complete Laravel 11 API-only backend was generated to replace the Express backend, ready for cPanel/MySQL deployment.

### Stack
- **Framework**: Laravel 11 (PHP 8.2+)
- **Database**: MySQL (via Eloquent ORM)
- **Auth**: Laravel Sanctum (token-based, Bearer tokens)
- **Architecture**: Controllers / Services / API Resources / Form Requests / Middleware

### Key Directories
- `laravel-api/app/Models/` — 24 Eloquent models
- `laravel-api/app/Http/Controllers/` — 18 controllers (Auth, Provider, Service, Request, Review, Category, Region, Package, Notification, Message, Favorite, Setting, SupportTicket, Upload, StcPay, Admin)
- `laravel-api/app/Http/Resources/` — 8 API Resources (consistent `{ success, data }` format)
- `laravel-api/app/Http/Requests/Auth/` — Form Request validators
- `laravel-api/app/Http/Middleware/` — AdminOnly, CheckPermission, ProviderOnly
- `laravel-api/app/Services/StcPayService.php` — STC Pay gateway with test/simulator mode
- `laravel-api/database/migrations/` — 19 migration files (all tables)
- `laravel-api/database/seeders/` — Region, Category, Package, Admin, SiteSettings seeders
- `laravel-api/routes/api.php` — All API routes (public + auth + provider + admin)
- `laravel-api/api-docs/` — README.md, CPANEL_DEPLOYMENT.md, POSTMAN_COLLECTION.json, DATA_MODELS.md

### Tables (19 migrations)
users, regions, cities, areas, categories, subcategories, packages, providers, provider_service_areas, services, service_requests, reviews, payments, payment_transactions, subscriptions, notifications, messages, favorites, support_tickets, support_ticket_replies, admin_staff, provider_balances, wallet_transactions, site_settings, interactions, personal_access_tokens

### Default Credentials (after `php artisan db:seed`)
- Admin: `admin@daleel.sa` / `Admin@123456`
- Moderator: `moderator@daleel.sa` / `Mod@123456`

### Setup Commands (on server)
```bash
composer install --optimize-autoloader --no-dev
cp .env.example .env && php artisan key:generate
php artisan migrate --force && php artisan db:seed --force
php artisan storage:link
php artisan config:cache && php artisan route:cache
```

## Running on Replit

### How to run
The **Start application** workflow runs everything automatically when you press **Run**:
- Vite dev server (React frontend) on port 5000
- Express API server on port 8080
- Reverse-proxy (`health-server.mjs`) on port 20787 → 5000

### Environment variables already set
- `PORT=8080` — API server port
- `VITE_PORT=5000` — Vite dev server port
- `NODE_ENV=development`
- `SESSION_SECRET` — session signing secret (Replit Secret)
- `DATABASE_URL` — Replit's built-in PostgreSQL (runtime-managed)

### Optional environment variables (not required to run)
- `GOOGLE_CLIENT_ID` — for Google OAuth login
- `OPENAI_API_KEY` — for AI-assisted email features
- `CORS_ORIGIN` — explicit CORS origin (defaults to open in dev)

### Package management
The project uses pnpm workspaces with `node-linker=hoisted` (set in `.npmrc`).  
Run `pnpm install` from the workspace root to install all dependencies.

### API server hot reload
The workflow runs the API server via `tsx watch` — **no manual rebuild needed**.  
Editing any file under `artifacts/api-server/src/` automatically restarts the API server.

To produce a production bundle (for deployment), run:
```bash
pnpm --filter @workspace/api-server run build
```

---

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally
- `pnpm run build:deploy` — production build (vite build + esbuild api bundle)
- `pnpm run start:deploy` — production start (single Express process serving API + frontend statics)

## Deployment (Replit Autoscale)

The app uses a **two-process dev / single-process prod** architecture so it fits in autoscale's single public port:

- **Dev**: `pnpm dev` — Vite dev server on `:5000` proxies `/api/*` → API server on `:8080`. The Vite proxy forwards `X-Forwarded-Host` / `X-Forwarded-Proto` so backend redirect URLs (e.g. STC Pay return URLs) point at the browser-facing origin.
- **Prod (autoscale)**: `pnpm run start:deploy` — single Express process bound to `$PORT` that serves both `/api/*` and the built frontend (`artifacts/marketplace/dist/public`) with SPA fallback for client-side routes. `app.set("trust proxy", true)` ensures `X-Forwarded-*` from Replit's edge are honored.
- **Build**: `pnpm run build:deploy` runs `vite build` then esbuild on the api-server. Configured in `.replit` `[deployment]`.
