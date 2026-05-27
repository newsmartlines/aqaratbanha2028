/**
 * Unified Subscription & Promotion Engine
 * ─────────────────────────────────────────
 * Single source of truth for all promotion logic:
 *  - Plan quota resolution
 *  - Bump Up / Featured / Spotlight operations
 *  - Addon boost consumption
 *  - Smart ranking score computation
 *
 * No logic should be duplicated outside this file.
 */

import { db } from "@workspace/db";
import {
  billingPlansTable,
  subscriptionsTable,
  propertyPromotionsTable,
  promotionQuotasTable,
  addonBoostsTable,
  propertiesTable,
  usersTable,
} from "@workspace/db";
import { eq, and, gt, desc, sql, inArray } from "drizzle-orm";

// ── Types ─────────────────────────────────────────────────────────────────────

export type PromotionType = "bump" | "featured" | "spotlight";

export interface PlanLimits {
  properties: number;
  photos: number;
  videos: number;
  featuredAds: number;
  pinnedAds: number;
  messages: number;
  leads: number;
  bumpUpsPerMonth: number;   // -1 = unlimited, 0 = none
  spotlightAds: number;      // per month, -1 = unlimited
  boostDurationDays: number; // default days a boost lasts
  priorityScore: number;     // 0-100, used in rank formula
  canBuyExtraBoosts: boolean;
}

export interface PlanFeatures {
  homepageDisplay: boolean;
  topSearch: boolean;
  verifiedBadge: boolean;
  premiumBadge: boolean;
  prioritySupport: boolean;
  analytics: boolean;
  seo: boolean;
  aiTools: boolean;
  autoBoost: boolean;
  bumpUp: boolean;
  spotlightAd: boolean;
  extraBoostPurchase: boolean;
}

export interface QuotaInfo {
  planId: number | null;
  planNameAr: string | null;
  plan: PlanLimits;
  features: PlanFeatures;
  used: { bumpUps: number; featuredAds: number; spotlightAds: number };
  addons: { bumps: number; featured: number; spotlight: number };
  remaining: { bumpUps: number; featuredAds: number; spotlightAds: number };
  month: string;
}

export interface RankedProperty {
  rankScore: number;
  promotionType: PromotionType | null;
  promotionExpiresAt: Date | null;
  isSpotlight: boolean;
}

// ── Default plan limits (free tier) ──────────────────────────────────────────

const DEFAULT_LIMITS: PlanLimits = {
  properties: 3,
  photos: 5,
  videos: 0,
  featuredAds: 0,
  pinnedAds: 0,
  messages: 20,
  leads: 5,
  bumpUpsPerMonth: 0,
  spotlightAds: 0,
  boostDurationDays: 7,
  priorityScore: 0,
  canBuyExtraBoosts: false,
};

const DEFAULT_FEATURES: PlanFeatures = {
  homepageDisplay: false,
  topSearch: false,
  verifiedBadge: false,
  premiumBadge: false,
  prioritySupport: false,
  analytics: false,
  seo: false,
  aiTools: false,
  autoBoost: false,
  bumpUp: false,
  spotlightAd: false,
  extraBoostPurchase: false,
};

function parseLimits(raw: string | null): PlanLimits {
  try { return { ...DEFAULT_LIMITS, ...JSON.parse(raw ?? "{}") }; } catch { return { ...DEFAULT_LIMITS }; }
}

function parseFeatures(raw: string | null): PlanFeatures {
  try { return { ...DEFAULT_FEATURES, ...JSON.parse(raw ?? "{}") }; } catch { return { ...DEFAULT_FEATURES }; }
}

