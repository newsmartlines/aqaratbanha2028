import { db } from "@workspace/db";
import { propertiesTable, marketSnapshotsTable, propertyFavoritesTable, siteSettingsTable } from "@workspace/db";
import { and, eq, inArray, isNotNull, gt, sql, gte } from "drizzle-orm";

export interface MarketScope {
  cityId?: number | null;
  regionId?: number | null;
  district?: string | null;
  mainCategory: string;
  subCategory?: string | null;
  listingType?: string | null;
}

export interface PricePoint {
  month: string;
  avgPpm2: number;
  count: number;
}

export interface MarketAnalyticsResult {
  avgPricePerM2: number | null;
  medianPricePerM2: number | null;
  minPricePerM2: number | null;
  maxPricePerM2: number | null;
  sampleCount: number;
  trend1m: number | null;
  trend3m: number | null;
  trend6m: number | null;
  trend12m: number | null;
  demandScore: number;
  demandLevel: string;
  priceHistory: PricePoint[];
  hasEnoughData: boolean;
  minSamplesRequired: number;
  scope: MarketScope;
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function monthsAgo(n: number): Date {
  const d = new Date();
  d.setMonth(d.getMonth() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function avgOf(arr: number[]): number | null {
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

function medianOf(arr: number[]): number | null {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0
    ? sorted[mid]!
    : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function percentChange(current: number | null, previous: number | null): number | null {
  if (current == null || previous == null || previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function getDemandLevel(score: number): string {
  if (score >= 75) return "مرتفع جدًا";
  if (score >= 50) return "مرتفع";
  if (score >= 25) return "متوسط";
  return "ضعيف";
}

interface MarketSettings {
  minSamples: number;
  windowDays: number;
  enabled: boolean;
  autoRebuild: boolean;
}

async function getMarketSettings(): Promise<MarketSettings> {
  try {
    const rows = await db.select().from(siteSettingsTable);
    const map: Record<string, string> = {};
    for (const r of rows) map[r.key] = r.value ?? "";
    return {
      minSamples: parseInt(map["marketMinSamples"] ?? "3") || 3,
      windowDays: parseInt(map["marketWindowDays"] ?? "365") || 365,
      enabled: map["marketAnalyticsEnabled"] !== "false",
      autoRebuild: map["marketAutoRebuild"] !== "false",
    };
  } catch {
    return { minSamples: 3, windowDays: 365, enabled: true, autoRebuild: true };
  }
}

export async function computeMarketAnalytics(scope: MarketScope): Promise<MarketAnalyticsResult> {
  const settings = await getMarketSettings();
  const { minSamples, windowDays } = settings;

  const windowCutoff = daysAgo(windowDays);

  const conditions: ReturnType<typeof eq>[] = [
    inArray(propertiesTable.status, ["approved", "active"]),
    isNotNull(propertiesTable.price),
    isNotNull(propertiesTable.area),
    gt(propertiesTable.price as any, "0"),
    gt(propertiesTable.area as any, "0"),
    eq(propertiesTable.mainCategory, scope.mainCategory),
    gte(propertiesTable.createdAt, windowCutoff) as any,
  ];

  if (scope.cityId) conditions.push(eq(propertiesTable.cityId, scope.cityId) as any);
  else if (scope.regionId) conditions.push(eq(propertiesTable.regionId, scope.regionId) as any);

  if (scope.district) conditions.push(eq(propertiesTable.district, scope.district) as any);
  if (scope.subCategory) conditions.push(eq(propertiesTable.subCategory, scope.subCategory) as any);
  if (scope.listingType) conditions.push(eq(propertiesTable.listingType, scope.listingType) as any);

  const rows = await db.select({
    id: propertiesTable.id,
    price: propertiesTable.price,
    area: propertiesTable.area,
    viewCount: propertiesTable.viewCount,
    createdAt: propertiesTable.createdAt,
    approvedAt: propertiesTable.approvedAt,
  }).from(propertiesTable).where(and(...conditions));

  const items = rows
    .map(r => {
      const price = parseFloat(r.price ?? "0");
      const area = parseFloat(r.area ?? "0");
      if (!price || !area) return null;
      const ppm2 = price / area;
      const date = r.approvedAt ?? r.createdAt;
      return { id: r.id, ppm2, viewCount: r.viewCount ?? 0, date };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  const sampleCount = items.length;
  const hasEnoughData = sampleCount >= minSamples;

  if (!hasEnoughData) {
    return {
      avgPricePerM2: null, medianPricePerM2: null,
      minPricePerM2: null, maxPricePerM2: null,
      sampleCount, trend1m: null, trend3m: null, trend6m: null, trend12m: null,
      demandScore: 0, demandLevel: "ضعيف", priceHistory: [], hasEnoughData: false,
      minSamplesRequired: minSamples, scope,
    };
  }

  const allPpm2 = items.map(x => x.ppm2);
  const avgPricePerM2 = avgOf(allPpm2)!;
  const medianPricePerM2 = medianOf(allPpm2)!;
  const minPricePerM2 = Math.min(...allPpm2);
  const maxPricePerM2 = Math.max(...allPpm2);

  // Monthly history — last 14 months
  const monthMap = new Map<string, number[]>();
  const cutoff14m = monthsAgo(14);
  for (const item of items) {
    if (item.date < cutoff14m) continue;
    const key = monthKey(item.date);
    if (!monthMap.has(key)) monthMap.set(key, []);
    monthMap.get(key)!.push(item.ppm2);
  }

  const priceHistory: PricePoint[] = Array.from(monthMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, vals]) => ({ month, avgPpm2: Math.round(avgOf(vals)!), count: vals.length }));

  // Trends — compare periods
  const now = new Date();
  const getPeriodAvg = (from: Date, to: Date): number | null => {
    const vals = items.filter(x => x.date >= from && x.date < to).map(x => x.ppm2);
    return avgOf(vals);
  };

  const cur30 = getPeriodAvg(monthsAgo(1), now);
  const prev30 = getPeriodAvg(monthsAgo(2), monthsAgo(1));
  const prev3m = getPeriodAvg(monthsAgo(6), monthsAgo(3));
  const cur3m = getPeriodAvg(monthsAgo(3), now);
  const prev6m = getPeriodAvg(monthsAgo(12), monthsAgo(6));
  const cur6m = getPeriodAvg(monthsAgo(6), now);
  const prev12m = getPeriodAvg(monthsAgo(24), monthsAgo(12));
  const cur12m = getPeriodAvg(monthsAgo(12), now);

  const trend1m = percentChange(cur30, prev30);
  const trend3m = percentChange(cur3m, prev3m);
  const trend6m = percentChange(cur6m, prev6m);
  const trend12m = percentChange(cur12m, prev12m);

  // Demand score
  const propertyIds = items.map(x => x.id);
  let favCount = 0;
  try {
    if (propertyIds.length > 0) {
      const [favRow] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(propertyFavoritesTable)
        .where(inArray(propertyFavoritesTable.propertyId, propertyIds.slice(0, 100)));
      favCount = favRow?.count ?? 0;
    }
  } catch { favCount = 0; }

  const totalViews = items.reduce((s, x) => s + x.viewCount, 0);
  const avgViews = items.length > 0 ? totalViews / items.length : 0;
  const viewScore  = Math.min(40, (avgViews / 200) * 40);
  const favScore   = Math.min(30, (favCount / Math.max(sampleCount * 2, 1)) * 30);
  const countScore = Math.min(20, (sampleCount / 30) * 20);
  const trendBonus = trend3m != null && trend3m > 5 ? 10 : trend3m != null && trend3m > 0 ? 5 : 0;

  const demandScore = Math.round(viewScore + favScore + countScore + trendBonus);
  const demandLevel = getDemandLevel(demandScore);

  // Cache snapshot
  try {
    await db.delete(marketSnapshotsTable).where(
      and(
        eq(marketSnapshotsTable.mainCategory, scope.mainCategory),
        scope.cityId    ? eq(marketSnapshotsTable.cityId, scope.cityId)       : sql`${marketSnapshotsTable.cityId} IS NULL`,
        scope.regionId  ? eq(marketSnapshotsTable.regionId, scope.regionId)   : sql`${marketSnapshotsTable.regionId} IS NULL`,
        scope.district  ? eq(marketSnapshotsTable.district, scope.district)   : sql`${marketSnapshotsTable.district} IS NULL`,
        scope.subCategory  ? eq(marketSnapshotsTable.subCategory, scope.subCategory) : sql`${marketSnapshotsTable.subCategory} IS NULL`,
        scope.listingType  ? eq(marketSnapshotsTable.listingType, scope.listingType) : sql`${marketSnapshotsTable.listingType} IS NULL`,
      ) as any
    );

    await db.insert(marketSnapshotsTable).values({
      cityId:    scope.cityId    ?? null,
      regionId:  scope.regionId  ?? null,
      district:  scope.district  ?? null,
      mainCategory: scope.mainCategory,
      subCategory:  scope.subCategory  ?? null,
      listingType:  scope.listingType  ?? null,
      avgPricePerM2: String(Math.round(avgPricePerM2)),
      minPricePerM2: String(Math.round(minPricePerM2)),
      maxPricePerM2: String(Math.round(maxPricePerM2)),
      sampleCount,
      trend1m:  trend1m  != null ? String(Math.round(trend1m  * 10) / 10) : null,
      trend3m:  trend3m  != null ? String(Math.round(trend3m  * 10) / 10) : null,
      trend6m:  trend6m  != null ? String(Math.round(trend6m  * 10) / 10) : null,
      trend12m: trend12m != null ? String(Math.round(trend12m * 10) / 10) : null,
      demandScore,
      demandLevel,
      priceHistory: JSON.stringify(priceHistory),
    });
  } catch { /* non-fatal */ }

  return {
    avgPricePerM2:    Math.round(avgPricePerM2),
    medianPricePerM2: Math.round(medianPricePerM2),
    minPricePerM2:    Math.round(minPricePerM2),
    maxPricePerM2:    Math.round(maxPricePerM2),
    sampleCount,
    trend1m:  trend1m  != null ? Math.round(trend1m  * 10) / 10 : null,
    trend3m:  trend3m  != null ? Math.round(trend3m  * 10) / 10 : null,
    trend6m:  trend6m  != null ? Math.round(trend6m  * 10) / 10 : null,
    trend12m: trend12m != null ? Math.round(trend12m * 10) / 10 : null,
    demandScore,
    demandLevel,
    priceHistory,
    hasEnoughData: true,
    minSamplesRequired: minSamples,
    scope,
  };
}

export async function invalidateMarketCache(
  mainCategory: string,
  cityId?: number | null,
  regionId?: number | null,
): Promise<void> {
  try {
    const conditions: any[] = [eq(marketSnapshotsTable.mainCategory, mainCategory)];
    if (cityId)    conditions.push(eq(marketSnapshotsTable.cityId,    cityId));
    else if (regionId) conditions.push(eq(marketSnapshotsTable.regionId, regionId));
    await db.delete(marketSnapshotsTable).where(and(...conditions) as any);
  } catch { /* non-fatal */ }
}

export async function invalidateAllMarketCache(): Promise<void> {
  try {
    await db.delete(marketSnapshotsTable);
  } catch { /* non-fatal */ }
}
