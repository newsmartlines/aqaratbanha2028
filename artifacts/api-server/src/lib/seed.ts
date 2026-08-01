import { db } from "@workspace/db";
import {
  categoriesTable, usersTable, packagesTable, providersTable,
  subscriptionsTable, reviewsTable,
  regionsTable, citiesTable, areasTable, billingPlansTable,
  propertiesTable, featuredAreasTable, emailTemplatesTable, siteSettingsTable,
  subcategoriesTable, menuItemsTable, promotionTypesTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";
import { eq, sql } from "drizzle-orm";
import path from "path";
import fs from "fs/promises";
import { existsSync } from "fs";

// ── Billing Plans ─────────────────────────────────────────────────────────────

const DEFAULT_BILLING_PLANS = [
  { name: "Free", nameAr: "مجاني", price: "0", yearlyPrice: "0", currency: "EGP", durationDays: 30, durationType: "monthly", userType: "all", status: "active", isRecommended: false, isMostPopular: false, trialDays: 0, sortOrder: 0, color: "#64748b", commissionPercent: "0", descriptionAr: "الباقة المجانية - ابدأ مجاناً", limits: JSON.stringify({ properties: 3, photos: 10, videos: 0, featuredAds: 0, pinnedAds: 0, messages: 20, leads: 10 }), features: JSON.stringify({ homepageDisplay: false, topSearch: false, verifiedBadge: false, premiumBadge: false, prioritySupport: false, analytics: false, seo: false, aiTools: false, autoBoost: false }) },
  { name: "Bronze", nameAr: "برونز", price: "99", yearlyPrice: "999", currency: "EGP", durationDays: 30, durationType: "monthly", userType: "all", status: "active", isRecommended: false, isMostPopular: true, trialDays: 7, sortOrder: 1, color: "#b45309", commissionPercent: "0", descriptionAr: "باقة البرونز للمبتدئين", limits: JSON.stringify({ properties: 10, photos: 20, videos: 2, featuredAds: 3, pinnedAds: 1, messages: 100, leads: 50 }), features: JSON.stringify({ homepageDisplay: true, topSearch: false, verifiedBadge: false, premiumBadge: false, prioritySupport: false, analytics: true, seo: false, aiTools: false, autoBoost: false }) },
  { name: "Silver", nameAr: "فضي", price: "199", yearlyPrice: "1999", currency: "EGP", durationDays: 30, durationType: "monthly", userType: "all", status: "active", isRecommended: true, isMostPopular: false, trialDays: 7, sortOrder: 2, color: "#475569", commissionPercent: "0", descriptionAr: "الباقة الفضية للسماسرة", limits: JSON.stringify({ properties: 30, photos: 30, videos: 5, featuredAds: 10, pinnedAds: 3, messages: 500, leads: 200 }), features: JSON.stringify({ homepageDisplay: true, topSearch: true, verifiedBadge: true, premiumBadge: false, prioritySupport: false, analytics: true, seo: true, aiTools: false, autoBoost: false }) },
  { name: "Gold", nameAr: "ذهبي", price: "399", yearlyPrice: "3999", currency: "EGP", durationDays: 30, durationType: "monthly", userType: "all", status: "active", isRecommended: false, isMostPopular: false, trialDays: 14, sortOrder: 3, color: "#ca8a04", commissionPercent: "0", descriptionAr: "الباقة الذهبية للشركات", limits: JSON.stringify({ properties: 100, photos: 50, videos: 10, featuredAds: 30, pinnedAds: 10, messages: -1, leads: -1 }), features: JSON.stringify({ homepageDisplay: true, topSearch: true, verifiedBadge: true, premiumBadge: true, prioritySupport: true, analytics: true, seo: true, aiTools: true, autoBoost: false }) },
  { name: "VIP", nameAr: "VIP", price: "799", yearlyPrice: "7999", currency: "EGP", durationDays: 30, durationType: "monthly", userType: "all", status: "active", isRecommended: false, isMostPopular: false, trialDays: 14, sortOrder: 4, color: "#7c3aed", commissionPercent: "0", descriptionAr: "باقة VIP - صلاحيات غير محدودة", limits: JSON.stringify({ properties: -1, photos: -1, videos: -1, featuredAds: -1, pinnedAds: -1, messages: -1, leads: -1 }), features: JSON.stringify({ homepageDisplay: true, topSearch: true, verifiedBadge: true, premiumBadge: true, prioritySupport: true, analytics: true, seo: true, aiTools: true, autoBoost: true }) },
];


// ── Main Entry ────────────────────────────────────────────────────────────────

// ── Auto-seed from lib/db/seeds/ (for fresh deployments) ─────────────────────

// process.cwd() == artifacts/api-server  →  go up two levels to workspace root
const SEEDS_DIR = path.resolve(process.cwd(), "../../lib/db/seeds");

function toSnakeKey(str: string): string {
  return str.replace(/([A-Z])/g, "_$1").toLowerCase();
}

/**
 * Reads JSON seed files from lib/db/seeds/ and restores any empty tables.
 * Called at startup before the hardcoded seed functions so fresh deployments
 * auto-populate from committed seed files (GitHub → clone → run = full data).
 *
 * Returns the set of table keys that were restored from files (so the
 * hardcoded seed can skip those tables to avoid duplicate logic).
 */
export async function seedFromFiles(): Promise<Set<string>> {
  const seeded = new Set<string>();

  const manifestPath = path.join(SEEDS_DIR, "manifest.json");
  if (!existsSync(manifestPath)) return seeded;

  let manifest: { files?: string[] } = {};
  try {
    manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));
  } catch {
    return seeded;
  }

  const files = (manifest.files ?? []).filter((f: string) => f.endsWith(".json"));
  if (files.length === 0) return seeded;

  console.log(`[seed-files] Found ${files.length} seed file(s) in lib/db/seeds/`);

  // DB table name → table name for sequence reset
  const tablesToReset = new Set<string>();

  for (const file of files) {
    const fp = path.join(SEEDS_DIR, file);
    if (!existsSync(fp)) continue;

    let content: { tables?: Record<string, any[]> } = {};
    try {
      content = JSON.parse(await fs.readFile(fp, "utf8"));
    } catch {
      console.warn(`[seed-files] Could not parse ${file}, skipping`);
      continue;
    }

    const tables = content.tables ?? {};

    for (const [tableKey, rows] of Object.entries(tables)) {
      if (!rows || rows.length === 0) continue;

      // Map key → db table name
      const dbName = tableKeyToDbName(tableKey);
      if (!dbName) continue;

      try {
        // Only restore if table is currently empty
        const result = await db.execute(sql.raw(`SELECT COUNT(*) as cnt FROM "${dbName}"`)) as unknown as any;
        const rows: any[] = Array.isArray(result) ? result : (result?.rows ?? []);
        const existingCount = parseInt(rows[0]?.cnt ?? "0", 10);
        if (existingCount > 0) {
          console.log(`[seed-files] ${dbName}: already has ${existingCount} rows, skipping`);
          continue;
        }

        let inserted = 0;
        for (const row of rows) {
          try {
            const keys = Object.keys(row);
            const vals = Object.values(row);
            const colSqls = keys.map(k => sql.raw(`"${toSnakeKey(k)}"`));
            const valSqls = vals.map(v => sql`${v}`);
            await db.execute(
              sql`INSERT INTO ${sql.raw(`"${dbName}"`)} (${sql.join(colSqls, sql`,`)}) VALUES (${sql.join(valSqls, sql`,`)}) ON CONFLICT (id) DO NOTHING`,
            );
            inserted++;
          } catch {
            // row conflict or error — skip
          }
        }

        console.log(`[seed-files] ${dbName}: restored ${inserted}/${rows.length} rows`);
        seeded.add(tableKey);
        tablesToReset.add(dbName);
      } catch (err: any) {
        console.warn(`[seed-files] Error restoring ${dbName}:`, err?.message);
      }
    }
  }

  // Reset sequences for all restored tables
  for (const dbName of tablesToReset) {
    try {
      await db.execute(
        sql.raw(`SELECT setval(pg_get_serial_sequence('"${dbName}"', 'id'), COALESCE((SELECT MAX(id) FROM "${dbName}"), 1))`),
      );
    } catch {
      // no sequence — ignore
    }
  }

  if (seeded.size > 0) {
    console.log(`[seed-files] ✅ Restored ${seeded.size} table(s) from seed files`);
  }

  return seeded;
}

/** Maps the camelCase table key used in seed files to the PostgreSQL table name. */
function tableKeyToDbName(key: string): string | null {
  const map: Record<string, string> = {
    regions: "regions",
    cities: "cities",
    areas: "areas",
    featuredAreas: "featured_areas",
    categories: "categories",
    subcategories: "subcategories",
    properties: "properties",
    emailTemplates: "email_templates",
    siteSettings: "site_settings",
    billingPlans: "billing_plans",
    commissionRules: "commission_rules",
    packages: "packages",
    propertyFieldConfigs: "property_field_configs",
    adminStaff: "admin_staff",
    users: "users",
  };
  return map[key] ?? null;
}

// ── Main Entry ────────────────────────────────────────────────────────────────

export async function seed() {
  console.log("Seeding database...");

  // ── Step 0: Try restoring from committed seed files (GitHub-friendly) ───────
  // This runs first so that when cloning to a new server, all admin-exported
  // data is automatically restored before the hardcoded defaults kick in.
  // The sub-seeders below all detect existing data and skip gracefully.
  await seedFromFiles().catch((err: any) => console.warn("[seed-files] Could not load seed files:", err?.message));

  // Billing plans
  const existingBP = await db.select({ id: billingPlansTable.id }).from(billingPlansTable).limit(1);
  if (existingBP.length === 0) {
    for (const p of DEFAULT_BILLING_PLANS) {
      await db.insert(billingPlansTable).values(p as any).onConflictDoNothing();
    }
    console.log("Billing plans seeded.");
  }

  // Real estate providers seed
  const existingCats = await db.select().from(categoriesTable);
  if (existingCats.length === 0) {
    const packages = await db.insert(packagesTable).values([
      { nameAr: "مجاني", nameEn: "Free", price: "0", durationDays: 30, maxListings: 3, featuredAllowed: 0, topBadge: false, priorityRank: 0 },
      { nameAr: "برونزي", nameEn: "Bronze", price: "99", durationDays: 30, maxListings: 10, featuredAllowed: 3, topBadge: false, priorityRank: 1 },
      { nameAr: "بريميوم", nameEn: "Premium", price: "249", durationDays: 30, maxListings: null, featuredAllowed: null, topBadge: true, priorityRank: 2 },
    ]).returning();

    const adminHash = await bcrypt.hash("admin123", 10);
    const [adminUser] = await db.insert(usersTable).values({ name: "Admin", email: "admin@aqaralex.com", passwordHash: adminHash, role: "admin" }).returning();

    const providerData = [
      { name: "أحمد عبدالله", email: "ahmed@aqaralex.com", city: "سيدي جابر", bio: "سمسار عقارات محترف بخبرة 10 سنوات في الإسكندرية", rating: "4.9", featured: true, verified: true },
      { name: "سارة الغامدي", email: "sara@aqaralex.com", city: "سموحة", bio: "خبيرة تسويق عقاري ومستشارة مبيعات في الإسكندرية", rating: "4.8", featured: true, verified: true },
      { name: "نواف العتيبي", email: "nawaf@aqaralex.com", city: "المنتزه", bio: "وسيط عقاري متخصص في عقارات الإسكندرية", rating: "4.7", featured: false, verified: true },
      { name: "أم خالد", email: "oumkhalid@aqaralex.com", city: "كليوباترا", bio: "وسيطة عقارية ومتخصصة في عقارات محافظة الإسكندرية", rating: "4.9", featured: true, verified: true },
      { name: "منى الشهري", email: "mona@aqaralex.com", city: "لوران", bio: "مستشارة عقارية ومتخصصة في الاستثمار العقاري بالإسكندرية", rating: "4.6", featured: false, verified: true },
      { name: "هنود القرني", email: "hanood@aqaralex.com", city: "الشاطبي", bio: "وسيط عقاري خبرة 7 سنوات في بيع وإيجار الشقق بالإسكندرية", rating: "4.8", featured: true, verified: true },
    ];

    const passHash = await bcrypt.hash("provider123", 10);
    for (const p of providerData) {
      const [user] = await db.insert(usersTable).values({ name: p.name, email: p.email, passwordHash: passHash, role: "provider" }).returning();
      const [provider] = await db.insert(providersTable).values({
        userId: user.id, bio: p.bio, city: p.city,
        rating: p.rating,
        reviewsCount: Math.floor(Math.random() * 80) + 10,
        verified: p.verified, featured: p.featured, approved: true
      }).returning();

      const now = new Date();
      const end = new Date(now); end.setDate(end.getDate() + 18);
      await db.insert(subscriptionsTable).values({ providerId: provider.id, packageId: packages[1].id, startDate: now, endDate: end, status: "active" });

      await db.insert(reviewsTable).values([
        { providerId: provider.id, rating: 5, text: "خدمة ممتازة ومحترفة", userId: adminUser.id },
        { providerId: provider.id, rating: 4, text: "عمل جيد وسريع", userId: adminUser.id },
      ]);
    }
    console.log("Main data seeded.");
  }

  await seedEgyptLocations();
  await seedRealEstateCategories();
  await seedRealEstateSubcategories();
  await seedFeaturedAreas();
  await seedProperties();
  await seedEmailTemplates();
  await seedSiteSettings();
  await seedDefaultAccounts();
  await seedMenuItems();
  await seedPromotionTypes();

  console.log("Database seeded successfully!");

  // ── Initial write-through export ──────────────────────────────────────────
  // On first run (no seed files yet), export the current DB state so that
  // git-committed files survive any environment change / new Replit project.
  try {
    const { existsSync } = await import("fs");
    const manifestPath = path.resolve(process.cwd(), "../../lib/db/seeds/manifest.json");
    let needsExport = !existsSync(manifestPath);
    if (!needsExport) {
      const m = JSON.parse(await (await import("fs/promises")).readFile(manifestPath, "utf8"));
      needsExport = !Array.isArray(m.files) || m.files.length === 0;
    }
    if (needsExport) {
      const { autoExportAll } = await import("./auto-export");
      await autoExportAll();
    }
  } catch (err: any) {
    console.warn("[seed] Initial export skipped:", err?.message);
  }
}

