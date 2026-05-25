import { Router } from "express";
import { db } from "@workspace/db";
import { providersTable, usersTable, reviewsTable, categoriesTable, packagesTable, subscriptionsTable, interactionsTable, paymentsTable, notificationsTable, billingPlansTable } from "@workspace/db";
import { citiesTable, regionsTable } from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();

router.use("/admin", adminOnly);

// ---------------------------------------------------------------------------
// GET /api/providers/nearby?lat=&lng=&radius=&category=
// Returns approved providers within the given radius (km, default 5) of the
// supplied coordinates, optionally filtered by category id, sorted ascending
// by Haversine distance. Each result includes `distanceKm`.
// ---------------------------------------------------------------------------
router.get("/providers/nearby", async (req, res) => {
  try {
    const lat = parseFloat(String(req.query.lat ?? ""));
    const lng = parseFloat(String(req.query.lng ?? ""));
    const radiusKm = (() => {
      const r = parseFloat(String(req.query.radius ?? "5"));
      return Number.isFinite(r) && r > 0 && r <= 200 ? r : 5;
    })();
    if (!Number.isFinite(lat) || !Number.isFinite(lng) || lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return res.status(400).json({ success: false, error: "إحداثيات غير صالحة" });
    }
    const conds = [
      eq(providersTable.approved, true),
      eq(providersTable.suspended, false),
      sql`${providersTable.latitude} IS NOT NULL`,
      sql`${providersTable.longitude} IS NOT NULL`,
    ];
    const categoryRaw = String(req.query.category ?? "").trim();
    if (categoryRaw && categoryRaw !== "all") {
      const catId = parseInt(categoryRaw, 10);
      if (Number.isFinite(catId)) conds.push(eq(providersTable.categoryId, catId));
    }
    const rows = await db
      .select({
        id: providersTable.id,
        bio: providersTable.bio,
        avatar: providersTable.avatar,
        banner: providersTable.banner,
        city: providersTable.city,
        district: providersTable.district,
        phone: providersTable.phone,
        whatsapp: providersTable.whatsapp,
        rating: providersTable.rating,
        reviewsCount: providersTable.reviewsCount,
        verified: providersTable.verified,
        featured: providersTable.featured,
        categoryId: providersTable.categoryId,
        userName: usersTable.name,
        categoryNameAr: categoriesTable.nameAr,
        latitude: providersTable.latitude,
        longitude: providersTable.longitude,
      })
      .from(providersTable)
      .innerJoin(usersTable, eq(providersTable.userId, usersTable.id))
      .leftJoin(categoriesTable, eq(providersTable.categoryId, categoriesTable.id))
      .where(and(...conds));

    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const haversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const R = 6371;
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
      return 2 * R * Math.asin(Math.min(1, Math.sqrt(a)));
    };

    const enriched = rows
      .map((r) => {
        const pLat = parseFloat(String(r.latitude));
        const pLng = parseFloat(String(r.longitude));
        if (!Number.isFinite(pLat) || !Number.isFinite(pLng)) return null;
        const dist = haversine(lat, lng, pLat, pLng);
        return { ...r, distanceKm: +dist.toFixed(3) };
      })
      .filter((r): r is NonNullable<typeof r> => r !== null && r.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);

    res.json({ success: true, data: enriched, meta: { radiusKm, count: enriched.length } });
  } catch (err) {
    console.error("nearby providers error", err);
    res.status(500).json({ success: false, error: "تعذر جلب مقدمي الخدمات" });
  }
});

