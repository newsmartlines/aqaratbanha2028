import { db } from "@workspace/db";
import {
  categoriesTable, usersTable, packagesTable, providersTable,
  servicesTable, subscriptionsTable, reviewsTable,
  regionsTable, citiesTable, areasTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";

export async function seed() {
  console.log("Seeding database...");

  const existingCats = await db.select().from(categoriesTable);
  if (existingCats.length === 0) {
    const categories = await db.insert(categoriesTable).values([
      { nameAr: "طعام منزلي", nameEn: "Home Food", icon: "ChefHat", slug: "food" },
      { nameAr: "صيانة", nameEn: "Maintenance", icon: "Wrench", slug: "maintenance" },
      { nameAr: "تصميم", nameEn: "Design", icon: "Palette", slug: "design" },
      { nameAr: "تعليم", nameEn: "Education", icon: "BookOpen", slug: "education" },
      { nameAr: "فعاليات", nameEn: "Events", icon: "Calendar", slug: "events" },
      { nameAr: "جمال", nameEn: "Beauty", icon: "Sparkles", slug: "beauty" },
    ]).returning();

    const packages = await db.insert(packagesTable).values([
      { nameAr: "مجاني", nameEn: "Free", price: "0", durationDays: 30, maxListings: 3, commissionRate: "15", featuredAllowed: 0, topBadge: false, priorityRank: 0 },
      { nameAr: "برونزي", nameEn: "Bronze", price: "99", durationDays: 30, maxListings: 10, commissionRate: "10", featuredAllowed: 3, topBadge: false, priorityRank: 1 },
      { nameAr: "بريميوم", nameEn: "Premium", price: "249", durationDays: 30, maxListings: null, commissionRate: "7", featuredAllowed: null, topBadge: true, priorityRank: 2 },
    ]).returning();

    const adminHash = await bcrypt.hash("admin123", 10);
    const [adminUser] = await db.insert(usersTable).values({ name: "Admin", email: "admin@dalel.sa", passwordHash: adminHash, role: "admin" }).returning();

    const providerData = [
      { name: "أحمد عبدالله", email: "ahmed@dalel.sa", city: "الرياض", bio: "مصمم جرافيك محترف بخبرة 5 سنوات", categorySlug: "design", rating: "4.9", featured: true, verified: true },
      { name: "سارة الغامدي", email: "sara@dalel.sa", city: "جدة", bio: "مصورة منتجات احترافية", categorySlug: "design", rating: "4.8", featured: true, verified: true },
      { name: "نواف العتيبي", email: "nawaf@dalel.sa", city: "الدمام", bio: "فني صيانة تكييفات", categorySlug: "maintenance", rating: "4.7", featured: false, verified: true },
      { name: "أم خالد", email: "oumkhalid@dalel.sa", city: "الرياض", bio: "طبخ منزلي أصيل", categorySlug: "food", rating: "4.9", featured: true, verified: true },
      { name: "منى الشهري", email: "mona@dalel.sa", city: "الطائف", bio: "تنظيم حفلات وأعراس", categorySlug: "events", rating: "4.6", featured: false, verified: true },
      { name: "هنود القرني", email: "hanood@dalel.sa", city: "الرياض", bio: "خبيرة تجميل ومكياج", categorySlug: "beauty", rating: "4.8", featured: true, verified: true },
    ];

    const passHash = await bcrypt.hash("provider123", 10);
    for (const p of providerData) {
      const cat = categories.find(c => c.slug === p.categorySlug);
      const [user] = await db.insert(usersTable).values({ name: p.name, email: p.email, passwordHash: passHash, role: "provider" }).returning();
      const [provider] = await db.insert(providersTable).values({
        userId: user.id, bio: p.bio, city: p.city,
        categoryId: cat?.id, rating: p.rating,
        reviewsCount: Math.floor(Math.random() * 80) + 10,
        verified: p.verified, featured: p.featured, approved: true
      }).returning();

      await db.insert(servicesTable).values([
        { providerId: provider.id, categoryId: cat?.id, title: `خدمة ${p.name} الأساسية`, description: p.bio, price: String(Math.floor(Math.random() * 200) + 50), status: "active" },
        { providerId: provider.id, categoryId: cat?.id, title: `خدمة ${p.name} المتميزة`, description: `خدمة متميزة من ${p.name}`, price: String(Math.floor(Math.random() * 400) + 150), status: "active" },
      ]);

      const now = new Date();
      const end = new Date(now); end.setDate(end.getDate() + 18);
      await db.insert(subscriptionsTable).values({ providerId: provider.id, packageId: packages[1].id, startDate: now, endDate: end, status: "active" });

      await db.insert(reviewsTable).values([
        { providerId: provider.id, rating: 5, text: "خدمة ممتازة ومحترفة", userId: adminUser.id },
        { providerId: provider.id, rating: 4, text: "عمل جيد وسريع", userId: adminUser.id },
      ]);
    }
    console.log("Main data seeded.");
  } else {
    console.log("Main data already seeded, skipping.");
  }

  await seedRegions();

  console.log("Database seeded successfully!");
}

async function seedRegions() {
  const existing = await db.select().from(regionsTable);
  if (existing.length > 0) {
    console.log("Regions already seeded, skipping.");
    await seedAreas();
    return;
  }
  console.log("Seeding regions and cities...");

  const regionData = [
    {
      nameAr: "منطقة الرياض", nameEn: "Riyadh Region", order: 1,
      cities: [
        { name: "الرياض", areas: ["النخيل", "الياسمين", "الملقا", "حي الملك فهد", "العليا", "الروضة", "العزيزية", "الشميسي", "المرسلات", "قرطبة", "غرناطة", "المربع", "الصحافة", "الربيع", "الورود", "التعاون", "الاندلس", "السليمانية", "النرجس"] },
        { name: "الخرج", areas: [] },
        { name: "الدوادمي", areas: [] },
        { name: "الزلفي", areas: [] },
        { name: "شقراء", areas: [] },
        { name: "المجمعة", areas: [] },
      ]
    },
    {
      nameAr: "منطقة مكة المكرمة", nameEn: "Mecca Region", order: 2,
      cities: [
        { name: "جدة", areas: ["الروضة", "الصفا", "الحمراء", "البوادي", "أبحر الشمالية", "الزهراء", "المروة", "الربوة", "النزهة", "الفيصلية", "الشاطئ", "التضامن", "الفيحاء", "العزيزية", "الصواري", "النسيم", "السلامة"] },
        { name: "مكة المكرمة", areas: ["العزيزية", "الزاهر", "العتيبية", "الشرائع", "أجياد", "الشيشة", "المعابدة"] },
        { name: "الطائف", areas: ["الحوية", "الشهداء", "القزاز", "المثناه", "الربوة", "الفيصلية"] },
        { name: "رابغ", areas: [] },
      ]
    },
    {
      nameAr: "منطقة المدينة المنورة", nameEn: "Madinah Region", order: 3,
      cities: [
        { name: "المدينة المنورة", areas: ["قباء", "شوران", "العزيزية", "الفيحاء", "وادي العقيق", "سلطانة", "المطار"] },
        { name: "ينبع", areas: [] },
        { name: "العلا", areas: [] },
      ]
    },
    {
      nameAr: "منطقة القصيم", nameEn: "Qassim Region", order: 4,
      cities: [
        { name: "بريدة", areas: ["الروضة", "الفيحاء", "الاندلس", "النزهة", "السلام"] },
        { name: "عنيزة", areas: [] },
        { name: "الرس", areas: [] },
      ]
    },
    {
      nameAr: "المنطقة الشرقية", nameEn: "Eastern Province", order: 5,
      cities: [
        { name: "الدمام", areas: ["الشاطئ", "الفيصلية", "العدامة", "النزهة", "المريكبات", "العنود", "الجامعيين", "البادية"] },
        { name: "الخبر", areas: ["العقربية", "الراكة", "الكورنيش", "الإسكان", "اليرموك"] },
        { name: "الظهران", areas: ["الدانة", "الدوحة الجنوبية", "الدوحة الشمالية", "الأنوار"] },
        { name: "الأحساء", areas: ["الهفوف", "المبرز", "العيون", "الجفر", "العمران"] },
        { name: "القطيف", areas: ["سيهات", "صفوى", "تاروت", "العوامية", "الجش"] },
        { name: "الجبيل", areas: [] },
        { name: "حفر الباطن", areas: [] },
        { name: "الخفجي", areas: [] },
        { name: "رأس تنورة", areas: [] },
      ]
    },
    {
      nameAr: "منطقة عسير", nameEn: "Asir Region", order: 6,
      cities: [
        { name: "أبها", areas: ["المنهل", "الروضة", "مدينة العمال", "الورود", "الأندلس"] },
        { name: "خميس مشيط", areas: ["الفيصلية", "الطائفية", "الصالحية"] },
        { name: "بيشة", areas: [] },
      ]
    },
    {
      nameAr: "منطقة تبوك", nameEn: "Tabuk Region", order: 7,
      cities: [
        { name: "تبوك", areas: ["الاندلس", "الروضة", "الفيصلية", "العزيزية"] },
        { name: "الوجه", areas: [] },
      ]
    },
    {
      nameAr: "منطقة حائل", nameEn: "Hail Region", order: 8,
      cities: [
        { name: "حائل", areas: ["الروضة", "الفيصلية", "الخزام", "النزهة"] },
        { name: "بقعاء", areas: [] },
      ]
    },
    {
      nameAr: "منطقة الحدود الشمالية", nameEn: "Northern Borders Region", order: 9,
      cities: [
        { name: "عرعر", areas: ["الصالحية", "النزهة", "الروضة"] },
        { name: "رفحاء", areas: [] },
      ]
    },
    {
      nameAr: "منطقة جازان", nameEn: "Jizan Region", order: 10,
      cities: [
        { name: "جازان", areas: ["الروضة", "السلام", "الفيصلية", "الكورنيش"] },
        { name: "أبو عريش", areas: [] },
        { name: "صبيا", areas: [] },
      ]
    },
    {
      nameAr: "منطقة نجران", nameEn: "Najran Region", order: 11,
      cities: [
        { name: "نجران", areas: ["الفيصلية", "الأمير فيصل", "سدير"] },
        { name: "شرورة", areas: [] },
      ]
    },
    {
      nameAr: "منطقة الباحة", nameEn: "Al-Baha Region", order: 12,
      cities: [
        { name: "الباحة", areas: ["العقيق", "المخواة", "الحجرة"] },
        { name: "بلجرشي", areas: [] },
      ]
    },
    {
      nameAr: "منطقة الجوف", nameEn: "Al-Jouf Region", order: 13,
      cities: [
        { name: "سكاكا", areas: ["الروضة", "الفيصلية", "الاندلس"] },
        { name: "القريات", areas: [] },
        { name: "دومة الجندل", areas: [] },
      ]
    },
  ];

  for (const r of regionData) {
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
        nameEn: c.name,
        enabled: true,
      }).returning();

      if (c.areas.length > 0) {
        await db.insert(areasTable).values(
          c.areas.map(a => ({ cityId: city.id, nameAr: a, nameEn: a, enabled: true }))
        );
      }
    }
  }
  console.log("Regions, cities, and areas seeded.");
}

