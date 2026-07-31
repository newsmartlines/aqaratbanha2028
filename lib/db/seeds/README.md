# Database Seeds

This directory contains exportable seed files for the **عقارات بنها** platform.

## How It Works

Seed files are JSON snapshots of database tables. They are:
- Committed to GitHub so they survive repo clones
- Auto-loaded on fresh deployments when the database is empty
- Exportable / importable from the Admin Dashboard → Backup & Seeds

## Files

| File | Table(s) | Description |
|------|----------|-------------|
| `locations.json` | regions, cities, areas | Egypt/Banha geographic data |
| `featured-areas.json` | featured_areas | Homepage featured areas |
| `categories.json` | categories, subcategories | Property & service categories |
| `properties.json` | properties | Demo property listings |
| `email-templates.json` | email_templates | Email notification templates |
| `site-settings.json` | site_settings | Hero section, SEO, contact info |
| `billing-plans.json` | billing_plans, commission_rules | Subscription plans & commissions |
| `packages.json` | packages | Legacy service packages |
| `admin-staff.json` | admin_staff | Staff roles & permissions |
| `manifest.json` | — | Seed manifest with metadata |

## Deployment

When deploying to a new server:

```bash
# 1. Clone repo
git clone https://github.com/your/repo

# 2. Install dependencies
pnpm install

# 3. Set up database
cp .env.example .env
# Edit .env with your DATABASE_URL

# 4. Push schema
pnpm --filter @workspace/db run push

# 5. Start server (auto-seeds from lib/db/seeds/ if DB is empty)
pnpm run dev
```

## Manual Seed Restore

From the Admin Dashboard → Backup & Seeds → Restore from Seeds.

Or via API:
```bash
curl -X POST /api/admin/backup/restore-seeds \
  -H "Cookie: session=YOUR_ADMIN_TOKEN"
```

## Sensitive Data Policy

Seed files do **NOT** contain:
- User passwords
- SMTP credentials
- API keys / secrets
- Payment tokens

These must be configured via environment variables (`.env`).
