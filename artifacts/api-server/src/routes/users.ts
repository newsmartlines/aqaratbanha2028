import { Router, type Request } from "express";
import { db } from "@workspace/db";
import { usersTable, subscriptionsTable, billingPlansTable, packagesTable, notificationsTable, paymentsTable } from "@workspace/db";
import { eq, ne, and, desc } from "drizzle-orm";
import { getSession } from "./auth";

const router = Router();

async function sessionUserId(req: Request): Promise<number | null> {
  const token =
    (req.cookies as Record<string, string> | undefined)?.session ??
    (req.headers.authorization as string | undefined)?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  return (await getSession(token))?.userId ?? null;
}

router.get("/users", async (_req, res) => {
  try {
    const users = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        phone: usersTable.phone,
        role: usersTable.role,
        avatar: usersTable.avatar,
        status: usersTable.status,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(ne(usersTable.role, "admin"))
      .orderBy(usersTable.createdAt);
    res.json({ success: true, data: users });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch users" });
  }
});

router.get("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [user] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        phone: usersTable.phone,
        role: usersTable.role,
        avatar: usersTable.avatar,
        status: usersTable.status,
        createdAt: usersTable.createdAt,
      })
      .from(usersTable)
      .where(eq(usersTable.id, id));
    if (!user) return res.status(404).json({ success: false, error: "User not found" });
    res.json({ success: true, data: user });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch user" });
  }
});

router.put("/users/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    if (Number.isNaN(id)) return res.status(400).json({ success: false, error: "معرّف غير صالح" });

    const sid = await sessionUserId(req);
    if (sid == null) return res.status(401).json({ success: false, error: "يجب تسجيل الدخول" });
    const [row] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, sid));
    if (sid !== id && row?.role !== "admin") {
      return res.status(403).json({ success: false, error: "لا يمكنك تعديل حساب مستخدم آخر" });
    }

    const { name, email, phone, avatar, regionId, cityId } = req.body ?? {};
    const patch: Record<string, unknown> = {};
    if (name !== undefined) patch.name = String(name).trim();
    if (email !== undefined) patch.email = String(email).trim().toLowerCase();
    if (phone !== undefined) patch.phone = phone ? String(phone).trim() : null;
    if (avatar !== undefined) patch.avatar = avatar ? String(avatar) : null;
    if (regionId !== undefined) {
      const r = parseInt(String(regionId), 10);
      patch.regionId = Number.isFinite(r) && r > 0 ? r : null;
    }
    if (cityId !== undefined) {
      const c = parseInt(String(cityId), 10);
      patch.cityId = Number.isFinite(c) && c > 0 ? c : null;
    }

    if (Object.keys(patch).length === 0) {
      return res.status(400).json({ success: false, error: "لا توجد حقول للتحديث" });
    }

    if (patch.email) {
      const [dup] = await db
        .select({ id: usersTable.id })
        .from(usersTable)
        .where(and(eq(usersTable.email, patch.email as string), ne(usersTable.id, id)))
        .limit(1);
      if (dup) return res.status(409).json({ success: false, error: "البريد الإلكتروني مستخدم مسبقاً" });
    }

    const [updated] = await db
      .update(usersTable)
      .set(patch as Partial<{ name: string; email: string; phone: string | null; avatar: string | null }>)
      .where(eq(usersTable.id, id))
      .returning({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        phone: usersTable.phone,
        role: usersTable.role,
        avatar: usersTable.avatar,
        status: usersTable.status,
        createdAt: usersTable.createdAt,
        regionId: usersTable.regionId,
        cityId: usersTable.cityId,
      });
    if (!updated) return res.status(404).json({ success: false, error: "Not found" });
    return res.json({ success: true, data: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update user";
    const dup =
      typeof err === "object" &&
      err !== null &&
      ("code" in err && (err as { code?: string }).code === "23505");
    if (dup) return res.status(409).json({ success: false, error: "البريد الإلكتروني مستخدم مسبقاً" });
    return res.status(500).json({ success: false, error: msg });
  }
});

