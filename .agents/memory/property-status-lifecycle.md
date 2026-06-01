---
name: Property Status Lifecycle
description: The full property status machine — states, transitions, DB columns, API endpoints, events, and UI rules.
---

## Status Values
- `pending` — fresh submission awaiting first admin review
- `updated_after_rejection` — owner edited a rejected property and resubmitted; **distinct from pending** so admin can see it was previously rejected
- `approved` / `active` — publicly visible; both mean the same thing in UI and public query
- `rejected` — admin rejected; owner can edit → transitions to `updated_after_rejection`
- `expired` — was approved but `expiresAt < now`; NOT publicly visible
- `draft` — saved but never submitted

## DB Columns Added
- `updated_at timestamp` — set on every PUT by owner or admin
- `expires_at timestamp` — set to `approvedAt + 30 days` when admin approves

## Key Transitions
- Owner edits rejected → `updated_after_rejection`, clears `rejectionReason`, sets `updatedAt`
- Owner edits `updated_after_rejection` → stays `updated_after_rejection` (re-fires resubmit event)
- Owner edits approved/active → `pending` (normal re-review)
- Admin approves → `approved`, sets `approvedAt`, `expiresAt = now + 30d`, clears `rejectionReason`
- Admin sets `expired` → fires `onPropertyExpired` event
- `PATCH /properties/:id/renew` — resets expired → approved with new expiresAt; owner or admin only

## API Endpoints
- `PATCH /api/properties/:id/status` — `{ status, rejectionReason? }` — admin tool
- `PATCH /api/properties/:id/renew` — owner (or admin) renews expired listing

## Event Service
- `onPropertyUpdatedAfterRejection` — owner notification + admin notification (distinct from fresh submission)
- `onPropertyExpired` — owner notification + admin notification

## Admin Sidebar Counts
- `pendingProperties` badge counts **both** `pending` AND `updated_after_rejection`

## Public Query
- Only shows `approved` and `active`; expired/pending/rejected/draft never surfaced publicly

**Why separate `updated_after_rejection`:** Admin needs to know this property was already rejected once and was specifically edited in response — warrants closer review attention vs. a brand-new submission.
