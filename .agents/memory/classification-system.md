---
name: Property Classification System
description: Canonical architecture for mainCategory/subCategory fields — group slugs + subtype slugs everywhere
---

## The Correct Architecture

- `mainCategory` = **group slug**: `residential`, `commercial`, `land`, `industrial`
- `subCategory` = **subcategory slug**: `apartment`, `villa`, `shop`, `office`, `land-residential`, etc.
- `listingType` = `sale` or `rent`

This is now enforced end-to-end: DB, seeds, API, form, search pages, and homepage.

**Why:** Previously mainCategory stored Arabic subtype names (e.g., "شقة") which made category-level filtering require giant hardcoded maps and caused subCategory filter to never match.

## Slug Mapping

### Residential subtypes
apartment, villa, duplex, studio, chalet, standalone, single-room, full-floor

### Commercial subtypes
shop, office, warehouse, showroom, commercial-building, pharmacy, restaurant

### Land subtypes
land-residential, land-commercial, land-agricultural, land-industrial, land-service

## Key Files

- `property-type-config.ts` — PROPERTY_TYPE_CONFIGS keyed by **subCategory slug** (not Arabic)
- `property-field-rules.ts` — DEFAULT_FIELD_VISIBILITY keyed by **subCategory slug**
- `constants.ts` — PROPERTY_GROUPS subtypes use slug values; LAND_CATEGORIES uses slugs
- `types.ts` — FormValues includes `subCategory: string`
- `PropertyTypeSelector.tsx` — `handleSubtypeClick` sets `mainCategory = groupSlug` + `subCategory = subtypeSlug`; `usePhase` checks `!v.subCategory` for phase 1 completion

## API

`GROUP_ALL_VALUES` map was removed from `properties.ts`. Category filter is now simply:
```typescript
conditions.push(eq(propertiesTable.mainCategory, normalizedCategory));
```
Legacy Arabic group names ("سكني", "تجاري", "أرض") are normalized via CAT_SLUG_MAP before the query.

## DB Migration Applied

Two-pass SQL UPDATE normalized all existing property rows from Arabic subtype names to group+slug pairs.

## How to apply

- Any new property type must add its slug to both `property-type-config.ts` (PROPERTY_TYPE_CONFIGS) and `property-field-rules.ts` (DEFAULT_FIELD_VISIBILITY + SUBCAT_TO_GROUP)
- Seed files use slug values; the DB seeder will not re-run if rows already exist
- `getPropertyTypeConfig(subCategory, mainCategory)` — pass subCategory slug first