router.patch("/users/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status } = req.body;
    const allowed = ["active", "suspended"];
    if (!allowed.includes(status)) return res.status(400).json({ success: false, error: "Invalid status" });
    const [updated] = await db
      .update(usersTable)
      .set({ status })
      .where(eq(usersTable.id, id))
      .returning({ id: usersTable.id, status: usersTable.status });
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update user status" });
  }
});

router.delete("/users/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(usersTable).where(eq(usersTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete user" });
  }
});

// ── User Subscription Endpoints ───────────────────────────────────────────────

// GET /users/:userId/subscriptions-history
router.get("/users/:userId/subscriptions-history", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!Number.isFinite(userId) || userId < 1)
      return res.status(400).json({ success: false, error: "معرّف المستخدم غير صالح" });

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
        billingPlanId: subscriptionsTable.billingPlanId,
        packageId: subscriptionsTable.packageId,
        packageNameAr: packagesTable.nameAr,
        packagePrice: packagesTable.price,
        packageDurationDays: packagesTable.durationDays,
        bpNameAr: billingPlansTable.nameAr,
        bpPrice: billingPlansTable.price,
        bpDurationDays: billingPlansTable.durationDays,
        bpLimits: billingPlansTable.limits,
      })
      .from(subscriptionsTable)
      .leftJoin(packagesTable, eq(subscriptionsTable.packageId, packagesTable.id))
      .leftJoin(billingPlansTable, eq(subscriptionsTable.billingPlanId, billingPlansTable.id))
      .where(eq(subscriptionsTable.userId, userId))
      .orderBy(desc(subscriptionsTable.createdAt));

    const now = Date.now();
    const data = rows.map(s => {
      const resolvedNameAr = s.billingPlanId ? (s.bpNameAr ?? s.planNameAr) : (s.packageNameAr ?? s.planNameAr);
      const resolvedPrice = s.billingPlanId ? s.bpPrice : (s.packagePrice ?? s.planPrice);
      const resolvedDurationDays = s.billingPlanId ? (s.bpDurationDays ?? 30) : (s.packageDurationDays ?? 30);
      let maxListings: number | null = null;
      if (s.bpLimits) { try { maxListings = JSON.parse(s.bpLimits).properties ?? null; } catch { /* */ } }
      return {
        id: s.id,
        planNameAr: resolvedNameAr,
        planPrice: resolvedPrice,
        durationDays: resolvedDurationDays,
        maxListings,
        startDate: s.startDate,
        endDate: s.endDate,
        status: s.status,
        createdAt: s.createdAt,
        isActive: s.status === "active" && new Date(s.endDate).getTime() > now,
      };
    });
    res.json({ success: true, data });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch subscription history" });
  }
});

