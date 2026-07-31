---
name: Subscription Integrity (Phase 3.1)
description: DB constraints and backend logic enforcing one-active-subscription-per-provider/user, auto-replacement, renewal extension, and correct rejection notifications.
---

## What was done

### DB Schema (`lib/db/src/schema/subscriptions.ts`)
Three new columns added to `subscriptions` table:
- `replacedBySubscriptionId` integer — points to the subscription that superseded this one
- `replacedAt` timestamp — when replacement occurred
- `replacementReason` text — human-readable reason

Two partial unique indexes applied via raw SQL (drizzle-kit needs TTY):
- `subscriptions_one_active_per_provider_idx ON subscriptions(provider_id) WHERE status='active' AND provider_id IS NOT NULL`
- `subscriptions_one_active_per_user_idx ON subscriptions(user_id) WHERE status='active' AND user_id IS NOT NULL`

Migration script: `scripts/migrate-subscription-integrity.mjs` (run via psql, not node — pg package not in root node_modules)

### Subscription statuses (all valid values)
`pending | active | expired | cancelled | replaced`

### Backend logic (`artifacts/api-server/src/routes/adminPayments.ts`)

**approve-subscription** (POST /admin/payments/:paymentId/approve-subscription):
1. Finds existing active subscription for same provider/user
2. **Renewal detection**: if new sub has same `billingPlanId` or `packageId` as existing active → extends existing endDate (from max(currentEnd, now) + duration), cancels the pending row, sets `replacedBySubscriptionId = existingId`
3. **Replacement**: if different plan → marks old as `status='replaced'`, sets `replacedBySubscriptionId`, activates new sub
4. Returns `{ success: true, renewed: boolean }`

**reject-subscription** (POST /admin/payments/:paymentId/reject-subscription):
- Fix 4: notifyUserId resolved in order: `payment.userId` → `payment.providerId owner` → `sub.userId` → `sub.providerId owner`
- No longer silently drops notification when payment.userId is null

### Frontend (`artifacts/marketplace/src/pages/admin/subscriptions.tsx`)
- `StatusBadge` now handles `replaced` → orange "مُستبدَل" badge; `pending` → amber "معلق"
- Tab "منتهية" renamed to "منتهية / مستبدلة" and includes `status === 'replaced'`

**Why:**
A provider could previously accumulate multiple active subscriptions by buying a new plan before the old one expired. The DB constraint is the safety net; the backend logic ensures atomic replacement/renewal before the constraint is ever hit.

**How to apply:**
- Any future subscription activation point must follow the same pattern: find existing active → renewal-or-replace → then activate.
- Never insert `status='active'` for a provider/user who already has one without first marking the old one as `replaced` or `expired`.
- The migration script is idempotent (IF NOT EXISTS) — safe to re-run.
