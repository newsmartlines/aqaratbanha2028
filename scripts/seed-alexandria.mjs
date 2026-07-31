/**
 * seed-alexandria.mjs
 * - Disables ALL existing regions (Cairo, Qalyubia, etc.)
 * - Adds محافظة الإسكندرية with all districts and neighborhoods
 */
import pg from "pg";
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── Alexandria data ──────────────────────────────────────────────────────────
// Organized by قسم (district/city) with their أحياء (neighborhoods)
const ALEX_CITIES = [
  {
    nameAr: "الميناء",
    nameEn: "El Mina",
    areas: [
      "الميناء", "بحري", "الأنفوشي", "المنشية", "قايتباي",
      "الجمرك", "العطارين", "كوم الدكة", "محرم بك",
      "اللبان", "السيوف", "أبو قير الميناء",
    ],
  },
  {
    nameAr: "المنتزه",
    nameEn: "Montazah",
    areas: [
      "المنتزه", "سموحة", "ميامي", "سيدي بشر",
      "فيكتوريا", "أسيوط", "العجمي المنتزه",
      "رشدي", "بولكلي", "كليوباترا",
      "زيزينيا", "سيدي جابر", "ستانلي",
    ],
  },
  {
    nameAr: "شرق الإسكندرية",
    nameEn: "East Alexandria",
    areas: [
      "العجمي", "الهانوفيل", "الدخيلة", "الديخيلة",
      "أبو يوسف", "سيدي كرير",
      "الكيلو 21", "الكيلو 45",
    ],
  },
  {
    nameAr: "الرمل والشاطبي",
    nameEn: "Raml & Shatby",
    areas: [
      "الرمل", "الشاطبي", "محطة الرمل", "الإبراهيمية",
      "باكوس", "سيدي إبراهيم", "كامب شيزار",
      "لوران", "المعمورة", "العصافرة",
    ],
  },
  {
    nameAr: "وسط الإسكندرية",
    nameEn: "Central Alexandria",
    areas: [
      "وسط البلد", "محطة مصر", "باب شرق", "الإسكندرية القديمة",
      "العطارين", "منشية القصر", "محرم بك الوسطى",
      "السلسلة", "قصر الحكمة",
    ],
  },
  {
    nameAr: "العامرية",
    nameEn: "Ameria",
    areas: [
      "العامرية", "برج العرب", "برج العرب الجديدة", "الصناعية",
      "العجمي الصناعية", "المدينة الصناعية برج العرب",
      "الهانوفيل الصناعي", "اسكندرية الجديدة",
    ],
  },
  {
    nameAr: "الدخيلة",
    nameEn: "Dekheila",
    areas: [
      "الدخيلة", "العامرية الجديدة", "النخيل",
      "بكوس الدخيلة", "المحاليق", "سيدي براني الدخيلة",
    ],
  },
  {
    nameAr: "أبو قير",
    nameEn: "Abu Qir",
    areas: [
      "أبو قير", "خليج أبو قير", "إدكو",
      "المعمورة الشاطئ", "العصافرة البحرية",
      "أبو قير السكنية",
    ],
  },
  {
    nameAr: "برج العرب والمناطق الجديدة",
    nameEn: "Borg El Arab & New Areas",
    areas: [
      "برج العرب", "مدينة برج العرب الجديدة",
      "المنطقة الصناعية برج العرب",
      "الكيلو 50", "الكيلو 55",
      "مدينة السلام الجديدة", "الساحل الشمالي الكيلو 60",
    ],
  },
  {
    nameAr: "العجمي والهانوفيل",
    nameEn: "Agami & Hannoville",
    areas: [
      "العجمي", "الهانوفيل", "بيتاش", "هانوفيل الجديدة",
      "نجيلة", "العامية", "الكيلو 21", "الكيلو 26",
    ],
  },
  {
    nameAr: "كرموز ومينا البصل",
    nameEn: "Karmous & Mina El Basal",
    areas: [
      "كرموز", "مينا البصل", "غيط العنب", "بحري الصناعي",
      "سيدي عبيد", "محرم بك الصناعي",
    ],
  },
  {
    nameAr: "السيوف والقبة",
    nameEn: "Syouph & Qobbah",
    areas: [
      "السيوف", "القبة", "سيدي بشر البحرية",
      "العصافرة القبلية", "الحضرة", "السبع بنات",
    ],
  },
];