// ── Alexandria Locations ──────────────────────────────────────────────────────

export async function seedEgyptLocations() {
  const existing = await db.select({ id: regionsTable.id }).from(regionsTable)
    .where(eq(regionsTable.nameAr, "محافظة الإسكندرية")).limit(1);
  if (existing.length > 0) {
    console.log("Alexandria locations already seeded, skipping.");
    return;
  }
  console.log("Seeding Alexandria locations...");

  const alexandriaRegions = [
    {
      nameAr: "محافظة الإسكندرية", nameEn: "Alexandria Governorate", order: 1,
      cities: [
        {
          name: "حي المنتزه", nameEn: "Montaza District",
          areas: [
            "سيدي بشر", "ميامي", "المندرة", "المنتزه", "المعمورة", "طيبة", "زيزينيا", "سموحة", "عصافرة",
          ]
        },
        {
          name: "حي شرق", nameEn: "East District",
          areas: [
            "الشاطبي", "كليوباترا", "سبورتنج", "رشدي", "محطة الرمل", "سيدي جابر", "جليم", "لوران", "بكوس", "فيكتوريا",
          ]
        },
        {
          name: "حي وسط", nameEn: "Central District",
          areas: [
            "المنشية", "محطة مصر", "باب شرق", "الأزاريطة", "الفلكي", "العطارين", "محرم بك", "وسط البلد", "الشلالات", "كوم الدكة",
          ]
        },
        {
          name: "حي الجمرك", nameEn: "Gomrok District",
          areas: [
            "الجمرك", "اللبان", "بحري", "الورديان", "الأنفوشي", "قايتباي", "المكس",
          ]
        },
        {
          name: "حي العجمي", nameEn: "Agami District",
          areas: [
            "العجمي", "المتراس", "الهانوفيل", "الزعفران", "سيدي كرير", "أبو تلات",
          ]
        },
        {
          name: "حي العامرية", nameEn: "Ameriya District",
          areas: [
            "العامرية", "المحمودية", "الفردوس", "العرب", "الحضرة", "الأمل",
          ]
        },
        {
          name: "حي الدخيلة", nameEn: "Dekheila District",
          areas: [
            "الدخيلة", "صفر", "المنيرة", "الزهراء",
          ]
        },
        {
          name: "مركز أبو قير", nameEn: "Abu Qir Center",
          areas: [
            "أبو قير", "إيدكو",
          ]
        },
        {
          name: "مركز برج العرب", nameEn: "Borg El Arab Center",
          areas: [
            "برج العرب", "مدينة برج العرب الجديدة", "العلمين الجديدة",
          ]
        },
      ]
    },
  ];

  for (const r of alexandriaRegions) {
    const [region] = await db.insert(regionsTable).values({
      nameAr: r.nameAr,
      nameEn: r.nameEn,
      order: r.order,
      enabled: true,
    }).returning();

    for (const c of r.cities) {
      const [city] = await db.insert(citiesTable).values({
        regionId: region.id,
        nameAr: c.name,
        nameEn: c.nameEn,
        enabled: true,
      }).returning();

      if (c.areas.length > 0) {
        await db.insert(areasTable).values(
          c.areas.map(a => ({ cityId: city.id, nameAr: a, nameEn: a, enabled: true }))
        );
      }
    }
  }
  console.log("Alexandria locations seeded.");
}

// ── Saudi Arabia Regions (legacy) ─────────────────────────────────────────────

export async function seedRegions() {
  const existing = await db.select().from(regionsTable);
  if (existing.length > 0) {
    console.log("Regions already seeded.");
    return;
  }
  await seedEgyptLocations();
}

// ── Real Estate Categories ────────────────────────────────────────────────────

async function seedRealEstateCategories() {
  const existing = await db.select().from(categoriesTable).where(eq(categoriesTable.type, "real_estate"));
  if (existing.length > 0) {
    console.log("Real estate categories already seeded, skipping.");
    return;
  }
  console.log("Seeding real estate categories...");
  await db.insert(categoriesTable).values([
    { nameAr: "سكني", nameEn: "Residential", icon: "Home", slug: "residential", description: "الشقق والفيلات والمنازل السكنية", type: "real_estate" as const },
    { nameAr: "تجاري", nameEn: "Commercial", icon: "Store", slug: "commercial", description: "المحلات والمكاتب والعقارات التجارية", type: "real_estate" as const },
    { nameAr: "أراضي", nameEn: "Land", icon: "MapPin", slug: "land", description: "الأراضي والقطع السكنية والزراعية", type: "real_estate" as const },
    { nameAr: "صناعي", nameEn: "Industrial", icon: "Factory", slug: "industrial", description: "المخازن والمستودعات والمصانع", type: "real_estate" as const },
  ]);
  console.log("Real estate categories seeded.");
}

// ── Real Estate Subcategories ─────────────────────────────────────────────────

async function seedRealEstateSubcategories() {
  // Get all real estate categories
  const reCategories = await db
    .select()
    .from(categoriesTable)
    .where(eq(categoriesTable.type, "real_estate"));

  if (reCategories.length === 0) {
    console.log("No real estate categories found, skipping subcategory seed.");
    return;
  }

  const SUBCATEGORY_MAP: Record<string, { nameAr: string; nameEn: string; icon: string; slug: string }[]> = {
    residential: [
      { nameAr: "شقة",           nameEn: "Apartment",     icon: "Building2",  slug: "apartment" },
      { nameAr: "فيلا",          nameEn: "Villa",         icon: "Home",       slug: "villa" },
      { nameAr: "دوبلكس",        nameEn: "Duplex",        icon: "Layers",     slug: "duplex" },
      { nameAr: "استوديو",       nameEn: "Studio",        icon: "Home",       slug: "studio" },
      { nameAr: "شاليه",         nameEn: "Chalet",        icon: "Sunset",     slug: "chalet" },
      { nameAr: "غرفة مفردة",    nameEn: "Single Room",   icon: "Tag",        slug: "single-room" },
      { nameAr: "منزل مستقل",    nameEn: "Standalone",    icon: "Home",       slug: "standalone" },
      { nameAr: "طابق كامل",     nameEn: "Full Floor",    icon: "Layers",     slug: "full-floor" },
    ],
    commercial: [
      { nameAr: "محل تجاري",     nameEn: "Shop",          icon: "Store",      slug: "shop" },
      { nameAr: "مكتب",          nameEn: "Office",        icon: "Building",   slug: "office" },
      { nameAr: "مستودع",        nameEn: "Warehouse",     icon: "Warehouse",  slug: "warehouse" },
      { nameAr: "عمارة تجارية",  nameEn: "Commercial Building", icon: "Building2", slug: "commercial-building" },
      { nameAr: "معرض",          nameEn: "Showroom",      icon: "Layers",     slug: "showroom" },
      { nameAr: "صيدلية",        nameEn: "Pharmacy",      icon: "Tag",        slug: "pharmacy" },
      { nameAr: "مطعم أو كافيه", nameEn: "Restaurant/Cafe", icon: "Store",   slug: "restaurant" },
    ],
    land: [
      { nameAr: "أرض سكنية",     nameEn: "Residential Land",   icon: "Home",     slug: "land-residential" },
      { nameAr: "أرض تجارية",    nameEn: "Commercial Land",    icon: "Store",    slug: "land-commercial" },
      { nameAr: "أرض زراعية",    nameEn: "Agricultural Land",  icon: "Trees",    slug: "land-agricultural" },
      { nameAr: "أرض صناعية",    nameEn: "Industrial Land",    icon: "Factory",  slug: "land-industrial" },
      { nameAr: "أرض خدمية",     nameEn: "Service Land",       icon: "MapPin",   slug: "land-service" },
    ],
    industrial: [
      { nameAr: "مصنع",          nameEn: "Factory",       icon: "Factory",    slug: "factory" },
      { nameAr: "مستودع صناعي",  nameEn: "Industrial Warehouse", icon: "Warehouse", slug: "industrial-warehouse" },
      { nameAr: "ورشة",          nameEn: "Workshop",      icon: "Hammer",     slug: "workshop" },
      { nameAr: "منشأة صناعية",  nameEn: "Industrial Facility", icon: "Factory", slug: "industrial-facility" },
    ],
  };

  let totalInserted = 0;
  for (const cat of reCategories) {
    const slug = cat.slug ?? "";
    const subcats = SUBCATEGORY_MAP[slug];
    if (!subcats) continue;

    // Only insert subcategories that don't already exist for this category
    const existing = await db
      .select({ slug: subcategoriesTable.slug })
      .from(subcategoriesTable)
      .where(eq(subcategoriesTable.categoryId, cat.id));
    const existingSlugs = new Set(existing.map(e => e.slug));

    const toInsert = subcats.filter(s => !existingSlugs.has(s.slug));
    if (toInsert.length === 0) continue;

    await db.insert(subcategoriesTable).values(
      toInsert.map(s => ({
        categoryId: cat.id,
        nameAr: s.nameAr,
        nameEn: s.nameEn,
        icon: s.icon,
        slug: s.slug,
        status: "active" as const,
      }))
    ).onConflictDoNothing();
    totalInserted += toInsert.length;
  }

  if (totalInserted > 0) {
    console.log(`Real estate subcategories seeded: ${totalInserted} subcategories.`);
  } else {
    console.log("Real estate subcategories already seeded, skipping.");
  }
}

// ── Featured Areas ────────────────────────────────────────────────────────────