// POST /users/:userId/subscribe — user subscribes to a billing plan (free or paid)
router.post("/users/:userId/subscribe", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!Number.isFinite(userId) || userId < 1)
      return res.status(400).json({ success: false, error: "معرّف المستخدم غير صالح" });

    const { billingPlanId } = req.body;
    if (!billingPlanId) return res.status(400).json({ success: false, error: "يجب اختيار باقة" });

    const bpId = parseInt(String(billingPlanId), 10);
    if (!Number.isFinite(bpId)) return res.status(400).json({ success: false, error: "معرّف الباقة غير صالح" });

    const [bp] = await db.select().from(billingPlansTable).where(eq(billingPlansTable.id, bpId));
    if (!bp) return res.status(404).json({ success: false, error: "الباقة غير موجودة" });

    const requestedPrice = parseFloat(String(bp.price ?? "0"));

    if (requestedPrice === 0) {
      const existing = await db
        .select({ id: subscriptionsTable.id })
        .from(subscriptionsTable)
        .where(eq(subscriptionsTable.userId, userId))
        .limit(1);
      if (existing.length > 0)
        return res.status(409).json({ success: false, error: "لا يمكن تفعيل الباقة المجانية أكثر من مرة" });
    }

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + (bp.durationDays ?? 30) * 24 * 60 * 60 * 1000);

    const [sub] = await db
      .insert(subscriptionsTable)
      .values({
        userId,
        billingPlanId: bp.id,
        planName: bp.name,
        planNameAr: bp.nameAr ?? bp.name,
        planPrice: String(bp.price ?? "0"),
        startDate,
        endDate,
        status: "active",
      })
      .returning();

    const [userRow] = await db.select({ name: usersTable.name }).from(usersTable).where(eq(usersTable.id, userId));
    const userName = userRow?.name ?? "مستخدم";

    await db.insert(notificationsTable).values({
      userId,
      title: "تم تفعيل الاشتراك",
      message: `تم تفعيل باقة ${bp.nameAr ?? bp.name} بنجاح لمدة ${bp.durationDays} يوم.`,
      type: "subscription",
    }).catch(() => {});

    await db.insert(notificationsTable).values({
      userId: null as any,
      title: "اشتراك جديد",
      message: `المستخدم "${userName}" اشترك في باقة ${bp.nameAr ?? bp.name}.`,
      type: "subscription",
      link: "/admin/subscriptions",
    }).catch(() => {});

    // Record a payment entry so it appears in admin payments dashboard
    await db.insert(paymentsTable).values({
      userId,
      providerId: null,
      type: "subscription",
      amount: String(bp.price ?? "0"),
      status: "paid",
      invoiceId: `USER-SUB-${sub.id}`,
      planName: bp.nameAr ?? bp.name,
    }).catch(() => {});

    res.json({ success: true, data: { subscription: sub } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "فشل تفعيل الاشتراك" });
  }
});

// GET /users/:userId/current-subscription — active subscription for a user
router.get("/users/:userId/current-subscription", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId, 10);
    if (!Number.isFinite(userId) || userId < 1)
      return res.status(400).json({ success: false, error: "معرّف المستخدم غير صالح" });

    const now = new Date();
    const rows = await db
      .select({
        id: subscriptionsTable.id,
        planNameAr: subscriptionsTable.planNameAr,
        planPrice: subscriptionsTable.planPrice,
        startDate: subscriptionsTable.startDate,
        endDate: subscriptionsTable.endDate,
        status: subscriptionsTable.status,
        billingPlanId: subscriptionsTable.billingPlanId,
        bpNameAr: billingPlansTable.nameAr,
        bpPrice: billingPlansTable.price,
        bpDurationDays: billingPlansTable.durationDays,
        bpLimits: billingPlansTable.limits,
        bpFeatures: billingPlansTable.features,
        bpColor: billingPlansTable.color,
      })
      .from(subscriptionsTable)
      .leftJoin(billingPlansTable, eq(subscriptionsTable.billingPlanId, billingPlansTable.id))
      .where(and(eq(subscriptionsTable.userId, userId), eq(subscriptionsTable.status, "active")))
      .orderBy(desc(subscriptionsTable.createdAt))
      .limit(1);

    if (!rows.length) return res.json({ success: true, data: null });

    const s = rows[0];
    const durationDays = s.bpDurationDays ?? 30;
    const endMs = new Date(s.endDate).getTime();
    const daysLeft = Math.max(0, Math.ceil((endMs - Date.now()) / 86400000));
    const isActive = s.status === "active" && endMs > Date.now();
    const nameAr = s.billingPlanId ? (s.bpNameAr ?? s.planNameAr) : s.planNameAr;
    const price = s.billingPlanId ? s.bpPrice : s.planPrice;

    res.json({
      success: true,
      data: {
        id: s.id,
        billingPlanId: s.billingPlanId,
        packageNameAr: nameAr,
        packagePrice: price,
        durationDays,
        startDate: s.startDate,
        endDate: s.endDate,
        status: s.status,
        isActive,
        daysLeft,
        limits: s.bpLimits ? (() => { try { return JSON.parse(s.bpLimits!); } catch { return null; } })() : null,
        features: s.bpFeatures ? (() => { try { return JSON.parse(s.bpFeatures!); } catch { return null; } })() : null,
        color: s.bpColor,
      },
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch subscription" });
  }
});

export default router;