// Public provider listing (approved + not suspended)
router.get("/providers", async (req, res) => {
  try {
    const { search, category, city, featured, regionId } = req.query;
    const conditions = [eq(providersTable.approved, true), eq(providersTable.suspended, false)];
    if (featured === "true") conditions.push(eq(providersTable.featured, true));

    const rows = await db
      .select({
        id: providersTable.id,
        bio: providersTable.bio,
        avatar: providersTable.avatar,
        banner: providersTable.banner,
        city: providersTable.city,
        district: providersTable.district,
        phone: providersTable.phone,
        rating: providersTable.rating,
        reviewsCount: providersTable.reviewsCount,
        verified: providersTable.verified,
        featured: providersTable.featured,
        categoryId: providersTable.categoryId,
        userName: usersTable.name,
        categoryNameAr: categoriesTable.nameAr,
        latitude: providersTable.latitude,
        longitude: providersTable.longitude,
        createdAt: providersTable.createdAt,
      })
      .from(providersTable)
      .innerJoin(usersTable, eq(providersTable.userId, usersTable.id))
      .leftJoin(categoriesTable, eq(providersTable.categoryId, categoriesTable.id))
      .where(and(...conditions))
      .orderBy(providersTable.featured, providersTable.rating);

    let result = rows;
    if (search && typeof search === "string") {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.userName.toLowerCase().includes(q) ||
        (r.bio ?? "").toLowerCase().includes(q) ||
        (r.categoryNameAr ?? "").toLowerCase().includes(q)
      );
    }
    if (regionId && (typeof regionId === "string" || typeof regionId === "number")) {
      const rid = parseInt(String(regionId), 10);
      if (!Number.isNaN(rid)) {
        const cityRows = await db
          .select({ nameAr: citiesTable.nameAr })
          .from(citiesTable)
          .where(eq(citiesTable.regionId, rid));
        const inRegion = new Set(cityRows.map((c) => c.nameAr));
        result = result.filter((r) => r.city && inRegion.has(r.city));
      }
    }
    if (city && typeof city === "string") result = result.filter(r => r.city === city);
    if (category && typeof category === "string") {
      const catId = parseInt(category);
      if (!isNaN(catId)) result = result.filter(r => r.categoryId === catId);
    }

    res.json({ success: true, data: result });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch providers" });
  }
});

// Admin: all providers (no filter)
router.get("/admin/providers", async (req, res) => {
  try {
    const { search, status, regionId } = req.query;
    const rows = await db
      .select({
        id: providersTable.id,
        bio: providersTable.bio,
        avatar: providersTable.avatar,
        city: providersTable.city,
        phone: providersTable.phone,
        rating: providersTable.rating,
        reviewsCount: providersTable.reviewsCount,
        verified: providersTable.verified,
        featured: providersTable.featured,
        approved: providersTable.approved,
        suspended: providersTable.suspended,
        categoryId: providersTable.categoryId,
        userId: providersTable.userId,
        userName: usersTable.name,
        userEmail: usersTable.email,
        categoryNameAr: categoriesTable.nameAr,
        createdAt: providersTable.createdAt,
        regionNameAr: regionsTable.nameAr,
      })
      .from(providersTable)
      .innerJoin(usersTable, eq(providersTable.userId, usersTable.id))
      .leftJoin(categoriesTable, eq(providersTable.categoryId, categoriesTable.id))
      .leftJoin(citiesTable, eq(providersTable.city, citiesTable.nameAr))
      .leftJoin(regionsTable, eq(citiesTable.regionId, regionsTable.id))
      .orderBy(desc(providersTable.createdAt));

    let result = rows;
    if (search && typeof search === "string") {
      const q = search.toLowerCase();
      result = result.filter(r =>
        r.userName.toLowerCase().includes(q) ||
        (r.userEmail ?? "").toLowerCase().includes(q) ||
        (r.categoryNameAr ?? "").toLowerCase().includes(q)
      );
    }
    if (status && typeof status === "string") {
      if (status === "approved") result = result.filter(r => r.approved && !r.suspended);
      else if (status === "pending") result = result.filter(r => !r.approved && !r.suspended);
      else if (status === "suspended") result = result.filter(r => r.suspended);
      else if (status === "rejected") result = result.filter(r => !r.approved && !r.suspended);
    }
    if (regionId && (typeof regionId === "string" || typeof regionId === "number")) {
      const rid = parseInt(String(regionId), 10);
      if (!Number.isNaN(rid)) {
        const cityRows = await db
          .select({ nameAr: citiesTable.nameAr })
          .from(citiesTable)
          .where(eq(citiesTable.regionId, rid));
        const inRegion = new Set(cityRows.map((c) => c.nameAr));
        result = result.filter((r) => r.city && inRegion.has(r.city));
      }
    }

    res.json({ success: true, data: result });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch providers" });
  }
});

