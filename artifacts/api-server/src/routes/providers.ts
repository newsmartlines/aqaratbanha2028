import { Router } from "express";
import { db } from "@workspace/db";
import { providersTable, usersTable, reviewsTable, categoriesTable, packagesTable, subscriptionsTable, interactionsTable, paymentsTable, notificationsTable, billingPlansTable, propertiesTable } from "@workspace/db";
import { citiesTable, regionsTable } from "@workspace/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import { adminOnly } from "../middleware/adminOnly";
import { getSession } from "./auth";
import { mailer } from "../lib/mailer";
import { events } from "../lib/event-service";

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
        logo: providersTable.logo,
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
        logo: providersTable.logo,
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
        publishedPropertiesCount: sql<number>`cast(coalesce((
          select count(*) from properties
          where properties.provider_id = ${providersTable.id}
            and properties.status = 'approved'
        ), 0) as int)`,
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
    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ success: false, error: "Invalid provider id" });
    }
    const [provider] = await db
      .select({
        id: providersTable.id,
        bio: providersTable.bio,
        avatar: providersTable.avatar,
        banner: providersTable.banner,
        logo: providersTable.logo,
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

    // Get active subscription only (status=active AND endDate in the future)
    const [subscription] = await db
      .select({ id: subscriptionsTable.id, startDate: subscriptionsTable.startDate, endDate: subscriptionsTable.endDate, packageName: packagesTable.nameEn, packagePrice: packagesTable.price })
      .from(subscriptionsTable)
      .leftJoin(packagesTable, eq(subscriptionsTable.packageId, packagesTable.id))
      .where(and(eq(subscriptionsTable.providerId, id), eq(subscriptionsTable.status, "active"), sql`${subscriptionsTable.endDate} > NOW()`))
      .orderBy(desc(subscriptionsTable.startDate))
      .limit(1);

    res.json({ success: true, data: { ...provider, reviews, subscription: subscription ?? null } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch provider" });
  }
});

router.put("/providers/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id), 10);
    if (Number.isNaN(id) || id <= 0) {
      return res.status(400).json({ success: false, error: "Invalid provider id" });
    }

    // Must be authenticated — either the provider owns this profile or is admin
    const token =
      (req.cookies as Record<string, string> | undefined)?.session ??
      (req.headers.authorization as string | undefined)?.replace(/^Bearer\s+/i, "");
    if (!token) return res.status(401).json({ success: false, error: "Unauthorized" });
    const session = await getSession(token);
    if (!session) return res.status(401).json({ success: false, error: "Session expired" });

    // Check ownership: look up the provider and verify the session user owns it (or is admin)
    const [existingProvider] = await db
      .select({ id: providersTable.id, userId: providersTable.userId })
      .from(providersTable)
      .where(eq(providersTable.id, id))
      .limit(1);
    if (!existingProvider) return res.status(404).json({ success: false, error: "Provider not found" });

    const [sessionUser] = await db
      .select({ id: usersTable.id, role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, session.userId))
      .limit(1);
    if (!sessionUser) return res.status(401).json({ success: false, error: "User not found" });

    const isOwner = existingProvider.userId === session.userId;
    const isAdmin = sessionUser.role === "admin";
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const { bio, avatar, banner, logo, city, district, phone, whatsapp, categoryId, verified, featured, latitude, longitude, contactMethods } = req.body;

    // Non-admin providers cannot set verified/featured flags
    if (!isAdmin) {
      delete req.body.verified;
      delete req.body.featured;
    }
    const updateData: Record<string, unknown> = {};
    if (bio !== undefined) updateData.bio = bio;
    if (avatar !== undefined) updateData.avatar = avatar;
    if (banner !== undefined) updateData.banner = banner;
    if (logo !== undefined) updateData.logo = logo;
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
    const id = parseInt(String(req.params.id));
    const [reviewsResult, subscriptionResult, propertiesResult] = await Promise.all([
      db.select().from(reviewsTable).where(eq(reviewsTable.providerId, id)),
      db
        .select({
          id: subscriptionsTable.id,
          startDate: subscriptionsTable.startDate,
          endDate: subscriptionsTable.endDate,
          status: subscriptionsTable.status,
          packageId: subscriptionsTable.packageId,
          billingPlanId: subscriptionsTable.billingPlanId,
          packageNameAr: packagesTable.nameAr,
          packagePrice: packagesTable.price,
          durationDays: packagesTable.durationDays,
          planNameAr: subscriptionsTable.planNameAr,
          planPrice: subscriptionsTable.planPrice,
          bpNameAr: billingPlansTable.nameAr,
          bpDurationDays: billingPlansTable.durationDays,
          bpLimits: billingPlansTable.limits,
          bpFeatures: billingPlansTable.features,
          bpColor: billingPlansTable.color,
        })
        .from(subscriptionsTable)
        .leftJoin(packagesTable, eq(subscriptionsTable.packageId, packagesTable.id))
        .leftJoin(billingPlansTable, eq(subscriptionsTable.billingPlanId, billingPlansTable.id))
        .where(and(eq(subscriptionsTable.providerId, id), eq(subscriptionsTable.status, "active")))
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

    // Auto-expire: if status is active but endDate has passed, mark as expired in DB
    if (subscription && subscription.status === "active" && !isActive) {
      db.update(subscriptionsTable)
        .set({ status: "expired" })
        .where(and(eq(subscriptionsTable.id, subscription.id), eq(subscriptionsTable.status, "active")))
        .catch(() => {});
    }

    // Resolve name — bpNameAr comes from the billing plan join, planNameAr is the cached snapshot
    const resolvedNameAr = subscription?.billingPlanId
      ? (subscription.bpNameAr ?? subscription.planNameAr)
      : (subscription?.packageNameAr ?? subscription?.planNameAr ?? null);
    const resolvedPrice = subscription?.billingPlanId
      ? subscription.planPrice
      : (subscription?.packagePrice ?? subscription?.planPrice ?? null);
    const resolvedDurationDays = subscription?.billingPlanId
      ? (subscription.bpDurationDays ?? 30)
      : (subscription?.durationDays ?? 30);

    // Derive maxListings from billing plan limits JSON or legacy package
    let maxListings: number | null = null;
    if (subscription?.bpLimits) {
      try { maxListings = JSON.parse(subscription.bpLimits).properties ?? null; } catch { /* */ }
    }
    if (maxListings == null && (subscription as any)?.maxListings != null) {
      maxListings = (subscription as any).maxListings;
    }

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
        subscription: subscription && isActive
          ? {
              ...subscription,
              daysLeft,
              isActive,
              packageNameAr: resolvedNameAr,
              packagePrice: resolvedPrice,
              durationDays: resolvedDurationDays,
              maxListings,
            }
          : null,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch provider stats" });
  }
});

// Subscription history for a provider
router.get("/providers/:id/subscriptions-history", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const rows = await db
      .select({
        id: subscriptionsTable.id,
        planNameAr: subscriptionsTable.planNameAr,
        planName: subscriptionsTable.planName,
        planPrice: subscriptionsTable.planPrice,
        startDate: subscriptionsTable.startDate,
        endDate: subscriptionsTable.endDate,
        status: subscriptionsTable.status,
        createdAt: subscriptionsTable.createdAt,
        packageId: subscriptionsTable.packageId,
        billingPlanId: subscriptionsTable.billingPlanId,
        packageNameAr: packagesTable.nameAr,
        packagePrice: packagesTable.price,
        packageDurationDays: packagesTable.durationDays,
        packageMaxListings: packagesTable.maxListings,
        bpNameAr: billingPlansTable.nameAr,
        bpPrice: billingPlansTable.price,
        bpLimits: billingPlansTable.limits,
        bpDurationDays: billingPlansTable.durationDays,
      })
      .from(subscriptionsTable)
      .leftJoin(packagesTable, eq(subscriptionsTable.packageId, packagesTable.id))
      .leftJoin(billingPlansTable, eq(subscriptionsTable.billingPlanId, billingPlansTable.id))
      .where(eq(subscriptionsTable.providerId, id))
      .orderBy(desc(subscriptionsTable.createdAt));

    const now = Date.now();
    // Collect IDs of past-due active subscriptions so we can expire them in DB
    const pastDueIds: number[] = [];
    const data = rows.map(s => {
      const resolvedNameAr = s.billingPlanId ? (s.bpNameAr ?? s.planNameAr) : (s.packageNameAr ?? s.planNameAr);
      const resolvedPrice = s.billingPlanId ? s.bpPrice : (s.packagePrice ?? s.planPrice);
      const resolvedDurationDays = s.billingPlanId ? (s.bpDurationDays ?? 30) : (s.packageDurationDays ?? 30);
      let resolvedMaxListings: number | null = null;
      if (s.bpLimits) {
        try { resolvedMaxListings = JSON.parse(s.bpLimits).properties ?? null; } catch { /* */ }
      }
      if (resolvedMaxListings == null) resolvedMaxListings = s.packageMaxListings ?? null;
      const endTime = new Date(s.endDate).getTime();
      const isActive = s.status === "active" && endTime > now;
      // Track stale active records for background expiry
      if (s.status === "active" && endTime <= now) pastDueIds.push(s.id);
      return {
        id: s.id,
        planNameAr: resolvedNameAr,
        planPrice: resolvedPrice,
        durationDays: resolvedDurationDays,
        maxListings: resolvedMaxListings,
        startDate: s.startDate,
        endDate: s.endDate,
        status: isActive ? "active" : (s.status === "active" ? "expired" : s.status),
        createdAt: s.createdAt,
        isActive,
      };
    });
    // Expire stale records in background (no await — non-blocking)
    if (pastDueIds.length > 0) {
      const { inArray: inArr } = await import("drizzle-orm");
      db.update(subscriptionsTable)
        .set({ status: "expired" })
        .where(inArr(subscriptionsTable.id, pastDueIds))
        .catch(() => {});
    }
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch subscription history" });
  }
});

