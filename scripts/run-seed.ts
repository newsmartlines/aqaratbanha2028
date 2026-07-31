import bcrypt from "bcryptjs";
import { db } from "../lib/db/src/index";
import {
  usersTable,
  providersTable,
  packagesTable,
  subscriptionsTable,
  reviewsTable,
  categoriesTable,
} from "../lib/db/src/index";
import { seed } from "../artifacts/api-server/src/lib/seed";
import { count, eq } from "drizzle-orm";

async function ensureProviders() {
  const [{ n: providerCount }] = await db.select({ n: count() }).from(providersTable);
  if (Number(providerCount) > 0) {
    console.log("Providers already exist, skipping.");
    return;
  }

  console.log("Creating providers...");

  // Ensure packages exist
  let packages = await db.select().from(packagesTable);
  if (packages.length === 0) {
    packages = await db.insert(packagesTable).values([
      { nameAr: "مجاني", nameEn: "Free", price: "0", durationDays: 30, maxListings: 3, featuredAllowed: 0, topBadge: false, priorityRank: 0 },
      { nameAr: "برونزي", nameEn: "Bronze", price: "99", durationDays: 30, maxListings: 10, featuredAllowed: 3, topBadge: false, priorityRank: 1 },
      { nameAr: "بريميوم", nameEn: "Premium", price: "249", durationDays: 30, maxListings: null, featuredAllowed: null, topBadge: true, priorityRank: 2 },
    ]).returning();
    console.log("Packages created.");
  }

  // Ensure admin user exists
  let adminUser = (await db.select().from(usersTable).where(eq(usersTable.email, "admin@aqaratbanha.com")).limit(1))[0];
  if (!adminUser) {
    const adminHash = await bcrypt.hash("admin123", 10);
    [adminUser] = await db.insert(usersTable).values({ name: "Admin", email: "admin@aqaratbanha.com", passwordHash: adminHash, role: "admin" }).returning();
    console.log("Admin user created.");
  }

  // Get a category id for providers
  const [anyCategory] = await db.select({ id: categoriesTable.id }).from(categoriesTable).limit(1);
  const catId = anyCategory?.id;

  const providerData = [
    { name: "أحمد عبدالله",  email: "ahmed@aqaratbanha.com",      city: "بنها",              bio: "سمسار عقارات محترف بخبرة 10 سنوات في بنها والقليوبية",         rating: "4.9", featured: true,  verified: true },
    { name: "سارة الغامدي",  email: "sara@aqaratbanha.com",       city: "بنها",              bio: "خبيرة تسويق عقاري ومستشارة مبيعات",                            rating: "4.8", featured: true,  verified: true },
    { name: "نواف العتيبي",  email: "nawaf@aqaratbanha.com",      city: "القناطر الخيرية",   bio: "مقاول ومتخصص في أعمال التشطيبات والديكور",                     rating: "4.7", featured: false, verified: true },
    { name: "أم خالد",       email: "oumkhalid@aqaratbanha.com",  city: "طوخ",               bio: "وسيطة عقارية ومتخصصة في عقارات محافظة القليوبية",             rating: "4.9", featured: true,  verified: true },
    { name: "منى الشهري",    email: "mona@aqaratbanha.com",       city: "شبرا الخيمة",       bio: "مستشارة عقارية ومتخصصة في الاستثمار العقاري",                  rating: "4.6", featured: false, verified: true },
    { name: "هنود القرني",   email: "hanood@aqaratbanha.com",     city: "قليوب",             bio: "وسيط عقاري خبرة 7 سنوات في بيع وإيجار الشقق",                 rating: "4.8", featured: true,  verified: true },
  ];

  const passHash = await bcrypt.hash("provider123", 10);
  const bronzePackage = packages.find(p => p.nameEn === "Bronze") ?? packages[0];
  const now = new Date();
  const end = new Date(now); end.setDate(end.getDate() + 30);

  for (const p of providerData) {
    // Skip if user already exists
    const existing = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.email, p.email)).limit(1);
    let userId: number;
    if (existing.length > 0) {
      userId = existing[0].id;
    } else {
      const [user] = await db.insert(usersTable).values({ name: p.name, email: p.email, passwordHash: passHash, role: "provider" }).returning();
      userId = user.id;
    }

    const [provider] = await db.insert(providersTable).values({
      userId, bio: p.bio, city: p.city,
      categoryId: catId,
      rating: p.rating,
      reviewsCount: Math.floor(Math.random() * 80) + 10,
      verified: p.verified,
      featured: p.featured,
      approved: true,
    }).returning();

    await db.insert(subscriptionsTable).values({ providerId: provider.id, packageId: bronzePackage.id, startDate: now, endDate: end, status: "active" });
    await db.insert(reviewsTable).values([
      { providerId: provider.id, rating: 5, text: "خدمة ممتازة ومحترفة", userId: adminUser.id },
      { providerId: provider.id, rating: 4, text: "عمل جيد وسريع",       userId: adminUser.id },
    ]);
    console.log(`  Provider created: ${p.name}`);
  }
}

async function main() {
  console.log("🌱 بدء تهيئة البيانات...");
  await ensureProviders();
  await seed();
  console.log("✅ تمت التهيئة بنجاح");
  process.exit(0);
}

main().catch((err) => {
  console.error("❌ فشل:", err);
  process.exit(1);
});