export async function seedFeaturedAreas() {
  const existing = await db.select({ id: featuredAreasTable.id }).from(featuredAreasTable).limit(1);
  if (existing.length > 0) {
    console.log("Featured areas already seeded, skipping.");
    return;
  }
  console.log("Seeding featured areas...");

  await db.insert(featuredAreasTable).values([
    { nameAr: "المنتزه",   image: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=600&q=80", cityName: "المنتزه",   displayOrder: 1,  enabled: true },
    { nameAr: "سيدي بشر", image: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=600&q=80", cityName: "سيدي بشر", displayOrder: 2,  enabled: true },
    { nameAr: "سموحة",    image: "https://images.unsplash.com/photo-1560472355-536de3962603?w=600&q=80", cityName: "سموحة",    displayOrder: 3,  enabled: true },
    { nameAr: "كليوباترا","image": "https://images.unsplash.com/photo-1502005097973-6a7082348e28?w=600&q=80", cityName: "كليوباترا",displayOrder: 4,  enabled: true },
    { nameAr: "العجمي",   image: "https://images.unsplash.com/photo-1486325212027-8081e485255e?w=600&q=80", cityName: "العجمي",   displayOrder: 5,  enabled: true },
    { nameAr: "برج العرب","image": "https://images.unsplash.com/photo-1515263487990-61b07816b324?w=600&q=80", cityName: "برج العرب",displayOrder: 6,  enabled: true },
    { nameAr: "وسط البلد","image": "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=600&q=80", cityName: "وسط البلد",displayOrder: 7,  enabled: true },
    { nameAr: "سيدي جابر","image": "https://images.unsplash.com/photo-1513584684374-8bab748fbf90?w=600&q=80", cityName: "سيدي جابر",displayOrder: 8,  enabled: true },
    { nameAr: "المعمورة", image: "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=600&q=80", cityName: "المعمورة", displayOrder: 9,  enabled: true },
    { nameAr: "زيزينيا",  image: "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=600&q=80", cityName: "زيزينيا",  displayOrder: 10, enabled: true },
    { nameAr: "لوران",    image: "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=600&q=80", cityName: "لوران",    displayOrder: 11, enabled: true },
  ]);
  console.log("Featured areas seeded.");
}

// ── Properties ────────────────────────────────────────────────────────────────

const FEATS_APT = JSON.stringify(["مصعد", "أمن وحراسة", "موقف سيارات", "إنترنت فايبر", "تكييف مركزي", "غرفة سفرتي"]);
const FEATS_VILLA = JSON.stringify(["حديقة خاصة", "مسبح", "جراج مغطى", "نظام أمن ذكي", "غرفة سائق", "مولد كهرباء"]);
const FEATS_COMM = JSON.stringify(["واجهة زجاجية", "تكييف مركزي", "مصعد", "موقف سيارات", "أمن 24 ساعة", "كاميرات مراقبة"]);
const FEATS_LAND = JSON.stringify(["موقع استراتيجي", "واجهة على شارع رئيسي", "مرافق كاملة"]);
const FEATS_DUPLEX = JSON.stringify(["سطح خاص", "تراس واسع", "مصعد خاص", "موقف سيارات", "غرفة مصلى"]);

const NEARBY_APT = JSON.stringify(["مسجد", "مدرسة", "سوبر ماركت", "صيدلية", "مستشفى"]);
const NEARBY_VILLA = JSON.stringify(["مسجد", "مدرسة", "مول تجاري", "نادي رياضي", "مستشفى", "بنك"]);
const NEARBY_COMM = JSON.stringify(["بنك", "مول تجاري", "مطاعم", "كافيهات", "محطة وقود"]);
const NEARBY_LAND = JSON.stringify(["مسجد", "مدرسة", "سوبر ماركت"]);
const NEARBY_DUPLEX = JSON.stringify(["مسجد", "مدرسة", "سوبر ماركت", "صيدلية", "مطاعم"]);

const CONTACT_ALL = JSON.stringify(["call", "whatsapp", "chat"]);
const CONTACT_CALL_WA = JSON.stringify(["call", "whatsapp"]);
const CONTACT_WA_CHAT = JSON.stringify(["whatsapp", "chat"]);

const IMGS_APT = JSON.stringify([
  "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80",
  "https://images.unsplash.com/photo-1502005097973-6a7082348e28?w=800&q=80",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80",
]);
const IMGS_VILLA = JSON.stringify([
  "https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80",
  "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80",
  "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80",
]);
const IMGS_LAND = JSON.stringify([
  "https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80",
  "https://images.unsplash.com/photo-1628624747186-a941c476b7ef?w=800&q=80",
]);
const IMGS_COMM = JSON.stringify([
  "https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80",
  "https://images.unsplash.com/photo-1497366754035-f200581cdaac?w=800&q=80",
]);
const IMGS_DUPLEX = JSON.stringify([
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=800&q=80",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80",
]);

async function seedProperties() {
  const existing = await db.select({ id: propertiesTable.id }).from(propertiesTable).limit(1);
  if (existing.length > 0) {
    console.log("Properties already seeded, skipping.");
    return;
  }

  const providers = await db.select({ id: providersTable.id }).from(providersTable).limit(6);
  if (providers.length === 0) {
    console.log("No providers found, skipping property seed.");
    return;
  }
  const pid = (i: number) => providers[i % providers.length].id;

  // Get Alexandria region/city IDs for linking
  const [alexRegion] = await db.select({ id: regionsTable.id }).from(regionsTable)
    .where(eq(regionsTable.nameAr, "محافظة الإسكندرية")).limit(1);

  const [montazaCity] = await db.select({ id: citiesTable.id }).from(citiesTable)
    .where(eq(citiesTable.nameAr, "حي المنتزه")).limit(1);
  const [sharqCity] = await db.select({ id: citiesTable.id }).from(citiesTable)
    .where(eq(citiesTable.nameAr, "حي شرق")).limit(1);
  const [wasatCity] = await db.select({ id: citiesTable.id }).from(citiesTable)
    .where(eq(citiesTable.nameAr, "حي وسط")).limit(1);
  const [gomrokCity] = await db.select({ id: citiesTable.id }).from(citiesTable)
    .where(eq(citiesTable.nameAr, "حي الجمرك")).limit(1);
  const [agamiCity] = await db.select({ id: citiesTable.id }).from(citiesTable)
    .where(eq(citiesTable.nameAr, "حي العجمي")).limit(1);
  const [ameriyaCity] = await db.select({ id: citiesTable.id }).from(citiesTable)
    .where(eq(citiesTable.nameAr, "حي العامرية")).limit(1);
  const [dekheilaCity] = await db.select({ id: citiesTable.id }).from(citiesTable)
    .where(eq(citiesTable.nameAr, "حي الدخيلة")).limit(1);
  const [abuqirCity] = await db.select({ id: citiesTable.id }).from(citiesTable)
    .where(eq(citiesTable.nameAr, "مركز أبو قير")).limit(1);
  const [borgCity] = await db.select({ id: citiesTable.id }).from(citiesTable)
    .where(eq(citiesTable.nameAr, "مركز برج العرب")).limit(1);

  const alexR = alexRegion?.id;
  const monC  = montazaCity?.id;
  const shrC  = sharqCity?.id;
  const wasC  = wasatCity?.id;
  const gomC  = gomrokCity?.id;
  const agaC  = agamiCity?.id;
  const ameC  = ameriyaCity?.id;
  const dekC  = dekheilaCity?.id;
  const abuC  = abuqirCity?.id;
  const borC  = borgCity?.id;

  console.log("Seeding properties...");

  await db.insert(propertiesTable).values([
    // ── شقق للبيع ──────────────────────────────────────────────────────────────
    {
      providerId: pid(0), title: "شقة 3 غرف للبيع في سيدي بشر - موقع مميز",
      description: "شقة فاخرة مساحة 120 متر في سيدي بشر، تشطيب سوبر لوكس، 3 غرف نوم، 2 حمام، مطبخ راقي. الطابق الثالث بمصعد. بالقرب من البحر وكل الخدمات.",
      mainCategory: "residential", listingType: "sale", subCategory: "شقة",
      price: "1200000", area: "120", rooms: 3, bathrooms: 2, floor: 3, totalFloors: 8,
      finishing: "مشطب", furnished: "غير مفروش", paymentMethod: "نقدي أو تقسيط",
      district: "سيدي بشر", address: "سيدي بشر", regionId: alexR, cityId: monC,
      latitude: "31.2578", longitude: "30.0098",
      images: IMGS_APT, features: FEATS_APT, nearbyServices: NEARBY_APT, contactMethods: CONTACT_ALL,
      status: "active", featured: true, phone: "01001234567", whatsapp: "01001234567",
    },
    {
      providerId: pid(1), title: "شقة 2 غرف سوبر لوكس للبيع - كليوباترا",
      description: "شقة سوبر لوكس 95 متر، دور خامس بمصعد، تشطيب أوروبي راقي. 2 غرف نوم وريسيبشن. قريبة من النيل ومن كل المواصلات. مناسبة للشباب والعائلات الصغيرة.",
      mainCategory: "residential", listingType: "sale", subCategory: "شقة",
      price: "650000", area: "95", rooms: 2, bathrooms: 1, floor: 5, totalFloors: 10,
      finishing: "مشطب", furnished: "غير مفروش",
      district: "كليوباترا", address: "الإسكندرية", regionId: alexR, cityId: monC,
      latitude: "30.4690", longitude: "31.1820",
      images: IMGS_APT, features: FEATS_APT, nearbyServices: NEARBY_APT, contactMethods: CONTACT_ALL,
      status: "active", featured: false, phone: "01112345678", whatsapp: "01112345678",
    },
    {
      providerId: pid(2), title: "شقة 4 غرف بموقع مميز - سموحة",
      description: "شقة كبيرة 170 متر، 4 غرف نوم، 2 حمام، مطبخ كبير، ريسيبشن وصالة. دور ثاني لا يعلوه دور. مناسبة للعائلات الكبيرة. قريبة من الخدمات والمواصلات.",
      mainCategory: "residential", listingType: "sale", subCategory: "شقة",
      price: "1200000", area: "170", rooms: 4, bathrooms: 2, floor: 2, totalFloors: 6,
      finishing: "مشطب", furnished: "غير مفروش",
      district: "سموحة", address: "الإسكندرية", regionId: alexR, cityId: monC,
      latitude: "30.4650", longitude: "31.1850",
      images: IMGS_APT, features: FEATS_APT, nearbyServices: NEARBY_APT, contactMethods: CONTACT_ALL,
      status: "active", featured: true, phone: "01223456789", whatsapp: "01223456789",
    },
    {
      providerId: pid(3), title: "شقة 3 غرف تشطيب كامل - رشدي",
      description: "شقة 130 متر بتشطيب كامل ونظيف، 3 غرف نوم واسعة، 2 حمام، مطبخ أمريكي، ريسيبشن فاخر. المنطقة هادئة وشعبية ومريحة.",
      mainCategory: "residential", listingType: "sale", subCategory: "شقة",
      price: "720000", area: "130", rooms: 3, bathrooms: 2, floor: 1, totalFloors: 5,
      finishing: "مشطب", furnished: "غير مفروش",
      district: "القناطر الجديدة", address: "الإسكندرية", regionId: alexR, cityId: shrC,
      latitude: "30.328709", longitude: "31.118075",
      images: IMGS_APT, features: FEATS_APT, nearbyServices: NEARBY_APT, contactMethods: CONTACT_ALL,
      status: "active", featured: false, phone: "01334567890", whatsapp: "01334567890",
    },
    {
      providerId: pid(4), title: "شقة غرفتين ريسيبشن للبيع - جليم",
      description: "شقة 85 متر بحالة ممتازة، 2 غرف نوم، حمام، ريسيبشن كبير، مطبخ. الدور الرابع بمصعد. موقع مركزي قريب من المحطة والأسواق.",
      mainCategory: "residential", listingType: "sale", subCategory: "شقة",
      price: "550000", area: "85", rooms: 2, bathrooms: 1, floor: 4, totalFloors: 7,
      finishing: "مشطب", furnished: "غير مفروش",
      district: "جليم", address: "الإسكندرية", regionId: alexR, cityId: monC,
      latitude: "30.341349", longitude: "31.222926",
      images: IMGS_APT, features: FEATS_APT, nearbyServices: NEARBY_APT, contactMethods: CONTACT_ALL,
      status: "active", featured: false, phone: "01001234567", whatsapp: "01001234567",
    },
    {
      providerId: pid(5), title: "شقة استوديو مفروشة للبيع - الأزاريطة",
      description: "استوديو 55 متر مفروش بالكامل بأثاث حديث، تكييف، ثلاجة، غسالة، مطبخ مجهز. مناسب جداً للعزاب أو الطلاب. قريب من الجامعة.",
      mainCategory: "residential", listingType: "sale", subCategory: "ستوديو",
      price: "380000", area: "55", rooms: 1, bathrooms: 1, floor: 6, totalFloors: 9,
      finishing: "مشطب", furnished: "مفروش",
      district: "الأزاريطة", address: "الإسكندرية", regionId: alexR, cityId: monC,
      latitude: "30.485337", longitude: "31.174820",
      images: IMGS_APT, features: JSON.stringify(["مفروش بالكامل", "تكييف", "إنترنت", "غسالة", "ثلاجة"]),
      status: "active", featured: false, phone: "01112345678", whatsapp: "01112345678",
    },
    {
      providerId: pid(0), title: "شقة 3 غرف خام - المعمورة",
      description: "شقة خام 115 متر في المعمورة، 3 غرف نوم، 2 حمام، مطبخ وصالة. قريبة من الشاطئ. مناسبة لمن يريد التشطيب بذوقه.",
      mainCategory: "residential", listingType: "sale", subCategory: "شقة",
      price: "480000", area: "115", rooms: 3, bathrooms: 2, floor: 2, totalFloors: 5,
      finishing: "خام", furnished: "غير مفروش",
      district: "المعمورة", address: "الإسكندرية", regionId: alexR, cityId: wasC,
      latitude: "30.252963", longitude: "31.333631",
      images: IMGS_APT, features: JSON.stringify(["موقف سيارات", "أمن وحراسة"]),
      status: "active", featured: false, phone: "01223456789", whatsapp: "01223456789",
    },
    {
      providerId: pid(1), title: "شقة 3 غرف نص تشطيب - عصافرة",
      description: "شقة 110 متر نص تشطيب، 3 غرف، 2 حمام، مطبخ وصالة. مناسبة للبناء والتشطيب الشخصي بسعر اقتصادي.",
      mainCategory: "residential", listingType: "sale", subCategory: "شقة",
      price: "420000", area: "110", rooms: 3, bathrooms: 2, floor: 1, totalFloors: 4,
      finishing: "نص تشطيب", furnished: "غير مفروش",
      district: "عصافرة", address: "الإسكندرية", regionId: alexR, cityId: monC,
      latitude: "30.347960", longitude: "31.185442",
      images: IMGS_APT, features: JSON.stringify(["موقف سيارات"]),
      status: "active", featured: false, phone: "01334567890", whatsapp: "01334567890",
    },

    // ── شقق للإيجار ──────────────────────────────────────────────────────────
    {
      providerId: pid(2), title: "شقة للإيجار 3 غرف مفروشة - ميامي",
      description: "شقة مفروشة فاخرة 120 متر، 3 غرف نوم مع تكييفات، ريسيبشن كبير مع أثاث، مطبخ مجهز كامل. مناسبة للعائلات والمغتربين. إيجار شهري.",
      mainCategory: "residential", listingType: "rent", subCategory: "شقة",
      price: "5000", area: "120", rooms: 3, bathrooms: 2, floor: 3, totalFloors: 8,
      finishing: "مشطب", furnished: "مفروش",
      district: "ميامي", address: "الإسكندرية", regionId: alexR, cityId: monC,
      latitude: "30.4680", longitude: "31.1840",
      images: IMGS_APT, features: JSON.stringify(["مفروش بالكامل", "تكييف", "إنترنت فايبر", "غسالة", "مصعد"]),
      status: "active", featured: true, phone: "01001234567", whatsapp: "01001234567",
    },
    {
      providerId: pid(3), title: "شقة للإيجار 2 غرفة غير مفروشة - سيدي جابر",
      description: "شقة 90 متر غير مفروشة، 2 غرف نوم، حمام كبير، مطبخ، ريسيبشن. دور ثاني بمصعد. منطقة هادئة وآمنة. إيجار شهري مناسب.",
      mainCategory: "residential", listingType: "rent", subCategory: "شقة",
      price: "2800", area: "90", rooms: 2, bathrooms: 1, floor: 2, totalFloors: 6,
      finishing: "مشطب", furnished: "غير مفروش",
      district: "سيدي جابر", address: "الإسكندرية", regionId: alexR, cityId: monC,
      latitude: "30.471257", longitude: "31.171548",
      images: IMGS_APT, features: FEATS_APT, nearbyServices: NEARBY_APT, contactMethods: CONTACT_ALL,
      status: "active", featured: false, phone: "01112345678", whatsapp: "01112345678",
    },
    {
      providerId: pid(4), title: "شقة للإيجار 4 غرف مفروشة - لوران",
      description: "شقة فاخرة 165 متر مفروشة بالكامل بأثاث مودرن، 4 غرف نوم، 3 حمامات، مطبخ راقي. دور خامس بمصعد. مناسبة للعائلات الكبيرة.",
      mainCategory: "residential", listingType: "rent", subCategory: "شقة",
      price: "7500", area: "165", rooms: 4, bathrooms: 3, floor: 5, totalFloors: 10,
      finishing: "مشطب", furnished: "مفروش",
      district: "لوران", address: "الإسكندرية", regionId: alexR, cityId: monC,
      latitude: "30.470838", longitude: "31.178001",
      images: IMGS_APT, features: JSON.stringify(["مفروش بالكامل", "تكييف مركزي", "إنترنت فايبر", "مصعد", "أمن وحراسة", "موقف سيارات"]),
      status: "active", featured: true, phone: "01223456789", whatsapp: "01223456789",
    },
    {
      providerId: pid(5), title: "شقة إيجار غرفة وصالة - باب شرق",
      description: "شقة 65 متر غرفة وصالة، حمام، مطبخ، مناسبة لعزاب أو زوجين. دور ثالث، سعر مناسب جداً.",
      mainCategory: "residential", listingType: "rent", subCategory: "شقة",
      price: "1800", area: "65", rooms: 1, bathrooms: 1, floor: 3, totalFloors: 5,
      finishing: "مشطب", furnished: "غير مفروش",
      district: "باب شرق", address: "الإسكندرية", regionId: alexR, cityId: monC,
      latitude: "30.346910", longitude: "31.188454",
      images: IMGS_APT, features: JSON.stringify(["مصعد", "أمن وحراسة"]),
      status: "active", featured: false, phone: "01334567890", whatsapp: "01334567890",
    },
    {
      providerId: pid(0), title: "شقة للإيجار 3 غرف - المنتزه",
      description: "شقة 105 متر، 3 غرف نوم، 2 حمام، مطبخ وصالة. دور رابع بمصعد. موقع جيد وقريب من كل الخدمات.",
      mainCategory: "residential", listingType: "rent", subCategory: "شقة",
      price: "3500", area: "105", rooms: 3, bathrooms: 2, floor: 4, totalFloors: 7,
      finishing: "مشطب", furnished: "غير مفروش",
      district: "المنتزه", address: "الإسكندرية", regionId: alexR, cityId: shrC,
      latitude: "30.318800", longitude: "31.120904",
      images: IMGS_APT, features: FEATS_APT, nearbyServices: NEARBY_APT, contactMethods: CONTACT_ALL,
      status: "active", featured: false, phone: "01001234567", whatsapp: "01001234567",
    },

    // ── فيلات للبيع ──────────────────────────────────────────────────────────
    {
      providerId: pid(1), title: "فيلا 5 غرف للبيع - العبور",
      description: "فيلا فاخرة 350 متر في كمبوند العبور السكنية، 5 غرف نوم، 4 حمامات، مطبخ كبير، ريسيبشن وصالة، حديقة خاصة مساحة 150 متر. مجهزة بنظام أمن ذكي.",
      mainCategory: "residential", listingType: "sale", subCategory: "فيلا",
      price: "4500000", area: "350", rooms: 5, bathrooms: 4, floor: 0, totalFloors: 3,
      finishing: "مشطب", furnished: "غير مفروش",
      district: "المنتزه", address: "الإسكندرية", regionId: alexR, cityId: monC,
      latitude: "30.2167", longitude: "31.5333",
      images: IMGS_VILLA, features: FEATS_VILLA, nearbyServices: NEARBY_VILLA, contactMethods: CONTACT_ALL,
      status: "active", featured: true, phone: "01112345678", whatsapp: "01112345678",
    },
    {
      providerId: pid(2), title: "فيلا توين هاوس للبيع - سيدي بشر",
      description: "توين هاوس راقي 280 متر في سيدي بشر، 4 غرف نوم، 3 حمامات، مطبخ أمريكي، 2 صالة، حديقة أمامية وخلفية. نص تشطيب جاهزة للتشطيب.",
      mainCategory: "residential", listingType: "sale", subCategory: "توين هاوس",
      price: "3200000", area: "280", rooms: 4, bathrooms: 3, floor: 0, totalFloors: 2,
      finishing: "نص تشطيب", furnished: "غير مفروش",
      district: "سيدي بشر", address: "الإسكندرية", regionId: alexR, cityId: monC,
      latitude: "30.471948", longitude: "31.176231",
      images: IMGS_VILLA, features: FEATS_VILLA, nearbyServices: NEARBY_VILLA, contactMethods: CONTACT_ALL,
      status: "active", featured: true, phone: "01223456789", whatsapp: "01223456789",
    },
    {
      providerId: pid(3), title: "فيلا دوبلكس 6 غرف - المنتزه",
      description: "فيلا دوبلكس ضخمة 420 متر في مدينة بدر، 6 غرف نوم، 5 حمامات، مطبخ فاخر، صالة رسمية وعائلية، غرفة سائق وغرفة خادمة. مسبح خاص وحديقة.",
      mainCategory: "residential", listingType: "sale", subCategory: "دوبلكس",
      price: "5800000", area: "420", rooms: 6, bathrooms: 5, floor: 0, totalFloors: 3,
      finishing: "مشطب", furnished: "غير مفروش",
      district: "المنتزه", address: "الإسكندرية", regionId: alexR, cityId: borC,
      latitude: "30.110234", longitude: "31.746250",
      images: IMGS_DUPLEX, features: FEATS_VILLA, nearbyServices: NEARBY_DUPLEX, contactMethods: CONTACT_CALL_WA,
      status: "active", featured: true, phone: "01334567890", whatsapp: "01334567890",
    },
    {
      providerId: pid(4), title: "فيلا 4 غرف بحديقة - سموحة",
      description: "فيلا 300 متر في القناطر الخيرية بحديقة واسعة 200 متر، 4 غرف نوم، 3 حمامات، مطبخ كبير، جراج مغطى. موقع هادئ وطبيعة خلابة.",
      mainCategory: "residential", listingType: "sale", subCategory: "فيلا",
      price: "2800000", area: "300", rooms: 4, bathrooms: 3, floor: 0, totalFloors: 2,
      finishing: "مشطب", furnished: "غير مفروش",
      district: "القناطر الجديدة", address: "الإسكندرية", regionId: alexR, cityId: shrC,
      latitude: "30.311380", longitude: "31.126932",
      images: IMGS_VILLA, features: FEATS_VILLA, nearbyServices: NEARBY_VILLA, contactMethods: CONTACT_ALL,
      status: "active", featured: false, phone: "01445678901", whatsapp: "01445678901",
    },
    {
      providerId: pid(5), title: "فيلا 5 غرف في كمبوند - زيزينيا",
      description: "فيلا فاخرة في كمبوند متكامل الخدمات، 5 غرف، 4 حمامات، مسبح خاص، حديقة 250 متر، نظام تأمين ذكي، جراج مغطى. تشطيب بالكامل.",
      mainCategory: "residential", listingType: "sale", subCategory: "فيلا",
      price: "8500000", area: "500", rooms: 5, bathrooms: 4, floor: 0, totalFloors: 3,
      finishing: "مشطب", furnished: "غير مفروش",
      district: "التجمع الثالث", address: "الإسكندرية", regionId: alexR, cityId: shrC,
      latitude: "30.028468", longitude: "31.474707",
      images: IMGS_VILLA, features: FEATS_VILLA, nearbyServices: NEARBY_VILLA, contactMethods: CONTACT_ALL,
      status: "active", featured: true, phone: "01001234567", whatsapp: "01001234567",
    },

    // ── دوبلكس وروف ──────────────────────────────────────────────────────────
    {
      providerId: pid(0), title: "دوبلكس 4 غرف للبيع - كليوباترا",
      description: "دوبلكس رائع 200 متر على دورين، 4 غرف نوم، 3 حمامات، مطبخ كبير، 2 صالة، تراس خاص. سلم داخلي أنيق. تشطيب سوبر لوكس.",
      mainCategory: "residential", listingType: "sale", subCategory: "دوبلكس",
      price: "1800000", area: "200", rooms: 4, bathrooms: 3, floor: 5, totalFloors: 7,
      finishing: "مشطب", furnished: "غير مفروش",
      district: "كليوباترا", address: "الإسكندرية", regionId: alexR, cityId: monC,
      latitude: "30.477670", longitude: "31.163851",
      images: IMGS_DUPLEX, features: FEATS_DUPLEX, nearbyServices: NEARBY_DUPLEX, contactMethods: CONTACT_CALL_WA,
      status: "active", featured: false, phone: "01112345678", whatsapp: "01112345678",
    },
    {
      providerId: pid(1), title: "روف 3 غرف بتراس واسع - سبورتنج",
      description: "روف مميز 140 متر + 100 متر تراس خاص، 3 غرف نوم، 2 حمام، مطبخ راقي. إطلالة بانورامية على المدينة. مناسب جداً للعائلات.",
      mainCategory: "residential", listingType: "sale", subCategory: "روف",
      price: "1100000", area: "140", rooms: 3, bathrooms: 2, floor: 7, totalFloors: 7,
      finishing: "مشطب", furnished: "غير مفروش",
      district: "سبورتنج", address: "الإسكندرية", regionId: alexR, cityId: monC,
      latitude: "30.474351", longitude: "31.166068",
      images: IMGS_DUPLEX, features: FEATS_DUPLEX, nearbyServices: NEARBY_DUPLEX, contactMethods: CONTACT_CALL_WA,
      status: "active", featured: false, phone: "01223456789", whatsapp: "01223456789",
    },
    {
      providerId: pid(2), title: "دوبلكس 5 غرف في رشدي",
      description: "دوبلكس فاخر 350 متر في قلب الشيخ زايد، 5 غرف نوم، 4 حمامات، مطبخ راقي، صالتان، تراس كبير. كمبوند متكامل الخدمات.",
      mainCategory: "residential", listingType: "sale", subCategory: "دوبلكس",
      price: "4200000", area: "350", rooms: 5, bathrooms: 4, floor: 2, totalFloors: 4,
      finishing: "مشطب", furnished: "غير مفروش",
      district: "ميامي", address: "الإسكندرية", regionId: alexR, cityId: agaC,
      latitude: "30.042545", longitude: "30.955090",
      images: IMGS_DUPLEX, features: FEATS_DUPLEX, nearbyServices: NEARBY_DUPLEX, contactMethods: CONTACT_CALL_WA,
      status: "active", featured: true, phone: "01334567890", whatsapp: "01334567890",
    },

    // ── أراضي للبيع ──────────────────────────────────────────────────────────
    {
      providerId: pid(3), title: "أرض سكنية 300 متر للبيع - العامرية",
      description: "أرض سكنية 300 متر في العامرية، واجهة 15 متر على شارع 12 متر. مرافق كاملة كهرباء ومياه وصرف. مناسبة لبناء عمارة سكنية.",
      mainCategory: "land", listingType: "sale", subCategory: "أرض",
      price: "600000", area: "300",
      district: "المنطقة الصناعية", address: "الإسكندرية", regionId: alexR, cityId: monC,
      latitude: "30.482254", longitude: "31.171036",
      images: IMGS_LAND, features: FEATS_LAND, nearbyServices: NEARBY_LAND, contactMethods: CONTACT_CALL_WA,
      status: "active", featured: false, phone: "01334567890", whatsapp: "01334567890",
    },
    {
      providerId: pid(4), title: "قطعة أرض 500م للبيع - برج العرب",
      description: "أرض 500 متر في القناطر الجديدة، ركن واجهتين على شارعين. موقع ممتاز ومرافق كاملة. مناسبة للبناء السكني أو التجاري.",
      mainCategory: "land", listingType: "sale", subCategory: "أرض",
      price: "900000", area: "500",
      district: "القناطر الجديدة", address: "الإسكندرية", regionId: alexR, cityId: shrC,
      latitude: "30.313030", longitude: "31.104409",
      images: IMGS_LAND, features: FEATS_LAND, nearbyServices: NEARBY_LAND, contactMethods: CONTACT_CALL_WA,
      status: "active", featured: true, phone: "01001234567", whatsapp: "01001234567",
    },
    {
      providerId: pid(5), title: "أرض 750م للبيع - الدخيلة الصناعية",
      description: "أرض صناعية 750 متر في طوخ الصناعية، واجهة 20 متر. مناسبة للمشاريع الصناعية والمستودعات. على الشارع الرئيسي.",
      mainCategory: "land", listingType: "sale", subCategory: "أرض",
      price: "1200000", area: "750",
      district: "الدخيلة الصناعية", address: "الإسكندرية", regionId: alexR, cityId: monC,
      latitude: "30.351269", longitude: "31.155403",
      images: IMGS_LAND, features: FEATS_LAND, nearbyServices: NEARBY_LAND, contactMethods: CONTACT_CALL_WA,
      status: "active", featured: false, phone: "01112345678", whatsapp: "01112345678",
    },
    {
      providerId: pid(0), title: "أرض 2 فدان للاستثمار - أبو قير",
      description: "أرض 2 فدان (8400 متر) في أبو قير على الطريق الرئيسي. مرافق كاملة. مناسبة للبناء والاستثمار.",
      mainCategory: "land", listingType: "sale", subCategory: "أرض",
      price: "2500000", area: "8400",
      district: "أبو قير", address: "الإسكندرية", regionId: alexR, cityId: wasC,
      latitude: "30.220099", longitude: "31.350969",
      images: IMGS_LAND, features: JSON.stringify(["تربة خصبة", "مروية", "على ترعة"]),
      status: "active", featured: false, phone: "01223456789", whatsapp: "01223456789",
    },
    {
      providerId: pid(1), title: "أرض سكنية 200م - العامرية",
      description: "أرض سكنية 200 متر في شبين القناطر، واجهة 10 متر على شارع 6 متر. مرافق كاملة. سعر مميز جداً.",
      mainCategory: "land", listingType: "sale", subCategory: "أرض",
      price: "350000", area: "200",
      district: "العامرية", address: "الإسكندرية", regionId: alexR, cityId: shrC,
      latitude: "30.121126", longitude: "31.239992",
      images: IMGS_LAND, features: FEATS_LAND, nearbyServices: NEARBY_LAND, contactMethods: CONTACT_CALL_WA,
      status: "active", featured: false, phone: "01334567890", whatsapp: "01334567890",
    },

    // ── عقارات تجارية ────────────────────────────────────────────────────────
    {
      providerId: pid(2), title: "محل تجاري للبيع شارع رئيسي - وسط البلد",
      description: "محل تجاري 80 متر على الشارع الرئيسي في وسط البلد بحركة مرورية عالية. واجهة زجاجية 6 متر. تشطيب جاهز. مناسب لأي نشاط تجاري.",
      mainCategory: "commercial", listingType: "sale", subCategory: "محل",
      price: "1500000", area: "80",
      district: "وسط البلد", address: "الإسكندرية", regionId: alexR, cityId: monC,
      latitude: "30.4660", longitude: "31.1845",
      images: IMGS_COMM, features: FEATS_COMM, nearbyServices: NEARBY_COMM, contactMethods: CONTACT_WA_CHAT,
      status: "active", featured: true, phone: "01001234567", whatsapp: "01001234567",
    },
    {
      providerId: pid(3), title: "مكتب للبيع 120م - باب شرق",
      description: "مكتب راقي 120 متر في برج تجاري، دور رابع بمصعد. تشطيب جاهز بتكييف مركزي وكاميرات. مناسب للشركات والمحاسبين والأطباء.",
      mainCategory: "commercial", listingType: "sale", subCategory: "مكتب",
      price: "900000", area: "120", floor: 4, totalFloors: 12,
      district: "باب شرق", address: "الإسكندرية", regionId: alexR, cityId: monC,
      latitude: "30.448606", longitude: "31.179679",
      images: IMGS_COMM, features: FEATS_COMM, nearbyServices: NEARBY_COMM, contactMethods: CONTACT_WA_CHAT,
      status: "active", featured: false, phone: "01112345678", whatsapp: "01112345678",
    },
    {
      providerId: pid(4), title: "محل للإيجار - الشارع الرئيسي سموحة",
      description: "محل 60 متر على الشارع الرئيسي بسموحة، تشطيب جاهز، تكييف، إيجار شهري مميز. موقع تجاري بامتياز.",
      mainCategory: "commercial", listingType: "rent", subCategory: "محل",
      price: "8000", area: "60",
      district: "وسط البلد", address: "الإسكندرية", regionId: alexR, cityId: monC,
      latitude: "30.456865", longitude: "31.197738",
      images: IMGS_COMM, features: FEATS_COMM, nearbyServices: NEARBY_COMM, contactMethods: CONTACT_WA_CHAT,
      status: "active", featured: false, phone: "01223456789", whatsapp: "01223456789",
    },
    {
      providerId: pid(5), title: "مستودع للإيجار - الدخيلة الصناعية",
      description: "مستودع 300 متر في الدخيلة الصناعية، ارتفاع 5 متر، بوابة كبيرة. مناسب للتخزين والمشاريع الصناعية.",
      mainCategory: "commercial", listingType: "rent", subCategory: "مستودع / مخزن",
      price: "12000", area: "300",
      district: "المنطقة الصناعية", address: "الإسكندرية", regionId: alexR, cityId: monC,
      latitude: "30.481638", longitude: "31.197282",
      images: IMGS_COMM, features: JSON.stringify(["ارتفاع 5 متر", "بوابة كبيرة", "كهرباء ثلاثة فاز", "موقف سيارات"]),
      status: "active", featured: false, phone: "01334567890", whatsapp: "01334567890",
    },
    {
      providerId: pid(0), title: "مكتب للإيجار 90م - محطة الرمل",
      description: "مكتب 90 متر في مجمع إداري راقي، دور ثاني بمصعد. تكييف مركزي، إنترنت فايبر، أمن 24 ساعة. مناسب للشركات الصغيرة.",
      mainCategory: "commercial", listingType: "rent", subCategory: "مكتب",
      price: "4500", area: "90", floor: 2, totalFloors: 6,
      district: "القناطر الجديدة", address: "الإسكندرية", regionId: alexR, cityId: shrC,
      latitude: "30.323485", longitude: "31.098712",
      images: IMGS_COMM, features: FEATS_COMM, nearbyServices: NEARBY_COMM, contactMethods: CONTACT_WA_CHAT,
      status: "active", featured: false, phone: "01001234567", whatsapp: "01001234567",
    },
    {
      providerId: pid(1), title: "محل تجاري في الجمرك - للإيجار",
      description: "محل 45 متر على شارع تجاري رئيسي في الجمرك. موقع تجاري مميز على الكورنيش. مناسب لأي نشاط تجاري.",
      mainCategory: "commercial", listingType: "rent", subCategory: "محل",
      price: "5000", area: "45",
      district: "الجمرك", address: "الإسكندرية", regionId: alexR, cityId: shrC,
      latitude: "30.116682", longitude: "31.249652",
      images: IMGS_COMM, features: JSON.stringify(["واجهة تجارية", "موقع مميز", "قريب من المترو"]),
      status: "active", featured: false, phone: "01112345678", whatsapp: "01112345678",
    },

    // ── دور أرضي ─────────────────────────────────────────────────────────────
    {
      providerId: pid(2), title: "دور أرضي 4 غرف بحديقة - ميامي",
      description: "دور أرضي 180 متر في كفر شكر، 4 غرف نوم، 2 حمام، مطبخ كبير، حديقة أمامية 80 متر. مناسب جداً للعائلات.",
      mainCategory: "residential", listingType: "sale", subCategory: "دور أرضي",
      price: "950000", area: "180", rooms: 4, bathrooms: 2, floor: 0, totalFloors: 1,
      finishing: "مشطب", furnished: "غير مفروش",
      district: "ميامي", address: "الإسكندرية", regionId: alexR,
      latitude: "30.537077", longitude: "31.253386",
      images: IMGS_APT, features: JSON.stringify(["حديقة خاصة", "مدخل مستقل", "موقف سيارات", "مخزن"]),
      status: "active", featured: false, phone: "01223456789", whatsapp: "01223456789",
    },
    {
      providerId: pid(3), title: "دور أرضي 3 غرف للإيجار - الشاطبي",
      description: "دور أرضي 150 متر بحديقة صغيرة، 3 غرف نوم، 2 حمام، مطبخ. مدخل مستقل. مناسب للعائلات. منطقة هادئة.",
      mainCategory: "residential", listingType: "rent", subCategory: "دور أرضي",
      price: "4000", area: "150", rooms: 3, bathrooms: 2, floor: 0, totalFloors: 1,
      finishing: "مشطب", furnished: "غير مفروش",
      district: "الشاطبي", address: "الإسكندرية", regionId: alexR, cityId: monC,
      latitude: "30.447810", longitude: "31.165496",
      images: IMGS_APT, features: JSON.stringify(["مدخل مستقل", "حديقة", "موقف سيارات"]),
      status: "active", featured: false, phone: "01334567890", whatsapp: "01334567890",
    },
  ]);

  console.log("Properties seeded successfully!");
}

// ── Email Templates ───────────────────────────────────────────────────────────

const BASE_HTML = (content: string) => `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>{{subject}}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.10);">
      <tr>
        <td style="background:linear-gradient(135deg,#0d9488 0%,#0f766e 50%,#134e4a 100%);padding:36px 48px;text-align:center;">
          <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:14px;padding:10px 20px;margin-bottom:12px;">
            <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">✦ {{siteName}}</span>
          </div>
          <p style="margin:0;color:rgba(255,255,255,0.75);font-size:13px;">{{siteUrl}}</p>
        </td>
      </tr>
      <tr><td style="padding:40px 48px;">${content}</td></tr>
      <tr><td style="padding:0 48px;"><div style="height:1px;background:#e2e8f0;"></div></td></tr>
      <tr>
        <td style="padding:28px 48px;background:#f8fafc;text-align:center;border-radius:0 0 20px 20px;">
          <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.8;">
            تم إرسال هذا البريد من <strong style="color:#0d9488;">{{siteName}}</strong><br/>
            {{contactEmail}} &nbsp;·&nbsp; {{siteUrl}}
          </p>
          <p style="margin:12px 0 0;color:#cbd5e1;font-size:11px;">© {{year}} {{siteName}} — جميع الحقوق محفوظة</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

const EMAIL_TEMPLATES = [
  {
    name: "مرحباً بك — الترحيب بالمستخدم الجديد",
    slug: "welcome",
    subject: "مرحباً بك في {{siteName}} 🎉",
    category: "auth",
    variables: JSON.stringify(["siteName", "siteUrl", "userName", "contactEmail", "year"]),
    plainBody: "مرحباً {{userName}}! يسعدنا انضمامك إلى {{siteName}}.",
    htmlBody: BASE_HTML(`
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:26px;font-weight:800;">مرحباً {{userName}}! 👋</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.7;">يسعدنا انضمامك إلى <strong style="color:#0d9488;">{{siteName}}</strong>.</p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 28px;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{siteUrl}}" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">استعرض العقارات الآن →</a>
        </td></tr>
      </table>
    `),
    isActive: true,
  },
  {
    name: "إعادة تعيين كلمة المرور",
    slug: "password-reset",
    subject: "إعادة تعيين كلمة المرور — {{siteName}}",
    category: "auth",
    variables: JSON.stringify(["siteName", "siteUrl", "userName", "resetLink", "contactEmail", "year"]),
    plainBody: "مرحباً {{userName}}، انقر على الرابط لإعادة تعيين كلمة المرور: {{resetLink}}",
    htmlBody: BASE_HTML(`
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">إعادة تعيين كلمة المرور 🔐</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">مرحباً <strong>{{userName}}</strong>، انقر على الزر أدناه لإعادة تعيين كلمة المرور (صالح 30 دقيقة).</p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 28px;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{resetLink}}" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">إعادة تعيين كلمة المرور →</a>
        </td></tr>
      </table>
    `),
    isActive: true,
  },
  {
    name: "تأكيد البريد الإلكتروني",
    slug: "email-verification",
    subject: "تحقق من بريدك الإلكتروني — {{siteName}}",
    category: "auth",
    variables: JSON.stringify(["siteName", "siteUrl", "userName", "verificationLink", "contactEmail", "year"]),
    plainBody: "مرحباً {{userName}}، تحقق من بريدك: {{verificationLink}}",
    htmlBody: BASE_HTML(`
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">تحقق من بريدك الإلكتروني 📧</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">مرحباً <strong>{{userName}}</strong>، انقر على الزر لتفعيل حسابك.</p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 24px;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 40px;text-align:center;">
          <a href="{{verificationLink}}" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">تفعيل الحساب ✓</a>
        </td></tr>
      </table>
    `),
    isActive: true,
  },
  {
    name: "تنبيه تسجيل الدخول",
    slug: "login-alert",
    subject: "تم تسجيل الدخول إلى حسابك — {{siteName}}",
    category: "auth",
    variables: JSON.stringify(["siteName", "siteUrl", "userName", "loginTime", "loginDevice", "loginLocation", "contactEmail", "year"]),
    plainBody: "تم تسجيل الدخول في {{loginTime}} من {{loginDevice}}.",
    htmlBody: BASE_HTML(`
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">تم تسجيل الدخول بنجاح 🔓</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;text-align:center;">مرحباً <strong>{{userName}}</strong>، تم تسجيل دخولك بتاريخ <strong>{{loginTime}}</strong> من <strong>{{loginDevice}}</strong>.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fef3c7;border-radius:12px;border:1px solid #fde68a;">
        <tr><td style="padding:16px 20px;text-align:center;">
          <p style="margin:0;color:#92400e;font-size:13px;">إذا لم تكن أنت، <a href="{{siteUrl}}" style="color:#d97706;font-weight:700;">تواصل معنا فوراً</a>.</p>
        </td></tr>
      </table>
    `),
    isActive: true,
  },
  {
    name: "الحساب تمت الموافقة عليه",
    slug: "account-approved",
    subject: "🎉 تمت الموافقة على حسابك في {{siteName}}",
    category: "auth",
    variables: JSON.stringify(["siteName", "siteUrl", "userName", "contactEmail", "year"]),
    plainBody: "مبروك {{userName}}! تمت الموافقة على حسابك. يمكنك الآن نشر عقاراتك.",
    htmlBody: BASE_HTML(`
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">تمت الموافقة على حسابك! 🎉</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px;text-align:center;">مبروك <strong>{{userName}}</strong>! يمكنك الآن البدء في نشر عقاراتك والوصول إلى جميع المميزات.</p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{siteUrl}}/dashboard" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">ابدأ الآن →</a>
        </td></tr>
      </table>
    `),
    isActive: true,
  },
  {
    name: "الحساب موقوف",
    slug: "account-suspended",
    subject: "⚠️ تم إيقاف حسابك في {{siteName}}",
    category: "auth",
    variables: JSON.stringify(["siteName", "siteUrl", "userName", "reason", "contactEmail", "year"]),
    plainBody: "مرحباً {{userName}}، تم إيقاف حسابك بسبب: {{reason}}. تواصل معنا للمزيد.",
    htmlBody: BASE_HTML(`
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">تم إيقاف حسابك ⚠️</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;text-align:center;">مرحباً <strong>{{userName}}</strong>، تم إيقاف حسابك بسبب: <strong>{{reason}}</strong>.</p>
      <p style="text-align:center;color:#64748b;font-size:14px;">للاستفسار، تواصل معنا على <a href="mailto:{{contactEmail}}" style="color:#0d9488;">{{contactEmail}}</a></p>
    `),
    isActive: true,
  },
  {
    name: "تم تقديم عقار جديد",
    slug: "property-submitted",
    subject: "تم استلام عقارك وهو قيد المراجعة — {{siteName}}",
    category: "property",
    variables: JSON.stringify(["siteName", "siteUrl", "userName", "propertyTitle", "contactEmail", "year"]),
    plainBody: "مرحباً {{userName}}، تم استلام عقارك \"{{propertyTitle}}\" وهو قيد المراجعة.",
    htmlBody: BASE_HTML(`
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">تم استلام عقارك! 📋</h2>
      <p style="margin:0 0 16px;color:#64748b;font-size:15px;text-align:center;">أهلاً <strong>{{userName}}</strong>، تم إضافة عقار <strong style="color:#0d9488;">{{propertyTitle}}</strong> وهو الآن قيد المراجعة.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eff6ff;border-radius:14px;border:1px solid #bfdbfe;margin-bottom:0;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0;color:#1e40af;font-size:13px;line-height:1.7;">سيتم مراجعة عقارك خلال 24 ساعة وإشعارك بالنتيجة.</p>
        </td></tr>
      </table>
    `),
    isActive: true,
  },
  {
    name: "تمت الموافقة على العقار",
    slug: "property-approved",
    subject: "🎉 تمت الموافقة على عقارك في {{siteName}}",
    category: "property",
    variables: JSON.stringify(["siteName", "siteUrl", "userName", "propertyTitle", "propertyUrl", "contactEmail", "year"]),
    plainBody: "مبروك {{userName}}! تمت الموافقة على عقارك \"{{propertyTitle}}\" وهو ظاهر الآن.",
    htmlBody: BASE_HTML(`
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">تمت الموافقة على عقارك! 🎉</h2>
      <p style="margin:0 0 16px;color:#64748b;font-size:15px;text-align:center;">مبروك <strong>{{userName}}</strong>! عقارك <strong style="color:#0d9488;">{{propertyTitle}}</strong> ظاهر الآن للمشترين.</p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{propertyUrl}}" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">عرض العقار →</a>
        </td></tr>
      </table>
    `),
    isActive: true,
  },
  {
    name: "رفض العقار",
    slug: "property-rejected",
    subject: "بخصوص عقارك في {{siteName}}",
    category: "property",
    variables: JSON.stringify(["siteName", "siteUrl", "userName", "propertyTitle", "reason", "contactEmail", "year"]),
    plainBody: "مرحباً {{userName}}، لم يتم قبول عقارك \"{{propertyTitle}}\" بسبب: {{reason}}.",
    htmlBody: BASE_HTML(`
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">بخصوص عقارك</h2>
      <p style="margin:0 0 16px;color:#64748b;font-size:15px;text-align:center;">مرحباً <strong>{{userName}}</strong>، لم يتم قبول عقارك <strong>{{propertyTitle}}</strong>.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fef2f2;border-radius:12px;border:1px solid #fecaca;margin-bottom:0;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0;color:#991b1b;font-size:13px;"><strong>السبب:</strong> {{reason}}</p>
        </td></tr>
      </table>
    `),
    isActive: true,
  },
  {
    name: "استفسار عن عقار",
    slug: "property-inquiry",
    subject: "استفسار جديد عن عقارك — {{siteName}}",
    category: "property",
    variables: JSON.stringify(["siteName", "siteUrl", "userName", "propertyTitle", "inquirerName", "inquirerPhone", "message", "contactEmail", "year"]),
    plainBody: "مرحباً {{userName}}، استفسار جديد من {{inquirerName}} ({{inquirerPhone}}) عن عقارك {{propertyTitle}}.",
    htmlBody: BASE_HTML(`
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;">استفسار جديد عن عقارك 📩</h2>
      <p style="margin:0 0 16px;color:#64748b;font-size:15px;">عقار: <strong>{{propertyTitle}}</strong></p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:14px;border:1px solid #e2e8f0;margin-bottom:0;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 8px;color:#0f172a;"><strong>المستفسر:</strong> {{inquirerName}}</p>
          <p style="margin:0 0 8px;color:#0f172a;"><strong>الهاتف:</strong> {{inquirerPhone}}</p>
          <p style="margin:0;color:#0f172a;"><strong>الرسالة:</strong> {{message}}</p>
        </td></tr>
      </table>
    `),
    isActive: true,
  },
  {
    name: "نجاح الدفع",
    slug: "payment-success",
    subject: "✅ تم استلام دفعتك بنجاح — {{siteName}}",
    category: "payment",
    variables: JSON.stringify(["siteName", "siteUrl", "userName", "amount", "transactionId", "paymentDate", "contactEmail", "year"]),
    plainBody: "تم استلام دفعتك {{amount}} ج.م بنجاح. رقم المعاملة: {{transactionId}}",
    htmlBody: BASE_HTML(`
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">تم استلام دفعتك! 💳</h2>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;border-radius:14px;border:1px solid #bbf7d0;margin:20px 0;">
        <tr><td style="padding:24px 28px;text-align:center;">
          <p style="margin:0 0 4px;color:#166534;font-size:14px;">المبلغ المدفوع</p>
          <p style="margin:0 0 12px;color:#16a34a;font-size:32px;font-weight:900;">{{amount}} ج.م</p>
          <p style="margin:0;color:#166534;font-size:12px;">رقم المعاملة: {{transactionId}} · {{paymentDate}}</p>
        </td></tr>
      </table>
    `),
    isActive: true,
  },
  {
    name: "فشل الدفع",
    slug: "payment-failed",
    subject: "❌ فشل معالجة دفعتك — {{siteName}}",
    category: "payment",
    variables: JSON.stringify(["siteName", "siteUrl", "userName", "amount", "failReason", "retryUrl", "contactEmail", "year"]),
    plainBody: "فشلت دفعتك {{amount}} ج.م. السبب: {{failReason}}. أعد المحاولة: {{retryUrl}}",
    htmlBody: BASE_HTML(`
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">فشل معالجة الدفعة ❌</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;text-align:center;">لم نتمكن من معالجة دفعتك <strong style="color:#ef4444;">{{amount}} ج.م</strong>. السبب: {{failReason}}</p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="background:#ef4444;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{retryUrl}}" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">إعادة المحاولة →</a>
        </td></tr>
      </table>
    `),
    isActive: true,
  },
  {
    name: "تفعيل الاشتراك",
    slug: "subscription-activated",
    subject: "🌟 تم تفعيل اشتراكك في {{siteName}}",
    category: "payment",
    variables: JSON.stringify(["siteName", "siteUrl", "userName", "planName", "startDate", "endDate", "price", "contactEmail", "year"]),
    plainBody: "مبروك {{userName}}! تم تفعيل باقة {{planName}} حتى {{endDate}}.",
    htmlBody: BASE_HTML(`
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">تم تفعيل اشتراكك! 🌟</h2>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#f0fdf9,#dcfce7);border-radius:14px;border:1px solid #bbf7d0;margin:20px 0;">
        <tr><td style="padding:24px 28px;text-align:center;">
          <p style="margin:0 0 6px;color:#166534;font-size:22px;font-weight:800;">{{planName}}</p>
          <p style="margin:0 0 16px;color:#16a34a;font-size:28px;font-weight:900;">{{price}} ج.م</p>
          <p style="margin:0;color:#166534;font-size:13px;">من {{startDate}} حتى {{endDate}}</p>
        </td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{siteUrl}}/dashboard" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">إدارة لوحة التحكم →</a>
        </td></tr>
      </table>
    `),
    isActive: true,
  },
  {
    name: "انتهاء الاشتراك قريباً",
    slug: "subscription-expiring",
    subject: "⚠️ اشتراكك ينتهي قريباً — {{siteName}}",
    category: "payment",
    variables: JSON.stringify(["siteName", "siteUrl", "userName", "planName", "endDate", "daysLeft", "renewUrl", "contactEmail", "year"]),
    plainBody: "اشتراكك في {{planName}} ينتهي بعد {{daysLeft}} يوم. جدد: {{renewUrl}}",
    htmlBody: BASE_HTML(`
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">اشتراكك ينتهي قريباً ⚠️</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;text-align:center;">اشتراكك في <strong>{{planName}}</strong> سينتهي خلال <strong style="color:#ef4444;">{{daysLeft}} يوم</strong> بتاريخ {{endDate}}.</p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="background:#f59e0b;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{renewUrl}}" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">تجديد الاشتراك الآن →</a>
        </td></tr>
      </table>
    `),
    isActive: true,
  },
  {
    name: "رسالة جديدة",
    slug: "new-message",
    subject: "رسالة جديدة من {{senderName}} — {{siteName}}",
    category: "notification",
    variables: JSON.stringify(["siteName", "siteUrl", "userName", "senderName", "messagePreview", "chatUrl", "contactEmail", "year"]),
    plainBody: "رسالة جديدة من {{senderName}}: {{messagePreview}}",
    htmlBody: BASE_HTML(`
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;">رسالة جديدة 💬</h2>
      <p style="margin:0 0 16px;color:#64748b;font-size:15px;">لديك رسالة جديدة من <strong>{{senderName}}</strong>:</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;margin-bottom:20px;">
        <tr><td style="padding:16px 20px;color:#475569;font-size:14px;font-style:italic;">{{messagePreview}}</td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{chatUrl}}" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">الرد الآن →</a>
        </td></tr>
      </table>
    `),
    isActive: true,
  },
  {
    name: "عميل محتمل جديد",
    slug: "new-lead",
    subject: "عميل محتمل جديد مهتم بعقارك — {{siteName}}",
    category: "notification",
    variables: JSON.stringify(["siteName", "siteUrl", "userName", "leadName", "leadPhone", "propertyTitle", "contactEmail", "year"]),
    plainBody: "{{leadName}} ({{leadPhone}}) مهتم بعقارك: {{propertyTitle}}",
    htmlBody: BASE_HTML(`
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;">عميل محتمل جديد! 🎯</h2>
      <p style="margin:0 0 16px;color:#64748b;font-size:15px;"><strong>{{leadName}}</strong> مهتم بعقارك <strong style="color:#0d9488;">{{propertyTitle}}</strong></p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf9;border-radius:12px;border:1px solid #ccfbf1;margin-bottom:20px;">
        <tr><td style="padding:16px 20px;">
          <p style="margin:0 0 6px;color:#0f172a;"><strong>الاسم:</strong> {{leadName}}</p>
          <p style="margin:0;color:#0f172a;"><strong>الهاتف:</strong> {{leadPhone}}</p>
        </td></tr>
      </table>
    `),
    isActive: true,
  },
  {
    name: "نشرة إخبارية",
    slug: "newsletter",
    subject: "أحدث عروض العقارات في {{siteName}} 🏠",
    category: "marketing",
    variables: JSON.stringify(["siteName", "siteUrl", "userName", "featuredProperties", "unsubscribeUrl", "contactEmail", "year"]),
    plainBody: "أحدث عروض عقارات الإسكندرية. اكتشف الآن: {{siteUrl}}",
    htmlBody: BASE_HTML(`
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;">أحدث عروض العقارات 🏠</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.7;">اكتشف أفضل عروض العقارات في الإسكندرية هذا الأسبوع.</p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 24px;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{siteUrl}}" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">تصفح العقارات →</a>
        </td></tr>
      </table>
      <p style="text-align:center;color:#94a3b8;font-size:11px;"><a href="{{unsubscribeUrl}}" style="color:#94a3b8;">إلغاء الاشتراك</a></p>
    `),
    isActive: true,
  },
  {
    name: "إشعار لوحة الإدارة",
    slug: "admin-notification",
    subject: "إشعار من النظام — {{siteName}}",
    category: "notification",
    variables: JSON.stringify(["siteName", "siteUrl", "title", "body", "actionUrl", "actionText", "contactEmail", "year"]),
    plainBody: "{{title}}: {{body}}",
    htmlBody: BASE_HTML(`
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;">{{title}}</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.8;">{{body}}</p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{actionUrl}}" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">{{actionText}} →</a>
        </td></tr>
      </table>
    `),
    isActive: true,
  },
  {
    name: "تغيير كلمة المرور",
    slug: "password-changed",
    subject: "تم تغيير كلمة المرور — {{siteName}}",
    category: "auth",
    variables: JSON.stringify(["siteName", "siteUrl", "userName", "changeTime", "contactEmail", "year"]),
    plainBody: "تم تغيير كلمة مرور حسابك بتاريخ {{changeTime}}.",
    htmlBody: BASE_HTML(`
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">تم تغيير كلمة المرور ✅</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;text-align:center;">مرحباً <strong>{{userName}}</strong>، تم تغيير كلمة مرور حسابك بتاريخ <strong>{{changeTime}}</strong>.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fef3c7;border-radius:12px;border:1px solid #fde68a;">
        <tr><td style="padding:16px 20px;text-align:center;">
          <p style="margin:0;color:#92400e;font-size:13px;">إذا لم تطلب هذا، تواصل معنا على <a href="mailto:{{contactEmail}}" style="color:#d97706;">{{contactEmail}}</a></p>
        </td></tr>
      </table>
    `),
    isActive: true,
  },
];

export async function seedEmailTemplates() {
  const existing = await db.select({ id: emailTemplatesTable.id }).from(emailTemplatesTable).limit(1);
  if (existing.length > 0) {
    console.log("Email templates already seeded, skipping.");
    return;
  }
  console.log("Seeding email templates...");
  for (const tmpl of EMAIL_TEMPLATES) {
    await db.insert(emailTemplatesTable).values({
      name: tmpl.name,
      slug: tmpl.slug,
      subject: tmpl.subject,
      htmlBody: tmpl.htmlBody,
      plainBody: tmpl.plainBody,
      category: tmpl.category,
      channels: '["email"]',
      variables: tmpl.variables,
      isActive: tmpl.isActive,
    }).onConflictDoNothing();
  }
  console.log(`Email templates seeded (${EMAIL_TEMPLATES.length} templates).`);
}

// ── Site Settings ─────────────────────────────────────────────────────────────

const DEFAULT_SITE_SETTINGS: Record<string, string> = {
  siteName: "عقارات الإسكندرية",
  siteNameEn: "Aqarat Alexandria",
  logoUrl: "",
  faviconUrl: "",
  heroImage: "https://images.unsplash.com/photo-1499793983690-e29da59ef1c2?w=1600&q=80",
  heroTitle: "اعثر على عقارك المثالي في الإسكندرية",
  heroSubtitle: "بيع وإيجار عقارات الإسكندرية — أسرع وأوثق",
  ctaText: "نضمن لك أفضل العقارات بأفضل الأسعار في الإسكندرية",
  ctaButtonText: "تصفح العقارات الآن",
  primaryColor: "#0d9488",
  themePreset: "teal-sand",
  aboutContent: "نحن منصة عقارات الإسكندرية، الوجهة الأولى لبيع وشراء وإيجار العقارات في الإسكندرية. نربطك بأفضل العروض العقارية بسرعة وأمان وشفافية تامة.",
  contactEmail: "info@aqaralex.com",
  contactPhone: "+201000000000",
  contactWhatsapp: "+201000000000",
  contactAddress: "الإسكندرية، جمهورية مصر العربية",
  workingHours: "السبت — الخميس، من 9 صباحاً حتى 9 مساءً",
  faqContent: JSON.stringify([
    { q: "كيف أعرض عقاري على الموقع؟", a: "سجّل كمزود، ثم أضف بيانات عقارك من لوحة التحكم — الأمر يستغرق دقائق فقط." },
    { q: "هل التسجيل مجاني؟", a: "نعم، التسجيل الأساسي مجاني تماماً. تتوفر باقات مدفوعة لمزايا إضافية." },
    { q: "ما المناطق التي يغطيها الموقع؟", a: "نغطي جميع أحياء الإسكندرية: المنتزه، شرق، وسط، الجمرك، العجمي، العامرية، الدخيلة، أبو قير، وبرج العرب." },
    { q: "كيف أتواصل مع المالك أو السمسار؟", a: "يمكنك الاتصال مباشرة عبر الهاتف أو واتساب الظاهر في إعلان العقار." },
    { q: "هل الأسعار المعروضة قابلة للتفاوض؟", a: "نعم، معظم الأسعار قابلة للتفاوض. تواصل مع المالك للاستفسار." },
    { q: "ما الفرق بين الإعلان العادي والمميز؟", a: "الإعلان المميز يظهر في أعلى نتائج البحث وعلى الصفحة الرئيسية بشارة 'مميز'." },
  ]),
  servicesModuleEnabled: "true",
};

export async function seedPromotionTypes() {
  const existing = await db.select({ id: promotionTypesTable.id }).from(promotionTypesTable).limit(1);
  if (existing.length > 0) return; // already seeded
  console.log("Seeding promotion types...");
  await db.insert(promotionTypesTable).values([
    {
      key: "bump_up", nameAr: "Bump Up — ترفيع", nameEn: "Bump Up",
      descriptionAr: "انقل إعلانك إلى أعلى نتائج البحث فوراً وازداد ظهوراً.",
      isEnabled: true, price: "25.00", durationDays: 7, boostScore: 200,
      badgeText: "مرفوع", badgeColor: "#FFFFFF", badgeBgColor: "#3B82F6",
      maxSimultaneous: 1, vatPercent: "0.00", discountPercent: "0.00",
      requiresApproval: true, autoExpiry: true, priority: 1,
      benefits: JSON.stringify(["يظهر في أعلى نتائج البحث", "مدة 7 أيام", "ترتيب أولوية مرتفع"]),
      visibility: "search",
    },
    {
      key: "spotlight", nameAr: "Spotlight — إبراز", nameEn: "Spotlight",
      descriptionAr: "شارة مميزة وخلفية بارزة تجذب نظر المشترين على الفور.",
      isEnabled: true, price: "75.00", durationDays: 14, boostScore: 800,
      badgeText: "مبرز", badgeColor: "#FFFFFF", badgeBgColor: "#7C3AED",
      maxSimultaneous: 1, vatPercent: "0.00", discountPercent: "0.00",
      requiresApproval: true, autoExpiry: true, priority: 2,
      benefits: JSON.stringify(["أعلى درجات الإبراز", "شارة خاصة وبارزة", "مدة 14 يوم", "أولوية قصوى في البحث"]),
      visibility: "all",
    },
    {
      key: "featured_homepage", nameAr: "مميز على الرئيسية", nameEn: "Featured Homepage",
      descriptionAr: "اعرض إعلانك في قسم العقارات المميزة على الصفحة الرئيسية.",
      isEnabled: true, price: "150.00", durationDays: 30, boostScore: 500,
      badgeText: "مميز", badgeColor: "#FFFFFF", badgeBgColor: "#F59E0B",
      maxSimultaneous: 1, vatPercent: "0.00", discountPercent: "0.00",
      requiresApproval: true, autoExpiry: true, priority: 3,
      benefits: JSON.stringify(["يظهر في الصفحة الرئيسية", "قسم العقارات المميزة", "مدة 30 يوم", "مشاهدات أعلى بكثير"]),
      visibility: "homepage",
    },
    {
      key: "featured_category", nameAr: "مثبّت في القسم", nameEn: "Featured Category",
      descriptionAr: "ثبّت إعلانك في أعلى صفحات التصنيف المحددة.",
      isEnabled: true, price: "100.00", durationDays: 30, boostScore: 350,
      badgeText: "مثبت", badgeColor: "#FFFFFF", badgeBgColor: "#F97316",
      maxSimultaneous: 1, vatPercent: "0.00", discountPercent: "0.00",
      requiresApproval: true, autoExpiry: true, priority: 4,
      benefits: JSON.stringify(["مثبت في أعلى صفحة القسم", "مدة 30 يوم", "استهداف المشترين المهتمين"]),
      visibility: "category",
    },
    {
      key: "urgent_badge", nameAr: "شارة عاجل", nameEn: "Urgent Badge",
      descriptionAr: "أضف شارة \"عاجل\" تجذب المشترين الجادين وتُسرّع البيع.",
      isEnabled: true, price: "30.00", durationDays: 7, boostScore: 50,
      badgeText: "عاجل", badgeColor: "#FFFFFF", badgeBgColor: "#EF4444",
      maxSimultaneous: 1, vatPercent: "0.00", discountPercent: "0.00",
      requiresApproval: true, autoExpiry: true, priority: 5,
      benefits: JSON.stringify(["شارة عاجل واضحة", "يجذب المشترين الجادين", "مدة 7 أيام", "مناسب للبيع السريع"]),
      visibility: "all",
    },
    {
      key: "premium_listing", nameAr: "إعلان بريميوم", nameEn: "Premium Listing",
      descriptionAr: "أعلى مستوى من الظهور — يتصدر جميع نتائج البحث والتصنيفات.",
      isEnabled: true, price: "250.00", durationDays: 30, boostScore: 1000,
      badgeText: "بريميوم", badgeColor: "#FFFFFF", badgeBgColor: "#6D28D9",
      maxSimultaneous: 1, vatPercent: "0.00", discountPercent: "0.00",
      requiresApproval: true, autoExpiry: true, priority: 6,
      benefits: JSON.stringify(["أعلى ترتيب في البحث", "يتصدر جميع الصفحات", "مدة 30 يوم", "شارة بريميوم حصرية", "ظهور في كل الأقسام"]),
      visibility: "all",
    },
  ]);
  console.log("Promotion types seeded (6 types).");
}

export async function seedMenuItems() {
  const existing = await db.select({ id: menuItemsTable.id }).from(menuItemsTable).limit(1);
  if (existing.length > 0) {
    console.log("Menu items already seeded, skipping.");
    return;
  }
  await db.insert(menuItemsTable).values([
    { label: "الرئيسية",        href: "/",                            sortOrder: 0, visible: true },
    { label: "للبيع",           href: "/properties?listingType=sale", sortOrder: 1, visible: true },
    { label: "للإيجار",         href: "/properties?listingType=rent", sortOrder: 2, visible: true },
    { label: "الباقات",         href: "/pricing",                     sortOrder: 3, visible: true },
    { label: "🗺 بحث بالخريطة", href: "/map-search",                  sortOrder: 4, visible: true },
    { label: "📊 مؤشرات السوق", href: "/market",                      sortOrder: 5, visible: true },
  ]);
  console.log("Menu items seeded.");
}

export async function seedSiteSettings() {
  const existing = await db.select({ id: siteSettingsTable.id }).from(siteSettingsTable)
    .where(eq(siteSettingsTable.key, "siteName")).limit(1);
  if (existing.length > 0) {
    console.log("Site settings already seeded, skipping.");
    return;
  }
  console.log("Seeding site settings...");
  for (const [key, value] of Object.entries(DEFAULT_SITE_SETTINGS)) {
    await db.insert(siteSettingsTable).values({ key, value }).onConflictDoNothing();
  }
  console.log("Site settings seeded.");
}

// ── Default Demo Accounts ─────────────────────────────────────────────────────
// Always runs via upsert — safe on every startup, never creates duplicates.
// Credentials are intentionally fixed so they survive re-installs unchanged.

export async function seedDefaultAccounts() {
  console.log("Ensuring default accounts...");

  // ── Default User ──────────────────────────────────────────────────────────
  const userHash = await bcrypt.hash("user123", 10);
  const [defaultUser] = await db
    .insert(usersTable)
    .values({
      name: "مستخدم تجريبي",
      email: "user@aqaralex.com",
      passwordHash: userHash,
      role: "user",
      status: "active",
    })
    .onConflictDoUpdate({
      target: usersTable.email,
      set: {
        name: "مستخدم تجريبي",
        passwordHash: userHash,
        role: "user",
        status: "active",
      },
    })
    .returning();

  // ── Default Company (Provider) ────────────────────────────────────────────
  const companyHash = await bcrypt.hash("company123", 10);
  const [companyUser] = await db
    .insert(usersTable)
    .values({
      name: "شركة تجريبية",
      email: "company@aqaralex.com",
      passwordHash: companyHash,
      role: "provider",
      status: "active",
    })
    .onConflictDoUpdate({
      target: usersTable.email,
      set: {
        name: "شركة تجريبية",
        passwordHash: companyHash,
        role: "provider",
        status: "active",
      },
    })
    .returning();

  // Ensure a provider profile exists for the company user
  const existingProvider = await db
    .select({ id: providersTable.id })
    .from(providersTable)
    .where(eq(providersTable.userId, companyUser.id))
    .limit(1);

  if (existingProvider.length === 0) {
    await db.insert(providersTable).values({
      userId: companyUser.id,
      bio: "حساب الشركة التجريبي للاختبار والتطوير",
      city: "سيدي جابر",
      verified: true,
      featured: false,
      approved: true,
      active: true,
      rating: "5.00",
      reviewsCount: 0,
    });
  }

  console.log(
    `Default accounts ready:\n` +
    `  User    → user@aqaralex.com     / user123\n` +
    `  Company → company@aqaralex.com  / company123`
  );
}

// ── Force Re-seed (for admin use) ─────────────────────────────────────────────

export async function forceSeedSection(section: string): Promise<{ ok: boolean; message: string }> {
  try {
    switch (section) {
      case "locations": {
        const existing = await db.select({ id: regionsTable.id }).from(regionsTable)
          .where(eq(regionsTable.nameAr, "محافظة الإسكندرية")).limit(1);
        if (existing.length === 0) {
          await seedEgyptLocations();
          return { ok: true, message: "تم إضافة مواقع الإسكندرية بنجاح" };
        }
        return { ok: true, message: "المواقع موجودة بالفعل" };
      }
      case "featured-areas": {
        await db.delete(featuredAreasTable);
        await seedFeaturedAreas();
        return { ok: true, message: "تم إعادة تهيئة المناطق المميزة بنجاح" };
      }
      case "email-templates": {
        const slugs = EMAIL_TEMPLATES.map(t => t.slug);
        for (const slug of slugs) {
          await db.delete(emailTemplatesTable).where(eq(emailTemplatesTable.slug, slug));
        }
        await seedEmailTemplates();
        return { ok: true, message: `تم إعادة تهيئة ${EMAIL_TEMPLATES.length} قالب بريد بنجاح` };
      }
      case "site-settings": {
        for (const key of Object.keys(DEFAULT_SITE_SETTINGS)) {
          await db.delete(siteSettingsTable).where(eq(siteSettingsTable.key, key));
        }
        await seedSiteSettings();
        return { ok: true, message: "تم إعادة تهيئة إعدادات الموقع بنجاح" };
      }
      case "properties": {
        await db.delete(propertiesTable);
        await seedProperties();
        return { ok: true, message: "تم إعادة تهيئة العقارات التجريبية بنجاح" };
      }
      case "real-estate-categories": {
        const cats = await db.select({ id: categoriesTable.id }).from(categoriesTable)
          .where(eq(categoriesTable.type, "real_estate"));
        if (cats.length === 0) {
          await seedRealEstateCategories();
          return { ok: true, message: "تم إضافة تصنيفات العقارات بنجاح" };
        }
        return { ok: true, message: "تصنيفات العقارات موجودة بالفعل" };
      }
      case "all": {
        await seedEgyptLocations();
        await seedRealEstateCategories();
        await db.delete(featuredAreasTable);
        await seedFeaturedAreas();
        const slugs = EMAIL_TEMPLATES.map(t => t.slug);
        for (const slug of slugs) {
          await db.delete(emailTemplatesTable).where(eq(emailTemplatesTable.slug, slug));
        }
        await seedEmailTemplates();
        await db.delete(propertiesTable);
        await seedProperties();
        return { ok: true, message: "تم تهيئة جميع البيانات التجريبية بنجاح" };
      }
      default:
        return { ok: false, message: `قسم غير معروف: ${section}` };
    }
  } catch (err: any) {
    return { ok: false, message: err?.message ?? "حدث خطأ غير متوقع" };
  }
}