// Track interaction (phone / whatsapp / message)
router.post("/providers/:id/interactions", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
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

// Get interaction counts — only the provider owner or an admin may view
router.get("/providers/:id/interactions", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));

    const session = (req as any).session as { userId?: number } | undefined;
    if (!session?.userId) {
      return res.status(401).json({ success: false, error: "يجب تسجيل الدخول أولاً" });
    }

    // Check caller is admin or owns this provider profile
    const [caller] = await db
      .select({ role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, session.userId))
      .limit(1);
    const isAdmin = caller?.role === "admin" || caller?.role === "moderator";

    if (!isAdmin) {
      const [provRow] = await db
        .select({ userId: providersTable.userId })
        .from(providersTable)
        .where(eq(providersTable.id, id))
        .limit(1);
      if (!provRow || provRow.userId !== session.userId) {
        return res.status(403).json({ success: false, error: "غير مصرح" });
      }
    }

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
    // Block new subscriptions when feature is globally disabled
    const { subscriptionsEnabled } = await import("../lib/settingsCache");
    if (!(await subscriptionsEnabled())) {
      return res.status(403).json({
        success: false,
        error: "الاشتراكات والباقات معطّلة حالياً من قِبل الإدارة",
      });
    }

    const id = parseInt(String(req.params.id), 10);
    if (!Number.isFinite(id) || id < 1) {
      return res.status(400).json({ success: false, error: "معرّف الشركة العقارية غير صالح" });
    }

    // ── Ownership check: only the provider's own user (or admin) may subscribe ──
    const subToken =
      (req.cookies as Record<string, string> | undefined)?.session ??
      (req.headers.authorization as string | undefined)?.replace(/^Bearer\s+/i, "");
    if (!subToken) return res.status(401).json({ success: false, error: "يجب تسجيل الدخول أولاً" });
    const subSession = await getSession(subToken);
    if (!subSession) return res.status(401).json({ success: false, error: "انتهت الجلسة" });

    const [sessionUser] = await db
      .select({ role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, subSession.userId))
      .limit(1);
    const isAdminUser = sessionUser?.role === "admin";

    if (!isAdminUser) {
      // Verify this session user owns the provider profile with the given id
      const [providerCheck] = await db
        .select({ userId: providersTable.userId, approved: providersTable.approved })
        .from(providersTable)
        .where(eq(providersTable.id, id))
        .limit(1);
      if (!providerCheck) return res.status(404).json({ success: false, error: "الشركة العقارية غير موجودة" });
      if (providerCheck.userId !== subSession.userId) {
        return res.status(403).json({ success: false, error: "غير مصرح لك بالاشتراك نيابةً عن هذه الشركة" });
      }

      // ── Approval check: unapproved providers cannot purchase subscriptions ──
      if (providerCheck.approved === false) {
        return res.status(403).json({
          success: false,
          error: "حسابك قيد المراجعة — سيتم تفعيله بعد موافقة فريق الإدارة. قد يستغرق ذلك حتى 24 ساعة.",
          code: "ACCOUNT_PENDING",
        });
      }
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
        // A free plan can only be claimed if no non-cancelled subscription has ever existed for this provider
        const existingSubs = await db
          .select({ id: subscriptionsTable.id, status: subscriptionsTable.status })
          .from(subscriptionsTable)
          .where(
            and(
              eq(subscriptionsTable.providerId, id),
              sql`${subscriptionsTable.status} != 'cancelled'`
            )
          )
          .limit(1);
        if (existingSubs.length > 0) {
          return res.status(409).json({ success: false, error: "لا يمكن تفعيل الباقة المجانية أكثر من مرة" });
        }
      }

      // Fetch provider owner details (needed for both paid and free flows)
      const [providerRow] = await db
        .select({ name: usersTable.name, userId: providersTable.userId })
        .from(providersTable).leftJoin(usersTable, eq(providersTable.userId, usersTable.id))
        .where(eq(providersTable.id, id));
      const ownerUserId = providerRow?.userId ?? null;
      const providerName = providerRow?.name ?? "شركة عقارية";

      const startDate = new Date();
      const endDate = new Date(startDate.getTime() + (bp.durationDays ?? 30) * 24 * 60 * 60 * 1000);

      // ── Paid plans: create pending sub + pending payment, await admin approval ──
      if (requestedPrice > 0) {
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
            status: "pending",
          })
          .returning();

        // Use SUB-REQ-{id} format so the admin approve-subscription endpoint can activate it
        const invoiceId = `SUB-REQ-${sub.id}`;
        const [bpPaymentRow] = await db
          .insert(paymentsTable)
          .values({
            providerId: id,
            type: "subscription",
            amount: String(requestedPrice.toFixed(2)),
            status: "pending",
            invoiceId,
            planName: bp.nameAr ?? bp.name,
          })
          .returning();

        // Admin notification: new payment request requiring approval
        await db.insert(notificationsTable).values({
          userId: null,
          type: "payment",
          title: "طلب اشتراك جديد يحتاج موافقة",
          message: `${providerName} طلب الاشتراك في باقة ${bp.nameAr ?? bp.name} بقيمة ${requestedPrice.toFixed(2)} ج.م`,
          link: "/admin/payments",
        }).catch(() => {});

        // Provider notification: request submitted, awaiting approval
        if (ownerUserId) {
          await db.insert(notificationsTable).values({
            userId: ownerUserId,
            type: "info",
            title: "طلب اشتراكك قيد المراجعة",
            message: `تم استلام طلب اشتراكك في باقة ${bp.nameAr ?? bp.name} بقيمة ${requestedPrice.toFixed(2)} ج.م وهو في انتظار موافقة الإدارة`,
            link: "/dashboard/payments",
          }).catch(() => {});
        }

        return res.status(202).json({
          success: true,
          pending: true,
          data: { subscription: sub, payment: bpPaymentRow },
          message: "تم إرسال طلب الاشتراك وهو في انتظار موافقة الإدارة",
        });
      }

      // ── Free plan: activate immediately ─────────────────────────────────────
      const [sub] = await db
        .insert(subscriptionsTable)
        .values({
          providerId: id,
          billingPlanId: bp.id,
          planName: bp.name,
          planNameAr: bp.nameAr ?? bp.name,
          planPrice: "0.00",
          startDate,
          endDate,
          status: "active",
        })
        .returning();

      const invoiceId = `FREE-BP-${Date.now()}-${sub.id}`;
      const [bpPaymentRow] = await db
        .insert(paymentsTable)
        .values({
          providerId: id,
          type: "subscription",
          amount: "0.00",
          status: "paid",
          invoiceId,
          planName: bp.nameAr ?? bp.name,
        })
        .returning();

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
        const expiryDateStr = new Date(sub.endDate).toLocaleDateString("ar-EG");
        events.onPackagePurchased(ownerUserId, bp.nameAr ?? bp.name, expiryDateStr).catch(() => {});
      }

      return res.json({ success: true, data: { subscription: sub, payment: bpPaymentRow } });
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

    // Resolve owner user (for notifications in both paid and free flows)
    const [providerRow] = await db
      .select({ name: usersTable.name, userId: providersTable.userId })
      .from(providersTable)
      .leftJoin(usersTable, eq(providersTable.userId, usersTable.id))
      .where(eq(providersTable.id, id));
    const ownerUserId = providerRow?.userId ?? null;
    const providerName = providerRow?.name ?? "شركة عقارية";

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (pkg.durationDays ?? 30) * 24 * 60 * 60 * 1000);

    // ── Paid plans: create pending sub + pending payment, await admin approval ──
    if (requestedPrice > 0) {
      const [sub] = await db
        .insert(subscriptionsTable)
        .values({ providerId: id, packageId: pkg.id, planName: pkg.nameEn, planNameAr: pkg.nameAr, planPrice: String(pkg.price), startDate, endDate, status: "pending" })
        .returning();

      // Use SUB-REQ-{id} format so the admin approve-subscription endpoint can activate it
      const invoiceId = `SUB-REQ-${sub.id}`;
      const [p] = await db
        .insert(paymentsTable)
        .values({
          providerId: id,
          type: "subscription",
          amount: String(requestedPrice.toFixed(2)),
          status: "pending",
          invoiceId,
          planName: pkg.nameAr,
        })
        .returning();

      // Admin notification: new payment request requiring approval
      await db.insert(notificationsTable).values({
        userId: null,
        type: "payment",
        title: "طلب اشتراك جديد يحتاج موافقة",
        message: `${providerName} طلب الاشتراك في باقة ${pkg.nameAr} بقيمة ${requestedPrice.toFixed(2)} ج.م`,
        link: "/admin/payments",
      }).catch(() => {});

      // Provider notification: request submitted, awaiting approval
      if (ownerUserId) {
        await db.insert(notificationsTable).values({
          userId: ownerUserId,
          type: "info",
          title: "طلب اشتراكك قيد المراجعة",
          message: `تم استلام طلب اشتراكك في باقة ${pkg.nameAr} بقيمة ${requestedPrice.toFixed(2)} ج.م وهو في انتظار موافقة الإدارة`,
          link: "/dashboard/payments",
        }).catch(() => {});
      }

      return res.status(202).json({
        success: true,
        pending: true,
        data: { subscription: sub, payment: p },
        message: "تم إرسال طلب الاشتراك وهو في انتظار موافقة الإدارة",
      });
    }

    // ── Free plan: activate immediately ─────────────────────────────────────
    const [sub] = await db
      .insert(subscriptionsTable)
      .values({ providerId: id, packageId: pkg.id, planName: pkg.nameEn, planNameAr: pkg.nameAr, planPrice: "0.00", startDate, endDate, status: "active" })
      .returning();

    const legacyInvoiceId = `FREE-${Date.now()}-${sub.id}`;
    const [p] = await db
      .insert(paymentsTable)
      .values({
        providerId: id,
        type: "subscription",
        amount: "0.00",
        status: "paid",
        invoiceId: legacyInvoiceId,
        planName: pkg.nameAr,
      })
      .returning();

    if (ownerUserId) {
      await db.insert(notificationsTable).values({
        userId: ownerUserId,
        type: "success",
        title: "تم تفعيل اشتراكك",
        message: `تم تفعيل اشتراك باقة ${pkg.nameAr} لمدة ${pkg.durationDays ?? 30} يوم`,
        link: "/provider/subscription",
      }).catch(() => {});
      const expiryDateStr = new Date(sub.endDate).toLocaleDateString("ar-EG");
      events.onPackagePurchased(ownerUserId, pkg.nameAr, expiryDateStr).catch(() => {});
    }

    res.json({ success: true, data: { subscription: sub, payment: p } });
  } catch {
    res.status(500).json({ success: false, error: "تعذر إنشاء الاشتراك" });
  }
});

