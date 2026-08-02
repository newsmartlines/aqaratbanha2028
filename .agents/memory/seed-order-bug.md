---
name: Seed Order Bug Fix
description: Root cause and fix for "no properties on fresh deploy" — seed ordering and provider gate logic
---

# Seed Order Bug — Properties Missing on Fresh Deploy

## The Bug
On a fresh environment, `seedFromFiles()` successfully restores categories/locations from JSON files.
Then the main `seed()` function's provider-creation block was gated on `existingCats.length === 0` — which
evaluates to **false** (categories already exist), so the 6 demo providers were never created.
Additionally, `seedProperties()` was called **before** `seedDefaultAccounts()`, so even the company
provider didn't exist yet when properties were attempted.

Result: zero properties on every fresh deploy.

## The Fix (applied in `artifacts/api-server/src/lib/seed.ts`)
1. Changed provider-creation gate from `existingCats.length === 0` → `existingProviders.length === 0`
2. Moved `seedProperties()` call to **after** `seedDefaultAccounts()` so all providers exist first

## Why This Matters
The seed file system (`lib/db/seeds/*.json`) stores users WITHOUT `password_hash` (intentional — no plaintext
passwords in git). So user/provider restoration from JSON always fails. Providers must be created by
the hardcoded seed logic. The gate must check providers, not categories.

## How to Apply
Any future seed ordering changes: always ensure providers exist before calling `seedProperties()`.
The `seedFromFiles()` will never restore providers or users (they lack password hashes), so the
hardcoded provider block in `seed()` is the only way providers get created on a fresh deploy.
