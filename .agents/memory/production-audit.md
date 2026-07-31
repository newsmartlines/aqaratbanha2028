---
name: Production Audit Findings
description: Key issues found and fixed during the July 2026 production audit
---

## Express 5 req.params type
All `parseInt(req.params.*)` calls must use `String(req.params.*)` wrapper because Express 5 types params as `string | string[]`. Apply globally in any new route file.
**Why:** TypeScript build fails without it; Express 5 changed the params type from plain string.
**How to apply:** `parseInt(String(req.params.id))` pattern in every route handler.

## SSRF risk in wpImport.ts
`downloadImage(url)` must validate URLs through `isSafeImageUrl()` before fetching. Block: localhost, 127.x, 10.x, 192.168.x, 172.16-31.x, 169.254.x, .local, metadata.google.internal.
**Why:** Admin CSV imports could trigger requests to internal network services.

## CORS production default
When `CORS_ORIGIN` env is unset or "*", restrict to same-origin in production. Dev gets `true` for convenience.
**Why:** Was defaulting to `true` (allow all origins) even in production.

## Missing DB indexes pattern
When adding new schema tables, add indexes on: FK columns (joins), status/boolean columns used in WHERE, timestamps used for ordering.
Tables updated: categories (status, type), subcategories (category_id, status), providers (user_id, category_id, approved, featured, suspended).

## ErrorBoundary
`artifacts/marketplace/src/components/ErrorBoundary.tsx` wraps App in main.tsx. Reuse for individual high-risk sections (maps, AI chat).
