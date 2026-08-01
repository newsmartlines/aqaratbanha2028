/**
 * Seeds the tables that force-reseed.mjs missed due to FK / null constraints:
 *   - providers  (needed by properties FK)
 *   - properties (status='active' → 'approved')
 *   - email_templates (null category → 'custom')
 *   - users from admin.json (missing password_hash)
 *
 * Run: node scripts/seed-missing.mjs
 */
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SEEDS_DIR = path.resolve(__dirname, "../lib/db/seeds");

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

// ── 1. Create demo providers (IDs 1-6) if they don't exist ──────────────────
const existingUsers = await client.query(`SELECT id FROM users ORDER BY id LIMIT 10`);
const userIds = existingUsers.rows.map(r => r.id);

const existingProviders = await client.query(`SELECT COUNT(*) FROM providers`);
if (parseInt(existingProviders.rows[0].count) === 0 && userIds.length > 0) {
  console.log("⏳ Creating demo providers...");
  const providerNames = [
    "مكتب دليل للعقارات",
    "شركة الإسكندرية للتطوير",
    "مكتب النيل العقاري",
    "شركة المتميز للاستثمار",
    "مكتب كوست لاين للعقارات",
    "مجموعة الأهرام العقارية",
  ];
  for (let i = 0; i < 6; i++) {
    const uid = userIds[i % userIds.length];
    try {
      await client.query(
        `INSERT INTO providers (id, user_id, bio, phone, whatsapp, active, approved, "approved_at", rating, reviews_count, verified)
         VALUES ($1, $2, $3, $4, $4, true, true, NOW(), 4.5, 0, true)
         ON CONFLICT (id) DO NOTHING`,
        [i + 1, uid, providerNames[i], "01000000000"]
      );
    } catch (e) {
      // Try without approved columns if they don't exist
      try {
        await client.query(
          `INSERT INTO providers (id, user_id, bio, phone, whatsapp, active, rating, reviews_count, verified)
           VALUES ($1, $2, $3, $4, $4, true, 4.5, 0, true)
           ON CONFLICT (id) DO NOTHING`,
          [i + 1, uid, providerNames[i], "01000000000"]
        );
      } catch (e2) {
        console.warn(`  ⚠ provider ${i+1}:`, e2.message);
      }
    }
  }
  await client.query(`SELECT setval(pg_get_serial_sequence('"providers"', 'id'), COALESCE((SELECT MAX(id) FROM providers), 1))`);
  const cnt = await client.query(`SELECT COUNT(*) FROM providers`);
  console.log(`  ✓ providers: ${cnt.rows[0].count} rows`);
}

