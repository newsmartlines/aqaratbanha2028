/**
 * Promotion Marketplace Routes
 * ─────────────────────────────────────────────────────────
 * Enterprise-grade paid promotions independent of subscription quotas.
 *
 * Public:
 *   GET  /api/promotion-types                              — list enabled types
 *
 * User (authenticated):
 *   POST /api/promotion-purchases                          — buy a promotion (→ pending)
 *   GET  /api/users/me/promotion-purchases                 — my purchase history
 *   PATCH /api/users/me/promotion-purchases/:id/cancel     — cancel a pending purchase
 *
 * Admin:
 *   GET  /api/admin/promotion-types                        — all types (incl. disabled)
 *   PUT  /api/admin/promotion-types/:id                    — update type config
 *   GET  /api/admin/promotion-purchases                    — all purchases (with filters)
 *   POST /api/admin/promotion-purchases/:id/approve        — approve → activate
 *   POST /api/admin/promotion-purchases/:id/reject         — reject purchase
 *   GET  /api/admin/promotion-purchases/revenue            — revenue by type report
 */

import { Router } from "express";
import { db } from "@workspace/db";
import {
  promotionTypesTable,
  promotionPurchasesTable,
  propertyPromotionsTable,
  propertiesTable,
  usersTable,
  notificationsTable,
} from "@workspace/db";
import { eq, and, desc, sql, inArray, gte, lte, ne } from "drizzle-orm";
import { getSession } from "./auth";

const router = Router();

// ── Auth helpers ──────────────────────────────────────────────────────────────

async function requireSession(req: any): Promise<number | null> {
  const token = req.cookies?.session ?? req.headers.authorization?.replace("Bearer ", "");
  if (!token) return null;
  const session = await getSession(token);
  return (session as any)?.userId ?? null;
}

async function requireAdminId(req: any): Promise<number | null> {
  const token = req.cookies?.session ?? req.headers.authorization?.replace("Bearer ", "");
  if (!token) return null;
  const session = await getSession(token);
  const userId = (session as any)?.userId;
  if (!userId) return null;
  const [user] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, userId));
  return user?.role === "admin" ? userId : null;
}

async function notifyUser(userId: number, title: string, message: string, type: string, link: string) {
  try {
    await db.insert(notificationsTable).values({ userId, title, message, type, link, read: false });
  } catch {}
}

// ── Public: GET /api/promotion-types ─────────────────────────────────────────