async function seedAreas() {
  const existingAreas = await db.select().from(areasTable);
  if (existingAreas.length > 0) {
    console.log("Areas already seeded, skipping.");
    return;
  }
  console.log("Seeding areas for existing cities...");
  const cities = await db.select().from(citiesTable);

  const cityAreaMap: Record<string, string[]> = {
    "الرياض": ["النخيل", "الياسمين", "الملقا", "العليا", "الروضة", "العزيزية", "الصحافة", "الربيع", "الورود", "التعاون", "الاندلس", "السليمانية", "النرجس", "قرطبة", "غرناطة", "الشميسي"],
    "جدة": ["الروضة", "الصفا", "الحمراء", "البوادي", "أبحر الشمالية", "الزهراء", "المروة", "الربوة", "النزهة", "الفيصلية", "الشاطئ", "السلامة", "العزيزية", "النسيم"],
    "مكة المكرمة": ["العزيزية", "الزاهر", "العتيبية", "الشرائع", "أجياد", "المعابدة"],
    "الطائف": ["الحوية", "الشهداء", "القزاز", "المثناه", "الربوة", "الفيصلية"],
    "المدينة المنورة": ["قباء", "شوران", "العزيزية", "الفيحاء", "وادي العقيق", "سلطانة"],
    "الدمام": ["الشاطئ", "الفيصلية", "العدامة", "النزهة", "المريكبات", "العنود", "الجامعيين"],
    "الخبر": ["العقربية", "الراكة", "الكورنيش", "الإسكان", "اليرموك"],
    "الأحساء": ["الهفوف", "المبرز", "العيون", "الجفر"],
    "بريدة": ["الروضة", "الفيحاء", "الاندلس", "النزهة", "السلام"],
    "أبها": ["المنهل", "الروضة", "مدينة العمال", "الورود"],
    "خميس مشيط": ["الفيصلية", "الطائفية", "الصالحية"],
    "تبوك": ["الاندلس", "الروضة", "الفيصلية", "العزيزية"],
    "حائل": ["الروضة", "الفيصلية", "الخزام", "النزهة"],
    "جازان": ["الروضة", "السلام", "الفيصلية", "الكورنيش"],
    "نجران": ["الفيصلية", "الأمير فيصل", "سدير"],
    "سكاكا": ["الروضة", "الفيصلية", "الاندلس"],
    "ينبع": ["الروضة", "الصناعية", "الفيصلية"],
  };

  for (const city of cities) {
    const areaNames = cityAreaMap[city.nameAr];
    if (areaNames && areaNames.length > 0) {
      await db.insert(areasTable).values(
        areaNames.map(a => ({ cityId: city.id, nameAr: a, nameEn: a, enabled: true }))
      );
    }
  }
  console.log("Areas seeded for existing cities.");
}
