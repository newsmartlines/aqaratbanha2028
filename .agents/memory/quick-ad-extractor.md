---
name: Quick Ad Extractor & UI
description: Architecture and key decisions for the إعلان سريع (Quick Ad) feature and its property extraction engine.
---

# Quick Ad — Extractor & UI Architecture

## Files
- Extractor: `artifacts/marketplace/src/lib/property-extractor.ts`
- UI: `artifacts/marketplace/src/pages/quick-ad.tsx`
- API POST: `artifacts/api-server/src/routes/properties.ts` → `router.post("/properties", ...)`
- DB Schema: `lib/db/src/schema/properties.ts`

## Extractor capabilities (v2)
- Extracts: listingType, propertyType, area, price, rooms, bathrooms, floor, finishing, furnished, direction
- Location: `governorate` (from all Egyptian governorates map), `location` + `locationConfidence` (high/medium/low)
- Address detail: `compound`, `street`, `nearbyLandmarks[]`
- Phones: `allPhones[]` (all normalized Egyptian numbers), `whatsapp` (WhatsApp-tagged number), `phone` (first)
- Flags: `urgent`, `negotiable`, `ownerDirect`
- Output: `titleVariants[3]` — 3 distinct title styles

**Why:** CITIES_MAP must not have duplicate keys — TypeScript treats duplicate object literal keys as an error. Removed `"شبرا": "شبرا"` (kept `"شبرا": "شبرا الخيمة"`).

**Why:** `??` and `||` cannot be mixed without parentheses in TypeScript strict mode — use `(a ?? b) || c`.

## DB columns added
`negotiable` (boolean), `extractedJson` (text/JSON), `allPhones` (text/JSON array), `nearbyLandmarks` (text/JSON array), `locationConfidence` (text).
Existing columns already cover: `whatsapp`, `latitude`, `longitude`, `compound`, `street`, `district`, `urgent`.

## UI Architecture
Section-based extracted data display with color-coded cards:
- Basic Info (teal) → type, listing type, price, area, finishing
- Location (blue) → governorate, location + confidence badge, compound, street, landmarks, OSM map iframe
- Property Details (purple) → rooms, bathrooms, floor, direction
- Features (green) → collapsible list, show more/less at 8
- Contact (amber) → all phones, whatsapp chip, urgent/negotiable/owner pills

Geocoding: client-side Nominatim call (`nominatim.openstreetmap.org/search?countrycodes=eg`) fires 1s after location extracted. Shows OSM iframe embed when lat/lon found.

If no location detected → shows manual location input + warning banner.

## API saving
POST /properties now saves: `compound`, `street`, `urgent`, `advertiserType`, `negotiable`, `allPhones`, `nearbyLandmarks`, `locationConfidence`, `extractedJson`, `whatsapp`, `latitude`, `longitude`.
