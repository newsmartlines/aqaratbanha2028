import { Router } from "express";
import { db } from "@workspace/db";
import { siteSettingsTable, marketSnapshotsTable, propertiesTable, citiesTable, regionsTable } from "@workspace/db";
import { eq, and, isNotNull, gt, inArray } from "drizzle-orm";
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

// ── GET /api/market/overview ──────────────────────────────────────────────
// Returns per-city × per-category aggregated price/m² stats
router.get("/market/overview", async (_req, res) => {
  try {
    const RE_CATEGORIES = ["residential", "commercial", "land", "industrial"];

    // Fetch all approved properties with price + area + cityId
    const rows = await db
      .select({
        id: propertiesTable.id,
        cityId: propertiesTable.cityId,
        mainCategory: propertiesTable.mainCategory,
        price: propertiesTable.price,
        area: propertiesTable.area,
        viewCount: propertiesTable.viewCount,
        listingType: propertiesTable.listingType,
      })
      .from(propertiesTable)
      .where(
        and(
          inArray(propertiesTable.status, ["approved", "active"]),
          isNotNull(propertiesTable.cityId),
          isNotNull(propertiesTable.price),
          isNotNull(propertiesTable.area),
          gt(propertiesTable.price as any, "0"),
          gt(propertiesTable.area as any, "0"),
        ) as any
      );

    // Fetch all cities + their region names
    const cities = await db
      .select({
        id: citiesTable.id,
        nameAr: citiesTable.nameAr,
        regionId: citiesTable.regionId,
      })
      .from(citiesTable)
      .where(eq(citiesTable.enabled, true));

    const regions = await db
      .select({ id: regionsTable.id, nameAr: regionsTable.nameAr })
      .from(regionsTable);

    const regionMap = new Map(regions.map(r => [r.id, r.nameAr]));
    const cityMap = new Map(cities.map(c => [c.id, { ...c, regionNameAr: regionMap.get(c.regionId) ?? "" }]));

    // Compute per-city × per-category ppm2 arrays
    type CatStats = { ppm2s: number[]; views: number[] };
    const buckets = new Map<number, Map<string, CatStats>>();

    for (const row of rows) {
      const cityId = row.cityId;
      const cat = row.mainCategory ?? "residential";
      if (!cityId) continue;
      const price = parseFloat(row.price ?? "0");
      const area = parseFloat(row.area ?? "0");
      if (!price || !area) continue;
      const ppm2 = price / area;

      if (!buckets.has(cityId)) buckets.set(cityId, new Map());
      const catMap = buckets.get(cityId)!;
      if (!catMap.has(cat)) catMap.set(cat, { ppm2s: [], views: [] });
      const stats = catMap.get(cat)!;
      stats.ppm2s.push(ppm2);
      stats.views.push(row.viewCount ?? 0);
    }

    function median(arr: number[]): number | null {
      if (!arr.length) return null;
      const s = [...arr].sort((a, b) => a - b);
      const mid = Math.floor(s.length / 2);
      return s.length % 2 !== 0 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
    }
    function avg(arr: number[]): number | null {
      if (!arr.length) return null;
      return arr.reduce((a, b) => a + b, 0) / arr.length;
    }

    type CityResult = {
      cityId: number;
      cityNameAr: string;
      regionNameAr: string;
      regionId: number;
      totalCount: number;
      totalViews: number;
      categories: Record<string, {
        avgPpm2: number | null; medianPpm2: number | null;
        minPpm2: number | null; maxPpm2: number | null;
        sampleCount: number;
      }>;
      overallAvgPpm2: number | null;
    };

    const cityResults: CityResult[] = [];

    for (const [cityId, catMap] of buckets.entries()) {
      const cityInfo = cityMap.get(cityId);
      if (!cityInfo) continue;

      let totalCount = 0;
      let allPpm2: number[] = [];
      let totalViews = 0;
      const categories: CityResult["categories"] = {};

      for (const cat of RE_CATEGORIES) {
        const stats = catMap.get(cat);
        if (!stats || !stats.ppm2s.length) {
          categories[cat] = { avgPpm2: null, medianPpm2: null, minPpm2: null, maxPpm2: null, sampleCount: 0 };
          continue;
        }
        totalCount += stats.ppm2s.length;
        allPpm2 = allPpm2.concat(stats.ppm2s);
        totalViews += stats.views.reduce((a, b) => a + b, 0);
        categories[cat] = {
          avgPpm2: Math.round(avg(stats.ppm2s)!),
          medianPpm2: Math.round(median(stats.ppm2s)!),
          minPpm2: Math.round(Math.min(...stats.ppm2s)),
          maxPpm2: Math.round(Math.max(...stats.ppm2s)),
          sampleCount: stats.ppm2s.length,
        };
      }

      cityResults.push({
        cityId,
        cityNameAr: cityInfo.nameAr,
        regionNameAr: cityInfo.regionNameAr,
        regionId: cityInfo.regionId,
        totalCount,
        totalViews,
        categories,
        overallAvgPpm2: allPpm2.length ? Math.round(avg(allPpm2)!) : null,
      });
    }

    // Sort by total sample count desc
    cityResults.sort((a, b) => b.totalCount - a.totalCount);

    // Compute overall per-category stats across all cities
    const overallBuckets: Record<string, number[]> = {};
    for (const cr of cityResults) {
      for (const cat of RE_CATEGORIES) {
        if (!overallBuckets[cat]) overallBuckets[cat] = [];
        const s = cr.categories[cat];
        if (s?.avgPpm2) overallBuckets[cat]!.push(s.avgPpm2);
      }
    }
    const overall: Record<string, { avgPpm2: number | null; cityCount: number }> = {};
    for (const cat of RE_CATEGORIES) {
      const arr = overallBuckets[cat] ?? [];
      overall[cat] = {
        avgPpm2: arr.length ? Math.round(avg(arr)!) : null,
        cityCount: arr.length,
      };
    }

    res.json({
      success: true,
      data: {
        cities: cityResults,
        overall,
        totalProperties: rows.length,
        totalCities: cityResults.length,
        lastUpdated: new Date().toISOString(),
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed";
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
