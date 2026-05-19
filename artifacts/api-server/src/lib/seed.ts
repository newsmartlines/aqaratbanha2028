import { db } from "@workspace/db";
import {
  categoriesTable, usersTable, packagesTable, providersTable,
  servicesTable, subscriptionsTable, reviewsTable,
  regionsTable, citiesTable, areasTable, billingPlansTable, commissionRulesTable,
  propertiesTable,
} from "@workspace/db";
import bcrypt from "bcryptjs";

const DEFAULT_BILLING_PLANS = [
  { name: "Free", nameAr: "مجاني", price: "0", yearlyPrice: "0", currency: "EGP", durationDays: 30, durationType: "monthly", userType: "all", status: "active", isRecommended: false, isMostPopular: false, trialDays: 0, sortOrder: 0, color: "#64748b", commissionPercent: "10", descriptionAr: "الباقة المجانية - ابدأ مجاناً", limits: JSON.stringify({ properties: 3, photos: 10, videos: 0, featuredAds: 0, pinnedAds: 0, messages: 20, leads: 10 }), features: JSON.stringify({ homepageDisplay: false, topSearch: false, verifiedBadge: false, premiumBadge: false, prioritySupport: false, analytics: false, seo: false, aiTools: false, autoBoost: false }) },
  { name: "Bronze", nameAr: "برونز", price: "99", yearlyPrice: "999", currency: "EGP", durationDays: 30, durationType: "monthly", userType: "all", status: "active", isRecommended: false, isMostPopular: true, trialDays: 7, sortOrder: 1, color: "#b45309", commissionPercent: "7", descriptionAr: "باقة البرونز للمبتدئين", limits: JSON.stringify({ properties: 10, photos: 20, videos: 2, featuredAds: 3, pinnedAds: 1, messages: 100, leads: 50 }), features: JSON.stringify({ homepageDisplay: true, topSearch: false, verifiedBadge: false, premiumBadge: false, prioritySupport: false, analytics: true, seo: false, aiTools: false, autoBoost: false }) },
  { name: "Silver", nameAr: "فضي", price: "199", yearlyPrice: "1999", currency: "EGP", durationDays: 30, durationType: "monthly", userType: "all", status: "active", isRecommended: true, isMostPopular: false, trialDays: 7, sortOrder: 2, color: "#475569", commissionPercent: "5", descriptionAr: "الباقة الفضية للسماسرة", limits: JSON.stringify({ properties: 30, photos: 30, videos: 5, featuredAds: 10, pinnedAds: 3, messages: 500, leads: 200 }), features: JSON.stringify({ homepageDisplay: true, topSearch: true, verifiedBadge: true, premiumBadge: false, prioritySupport: false, analytics: true, seo: true, aiTools: false, autoBoost: false }) },
  { name: "Gold", nameAr: "ذهبي", price: "399", yearlyPrice: "3999", currency: "EGP", durationDays: 30, durationType: "monthly", userType: "all", status: "active", isRecommended: false, isMostPopular: false, trialDays: 14, sortOrder: 3, color: "#ca8a04", commissionPercent: "3", descriptionAr: "الباقة الذهبية للشركات", limits: JSON.stringify({ properties: 100, photos: 50, videos: 10, featuredAds: 30, pinnedAds: 10, messages: -1, leads: -1 }), features: JSON.stringify({ homepageDisplay: true, topSearch: true, verifiedBadge: true, premiumBadge: true, prioritySupport: true, analytics: true, seo: true, aiTools: true, autoBoost: false }) },
  { name: "VIP", nameAr: "VIP", price: "799", yearlyPrice: "7999", currency: "EGP", durationDays: 30, durationType: "monthly", userType: "all", status: "active", isRecommended: false, isMostPopular: false, trialDays: 14, sortOrder: 4, color: "#7c3aed", commissionPercent: "2", descriptionAr: "باقة VIP - صلاحيات غير محدودة", limits: JSON.stringify({ properties: -1, photos: -1, videos: -1, featuredAds: -1, pinnedAds: -1, messages: -1, leads: -1 }), features: JSON.stringify({ homepageDisplay: true, topSearch: true, verifiedBadge: true, premiumBadge: true, prioritySupport: true, analytics: true, seo: true, aiTools: true, autoBoost: true }) },
];

