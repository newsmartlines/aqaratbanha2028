---
name: Phase 2 property audit fixes
description: 13 security/quality issues fixed across properties, favorites, upload, propertyReports routes and admin/property-detail frontend
---

# Phase 2 Property Audit — Fixes Applied

## Critical fixes

**C-1 — `GET /properties?status=all` now requires admin auth**
- Added `requireAuth` + role check before the `status === "all"` branch in `properties.ts`
- Non-admin or unauthenticated callers get 401/403

**C-2 — `PUT /properties/:id` mass-assignment fixed**
- Replaced `{ ...req.body }` spread with an explicit `USER_UPDATABLE` allowlist
- Admins get `ADMIN_EXTRA` fields additionally (`featured`, `urgent`, `expiresAt`, `approvedAt`)
- Owners can no longer self-promote listings or extend expiry

**C-3 — IDOR in `favorites.ts` fixed**
- All three routes (`GET/POST/DELETE /users/:userId/favorites`) now call `requireAuth`
- Assert `session.userId === parseInt(req.params.userId)`; return 403 on mismatch

## High/medium fixes

**H-1 — Font upload magic-byte validation added (`upload.ts`)**
- Added `isValidFontFile(filePath)` checking TTF/OTF/WOFF/WOFF2 magic bytes
- File is deleted and 400 returned if bytes don't match a known font format

**H-2 — Hard cap on `GET /properties` (max 200 rows)**
- `limitNum` now always bounded: `rawLimit > 0 ? Math.min(200, rawLimit) : 200`
- `paginate` flag only true when caller explicitly passed a `limit` param

**H-3 — View endpoint sessionId now server-derived**
- Ignores `req.body.sessionId` entirely
- Uses last-24-chars of session token, or `ip:X.X.X.X` for anonymous visitors

**H-4 — Renewal quota check added**
- `PATCH /properties/:id/renew` now calls `checkProviderQuota` or `checkUserQuota`
- Returns 403 + `QUOTA_EXCEEDED` code if over limit

**H-5 — Property reports: auth + rate limit**
- `POST /property-reports` now requires auth (401 if not logged in)
- In-memory IP rate limiter: max 5 reports/hour; 429 on excess
- Admin PATCH/DELETE routes have `Number.isFinite` NaN guard → 400 on bad IDs

## Low severity fixes

**L-1 — N+1 in `triggerSavedSearchAlerts` eliminated**
- Filter matches in-memory first, then bulk-fetch all users with `inArray`

**L-2 — Admin properties page capped at 500 rows**
- `api.properties.list({ status: "all", limit: 500 })` — `ensureArray` handles paginated response

**L-3 — Property detail SEO added**
- `document.title` set to `"<title> | دليل عقارات بنها"` in data-load useEffect
- JSON-LD `RealEstateListing` script injected; cleaned up on unmount

**L-4 — Hardcoded phone number removed**
- `NOTIFY_PHONE` default changed from `"00201066638523"` to `""`
- Guard checks both `CALLMEBOT_KEY` and `NOTIFY_PHONE` before attempting send

**Why:** Full security/quality audit found these issues in Phase 2 of a production-readiness audit.
**How to apply:** These are all live in the codebase. Follow the same allowlist pattern for any future PUT/PATCH handlers.
