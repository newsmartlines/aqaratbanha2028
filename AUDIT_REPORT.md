# Full-Stack Security & Quality Audit Report
## Dalil Real Estate Marketplace (عقارات بنها)
**Date:** 2026-07-27  
**Auditor:** Replit Agent  
**Stack:** React 19 + Vite / Express 5 + Node.js / PostgreSQL + Drizzle ORM / pnpm monorepo

---

## Executive Summary

A comprehensive audit was conducted across all 15 domains: authentication, dashboards, properties, subscriptions, promotions, payments, emails, notifications, admin panel, APIs, database, frontend, business logic, security, and performance.

**9 issues were found and fixed in this session.** No Critical issues remain open. All High and Medium issues identified are either fixed or documented below.

---

## Issues Fixed

### 🔴 Critical

#### 1. Provider-Owned Properties Could Not Be Renewed — `routes/properties.ts`
**Problem:** The `PATCH /properties/:id/renew` endpoint checked ownership only via `ownerUserId`. Properties belonging to a provider (where `ownerUserId` is null and `providerId` is set) could never be renewed — providers were permanently locked out.  
**Fix:** Added `isOwnerViaProvider` check using `session.providerId === property.providerId`. A provider user can now renew their own listings.

#### 2. Admin Bump Hardcoded `userId = 1` for Provider Properties — `routes/promotions.ts`
**Problem:** `POST /admin/properties/:id/bump` used `property.ownerUserId ?? 1` to assign bump ownership. Any provider-owned property (no `ownerUserId`) silently recorded the bump against userId 1 — corrupting data.  
**Fix:** Added a DB lookup to resolve the provider's owner userId (`providersTable.userId`) before inserting. Falls back to the acting admin's userId only if the provider row is also missing.

---

### 🟠 High

#### 3. Provider Subscribe Endpoint Had No Ownership Check — `routes/providers.ts`
**Problem:** `POST /providers/:id/subscribe` required no authentication and no ownership verification. Any HTTP client could subscribe any provider to any plan (including paid ones) by guessing their numeric ID.  
**Fix:** Added full session resolution + ownership check before the billing path executes. Only the provider's own user (or an admin) may subscribe on their behalf.

#### 4. Property Event Notifications Silently Skipped Provider Properties — `lib/event-service.ts`
**Problem:** `onPropertyApproved`, `onPropertyRejected`, `onPropertyExpired`, `onPropertySubmitted`, `onPropertyUpdatedAfterRejection`, and `onPropertyDeleted` all used `property.ownerUserId` directly. For provider-owned properties (where `ownerUserId` is always null), no email was sent and no in-app notification was created.  
**Fix:** Added `resolvePropertyOwnerUserId()` helper that falls back to `providersTable.userId` when `ownerUserId` is null. All 6 event handlers now use this resolver.

#### 5. Public Stats Counted Only `active` Properties, Missed `approved` — `routes/stats.ts`
**Problem:** The public `/api/stats` and all admin stats queries filtered `WHERE status = 'active'`. In the actual lifecycle, freshly approved listings may have status `approved` before expiry transitions them. The displayed property count could be significantly understated.  
**Fix:** All property count queries now use `OR (status = 'active' OR status = 'approved')`.

#### 6. Admin Revenue Stats Missed `paymentsTable` — `routes/stats.ts`
**Problem:** `GET /admin/stats` calculated `totalRevenue` from `paymentTransactionsTable` (gateway payments) only. Subscription payments recorded directly in `paymentsTable` (bank transfers, manual approvals) were entirely excluded — revenue was always under-reported.  
**Fix:** Replaced the single-table SUM with a raw SQL expression that sums both tables: `payment_transactions WHERE status='paid'` + `payments WHERE status IN ('paid','approved')`.

---

### 🟡 Medium

#### 7. Support Tickets Showed Blank Identity for Non-Provider Submitters — `routes/admin.ts`
**Problem:** `GET /admin/support-tickets` joined `supportTicketsTable → providersTable → usersTable`. Tickets submitted by regular users (with `userId` set but no `providerId`) had null in all name/email columns in the admin view.  
**Fix:** Added a second `aliasedTable` join `directUser` on `supportTicketsTable.userId = users.id`. The response now coalesces both paths: provider-path first, direct-user-path as fallback.

#### 8. Free Plan Could Not Be Reclaimed After Subscription Cancellation — `routes/providers.ts`
**Problem:** The free-plan guard checked `WHERE providerId = id LIMIT 1` — any subscription in any status blocked re-subscription. A provider who cancelled their free plan (e.g. to test, or due to admin deletion) was permanently locked out of it.  
**Fix:** The guard now filters `WHERE status != 'cancelled'`, so genuinely cancelled subscriptions do not block the free plan.

#### 9. Provider Interaction Counts Were Publicly Accessible — `routes/providers.ts`
**Problem:** `GET /providers/:id/interactions` had no authentication or authorisation. Internal analytics (phone, WhatsApp, message click counts) were exposed to any unauthenticated caller.  
**Fix:** Added session check + ownership verification (provider owner or admin). Unauthenticated callers receive `401`; unauthorised callers receive `403`.

---

## Issues Reviewed & Not Fixed (Low / Informational)

| # | Location | Description | Severity | Status |
|---|----------|-------------|----------|--------|
| 10 | `properties.ts` | Hardcoded WhatsApp notify number `"00201066638523"` as fallback | Low | Acceptable — used only when settings row missing; no data leak |
| 11 | `properties.ts` | Saved-search alerts: no limit on how many searches are evaluated | Low | Performance concern at scale; no functional bug |
| 12 | `providers.ts` | Billing-plan paid subscriptions activate immediately (bypass admin approval) | Arch | Intentional by design per code comments |
| 13 | `auth.ts` | `emailVerified` cast via `as any` | Low | Cosmetic; runtime is correct; schema column exists |
| 14 | `app.ts` | `CORS_ORIGIN` not enforced in dev | Info | Dev-only; correctly gated on `NODE_ENV` |
| 15 | `providers.ts` | `DELETE /providers/:id` relies on DB cascades for full cleanup | Info | Cascades are defined in schema; documented in code |

---

## Architecture Notes (No Changes Required)

- **Session management** — PostgreSQL-backed 30-day sessions, httpOnly/sameSite cookies. Correct.  
- **Admin gate** — `adminOnly` middleware checks both `users.role='admin'` and live `adminStaff` lookup by email. Correct.  
- **Rate limiting** — Global / admin / upload limiters configured at app level. Brute-force on login is active.  
- **Helmet CSP** — Applied. CORS locked to `CORS_ORIGIN` in production.  
- **Password storage** — bcrypt with appropriate rounds. Correct.  
- **Subscription scheduler** — Hourly cron for expiry + multi-day pre-expiry email notifications. Working.  
- **Event service** — Fire-and-forget design (never throws, logs all email send attempts). Correct.  
- **Drizzle schema** — Indexes on all major FK and filter columns (status, providerId, userId, endDate). Correct.

---

## Summary

| Severity | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| Critical | 2 | 2 | 0 |
| High | 4 | 4 | 0 |
| Medium | 3 | 3 | 0 |
| Low / Info | 6 | 0 | 6 (acceptable) |
| **Total** | **15** | **9** | **6** |
