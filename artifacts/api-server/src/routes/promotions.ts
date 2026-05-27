/**
 * Promotions Route
 * ─────────────────────────────────────────
 * All promotion-related endpoints (bump, featured, spotlight, quotas, addons).
 * All business logic delegated to promotionEngine.ts — no duplicate logic here.
 */

import { Router } from "express";
import { db } from "@workspace/db";
import {
  propertyPromotionsTable,
  promotionQuotasTable,
  addonBoostsTable,
  propertiesTable,
  usersTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and, desc, sql, gt } from "drizzle-orm";
import { getSession } from "./auth";
import {
  getUserQuotas,
  bumpProperty,
  featureProperty,
  spotlightProperty,
  grantAddonBoosts,
  expirePromotions,
  type PromotionType,
} from "../lib/promotionEngine";

const router = Router();

async function requireSession(req: any): Promise<number | null> {
  const token = req.cookies?.session ?? req.headers.authorization?.replace("Bearer ", "");
  if (!token) return null;
  const session = await getSession(token);
  return (session as any)?.userId ?? null;
}

async function requireAdmin(req: any): Promise<boolean> {
  const token = req.cookies?.session ?? req.headers.authorization?.replace("Bearer ", "");
  if (!token) return false;
  const session = await getSession(token);
  const userId = (session as any)?.userId;
  if (!userId) return false;
  const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId));
  return user?.role === "admin";
}

async function requireAdminUserId(req: any): Promise<number | null> {
  const token = req.cookies?.session ?? req.headers.authorization?.replace("Bearer ", "");
  if (!token) return null;
  const session = await getSession(token);
  const userId = (session as any)?.userId;
  if (!userId) return null;
  const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId));
  return user?.role === "admin" ? userId : null;
}

// ── GET /api/users/me/promotion-quotas ───────────────────────────────────────