function currentMonth(): string {
  const d = new Date();
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

// ── Core: resolve the user's active billing plan ──────────────────────────────

export async function getUserActivePlan(userId: number): Promise<{ planId: number | null; planNameAr: string | null; limits: PlanLimits; features: PlanFeatures }> {
  const now = new Date();

  // Find the latest active subscription for this user
  const [sub] = await db
    .select({
      billingPlanId: subscriptionsTable.billingPlanId,
      status: subscriptionsTable.status,
      endDate: subscriptionsTable.endDate,
    })
    .from(subscriptionsTable)
    .where(and(eq(subscriptionsTable.userId, userId), eq(subscriptionsTable.status, "active")))
    .orderBy(desc(subscriptionsTable.endDate))
    .limit(1);

  if (!sub?.billingPlanId || new Date(sub.endDate) < now) {
    return { planId: null, planNameAr: "مجاني", limits: { ...DEFAULT_LIMITS }, features: { ...DEFAULT_FEATURES } };
  }

  const [plan] = await db
    .select()
    .from(billingPlansTable)
    .where(eq(billingPlansTable.id, sub.billingPlanId));

  if (!plan) {
    return { planId: null, planNameAr: "مجاني", limits: { ...DEFAULT_LIMITS }, features: { ...DEFAULT_FEATURES } };
  }

  return {
    planId: plan.id,
    planNameAr: plan.nameAr ?? plan.name,
    limits: parseLimits(plan.limits ?? "{}"),
    features: parseFeatures(plan.features ?? "{}"),
  };
}

// ── Quota: get monthly usage + addons ─────────────────────────────────────────

export async function getUserQuotas(userId: number): Promise<QuotaInfo> {
  const month = currentMonth();
  const { planId, planNameAr, limits, features } = await getUserActivePlan(userId);

  // Fetch (or create) quota row
  const [quota] = await db
    .select()
    .from(promotionQuotasTable)
    .where(and(eq(promotionQuotasTable.userId, userId), eq(promotionQuotasTable.month, month)));

  const used = {
    bumpUps: quota?.bumpUpsUsed ?? 0,
    featuredAds: quota?.featuredUsed ?? 0,
    spotlightAds: quota?.spotlightUsed ?? 0,
  };

  // Fetch active addon boosts (not expired)
  const addonRows = await db
    .select()
    .from(addonBoostsTable)
    .where(
      and(
        eq(addonBoostsTable.userId, userId),
        gt(addonBoostsTable.remaining, 0),
        sql`(${addonBoostsTable.expiresAt} IS NULL OR ${addonBoostsTable.expiresAt} > NOW())`
      )
    );

  const addons = {
    bumps: addonRows.filter(r => r.type === "bump").reduce((s, r) => s + (r.remaining ?? 0), 0),
    featured: addonRows.filter(r => r.type === "featured").reduce((s, r) => s + (r.remaining ?? 0), 0),
    spotlight: addonRows.filter(r => r.type === "spotlight").reduce((s, r) => s + (r.remaining ?? 0), 0),
  };

  // remaining = (plan allowance - used) + addons, but capped at ≥ 0
  function calcRemaining(allowed: number, usedAmt: number, addonAmt: number): number {
    if (allowed === -1) return 9999; // unlimited
    return Math.max(0, allowed - usedAmt) + addonAmt;
  }

  return {
    planId,
    planNameAr,
    plan: limits,
    features,
    used,
    addons,
    remaining: {
      bumpUps: calcRemaining(limits.bumpUpsPerMonth, used.bumpUps, addons.bumps),
      featuredAds: calcRemaining(limits.featuredAds, used.featuredAds, addons.featured),
      spotlightAds: calcRemaining(limits.spotlightAds, used.spotlightAds, addons.spotlight),
    },
    month,
  };
}

// ── Quota: consume a unit ─────────────────────────────────────────────────────

async function consumeQuota(userId: number, type: PromotionType, planId: number | null): Promise<void> {
  const month = currentMonth();
  const field = type === "bump" ? "bumpUpsUsed" : type === "featured" ? "featuredUsed" : "spotlightUsed";

  // Check if addon should be consumed first
  const addonType = type;
  const [addonRow] = await db
    .select()
    .from(addonBoostsTable)
    .where(
      and(
        eq(addonBoostsTable.userId, userId),
        eq(addonBoostsTable.type, addonType),
        gt(addonBoostsTable.remaining, 0),
        sql`(${addonBoostsTable.expiresAt} IS NULL OR ${addonBoostsTable.expiresAt} > NOW())`
      )
    )
    .orderBy(addonBoostsTable.expiresAt)
    .limit(1);

  if (addonRow) {
    await db
      .update(addonBoostsTable)
      .set({ remaining: (addonRow.remaining ?? 1) - 1 })
      .where(eq(addonBoostsTable.id, addonRow.id));
    return; // consumed from addon, don't touch quota
  }

  // Consume from plan quota
  const [existing] = await db
    .select()
    .from(promotionQuotasTable)
    .where(and(eq(promotionQuotasTable.userId, userId), eq(promotionQuotasTable.month, month)));

  if (existing) {
    const newVal = (existing as any)[field] + 1;
    await db
      .update(promotionQuotasTable)
      .set({ [field]: newVal, updatedAt: new Date() })
      .where(eq(promotionQuotasTable.id, existing.id));
  } else {
    await db.insert(promotionQuotasTable).values({
      userId,
      billingPlanId: planId,
      month,
      bumpUpsUsed: type === "bump" ? 1 : 0,
      featuredUsed: type === "featured" ? 1 : 0,
      spotlightUsed: type === "spotlight" ? 1 : 0,
    });
  }
}

// ── Operations ────────────────────────────────────────────────────────────────

export type PromotionError = { code: "NO_PERMISSION" | "QUOTA_EXHAUSTED" | "NOT_FOUND" | "NOT_OWNER"; message: string };
export type PromotionResult = { ok: true; promotion: any } | { ok: false; error: PromotionError };

export async function bumpProperty(userId: number, propertyId: number): Promise<PromotionResult> {
  const quotas = await getUserQuotas(userId);

  if (!quotas.features.bumpUp) {
    return { ok: false, error: { code: "NO_PERMISSION", message: "باقتك الحالية لا تدعم ترفيع الإعلانات. يرجى الترقية." } };
  }
  if (quotas.remaining.bumpUps <= 0) {
    return { ok: false, error: { code: "QUOTA_EXHAUSTED", message: "استنفدت حصة الترفيع لهذا الشهر. اشترِ ترفيعات إضافية أو انتظر الشهر القادم." } };
  }

  const [property] = await db.select({
    id: propertiesTable.id,
    ownerUserId: propertiesTable.ownerUserId,
    providerId: propertiesTable.providerId,
    featured: propertiesTable.featured,
    urgent: propertiesTable.urgent,
    viewCount: propertiesTable.viewCount,
  }).from(propertiesTable).where(eq(propertiesTable.id, propertyId));
  if (!property) return { ok: false, error: { code: "NOT_FOUND", message: "العقار غير موجود" } };

  // Allow: direct owner OR provider that owns the property
  const isDirectOwner = property.ownerUserId === userId;
  if (!isDirectOwner) {
    // Check if user is owner of the associated provider
    if (property.providerId) {
      const [prov] = await db
        .select({ userId: usersTable.id })
        .from(usersTable)
        .innerJoin(propertiesTable, eq(propertiesTable.providerId, property.providerId))
        .where(eq(usersTable.id, userId))
        .limit(1);
      if (!prov) return { ok: false, error: { code: "NOT_OWNER", message: "لا يمكنك ترفيع إعلان لا تملكه" } };
    } else {
      return { ok: false, error: { code: "NOT_OWNER", message: "لا يمكنك ترفيع إعلان لا تملكه" } };
    }
  }

  const durationDays = quotas.plan.boostDurationDays || 7;
  const expiresAt = new Date(Date.now() + durationDays * 86400_000);

  // Deactivate previous bump promotions for this property
  await db
    .update(propertyPromotionsTable)
    .set({ isActive: false })
    .where(and(eq(propertyPromotionsTable.propertyId, propertyId), eq(propertyPromotionsTable.type, "bump"), eq(propertyPromotionsTable.isActive, true)));

  const boostScore = 200 + Math.round(quotas.plan.priorityScore * 2);

  const [promotion] = await db.insert(propertyPromotionsTable).values({
    propertyId,
    userId,
    type: "bump",
    source: quotas.addons.bumps > 0 ? "addon" : "plan",
    boostScore,
    expiresAt,
    isActive: true,
  }).returning();

  await consumeQuota(userId, "bump", quotas.planId);
  return { ok: true, promotion };
}

export async function featureProperty(userId: number, propertyId: number, source: "plan" | "addon" | "manual" = "plan"): Promise<PromotionResult> {
  const quotas = await getUserQuotas(userId);

  if (source !== "manual" && !quotas.features.homepageDisplay) {
    return { ok: false, error: { code: "NO_PERMISSION", message: "باقتك الحالية لا تدعم الإعلانات المميزة." } };
  }
  if (source === "plan" && quotas.remaining.featuredAds <= 0) {
    return { ok: false, error: { code: "QUOTA_EXHAUSTED", message: "استنفدت حصة الإعلانات المميزة. اشترِ إعلانات إضافية." } };
  }

  const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, propertyId));
  if (!property) return { ok: false, error: { code: "NOT_FOUND", message: "العقار غير موجود" } };

  const durationDays = quotas.plan.boostDurationDays || 30;
  const expiresAt = new Date(Date.now() + durationDays * 86400_000);

  // Mark property as featured
  await db.update(propertiesTable).set({ featured: true }).where(eq(propertiesTable.id, propertyId));

  // Deactivate previous featured promotions for this property
  await db
    .update(propertyPromotionsTable)
    .set({ isActive: false })
    .where(and(eq(propertyPromotionsTable.propertyId, propertyId), eq(propertyPromotionsTable.type, "featured"), eq(propertyPromotionsTable.isActive, true)));

  const boostScore = 500 + Math.round(quotas.plan.priorityScore * 3);

  const [promotion] = await db.insert(propertyPromotionsTable).values({
    propertyId,
    userId,
    type: "featured",
    source,
    boostScore,
    expiresAt,
    isActive: true,
  }).returning();

  if (source !== "manual") await consumeQuota(userId, "featured", quotas.planId);
  return { ok: true, promotion };
}

