import { Router } from "express";
import { db } from "@workspace/db";
import { siteSettingsTable, marketSnapshotsTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { computeMarketAnalytics, invalidateAllMarketCache, type MarketScope } from "../lib/market-engine";

const router = Router();

// ── GET /api/market/analytics ─────────────────────────────────────────────
// Query: cityId?, regionId?, district?, mainCategory, subCategory?, listingType?, propertyId?, priceNum?, area?
router.get("/market/analytics", async (req, res) => {
  try {
    const { cityId, regionId, district, mainCategory, subCategory, listingType, priceNum, area } = req.query as Record<string, string>;

    if (!mainCategory) {
      return res.status(400).json({ success: false, error: "mainCategory is required" });
    }

    // Check if feature is enabled
    const [enabledSetting] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, "marketAnalyticsEnabled"));
    if (enabledSetting && enabledSetting.value === "false") {
      return res.json({ success: true, data: { enabled: false } });
    }

    const scope: MarketScope = {
      mainCategory,
      cityId: cityId ? parseInt(cityId) : null,
      regionId: regionId ? parseInt(regionId) : null,
      district: district || null,
      subCategory: subCategory || null,
      listingType: listingType || null,
    };

    const result = await computeMarketAnalytics(scope);

    // Price comparison for current property
    let currentPropertyPpm2: number | null = null;
    let priceComparison: string | null = null;
    let priceDiffPercent: number | null = null;

    if (priceNum && area) {
      const pn = parseFloat(priceNum);
      const ar = parseFloat(area);
      if (pn > 0 && ar > 0 && result.avgPricePerM2) {
        currentPropertyPpm2 = Math.round(pn / ar);
        priceDiffPercent = Math.round(((currentPropertyPpm2 - result.avgPricePerM2) / result.avgPricePerM2) * 100 * 10) / 10;
        if (priceDiffPercent <= -10) priceComparison = "أقل من السوق";
        else if (priceDiffPercent >= 10) priceComparison = "أعلى من السوق";
        else priceComparison = "قريب من السوق";
      }
    }

    res.json({
      success: true,
      data: {
        ...result,
        enabled: true,
        currentPropertyPpm2,
        priceComparison,
        priceDiffPercent,
        medianPricePerM2: result.medianPricePerM2 ?? null,
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to compute market analytics";
    res.status(500).json({ success: false, error: msg });
  }
});

// ── GET /api/admin/market/settings ───────────────────────────────────────
router.get("/admin/market/settings", async (_req, res) => {
  try {
    const keys = ["marketAnalyticsEnabled", "marketMinSamples", "marketWindowDays", "marketAutoRebuild"];
    const rows = await db.select().from(siteSettingsTable).where(
      eq(siteSettingsTable.key, keys[0])
    );
    // fetch all keys
    const all = await db.select().from(siteSettingsTable);
    const map: Record<string, string> = {};
    for (const r of all) map[r.key] = r.value ?? "";

    res.json({
      success: true,
      data: {
        marketAnalyticsEnabled: map["marketAnalyticsEnabled"] !== "false",
        marketMinSamples: parseInt(map["marketMinSamples"] ?? "3") || 3,
        marketWindowDays: parseInt(map["marketWindowDays"] ?? "365") || 365,
        marketAutoRebuild: map["marketAutoRebuild"] !== "false",
      },
    });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: "Failed to fetch settings" });
  }
});

// ── POST /api/admin/market/settings ──────────────────────────────────────
router.post("/admin/market/settings", async (req, res) => {
  try {
    const { marketAnalyticsEnabled, marketMinSamples, marketWindowDays, marketAutoRebuild } = req.body;
    const updates: Array<{ key: string; value: string }> = [];

    if (marketAnalyticsEnabled !== undefined) updates.push({ key: "marketAnalyticsEnabled", value: String(marketAnalyticsEnabled) });
    if (marketMinSamples !== undefined) updates.push({ key: "marketMinSamples", value: String(marketMinSamples) });
    if (marketWindowDays !== undefined) updates.push({ key: "marketWindowDays", value: String(marketWindowDays) });
    if (marketAutoRebuild !== undefined) updates.push({ key: "marketAutoRebuild", value: String(marketAutoRebuild) });

    for (const { key, value } of updates) {
      const [existing] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key));
      if (existing) {
        await db.update(siteSettingsTable).set({ value }).where(eq(siteSettingsTable.key, key));
      } else {
        await db.insert(siteSettingsTable).values({ key, value });
      }
    }

    res.json({ success: true });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: "Failed to save settings" });
  }
});

// ── POST /api/admin/market/rebuild ───────────────────────────────────────
router.post("/admin/market/rebuild", async (_req, res) => {
  try {
    await invalidateAllMarketCache();
    res.json({ success: true, message: "تم مسح كاش التحليلات. سيتم إعادة حسابها تلقائيًا عند الطلب." });
  } catch (err: unknown) {
    res.status(500).json({ success: false, error: "Failed to rebuild" });
  }
});

// ── GET /api/admin/market/snapshots ──────────────────────────────────────
router.get("/admin/market/snapshots", async (_req, res) => {
  try {
    const rows = await db.select().from(marketSnapshotsTable).orderBy(marketSnapshotsTable.updatedAt);
    res.json({ success: true, data: rows });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch snapshots" });
  }
});

export default router;
