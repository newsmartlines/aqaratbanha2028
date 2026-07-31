---
name: Enterprise Ads Platform Architecture
description: Full enterprise advertising platform built on top of the original ad_spots table. Covers schema, API routes, frontend components, and DB migration approach.
---

# Enterprise Ads Platform

## Schema Changes
- Extended `ad_spots` table via raw SQL (drizzle-kit push fails non-TTY due to column rename detection — must use `psql "$DATABASE_URL"` directly with raw SQL for schema changes)
- New columns: `content_type`, `display_type`, all targeting/scheduling/rotation/adsense/admanager fields, `ab_test_group_id`, `ab_test_variant`, `revenue`, `last_impression`, `last_click`, `advertiser_id`, `campaign_id`
- Old `ad_type` column retained in DB (still exists), new `content_type` + `display_type` are used instead
- New tables: `ad_advertisers`, `ad_campaigns`, `ad_invoices`, `ad_events`

## Content Types
- `banner` — image banner with visual fields
- `html` — raw HTML injection
- `adsense` — Google AdSense (single script load via singleton pattern)
- `admanager` — Google Ad Manager GPT
- `javascript` — custom JS executed in ad container
- `internal` — internal promotion (same as banner visually)

## Display Types (visual layout)
- `leaderboard` — full-width horizontal
- `box` — 300×250 sidebar style
- `native` — inline card with accent bar

## Key Files
- `lib/db/src/schema/adSpots.ts` — full schema with all tables
- `artifacts/api-server/src/routes/ads.ts` — all public + admin routes
- `artifacts/marketplace/src/components/AdBanner.tsx` — rendering component
- `artifacts/marketplace/src/pages/admin/ads.tsx` — main admin page (tabs)
- `artifacts/marketplace/src/pages/admin/ads/AdEditDialog.tsx` — type-conditional editor
- `artifacts/marketplace/src/pages/admin/ads/AdvertisersTab.tsx` — advertiser/campaign/invoice management
- `artifacts/marketplace/src/pages/admin/ads/ReportsTab.tsx` — statistics + charts + CSV export

## AdSense Script Loading
Singleton pattern — `adsenseLoaded` boolean at module level; script only injected once per page load regardless of how many AdSense ad units are on the page. Complies with AdSense policy.

## Ad Selection Logic (API)
1. Filter by `is_active = true`
2. Filter by schedule (start/end date + time window)
3. Filter by targeting (device, user type, language, listing type, categories, plans)
4. Group by position
5. Weighted random rotation within each position group
6. A/B test filtering by variant

## DB Migration Pattern
**Why:** drizzle-kit push requires TTY for interactive rename confirmation. Use raw SQL via psql instead:
`psql "$DATABASE_URL" << 'EOSQL' ... EOSQL`