router.patch("/providers/:id/approve", adminOnly, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const [updated] = await db
      .update(providersTable)
      .set({ approved: true, suspended: false, active: true })
      .where(eq(providersTable.id, id))
      .returning();

    if (updated) {
      // In-app notification
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
      // Email notification
      const [owner] = await db.select({ name: usersTable.name, email: usersTable.email })
        .from(usersTable).where(eq(usersTable.id, updated.userId));
      if (owner) {
        mailer.providerApproved(owner.email, owner.name).catch(() => {});
      }
    }

    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to approve provider" });
  }
});

router.patch("/providers/:id/reject", adminOnly, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const rejectionReason = typeof req.body?.reason === "string" && req.body.reason.trim()
      ? req.body.reason.trim()
      : "لم يتطابق الطلب مع شروط التسجيل";
    const [updated] = await db.update(providersTable).set({ approved: false, suspended: false }).where(eq(providersTable.id, id)).returning();
    if (updated) {
      // In-app notification
      db.insert(notificationsTable).values({
        userId: updated.userId,
        type: "warning",
        title: "بخصوص طلب تسجيل شركتك",
        message: `لم نتمكن من قبول الطلب حالياً. السبب: ${rejectionReason}`,
        link: "/dashboard",
      }).catch(() => {});
      // Email notification
      const [owner] = await db.select({ name: usersTable.name, email: usersTable.email })
        .from(usersTable).where(eq(usersTable.id, updated.userId));
      if (owner) {
        mailer.providerRejected(owner.email, owner.name, rejectionReason).catch(() => {});
      }
    }
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to reject provider" });
  }
});

