import { Router } from "express";
import { db } from "@workspace/db";
import {
  adSpotsTable, adAdvertisersTable, adCampaignsTable, adInvoicesTable, adEventsTable,
} from "@workspace/db";
import { eq, asc, desc, sql, and, gte, lte, between, inArray, isNull } from "drizzle-orm";
import { getSession } from "./auth";
import crypto from "crypto";

const router = Router();

/* ════════════════════════════════════════════════════════════════════════════
   HELPERS
════════════════════════════════════════════════════════════════════════════ */

/** Detect device type from User-Agent */
function detectDevice(ua: string): "desktop" | "tablet" | "mobile" {
  if (/tablet|ipad|playbook|silk/i.test(ua)) return "tablet";
  if (/mobile|iphone|ipod|android.*mobile|blackberry|opera mini/i.test(ua)) return "mobile";
  return "desktop";
}

/** Hash IP for privacy-safe deduplication */
function hashIp(ip: string): string {
  return crypto.createHash("sha256").update(ip + process.env.SESSION_SECRET).digest("hex").slice(0, 16);
}

/** Check if an ad's schedule is currently active */
function isScheduleActive(ad: any): boolean {
  const now = new Date();

  if (ad.scheduleStartDate && new Date(ad.scheduleStartDate) > now) return false;
  if (ad.scheduleEndDate && new Date(ad.scheduleEndDate) < now) return false;

  if (ad.scheduleTimeFrom && ad.scheduleTimeTo) {
    const [fh, fm] = (ad.scheduleTimeFrom as string).split(":").map(Number);
    const [th, tm] = (ad.scheduleTimeTo as string).split(":").map(Number);
    const minuteNow = now.getHours() * 60 + now.getMinutes();
    const minuteFrom = fh * 60 + fm;
    const minuteTo = th * 60 + tm;
    if (minuteNow < minuteFrom || minuteNow > minuteTo) return false;
  }

  return true;
}

/** Apply targeting filters based on request context */
function matchesTargeting(ad: any, ctx: {
  device?: string; userType?: string; planId?: number;
  governorate?: string; city?: string; language?: string;
  listingType?: string; categorySlug?: string;
}): boolean {
  // Device targeting
  if (ad.targetDevices) {
    try {
      const devs: string[] = JSON.parse(ad.targetDevices);
      if (devs.length > 0 && ctx.device && !devs.includes(ctx.device)) return false;
    } catch {}
  }

  // User type targeting
  if (ad.targetUserType && ad.targetUserType !== "all") {
    if (ad.targetUserType === "logged_in" && ctx.userType !== "logged_in") return false;
    if (ad.targetUserType === "guests" && ctx.userType !== "guest") return false;
  }

  // Listing type
  if (ad.targetListingType && ad.targetListingType !== "both" && ctx.listingType) {
    if (ad.targetListingType !== ctx.listingType) return false;
  }

  // Language
  if (ad.targetLanguage && ad.targetLanguage !== "both" && ctx.language) {
    if (ad.targetLanguage !== ctx.language) return false;
  }

  // Categories
  if (ad.targetCategories && ctx.categorySlug) {
    try {
      const cats: string[] = JSON.parse(ad.targetCategories);
      if (cats.length > 0 && !cats.includes(ctx.categorySlug)) return false;
    } catch {}
  }

  // Subscription plan
  if (ad.targetSubscriptionPlans && ctx.planId !== undefined) {
    try {
      const plans: number[] = JSON.parse(ad.targetSubscriptionPlans);
      if (plans.length > 0 && !plans.includes(ctx.planId)) return false;
    } catch {}
  }

  return true;
}

/* ════════════════════════════════════════════════════════════════════════════
   DEFAULT AD POSITIONS SEED
════════════════════════════════════════════════════════════════════════════ */
export const AD_POSITIONS = [
  { position: "hero_bottom",            name: "بانر الهيرو السفلي",          displayType: "leaderboard" },
  { position: "homepage_mid",           name: "بانر منتصف الرئيسية",         displayType: "leaderboard" },
  { position: "homepage_before_footer", name: "بانر قبل الفوتر",             displayType: "leaderboard" },
  { position: "search_top",            name: "بانر أعلى نتائج البحث",        displayType: "leaderboard" },
  { position: "search_inline",         name: "إعلان داخل نتائج البحث",       displayType: "native"      },
  { position: "property_sidebar",      name: "بانر الشريط الجانبي للعقار",   displayType: "box"         },
  { position: "property_bottom",       name: "بانر أسفل تفاصيل العقار",      displayType: "leaderboard" },
  { position: "categories_top",        name: "بانر أعلى صفحة التصنيفات",    displayType: "leaderboard" },
] as const;