export async function spotlightProperty(userId: number, propertyId: number, source: "plan" | "addon" | "manual" = "plan"): Promise<PromotionResult> {
  const quotas = await getUserQuotas(userId);

  if (source !== "manual" && !quotas.features.spotlightAd) {
    return { ok: false, error: { code: "NO_PERMISSION", message: "باقتك الحالية لا تدعم إعلانات الـ Spotlight." } };
  }
  if (source === "plan" && quotas.remaining.spotlightAds <= 0) {
    return { ok: false, error: { code: "QUOTA_EXHAUSTED", message: "استنفدت حصة إعلانات الـ Spotlight." } };
  }

  const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, propertyId));
  if (!property) return { ok: false, error: { code: "NOT_FOUND", message: "العقار غير موجود" } };

  const durationDays = quotas.plan.boostDurationDays || 14;
  const expiresAt = new Date(Date.now() + durationDays * 86400_000);

  await db
    .update(propertyPromotionsTable)
    .set({ isActive: false })
    .where(and(eq(propertyPromotionsTable.propertyId, propertyId), eq(propertyPromotionsTable.type, "spotlight"), eq(propertyPromotionsTable.isActive, true)));

  const boostScore = 300 + Math.round(quotas.plan.priorityScore * 2.5);

  const [promotion] = await db.insert(propertyPromotionsTable).values({
    propertyId,
    userId,
    type: "spotlight",
    source,
    boostScore,
    expiresAt,
    isActive: true,
  }).returning();

  if (source !== "manual") await consumeQuota(userId, "spotlight", quotas.planId);
  return { ok: true, promotion };
}