router.patch("/providers/:id/suspend", adminOnly, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const [updated] = await db.update(providersTable).set({ suspended: true }).where(eq(providersTable.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to suspend provider" });
  }
});

// ── DELETE /providers/:id — full provider + user deletion (admin only) ────────
router.delete("/providers/:id", adminOnly, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    if (!Number.isFinite(id)) {
      return res.status(400).json({ success: false, error: "Invalid provider id" });
    }

    // Fetch the provider to get the linked userId before deletion
    const [provider] = await db
      .select({ id: providersTable.id, userId: providersTable.userId })
      .from(providersTable)
      .where(eq(providersTable.id, id))
      .limit(1);

    if (!provider) {
      return res.status(404).json({ success: false, error: "Provider not found" });
    }

    // Delete provider row — DB cascade handles:
    // properties, services, subscriptions, reviews, favorites,
    // interactions, paymentTransactions, walletTransactions,
    // supportTickets, companyPricing
    await db.delete(providersTable).where(eq(providersTable.id, id));

    // Delete the linked user account (cascade handles provider if not yet deleted)
    await db.delete(usersTable).where(eq(usersTable.id, provider.userId));

    return res.json({ success: true });
  } catch (err) {
    console.error("delete provider error", err);
    return res.status(500).json({ success: false, error: "Failed to delete provider" });
  }
});

export default router;