/* ════════════════════════════════════════════════════════════════════════════
   PUBLIC ROUTES
════════════════════════════════════════════════════════════════════════════ */

/** GET /api/ads — fetch active ads with targeting + scheduling */
router.get("/ads", async (req, res) => {
  try {
    const session = await getSession(req);
    const ua = req.headers["user-agent"] || "";
    const device = detectDevice(ua);
    const userType = session?.userId ? "logged_in" : "guest";
    const planId = session?.planId as number | undefined;
    const lang = (req.query.lang as string) || "both";
    const listingType = req.query.listingType as string | undefined;
    const categorySlug = req.query.category as string | undefined;
    const positions = req.query.positions as string | undefined;
    const abGroup = req.query.ab as string | undefined;

    const rows = await db
      .select()
      .from(adSpotsTable)
      .where(eq(adSpotsTable.isActive, true))
      .orderBy(desc(adSpotsTable.priority), asc(adSpotsTable.sortOrder));

    const ctx = { device, userType, planId, language: lang, listingType, categorySlug };

    let filtered = rows
      .filter(ad => isScheduleActive(ad))
      .filter(ad => matchesTargeting(ad, ctx));

    if (positions) {
      const pos = positions.split(",");
      filtered = filtered.filter(r => pos.includes(r.position));
    }

    // A/B testing: filter to matching variant or no variant
    if (abGroup) {
      filtered = filtered.filter(ad =>
        !ad.abTestGroupId || ad.abTestVariant === abGroup || ad.abTestVariant === null
      );
    }

    // For each position, apply weighted rotation if multiple ads exist
    const byPosition: Record<string, typeof filtered> = {};
    for (const ad of filtered) {
      if (!byPosition[ad.position]) byPosition[ad.position] = [];
      byPosition[ad.position].push(ad);
    }

    const result: typeof filtered = [];
    for (const [, candidates] of Object.entries(byPosition)) {
      if (candidates.length === 1) {
        result.push(candidates[0]);
        continue;
      }
      // Weighted random selection
      const totalWeight = candidates.reduce((s, a) => s + (a.weight ?? 100), 0);
      let rand = Math.random() * totalWeight;
      for (const ad of candidates) {
        rand -= (ad.weight ?? 100);
        if (rand <= 0) { result.push(ad); break; }
      }
    }

    res.json({ success: true, data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

/** POST /api/ads/:id/impression */
router.post("/ads/:id/impression", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const ua = req.headers["user-agent"] || "";
    const device = detectDevice(ua);
    const ip = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "").split(",")[0].trim();
    const ipHash = hashIp(ip);
    const session = await getSession(req);
    const abVariant = req.body?.abVariant;

    await Promise.all([
      db.update(adSpotsTable)
        .set({
          impressions: sql`${adSpotsTable.impressions} + 1`,
          lastImpression: new Date(),
        })
        .where(eq(adSpotsTable.id, id)),

      db.insert(adEventsTable).values({
        adSpotId: id,
        eventType: "impression",
        userId: session?.userId ? Number(session.userId) : undefined,
        deviceType: device,
        userAgent: ua.slice(0, 500),
        ipHash,
        abVariant,
      }),
    ]);

    res.json({ ok: true });
  } catch { res.json({ ok: false }); }
});

/** POST /api/ads/:id/click */
router.post("/ads/:id/click", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const ua = req.headers["user-agent"] || "";
    const device = detectDevice(ua);
    const ip = (req.headers["x-forwarded-for"] as string || req.socket.remoteAddress || "").split(",")[0].trim();
    const ipHash = hashIp(ip);
    const session = await getSession(req);
    const abVariant = req.body?.abVariant;

    await Promise.all([
      db.update(adSpotsTable)
        .set({
          clicks: sql`${adSpotsTable.clicks} + 1`,
          lastClick: new Date(),
        })
        .where(eq(adSpotsTable.id, id)),

      db.insert(adEventsTable).values({
        adSpotId: id,
        eventType: "click",
        userId: session?.userId ? Number(session.userId) : undefined,
        deviceType: device,
        userAgent: ua.slice(0, 500),
        ipHash,
        abVariant,
      }),
    ]);

    res.json({ ok: true });
  } catch { res.json({ ok: false }); }
});