// ─── helpers ─────────────────────────────────────────────────────────────────
async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    return (await client.query(sql, params)).rows;
  } finally {
    client.release();
  }
}

// ─── main ────────────────────────────────────────────────────────────────────
async function main() {
  // 1. Disable ALL existing regions
  console.log("⏳ Disabling all existing regions...");
  const allRegions = await query(`SELECT id, name_ar FROM regions`);
  for (const r of allRegions) {
    await query(`UPDATE regions SET enabled = false WHERE id = $1`, [r.id]);
    const cities = await query(`SELECT id FROM cities WHERE region_id = $1`, [r.id]);
    for (const c of cities) {
      await query(`UPDATE cities SET enabled = false WHERE id = $1`, [c.id]);
      await query(`UPDATE areas SET enabled = false WHERE city_id = $1`, [c.id]);
    }
    console.log(`  ✅ Disabled: ${r.name_ar}`);
  }

  // 2. Create Alexandria region (or find if already exists)
  console.log("\n⏳ Setting up محافظة الإسكندرية...");
  let [alex] = await query(
    `SELECT id FROM regions WHERE name_ar = 'محافظة الإسكندرية' LIMIT 1`
  );
  if (!alex) {
    [alex] = await query(
      `INSERT INTO regions (name_ar, name_en, "order", enabled)
       VALUES ('محافظة الإسكندرية', 'Alexandria Governorate', 1, true)
       RETURNING id`
    );
    console.log(`✅ Created Alexandria region id=${alex.id}`);
  } else {
    await query(`UPDATE regions SET enabled = true WHERE id = $1`, [alex.id]);
    console.log(`ℹ️  Alexandria region already exists id=${alex.id}, enabled.`);
  }

  // 3. Insert cities + areas
  let totalAreas = 0;
  for (const cityDef of ALEX_CITIES) {
    const [existing] = await query(
      `SELECT id FROM cities WHERE region_id = $1 AND name_ar = $2 LIMIT 1`,
      [alex.id, cityDef.nameAr]
    );

    let cityId;
    if (existing) {
      await query(`UPDATE cities SET enabled = true WHERE id = $1`, [existing.id]);
      cityId = existing.id;
      console.log(`  ℹ️  City already exists: ${cityDef.nameAr} (id=${cityId})`);
    } else {
      const [city] = await query(
        `INSERT INTO cities (region_id, name_ar, name_en, enabled)
         VALUES ($1, $2, $3, true) RETURNING id`,
        [alex.id, cityDef.nameAr, cityDef.nameEn]
      );
      cityId = city.id;
      console.log(`  ✅ Created city: ${cityDef.nameAr} (id=${cityId})`);
    }

    for (const areaName of cityDef.areas) {
      const [existingArea] = await query(
        `SELECT id FROM areas WHERE city_id = $1 AND name_ar = $2 LIMIT 1`,
        [cityId, areaName]
      );
      if (!existingArea) {
        await query(
          `INSERT INTO areas (city_id, name_ar, name_en, enabled) VALUES ($1, $2, $2, true)`,
          [cityId, areaName]
        );
        totalAreas++;
      } else {
        await query(`UPDATE areas SET enabled = true WHERE id = $1`, [existingArea.id]);
      }
    }
  }

  // 4. Summary
  const [cityCount] = await query(
    `SELECT COUNT(*) FROM cities WHERE region_id = $1`, [alex.id]
  );
  const [areaCount] = await query(
    `SELECT COUNT(*) FROM areas a JOIN cities c ON a.city_id = c.id WHERE c.region_id = $1`,
    [alex.id]
  );

  console.log(`\n🎉 Done!`);
  console.log(`   Alexandria cities : ${cityCount.count}`);
  console.log(`   Alexandria areas  : ${areaCount.count} (${totalAreas} newly inserted)`);

  // 5. Confirm only Alexandria is visible
  const visible = await query(`SELECT name_ar FROM regions WHERE enabled = true`);
  console.log(`\n   Active regions: ${visible.map(r => r.name_ar).join(", ")}`);

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