router.get("/providers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ success: false, error: "Invalid provider id" });
    }
    const [provider] = await db
      .select({
        id: providersTable.id,
        bio: providersTable.bio,
        avatar: providersTable.avatar,
        banner: providersTable.banner,
        city: providersTable.city,
        district: providersTable.district,
        phone: providersTable.phone,
        whatsapp: providersTable.whatsapp,
        contactMethods: providersTable.contactMethods,
        rating: providersTable.rating,
        reviewsCount: providersTable.reviewsCount,
        verified: providersTable.verified,
        featured: providersTable.featured,
        approved: providersTable.approved,
        suspended: providersTable.suspended,
        categoryId: providersTable.categoryId,
        userId: providersTable.userId,
        userName: usersTable.name,
        userEmail: usersTable.email,
        categoryNameAr: categoriesTable.nameAr,
        latitude: providersTable.latitude,
        longitude: providersTable.longitude,
      })
      .from(providersTable)
      .innerJoin(usersTable, eq(providersTable.userId, usersTable.id))
      .leftJoin(categoriesTable, eq(providersTable.categoryId, categoriesTable.id))
      .where(eq(providersTable.id, id));

    if (!provider) return res.status(404).json({ success: false, error: "Provider not found" });

    const reviews = await db
      .select({ id: reviewsTable.id, rating: reviewsTable.rating, text: reviewsTable.text, reply: reviewsTable.reply, createdAt: reviewsTable.createdAt, userName: usersTable.name })
      .from(reviewsTable)
      .leftJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
      .where(eq(reviewsTable.providerId, id))
      .orderBy(reviewsTable.createdAt);

    // Get active subscription
    const [subscription] = await db
      .select({ id: subscriptionsTable.id, startDate: subscriptionsTable.startDate, endDate: subscriptionsTable.endDate, packageName: packagesTable.nameEn, packagePrice: packagesTable.price })
      .from(subscriptionsTable)
      .leftJoin(packagesTable, eq(subscriptionsTable.packageId, packagesTable.id))
      .where(eq(subscriptionsTable.providerId, id))
      .orderBy(desc(subscriptionsTable.startDate))
      .limit(1);

    res.json({ success: true, data: { ...provider, reviews, subscription: subscription ?? null } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch provider" });
  }
});

router.put("/providers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { bio, avatar, banner, city, district, phone, whatsapp, categoryId, verified, featured, latitude, longitude, contactMethods } = req.body;
    const updateData: Record<string, unknown> = {};
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (banner !== undefined) updateData.banner = banner;
    if (city !== undefined) updateData.city = city;
    if (district !== undefined) updateData.district = district;
    if (phone !== undefined) updateData.phone = phone;
    if (whatsapp !== undefined) updateData.whatsapp = whatsapp;
    if (categoryId !== undefined) updateData.categoryId = categoryId;
    if (verified !== undefined) updateData.verified = verified;
    if (featured !== undefined) updateData.featured = featured;
    if (latitude !== undefined) updateData.latitude = latitude ? String(latitude) : null;
    if (longitude !== undefined) updateData.longitude = longitude ? String(longitude) : null;
    if (contactMethods !== undefined) {
      // Always store as JSON array string for consistency
      updateData.contactMethods = typeof contactMethods === "string"
        ? contactMethods
        : JSON.stringify(Array.isArray(contactMethods) ? contactMethods : []);
    }
    const [updated] = await db.update(providersTable).set(updateData).where(eq(providersTable.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update provider" });
  }
});