/* ════════════════════════════════════════════════════════════════════════════
   ADMIN — AD SPOTS
════════════════════════════════════════════════════════════════════════════ */

/** GET /api/admin/ads */
router.get("/admin/ads", async (req, res) => {
  try {
    const rows = await db.select().from(adSpotsTable).orderBy(desc(adSpotsTable.priority), asc(adSpotsTable.sortOrder));
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

/** GET /api/admin/ads/:id */
router.get("/admin/ads/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const [row] = await db.select().from(adSpotsTable).where(eq(adSpotsTable.id, id));
    if (!row) return res.status(404).json({ success: false, error: "not found" });
    res.json({ success: true, data: row });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

/** POST /api/admin/ads */
router.post("/admin/ads", async (req, res) => {
  try {
    const b = req.body;
    const [row] = await db.insert(adSpotsTable).values({
      name:        b.name,
      position:    b.position,
      isActive:    b.isActive ?? false,
      contentType: b.contentType ?? "banner",
      displayType: b.displayType ?? "leaderboard",
      sortOrder:   b.sortOrder ?? 0,
      priority:    b.priority ?? 5,
      weight:      b.weight ?? 100,
      rotationType: b.rotationType ?? "weighted",
      // banner / internal
      title: b.title ?? null, subtitle: b.subtitle ?? null,
      imageUrl: b.imageUrl ?? null, linkUrl: b.linkUrl ?? null,
      linkTarget: b.linkTarget ?? "_blank",
      bgColor: b.bgColor ?? "#0d9488", textColor: b.textColor ?? "#ffffff",
      badgeText: b.badgeText ?? null, buttonText: b.buttonText ?? null,
      // html / js
      customHtml: b.customHtml ?? null,
      customJs: b.customJs ?? null,
      // adsense
      adsensePublisherId: b.adsensePublisherId ?? null,
      adsenseSlotId: b.adsenseSlotId ?? null,
      adsenseFormat: b.adsenseFormat ?? "auto",
      adsenseResponsive: b.adsenseResponsive ?? true,
      adsenseAutoAds: b.adsenseAutoAds ?? false,
      // admanager
      admNetworkId: b.admNetworkId ?? null,
      admUnitId: b.admUnitId ?? null,
      admSizes: b.admSizes ?? null,
      // targeting
      targetGovernorates: b.targetGovernorates ?? null,
      targetCities: b.targetCities ?? null,
      targetCategories: b.targetCategories ?? null,
      targetPropertyTypes: b.targetPropertyTypes ?? null,
      targetListingType: b.targetListingType ?? "both",
      targetLanguage: b.targetLanguage ?? "both",
      targetDevices: b.targetDevices ?? null,
      targetUserType: b.targetUserType ?? "all",
      targetSubscriptionPlans: b.targetSubscriptionPlans ?? null,
      // scheduling
      scheduleStartDate: b.scheduleStartDate ? new Date(b.scheduleStartDate) : null,
      scheduleEndDate: b.scheduleEndDate ? new Date(b.scheduleEndDate) : null,
      scheduleTimeFrom: b.scheduleTimeFrom ?? null,
      scheduleTimeTo: b.scheduleTimeTo ?? null,
      scheduleAutoEnable: b.scheduleAutoEnable ?? false,
      // rotation
      frequencyCap: b.frequencyCap ?? null,
      frequencyCapPeriod: b.frequencyCapPeriod ?? "day",
      fallbackAdId: b.fallbackAdId ?? null,
      // A/B
      abTestGroupId: b.abTestGroupId ?? null,
      abTestVariant: b.abTestVariant ?? null,
      // advertiser link
      advertiserId: b.advertiserId ?? null,
      campaignId: b.campaignId ?? null,
    }).returning();
    res.json({ success: true, data: row });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

/** PUT /api/admin/ads/:id */
router.put("/admin/ads/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const b = req.body;
    const [row] = await db.update(adSpotsTable).set({
      name: b.name, position: b.position, isActive: b.isActive,
      contentType: b.contentType, displayType: b.displayType,
      sortOrder: b.sortOrder, priority: b.priority, weight: b.weight,
      rotationType: b.rotationType,
      title: b.title, subtitle: b.subtitle, imageUrl: b.imageUrl,
      linkUrl: b.linkUrl, linkTarget: b.linkTarget,
      bgColor: b.bgColor, textColor: b.textColor,
      badgeText: b.badgeText, buttonText: b.buttonText,
      customHtml: b.customHtml, customJs: b.customJs,
      adsensePublisherId: b.adsensePublisherId,
      adsenseSlotId: b.adsenseSlotId, adsenseFormat: b.adsenseFormat,
      adsenseResponsive: b.adsenseResponsive, adsenseAutoAds: b.adsenseAutoAds,
      admNetworkId: b.admNetworkId, admUnitId: b.admUnitId, admSizes: b.admSizes,
      targetGovernorates: b.targetGovernorates, targetCities: b.targetCities,
      targetCategories: b.targetCategories, targetPropertyTypes: b.targetPropertyTypes,
      targetListingType: b.targetListingType, targetLanguage: b.targetLanguage,
      targetDevices: b.targetDevices, targetUserType: b.targetUserType,
      targetSubscriptionPlans: b.targetSubscriptionPlans,
      scheduleStartDate: b.scheduleStartDate ? new Date(b.scheduleStartDate) : null,
      scheduleEndDate: b.scheduleEndDate ? new Date(b.scheduleEndDate) : null,
      scheduleTimeFrom: b.scheduleTimeFrom, scheduleTimeTo: b.scheduleTimeTo,
      scheduleAutoEnable: b.scheduleAutoEnable,
      frequencyCap: b.frequencyCap, frequencyCapPeriod: b.frequencyCapPeriod,
      fallbackAdId: b.fallbackAdId,
      abTestGroupId: b.abTestGroupId, abTestVariant: b.abTestVariant,
      advertiserId: b.advertiserId, campaignId: b.campaignId,
      updatedAt: new Date(),
    }).where(eq(adSpotsTable.id, id)).returning();
    res.json({ success: true, data: row });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

/** PATCH /api/admin/ads/:id/toggle */
router.patch("/admin/ads/:id/toggle", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const [current] = await db.select({ isActive: adSpotsTable.isActive }).from(adSpotsTable).where(eq(adSpotsTable.id, id));
    const [row] = await db.update(adSpotsTable)
      .set({ isActive: !current?.isActive, updatedAt: new Date() })
      .where(eq(adSpotsTable.id, id)).returning();
    res.json({ success: true, data: row });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

/** DELETE /api/admin/ads/:id */
router.delete("/admin/ads/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    await db.delete(adSpotsTable).where(eq(adSpotsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

/** POST /api/admin/ads/seed */
router.post("/admin/ads/seed", async (req, res) => {
  try {
    const existing = await db.select({ position: adSpotsTable.position }).from(adSpotsTable);
    const existingPos = new Set(existing.map(r => r.position));
    const colors = ["#0d9488","#6366f1","#f59e0b","#ef4444","#3b82f6","#8b5cf6","#ec4899","#14b8a6"];

    const toInsert = AD_POSITIONS
      .filter(p => !existingPos.has(p.position))
      .map((p, i) => ({
        name: p.name, position: p.position, displayType: p.displayType,
        contentType: "banner" as const, isActive: false, sortOrder: i, priority: 5, weight: 100,
        title: `عنوان الإعلان — ${p.name}`,
        subtitle: "نص تعريفي للإعلان — يمكن تعديله من لوحة التحكم",
        bgColor: colors[i % 8], textColor: "#ffffff",
        buttonText: "اعرف أكثر", linkUrl: "#",
        badgeText: "إعلان مدفوع",
      }));

    if (toInsert.length) await db.insert(adSpotsTable).values(toInsert);
    res.json({ success: true, inserted: toInsert.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

/* ════════════════════════════════════════════════════════════════════════════
   ADMIN — STATISTICS & REPORTS
════════════════════════════════════════════════════════════════════════════ */

/** GET /api/admin/ads/:id/stats?from=&to= */
router.get("/admin/ads/:id/stats", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const from = req.query.from ? new Date(req.query.from as string) : new Date(Date.now() - 30 * 86400_000);
    const to = req.query.to ? new Date(req.query.to as string) : new Date();

    const events = await db.select()
      .from(adEventsTable)
      .where(and(
        eq(adEventsTable.adSpotId, id),
        gte(adEventsTable.createdAt, from),
        lte(adEventsTable.createdAt, to),
      ))
      .orderBy(asc(adEventsTable.createdAt));

    // Aggregate by day
    const byDay: Record<string, { impressions: number; clicks: number; revenue: number }> = {};
    for (const ev of events) {
      const day = ev.createdAt.toISOString().slice(0, 10);
      if (!byDay[day]) byDay[day] = { impressions: 0, clicks: 0, revenue: 0 };
      if (ev.eventType === "impression") byDay[day].impressions++;
      if (ev.eventType === "click") byDay[day].clicks++;
      byDay[day].revenue += parseFloat(String(ev.revenue || 0));
    }

    const totalImpressions = events.filter(e => e.eventType === "impression").length;
    const totalClicks = events.filter(e => e.eventType === "click").length;
    const totalRevenue = events.reduce((s, e) => s + parseFloat(String(e.revenue || 0)), 0);
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const rpm = totalImpressions > 0 ? (totalRevenue / totalImpressions) * 1000 : 0;

    // Device breakdown
    const byDevice: Record<string, number> = {};
    for (const ev of events.filter(e => e.eventType === "impression")) {
      const d = ev.deviceType || "unknown";
      byDevice[d] = (byDevice[d] || 0) + 1;
    }

    res.json({
      success: true,
      data: {
        totalImpressions, totalClicks, totalRevenue: totalRevenue.toFixed(4),
        ctr: ctr.toFixed(2), rpm: rpm.toFixed(4),
        byDay: Object.entries(byDay).map(([date, v]) => ({ date, ...v })),
        byDevice,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

/** GET /api/admin/ads/reports/overview */
router.get("/admin/ads/reports/overview", async (req, res) => {
  try {
    const from = req.query.from ? new Date(req.query.from as string) : new Date(Date.now() - 30 * 86400_000);
    const to = req.query.to ? new Date(req.query.to as string) : new Date();

    const [adSpots, events] = await Promise.all([
      db.select().from(adSpotsTable).orderBy(desc(adSpotsTable.impressions)),
      db.select()
        .from(adEventsTable)
        .where(and(gte(adEventsTable.createdAt, from), lte(adEventsTable.createdAt, to)))
        .orderBy(asc(adEventsTable.createdAt)),
    ]);

    const totalImpressions = events.filter(e => e.eventType === "impression").length;
    const totalClicks = events.filter(e => e.eventType === "click").length;
    const totalRevenue = events.reduce((s, e) => s + parseFloat(String(e.revenue || 0)), 0);
    const ctr = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0;
    const rpm = totalImpressions > 0 ? (totalRevenue / totalImpressions) * 1000 : 0;

    // By day
    const byDay: Record<string, { impressions: number; clicks: number }> = {};
    for (const ev of events) {
      const day = ev.createdAt.toISOString().slice(0, 10);
      if (!byDay[day]) byDay[day] = { impressions: 0, clicks: 0 };
      if (ev.eventType === "impression") byDay[day].impressions++;
      if (ev.eventType === "click") byDay[day].clicks++;
    }

    res.json({
      success: true,
      data: {
        totalImpressions, totalClicks, ctr: ctr.toFixed(2),
        totalRevenue: totalRevenue.toFixed(4), rpm: rpm.toFixed(4),
        activeAds: adSpots.filter(a => a.isActive).length,
        totalAds: adSpots.length,
        byDay: Object.entries(byDay).map(([date, v]) => ({ date, ...v })),
        topAds: adSpots.slice(0, 10).map(a => ({
          id: a.id, name: a.name, impressions: a.impressions, clicks: a.clicks,
          ctr: a.impressions ? ((a.clicks ?? 0) / a.impressions * 100).toFixed(2) : "0",
          lastImpression: a.lastImpression, lastClick: a.lastClick,
        })),
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

/** GET /api/admin/ads/reports/export?format=csv&from=&to= */
router.get("/admin/ads/reports/export", async (req, res) => {
  try {
    const from = req.query.from ? new Date(req.query.from as string) : new Date(Date.now() - 30 * 86400_000);
    const to = req.query.to ? new Date(req.query.to as string) : new Date();

    const [spots, events] = await Promise.all([
      db.select().from(adSpotsTable),
      db.select()
        .from(adEventsTable)
        .where(and(gte(adEventsTable.createdAt, from), lte(adEventsTable.createdAt, to))),
    ]);

    const spotsMap = Object.fromEntries(spots.map(s => [s.id, s]));

    // Aggregate
    const byAd: Record<number, { impressions: number; clicks: number; revenue: number }> = {};
    for (const ev of events) {
      if (!byAd[ev.adSpotId]) byAd[ev.adSpotId] = { impressions: 0, clicks: 0, revenue: 0 };
      if (ev.eventType === "impression") byAd[ev.adSpotId].impressions++;
      if (ev.eventType === "click") byAd[ev.adSpotId].clicks++;
      byAd[ev.adSpotId].revenue += parseFloat(String(ev.revenue || 0));
    }

    const rows = spots.map(s => {
      const stats = byAd[s.id] || { impressions: 0, clicks: 0, revenue: 0 };
      const ctr = stats.impressions > 0 ? (stats.clicks / stats.impressions * 100).toFixed(2) : "0";
      const rpm = stats.impressions > 0 ? (stats.revenue / stats.impressions * 1000).toFixed(4) : "0";
      return [
        s.id, s.name, s.position, s.contentType, s.isActive ? "نشط" : "موقوف",
        stats.impressions, stats.clicks, ctr + "%", rpm,
        stats.revenue.toFixed(4), s.lastImpression?.toISOString() || "", s.lastClick?.toISOString() || "",
      ];
    });

    const header = ["ID","الاسم","الموضع","النوع","الحالة","المشاهدات","النقرات","CTR","RPM","الإيراد","آخر مشاهدة","آخر نقرة"];
    const csv = [header, ...rows].map(r => r.map(v => `"${v}"`).join(",")).join("\n");

    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=ads-report-${new Date().toISOString().slice(0,10)}.csv`);
    res.send("\uFEFF" + csv); // BOM for Excel Arabic support
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

/* ════════════════════════════════════════════════════════════════════════════
   ADMIN — ADVERTISERS
════════════════════════════════════════════════════════════════════════════ */

router.get("/admin/advertisers", async (req, res) => {
  try {
    const rows = await db.select().from(adAdvertisersTable).orderBy(desc(adAdvertisersTable.createdAt));
    res.json({ success: true, data: rows });
  } catch (err: any) { res.status(500).json({ success: false, error: err?.message }); }
});

router.post("/admin/advertisers", async (req, res) => {
  try {
    const b = req.body;
    const [row] = await db.insert(adAdvertisersTable).values({
      name: b.name, email: b.email, phone: b.phone ?? null,
      company: b.company ?? null, website: b.website ?? null,
      status: b.status ?? "pending", notes: b.notes ?? null,
    }).returning();
    res.json({ success: true, data: row });
  } catch (err: any) { res.status(500).json({ success: false, error: err?.message }); }
});

router.put("/admin/advertisers/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const b = req.body;
    const [row] = await db.update(adAdvertisersTable).set({
      name: b.name, email: b.email, phone: b.phone,
      company: b.company, website: b.website, status: b.status,
      balance: b.balance, notes: b.notes, updatedAt: new Date(),
    }).where(eq(adAdvertisersTable.id, id)).returning();
    res.json({ success: true, data: row });
  } catch (err: any) { res.status(500).json({ success: false, error: err?.message }); }
});

router.patch("/admin/advertisers/:id/approve", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const [row] = await db.update(adAdvertisersTable)
      .set({ status: "active", updatedAt: new Date() })
      .where(eq(adAdvertisersTable.id, id)).returning();
    res.json({ success: true, data: row });
  } catch (err: any) { res.status(500).json({ success: false, error: err?.message }); }
});

router.patch("/admin/advertisers/:id/suspend", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const [row] = await db.update(adAdvertisersTable)
      .set({ status: "suspended", updatedAt: new Date() })
      .where(eq(adAdvertisersTable.id, id)).returning();
    res.json({ success: true, data: row });
  } catch (err: any) { res.status(500).json({ success: false, error: err?.message }); }
});

router.delete("/admin/advertisers/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    await db.delete(adAdvertisersTable).where(eq(adAdvertisersTable.id, id));
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ success: false, error: err?.message }); }
});

/* ════════════════════════════════════════════════════════════════════════════
   ADMIN — CAMPAIGNS
════════════════════════════════════════════════════════════════════════════ */

router.get("/admin/campaigns", async (req, res) => {
  try {
    const advertiserId = req.query.advertiserId ? parseInt(req.query.advertiserId as string) : undefined;
    const rows = advertiserId
      ? await db.select().from(adCampaignsTable).where(eq(adCampaignsTable.advertiserId, advertiserId)).orderBy(desc(adCampaignsTable.createdAt))
      : await db.select().from(adCampaignsTable).orderBy(desc(adCampaignsTable.createdAt));
    res.json({ success: true, data: rows });
  } catch (err: any) { res.status(500).json({ success: false, error: err?.message }); }
});

router.post("/admin/campaigns", async (req, res) => {
  try {
    const b = req.body;
    const [row] = await db.insert(adCampaignsTable).values({
      advertiserId: b.advertiserId, name: b.name, description: b.description ?? null,
      budget: b.budget ?? "0", status: b.status ?? "draft",
      startDate: b.startDate ? new Date(b.startDate) : null,
      endDate: b.endDate ? new Date(b.endDate) : null,
    }).returning();
    res.json({ success: true, data: row });
  } catch (err: any) { res.status(500).json({ success: false, error: err?.message }); }
});

router.put("/admin/campaigns/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const b = req.body;
    const [row] = await db.update(adCampaignsTable).set({
      name: b.name, description: b.description, budget: b.budget,
      status: b.status, updatedAt: new Date(),
      startDate: b.startDate ? new Date(b.startDate) : null,
      endDate: b.endDate ? new Date(b.endDate) : null,
    }).where(eq(adCampaignsTable.id, id)).returning();
    res.json({ success: true, data: row });
  } catch (err: any) { res.status(500).json({ success: false, error: err?.message }); }
});

router.delete("/admin/campaigns/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    await db.delete(adCampaignsTable).where(eq(adCampaignsTable.id, id));
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ success: false, error: err?.message }); }
});

/* ════════════════════════════════════════════════════════════════════════════
   ADMIN — INVOICES
════════════════════════════════════════════════════════════════════════════ */

router.get("/admin/invoices", async (req, res) => {
  try {
    const rows = await db.select().from(adInvoicesTable).orderBy(desc(adInvoicesTable.createdAt));
    res.json({ success: true, data: rows });
  } catch (err: any) { res.status(500).json({ success: false, error: err?.message }); }
});

router.post("/admin/invoices", async (req, res) => {
  try {
    const b = req.body;
    const invoiceNo = `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const [row] = await db.insert(adInvoicesTable).values({
      advertiserId: b.advertiserId, campaignId: b.campaignId ?? null,
      invoiceNo, amount: b.amount, currency: b.currency ?? "EGP",
      status: "pending", dueDate: b.dueDate ? new Date(b.dueDate) : null,
      notes: b.notes ?? null,
    }).returning();
    res.json({ success: true, data: row });
  } catch (err: any) { res.status(500).json({ success: false, error: err?.message }); }
});

router.patch("/admin/invoices/:id/pay", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const [inv] = await db.select().from(adInvoicesTable).where(eq(adInvoicesTable.id, id));
    if (!inv) return res.status(404).json({ success: false, error: "not found" });

    await Promise.all([
      db.update(adInvoicesTable)
        .set({ status: "paid", paidAt: new Date() })
        .where(eq(adInvoicesTable.id, id)),
      db.update(adAdvertisersTable)
        .set({ balance: sql`${adAdvertisersTable.balance} + ${inv.amount}`, updatedAt: new Date() })
        .where(eq(adAdvertisersTable.id, inv.advertiserId)),
    ]);

    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ success: false, error: err?.message }); }
});

router.delete("/admin/invoices/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    await db.delete(adInvoicesTable).where(eq(adInvoicesTable.id, id));
    res.json({ success: true });
  } catch (err: any) { res.status(500).json({ success: false, error: err?.message }); }
});

export default router;
