/**
 * seed-cairo.mjs
 * - Adds محافظة القاهرة with all districts/neighborhoods
 * - Disables محافظة القليوبية (region + all its cities + all their areas)
 */
import pg from "pg";
const { Pool } = pg;

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

// ─── Cairo data ──────────────────────────────────────────────────────────────
// Each entry = a "city" (قسم/حي كبير) with its sub-areas (أحياء/مناطق)
const CAIRO_CITIES = [
  {
    nameAr: "وسط البلد والأزبكية",
    nameEn: "Downtown & Azbakia",
    areas: [
      "وسط البلد", "العتبة", "الأزبكية", "باب الشعرية", "الأنفوشي",
      "الموسكي", "خان الخليلي", "الغورية", "الجمالية", "بولاق أبو العلا",
      "روض الفرج", "المنيل", "الخليفة", "السيدة زينب",
      "مصر القديمة", "الفسطاط",
    ],
  },
  {
    nameAr: "شبرا",
    nameEn: "Shubra",
    areas: [
      "شبرا المنيرة", "شبرا الخيمة", "الزاوية الحمراء", "المرج",
      "المرج الجديدة", "خصوص", "منشية ناصر",
      "دويقة", "المطبعة", "الولي", "الشرابية", "الساحل",
    ],
  },
  {
    nameAr: "مصر الجديدة والنزهة",
    nameEn: "Heliopolis & Nozha",
    areas: [
      "مصر الجديدة", "النزهة", "النزهة الجديدة", "ألماظة",
      "سراي القبة", "عين شمس", "عين شمس الجديدة",
      "الحي العاشر", "الحي الثامن", "بيجام", "عزبة النخل",
      "المطرية", "السلام", "الزيتون",
    ],
  },
  {
    nameAr: "مدينة نصر",
    nameEn: "Nasr City",
    areas: [
      "الحي الأول", "الحي الثاني", "الحي الثالث", "الحي الرابع",
      "الحي الخامس", "الحي السادس", "الحي السابع", "الحي الثامن",
      "الحي العاشر", "الحي العاشر الجديد", "زهراء مدينة نصر",
      "المنطقة العاشرة", "أرض المعارض", "الحرس الجمهوري", "المنتزه",
    ],
  },
  {
    nameAr: "التجمع الخامس والقاهرة الجديدة",
    nameEn: "5th Settlement & New Cairo",
    areas: [
      "التجمع الأول", "التجمع الثالث", "التجمع الخامس",
      "البنفسج", "القرنفل", "النرجس", "الياسمين",
      "اللوتس", "بيت الوطن", "الحي المتميز",
      "مدينة الرحاب", "مدينة المستقبل", "الشروق",
      "القطامية", "التجمع الرابع",
    ],
  },
  {
    nameAr: "مدينة بدر والعبور",
    nameEn: "Badr City & Obour",
    areas: [
      "مدينة بدر", "مدينة العبور", "الحي الأول بدر", "الحي الثاني بدر",
      "الحي الثالث بدر", "منطقة الخدمات بدر", "المنطقة الصناعية بدر",
      "الحي الأول العبور", "الحي الثاني العبور", "كمبوند العبور",
      "بساتين العبور",
    ],
  },
  {
    nameAr: "المعادي",
    nameEn: "Maadi",
    areas: [
      "المعادي", "المعادي الجديدة", "المعادي الكبرى",
      "كورنيش المعادي", "دجلة", "زهراء المعادي",
      "ثروت", "الأمل", "المعادي الوسطى",
    ],
  },
  {
    nameAr: "حلوان والتبين",
    nameEn: "Helwan & Tibbin",
    areas: [
      "حلوان", "عين حلوان", "التبين", "وادي حوف",
      "المعصرة", "15 مايو", "الكوم الأحمر",
      "المسطرد", "العامرية",
    ],
  },
  {
    nameAr: "المقطم",
    nameEn: "Mokattam",
    areas: [
      "المقطم", "عزبة الهجانة", "الحي الأول مقطم",
      "الحي الثاني مقطم", "الحي الثالث مقطم", "الحي الرابع مقطم",
      "الحوامدية", "كوم الشقافة",
    ],
  },
  {
    nameAr: "عابدين والسيدة زينب",
    nameEn: "Abdeen & Sayeda Zeinab",
    areas: [
      "عابدين", "السيدة زينب", "القلعة", "المنيل",
      "الخليفة", "السيدة عائشة", "فم الخليج",
    ],
  },
  {
    nameAr: "الزمالك والعجوزة",
    nameEn: "Zamalek & Agouza",
    areas: [
      "الزمالك", "العجوزة", "الدقي", "المهندسين",
      "بولاق الدكرور", "فيصل", "الهرم",
    ],
  },
  {
    nameAr: "إمبابة وأوسيم",
    nameEn: "Imbaba & Ausim",
    areas: [
      "إمبابة", "أوسيم", "العمرانية", "كرداسة",
      "أبو النمرس", "بشتيل", "الوراق",
      "منشية القناطر", "طوخ الخيل",
    ],
  },
  {
    nameAr: "الشروق والعاشر من رمضان",
    nameEn: "El Shorouk & 10th of Ramadan",
    areas: [
      "مدينة الشروق", "العاشر من رمضان", "الحي الأول العاشر",
      "الحي الثاني العاشر", "الحي الثالث العاشر",
      "المنطقة الصناعية العاشر", "مدينة الحسين الصناعية",
    ],
  },
  {
    nameAr: "مدينة السلام والنهضة",
    nameEn: "El Salam & Nahda",
    areas: [
      "مدينة السلام", "النهضة", "البساتين", "دار السلام",
      "الشياخة", "الأميرية", "الخصوص",
    ],
  },
  {
    nameAr: "روض الفرج والشرابية",
    nameEn: "Rod El Farag & Sharabia",
    areas: [
      "روض الفرج", "الشرابية", "الساحل", "أمبابة العرب",
      "كوبري القبة", "مصر الجديدة القديمة",
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
  // 1. Disable Qalyubia region + its cities + their areas
  console.log("⏳ Disabling القليوبية region...");
  const [qalyubia] = await query(
    `SELECT id FROM regions WHERE name_ar = 'محافظة القليوبية' LIMIT 1`
  );
  if (qalyubia) {
    await query(`UPDATE regions SET enabled = false WHERE id = $1`, [qalyubia.id]);
    const cities = await query(`SELECT id FROM cities WHERE region_id = $1`, [qalyubia.id]);
    for (const c of cities) {
      await query(`UPDATE cities SET enabled = false WHERE id = $1`, [c.id]);
      await query(`UPDATE areas SET enabled = false WHERE city_id = $1`, [c.id]);
    }
    console.log(`✅ Disabled القليوبية (id=${qalyubia.id}) + ${cities.length} cities + their areas.`);
  } else {
    console.log("⚠️  القليوبية region not found — skipping disable.");
  }

  // 2. Create Cairo region (or find if already exists)
  console.log("⏳ Setting up محافظة القاهرة...");
  let [cairo] = await query(
    `SELECT id FROM regions WHERE name_ar = 'محافظة القاهرة' LIMIT 1`
  );
  if (!cairo) {
    [cairo] = await query(
      `INSERT INTO regions (name_ar, name_en, "order", enabled)
       VALUES ('محافظة القاهرة', 'Cairo Governorate', 2, true)
       RETURNING id`
    );
    console.log(`✅ Created Cairo region id=${cairo.id}`);
  } else {
    await query(`UPDATE regions SET enabled = true WHERE id = $1`, [cairo.id]);
    console.log(`ℹ️  Cairo region already exists id=${cairo.id}, ensuring enabled.`);
  }

  // 3. Insert cities + areas (skip cities that already exist under this region)
  let totalAreas = 0;
  for (const cityDef of CAIRO_CITIES) {
    const [existing] = await query(
      `SELECT id FROM cities WHERE region_id = $1 AND name_ar = $2 LIMIT 1`,
      [cairo.id, cityDef.nameAr]
    );

    let cityId;
    if (existing) {
      cityId = existing.id;
      console.log(`  ℹ️  City already exists: ${cityDef.nameAr} (id=${cityId})`);
    } else {
      const [city] = await query(
        `INSERT INTO cities (region_id, name_ar, name_en, enabled)
         VALUES ($1, $2, $3, true) RETURNING id`,
        [cairo.id, cityDef.nameAr, cityDef.nameEn]
      );
      cityId = city.id;
      console.log(`  ✅ Created city: ${cityDef.nameAr} (id=${cityId})`);
    }

    // Insert areas that don't already exist for this city
    for (const areaName of cityDef.areas) {
      const [existingArea] = await query(
        `SELECT id FROM areas WHERE city_id = $1 AND name_ar = $2 LIMIT 1`,
        [cityId, areaName]
      );
      if (!existingArea) {
        await query(
          `INSERT INTO areas (city_id, name_ar, name_en, enabled)
           VALUES ($1, $2, $2, true)`,
          [cityId, areaName]
        );
        totalAreas++;
      }
    }
  }

  // 4. Summary
  const [cityCount] = await query(
    `SELECT COUNT(*) FROM cities WHERE region_id = $1`, [cairo.id]
  );
  const [areaCount] = await query(
    `SELECT COUNT(*) FROM areas a
     JOIN cities c ON a.city_id = c.id
     WHERE c.region_id = $1`, [cairo.id]
  );

  console.log(`\n🎉 Done!`);
  console.log(`   Cairo cities : ${cityCount.count}`);
  console.log(`   Cairo areas  : ${areaCount.count} (${totalAreas} newly inserted)`);

  await pool.end();
}

main().catch(e => { console.error(e); process.exit(1); });