// Admin: Create provider (creates user + provider profile)
router.post("/admin/providers", async (req, res) => {
  try {
    const { name, email, phone, password, bio, avatar, banner, city, district, whatsapp, categoryId, latitude, longitude } = req.body;
    if (!name || !email) return res.status(400).json({ success: false, error: "Name and email are required" });

    // Create user account
    const bcrypt = await import("bcryptjs");
    const passwordHash = await bcrypt.default.hash(password ?? "provider123", 10);
    const [user] = await db.insert(usersTable).values({
      name, email, phone: phone ?? null, passwordHash, role: "provider", status: "active",
    }).returning();

    // Create provider profile
    const [provider] = await db.insert(providersTable).values({
      userId: user.id,
      bio: bio ?? null,
      avatar: avatar ?? null,
      banner: banner ?? null,
      city: city ?? null,
      district: district ?? null,
      phone: phone ?? null,
      whatsapp: whatsapp ?? null,
      categoryId: categoryId ? parseInt(categoryId) : null,
      latitude: latitude ? String(latitude) : null,
      longitude: longitude ? String(longitude) : null,
      approved: true,
      verified: false,
      featured: false,
      suspended: false,
    }).returning();

    res.status(201).json({ success: true, data: { ...provider, userName: user.name, userEmail: user.email } });
  } catch (e: any) {
    if (e.code === "23505") return res.status(409).json({ success: false, error: "Email already exists" });
    res.status(500).json({ success: false, error: "Failed to create provider" });
  }
});

// Provider stats — reviews, subscription (provider-scoped)
router.get("/providers/:id/stats", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [reviewsResult, subscriptionResult, propertiesResult] = await Promise.all([
      db.select().from(reviewsTable).where(eq(reviewsTable.providerId, id)),
      db
        .select({
          id: subscriptionsTable.id,
          startDate: subscriptionsTable.startDate,
          endDate: subscriptionsTable.endDate,
          packageId: subscriptionsTable.packageId,
          billingPlanId: subscriptionsTable.billingPlanId,
          packageNameAr: packagesTable.nameAr,
          packagePrice: packagesTable.price,
          durationDays: packagesTable.durationDays,
          planNameAr: subscriptionsTable.planNameAr,
          planPrice: subscriptionsTable.planPrice,
          bpDurationDays: billingPlansTable.durationDays,
          bpCommissionPercent: billingPlansTable.commissionPercent,
          bpLimits: billingPlansTable.limits,
          bpFeatures: billingPlansTable.features,
          bpColor: billingPlansTable.color,
        })
        .from(subscriptionsTable)
        .leftJoin(packagesTable, eq(subscriptionsTable.packageId, packagesTable.id))
        .leftJoin(billingPlansTable, eq(subscriptionsTable.billingPlanId, billingPlansTable.id))
        .where(eq(subscriptionsTable.providerId, id))
        .orderBy(desc(subscriptionsTable.startDate))
        .limit(1),
      db.select({
        id: propertiesTable.id,
        status: propertiesTable.status,
        featured: propertiesTable.featured,
        viewCount: propertiesTable.viewCount,
        phoneClickCount: propertiesTable.phoneClickCount,
        whatsappClickCount: propertiesTable.whatsappClickCount,
      }).from(propertiesTable).where(eq(propertiesTable.providerId, id)),
    ]);

    // Property aggregates
    const totalProperties = propertiesResult.length;
    const activeProperties = propertiesResult.filter(p => p.status === "active").length;
    const featuredProperties = propertiesResult.filter(p => p.featured).length;
    const totalViews = propertiesResult.reduce((s, p) => s + (p.viewCount ?? 0), 0);
    const totalPhoneClicks = propertiesResult.reduce((s, p) => s + (p.phoneClickCount ?? 0), 0);
    const totalWhatsappClicks = propertiesResult.reduce((s, p) => s + (p.whatsappClickCount ?? 0), 0);

    const avgRating = reviewsResult.length
      ? (reviewsResult.reduce((sum, r) => sum + r.rating, 0) / reviewsResult.length).toFixed(1)
      : "0.0";

    const subscription = subscriptionResult[0] ?? null;
    let daysLeft: number | null = null;
    let isActive = false;
    if (subscription?.endDate) {
      const diff = new Date(subscription.endDate).getTime() - Date.now();
      daysLeft = Math.max(0, Math.ceil(diff / 86400000));
      isActive = daysLeft > 0;
    }

    const resolvedNameAr = subscription?.billingPlanId
      ? (subscription.planNameAr ?? subscription.planNameAr)
      : (subscription?.packageNameAr ?? subscription?.planNameAr ?? null);
    const resolvedPrice = subscription?.billingPlanId
      ? subscription.planPrice
      : (subscription?.packagePrice ?? subscription?.planPrice ?? null);
    const resolvedDurationDays = subscription?.billingPlanId
      ? (subscription.bpDurationDays ?? 30)
      : (subscription?.durationDays ?? 30);

    res.json({
      success: true,
      data: {
        reviewsCount: reviewsResult.length,
        avgRating,
        totalProperties,
        activeProperties,
        featuredProperties,
        totalViews,
        totalPhoneClicks,
        totalWhatsappClicks,
        subscription: subscription
          ? {
              ...subscription,
              daysLeft,
              isActive,
              packageNameAr: resolvedNameAr,
              packagePrice: resolvedPrice,
              durationDays: resolvedDurationDays,
            }
          : null,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch provider stats" });
  }
});

// Track interaction (phone / whatsapp / message)
router.post("/providers/:id/interactions", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { type } = req.body;
    if (!["phone", "whatsapp", "message"].includes(type)) {
      return res.status(400).json({ success: false, error: "Invalid type" });
    }
    await db.insert(interactionsTable).values({ providerId: id, type });
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: "Failed to record interaction" });
  }
});