// ── Expired promotions cleanup ────────────────────────────────────────────────

export async function expirePromotions(): Promise<number> {
  const expired = await db
    .select({ id: propertyPromotionsTable.id, propertyId: propertyPromotionsTable.propertyId, type: propertyPromotionsTable.type })
    .from(propertyPromotionsTable)
    .where(
      and(
        eq(propertyPromotionsTable.isActive, true),
        sql`${propertyPromotionsTable.expiresAt} IS NOT NULL`,
        sql`${propertyPromotionsTable.expiresAt} < NOW()`
      )
    );

  if (expired.length === 0) return 0;

  for (const p of expired) {
    await db.update(propertyPromotionsTable).set({ isActive: false }).where(eq(propertyPromotionsTable.id, p.id));

    // If it was a featured promotion, check if there's still another active featured → only unfeat if no other active
    if (p.type === "featured") {
      const [stillActive] = await db
        .select({ id: propertyPromotionsTable.id })
        .from(propertyPromotionsTable)
        .where(
          and(
            eq(propertyPromotionsTable.propertyId, p.propertyId),
            eq(propertyPromotionsTable.type, "featured"),
            eq(propertyPromotionsTable.isActive, true)
          )
        )
        .limit(1);

      if (!stillActive) {
        await db.update(propertiesTable).set({ featured: false }).where(eq(propertiesTable.id, p.propertyId));
      }
    }
  }

  return expired.length;
}

