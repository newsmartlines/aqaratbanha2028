---
name: Subscription System Audit Findings
description: Results and fixes applied during the full Package & Subscription system audit
---

# Subscription System Audit — Findings & Fixes

## Architecture
- Dual subscription system: legacy `packages` table + new `billing_plans` table
- `subscriptions` table handles both via nullable `packageId` / `billingPlanId` columns
- Providers (real estate companies) → `subscriptions.providerId`
- Regular users → `subscriptions.userId`
- Payment records in `paymentsTable` (subscription receipts) and `paymentTransactionsTable` (gateway payments)

## Bugs Fixed

### Critical
1. **`GET /providers/:id/stats` — `bpNameAr` missing from SELECT + duplicate field bug**
   - `billingPlansTable.nameAr` was never selected; `resolvedNameAr` used `planNameAr ?? planNameAr` (same field twice)
   - `maxListings` was never returned in the stats subscription object
   - Fixed: added `bpNameAr` to select, fixed expression, computed and returned `maxListings`

2. **Free plan subscriptions never created a payment record for providers**
   - Both billing-plan path and legacy-package path only created payments for `requestedPrice > 0`
   - Requirement: free plans must appear in Payments page with amount=0, status=paid
   - Fixed: unconditionally create payment row; invoiceId prefixed `FREE-BP-*` or `FREE-*`

3. **No property publishing quota enforcement**
   - `POST /properties` had zero subscription/quota checks
   - Fixed: added `checkProviderQuota()` helper that reads active subscription, resolves `maxListings` from plan limits, counts current active/pending properties, and returns 403 with `code: "QUOTA_EXCEEDED"` if over limit

4. **`GET /providers/:id` showed stale/expired subscriptions**
   - Got most recent subscription regardless of status or endDate
   - Fixed: filter to `status=active AND endDate > NOW()`

5. **`GET /users/me/payments` — provider lookup only fetched `providerIds[0]`**
   - `where(eq(usersTable.id, providerIds[0]))` — only first provider
   - Fixed: use `inArray(usersTable.id, providerIds)` for all

6. **`GET /providers/me/payments` — customer lookup had no WHERE clause**
   - Selected all users from DB when any customer IDs existed
   - Fixed: `inArray(usersTable.id, userIds)`

### Minor
7. **Frontend `hasUsedFreePlan` only checked current active sub**
   - If free sub expired and user had no active sub, could re-select free in UI
   - Fixed: also checks subscription history for any free plan entry

8. **Admin subscriptions — no `pendingCount` in totals**
   - Added `pendingCount` to the totals object in `GET /admin/subscriptions`

9. **Auto-expire past-due subscriptions** 
   - Records with `status='active'` and `endDate < now` weren't expired in DB
   - Fixed: background update in stats, subscriptions-history (providers + users), and admin subscriptions endpoints

## Key Constraints
- Free plan: checked by `existingSubs.length > 0` on provider/user — blocks free if ANY prior sub exists (correct per requirements)
- Admin users bypass property quota enforcement
- `billingPlanId` FK is not enforced at DB level (no constraint in schema) — data integrity risk if plans are deleted

**Why:** These bugs caused incorrect payment history, broken subscription display, no ad limits enforcement, and data inconsistencies between subscription history and payment records.

**How to apply:** Changes are in `providers.ts`, `properties.ts`, `userPayments.ts`, `adminPayments.ts`, `users.ts` (backend) and `packages.tsx` (frontend).