// Get interaction counts for a provider (only the provider themselves)
router.get("/providers/:id/interactions", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const rows = await db
      .select({
        type: interactionsTable.type,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(interactionsTable)
      .where(eq(interactionsTable.providerId, id))
      .groupBy(interactionsTable.type);

    const counts = { phone: 0, whatsapp: 0, message: 0 };
    for (const r of rows) {
      if (r.type in counts) counts[r.type as keyof typeof counts] = r.count;
    }
    res.json({ success: true, data: counts });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch interactions" });
  }
});

// Provider self-subscribe — supports both old packageId and new billingPlanId
router.post("/providers/:id/subscribe", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ success: false, error: "معرّف مقدم الخدمة غير صالح" });
    }

    const { packageId, billingPlanId } = req.body;

    // ── Billing Plan path (new system) ──────────────────────────────────────
    if (billingPlanId) {
      const bpId = parseInt(String(billingPlanId), 10);
      if (!Number.isFinite(bpId)) return res.status(400).json({ success: false, error: "معرّف الباقة غير صالح" });

      const [bp] = await db.select().from(billingPlansTable).where(eq(billingPlansTable.id, bpId));
      if (!bp) return res.status(404).json({ success: false, error: "الباقة غير موجودة" });

      const requestedPrice = parseFloat(String(bp.price ?? "0"));

      if (requestedPrice === 0) {
        const existingSubs = await db
          .select({ id: subscriptionsTable.id })
          .from(subscriptionsTable)
          .where(eq(subscriptionsTable.providerId, id))
          .limit(1);
        if (existingSubs.length > 0) {
          return res.status(409).json({ success: false, error: "لا يمكن تفعيل الباقة المجانية أكثر من مرة" });
        }
      }

      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + (bp.durationDays ?? 30) * 24 * 60 * 60 * 1000);

      const [sub] = await db
        .insert(subscriptionsTable)
        .values({
          providerId: id,
          billingPlanId: bp.id,
          planName: bp.name,
          planNameAr: bp.nameAr ?? bp.name,
          planPrice: String(bp.price ?? "0"),
          startDate,
          endDate,
          status: "active",
        })
        .returning();

      await db.update(providersTable).set({ verified: requestedPrice > 0 }).where(eq(providersTable.id, id));

      const [providerRow] = await db
        .select({ name: usersTable.name, userId: providersTable.userId })
        .from(providersTable).leftJoin(usersTable, eq(providersTable.userId, usersTable.id))
        .where(eq(providersTable.id, id));
      const ownerUserId = providerRow?.userId ?? null;
      const providerName = providerRow?.name ?? "شركة عقارية";

      // ── Record payment so it appears in مدفوعاتي ──────────────────────────
      let bpPayment = null;
      if (requestedPrice > 0) {
        const invoiceId = `BP-${Date.now()}-${sub.id}`;
        const [p] = await db
          .insert(paymentsTable)
          .values({
            providerId: id,
            type: "subscription",
            amount: String(requestedPrice.toFixed(2)),
            status: "paid",
            invoiceId,
          })
          .returning();
        bpPayment = p;

        // Admin notification
        await db.insert(notificationsTable).values({
          userId: null,
          type: "payment",
          title: "دفعة جديدة",
          message: `تم استلام دفعة بقيمة ${requestedPrice.toFixed(2)} ج.م من ${providerName} لباقة ${bp.nameAr ?? bp.name}`,
          link: "/admin/payments",
        }).catch(() => {});

        // Provider notification: payment confirmation
        if (ownerUserId) {
          await db.insert(notificationsTable).values({
            userId: ownerUserId,
            type: "success",
            title: "تم استلام دفعتك",
            message: `تم استلام دفعتك بقيمة ${requestedPrice.toFixed(2)} ج.م لباقة ${bp.nameAr ?? bp.name}`,
            link: "/dashboard/payments",
          }).catch(() => {});
        }
      }

      if (ownerUserId) {
        await db.insert(notificationsTable).values({
          userId: ownerUserId,
          title: "تم تفعيل الاشتراك",
          message: `تم تفعيل باقة ${bp.nameAr ?? bp.name} بنجاح لمدة ${bp.durationDays} يوم.`,
          type: "subscription",
        }).catch(() => {});
        await db.insert(notificationsTable).values({
          userId: null,
          title: "اشتراك جديد",
          message: `المزود "${providerName}" اشترك في باقة ${bp.nameAr ?? bp.name}.`,
          type: "subscription",
        }).catch(() => {});
      }

      return res.json({ success: true, data: { subscription: sub, payment: bpPayment } });
    }

    // ── Old Packages path (legacy) ───────────────────────────────────────────
    if (!packageId) return res.status(400).json({ success: false, error: "يجب اختيار باقة الاشتراك" });

    const pkgId = parseInt(String(packageId), 10);
    if (!Number.isFinite(pkgId)) return res.status(400).json({ success: false, error: "معرّف الباقة غير صالح" });

    const [pkg] = await db.select().from(packagesTable).where(eq(packagesTable.id, pkgId));
    if (!pkg) return res.status(404).json({ success: false, error: "الباقة غير موجودة" });
    const requestedPrice = parseFloat(String(pkg.price));

    if (requestedPrice === 0) {
      const existingSubs = await db
        .select({ id: subscriptionsTable.id })
        .from(subscriptionsTable)
        .where(eq(subscriptionsTable.providerId, id))
        .limit(1);
      if (existingSubs.length > 0) {
        return res.status(409).json({ success: false, error: "لا يمكن تفعيل الباقة المجانية أكثر من مرة" });
      }
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (pkg.durationDays ?? 30) * 24 * 60 * 60 * 1000);

    const [sub] = await db
      .insert(subscriptionsTable)
      .values({ providerId: id, packageId: pkg.id, planName: pkg.nameEn, planNameAr: pkg.nameAr, planPrice: String(pkg.price), startDate, endDate, status: "active" })
      .returning();

    await db
      .update(providersTable)
      .set({ verified: requestedPrice > 0 })
      .where(eq(providersTable.id, id));

    // Resolve owner user (for provider-side notifications)
    const [providerRow] = await db
      .select({ name: usersTable.name, userId: providersTable.userId })
      .from(providersTable)
      .leftJoin(usersTable, eq(providersTable.userId, usersTable.id))
      .where(eq(providersTable.id, id));
    const ownerUserId = providerRow?.userId ?? null;
    const providerName = providerRow?.name ?? "شركة عقارية";

    // Record a payment row for every paid subscription so it appears instantly
    // in the admin Payments and Subscriptions pages.
    let payment = null;
    if (requestedPrice > 0) {
      const invoicePrefix = req.body?.simulated ? "SIM" : "TRX";
      const invoiceId = `${invoicePrefix}-${Date.now()}-${sub.id}`;
      const [p] = await db
        .insert(paymentsTable)
        .values({
          providerId: id,
          type: "subscription",
          amount: String(requestedPrice.toFixed(2)),
          status: "paid",
          invoiceId,
        })
        .returning();
      payment = p;

      // Notify admins (userId = null = global/admin notification)
      try {
        await db.insert(notificationsTable).values({
          userId: null,
          type: "payment",
          title: "دفعة جديدة",
          message: `تم استلام دفعة بقيمة ${requestedPrice.toFixed(2)} ج.م من ${providerName} لباقة ${pkg.nameAr}`,
          link: "/admin/payments",
        });
      } catch (notifyErr) {
        console.error("payment notification failed", notifyErr);
      }

      // Notify the provider themselves: payment confirmation
      if (ownerUserId) {
        try {
          await db.insert(notificationsTable).values({
            userId: ownerUserId,
            type: "success",
            title: "تم استلام دفعتك",
            message: `تم استلام دفعتك بقيمة ${requestedPrice.toFixed(2)} ج.م لباقة ${pkg.nameAr}`,
            link: "/dashboard/payments",
          });
        } catch (e) {
          console.error("provider payment notif failed", e);
        }
      }
    }

    // Notify the provider: subscription activation (free or paid)
    if (ownerUserId) {
      try {
        await db.insert(notificationsTable).values({
          userId: ownerUserId,
          type: "success",
          title: "تم تفعيل اشتراكك",
          message: `تم تفعيل اشتراك باقة ${pkg.nameAr} لمدة ${pkg.durationDays ?? 30} يوم`,
          link: "/provider/subscription",
        });
      } catch (e) {
        console.error("provider activation notif failed", e);
      }
    }

    res.json({ success: true, data: { subscription: sub, payment } });
  } catch {
    res.status(500).json({ success: false, error: "تعذر إنشاء الاشتراك" });
  }
});

router.patch("/providers/:id/approve", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db
      .update(providersTable)
      .set({ approved: true, suspended: false, active: true })
      .where(eq(providersTable.id, id))
      .returning();

    if (updated) {
      // Notify the provider that their account is now approved/visible.
      try {
        await db.insert(notificationsTable).values({
          userId: updated.userId,
          type: "success",
          title: "تم اعتماد حسابك",
          message: "تم اعتماد ملفك وأصبحت إعلاناتك العقارية ظاهرة للعملاء الآن",
          link: "/dashboard",
        });
      } catch (notifyErr) {
        console.error("approve notify failed", notifyErr);
      }
    }

    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to approve provider" });
  }
});

router.patch("/providers/:id/reject", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db.update(providersTable).set({ approved: false, suspended: false }).where(eq(providersTable.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to reject provider" });
  }
});

router.patch("/providers/:id/suspend", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db.update(providersTable).set({ suspended: true }).where(eq(providersTable.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to suspend provider" });
  }
});

export default router;