const DEFAULT_COMMISSION_RULES = [
  { name: "عمولة البيع", type: "percentage", value: "5", isPercentage: true, appliesTo: "sale", userType: "all", priority: 1, isActive: true, notes: "عمولة على صفقات البيع" },
  { name: "عمولة الإيجار", type: "percentage", value: "3", isPercentage: true, appliesTo: "rent", userType: "all", priority: 2, isActive: true, notes: "عمولة على صفقات الإيجار" },
  { name: "عمولة الإعلانات المميزة", type: "percentage", value: "2", isPercentage: true, appliesTo: "featured", userType: "all", priority: 3, isActive: true, notes: "عمولة الإعلانات المدفوعة" },
];

export async function seed() {
  console.log("Seeding database...");

  // ── Seed billing plans ────────────────────────────────────────────────────
  const existingBP = await db.select({ id: billingPlansTable.id }).from(billingPlansTable).limit(1);
  if (existingBP.length === 0) {
    for (const p of DEFAULT_BILLING_PLANS) {
      await db.insert(billingPlansTable).values(p as any).onConflictDoNothing();
    }
    for (const c of DEFAULT_COMMISSION_RULES) {
      await db.insert(commissionRulesTable).values(c as any).onConflictDoNothing();
    }
    console.log("Billing plans seeded.");
  } else {
    console.log("Billing plans already seeded, skipping.");
  }

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
    const [adminUser] = await db.insert(usersTable).values({ name: "Admin", email: "admin@dalilsmartlines.com", passwordHash: adminHash, role: "admin" }).returning();

    const providerData = [
      { name: "أحمد عبدالله", email: "ahmed@dalilsmartlines.com", city: "الرياض", bio: "مصمم جرافيك محترف بخبرة 5 سنوات", categorySlug: "design", rating: "4.9", featured: true, verified: true },
      { name: "سارة الغامدي", email: "sara@dalilsmartlines.com", city: "جدة", bio: "مصورة منتجات احترافية", categorySlug: "design", rating: "4.8", featured: true, verified: true },
      { name: "نواف العتيبي", email: "nawaf@dalilsmartlines.com", city: "الدمام", bio: "فني صيانة تكييفات", categorySlug: "maintenance", rating: "4.7", featured: false, verified: true },
      { name: "أم خالد", email: "oumkhalid@dalilsmartlines.com", city: "الرياض", bio: "طبخ منزلي أصيل", categorySlug: "food", rating: "4.9", featured: true, verified: true },
      { name: "منى الشهري", email: "mona@dalilsmartlines.com", city: "الطائف", bio: "تنظيم حفلات وأعراس", categorySlug: "events", rating: "4.6", featured: false, verified: true },
      { name: "هنود القرني", email: "hanood@dalilsmartlines.com", city: "الرياض", bio: "خبيرة تجميل ومكياج", categorySlug: "beauty", rating: "4.8", featured: true, verified: true },
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
  await seedRealEstateCategories();
  await seedProperties();

  console.log("Database seeded successfully!");
}

async function seedProperties() {
  const existing = await db.select({ id: propertiesTable.id }).from(propertiesTable).limit(1);
  if (existing.length > 0) {
    console.log("Properties already seeded, skipping.");
    return;
  }

  // Get first provider
  const providers = await db.select({ id: providersTable.id }).from(providersTable).limit(6);
  if (providers.length === 0) {
    console.log("No providers found, skipping property seed.");
    return;
  }
  const pid = (i: number) => providers[i % providers.length].id;

  console.log("Seeding properties...");
  const IMGS_APT = JSON.stringify(["https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80","https://images.unsplash.com/photo-1502005097973-6a7082348e28?w=800&q=80"]);
  const IMGS_VILLA = JSON.stringify(["https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80","https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80"]);
  const IMGS_LAND = JSON.stringify(["https://images.unsplash.com/photo-1500382017468-9049fed747ef?w=800&q=80"]);
  const IMGS_COMM = JSON.stringify(["https://images.unsplash.com/photo-1497366216548-37526070297c?w=800&q=80"]);
  const IMGS_DUPLEX = JSON.stringify(["https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80"]);

  await db.insert(propertiesTable).values([
    // ── شقق للبيع ──────────────────────────────────────────────────────────
    { providerId: pid(0), title: "شقة 3 غرف للبيع في بنها", mainCategory: "residential", listingType: "sale", subCategory: "شقة", price: "850000", area: "120", rooms: 3, bathrooms: 2, floor: 3, finishing: "مشطب", district: "وسط البلد", address: "بنها", images: IMGS_APT, status: "active", featured: true, phone: "01001234567", whatsapp: "01001234567" },
    { providerId: pid(1), title: "شقة 2 غرف سوبر لوكس للبيع", mainCategory: "residential", listingType: "sale", subCategory: "شقة", price: "650000", area: "95", rooms: 2, bathrooms: 1, floor: 5, finishing: "مشطب", district: "شارع الجمهورية", address: "بنها", images: IMGS_APT, status: "active", featured: false, phone: "01112345678", whatsapp: "01112345678" },
    { providerId: pid(2), title: "شقة 4 غرف بموقع مميز بنها", mainCategory: "residential", listingType: "sale", subCategory: "شقة", price: "1200000", area: "170", rooms: 4, bathrooms: 2, floor: 2, finishing: "مشطب", district: "الحي العاشر", address: "بنها", images: IMGS_APT, status: "active", featured: true, phone: "01223456789", whatsapp: "01223456789" },
    { providerId: pid(0), title: "شقة 3 غرف تشطيب كامل - القناطر الخيرية", mainCategory: "residential", listingType: "sale", subCategory: "شقة", price: "720000", area: "130", rooms: 3, bathrooms: 2, floor: 1, finishing: "مشطب", district: "القناطر الجديدة", address: "القناطر الخيرية", images: IMGS_APT, status: "active", featured: false, phone: "01001234567", whatsapp: "01001234567" },
    { providerId: pid(1), title: "شقة غرفتين ريسيبشن للبيع - قليوب", mainCategory: "residential", listingType: "sale", subCategory: "شقة", price: "550000", area: "85", rooms: 2, bathrooms: 1, floor: 4, finishing: "مشطب", district: "وسط قليوب", address: "قليوب", images: IMGS_APT, status: "active", featured: false, phone: "01112345678", whatsapp: "01112345678" },
    { providerId: pid(2), title: "شقة استوديو مفروشة للبيع", mainCategory: "residential", listingType: "sale", subCategory: "ستوديو", price: "380000", area: "55", rooms: 1, bathrooms: 1, floor: 6, finishing: "مشطب", furnished: "مفروش", district: "شارع الجيش", address: "بنها", images: IMGS_APT, status: "active", featured: false, phone: "01223456789", whatsapp: "01223456789" },
    { providerId: pid(3), title: "شقة 3 غرف - الخانكة", mainCategory: "residential", listingType: "sale", subCategory: "شقة", price: "680000", area: "115", rooms: 3, bathrooms: 2, floor: 2, finishing: "نص تشطيب", district: "مركز الخانكة", address: "الخانكة", images: IMGS_APT, status: "active", featured: false, phone: "01334567890", whatsapp: "01334567890" },
    { providerId: pid(4), title: "شقة خام 3 غرف للبيع - طوخ", mainCategory: "residential", listingType: "sale", subCategory: "شقة", price: "480000", area: "110", rooms: 3, bathrooms: 2, floor: 1, finishing: "خام", district: "مركز طوخ", address: "طوخ", images: IMGS_APT, status: "active", featured: false, phone: "01445678901", whatsapp: "01445678901" },

    // ── شقق للإيجار ────────────────────────────────────────────────────────
    { providerId: pid(0), title: "شقة للإيجار 3 غرف مفروشة بنها", mainCategory: "residential", listingType: "rent", subCategory: "شقة", price: "5000", area: "120", rooms: 3, bathrooms: 2, floor: 3, finishing: "مشطب", furnished: "مفروش", district: "الحي الثامن", address: "بنها", images: IMGS_APT, status: "active", featured: true, phone: "01001234567", whatsapp: "01001234567" },
    { providerId: pid(1), title: "شقة للإيجار 2 غرفة غير مفروشة", mainCategory: "residential", listingType: "rent", subCategory: "شقة", price: "2800", area: "90", rooms: 2, bathrooms: 1, floor: 2, finishing: "مشطب", furnished: "غير مفروش", district: "شارع الرياضة", address: "بنها", images: IMGS_APT, status: "active", featured: false, phone: "01112345678", whatsapp: "01112345678" },
    { providerId: pid(2), title: "شقة للإيجار 4 غرف - فيلتس بنها", mainCategory: "residential", listingType: "rent", subCategory: "شقة", price: "7500", area: "165", rooms: 4, bathrooms: 3, floor: 5, finishing: "مشطب", furnished: "مفروش", district: "فيلتس", address: "بنها", images: IMGS_APT, status: "active", featured: true, phone: "01223456789", whatsapp: "01223456789" },
    { providerId: pid(3), title: "شقة إيجار غرفة وصالة - قليوب", mainCategory: "residential", listingType: "rent", subCategory: "شقة", price: "1800", area: "65", rooms: 1, bathrooms: 1, floor: 3, finishing: "مشطب", furnished: "غير مفروش", district: "قليوب الجديدة", address: "قليوب", images: IMGS_APT, status: "active", featured: false, phone: "01334567890", whatsapp: "01334567890" },
    { providerId: pid(4), title: "شقة للإيجار 3 غرف - القناطر", mainCategory: "residential", listingType: "rent", subCategory: "شقة", price: "3500", area: "105", rooms: 3, bathrooms: 2, floor: 4, finishing: "مشطب", furnished: "غير مفروش", district: "كورنيش القناطر", address: "القناطر الخيرية", images: IMGS_APT, status: "active", featured: false, phone: "01445678901", whatsapp: "01445678901" },

    // ── فيلات للبيع ────────────────────────────────────────────────────────
    { providerId: pid(0), title: "فيلا 5 غرف للبيع - العبور", mainCategory: "residential", listingType: "sale", subCategory: "فيلا", price: "4500000", area: "350", rooms: 5, bathrooms: 4, floor: 0, finishing: "مشطب", furnished: "غير مفروش", district: "العبور", address: "العبور", images: IMGS_VILLA, status: "active", featured: true, phone: "01001234567", whatsapp: "01001234567" },
    { providerId: pid(1), title: "فيلا توين هاوس للبيع - بنها الجديدة", mainCategory: "residential", listingType: "sale", subCategory: "توين هاوس", price: "3200000", area: "280", rooms: 4, bathrooms: 3, floor: 0, finishing: "نص تشطيب", district: "بنها الجديدة", address: "بنها", images: IMGS_VILLA, status: "active", featured: true, phone: "01112345678", whatsapp: "01112345678" },
    { providerId: pid(2), title: "فيلا دوبلكس 6 غرف - مدينة بدر", mainCategory: "residential", listingType: "sale", subCategory: "دوبلكس", price: "5800000", area: "420", rooms: 6, bathrooms: 5, floor: 0, finishing: "مشطب", furnished: "غير مفروش", district: "مدينة بدر", address: "مدينة بدر", images: IMGS_DUPLEX, status: "active", featured: true, phone: "01223456789", whatsapp: "01223456789" },
    { providerId: pid(3), title: "فيلا 4 غرف بحديقة - القناطر", mainCategory: "residential", listingType: "sale", subCategory: "فيلا", price: "2800000", area: "300", rooms: 4, bathrooms: 3, floor: 0, finishing: "مشطب", district: "القناطر الخيرية", address: "القناطر الخيرية", images: IMGS_VILLA, status: "active", featured: false, phone: "01334567890", whatsapp: "01334567890" },

    // ── دوبلكس وروف ───────────────────────────────────────────────────────
    { providerId: pid(4), title: "دوبلكس 4 غرف للبيع - بنها", mainCategory: "residential", listingType: "sale", subCategory: "دوبلكس", price: "1800000", area: "200", rooms: 4, bathrooms: 3, floor: 5, finishing: "مشطب", district: "الحي التاسع", address: "بنها", images: IMGS_DUPLEX, status: "active", featured: false, phone: "01445678901", whatsapp: "01445678901" },
    { providerId: pid(0), title: "روف 3 غرف بتراس واسع - بنها", mainCategory: "residential", listingType: "sale", subCategory: "روف", price: "1100000", area: "140", rooms: 3, bathrooms: 2, floor: 7, finishing: "مشطب", district: "شارع سعد زغلول", address: "بنها", images: IMGS_DUPLEX, status: "active", featured: false, phone: "01001234567", whatsapp: "01001234567" },

    // ── أراضي للبيع ────────────────────────────────────────────────────────
    { providerId: pid(1), title: "أرض للبيع 300 متر - بنها", mainCategory: "land", listingType: "sale", subCategory: "أرض", price: "600000", area: "300", district: "المنطقة الصناعية", address: "بنها", images: IMGS_LAND, status: "active", featured: false, phone: "01112345678", whatsapp: "01112345678" },
    { providerId: pid(2), title: "قطعة أرض 500م للبيع - القناطر", mainCategory: "land", listingType: "sale", subCategory: "أرض", price: "900000", area: "500", district: "القناطر الجديدة", address: "القناطر الخيرية", images: IMGS_LAND, status: "active", featured: true, phone: "01223456789", whatsapp: "01223456789" },
    { providerId: pid(3), title: "أرض 750م للبيع - طوخ", mainCategory: "land", listingType: "sale", subCategory: "أرض", price: "1200000", area: "750", district: "طوخ الصناعية", address: "طوخ", images: IMGS_LAND, status: "active", featured: false, phone: "01334567890", whatsapp: "01334567890" },
    { providerId: pid(4), title: "أرض زراعية 2 فدان - الخانكة", mainCategory: "land", listingType: "sale", subCategory: "أرض", price: "2500000", area: "8400", district: "ريف الخانكة", address: "الخانكة", images: IMGS_LAND, status: "active", featured: false, phone: "01445678901", whatsapp: "01445678901" },
    { providerId: pid(0), title: "أرض سكنية 200م - شبين القناطر", mainCategory: "land", listingType: "sale", subCategory: "أرض", price: "350000", area: "200", district: "شبين القناطر", address: "شبين القناطر", images: IMGS_LAND, status: "active", featured: false, phone: "01001234567", whatsapp: "01001234567" },

    // ── عقارات تجارية ─────────────────────────────────────────────────────
    { providerId: pid(1), title: "محل تجاري للبيع شارع رئيسي - بنها", mainCategory: "commercial", listingType: "sale", subCategory: "محل", price: "1500000", area: "80", district: "السوق التجاري", address: "بنها", images: IMGS_COMM, status: "active", featured: true, phone: "01112345678", whatsapp: "01112345678" },
    { providerId: pid(2), title: "مكتب للبيع 120م - بنها", mainCategory: "commercial", listingType: "sale", subCategory: "مكتب", price: "900000", area: "120", floor: 4, district: "شارع التحرير", address: "بنها", images: IMGS_COMM, status: "active", featured: false, phone: "01223456789", whatsapp: "01223456789" },
    { providerId: pid(3), title: "محل للإيجار - الشارع الرئيسي بنها", mainCategory: "commercial", listingType: "rent", subCategory: "محل", price: "8000", area: "60", district: "وسط البلد", address: "بنها", images: IMGS_COMM, status: "active", featured: false, phone: "01334567890", whatsapp: "01334567890" },
    { providerId: pid(4), title: "مستودع للإيجار - المنطقة الصناعية", mainCategory: "commercial", listingType: "rent", subCategory: "مستودع / مخزن", price: "12000", area: "300", district: "المنطقة الصناعية", address: "بنها", images: IMGS_COMM, status: "active", featured: false, phone: "01445678901", whatsapp: "01445678901" },
    { providerId: pid(0), title: "مكتب للإيجار 90م - القناطر", mainCategory: "commercial", listingType: "rent", subCategory: "مكتب", price: "4500", area: "90", floor: 2, district: "القناطر الجديدة", address: "القناطر الخيرية", images: IMGS_COMM, status: "active", featured: false, phone: "01001234567", whatsapp: "01001234567" },

    // ── دور أرضي ──────────────────────────────────────────────────────────
    { providerId: pid(1), title: "دور أرضي 4 غرف بحديقة - كفر شكر", mainCategory: "residential", listingType: "sale", subCategory: "دور أرضي", price: "950000", area: "180", rooms: 4, bathrooms: 2, floor: 0, finishing: "مشطب", district: "كفر شكر", address: "كفر شكر", images: IMGS_APT, status: "active", featured: false, phone: "01112345678", whatsapp: "01112345678" },
    { providerId: pid(2), title: "دور أرضي 3 غرف للإيجار - بنها", mainCategory: "residential", listingType: "rent", subCategory: "دور أرضي", price: "4000", area: "150", rooms: 3, bathrooms: 2, floor: 0, finishing: "مشطب", furnished: "غير مفروش", district: "حي الزهور", address: "بنها", images: IMGS_APT, status: "active", featured: false, phone: "01223456789", whatsapp: "01223456789" },
  ]);

  console.log("Properties seeded successfully!");
}

async function seedRealEstateCategories() {
  const { eq } = await import("drizzle-orm");
  const existing = await db.select().from(categoriesTable).where(eq(categoriesTable.type, "real_estate"));
  if (existing.length > 0) {
    console.log("Real estate categories already seeded, skipping.");
    return;
  }
  console.log("Seeding real estate categories...");
  const reCategories = [
    { nameAr: "سكني", nameEn: "Residential", icon: "Home", slug: "residential", description: "العقارات السكنية", type: "real_estate" as const },
    { nameAr: "تجاري", nameEn: "Commercial", icon: "Store", slug: "commercial", description: "العقارات التجارية", type: "real_estate" as const },
    { nameAr: "أراضي", nameEn: "Land", icon: "MapPin", slug: "land", description: "الأراضي والقطع", type: "real_estate" as const },
    { nameAr: "صناعي", nameEn: "Industrial", icon: "Factory", slug: "industrial", description: "العقارات الصناعية", type: "real_estate" as const },
  ];
  await db.insert(categoriesTable).values(reCategories);
  console.log("Real estate categories seeded.");
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
