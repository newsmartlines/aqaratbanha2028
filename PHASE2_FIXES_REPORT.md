# Phase 2 — Critical Subscription & Billing Fixes Report

**Date:** 2026-07-28  
**Files Modified:** 3  
**Bugs Fixed:** 4  

---

## Files Modified

| File | What Changed |
|------|-------------|
| `artifacts/api-server/src/routes/providers.ts` | Fix 1 — security bypass in provider subscribe (billing plan path + legacy package path) |
| `artifacts/api-server/src/routes/users.ts` | Fix 2 — authorization on `GET current-subscription` and `GET subscriptions-history` |
| `artifacts/api-server/src/lib/subscription-scheduler.ts` | Fix 3 — provider notifications for null-userId subs; Fix 4 — unset `verified` on expiry |

---

## Bugs Fixed

---

### Bug 1 — CRITICAL SECURITY: Provider paid plans activated without payment

**Endpoint:** `POST /api/providers/:id/subscribe`

**Why it happened:**  
The provider subscribe handler (both the new `billingPlanId` path and the legacy `packageId` path) inserted subscriptions with `status: "active"` and payments with `status: "paid"` immediately upon request, regardless of price. The equivalent user flow (`POST /api/users/:userId/subscribe`) correctly blocks paid plans with HTTP 402 and directs users through the payment request process — but this protection was never applied to the provider route.

**How it was fixed:**  
For both billing plan and legacy package paths, the handler now branches on `requestedPrice > 0`:

- **Paid plans (`price > 0`):**
  - Subscription inserted with `status: "pending"`
  - Payment inserted with `status: "pending"`
  - Invoice ID uses `SUB-REQ-{subscriptionId}` format — this is the exact format the existing `POST /admin/payments/:paymentId/approve-subscription` endpoint matches to activate the subscription
  - Admin receives a "طلب اشتراك جديد يحتاج موافقة" notification with a link to `/admin/payments`
  - Provider receives a "طلب اشتراكك قيد المراجعة" notification
  - Response is HTTP 202 with `{ pending: true }`
  - `providers.verified` is NOT set — it stays unchanged until admin approval (the approve-subscription endpoint already handles setting `verified: true`)

- **Free plans (`price = 0`):** behavior unchanged — activated immediately with `status: "active"`.

---

### Bug 2 — AUTHORIZATION: `GET /users/:userId/current-subscription` and `GET /users/:userId/subscriptions-history` were publicly accessible

**Endpoints:**  
- `GET /api/users/:userId/current-subscription`  
- `GET /api/users/:userId/subscriptions-history`

**Why it happened:**  
Both endpoints parsed `userId` from the URL and queried the database with no session check whatsoever. Any unauthenticated caller who knew (or guessed) a user ID could read their active subscription details and full subscription history.

**How it was fixed:**  
Both endpoints now require the caller to be authenticated and either the account owner or an admin:

```typescript
const callerId = await sessionUserId(req);
if (!callerId) return res.status(401).json({ ... });
const [callerRow] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, callerId));
if (callerRow?.role !== "admin" && callerId !== userId)
  return res.status(403).json({ ... });
```

---

### Bug 3 — SCHEDULER: Provider subscriptions with `userId = NULL` received no expiry notifications

**Location:** `artifacts/api-server/src/lib/subscription-scheduler.ts` — expiry loop and warning loop

**Why it happened:**  
Provider subscriptions created via `POST /providers/:id/subscribe` set only `providerId` on the subscription row; `userId` is left NULL. The scheduler resolved the notification target with `const uid = sub.userId ?? null; if (!uid) continue;` — so all provider-only subscriptions were silently skipped. No email, no in-app notification.

**How it was fixed:**  
Both the expiry loop and the warning loop now fall back to the provider's owner user when `userId` is NULL:

```typescript
let resolvedUserId = sub.userId ?? null;
if (!resolvedUserId && sub.providerId) {
  const [prov] = await db
    .select({ userId: providersTable.userId })
    .from(providersTable)
    .where(eq(providersTable.id, sub.providerId));
  resolvedUserId = prov?.userId ?? null;
}
if (!resolvedUserId) continue;
```

`providersTable` was also added to the scheduler's imports (it was missing). The warning loop's `select` clause was updated to also fetch `providerId` from `subscriptionsTable` (previously it only selected `userId`).

---

### Bug 4 — PROVIDER STATUS: `providers.verified` not unset when subscription expires

**Location:** `artifacts/api-server/src/lib/subscription-scheduler.ts` — expiry loop

**Why it happened:**  
When a subscription was marked `expired`, the scheduler only sent notifications. It never updated `providers.verified`. So a provider whose paid subscription expired kept `verified = true` indefinitely, misrepresenting their status.

**How it was fixed:**  
In the expiry loop, after marking subscriptions as expired, the scheduler now checks each expired subscription that has a `providerId`. If no other `active` subscription exists for that provider, it sets `providers.verified = false`:

```typescript
if (sub.providerId) {
  const [otherActive] = await db
    .select({ id: subscriptionsTable.id })
    .from(subscriptionsTable)
    .where(and(
      eq(subscriptionsTable.providerId, sub.providerId),
      eq(subscriptionsTable.status, "active"),
    ))
    .limit(1);
  if (!otherActive) {
    await db.update(providersTable)
      .set({ verified: false })
      .where(eq(providersTable.id, sub.providerId));
  }
}
```

---

## Subscription Lifecycle Validation

Both individual users and providers now follow the same lifecycle:

| Step | User | Provider |
|------|------|----------|
| **Buy Plan (free)** | `POST /users/:id/subscribe` → active immediately | `POST /providers/:id/subscribe` → active immediately |
| **Buy Plan (paid)** | `POST /payments/subscription-request` → pending | `POST /providers/:id/subscribe` (price > 0) → pending |
| **Payment Request** | Pending subscription + pending payment created | Same — pending subscription + pending payment created, `invoiceId = SUB-REQ-{id}` |
| **Admin Approval** | `POST /admin/payments/:id/approve-subscription` → active | Same endpoint — same invoice format |
| **Activation** | `status: active`, dates reset from approval time | Same — admin endpoint also sets `providers.verified = true` |
| **Quota** | Enforced via billing plan limits | Same billing plan limits apply |
| **Expiry** | Scheduler marks `expired`, sends email + notification | Same — scheduler now resolves provider owner userId for notifications |
| **Verified unset** | N/A | Scheduler sets `providers.verified = false` if no other active sub |
| **Renewal** | `PATCH /properties/:id/renew` or new subscription | Same |

---

## Critical Issues Found But Not Fixed

**None discovered** during implementation of these four fixes.

---

*Report generated on completion of Phase 2 fixes.*