router.get("/users/me/promotion-quotas", async (req, res) => {
  try {
    const userId = await requireSession(req);
    if (!userId) return res.status(401).json({ success: false, error: "غير مصرح" });

    const quotas = await getUserQuotas(userId);
    res.json({ success: true, data: quotas });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── GET /api/properties/:id/active-promotion ─────────────────────────────────

router.get("/properties/:id/active-promotion", async (req, res) => {
  try {
    const propertyId = parseInt(req.params.id, 10);
    if (isNaN(propertyId)) return res.status(400).json({ success: false, error: "معرّف غير صالح" });

    const [promo] = await db
      .select()
      .from(propertyPromotionsTable)
      .where(
        and(
          eq(propertyPromotionsTable.propertyId, propertyId),
          eq(propertyPromotionsTable.isActive, true),
          sql`(${propertyPromotionsTable.expiresAt} IS NULL OR ${propertyPromotionsTable.expiresAt} > NOW())`
        )
      )
      .orderBy(desc(propertyPromotionsTable.boostScore))
      .limit(1);

    res.json({ success: true, data: promo ?? null });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── POST /api/properties/:id/bump ────────────────────────────────────────────

router.post("/properties/:id/bump", async (req, res) => {
  try {
    const userId = await requireSession(req);
    if (!userId) return res.status(401).json({ success: false, error: "يجب تسجيل الدخول" });

    const propertyId = parseInt(req.params.id, 10);
    if (isNaN(propertyId)) return res.status(400).json({ success: false, error: "معرّف غير صالح" });

    const result = await bumpProperty(userId, propertyId);
    if (!result.ok) return res.status(403).json({ success: false, error: result.error.message, code: result.error.code });

    res.json({ success: true, data: result.promotion, message: "تم ترفيع إعلانك بنجاح! سيظهر في أعلى نتائج البحث." });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── POST /api/properties/:id/feature ─────────────────────────────────────────

router.post("/properties/:id/feature", async (req, res) => {
  try {
    const userId = await requireSession(req);
    if (!userId) return res.status(401).json({ success: false, error: "يجب تسجيل الدخول" });

    const propertyId = parseInt(req.params.id, 10);
    if (isNaN(propertyId)) return res.status(400).json({ success: false, error: "معرّف غير صالح" });

    const result = await featureProperty(userId, propertyId, "plan");
    if (!result.ok) return res.status(403).json({ success: false, error: result.error.message, code: result.error.code });

    res.json({ success: true, data: result.promotion, message: "تم إبراز إعلانك كإعلان مميز!" });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── POST /api/properties/:id/spotlight ───────────────────────────────────────

router.post("/properties/:id/spotlight", async (req, res) => {
  try {
    const userId = await requireSession(req);
    if (!userId) return res.status(401).json({ success: false, error: "يجب تسجيل الدخول" });

    const propertyId = parseInt(req.params.id, 10);
    if (isNaN(propertyId)) return res.status(400).json({ success: false, error: "معرّف غير صالح" });

    const result = await spotlightProperty(userId, propertyId, "plan");
    if (!result.ok) return res.status(403).json({ success: false, error: result.error.message, code: result.error.code });

    res.json({ success: true, data: result.promotion, message: "تم إضافة إعلانك إلى Spotlight!" });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── GET /api/users/me/addon-boosts ───────────────────────────────────────────

router.get("/users/me/addon-boosts", async (req, res) => {
  try {
    const userId = await requireSession(req);
    if (!userId) return res.status(401).json({ success: false, error: "يجب تسجيل الدخول" });

    const addons = await db
      .select()
      .from(addonBoostsTable)
      .where(
        and(
          eq(addonBoostsTable.userId, userId),
          gt(addonBoostsTable.remaining, 0),
          sql`(${addonBoostsTable.expiresAt} IS NULL OR ${addonBoostsTable.expiresAt} > NOW())`
        )
      )
      .orderBy(addonBoostsTable.expiresAt);

    res.json({ success: true, data: addons });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── GET /api/users/:userId/property-promotions ────────────────────────────────

router.get("/users/:userId/property-promotions", async (req, res) => {
  try {
    const userId = await requireSession(req);
    if (!userId) return res.status(401).json({ success: false, error: "غير مصرح" });

    const targetId = parseInt(req.params.userId, 10);
    if (userId !== targetId) return res.status(403).json({ success: false, error: "غير مصرح" });

    // Expire stale first
    await expirePromotions().catch(() => {});

    const promos = await db
      .select({
        id: propertyPromotionsTable.id,
        propertyId: propertyPromotionsTable.propertyId,
        type: propertyPromotionsTable.type,
        source: propertyPromotionsTable.source,
        boostScore: propertyPromotionsTable.boostScore,
        expiresAt: propertyPromotionsTable.expiresAt,
        isActive: propertyPromotionsTable.isActive,
        createdAt: propertyPromotionsTable.createdAt,
        propertyTitle: propertiesTable.title,
        propertyStatus: propertiesTable.status,
      })
      .from(propertyPromotionsTable)
      .leftJoin(propertiesTable, eq(propertyPromotionsTable.propertyId, propertiesTable.id))
      .where(eq(propertyPromotionsTable.userId, userId))
      .orderBy(desc(propertyPromotionsTable.createdAt));

    res.json({ success: true, data: promos });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── GET /api/admin/promotions/overview ───────────────────────────────────────

router.get("/admin/promotions/overview", async (req, res) => {
  try {
    const isAdmin = await requireAdmin(req);
    if (!isAdmin) return res.status(403).json({ success: false, error: "غير مصرح" });

    await expirePromotions().catch(() => {});

    const [stats] = await db
      .select({
        total: sql<number>`COUNT(*)`,
        active: sql<number>`COUNT(*) FILTER (WHERE ${propertyPromotionsTable.isActive} = true AND (${propertyPromotionsTable.expiresAt} IS NULL OR ${propertyPromotionsTable.expiresAt} > NOW()))`,
        bumps: sql<number>`COUNT(*) FILTER (WHERE ${propertyPromotionsTable.type} = 'bump')`,
        featured: sql<number>`COUNT(*) FILTER (WHERE ${propertyPromotionsTable.type} = 'featured')`,
        spotlight: sql<number>`COUNT(*) FILTER (WHERE ${propertyPromotionsTable.type} = 'spotlight')`,
      })
      .from(propertyPromotionsTable);

    const recentPromos = await db
      .select({
        id: propertyPromotionsTable.id,
        type: propertyPromotionsTable.type,
        source: propertyPromotionsTable.source,
        boostScore: propertyPromotionsTable.boostScore,
        expiresAt: propertyPromotionsTable.expiresAt,
        isActive: propertyPromotionsTable.isActive,
        createdAt: propertyPromotionsTable.createdAt,
        propertyTitle: propertiesTable.title,
        userName: usersTable.name,
      })
      .from(propertyPromotionsTable)
      .leftJoin(propertiesTable, eq(propertyPromotionsTable.propertyId, propertiesTable.id))
      .leftJoin(usersTable, eq(propertyPromotionsTable.userId, usersTable.id))
      .orderBy(desc(propertyPromotionsTable.createdAt))
      .limit(30);

    res.json({ success: true, data: { stats, recent: recentPromos } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── POST /api/admin/promotions/grant-addon ────────────────────────────────────

router.post("/admin/promotions/grant-addon", async (req, res) => {
  try {
    const isAdmin = await requireAdmin(req);
    if (!isAdmin) return res.status(403).json({ success: false, error: "غير مصرح" });

    const { userId, type, quantity, note, daysValid } = req.body ?? {};
    if (!userId || !type || !quantity) {
      return res.status(400).json({ success: false, error: "userId, type, quantity مطلوبة" });
    }
    if (!["bump", "featured", "spotlight"].includes(type)) {
      return res.status(400).json({ success: false, error: "نوع غير صالح (bump | featured | spotlight)" });
    }

    await grantAddonBoosts(parseInt(userId), type as PromotionType, parseInt(quantity), note ?? "", daysValid ?? 90);

    // Notify user
    await db.insert(notificationsTable).values({
      userId: parseInt(userId),
      title: "🎁 تمت إضافة ترقيات إضافية لحسابك",
      message: `أضاف الأدمن ${quantity} ترقية من نوع "${type === "bump" ? "ترفيع" : type === "featured" ? "مميز" : "Spotlight"}" إلى حسابك.`,
      type: "promotion",
      link: "/dashboard/promotions",
    }).catch(() => {});

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── POST /api/admin/properties/:id/feature ────────────────────────────────────
// Admin manually features a property (bypasses quota)

router.post("/admin/properties/:id/feature", async (req, res) => {
  try {
    const adminUserId = await requireAdminUserId(req);
    if (!adminUserId) return res.status(403).json({ success: false, error: "غير مصرح" });

    const propertyId = parseInt(req.params.id, 10);
    const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, propertyId));
    if (!property) return res.status(404).json({ success: false, error: "العقار غير موجود" });

    const ownerId = property.ownerUserId ?? adminUserId;
    const result = await featureProperty(ownerId, propertyId, "manual");
    if (!result.ok) return res.status(500).json({ success: false, error: result.error.message });

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── POST /api/admin/properties/:id/spotlight ──────────────────────────────────

router.post("/admin/properties/:id/spotlight", async (req, res) => {
  try {
    const adminUserId = await requireAdminUserId(req);
    if (!adminUserId) return res.status(403).json({ success: false, error: "غير مصرح" });

    const propertyId = parseInt(req.params.id, 10);
    const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, propertyId));
    if (!property) return res.status(404).json({ success: false, error: "العقار غير موجود" });

    const ownerId = property.ownerUserId ?? adminUserId;
    const result = await spotlightProperty(ownerId, propertyId, "manual");
    if (!result.ok) return res.status(500).json({ success: false, error: result.error.message });

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── POST /api/admin/promotions/:id/revoke ────────────────────────────────────

router.post("/admin/promotions/:id/revoke", async (req, res) => {
  try {
    const isAdmin = await requireAdmin(req);
    if (!isAdmin) return res.status(403).json({ success: false, error: "غير مصرح" });

    const promoId = parseInt(req.params.id, 10);
    if (isNaN(promoId)) return res.status(400).json({ success: false, error: "معرّف غير صالح" });

    const [promo] = await db
      .select()
      .from(propertyPromotionsTable)
      .where(eq(propertyPromotionsTable.id, promoId));
    if (!promo) return res.status(404).json({ success: false, error: "الترقية غير موجودة" });

    await db
      .update(propertyPromotionsTable)
      .set({ isActive: false, expiresAt: new Date() })
      .where(eq(propertyPromotionsTable.id, promoId));

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── POST /api/admin/properties/:id/bump ──────────────────────────────────────

router.post("/admin/properties/:id/bump", async (req, res) => {
  try {
    const isAdmin = await requireAdmin(req);
    if (!isAdmin) return res.status(403).json({ success: false, error: "غير مصرح" });

    const propertyId = parseInt(req.params.id, 10);
    const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, propertyId));
    if (!property) return res.status(404).json({ success: false, error: "العقار غير موجود" });

    const durationDays = parseInt(req.body?.durationDays ?? "7", 10) || 7;
    const expiresAt = new Date(Date.now() + durationDays * 86400_000);

    // Deactivate previous bump for this property
    await db
      .update(propertyPromotionsTable)
      .set({ isActive: false })
      .where(and(eq(propertyPromotionsTable.propertyId, propertyId), eq(propertyPromotionsTable.type, "bump"), eq(propertyPromotionsTable.isActive, true)));

    await db.insert(propertyPromotionsTable).values({
      propertyId,
      userId: property.ownerUserId ?? 1,
      type: "bump",
      source: "manual",
      boostScore: 200,
      expiresAt,
      isActive: true,
    });

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── GET /api/admin/promotions/dashboard ──────────────────────────────────────

router.get("/admin/promotions/dashboard", async (req, res) => {
  try {
    const isAdmin = await requireAdmin(req);
    if (!isAdmin) return res.status(403).json({ success: false, error: "غير مصرح" });

    await expirePromotions().catch(() => {});

    // Active stats by type
    const [stats] = await db
      .select({
        totalActive:      sql<number>`COUNT(*) FILTER (WHERE ${propertyPromotionsTable.isActive} = true AND (${propertyPromotionsTable.expiresAt} IS NULL OR ${propertyPromotionsTable.expiresAt} > NOW()))`,
        activeBumps:      sql<number>`COUNT(*) FILTER (WHERE ${propertyPromotionsTable.isActive} = true AND ${propertyPromotionsTable.type} = 'bump'    AND (${propertyPromotionsTable.expiresAt} IS NULL OR ${propertyPromotionsTable.expiresAt} > NOW()))`,
        activeFeatured:   sql<number>`COUNT(*) FILTER (WHERE ${propertyPromotionsTable.isActive} = true AND ${propertyPromotionsTable.type} = 'featured' AND (${propertyPromotionsTable.expiresAt} IS NULL OR ${propertyPromotionsTable.expiresAt} > NOW()))`,
        activeSpotlight:  sql<number>`COUNT(*) FILTER (WHERE ${propertyPromotionsTable.isActive} = true AND ${propertyPromotionsTable.type} = 'spotlight' AND (${propertyPromotionsTable.expiresAt} IS NULL OR ${propertyPromotionsTable.expiresAt} > NOW()))`,
        manualCount:      sql<number>`COUNT(*) FILTER (WHERE ${propertyPromotionsTable.source} = 'manual')`,
        addonCount:       sql<number>`COUNT(*) FILTER (WHERE ${propertyPromotionsTable.source} = 'addon')`,
      })
      .from(propertyPromotionsTable);

    // Revenue from addon boosts (price × quantity_used)
    const [addonRevenue] = await db
      .select({
        revenue: sql<number>`COALESCE(SUM(CAST(${addonBoostsTable.price} AS numeric) * (${addonBoostsTable.quantity} - ${addonBoostsTable.remaining})), 0)`,
        totalGranted: sql<number>`COALESCE(SUM(${addonBoostsTable.quantity}), 0)`,
        totalUsed: sql<number>`COALESCE(SUM(${addonBoostsTable.quantity} - ${addonBoostsTable.remaining}), 0)`,
      })
      .from(addonBoostsTable);

    // All active promotions list
    const activePromos = await db
      .select({
        id: propertyPromotionsTable.id,
        propertyId: propertyPromotionsTable.propertyId,
        userId: propertyPromotionsTable.userId,
        type: propertyPromotionsTable.type,
        source: propertyPromotionsTable.source,
        boostScore: propertyPromotionsTable.boostScore,
        expiresAt: propertyPromotionsTable.expiresAt,
        isActive: propertyPromotionsTable.isActive,
        createdAt: propertyPromotionsTable.createdAt,
        propertyTitle: propertiesTable.title,
        propertyStatus: propertiesTable.status,
        userName: usersTable.name,
        userEmail: usersTable.email,
      })
      .from(propertyPromotionsTable)
      .leftJoin(propertiesTable, eq(propertyPromotionsTable.propertyId, propertiesTable.id))
      .leftJoin(usersTable, eq(propertyPromotionsTable.userId, usersTable.id))
      .where(
        and(
          eq(propertyPromotionsTable.isActive, true),
          sql`(${propertyPromotionsTable.expiresAt} IS NULL OR ${propertyPromotionsTable.expiresAt} > NOW())`
        )
      )
      .orderBy(desc(propertyPromotionsTable.boostScore))
      .limit(100);

    // Top 10 properties by boost score
    const topProperties = await db
      .select({
        propertyId: propertyPromotionsTable.propertyId,
        propertyTitle: propertiesTable.title,
        userName: usersTable.name,
        totalBoost: sql<number>`SUM(${propertyPromotionsTable.boostScore})`,
        types: sql<string>`STRING_AGG(DISTINCT ${propertyPromotionsTable.type}, ', ')`,
      })
      .from(propertyPromotionsTable)
      .leftJoin(propertiesTable, eq(propertyPromotionsTable.propertyId, propertiesTable.id))
      .leftJoin(usersTable, eq(propertyPromotionsTable.userId, usersTable.id))
      .where(
        and(
          eq(propertyPromotionsTable.isActive, true),
          sql`(${propertyPromotionsTable.expiresAt} IS NULL OR ${propertyPromotionsTable.expiresAt} > NOW())`
        )
      )
      .groupBy(propertyPromotionsTable.propertyId, propertiesTable.title, usersTable.name)
      .orderBy(sql`SUM(${propertyPromotionsTable.boostScore}) DESC`)
      .limit(10);

    res.json({
      success: true,
      data: {
        stats: { ...stats, ...addonRevenue },
        activePromos,
        topProperties,
      },
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── POST /api/promotions/expire-stale ────────────────────────────────────────
// Maintenance endpoint — expire stale promotions (cron-friendly)

router.post("/promotions/expire-stale", async (req, res) => {
  try {
    const isAdmin = await requireAdmin(req);
    if (!isAdmin) return res.status(403).json({ success: false, error: "غير مصرح" });

    const count = await expirePromotions();
    res.json({ success: true, expired: count });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
