# Subscription & Billing Architecture Report
**Dalil — Real Estate Marketplace (دليل عقارات بنها)**
*Generated: July 28, 2026 — Read-only analysis, no code was modified.*

---

## Table of Contents
1. [Architecture](#architecture)
2. [Plans](#plans)
3. [Payments](#payments)
4. [Activation](#activation)
5. [Quotas](#quotas)
6. [Dashboard](#dashboard)
7. [Admin](#admin)
8. [Notifications](#notifications)
9. [Analytics](#analytics)
10. [Edge Cases](#edge-cases)
11. [Security](#security)
12. [Final Evaluation](#final-evaluation)
13. [Dependency Map](#dependency-map)
14. [Disconnected Components](#disconnected-components)
15. [Prioritized Improvements](#prioritized-improvements)
16. [Final Verdict](#final-verdict)

---

## Architecture

### Q1. How does the complete subscription lifecycle work from beginning to end?

**How it works now:**
The lifecycle has two parallel paths — one for Providers (real estate companies) and one for regular Users:

**Provider path (company):**
1. Provider visits `/dashboard/packages`, sees plans filtered by `userType=company`
2. For a **free plan**: clicks "Subscribe" → `POST /api/providers/:id/subscribe` with `billingPlanId` → subscription inserted with `status=active` immediately, payment record created (`amount=0, status=paid`)
3. For a **paid plan**: clicks "Subscribe" → selects payment gateway (Vodafone Cash, Fawry, Instapay, Bank Transfer) → navigates to `/pay/subscription` → uploads receipt → `POST /api/payments/subscription-request` → subscription inserted with `status=pending`, payment record with `status=pending`
4. Admin reviews pending payment in `/admin/payments` → clicks "Approve" → `POST /api/admin/payments/:paymentId/approve-subscription` → subscription updated to `status=active`, `startDate`/`endDate` reset from now, provider marked `verified=true`
5. Scheduler (`subscription-scheduler.ts`) runs hourly: sends warnings at 7/3/1 days, marks expired subs as `status=expired`

**User path (individual):**
1. User visits `/dashboard/packages`, sees plans filtered by `userType=user`
2. For a **free plan**: `POST /api/users/:userId/subscribe` → immediate activation
3. For a **paid plan**: `POST /api/payments/subscription-request` → pending state → admin approval

**Files responsible:**
- `artifacts/api-server/src/routes/providers.ts` (provider subscribe flow, L680–L950)
- `artifacts/api-server/src/routes/users.ts` (user subscribe + subscription-request, L230–L468)
- `artifacts/api-server/src/routes/adminPayments.ts` (approve/reject, L396–L512)
- `artifacts/api-server/src/lib/subscription-scheduler.ts` (expiry + warnings)
- `artifacts/marketplace/src/pages/dashboard/packages.tsx` (frontend)
- `artifacts/marketplace/src/pages/pay/subscription.tsx` (payment evidence upload)

**Database tables:** `subscriptions`, `payments`, `payment_transactions`, `billing_plans`, `packages`, `providers`, `users`, `notifications`

**Fully implemented:** YES (with caveats — see weaknesses)

**Weaknesses:**
- No real payment gateway integration (Stripe, PayPal, Paymob, etc.) — all paid subscriptions rely on manual admin approval after screenshot upload
- Provider free-plan check uses `status != 'cancelled'` (old packages path) vs. only checking `status=active` (user path) — inconsistent logic

**Recommendation:** Integrate a real payment gateway (Paymob is dominant in Egypt). The manual receipt → admin approval model does not scale.

---

### Q2. Draw the complete flow from clicking "Buy Plan" until the subscription becomes active

**How it works now:**

```
[User clicks "Buy Plan"]
         │
         ▼
  Is plan price = 0?
    /          \
  YES           NO
   │             │
   ▼             ▼
POST /subscribe  Select gateway (Vodafone/Fawry/Instapay/Bank)
(immediate)      → navigate to /pay/subscription
   │             │
   ▼             ▼
subscriptions    Upload payment receipt / reference number
INSERT           │
status=active    ▼
   │        POST /payments/subscription-request
   │             │
   ▼             ▼
payments     subscriptions INSERT (status=pending)
INSERT       payments INSERT (status=pending)
status=paid       │
   │              ▼
   │         Admin notified (in-app + dashboard)
   │              │
   │              ▼
   │         Admin reviews /admin/payments
   │              │
   │         Approve → POST /admin/payments/:id/approve-subscription
   │              │
   │              ▼
   └────────► subscriptions UPDATE status=active
              startDate = now, endDate = now + duration
              payments UPDATE status=paid
              provider UPDATE verified=true
              User notified (in-app + email)
```

**Fully implemented:** YES for the UI flow. The payment evidence step is manual (no automated gateway).

---

### Q3. Which frontend pages participate in the subscription flow?

**How it works now:**

| Page | Role |
|------|------|
| `/pricing` | Public pricing display |
| `/dashboard/packages` (`packages.tsx`) | Main subscription management — view current plan, select new plan, view history |
| `/pay/subscription` (`pay/subscription.tsx`) | Payment evidence submission for paid plans |
| `/pay/listing` (`pay/listing.tsx`) | Per-listing payment (separate from subscription) |
| `/real-estate-onboarding.tsx` | Provider onboarding — includes plan selection step |
| `Step5Plans.tsx` (property form wizard) | Plan selection within property add flow |
| `PaymentDialog.tsx` | Gateway selection dialog |
| `PlanCard.tsx` | Reusable plan display component |

**Files responsible:** All under `artifacts/marketplace/src/pages/` and `artifacts/marketplace/src/components/property-form/`

**Fully implemented:** YES — all pages exist and are wired to the API.

**Weaknesses:** No dedicated "subscription success/confirmation" page after payment submission; the user sees an inline pending banner on `/dashboard/packages`.

**Recommendation:** Add a `/dashboard/packages/pending` confirmation page with estimated review time.

---

### Q4. Which backend routes handle each step?

**How it works now:**

| Step | Route | File |
|------|-------|------|
| List available plans | `GET /api/billing/plans?userType=company\|user` | `billingPlans.ts` |
| Provider free plan subscribe | `POST /api/providers/:id/subscribe` | `providers.ts` |
| Provider stats (current sub) | `GET /api/providers/:id/stats` | `providers.ts` |
| Provider sub history | `GET /api/providers/:id/subscriptions-history` | `providers.ts` |
| User free plan subscribe | `POST /api/users/:userId/subscribe` | `users.ts` |
| Submit paid plan evidence | `POST /api/payments/subscription-request` | `users.ts` |
| User current subscription | `GET /api/users/:userId/current-subscription` | `users.ts` |
| User payment history | `GET /api/users/me/payments` | `userPayments.ts` |
| Provider payment history | `GET /api/providers/me/payments` | `userPayments.ts` |
| Admin list all subscriptions | `GET /api/admin/subscriptions` | `adminPayments.ts` |
| Admin list all payments | `GET /api/admin/payments` | `adminPayments.ts` |
| Admin approve subscription | `POST /api/admin/payments/:id/approve-subscription` | `adminPayments.ts` |
| Admin reject subscription | `POST /api/admin/payments/:id/reject-subscription` | `adminPayments.ts` |
| Admin manage plans | `GET/POST/PUT/DELETE /api/admin/billing/plans` | `billingPlans.ts` |
| Admin billing dashboard | `GET /api/admin/billing/dashboard` | `billingPlans.ts` |
| Renew subscription | `PATCH /api/properties/:id/renew` (via re-subscribe) | `providers.ts` |

**Fully implemented:** YES — all steps have corresponding routes.

**Weaknesses:** No `DELETE /api/subscriptions/:id` (user cannot self-cancel). No `PATCH /api/admin/subscriptions/:id/extend` (admin cannot directly edit expiry date from the subscriptions panel — must go through payments).

---

### Q5. Which database tables are involved?

**How it works now:**

| Table | Purpose | Key Columns |
|-------|---------|-------------|
| `billing_plans` | Plan catalog | `id`, `name`, `nameAr`, `price`, `yearlyPrice`, `durationDays`, `userType`, `status`, `limits` (JSON), `features` (JSON), `commissionPercent` |
| `packages` | Legacy plan catalog | `id`, `nameAr`, `nameEn`, `price`, `durationDays`, `maxListings`, `featuredAllowed` |
| `subscriptions` | Active/historical subscriptions | `id`, `providerId`, `userId`, `packageId`, `billingPlanId`, `planName`, `planNameAr`, `planPrice`, `startDate`, `endDate`, `status` |
| `payments` | Payment receipts (manual + free) | `id`, `providerId`, `userId`, `type`, `amount`, `status`, `invoiceId`, `planName` |
| `payment_transactions` | Gateway-linked transactions | `id`, `refId`, `providerId`, `packageId`, `kind`, `userId`, `amount`, `commissionAmount`, `gateway`, `status`, `paidAt` |
| `providers` | Provider profiles | `id`, `userId`, `verified`, `active`, `approved`, `suspended` |
| `users` | User accounts | `id`, `email`, `role`, `status` |
| `notifications` | In-app notifications | `id`, `userId`, `title`, `message`, `type`, `link`, `read` |
| `commission_rules` | Commission configuration | `id`, `type`, `value`, `isPercentage`, `planId`, `userType` |
| `coupons` | Discount coupons | `id`, `code`, `discountType`, `discountValue`, `maxUses`, `usedCount` |

**Fully implemented:** YES — schema is complete with proper indexes on `status`, `endDate`, `providerId`, `userId`.

**Weaknesses:**
- `subscriptions.status` has no DB-level constraint (it's a plain `text` column with default `'active'`) — any string value can be inserted
- `limits` and `features` columns on `billing_plans` are stored as plain JSON strings, not JSONB — no ability to query individual limit values in SQL
- No `coupon_uses` join table; `coupons.usedCount` is an integer counter only — no audit trail of which user used which coupon

---

### Q6. Which scheduled jobs (cron/scheduler) affect subscriptions?

**How it works now:**

`lib/subscription-scheduler.ts` contains two functions started by `startSubscriptionScheduler()` in `artifacts/api-server/src/index.ts`:

**`runSubscriptionScheduler()`** — runs immediately on startup, then every hour:
1. `UPDATE subscriptions SET status='expired' WHERE status='active' AND end_date <= NOW()` — marks all overdue active subs as expired, then sends email (`mailer.subscriptionExpired`) and in-app notification to each affected user
2. For each warning window (7 days, 3 days, 1 day before expiry ±1 hour): finds active subs expiring in that window, sends email (`mailer.subscriptionExpiryWarning`) and in-app notification

**`runPromotionScheduler()`** — runs on the same interval:
1. Marks expired promotion purchases as `expired`, deactivates linked `property_promotions`, resets `featured`/`urgent` flags on properties
2. Sends 3-day and 1-day warnings for expiring promotions

**Just-in-time expiry** (non-scheduler): `GET /admin/subscriptions` also does a background `UPDATE status='expired'` for any past-due active subs it encounters during the query.

**Files responsible:** `artifacts/api-server/src/lib/subscription-scheduler.ts`, `artifacts/api-server/src/index.ts`

**Fully implemented:** YES

**Weaknesses:**
- `setInterval` in Node.js is not a reliable cron — it drifts, does not survive server restarts mid-interval, and has no catch-up mechanism
- Warning notifications are sent on every hourly tick that falls within the ±1 hour window — a subscriber could receive multiple warnings for the same day if the server is restarted
- No deduplication check before sending warning notifications (no `notified_7d`, `notified_3d`, `notified_1d` flags on the subscription)
- Provider subscriptions that expire are not looked up via `provider.userId` in the scheduler — only `subscriptions.userId` is used; a provider whose subscription has only `providerId` set (and no `userId`) will not receive an expiry email

**Recommendation:** Use a proper job scheduler (node-cron or pg-boss). Add `notifiedDays` column to `subscriptions` to prevent duplicate notifications.

---

## Plans

### Q7. How are Free plans handled?

**How it works now:**
Free plans have `price=0` in `billing_plans`. When a provider or user selects a free plan:
- Provider path (`POST /api/providers/:id/subscribe`): inserts subscription with `status=active` immediately; inserts a `payments` record with `amount=0, status=paid, gateway=free`
- User path (`POST /api/users/:userId/subscribe`): same — immediate activation, payment record with `amount=0, status=paid`

No admin approval is required. No payment evidence is needed.

**Files:** `providers.ts` L717–L822, `users.ts` L268–L329

**Fully implemented:** YES

**Weaknesses:** The free plan is enforced at the API layer but there is no `isFree` flag on the plan — it's inferred by `price == 0`. If a plan is accidentally priced at 0 and meant to be paid, it will auto-activate.

---

### Q8. Can a user claim the Free plan more than once?

**How it works now:** NO — both paths check before inserting.

**Provider path** (`providers.ts` L718–L732): queries for any non-cancelled subscription for that `providerId`. If any exists → `409 Conflict`.

**User path** (`users.ts` L268–L277): queries for any `status=active` subscription for that `userId`. If any exists → `409 Conflict`.

**Frontend** (`packages.tsx` L440–L457): `hasUsedFreePlan` is `true` if current sub price is 0 OR any history item has `planPrice == null || price == 0`. Shows toast "لا يمكن تفعيل الباقة المجانية أكثر من مرة" and blocks the mutation.

**Fully implemented:** YES — enforced at both frontend and backend.

**Weaknesses:** The provider check uses `status != 'cancelled'` (blocks even if previous subscription expired or was rejected), while the user check only looks for `status=active`. This means a provider can never reclaim the free plan even after their paid subscription expires, while a user can re-claim it after their free subscription expires. The behavior is asymmetric.

---

### Q9. How is free plan prevention enforced?

**How it works now:**
Three-layer enforcement:
1. **Frontend** (`packages.tsx` `hasUsedFreePlan` flag) — blocks before API call
2. **Backend validation** — provider path: `existingSubs.length > 0` check on non-cancelled subs; user path: active sub check
3. **HTTP 409** response if the API check fails

**Fully implemented:** YES (with the asymmetry noted above)

---

### Q10. Can an admin reset the Free plan eligibility?

**How it works now:** NO — there is no admin endpoint or UI action to reset free plan eligibility. The admin can cancel/delete subscriptions from the database directly, but there is no first-class "reset free trial" feature.

**Fully implemented:** NO

**Recommendation:** Add a `POST /api/admin/providers/:id/reset-free-plan` endpoint that cancels any non-active subscription (leaving active ones intact) to allow re-claiming.

---

### Q11. How are Paid plans handled?

**How it works now:**
Paid plans (`price > 0`) follow the manual payment flow:
1. User selects gateway in `PaymentDialog`
2. Navigates to `/pay/subscription` with plan details in query string
3. Uploads screenshot/reference of payment
4. `POST /api/payments/subscription-request` creates subscription (`status=pending`) and payment (`status=pending`)
5. Admin approves via `POST /api/admin/payments/:id/approve-subscription`
6. Subscription becomes active; dates reset from approval moment

**Note:** There is also a direct subscription path in `providers.ts` that creates a subscription with `status=active` immediately for paid plans (the billingPlan path, L737–L751). This path is meant for simulated/onboarding flows but is not gated — it can be called by any authenticated provider owner.

**Weaknesses:**
- The direct `POST /api/providers/:id/subscribe` with `billingPlanId` for a paid plan immediately creates an `active` subscription without payment verification. This is a **critical security gap** — any provider can activate a paid subscription for free.

---

### Q12. Can a provider own multiple active plans?

**How it works now:** YES — there is no uniqueness constraint on `subscriptions(providerId, status='active')` in the database. The API does not check for existing active subscriptions before inserting a new one (except for the free plan check). The `stats` endpoint returns the most recent active subscription by `endDate DESC LIMIT 1`, so only one is "effective," but multiple active rows can coexist in the table.

**Fully implemented:** PARTIAL — quota uses the latest active subscription, but data integrity is not enforced.

**Weaknesses:** Multiple active paid subscriptions could accumulate if a provider subscribes multiple times. The admin would see misleading MRR figures.

**Recommendation:** Add a unique partial index: `CREATE UNIQUE INDEX ON subscriptions(provider_id) WHERE status = 'active'`, or deactivate existing active subs before inserting a new one.

---

### Q13. Which plan is considered active?

**How it works now:**
- **Provider stats** (`providers.ts` stats endpoint): queries `WHERE providerId=? AND status='active' AND endDate > NOW() ORDER BY endDate DESC LIMIT 1` — the subscription with the furthest-future end date wins
- **User current subscription** (`users.ts` `GET /users/:userId/current-subscription`): `WHERE userId=? AND status='active' AND endDate > NOW() ORDER BY createdAt DESC LIMIT 5` then finds first match — most recently created active sub wins
- **Quota check** (`properties.ts`): `WHERE (providerId=? OR userId=?) AND status='active' AND endDate > NOW() ORDER BY id DESC LIMIT 1` — most recently inserted wins

**Fully implemented:** YES (consistent enough for the quota use-case)

**Weaknesses:** Different routes use slightly different ordering (endDate DESC vs. createdAt DESC vs. id DESC) — this could yield different "active" plans in edge cases with multiple active subscriptions.

---

## Payments

### Q14. What happens after clicking Buy?

**How it works now (free plan):**
1. `handleSubscribeClick` → `setConfirmOpen(true)` → user confirms → `subscribeMutation.mutate(plan)`
2. For providers: `api.subscriptions.subscribe(providerId, plan.id, true)` → `POST /api/providers/:id/subscribe`
3. For users: `api.userSubscription.subscribe(userId, plan.id)` → `POST /api/users/:userId/subscribe`
4. Subscription and payment record created, notifications sent, query cache invalidated, success toast shown

**How it works now (paid plan):**
1. `handleSubscribeClick` → `setPayModalOpen(true)` → user selects gateway → `handleGoToPay()`
2. Navigates to `/pay/subscription?planName=...&price=...&planId=...&gateway=...`
3. User uploads payment evidence
4. `POST /api/payments/subscription-request` creates pending subscription + payment
5. Admin notification sent; user sees "قيد المراجعة" banner on `/dashboard/packages`

**Fully implemented:** YES

---

### Q15. Is a payment record always created?

**How it works now:** YES — every subscription activation creates at least one payment record:
- Free provider sub: `paymentsTable` INSERT with `amount=0, status=paid` (invoiceId `FREE-BP-*`)
- Paid provider sub (immediate): `paymentsTable` INSERT with `status=paid` (invoiceId `BP-*`)
- Paid plan via subscription-request: `paymentsTable` INSERT with `status=pending` (invoiceId `SUB-REQ-*`)
- Free user sub: `paymentsTable` INSERT with `amount=0, status=paid` (invoiceId `USER-SUB-*`)

**Fully implemented:** YES

**Weaknesses:** The legacy packages path (old system) also inserts a `paymentTransactionsTable` row for backward compatibility, creating two records for one subscription event. De-duplication logic in `loadPayments()` (adminPayments.ts L114–L147) uses `invoiceId` matching to avoid double-counting, but this is fragile.

---

### Q16. Does every payment appear in Admin Payments?

**How it works now:** YES — `GET /api/admin/payments` calls `loadPayments()` which merges both `paymentTransactionsTable` (gateway payments) and `paymentsTable` (subscription receipts including free plans). Records with matching `invoiceId`/`refId` are de-duplicated. The result is returned as a unified list.

**Fully implemented:** YES

**Weaknesses:** The `invoiceId` in `paymentsTable` and `refId` in `paymentTransactionsTable` use different formats — de-duplication depends on exact string match. If either is `null`, both records appear.

---

### Q17. Does every payment appear in User Payments?

**How it works now:** `GET /api/users/me/payments` (`userPayments.ts`) merges three sources:
1. `payment_transactions WHERE userId = me` (service request payments as customer)
2. `payments WHERE userId = me AND type = 'subscription'` (user subscription receipts)
3. Legacy: `subscriptions JOIN providers WHERE providers.userId = me` (old package subscriptions via provider)

De-duplication via `invoiceId` matching between sources 2 and 3.

**Fully implemented:** YES

**Weaknesses:** Source 3 maps subscription `status=active|expired` to `status=paid`, which is misleading for a pending subscription.

---

### Q18. Does every payment appear in Provider Payments?

**How it works now:** `GET /api/providers/me/payments` (`userPayments.ts`) merges:
1. `payment_transactions WHERE providerId = me` (incoming service-request payments from customers)
2. `payments WHERE providerId = me AND type = 'subscription'` (outgoing subscription payments)

**Fully implemented:** YES

**Weaknesses:** Source 2 only captures billing-plan subscriptions recorded in `paymentsTable`; old `paymentTransactionsTable`-based subscriptions are in source 1 but tagged as `kind=subscription`. The frontend shows both together which works, but the data structures are redundant.

---

### Q19. Are free plans also recorded as payments?

**How it works now:** YES — both provider and user free plan activations insert a `paymentsTable` record with `amount='0.00'`, `status='paid'`. These appear in Admin Payments (tagged as `gateway: free` for user subs or `gateway: manual` for provider subs).

**Fully implemented:** YES

---

### Q20. Can any payment disappear from reports?

**How it works now:** Technically YES, in two scenarios:
1. **Provider deletion**: `paymentsTable.providerId` has `ON DELETE SET NULL` — if a provider is deleted, their payments remain but `providerName` becomes `null` in the report
2. **User deletion**: same — `userId` is `SET NULL` on user delete
3. **De-duplication bug**: if both a `paymentTransactionsTable` row and a `paymentsTable` row exist with the same `invoiceId`/`refId` value, only the `paymentTransactionsTable` version appears (the other is filtered by the `seenRefs` set)

**Fully implemented:** PARTIAL — payments are not hard-deleted, but can lose their subscriber attribution.

---

## Activation

### Q21. Who activates subscriptions?

| Type | Who activates | How |
|------|--------------|-----|
| Free plan (provider) | System automatically | `POST /api/providers/:id/subscribe` |
| Free plan (user) | System automatically | `POST /api/users/:userId/subscribe` |
| Paid plan (user/provider) | **Admin manually** | `POST /api/admin/payments/:id/approve-subscription` |
| Direct provider subscribe (paid) | **System automatically** | `POST /api/providers/:id/subscribe` — critical security gap |

**Fully implemented:** YES for free plans, PARTIAL for paid plans (relies on human admin)

---

### Q22. What happens after approval?

**How it works now** (`adminPayments.ts` L396–L463):
1. Fetches payment record, validates `status=pending`
2. Extracts `subscriptionId` from `invoiceId` format `SUB-REQ-{id}`
3. Updates `subscriptions SET status='active', startDate=NOW(), endDate=NOW()+originalDuration`
4. Updates `payments SET status='paid'`
5. If provider subscription: `UPDATE providers SET verified=true`
6. Sends in-app notification to subscriber
7. Fires `events.onPackagePurchased` → sends email confirmation

**Fully implemented:** YES

**Weaknesses:**
- `originalDuration` is computed as `endDate - startDate` from the pending subscription (which was set at request time). If approval is significantly delayed, the duration is preserved correctly, but `startDate` is reset to now — this is correct behavior.
- No check for concurrent approvals of the same payment

---

### Q23. What happens after rejection?

**How it works now** (`adminPayments.ts` L466–L512):
1. Validates `status=pending`
2. If `invoiceId` matches `SUB-REQ-{id}`: `UPDATE subscriptions SET status='cancelled'`
3. `UPDATE payments SET status='failed'`
4. Sends in-app notification to user with optional rejection reason

**Fully implemented:** YES

**Weaknesses:**
- Status set to `cancelled` on subscriptions and `failed` on payments — these are different words for the same event (rejection). Inconsistent semantics.
- No email sent on rejection (only in-app notification)

**Recommendation:** Add rejection email; use `rejected` status for subscriptions (not `cancelled`) to distinguish admin rejection from user cancellation.

---

### Q24. What happens after cancellation?

**How it works now:** There is **no user-initiated cancellation** in the current implementation. Users cannot self-cancel their subscription. The admin can only reject a *pending* subscription. There is no admin endpoint to cancel an active subscription.

**Fully implemented:** NO — cancellation is not a supported action for active subscriptions.

**Recommendation:** Add `POST /api/admin/subscriptions/:id/cancel` to deactivate active subscriptions and `POST /api/providers/:id/cancel-subscription` for self-service cancellation.

---

### Q25. What happens after expiration?

**How it works now:**
1. `subscription-scheduler.ts` (hourly): `UPDATE subscriptions SET status='expired' WHERE status='active' AND endDate <= NOW()` → email + in-app notification sent
2. Just-in-time: `GET /admin/subscriptions` and some provider routes detect past-due active subs and trigger a non-blocking background update
3. Quota enforcement: `checkProviderQuota` / `checkUserQuota` use `endDate > NOW()` filter, so expired subs are automatically excluded — provider is blocked from adding new listings
4. **Existing listings are NOT deactivated or hidden** — they remain visible with their current status

**Fully implemented:** YES for expiry marking and notifications. NO for auto-deactivating listings.

**Weaknesses:** After expiry, existing approved/active listings remain live indefinitely. Real estate portals like Property Finder deactivate all listings when a subscription expires.

**Recommendation:** On expiry, optionally set property `status='expired'` or `featured=false` depending on the platform's policy.

---

## Quotas

### Q26. How is max listings calculated?

**How it works now:**
- **Provider** (`checkProviderQuota`, `properties.ts` L527): reads `billing_plans.limits` JSON → `limits.properties` field. Falls back to `packages.maxListings`. Returns `null` (unlimited) if value is `-1` or null.
- **User** (`checkUserQuota`, `properties.ts` L471): reads `billing_plans.limits` → `limits.properties`. Default is `3` if no active subscription exists.

**Files:** `artifacts/api-server/src/routes/properties.ts` L471–L585

**Fully implemented:** YES

**Weaknesses:** `limits` is stored as a JSON string — no database-level type safety. If the JSON is malformed, the catch block silently uses the default (3 for users, null/"no sub" error for providers).

---

### Q27. Where is quota enforced?

**How it works now:** Quota is enforced **only at `POST /api/properties`** (listing creation). It is NOT enforced at:
- `PUT /api/properties/:id` (listing update) — no quota check
- `POST /api/admin/properties` (admin adding property) — admin bypasses
- Property status changes (e.g., re-approving a rejected listing)

**Fully implemented:** PARTIAL

**Weaknesses:** If an admin approves a large batch of properties, the quota is not retroactively enforced. The "used" count at `checkProviderQuota` counts `status IN ('approved', 'active', 'pending')` — pending listings that are ultimately rejected still count against the quota until resolved.

---

### Q28. Can quota be bypassed?

**How it works now:**
- **Admin users** (`role='admin'`): YES — explicitly skipped (`if (!isAdmin)` gate at `properties.ts` L616)
- **Direct database access**: YES
- **Race condition**: Two simultaneous `POST /api/properties` from the same provider could both pass the quota check before either is committed — no database-level uniqueness constraint prevents this

**Fully implemented:** PARTIAL — admin bypass is intentional; race condition is a bug.

**Recommendation:** Add a database trigger or use a serializable transaction for the quota check + insert.

---

### Q29. What happens when the quota is exceeded?

**How it works now:** `HTTP 403 Forbidden` with `{ success: false, error: "لقد وصلت إلى الحد الأقصى...", code: "QUOTA_EXCEEDED" }`.

The frontend property form (`use-property-form.ts`) catches this error code and displays a toast directing the user to upgrade their plan.

**Fully implemented:** YES

---

### Q30. What happens to existing listings after expiration?

**How it works now:** **Nothing.** Existing listings remain in their current state (`approved`, `active`, `pending`). Only new listing creation is blocked via quota enforcement. The subscription scheduler does **not** touch `propertiesTable` on expiry.

**Fully implemented:** NO — this is a policy gap.

**Weaknesses:** A provider's listings remain publicly visible indefinitely after their subscription expires. This is a business policy decision but it is not documented anywhere in the code.

**Recommendation:** Decide and document the policy. If listings should be hidden on expiry, add a `runListingExpiry()` step to the scheduler.

---

## Dashboard

### Q31. Which dashboard components depend on subscriptions?

**How it works now:**

| Component | What it shows | Data source |
|-----------|--------------|-------------|
| `SubscriptionWidget.tsx` | Mini subscription status widget in sidebar | `GET /api/providers/:id/stats` or `/users/:userId/current-subscription` |
| `packages.tsx` (full page) | Full subscription management | Same endpoints + history + plans |
| `DashboardLayout.tsx` | Provider verification badge (from `stats.subscription.isActive`) | `GET /api/providers/:id/stats` |
| Property form `Step5Plans` | Plan selection during property add | `GET /api/billing/plans` |
| Admin `subscriptions.tsx` | Full subscription admin view | `GET /api/admin/subscriptions` |
| Admin `reports.tsx` | Subscription revenue charts | `GET /api/admin/subscriptions` + `GET /api/admin/stats` |
| Admin `payments.tsx` | Payment approval/rejection | `GET /api/admin/payments` |

**Fully implemented:** YES

---

### Q32. Does the User Dashboard always show the correct plan?

**How it works now:**
`packages.tsx` uses a two-tier approach:
1. Primary: `GET /api/users/:userId/current-subscription` — looks for `status=active AND endDate > NOW()`
2. Fallback: most recent active item from `subscriptions-history`

The component computes `daysLeft`, `isActive`, and `progressPct` client-side from the returned dates. It polls every 60 seconds.

**Fully implemented:** YES

**Weaknesses:**
- `daysLeft` is computed client-side using `Date.now()` — if server and client clocks are out of sync, the display may briefly show "0 days" for a technically-active subscription
- The fallback to subscription history can show an expired plan as "active" if `isActive` is not correctly set server-side

---

### Q33. Does the Provider Dashboard always show the correct plan?

**How it works now:**
Provider stats (`GET /api/providers/:id/stats`) returns `subscription: { isActive, packageNameAr, daysLeft, maxListings, ... }`. This is the single source of truth for the provider dashboard. Polled every 60 seconds.

**Fully implemented:** YES

**Weaknesses:**
- `isActive` in the stats response is computed as `status === 'active' && endDate > now` — this is correct, but it does not trigger server-side expiry — if the scheduler hasn't run and the subscription is technically expired but still `status='active'` in the DB, the stats endpoint will correctly show `isActive=false` due to the `endDate > now` check

---

### Q34. Are all statistics based on real data?

**How it works now:** YES — all counts and metrics on the admin Reports and Subscriptions pages are derived from live database queries:
- `admin/stats` → counts from `usersTable`, `providersTable`, `propertiesTable`
- `admin/subscriptions` → from `subscriptionsTable` with joins
- `admin/payments` → from `paymentTransactionsTable` + `paymentsTable`
- MRR = sum of `packagePrice` of all active subscriptions (computed in JS, not SQL)

**Weaknesses:**
- MRR is computed client-side in `adminPayments.ts` as a JavaScript `reduce` — not a SQL aggregate. For large datasets, all rows are loaded into memory first.
- The billing dashboard (`GET /api/admin/billing/dashboard`) computes `totalRevenue` only from `paymentTransactionsTable` (gateway payments), excluding `paymentsTable` records (manual/free plans). Revenue figures are incomplete.

---

## Admin

### Q35. Can the admin see all subscriptions?

**How it works now:** YES — `GET /api/admin/subscriptions` returns all subscriptions with optional `?status=` and `?type=user|company` filters. Joins `billing_plans` and `packages` for plan details. Returns enriched rows with `isActive`, `isPastDue`, `daysLeft`.

**Fully implemented:** YES

---

### Q36. Can the admin approve/reject?

**How it works now:** YES — `POST /api/admin/payments/:id/approve-subscription` and `POST /api/admin/payments/:id/reject-subscription`. The admin finds the payment in the Payments page, sees "Pending" status, and clicks Approve or Reject (with optional reason for rejection).

**Fully implemented:** YES

**Weaknesses:** The approve/reject buttons are on the **Payments** page, not the **Subscriptions** page. The admin must navigate to `/admin/payments` to act on pending subscriptions, but the `/admin/subscriptions` page shows all subscriptions without action buttons.

---

### Q37. Can the admin renew manually?

**How it works now:** NO — there is no dedicated admin "renew" or "extend" endpoint. The admin can effectively force an activation by calling `approve-subscription` on a completed payment, but there is no UI button to "add 30 days" or similar.

**Fully implemented:** NO

**Recommendation:** Add `POST /api/admin/subscriptions/:id/extend` that increments `endDate` by N days.

---

### Q38. Can the admin cancel manually?

**How it works now:** NO — there is no `POST /api/admin/subscriptions/:id/cancel` endpoint. The admin can reject a *pending* payment (which cancels a pending subscription), but cannot cancel an *active* subscription.

**Fully implemented:** NO

**Recommendation:** Add `POST /api/admin/subscriptions/:id/cancel` with a reason field.

---

### Q39. Can the admin edit expiry dates?

**How it works now:** NO — there is no endpoint or UI for editing `startDate`/`endDate` directly.

**Fully implemented:** NO

---

### Q40. Can the admin see subscription history?

**How it works now:** YES — `GET /api/admin/subscriptions` returns ALL subscriptions regardless of status (active, expired, cancelled, pending). The admin can filter by `?status=expired` etc. to see history.

**Fully implemented:** YES

---

## Notifications

### Q41. Which events create notifications?

**How it works now** (in-app notifications via `notificationsTable`):

| Event | Notification Recipients |
|-------|------------------------|
| Provider subscribes (free or paid-immediate) | Provider owner + Admin (global `userId=null`) |
| User subscribes (free) | User + Admin (global) |
| Paid subscription request submitted | Admin (global) |
| Admin approves subscription | Provider/User |
| Admin rejects subscription | User (via `payment.userId`) |
| Subscription expiring in 7/3/1 days | User (scheduler) |
| Subscription expired | User (scheduler) |
| Promotion expiring in 3/1 days | User (scheduler) |
| Promotion expired | User (scheduler) |

**Files:** `providers.ts`, `users.ts`, `adminPayments.ts`, `subscription-scheduler.ts`

**Fully implemented:** YES

**Weaknesses:**
- `userId=null` on a notification means "global/admin" — but there is no admin-specific notification inbox endpoint. Admins see these only if they poll the notifications endpoint.
- Rejection notifications go to `payment.userId` — if the subscription was created via the provider path without a user-linked payment, the notification may not be delivered.

---

### Q42. Which events send emails?

**How it works now** (via `mailer.ts`):

| Event | Email Template |
|-------|---------------|
| Subscription activated (any) | `onPackagePurchased` → "Package Purchased" email |
| Subscription expiry warning | `subscriptionExpiryWarning` → "باقتك ستنتهي قريباً" |
| Subscription expired | `subscriptionExpired` → "انتهت مدة باقتك" |

**Weaknesses:**
- Rejection does NOT send an email — only an in-app notification
- No email for subscription request received (pending state)
- Email sending depends on SMTP being configured in site settings (`emailTemplatesTable`). If SMTP is not configured, emails silently fail (caught exception, log warning only)

---

### Q43. Which events create admin alerts?

**How it works now:**
Admin alerts are `notifications` records with `userId=null`:
- New subscription (both free and paid)
- Payment received (paid subscriptions)
- Paid plan subscription request (needs approval)

There is no dedicated "admin alerts" table — global notifications with `userId=null` serve this purpose.

**Weaknesses:** Admin alert delivery mechanism is not clearly defined. There is no `GET /admin/alerts` endpoint; admins must use the standard `GET /notifications` endpoint.

---

### Q44. Which events create payment records?

| Event | Table | Status |
|-------|-------|--------|
| Provider free plan activation | `payments` | `paid` (amount 0) |
| Provider paid plan (direct) | `payments` | `paid` |
| Paid subscription request | `payments` | `pending` |
| Admin approves request | `payments` UPDATE | `paid` |
| Admin rejects request | `payments` UPDATE | `failed` |
| User free plan activation | `payments` | `paid` (amount 0) |

**Fully implemented:** YES

---

### Q45. Which events update reports?

**How it works now:** Reports are always computed live from the database (no pre-aggregated/cached metrics). Any subscription event that changes rows in `subscriptions`, `payments`, or `payment_transactions` is immediately reflected in:
- Admin Reports page (on next page load/refetch, staleTime=60s)
- Admin Payments totals
- Admin Subscriptions totals

**Weaknesses:** No event-driven cache invalidation. If the admin has the reports page open, they see stale data for up to 60 seconds after an event.

---

## Analytics

### Q46. Which reports include subscription revenue?

**How it works now:**
- `GET /api/admin/payments` → includes all subscription payments (paid amounts)
- `GET /api/admin/subscriptions` → `monthlyRecurring` total (sum of active subscription prices)
- `GET /api/admin/billing/dashboard` → `totalRevenue` from `paymentTransactionsTable` only (incomplete)
- Admin Reports page (`reports.tsx`) → tier breakdown pie chart, monthly subscriptions bar chart, derived from subscriptions data

**Weaknesses:**
- `billing/dashboard.totalRevenue` only sums `payment_transactions` (gateway payments), ignoring `payments` table (manual/free). This means the revenue figure on the billing dashboard is systematically understated.

---

### Q47. Are free plans included?

**How it works now:**
- Subscription counts: YES — free plans appear in `subscriptions` table, counted in totals
- Revenue: free plans are included in payments with `amount=0`, contributing 0 to revenue totals
- `subTotals.freeActive` is a dedicated counter in `/admin/subscriptions` response

**Fully implemented:** YES

---

### Q48. Are pending payments included?

**How it works now:**
- `GET /api/admin/payments` includes pending payments (no filter by default)
- `totals.pending` and `totals.pendingAmount` are returned separately
- Pending subscriptions appear in the subscriptions list

**Fully implemented:** YES

---

### Q49. Are cancelled subscriptions included?

**How it works now:** YES — `GET /api/admin/subscriptions` includes all statuses unless filtered. `status=cancelled` subscriptions appear in history. They do not appear in MRR or active count calculations.

**Fully implemented:** YES

---

### Q50. Are expired subscriptions included?

**How it works now:** YES — expired subscriptions appear in the admin subscriptions list with `isActive=false` and `isPastDue=true` (if they haven't been updated yet) or `status=expired`. Historical revenue they generated is retained in the payments tables.

**Fully implemented:** YES

---

## Edge Cases

### Q51. What happens if a provider upgrades before expiry?

**How it works now:** A provider can call `POST /api/providers/:id/subscribe` with a new `billingPlanId` at any time. This creates a **new** active subscription without deactivating the old one. Both exist in the database with `status=active`. The stats endpoint returns the one with the latest `endDate`, which may or may not be the new one depending on when the upgrade happens.

**Result:** The remaining days from the old plan are **lost**. No proration is applied.

**Fully implemented:** NO (no upgrade/downgrade handling; no proration)

**Recommendation:** Before inserting a new subscription, expire the old one and optionally add remaining days to the new subscription.

---

### Q52. What happens if they downgrade?

**How it works now:** Same as Q51 — the system does not distinguish upgrade from downgrade. A new subscription is created. The existing active subscription remains until it expires naturally (or the scheduler marks it expired).

**Result:** The provider may temporarily hold two active subscriptions, with the new (potentially lower-tier) subscription having an earlier end date. The stats endpoint returns the one with the furthest end date — the old higher-tier plan — making the downgrade appear not to have taken effect.

**Fully implemented:** NO

---

### Q53. What happens if payment is rejected?

**How it works now:**
- `subscriptions.status` → `cancelled`
- `payments.status` → `failed`
- In-app notification sent with optional reason
- No email sent
- Provider/user must re-submit a new subscription request

**Fully implemented:** PARTIAL — notification is sent but no email; user must start over

---

### Q54. What happens if payment is approved twice?

**How it works now:** The `approve-subscription` endpoint checks `payment.status !== 'pending'` before proceeding. After the first approval, the payment status is `paid`. A second approval attempt returns `HTTP 400: "الدفعة ليست في حالة معلقة"`.

**Result:** Double-approval is prevented.

**Fully implemented:** YES

---

### Q55. What happens if a scheduler fails?

**How it works now:**
- `runSubscriptionScheduler` and `runPromotionScheduler` are wrapped in try/catch
- Errors are logged via `logger.error` but do not crash the server
- `setInterval` continues on the next tick
- Subscriptions that should have been expired remain `status=active` in the database
- JIT expiry in `/admin/subscriptions` provides a partial safety net for the subscriptions panel

**Fully implemented:** PARTIAL — graceful failure, but no alerting or retry mechanism

**Weaknesses:** If the scheduler silently fails for an extended period (e.g., DB connection issues), expired subscriptions remain "active" and providers can continue listing beyond their plan limits.

**Recommendation:** Add health check metrics for scheduler last-run-time; alert if it hasn't run in >2 hours.

---

### Q56. What happens if a user deletes their account?

**How it works now:**
- `subscriptions.userId` has `ON DELETE CASCADE` → subscriptions are deleted
- `payments.userId` has `ON DELETE SET NULL` → payment records remain but lose user attribution
- `payment_transactions.userId` — no FK constraint to users (it's a plain integer) → orphaned records remain
- `providers.userId` has `ON DELETE RESTRICT` (inferred from provider's delete behavior) — unclear if users with providers can be deleted

**Fully implemented:** PARTIAL — cascade deletes subscriptions but payment history is orphaned

---

### Q57. What happens if a provider is suspended?

**How it works now:**
- `providers.suspended = true` → The provider profile and their listings are hidden from public search
- **Their subscription is NOT cancelled or paused** — it continues to run and bill time
- Quota enforcement (`checkProviderQuota`) does not check the `suspended` flag — a suspended provider could theoretically still add listings via the API if they have a valid session

**Fully implemented:** PARTIAL — suspension is a display flag only; no subscription/quota interaction

**Recommendation:** On provider suspension, optionally cancel active subscription or at least block listing creation.

---

## Security

### Q58. Can users subscribe for another provider?

**How it works now:**
`POST /api/providers/:id/subscribe` (L680–L703) checks:
1. Validates session token
2. Fetches `providers.userId` for the requested `id`
3. If not admin: verifies `providerCheck.userId === session.userId`
4. Returns `HTTP 403` if mismatch

**Result:** NO — users cannot subscribe for a provider they don't own.

**Fully implemented:** YES

---

### Q59. Can users bypass payment?

**How it works now:** There is a **CRITICAL SECURITY GAP**:
- `POST /api/providers/:id/subscribe` with a `billingPlanId` for a paid plan immediately creates a `status=active` subscription **without requiring payment evidence**.
- The `status` is hardcoded to `'active'` (L747) regardless of plan price.
- The payment record is created with `status='paid'` (L770–L775) as if payment was already received.

This means any authenticated provider owner can activate any paid plan for free by calling this endpoint directly.

**Fully implemented:** NO — **CRITICAL security gap**

**Only protected path:** The `/api/payments/subscription-request` user path (`users.ts` L261–L266) correctly blocks paid plans for non-admins. The provider path does not have this gate.

**Recommendation (CRITICAL):** Add the same guard to `providers.ts`: if `price > 0` and caller is not admin, reject with `402 PAYMENT_REQUIRED` and redirect to the payment request flow.

---

### Q60. Can users bypass quota?

**How it works now:**
- **Admin users**: YES — intentionally bypassed
- **Regular users**: NO — `POST /api/properties` always runs `checkUserQuota` or `checkProviderQuota` for non-admins
- **Race condition**: Two simultaneous requests from the same provider/user could both pass the quota check before either property is committed (no transaction or DB-level lock)

**Fully implemented:** PARTIAL — race condition vulnerability for high-concurrency scenarios

---

### Q61. Are all routes protected?

**How it works now:**
- All `/admin/*` routes: `router.use("/admin", adminOnly)` in `adminPayments.ts` (L20) and in `billingPlans.ts` via the same pattern
- Provider subscribe: manual session check + ownership verification
- User subscribe: manual session check + `callerId !== userId` check
- `GET /billing/plans`: public (no auth)
- `GET /providers/:id/stats`: public (no auth required — returns subscription data to anyone who knows the provider ID)
- `GET /users/:userId/current-subscription`: **no auth check** — any authenticated or unauthenticated user can query any user's subscription details by guessing user IDs

**Fully implemented:** PARTIAL — **two information disclosure vulnerabilities**:
1. Provider stats (including subscription details) are publicly accessible
2. User current-subscription endpoint has no ownership check

---

### Q62. Are there any security risks?

**Summary of risks:**

| Risk | Severity | Description |
|------|----------|-------------|
| Provider direct subscribe bypasses payment | **CRITICAL** | `POST /api/providers/:id/subscribe` with paid `billingPlanId` activates subscription for free |
| No auth on user subscription endpoint | **HIGH** | `GET /api/users/:userId/current-subscription` exposes subscription details without auth |
| Provider stats publicly accessible | **MEDIUM** | `GET /api/providers/:id/stats` exposes subscription info to unauthenticated callers |
| Race condition on quota | **MEDIUM** | Concurrent listing creation can exceed quota |
| Warning notification deduplication | **LOW** | Hourly scheduler can send duplicate expiry warnings on restart |
| `limits` stored as JSON string | **LOW** | Malformed JSON silently uses default values — potential for privilege escalation if defaults are higher than intended |
| No rate limiting on subscribe endpoint | **LOW** | `POST /providers/:id/subscribe` is only under `globalApiLimiter` (1000 req/15min) — not subscription-specific |

---

## Final Evaluation

### Q63. Is the Subscription System production-ready?

**No, not yet.** The system has one **critical security vulnerability** (paid plan free activation via provider path) and several **high-severity gaps** (missing auth on subscription info endpoints, no real payment gateway, no cancellation mechanism). The core mechanics work correctly for the happy path, but the gaps are too significant for a payment-handling system to be deployed to production as-is.

---

### Q64. What are the remaining weaknesses?

**Critical:**
1. Provider paid-plan free activation (security bypass)

**High:**
2. No real payment gateway (Paymob, Stripe, etc.) — relies on manual screenshot review
3. No auth check on `GET /api/users/:userId/current-subscription`
4. Multiple active subscriptions allowed per provider (no DB constraint)
5. No user/admin self-cancellation of active subscriptions
6. No admin ability to extend/edit expiry dates

**Medium:**
7. Provider stats endpoint publicly accessible
8. Listing expiry not enforced on subscription expiry
9. Scheduler warning notifications can be sent multiple times per user per day
10. MRR in billing dashboard excludes manual payments from `paymentsTable`
11. Race condition on quota enforcement
12. Upgrade/downgrade creates duplicate active subscriptions without proration

**Low:**
13. Admin free-plan reset not available
14. Subscription status uses text (no enum constraint)
15. Coupon system exists in schema but is not enforced during subscription creation
16. No idempotency key on subscription creation (replay attacks possible)
17. Expiry emails missing for provider subscriptions (only `userId`-linked subs get emails)

---

### Q65. What would you improve to make it comparable to Zillow, Property Finder, Bayut, or Dubizzle?

**Payment Infrastructure:**
- Integrate Paymob (dominant Egyptian gateway) or Stripe for automated card/wallet payments
- Add PCI-compliant tokenization; remove the screenshot-upload flow entirely
- Implement real-time webhook handling for payment confirmation

**Subscription Management:**
- True upgrade/downgrade with prorated billing
- User self-service cancellation with configurable end-of-period behavior
- Annual billing with discount
- Team accounts (multiple users under one company subscription)

**Quota & Listing Lifecycle:**
- Auto-deactivate listings on plan expiry (policy-configurable)
- Re-activate listings on plan renewal
- Per-listing boost credits tied to plan tier

**Analytics & Reporting:**
- Real-time MRR dashboard with churn rate, ARPU, conversion rate
- Cohort retention analysis
- Tax invoice generation (legally required in Egypt — e-invoice system)

**Infrastructure:**
- Replace `setInterval` scheduler with pg-boss or BullMQ for durability
- Add notification deduplication flags to prevent duplicate emails
- Add audit log table for all subscription state changes

---

### Q66. System Scores (out of 100)

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Architecture** | 68/100 | Dual-table payment design is complex but functional; dual plan systems (billing_plans + packages) adds maintenance burden; no event sourcing |
| **Security** | 45/100 | Critical bypass on provider subscribe path; missing auth on info endpoints; no CSRF on state-changing routes |
| **Performance** | 62/100 | Good indexes on key columns; loadPayments() loads all rows into memory; limits stored as JSON strings prevent DB-level filtering; no pagination on subscription queries |
| **Maintainability** | 65/100 | Clear separation of concerns; good TypeScript types; but dual payment table system and inconsistent status terminology increase cognitive load |
| **Scalability** | 50/100 | `setInterval` scheduler will not work in multi-instance deployment; no job queue; MRR computed in JS not SQL |
| **User Experience** | 70/100 | Polished Arabic RTL UI; days-remaining ring; pending banner; lacks real-time payment confirmation and self-service cancellation |
| **Admin Experience** | 60/100 | Can see all subs and payments; approve/reject works; missing: manual renewal, expiry editing, cancel active sub, free plan reset |
| **Overall Production Readiness** | 55/100 | Core mechanics work for the happy path; critical security gap and missing real payment gateway prevent production deployment |

---

## Dependency Map

```
[User/Provider selects plan]
         │
         ▼
[billing_plans] ──────────────────────────┐
    (price, limits, features, userType)    │
         │                                 │
    ┌────┴────┐                           │
    │         │                           │
   Free      Paid                         │
    │         │                           │
    ▼         ▼                           │
[subscriptions] ◄──────────────────────── ┘
  (status, startDate, endDate,            │
   providerId, userId, billingPlanId)     │
    │    │    │                           │
    │    │    └──► [providers]            │
    │    │         (verified=true         │
    │    │          on activation)        │
    │    │                                │
    │    └──► [payments]                  │
    │         (amount, status,            │
    │          invoiceId)                 │
    │              │                      │
    │              └──► Admin approval    │
    │                   updates both      │
    │                   subscriptions +   │
    │                   payments          │
    │                                     │
    ▼                                     │
[subscription-scheduler.ts]               │
  (hourly)                                │
    ├── marks status='expired'            │
    ├── sends emails (mailer.ts)          │
    └── sends in-app (notifications)      │
                                          │
[POST /api/properties]                    │
    └── checkProviderQuota() ─────────────┘
    └── checkUserQuota()
         reads: subscriptions + billing_plans
         returns: HTTP 403 if over limit

[GET /admin/payments]
    reads: payment_transactions + payments
    merges + deduplicates by invoiceId/refId

[GET /admin/subscriptions]
    reads: subscriptions + billing_plans + packages + users + providers
    computes: isActive, isPastDue, daysLeft, MRR
    side effect: background-expires past-due subs

[Admin approve-subscription]
    updates: subscriptions(status=active)
    updates: payments(status=paid)
    updates: providers(verified=true)
    fires: events.onPackagePurchased → email
    inserts: notifications(userId)

[Admin reject-subscription]
    updates: subscriptions(status=cancelled)
    updates: payments(status=failed)
    inserts: notifications(userId)
```

---

## Disconnected or Partially Connected Components

| Component | Status | Issue |
|-----------|--------|-------|
| `coupons` table | **Disconnected** | Exists in schema with full CRUD API, but is never checked during subscription creation. Coupon codes cannot actually be applied. |
| `commission_rules` table | **Disconnected** | Schema exists, admin UI exists, but `commissionPercent` on billing_plans is never applied to compute or store a commission during subscription events. `commissionAmount` in `payment_transactions` is always `0` for subscriptions. |
| `packages` table (legacy) | **Partially connected** | Still referenced in subscription/payment flows as fallback path. No admin UI to create new packages. Should be deprecated. |
| `payment_transactions` table for subscriptions | **Partially connected** | Mainly used for per-service-request payments. Subscription billing primarily uses `payments` table. But `admin/billing/dashboard` reads `payment_transactions` only — missing all manual/free payments. |
| Scheduler → Provider subscriptions | **Partially disconnected** | Scheduler notifies via `subscriptions.userId`. Provider subscriptions that have `userId=null` (only `providerId` set) do not receive expiry emails. |
| `VITE_API_BASE_URL` env var | **Partially connected** | Defined in `.env.example` for split-domain production deployment, but the frontend uses relative URLs — this env var may have no effect depending on Vite proxy config. |
| Email templates (`emailTemplatesTable`) | **Partially connected** | Dynamic email template overrides exist in the database, but `mailer.ts` builds templates in code. The DB override mechanism is not fully integrated for subscription emails. |
| Coupon `usedCount` | **Disconnected** | `usedCount` field exists but is never incremented (since coupons can't be applied). |
| `yearlyPrice` on billing plans | **Disconnected** | Column exists in schema and is shown in the admin plan editor, but there is no yearly billing duration or yearly subscription creation flow. |
| `trialDays` on billing plans | **Disconnected** | Column exists in schema and seeded with values (7–14 days), but there is no trial period logic in any route. No `isTrialing` flag, no trial-to-paid conversion. |

---

## Prioritized Improvements

### 🔴 Critical

1. **Fix provider direct-subscribe security bypass** — Gate `POST /api/providers/:id/subscribe` so paid plans require payment evidence (same as user path). Add `if (requestedPrice > 0 && !callerIsAdmin) return 402 PAYMENT_REQUIRED`.

2. **Add auth to subscription info endpoints** — `GET /api/users/:userId/current-subscription` must verify caller is the user themselves or an admin.

### 🟠 High

3. **Integrate real payment gateway** — Paymob for Egypt (supports Vodafone Cash, Fawry, Meeza cards natively). Replace screenshot upload with automated payment confirmation webhook.

4. **Add DB unique constraint for active subscriptions** — Prevent multiple concurrent active subs per provider/user: `CREATE UNIQUE INDEX ON subscriptions(provider_id) WHERE status = 'active'`.

5. **Add admin subscription management actions** — Cancel active subscription, extend expiry date, and reset free plan eligibility.

6. **Add user self-service cancellation** — `POST /api/providers/:id/cancel-subscription` and `POST /api/users/:userId/cancel-subscription`.

7. **Fix provider expiry email delivery** — In scheduler, when `subscriptions.userId` is null, look up `providers.userId` to deliver the notification.

### 🟡 Medium

8. **Replace `setInterval` with pg-boss or node-cron** — For reliable scheduled execution across server restarts and multi-instance deployments. Add notification deduplication columns (`notified7d`, `notified3d`, `notified1d`).

9. **Implement upgrade/downgrade with subscription replacement** — On new subscription, set old active subscription to `expired` (optionally calculating remaining days for proration).

10. **Fix billing dashboard revenue calculation** — `GET /api/admin/billing/dashboard` must aggregate from both `payment_transactions` AND `payments` tables.

11. **Protect provider stats endpoint** — Require authentication for `GET /api/providers/:id/stats` to avoid subscription data leakage.

12. **Enforce listing expiry policy** — Decide whether listings deactivate on subscription expiry. If yes, add to scheduler.

### 🟢 Low

13. **Connect coupon redemption** — Apply `coupons.discountValue` during the `subscription-request` or `subscribe` flow; increment `usedCount`.

14. **Connect commission rules** — Apply `billingPlans.commissionPercent` during subscription billing; store in `payment_transactions.commissionAmount`.

15. **Deprecate legacy `packages` table** — Migrate remaining legacy subscriptions to `billing_plans` and remove the dual-path code.

16. **Add `rejected` subscription status** — Distinguish admin rejection from user cancellation; update admin rejection path to use `status='rejected'`.

17. **Add idempotency key to subscription creation** — Prevent replay attacks on double-click or network retry.

18. **Connect `trialDays` and `yearlyPrice`** — Implement trial period logic and annual billing option.

19. **Generate tax invoices** — Required by Egyptian e-invoice regulations (ETA) for businesses collecting payments.

---

## Final Verdict

> **Can this Subscription System be deployed to production today? No.**

**Reason:**
The system works correctly for the happy path (free plan activation, admin approval workflow, quota enforcement, notifications). However, it has one **critical security vulnerability**: any authenticated real-estate provider can activate any paid subscription plan for free by calling `POST /api/providers/:id/subscribe` with a `billingPlanId`, bypassing the payment flow entirely. In a commercial subscription system, this is a show-stopping bug that would result in zero revenue from provider subscriptions.

Additionally, the absence of a real payment gateway (all paid subscriptions require manual admin approval of uploaded screenshots) means the system cannot realistically handle more than a handful of new subscriptions per day without overwhelming the admin team.

**What's needed before go-live (minimum viable fixes):**
1. ✅ Fix the provider direct-activate security bypass (~30 minutes of code change)
2. ✅ Add auth check to user subscription info endpoint (~10 minutes)
3. ✅ Fix provider expiry email notification (~20 minutes)
4. 🔨 Integrate a real payment gateway (~1–2 weeks for Paymob integration)

Once items 1–3 are fixed and item 4 is in progress, the system can handle limited production traffic with manual payment review as an interim solution. Full production parity with Property Finder or Bayut requires the full High and Medium priority list.