router.get("/promotion-types", async (req, res) => {
  try {
    const types = await db
      .select()
      .from(promotionTypesTable)
      .where(eq(promotionTypesTable.isEnabled, true))
      .orderBy(promotionTypesTable.priority, promotionTypesTable.id);
    res.json({ success: true, data: types });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── User: POST /api/promotion-purchases ───────────────────────────────────────

router.post("/promotion-purchases", async (req, res) => {
  try {
    const userId = await requireSession(req);
    if (!userId) return res.status(401).json({ success: false, error: "يجب تسجيل الدخول" });

    const { propertyId, promotionTypeId, paymentMethod, paymentReference } = req.body ?? {};
    if (!propertyId || !promotionTypeId) {
      return res.status(400).json({ success: false, error: "propertyId و promotionTypeId مطلوبان" });
    }

    // Verify property ownership
    const [property] = await db
      .select({ id: propertiesTable.id, ownerUserId: propertiesTable.ownerUserId, title: propertiesTable.title, status: propertiesTable.status })
      .from(propertiesTable)
      .where(eq(propertiesTable.id, parseInt(String(propertyId), 10)));

    if (!property) return res.status(404).json({ success: false, error: "العقار غير موجود" });
    if (property.ownerUserId !== userId) return res.status(403).json({ success: false, error: "لا يمكنك ترويج عقار لا تملكه" });
    if (!["approved", "active"].includes(property.status ?? "")) {
      return res.status(400).json({ success: false, error: "يجب أن يكون العقار معتمداً لترويجه" });
    }

    // Fetch promotion type
    const [pType] = await db
      .select()
      .from(promotionTypesTable)
      .where(and(eq(promotionTypesTable.id, parseInt(String(promotionTypeId), 10)), eq(promotionTypesTable.isEnabled, true)));

    if (!pType) return res.status(404).json({ success: false, error: "نوع الترقية غير موجود أو معطل" });

    // Prevent duplicate active or pending promotion of same type on same property
    const [existing] = await db
      .select({ id: promotionPurchasesTable.id, status: promotionPurchasesTable.status })
      .from(promotionPurchasesTable)
      .where(
        and(
          eq(promotionPurchasesTable.propertyId, property.id),
          eq(promotionPurchasesTable.promotionTypeId, pType.id),
          inArray(promotionPurchasesTable.status, ["pending", "active"]),
        )
      )
      .limit(1);

    if (existing) {
      const msg = existing.status === "pending"
        ? "لديك طلب ترقية معلق من هذا النوع لهذا العقار. انتظر موافقة الأدمن أو ألغِه أولاً."
        : "لديك ترقية نشطة من هذا النوع على هذا العقار.";
      return res.status(409).json({ success: false, error: msg });
    }

    // Calculate pricing
    const basePrice = parseFloat(String(pType.price ?? "0"));
    const vatPct = parseFloat(String(pType.vatPercent ?? "0"));
    const discountPct = parseFloat(String(pType.discountPercent ?? "0"));
    const discounted = basePrice * (1 - discountPct / 100);
    const vatAmount = discounted * (vatPct / 100);
    const totalAmount = discounted + vatAmount;

    const [purchase] = await db.insert(promotionPurchasesTable).values({
      userId,
      propertyId: property.id,
      promotionTypeId: pType.id,
      status: "pending",
      paymentMethod: paymentMethod ?? "manual_transfer",
      priceAtPurchase: String(discounted.toFixed(2)),
      vatAmount: String(vatAmount.toFixed(2)),
      totalAmount: String(totalAmount.toFixed(2)),
      durationDays: pType.durationDays ?? 7,
      paymentReference: paymentReference ?? null,
    }).returning();

    // In-app notification to user
    await notifyUser(
      userId,
      "📋 تم استلام طلب الترقية",
      `طلبك لترقية "${pType.nameAr}" على العقار "${property.title ?? `#${property.id}`}" قيد المراجعة. سنُعلمك فور الموافقة.`,
      "promotion",
      "/dashboard/promotions",
    );

    // Notify admins (best-effort)
    try {
      const admins = await db.select({ id: usersTable.id }).from(usersTable).where(eq(usersTable.role, "admin"));
      for (const admin of admins) {
        await notifyUser(
          admin.id,
          "🛒 طلب ترقية جديد",
          `مستخدم طلب ترقية "${pType.nameAr}" على عقار "${property.title ?? `#${property.id}`}". يرجى المراجعة والموافقة.`,
          "promotion",
          "/admin/promotions",
        );
      }
    } catch {}

    res.status(201).json({
      success: true,
      data: purchase,
      message: "تم إرسال طلب الترقية بنجاح. سيتم تفعيلها بعد مراجعة وموافقة الإدارة.",
    });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── User: GET /api/users/me/promotion-purchases ───────────────────────────────

router.get("/users/me/promotion-purchases", async (req, res) => {
  try {
    const userId = await requireSession(req);
    if (!userId) return res.status(401).json({ success: false, error: "غير مصرح" });

    const purchases = await db
      .select({
        id: promotionPurchasesTable.id,
        propertyId: promotionPurchasesTable.propertyId,
        promotionTypeId: promotionPurchasesTable.promotionTypeId,
        promotionId: promotionPurchasesTable.promotionId,
        status: promotionPurchasesTable.status,
        paymentMethod: promotionPurchasesTable.paymentMethod,
        priceAtPurchase: promotionPurchasesTable.priceAtPurchase,
        vatAmount: promotionPurchasesTable.vatAmount,
        totalAmount: promotionPurchasesTable.totalAmount,
        durationDays: promotionPurchasesTable.durationDays,
        paymentReference: promotionPurchasesTable.paymentReference,
        adminNote: promotionPurchasesTable.adminNote,
        approvedAt: promotionPurchasesTable.approvedAt,
        expiresAt: promotionPurchasesTable.expiresAt,
        createdAt: promotionPurchasesTable.createdAt,
        propertyTitle: propertiesTable.title,
        typeNameAr: promotionTypesTable.nameAr,
        typeKey: promotionTypesTable.key,
        typeBadgeText: promotionTypesTable.badgeText,
        typeBadgeBgColor: promotionTypesTable.badgeBgColor,
        typeBadgeColor: promotionTypesTable.badgeColor,
      })
      .from(promotionPurchasesTable)
      .leftJoin(propertiesTable, eq(promotionPurchasesTable.propertyId, propertiesTable.id))
      .leftJoin(promotionTypesTable, eq(promotionPurchasesTable.promotionTypeId, promotionTypesTable.id))
      .where(eq(promotionPurchasesTable.userId, userId))
      .orderBy(desc(promotionPurchasesTable.createdAt))
      .limit(100);

    res.json({ success: true, data: purchases });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── User: PATCH /api/users/me/promotion-purchases/:id/cancel ─────────────────

router.patch("/users/me/promotion-purchases/:id/cancel", async (req, res) => {
  try {
    const userId = await requireSession(req);
    if (!userId) return res.status(401).json({ success: false, error: "غير مصرح" });

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ success: false, error: "معرّف غير صالح" });

    const [purchase] = await db
      .select()
      .from(promotionPurchasesTable)
      .where(and(eq(promotionPurchasesTable.id, id), eq(promotionPurchasesTable.userId, userId)));

    if (!purchase) return res.status(404).json({ success: false, error: "الطلب غير موجود" });
    if (purchase.status !== "pending") {
      return res.status(400).json({ success: false, error: "يمكن إلغاء الطلبات المعلقة فقط" });
    }

    await db
      .update(promotionPurchasesTable)
      .set({ status: "cancelled", updatedAt: new Date() })
      .where(eq(promotionPurchasesTable.id, id));

    res.json({ success: true, message: "تم إلغاء طلب الترقية" });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Admin: GET /api/admin/promotion-types ────────────────────────────────────

router.get("/admin/promotion-types", async (req, res) => {
  try {
    const adminId = await requireAdminId(req);
    if (!adminId) return res.status(403).json({ success: false, error: "غير مصرح" });

    const types = await db
      .select()
      .from(promotionTypesTable)
      .orderBy(promotionTypesTable.priority, promotionTypesTable.id);

    res.json({ success: true, data: types });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Admin: POST /api/admin/promotion-types (create new) ──────────────────────

const DEFAULT_PROMOTION_TYPES = [
  { key: "bump_up", nameAr: "Bump Up — ترفيع", nameEn: "Bump Up", descriptionAr: "انقل إعلانك إلى أعلى نتائج البحث فوراً وازداد ظهوراً.", isEnabled: true, price: "25.00", durationDays: 7, boostScore: 200, badgeText: "مرفوع", badgeColor: "#FFFFFF", badgeBgColor: "#3B82F6", maxSimultaneous: 1, vatPercent: "0.00", discountPercent: "0.00", requiresApproval: true, autoExpiry: true, priority: 1, benefits: JSON.stringify(["يظهر في أعلى نتائج البحث", "مدة 7 أيام", "ترتيب أولوية مرتفع"]), visibility: "search" },
  { key: "spotlight", nameAr: "Spotlight — إبراز", nameEn: "Spotlight", descriptionAr: "شارة مميزة وخلفية بارزة تجذب نظر المشترين على الفور.", isEnabled: true, price: "75.00", durationDays: 14, boostScore: 800, badgeText: "مبرز", badgeColor: "#FFFFFF", badgeBgColor: "#7C3AED", maxSimultaneous: 1, vatPercent: "0.00", discountPercent: "0.00", requiresApproval: true, autoExpiry: true, priority: 2, benefits: JSON.stringify(["أعلى درجات الإبراز", "شارة خاصة وبارزة", "مدة 14 يوم", "أولوية قصوى في البحث"]), visibility: "all" },
  { key: "featured_homepage", nameAr: "مميز على الرئيسية", nameEn: "Featured Homepage", descriptionAr: "اعرض إعلانك في قسم العقارات المميزة على الصفحة الرئيسية.", isEnabled: true, price: "150.00", durationDays: 30, boostScore: 500, badgeText: "مميز", badgeColor: "#FFFFFF", badgeBgColor: "#F59E0B", maxSimultaneous: 1, vatPercent: "0.00", discountPercent: "0.00", requiresApproval: true, autoExpiry: true, priority: 3, benefits: JSON.stringify(["يظهر في الصفحة الرئيسية", "قسم العقارات المميزة", "مدة 30 يوم", "مشاهدات أعلى بكثير"]), visibility: "homepage" },
  { key: "featured_category", nameAr: "مثبّت في القسم", nameEn: "Featured Category", descriptionAr: "ثبّت إعلانك في أعلى صفحات التصنيف المحددة.", isEnabled: true, price: "100.00", durationDays: 30, boostScore: 350, badgeText: "مثبت", badgeColor: "#FFFFFF", badgeBgColor: "#F97316", maxSimultaneous: 1, vatPercent: "0.00", discountPercent: "0.00", requiresApproval: true, autoExpiry: true, priority: 4, benefits: JSON.stringify(["مثبت في أعلى صفحة القسم", "مدة 30 يوم", "استهداف المشترين المهتمين"]), visibility: "category" },
  { key: "urgent_badge", nameAr: "شارة عاجل", nameEn: "Urgent Badge", descriptionAr: "أضف شارة \"عاجل\" تجذب المشترين الجادين وتُسرّع البيع.", isEnabled: true, price: "30.00", durationDays: 7, boostScore: 50, badgeText: "عاجل", badgeColor: "#FFFFFF", badgeBgColor: "#EF4444", maxSimultaneous: 1, vatPercent: "0.00", discountPercent: "0.00", requiresApproval: true, autoExpiry: true, priority: 5, benefits: JSON.stringify(["شارة عاجل واضحة", "يجذب المشترين الجادين", "مدة 7 أيام", "مناسب للبيع السريع"]), visibility: "all" },
  { key: "premium_listing", nameAr: "إعلان بريميوم", nameEn: "Premium Listing", descriptionAr: "أعلى مستوى من الظهور — يتصدر جميع نتائج البحث والتصنيفات.", isEnabled: true, price: "250.00", durationDays: 30, boostScore: 1000, badgeText: "بريميوم", badgeColor: "#FFFFFF", badgeBgColor: "#6D28D9", maxSimultaneous: 1, vatPercent: "0.00", discountPercent: "0.00", requiresApproval: true, autoExpiry: true, priority: 6, benefits: JSON.stringify(["أعلى ترتيب في البحث", "يتصدر جميع الصفحات", "مدة 30 يوم", "شارة بريميوم حصرية", "ظهور في كل الأقسام"]), visibility: "all" },
];

router.post("/admin/promotion-types/seed", async (req, res) => {
  try {
    const adminId = await requireAdminId(req);
    if (!adminId) return res.status(403).json({ success: false, error: "غير مصرح" });

    let inserted = 0;
    for (const pt of DEFAULT_PROMOTION_TYPES) {
      const existing = await db.select({ id: promotionTypesTable.id }).from(promotionTypesTable).where(eq(promotionTypesTable.key, pt.key)).limit(1);
      if (existing.length === 0) {
        await db.insert(promotionTypesTable).values(pt as any);
        inserted++;
      }
    }

    const all = await db.select().from(promotionTypesTable).orderBy(promotionTypesTable.priority, promotionTypesTable.id);
    res.json({ success: true, inserted, data: all });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

router.post("/admin/promotion-types", async (req, res) => {
  try {
    const adminId = await requireAdminId(req);
    if (!adminId) return res.status(403).json({ success: false, error: "غير مصرح" });

    const {
      key, nameAr, nameEn, descriptionAr, isEnabled, price, durationDays, boostScore,
      badgeText, badgeColor, badgeBgColor, maxSimultaneous, vatPercent, discountPercent,
      requiresApproval, autoExpiry, priority, benefits, visibility,
    } = req.body ?? {};

    if (!key || !nameAr || !nameEn) {
      return res.status(400).json({ success: false, error: "key و nameAr و nameEn مطلوبون" });
    }

    const insertData: Record<string, any> = {
      key: String(key).toLowerCase().replace(/\s+/g, "_"),
      nameAr: String(nameAr),
      nameEn: String(nameEn),
    };
    if (descriptionAr !== undefined) insertData.descriptionAr = descriptionAr;
    if (isEnabled !== undefined) insertData.isEnabled = Boolean(isEnabled);
    if (price !== undefined) insertData.price = String(parseFloat(String(price)).toFixed(2));
    if (durationDays !== undefined) insertData.durationDays = parseInt(String(durationDays), 10);
    if (boostScore !== undefined) insertData.boostScore = parseInt(String(boostScore), 10);
    if (badgeText !== undefined) insertData.badgeText = badgeText;
    if (badgeColor !== undefined) insertData.badgeColor = badgeColor;
    if (badgeBgColor !== undefined) insertData.badgeBgColor = badgeBgColor;
    if (maxSimultaneous !== undefined) insertData.maxSimultaneous = parseInt(String(maxSimultaneous), 10);
    if (vatPercent !== undefined) insertData.vatPercent = String(parseFloat(String(vatPercent)).toFixed(2));
    if (discountPercent !== undefined) insertData.discountPercent = String(parseFloat(String(discountPercent)).toFixed(2));
    if (requiresApproval !== undefined) insertData.requiresApproval = Boolean(requiresApproval);
    if (autoExpiry !== undefined) insertData.autoExpiry = Boolean(autoExpiry);
    if (priority !== undefined) insertData.priority = parseInt(String(priority), 10);
    if (benefits !== undefined) insertData.benefits = typeof benefits === "string" ? benefits : JSON.stringify(benefits);
    if (visibility !== undefined) insertData.visibility = visibility;

    const [created] = await db.insert(promotionTypesTable).values(insertData as any).returning();
    res.status(201).json({ success: true, data: created });
  } catch (e: any) {
    if ((e as any).code === "23505") {
      return res.status(409).json({ success: false, error: "المفتاح (key) مستخدم بالفعل — اختر مفتاحاً مختلفاً" });
    }
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Admin: PUT /api/admin/promotion-types/:id ────────────────────────────────

router.put("/admin/promotion-types/:id", async (req, res) => {
  try {
    const adminId = await requireAdminId(req);
    if (!adminId) return res.status(403).json({ success: false, error: "غير مصرح" });

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ success: false, error: "معرّف غير صالح" });

    const {
      nameAr, nameEn, descriptionAr, isEnabled, price, durationDays, boostScore,
      badgeText, badgeColor, badgeBgColor, maxSimultaneous, vatPercent, discountPercent,
      requiresApproval, autoExpiry, priority, benefits, visibility,
    } = req.body ?? {};

    const updateData: Record<string, any> = { updatedAt: new Date() };
    if (nameAr !== undefined) updateData.nameAr = nameAr;
    if (nameEn !== undefined) updateData.nameEn = nameEn;
    if (descriptionAr !== undefined) updateData.descriptionAr = descriptionAr;
    if (isEnabled !== undefined) updateData.isEnabled = Boolean(isEnabled);
    if (price !== undefined) updateData.price = String(parseFloat(String(price)).toFixed(2));
    if (durationDays !== undefined) updateData.durationDays = parseInt(String(durationDays), 10);
    if (boostScore !== undefined) updateData.boostScore = parseInt(String(boostScore), 10);
    if (badgeText !== undefined) updateData.badgeText = badgeText;
    if (badgeColor !== undefined) updateData.badgeColor = badgeColor;
    if (badgeBgColor !== undefined) updateData.badgeBgColor = badgeBgColor;
    if (maxSimultaneous !== undefined) updateData.maxSimultaneous = parseInt(String(maxSimultaneous), 10);
    if (vatPercent !== undefined) updateData.vatPercent = String(parseFloat(String(vatPercent)).toFixed(2));
    if (discountPercent !== undefined) updateData.discountPercent = String(parseFloat(String(discountPercent)).toFixed(2));
    if (requiresApproval !== undefined) updateData.requiresApproval = Boolean(requiresApproval);
    if (autoExpiry !== undefined) updateData.autoExpiry = Boolean(autoExpiry);
    if (priority !== undefined) updateData.priority = parseInt(String(priority), 10);
    if (benefits !== undefined) updateData.benefits = typeof benefits === "string" ? benefits : JSON.stringify(benefits);
    if (visibility !== undefined) updateData.visibility = visibility;

    const [updated] = await db
      .update(promotionTypesTable)
      .set(updateData)
      .where(eq(promotionTypesTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ success: false, error: "نوع الترقية غير موجود" });

    res.json({ success: true, data: updated });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Admin: GET /api/admin/promotion-purchases ─────────────────────────────────

router.get("/admin/promotion-purchases", async (req, res) => {
  try {
    const adminId = await requireAdminId(req);
    if (!adminId) return res.status(403).json({ success: false, error: "غير مصرح" });

    const statusFilter = req.query.status as string | undefined;

    let query = db
      .select({
        id: promotionPurchasesTable.id,
        userId: promotionPurchasesTable.userId,
        propertyId: promotionPurchasesTable.propertyId,
        promotionTypeId: promotionPurchasesTable.promotionTypeId,
        promotionId: promotionPurchasesTable.promotionId,
        status: promotionPurchasesTable.status,
        paymentMethod: promotionPurchasesTable.paymentMethod,
        priceAtPurchase: promotionPurchasesTable.priceAtPurchase,
        vatAmount: promotionPurchasesTable.vatAmount,
        totalAmount: promotionPurchasesTable.totalAmount,
        durationDays: promotionPurchasesTable.durationDays,
        paymentReference: promotionPurchasesTable.paymentReference,
        adminNote: promotionPurchasesTable.adminNote,
        approvedAt: promotionPurchasesTable.approvedAt,
        expiresAt: promotionPurchasesTable.expiresAt,
        createdAt: promotionPurchasesTable.createdAt,
        propertyTitle: propertiesTable.title,
        userName: usersTable.name,
        userEmail: usersTable.email,
        typeNameAr: promotionTypesTable.nameAr,
        typeKey: promotionTypesTable.key,
        typeBadgeBgColor: promotionTypesTable.badgeBgColor,
        typeBadgeColor: promotionTypesTable.badgeColor,
      })
      .from(promotionPurchasesTable)
      .leftJoin(propertiesTable, eq(promotionPurchasesTable.propertyId, propertiesTable.id))
      .leftJoin(usersTable, eq(promotionPurchasesTable.userId, usersTable.id))
      .leftJoin(promotionTypesTable, eq(promotionPurchasesTable.promotionTypeId, promotionTypesTable.id))
      .orderBy(desc(promotionPurchasesTable.createdAt))
      .limit(200);

    if (statusFilter && statusFilter !== "all") {
      (query as any).where = undefined; // reset — use filtered version below
      const filtered = await db
        .select({
          id: promotionPurchasesTable.id,
          userId: promotionPurchasesTable.userId,
          propertyId: promotionPurchasesTable.propertyId,
          promotionTypeId: promotionPurchasesTable.promotionTypeId,
          promotionId: promotionPurchasesTable.promotionId,
          status: promotionPurchasesTable.status,
          paymentMethod: promotionPurchasesTable.paymentMethod,
          priceAtPurchase: promotionPurchasesTable.priceAtPurchase,
          vatAmount: promotionPurchasesTable.vatAmount,
          totalAmount: promotionPurchasesTable.totalAmount,
          durationDays: promotionPurchasesTable.durationDays,
          paymentReference: promotionPurchasesTable.paymentReference,
          adminNote: promotionPurchasesTable.adminNote,
          approvedAt: promotionPurchasesTable.approvedAt,
          expiresAt: promotionPurchasesTable.expiresAt,
          createdAt: promotionPurchasesTable.createdAt,
          propertyTitle: propertiesTable.title,
          userName: usersTable.name,
          userEmail: usersTable.email,
          typeNameAr: promotionTypesTable.nameAr,
          typeKey: promotionTypesTable.key,
          typeBadgeBgColor: promotionTypesTable.badgeBgColor,
          typeBadgeColor: promotionTypesTable.badgeColor,
        })
        .from(promotionPurchasesTable)
        .leftJoin(propertiesTable, eq(promotionPurchasesTable.propertyId, propertiesTable.id))
        .leftJoin(usersTable, eq(promotionPurchasesTable.userId, usersTable.id))
        .leftJoin(promotionTypesTable, eq(promotionPurchasesTable.promotionTypeId, promotionTypesTable.id))
        .where(eq(promotionPurchasesTable.status, statusFilter))
        .orderBy(desc(promotionPurchasesTable.createdAt))
        .limit(200);
      return res.json({ success: true, data: filtered });
    }

    const purchases = await query;
    res.json({ success: true, data: purchases });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Admin: POST /api/admin/promotion-purchases/:id/approve ────────────────────

router.post("/admin/promotion-purchases/:id/approve", async (req, res) => {
  try {
    const adminId = await requireAdminId(req);
    if (!adminId) return res.status(403).json({ success: false, error: "غير مصرح" });

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ success: false, error: "معرّف غير صالح" });

    const { adminNote } = req.body ?? {};

    // Fetch purchase
    const [purchase] = await db
      .select()
      .from(promotionPurchasesTable)
      .where(eq(promotionPurchasesTable.id, id));

    if (!purchase) return res.status(404).json({ success: false, error: "الطلب غير موجود" });
    if (purchase.status !== "pending") {
      return res.status(400).json({ success: false, error: `الطلب بالحالة "${purchase.status}" — يمكن الموافقة على المعلق فقط` });
    }

    // Fetch promotion type for boost score
    const [pType] = await db
      .select()
      .from(promotionTypesTable)
      .where(eq(promotionTypesTable.id, purchase.promotionTypeId));

    // Deactivate any existing promotion of same type on same property
    await db
      .update(propertyPromotionsTable)
      .set({ isActive: false })
      .where(
        and(
          eq(propertyPromotionsTable.propertyId, purchase.propertyId),
          eq(propertyPromotionsTable.type, pType?.key ?? "bump_up"),
          eq(propertyPromotionsTable.isActive, true),
        )
      );

    const durationDays = purchase.durationDays ?? pType?.durationDays ?? 7;
    const expiresAt = new Date(Date.now() + durationDays * 86400_000);

    // Create property_promotions record
    const [promo] = await db.insert(propertyPromotionsTable).values({
      propertyId: purchase.propertyId,
      userId: purchase.userId,
      type: pType?.key ?? "bump_up",
      source: "paid",
      boostScore: pType?.boostScore ?? 200,
      expiresAt,
      isActive: true,
    }).returning();

    // If featured_homepage, mark the property as featured
    if (pType?.key === "featured_homepage") {
      await db.update(propertiesTable).set({ featured: true }).where(eq(propertiesTable.id, purchase.propertyId));
    }
    // If urgent_badge, mark the property as urgent
    if (pType?.key === "urgent_badge") {
      await db.update(propertiesTable).set({ urgent: true }).where(eq(propertiesTable.id, purchase.propertyId));
    }

    // Update purchase
    await db
      .update(promotionPurchasesTable)
      .set({
        status: "active",
        promotionId: promo.id,
        approvedAt: new Date(),
        approvedBy: adminId,
        expiresAt,
        adminNote: adminNote ?? null,
        updatedAt: new Date(),
      })
      .where(eq(promotionPurchasesTable.id, id));

    // Notify user
    const [property] = await db.select({ title: propertiesTable.title }).from(propertiesTable).where(eq(propertiesTable.id, purchase.propertyId));
    await notifyUser(
      purchase.userId,
      "✅ تمت الموافقة على ترقيتك!",
      `تم تفعيل ترقية "${pType?.nameAr ?? "الترقية"}" على عقارك "${property?.title ?? `#${purchase.propertyId}`}". ستنتهي الترقية بتاريخ ${expiresAt.toLocaleDateString("ar-EG")}.`,
      "promotion",
      "/dashboard/promotions",
    );

    res.json({ success: true, data: { promotionId: promo.id, expiresAt }, message: "تمت الموافقة وتفعيل الترقية" });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Admin: POST /api/admin/promotion-purchases/:id/reject ─────────────────────

router.post("/admin/promotion-purchases/:id/reject", async (req, res) => {
  try {
    const adminId = await requireAdminId(req);
    if (!adminId) return res.status(403).json({ success: false, error: "غير مصرح" });

    const id = parseInt(String(req.params.id), 10);
    if (isNaN(id)) return res.status(400).json({ success: false, error: "معرّف غير صالح" });

    const { adminNote } = req.body ?? {};

    const [purchase] = await db
      .select()
      .from(promotionPurchasesTable)
      .where(eq(promotionPurchasesTable.id, id));

    if (!purchase) return res.status(404).json({ success: false, error: "الطلب غير موجود" });
    if (purchase.status !== "pending") {
      return res.status(400).json({ success: false, error: "يمكن رفض الطلبات المعلقة فقط" });
    }

    await db
      .update(promotionPurchasesTable)
      .set({ status: "rejected", adminNote: adminNote ?? null, updatedAt: new Date() })
      .where(eq(promotionPurchasesTable.id, id));

    // Fetch type name for notification
    const [pType] = await db.select({ nameAr: promotionTypesTable.nameAr }).from(promotionTypesTable).where(eq(promotionTypesTable.id, purchase.promotionTypeId));
    const [property] = await db.select({ title: propertiesTable.title }).from(propertiesTable).where(eq(propertiesTable.id, purchase.propertyId));

    await notifyUser(
      purchase.userId,
      "❌ تم رفض طلب الترقية",
      `تم رفض طلب ترقية "${pType?.nameAr ?? "الترقية"}" على عقارك "${property?.title ?? `#${purchase.propertyId}`}".${adminNote ? ` السبب: ${adminNote}` : ""} يمكنك إعادة التقديم أو التواصل معنا.`,
      "promotion",
      "/dashboard/promotions",
    );

    res.json({ success: true, message: "تم رفض الطلب وإعلام المستخدم" });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ── Admin: GET /api/admin/promotion-purchases/revenue ─────────────────────────

router.get("/admin/promotion-purchases/revenue", async (req, res) => {
  try {
    const adminId = await requireAdminId(req);
    if (!adminId) return res.status(403).json({ success: false, error: "غير مصرح" });

    // Revenue by type (active + expired = completed)
    const byType = await db
      .select({
        typeNameAr: promotionTypesTable.nameAr,
        typeKey: promotionTypesTable.key,
        typeBadgeBgColor: promotionTypesTable.badgeBgColor,
        count: sql<number>`COUNT(*)`,
        revenue: sql<number>`COALESCE(SUM(CAST(${promotionPurchasesTable.totalAmount} AS numeric)), 0)`,
      })
      .from(promotionPurchasesTable)
      .leftJoin(promotionTypesTable, eq(promotionPurchasesTable.promotionTypeId, promotionTypesTable.id))
      .where(inArray(promotionPurchasesTable.status, ["active", "expired"]))
      .groupBy(promotionTypesTable.nameAr, promotionTypesTable.key, promotionTypesTable.badgeBgColor)
      .orderBy(sql`SUM(CAST(${promotionPurchasesTable.totalAmount} AS numeric)) DESC`);

    // Summary stats
    const [summary] = await db
      .select({
        totalRevenue: sql<number>`COALESCE(SUM(CAST(${promotionPurchasesTable.totalAmount} AS numeric)) FILTER (WHERE ${promotionPurchasesTable.status} IN ('active','expired')), 0)`,
        pendingCount: sql<number>`COUNT(*) FILTER (WHERE ${promotionPurchasesTable.status} = 'pending')`,
        activeCount: sql<number>`COUNT(*) FILTER (WHERE ${promotionPurchasesTable.status} = 'active')`,
        expiredCount: sql<number>`COUNT(*) FILTER (WHERE ${promotionPurchasesTable.status} = 'expired')`,
        rejectedCount: sql<number>`COUNT(*) FILTER (WHERE ${promotionPurchasesTable.status} = 'rejected')`,
        cancelledCount: sql<number>`COUNT(*) FILTER (WHERE ${promotionPurchasesTable.status} = 'cancelled')`,
      })
      .from(promotionPurchasesTable);

    res.json({ success: true, data: { summary, byType } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
