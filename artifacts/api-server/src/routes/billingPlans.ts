import { Router } from "express";
import { db } from "@workspace/db";
import {
  billingPlansTable, couponsTable,
  subscriptionsTable, paymentTransactionsTable,
} from "@workspace/db";
import { eq, desc, sum, count, or, and } from "drizzle-orm";
import { autoExportGroup } from "../lib/auto-export";

const router = Router();

// ── Write-through: auto-export seed files after any successful billing mutation
router.use((req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    res.on("finish", () => {
      if (res.statusCode < 400) autoExportGroup("billing");
    });
  }
  next();
});

// ── Public endpoint: active plans for providers ───────────────────────────────

router.get("/billing/plans", async (req, res) => {
  try {
    const { userType } = req.query as { userType?: string };
    const plans = await db
      .select()
      .from(billingPlansTable)
      .where(
        and(
          eq(billingPlansTable.status, "active"),
          userType
            ? or(
                eq(billingPlansTable.userType, "all"),
                eq(billingPlansTable.userType, userType)
              )
            : undefined
        )
      )
      .orderBy(billingPlansTable.sortOrder);
    res.json({ success: true, data: plans });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// ── Plans ────────────────────────────────────────────────────────────────────

router.get("/admin/billing/plans", async (_req, res) => {
  try {
    const plans = await db.select().from(billingPlansTable).orderBy(billingPlansTable.sortOrder);
    res.json({ success: true, data: plans });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

function sanitizePlanBody(raw: any) {
  const body = { ...raw };
  if (typeof body.limits === "object") body.limits = JSON.stringify(body.limits);
  if (typeof body.features === "object") body.features = JSON.stringify(body.features);
  // Convert empty strings to null for numeric / optional fields
  const numericNullable = ["yearlyPrice", "yearly_price", "trialDays", "trial_days", "minAmount", "min_amount"];
  for (const field of numericNullable) {
    if (body[field] === "" || body[field] === undefined) body[field] = null;
  }
  // Strip date fields — the frontend sends them as ISO strings which Drizzle
  // can't serialize back to timestamps. updatedAt is set explicitly in the handler.
  delete body.createdAt;
  delete body.updatedAt;
  // Remove any non-schema keys that might have leaked in
  delete body.description; // not in insert (has a default)
  return body;
}

router.post("/admin/billing/plans", async (req, res) => {
  try {
    const body = sanitizePlanBody(req.body);
    const [plan] = await db.insert(billingPlansTable).values(body).returning();
    res.json({ success: true, data: plan });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.put("/admin/billing/plans/:id", async (req, res) => {
  try {
    const body = { ...sanitizePlanBody(req.body), updatedAt: new Date() };
    const [plan] = await db.update(billingPlansTable).set(body).where(eq(billingPlansTable.id, Number(req.params.id))).returning();
    res.json({ success: true, data: plan });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.delete("/admin/billing/plans/:id", async (req, res) => {
  try {
    await db.delete(billingPlansTable).where(eq(billingPlansTable.id, Number(req.params.id)));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.post("/admin/billing/plans/:id/duplicate", async (req, res) => {
  try {
    const [orig] = await db.select().from(billingPlansTable).where(eq(billingPlansTable.id, Number(req.params.id)));
    if (!orig) return res.status(404).json({ success: false, error: "Not found" });
    const { id: _id, createdAt: _c, updatedAt: _u, ...rest } = orig;
    const [dup] = await db.insert(billingPlansTable).values({
      ...rest,
      name: `${rest.name} (نسخة)`,
      nameAr: rest.nameAr ? `${rest.nameAr} (نسخة)` : null,
      isRecommended: false, isMostPopular: false, status: "inactive",
    }).returning();
    res.json({ success: true, data: dup });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.patch("/admin/billing/plans/:id/toggle", async (req, res) => {
  try {
    const [p] = await db.select({ status: billingPlansTable.status }).from(billingPlansTable).where(eq(billingPlansTable.id, Number(req.params.id)));
    const newStatus = p?.status === "active" ? "inactive" : "active";
    const [updated] = await db.update(billingPlansTable).set({ status: newStatus, updatedAt: new Date() }).where(eq(billingPlansTable.id, Number(req.params.id))).returning();
    res.json({ success: true, data: updated });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});


// ── Coupons ───────────────────────────────────────────────────────────────────

router.get("/admin/billing/coupons", async (_req, res) => {
  try {
    const coupons = await db.select().from(couponsTable).orderBy(desc(couponsTable.createdAt));
    res.json({ success: true, data: coupons });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.post("/admin/billing/coupons", async (req, res) => {
  try {
    const body = { ...req.body };
    if (typeof body.applicablePlans === "object") body.applicablePlans = JSON.stringify(body.applicablePlans);
    const [coupon] = await db.insert(couponsTable).values(body).returning();
    res.json({ success: true, data: coupon });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.put("/admin/billing/coupons/:id", async (req, res) => {
  try {
    const body = { ...req.body };
    if (typeof body.applicablePlans === "object") body.applicablePlans = JSON.stringify(body.applicablePlans);
    const [coupon] = await db.update(couponsTable).set(body).where(eq(couponsTable.id, Number(req.params.id))).returning();
    res.json({ success: true, data: coupon });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

router.delete("/admin/billing/coupons/:id", async (req, res) => {
  try {
    await db.delete(couponsTable).where(eq(couponsTable.id, Number(req.params.id)));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// ── Dashboard ─────────────────────────────────────────────────────────────────

router.get("/admin/billing/dashboard", async (_req, res) => {
  try {
    const [revRow] = await db.select({ total: sum(paymentTransactionsTable.amount) })
      .from(paymentTransactionsTable).where(eq(paymentTransactionsTable.status, "paid"));
    const [subRow] = await db.select({ cnt: count() }).from(subscriptionsTable);
    const plans = await db.select().from(billingPlansTable).where(eq(billingPlansTable.status, "active"));
    const allPlans = await db.select().from(billingPlansTable);
    res.json({
      success: true,
      data: {
        totalRevenue: Number(revRow?.total ?? 0),
        subscriptionsCount: Number(subRow?.cnt ?? 0),
        activePlans: plans.length,
        totalPlans: allPlans.length,
        plans: allPlans,
      },
    });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// ── Seed defaults ──────────────────────────────────────────────────────────────

const DEFAULT_PLANS = [
  { name: "Free", nameAr: "مجاني", price: "0", yearlyPrice: "0", currency: "EGP", durationDays: 30, durationType: "monthly", userType: "all", status: "active", isRecommended: false, isMostPopular: false, trialDays: 0, sortOrder: 0, color: "#64748b", commissionPercent: "0", descriptionAr: "الباقة المجانية - ابدأ مجاناً", limits: JSON.stringify({ properties: 3, photos: 10, videos: 0, featuredAds: 0, pinnedAds: 0, messages: 20, leads: 10 }), features: JSON.stringify({ homepageDisplay: false, topSearch: false, verifiedBadge: false, premiumBadge: false, prioritySupport: false, analytics: false, seo: false, aiTools: false, autoBoost: false }) },
  { name: "Bronze", nameAr: "برونز", price: "99", yearlyPrice: "999", currency: "EGP", durationDays: 30, durationType: "monthly", userType: "all", status: "active", isRecommended: false, isMostPopular: true, trialDays: 7, sortOrder: 1, color: "#b45309", commissionPercent: "0", descriptionAr: "باقة البرونز للمبتدئين", limits: JSON.stringify({ properties: 10, photos: 20, videos: 2, featuredAds: 3, pinnedAds: 1, messages: 100, leads: 50 }), features: JSON.stringify({ homepageDisplay: true, topSearch: false, verifiedBadge: false, premiumBadge: false, prioritySupport: false, analytics: true, seo: false, aiTools: false, autoBoost: false }) },
  { name: "Silver", nameAr: "فضي", price: "199", yearlyPrice: "1999", currency: "EGP", durationDays: 30, durationType: "monthly", userType: "broker", status: "active", isRecommended: true, isMostPopular: false, trialDays: 7, sortOrder: 2, color: "#475569", commissionPercent: "0", descriptionAr: "الباقة الفضية للسماسرة", limits: JSON.stringify({ properties: 30, photos: 30, videos: 5, featuredAds: 10, pinnedAds: 3, messages: 500, leads: 200 }), features: JSON.stringify({ homepageDisplay: true, topSearch: true, verifiedBadge: true, premiumBadge: false, prioritySupport: false, analytics: true, seo: true, aiTools: false, autoBoost: false }) },
  { name: "Gold", nameAr: "ذهبي", price: "399", yearlyPrice: "3999", currency: "EGP", durationDays: 30, durationType: "monthly", userType: "company", status: "active", isRecommended: false, isMostPopular: false, trialDays: 14, sortOrder: 3, color: "#ca8a04", commissionPercent: "0", descriptionAr: "الباقة الذهبية للشركات", limits: JSON.stringify({ properties: 100, photos: 50, videos: 10, featuredAds: 30, pinnedAds: 10, messages: -1, leads: -1 }), features: JSON.stringify({ homepageDisplay: true, topSearch: true, verifiedBadge: true, premiumBadge: true, prioritySupport: true, analytics: true, seo: true, aiTools: true, autoBoost: false }) },
  { name: "VIP", nameAr: "VIP", price: "799", yearlyPrice: "7999", currency: "EGP", durationDays: 30, durationType: "monthly", userType: "vip", status: "active", isRecommended: false, isMostPopular: false, trialDays: 14, sortOrder: 4, color: "#7c3aed", commissionPercent: "0", descriptionAr: "باقة VIP - صلاحيات غير محدودة", limits: JSON.stringify({ properties: -1, photos: -1, videos: -1, featuredAds: -1, pinnedAds: -1, messages: -1, leads: -1 }), features: JSON.stringify({ homepageDisplay: true, topSearch: true, verifiedBadge: true, premiumBadge: true, prioritySupport: true, analytics: true, seo: true, aiTools: true, autoBoost: true }) },
];

router.post("/admin/billing/seed", async (_req, res) => {
  try {
    let addedPlans = 0;
    for (const p of DEFAULT_PLANS) {
      const [ex] = await db.select({ id: billingPlansTable.id }).from(billingPlansTable).where(eq(billingPlansTable.name, p.name));
      if (!ex) { await db.insert(billingPlansTable).values(p as any); addedPlans++; }
    }
    res.json({ success: true, addedPlans });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

export default router;