// ── Smart Ranking Score ───────────────────────────────────────────────────────

/**
 * Compute ranking score for a single property.
 * Higher score = appears first in search results.
 *
 * Formula:
 *  spotlight active  → +800
 *  featured flag     → +500
 *  bump active       → +200 (decayed by time remaining)
 *  urgent flag       → +50
 *  priorityScore     → +0..+200 (from plan)
 *  view bonus        → +0..+50  (log scale)
 */
export function computeRankScore(
  property: { featured: boolean; urgent: boolean; viewCount: number },
  activePromotion: { type: string; boostScore: number; expiresAt: Date | null } | null,
  planPriorityScore: number = 0
): number {
  let score = 0;

  if (activePromotion?.type === "spotlight") score += activePromotion.boostScore ?? 800;
  else if (activePromotion?.type === "featured") score += activePromotion.boostScore ?? 500;
  else if (activePromotion?.type === "bump") {
    // Decay bump score based on time remaining
    let bumpScore = activePromotion.boostScore ?? 200;
    if (activePromotion.expiresAt) {
      const msSinceEpoch = Date.now();
      const msExpiry = new Date(activePromotion.expiresAt).getTime();
      const msDuration = 7 * 86400_000;
      const decay = Math.max(0, (msExpiry - msSinceEpoch) / msDuration);
      bumpScore = Math.round(bumpScore * Math.min(1, decay));
    }
    score += bumpScore;
  }

  if (property.featured) score += 500;
  if (property.urgent) score += 50;
  score += Math.round(planPriorityScore * 2);
  score += Math.min(50, Math.round(Math.log(Math.max(1, property.viewCount)) * 5));

  return score;
}

/**
 * Apply smart ranking to an array of properties.
 * Fetches all active promotions for the given property IDs in one query.
 */
export async function applySmartRanking<T extends { id: number; featured: boolean; urgent: boolean; viewCount: number }>(
  properties: T[]
): Promise<(T & { rankScore: number; activePromotion: { type: string; boostScore: number; expiresAt: Date | null } | null })[]> {
  if (properties.length === 0) return [];

  // Expire stale promotions first (best-effort, non-blocking)
  expirePromotions().catch(() => {});

  const ids = properties.map(p => p.id);

  // Fetch the single best active promotion for each property
  const promotions = await db
    .select()
    .from(propertyPromotionsTable)
    .where(
      and(
        eq(propertyPromotionsTable.isActive, true),
        inArray(propertyPromotionsTable.propertyId, ids),
        sql`(${propertyPromotionsTable.expiresAt} IS NULL OR ${propertyPromotionsTable.expiresAt} > NOW())`
      )
    )
    .orderBy(desc(propertyPromotionsTable.boostScore));

  // Build map: propertyId → best promotion
  const promoMap = new Map<number, (typeof promotions)[0]>();
  for (const p of promotions) {
    if (!promoMap.has(p.propertyId)) {
      promoMap.set(p.propertyId, p);
    }
  }

  return properties
    .map(p => {
      const promo = promoMap.get(p.id) ?? null;
      const activePromotion = promo ? { type: promo.type, boostScore: promo.boostScore ?? 0, expiresAt: promo.expiresAt } : null;
      const rankScore = computeRankScore(p, activePromotion, 0);
      return { ...p, rankScore, activePromotion };
    })
    .sort((a, b) => b.rankScore - a.rankScore);
}

// ── Admin: grant addon boosts ─────────────────────────────────────────────────

export async function grantAddonBoosts(
  userId: number,
  type: PromotionType,
  quantity: number,
  note: string = "",
  daysValid: number = 90
): Promise<void> {
  const expiresAt = new Date(Date.now() + daysValid * 86400_000);
  await db.insert(addonBoostsTable).values({ userId, type, quantity, remaining: quantity, price: "0", note, expiresAt });
}
