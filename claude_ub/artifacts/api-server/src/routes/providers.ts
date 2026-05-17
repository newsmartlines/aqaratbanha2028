import { Router } from "express";
import { db } from "@workspace/db";
import { providersTable, usersTable, servicesTable, reviewsTable, categoriesTable, packagesTable, subscriptionsTable, requestsTable, interactionsTable } from "@workspace/db";
import { eq, and, desc, sql } from "drizzle-orm";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();

router.use("/admin", adminOnly);

// Public provider listing (approved + not suspended)
router.get("/providers", async (req, res) => {
  try {
    const { search, category, city, featured } = req.query;
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
    const { search, status } = req.query;
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
      })
      .from(providersTable)
      .innerJoin(usersTable, eq(providersTable.userId, usersTable.id))
      .leftJoin(categoriesTable, eq(providersTable.categoryId, categoriesTable.id))
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

    res.json({ success: true, data: result });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch providers" });
  }
});

router.get("/providers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
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

    const services = await db.select().from(servicesTable).where(eq(servicesTable.providerId, id));
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

    res.json({ success: true, data: { ...provider, services, reviews, subscription: subscription ?? null } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch provider" });
  }
});

router.put("/providers/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { bio, avatar, banner, city, district, phone, whatsapp, categoryId, verified, featured, latitude, longitude } = req.body;
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

// Provider stats — orders, services, reviews, subscription (provider-scoped)
router.get("/providers/:id/stats", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [requestsResult, servicesResult, reviewsResult, subscriptionResult] = await Promise.all([
      db.select().from(requestsTable).where(eq(requestsTable.providerId, id)),
      db.select().from(servicesTable).where(eq(servicesTable.providerId, id)),
      db.select().from(reviewsTable).where(eq(reviewsTable.providerId, id)),
      db
        .select({
          id: subscriptionsTable.id,
          startDate: subscriptionsTable.startDate,
          endDate: subscriptionsTable.endDate,
          packageId: subscriptionsTable.packageId,
          packageNameAr: packagesTable.nameAr,
          packagePrice: packagesTable.price,
          durationDays: packagesTable.durationDays,
        })
        .from(subscriptionsTable)
        .leftJoin(packagesTable, eq(subscriptionsTable.packageId, packagesTable.id))
        .where(eq(subscriptionsTable.providerId, id))
        .orderBy(desc(subscriptionsTable.startDate))
        .limit(1),
    ]);

    const totalOrders = requestsResult.length;
    const pendingOrders = requestsResult.filter(r => r.status === "new" || r.status === "pending").length;
    const completedOrders = requestsResult.filter(r => r.status === "completed").length;
    const cancelledOrders = requestsResult.filter(r => r.status === "cancelled").length;
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

    res.json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        completedOrders,
        cancelledOrders,
        servicesCount: servicesResult.length,
        reviewsCount: reviewsResult.length,
        avgRating,
        subscription: subscription
          ? { ...subscription, daysLeft, isActive }
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

// Provider self-subscribe — create or replace active subscription
router.post("/providers/:id/subscribe", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { packageId } = req.body;
    if (!packageId) return res.status(400).json({ success: false, error: "packageId is required" });

    // Fetch the package to get durationDays
    const [pkg] = await db.select().from(packagesTable).where(eq(packagesTable.id, parseInt(packageId)));
    if (!pkg) return res.status(404).json({ success: false, error: "Package not found" });

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (pkg.durationDays ?? 30) * 24 * 60 * 60 * 1000);

    const [sub] = await db
      .insert(subscriptionsTable)
      .values({ providerId: id, packageId: pkg.id, startDate, endDate, status: "active" })
      .returning();

    res.json({ success: true, data: sub });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create subscription" });
  }
});

router.patch("/providers/:id/approve", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db.update(providersTable).set({ approved: true, suspended: false }).where(eq(providersTable.id, id)).returning();
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