// ── 2. Seed properties ────────────────────────────────────────────────────────
const propCount = await client.query(`SELECT COUNT(*) FROM properties`);
if (parseInt(propCount.rows[0].count) === 0) {
  console.log("⏳ Seeding properties...");
  const d = JSON.parse(fs.readFileSync(path.join(SEEDS_DIR, "properties.json"), "utf8"));
  const rows = d.tables?.properties || [];
  let inserted = 0;
  for (const row of rows) {
    try {
      await client.query(
        `INSERT INTO properties (
          id, provider_id, owner_user_id, title, description,
          main_category, listing_type, sub_category, price, area,
          rooms, bathrooms, floor, total_floors, build_year,
          finishing, condition, furnished, direction, facade,
          payment_method, rent_duration, advertiser_type, compound,
          address, region_id, city_id, district, street,
          latitude, longitude, images, video_url, brochure_url,
          land_type, land_width, land_depth, build_ratio, logo_url,
          phone, whatsapp, features, nearby_services, contact_methods,
          status, featured, approved_at
        ) VALUES (
          $1,$2,$3,$4,$5,
          $6,$7,$8,$9,$10,
          $11,$12,$13,$14,$15,
          $16,$17,$18,$19,$20,
          $21,$22,$23,$24,
          $25,$26,$27,$28,$29,
          $30,$31,$32,$33,$34,
          $35,$36,$37,$38,$39,
          $40,$41,$42,$43,$44,
          'approved',$45,NOW()
        ) ON CONFLICT (id) DO NOTHING`,
        [
          row.id, row.provider_id || null, row.owner_user_id || null,
          row.title, row.description,
          row.main_category, row.listing_type, row.sub_category,
          row.price, row.area,
          row.rooms, row.bathrooms, row.floor, row.total_floors, row.build_year,
          row.finishing, row.condition, row.furnished, row.direction, row.facade,
          row.payment_method, row.rent_duration, row.advertiser_type, row.compound,
          row.address, row.region_id, row.city_id, row.district, row.street,
          row.latitude, row.longitude,
          typeof row.images === "string" ? row.images : JSON.stringify(row.images || []),
          row.video_url, row.brochure_url,
          row.land_type, row.land_width, row.land_depth, row.build_ratio, row.logo_url,
          row.phone, row.whatsapp,
          typeof row.features === "string" ? row.features : JSON.stringify(row.features || []),
          typeof row.near_by_services === "string" ? row.near_by_services : JSON.stringify(row.near_by_services || []),
          typeof row.contact_methods === "string" ? row.contact_methods : JSON.stringify(row.contact_methods || []),
          row.featured || false,
        ]
      );
      inserted++;
    } catch (e) {
      console.warn(`  ⚠ property ${row.id}:`, e.message);
    }
  }
  await client.query(`SELECT setval(pg_get_serial_sequence('"properties"', 'id'), COALESCE((SELECT MAX(id) FROM properties), 1))`);
  console.log(`  ✓ properties: ${inserted}/${rows.length} rows`);
} else {
  // Just fix status on existing
  const fix = await client.query(
    `UPDATE properties SET status='approved', approved_at=COALESCE(approved_at, NOW())
     WHERE status IN ('active','published') OR (status='approved' AND approved_at IS NULL)`
  );
  console.log(`  ✓ Fixed ${fix.rowCount} property status(es)`);
}

// ── 3. Seed email templates ───────────────────────────────────────────────────
const etCount = await client.query(`SELECT COUNT(*) FROM email_templates`);
if (parseInt(etCount.rows[0].count) === 0) {
  console.log("⏳ Seeding email templates...");
  const d = JSON.parse(fs.readFileSync(path.join(SEEDS_DIR, "email.json"), "utf8"));
  const rows = d.tables?.emailTemplates || [];
  let inserted = 0;
  for (const row of rows) {
    try {
      await client.query(
        `INSERT INTO email_templates (id, name, slug, subject, html_body, plain_body, category, channels, variables, is_active)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         ON CONFLICT (id) DO NOTHING`,
        [
          row.id, row.name, row.slug, row.subject,
          row.html_body || '', row.plain_body || '',
          row.category || 'custom',
          row.channels || '["email"]',
          row.variables || '[]',
          row.is_active !== false,
        ]
      );
      inserted++;
    } catch (e) {
      // slug unique conflict or other — skip
    }
  }
  await client.query(`SELECT setval(pg_get_serial_sequence('"email_templates"', 'id'), COALESCE((SELECT MAX(id) FROM email_templates), 1))`);
  console.log(`  ✓ email_templates: ${inserted}/${rows.length} rows`);
}

// ── 4. Summary ────────────────────────────────────────────────────────────────
const summary = await client.query(`
  SELECT
    (SELECT COUNT(*) FROM properties WHERE status='approved') as approved_props,
    (SELECT COUNT(*) FROM properties) as total_props,
    (SELECT COUNT(*) FROM providers) as providers,
    (SELECT COUNT(*) FROM areas) as areas,
    (SELECT COUNT(*) FROM categories) as categories,
    (SELECT COUNT(*) FROM email_templates) as email_templates,
    (SELECT COUNT(*) FROM billing_plans) as billing_plans
`);
console.log("\n📊 Database summary:");
const s = summary.rows[0];
console.log(`  properties:      ${s.approved_props} approved / ${s.total_props} total`);
console.log(`  providers:       ${s.providers}`);
console.log(`  areas:           ${s.areas}`);
console.log(`  categories:      ${s.categories}`);
console.log(`  email_templates: ${s.email_templates}`);
console.log(`  billing_plans:   ${s.billing_plans}`);

await client.end();
console.log("\n✅ Done!");
