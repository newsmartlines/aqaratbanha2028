import { Router } from "express";
import { events } from "../lib/event-service";
import { mailer } from "../lib/mailer";
import { db } from "@workspace/db";
import {
  propertiesTable, propertyFavoritesTable, savedSearchesTable,
  notificationsTable, usersTable, siteSettingsTable, providersTable,
  userViewsTable, messagesTable, subscriptionsTable, billingPlansTable, packagesTable,
} from "@workspace/db";
import { eq, desc, and, or, ilike, sql, getTableColumns, lt, gt, inArray } from "drizzle-orm";
import { getSession } from "./auth";
import { applySmartRanking } from "../lib/promotionEngine";
import { propertyPromotionsTable } from "@workspace/db";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();

// ── WhatsApp Notification via CallMeBot ────────────────────────────────────
const NOTIFY_PHONE = process.env.NOTIFY_WHATSAPP_PHONE ?? "";
const CALLMEBOT_KEY = process.env.CALLMEBOT_API_KEY ?? "";

async function sendWhatsAppNotification(property: any) {
  if (!CALLMEBOT_KEY || !NOTIFY_PHONE) {
    console.log("[WhatsApp] CALLMEBOT_API_KEY or NOTIFY_WHATSAPP_PHONE not set — skipping notification");
    return;
  }
  const categoryMap: Record<string, string> = {
    residential: "سكني", commercial: "تجاري", land: "أراضي",
  };
  const typeMap: Record<string, string> = { sale: "للبيع", rent: "للإيجار" };

  const cat = categoryMap[property.mainCategory] ?? property.mainCategory;
  const type = typeMap[property.listingType] ?? property.listingType;
  const price = property.price ? `${Number(property.price).toLocaleString("ar-EG")} ج.م` : "بدون سعر";

  const text = [
    "🏠 عقار جديد تم إضافته على الموقع",
    `📋 العنوان: ${property.title}`,
    `🏷 النوع: ${cat} - ${type}`,
    `💰 السعر: ${price}`,
    `📍 العنوان: ${property.address ?? "—"}`,
    `⏳ الحالة: قيد المراجعة`,
  ].join("\n");

  const url = `https://api.callmebot.com/whatsapp.php?phone=${encodeURIComponent(NOTIFY_PHONE)}&text=${encodeURIComponent(text)}&apikey=${encodeURIComponent(CALLMEBOT_KEY)}`;

  const res = await fetch(url);
  if (!res.ok) {
    console.warn("[WhatsApp] CallMeBot returned:", res.status, await res.text().catch(() => ""));
  } else {
    console.log("[WhatsApp] Notification sent for property:", property.id);
  }
}

// ── Saved search email — delegates to unified mailer ─────────────────────
async function sendSavedSearchEmail(toEmail: string, toName: string, property: any) {
  const price = property.price ? `${Number(property.price).toLocaleString("ar-EG")} جنيه` : "السعر عند التواصل";
  const address = property.address ?? property.district ?? "";
  return mailer.savedSearchMatch(toEmail, toName, property.title, property.id, price, address);
}

// ── Match a property against saved search filters ─────────────────────────
function matchesFilters(property: any, filters: Record<string, any>): boolean {
  if (filters.mainCategory && filters.mainCategory !== property.mainCategory) return false;
  if (filters.listingType && filters.listingType !== property.listingType) return false;
  if (filters.city && property.address && !property.address.toLowerCase().includes(filters.city.toLowerCase())) return false;
  if (filters.maxPrice && property.price && Number(property.price) > Number(filters.maxPrice)) return false;
  if (filters.minArea && property.area && Number(property.area) < Number(filters.minArea)) return false;
  return true;
}

// ── Trigger saved search alerts ────────────────────────────────────────────
async function triggerSavedSearchAlerts(property: any) {
  try {
    const searches = await db.select({
      id: savedSearchesTable.id,
      userId: savedSearchesTable.userId,
      filters: savedSearchesTable.filters,
      email: savedSearchesTable.email,
      notifyEmail: savedSearchesTable.notifyEmail,
      notifyApp: savedSearchesTable.notifyApp,
    }).from(savedSearchesTable);

    // Filter matches first, then bulk-fetch users — avoids N+1 queries
    const matched = searches.filter(ss => {
      let filters: Record<string, any> = {};
      try { filters = JSON.parse(ss.filters ?? "{}"); } catch { /* */ }
      return matchesFilters(property, filters);
    });

    if (matched.length === 0) return;

    const uniqueUserIds = [...new Set(matched.map(ss => ss.userId))];
    const users = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email })
      .from(usersTable)
      .where(inArray(usersTable.id, uniqueUserIds));
    const userMap = new Map(users.map(u => [u.id, u]));

    for (const ss of matched) {
      const user = userMap.get(ss.userId);
      if (!user) continue;

      if (ss.notifyApp) {
        await db.insert(notificationsTable).values({
          userId: ss.userId,
          title: "عقار جديد يطابق بحثك",
          message: `تم إضافة عقار جديد: ${property.title}`,
          type: "saved_search",
          read: false,
          link: `/property/${property.id}`,
        }).catch(() => {});
      }

      if (ss.notifyEmail) {
        const email = ss.email || user.email;
        if (email) {
          sendSavedSearchEmail(email, user.name, property).catch(() => {});
        }
      }
    }
  } catch (e) {
    console.warn("[SavedSearch] Alert trigger failed:", e);
  }
}

async function requireAuth(req: any): Promise<{ userId: number; providerId?: number } | null> {
  const token = req.cookies?.session ?? req.headers.authorization?.replace("Bearer ", "");
  if (!token) return null;
  const session = await getSession(token);
  if (!session) return null;
  return session as any;
}

// ── GET /api/properties ────────────────────────────────────────────────────
router.get("/properties", async (req, res) => {
  try {
    const q = req.query as Record<string, string>;
    const {
      search, category, subCategory, city, district, districts, compound, street,
      status, providerId, featured, urgent, listingType,
      priceMin, priceMax, areaMin, areaMax,
      rooms, bathrooms, floor, floorMin,
      ageMin, ageMax,
      finishing, condition, furnished, direction, facade,
      paymentMethod, rentDuration, advertiserType,
      features,
      sortBy,
      verified,
      createdSince,
      page,
      limit,
    } = q;

    const conditions: any[] = [];

    // status=all → no filter (admin only). status=<value> → exact match. no status → show active + approved
    if (status === "all") {
      // Admin/moderator only — reject unauthenticated or non-admin callers
      const authCheck = await requireAuth(req);
      if (!authCheck) {
        return res.status(401).json({ success: false, error: "غير مصرح — يجب تسجيل الدخول" });
      }
      const [sessionUser] = await db
        .select({ role: usersTable.role })
        .from(usersTable)
        .where(eq(usersTable.id, authCheck.userId))
        .limit(1);
      if (sessionUser?.role !== "admin" && sessionUser?.role !== "moderator") {
        return res.status(403).json({ success: false, error: "غير مصرح لك بهذه العملية" });
      }
      // no status filter — admin sees everything
    } else if (status) {
      conditions.push(eq(propertiesTable.status, status));
    } else {
      conditions.push(inArray(propertiesTable.status, ["active", "approved"]));
    }
    if (category) {
      // Land can be stored as the group slug "land", Arabic group names, or specific Arabic subtypes.
      // All of these should be treated as "any land property".
      // Map group slugs/names to all possible stored mainCategory values (legacy slugs + Arabic subtypes)
      const GROUP_ALL_VALUES: Record<string, string[]> = {
        land:        ["land", "أرض", "أراضي", "أرض سكنية", "أرض تجارية", "أرض زراعية", "أرض صناعية", "أرض خدمية"],
        "أرض":      ["land", "أرض", "أراضي", "أرض سكنية", "أرض تجارية", "أرض زراعية", "أرض صناعية", "أرض خدمية"],
        "أراضي":    ["land", "أرض", "أراضي", "أرض سكنية", "أرض تجارية", "أرض زراعية", "أرض صناعية", "أرض خدمية"],
        residential: ["residential", "سكني", "شقة", "فيلا", "دوبلكس", "بنتهاوس", "استوديو", "تاون هاوس", "روف", "استراحة", "عمارة", "غرفة", "شاليه"],
        "سكني":     ["residential", "سكني", "شقة", "فيلا", "دوبلكس", "بنتهاوس", "استوديو", "تاون هاوس", "روف", "استراحة", "عمارة", "غرفة", "شاليه"],
        commercial:  ["commercial", "تجاري", "محل", "مكتب", "مستودع", "معرض", "عيادة", "مطعم", "محل تجاري", "مجمع تجاري", "فندق"],
        "تجاري":    ["commercial", "تجاري", "محل", "مكتب", "مستودع", "معرض", "عيادة", "مطعم", "محل تجاري", "مجمع تجاري", "فندق"],
      };
      const groupValues = GROUP_ALL_VALUES[category];
      if (groupValues) {
        conditions.push(inArray(propertiesTable.mainCategory, groupValues));
      } else {
        conditions.push(eq(propertiesTable.mainCategory, category));
      }
    }
    if (subCategory) conditions.push(eq(propertiesTable.subCategory, subCategory));
    if (providerId) conditions.push(eq(propertiesTable.providerId, parseInt(providerId)));
    if (featured === "true") conditions.push(eq(propertiesTable.featured, true));
    if (urgent === "true") conditions.push(eq(propertiesTable.urgent, true));
    if (listingType) conditions.push(eq(propertiesTable.listingType, listingType));
    if (finishing) conditions.push(eq(propertiesTable.finishing, finishing));
    if (condition) conditions.push(eq(propertiesTable.condition, condition));
    if (furnished) conditions.push(eq(propertiesTable.furnished, furnished));
    if (direction) conditions.push(eq(propertiesTable.direction, direction));
    if (facade) conditions.push(eq(propertiesTable.facade, facade));
    if (paymentMethod) conditions.push(eq(propertiesTable.paymentMethod, paymentMethod));
    if (rentDuration) conditions.push(eq(propertiesTable.rentDuration, rentDuration));
    if (advertiserType) conditions.push(eq(propertiesTable.advertiserType, advertiserType));

    if (priceMin) conditions.push(sql`CAST(${propertiesTable.price} AS numeric) >= ${parseFloat(priceMin)}`);
    if (priceMax) conditions.push(sql`CAST(${propertiesTable.price} AS numeric) <= ${parseFloat(priceMax)}`);
    if (areaMin) conditions.push(sql`CAST(${propertiesTable.area} AS numeric) >= ${parseFloat(areaMin)}`);
    if (areaMax) conditions.push(sql`CAST(${propertiesTable.area} AS numeric) <= ${parseFloat(areaMax)}`);
    if (rooms) conditions.push(sql`${propertiesTable.rooms} >= ${parseInt(rooms)}`);
    if (bathrooms) conditions.push(sql`${propertiesTable.bathrooms} >= ${parseInt(bathrooms)}`);

    const currentYear = new Date().getFullYear();
    if (ageMin) conditions.push(sql`${propertiesTable.buildYear} <= ${currentYear - parseInt(ageMin)}`);
    if (ageMax) conditions.push(sql`${propertiesTable.buildYear} >= ${currentYear - parseInt(ageMax)}`);

    if (search) {
      conditions.push(or(
        ilike(propertiesTable.title, `%${search}%`),
        ilike(propertiesTable.description, `%${search}%`),
        ilike(propertiesTable.address, `%${search}%`),
        ilike(propertiesTable.district, `%${search}%`),
        ilike(propertiesTable.compound, `%${search}%`),
      ));
    }
    if (city) {
      conditions.push(or(
        ilike(propertiesTable.district, `%${city}%`),
        ilike(propertiesTable.address, `%${city}%`),
      ));
    }
    if (compound) conditions.push(ilike(propertiesTable.compound, `%${compound}%`));
    if (street) conditions.push(ilike(propertiesTable.street, `%${street}%`));

    if (features) {
      const featureList = features.split(",").map(f => f.trim()).filter(Boolean);
      for (const feat of featureList) {
        conditions.push(sql`${propertiesTable.features}::text ILIKE ${'%' + feat + '%'}`);
      }
    }

    // ── Extra filters ────────────────────────────────────────────────────────
    if (floor && !floorMin) conditions.push(eq(propertiesTable.floor, parseInt(floor)));
    if (floorMin) conditions.push(sql`${propertiesTable.floor} >= ${parseInt(floorMin)}`);
    if (verified === "true") conditions.push(eq(providersTable.verified, true));
    if (createdSince) conditions.push(sql`${propertiesTable.createdAt} >= ${new Date(createdSince)}`);
    // Multi-district filter: `districts` (comma-sep) takes precedence over single `district`
    if (districts) {
      const dList = districts.split(",").map(d => d.trim()).filter(Boolean);
      if (dList.length === 1) {
        conditions.push(ilike(propertiesTable.district, `%${dList[0]}%`));
      } else if (dList.length > 1) {
        conditions.push(or(...dList.map(d => ilike(propertiesTable.district, `%${d}%`))));
      }
    } else if (district) {
      conditions.push(ilike(propertiesTable.district, `%${district}%`));
    }

    let orderClause: any = sql`COALESCE(${propertiesTable.approvedAt}, ${propertiesTable.createdAt}) DESC NULLS LAST`;
    if (sortBy === "price_asc") orderClause = sql`CAST(${propertiesTable.price} AS numeric) ASC NULLS LAST`;
    else if (sortBy === "price_desc") orderClause = sql`CAST(${propertiesTable.price} AS numeric) DESC NULLS LAST`;
    else if (sortBy === "popular") orderClause = desc(propertiesTable.viewCount);
    else if (sortBy === "area_asc") orderClause = sql`CAST(${propertiesTable.area} AS numeric) ASC NULLS LAST`;
    else if (sortBy === "area_desc") orderClause = sql`CAST(${propertiesTable.area} AS numeric) DESC NULLS LAST`;

    const whereClause = conditions.length ? and(...conditions) : undefined;

    // ── Pagination ───────────────────────────────────────────────────────────
    const pageNum  = Math.max(1, parseInt(page ?? "1") || 1);
    const rawLimit = parseInt(limit ?? "0") || 0;
    // Hard cap: even unbounded requests return at most 200 rows to prevent full-table scans
    const limitNum = rawLimit > 0 ? Math.min(200, rawLimit) : 200;
    const paginate = rawLimit > 0; // include pagination meta only when caller specified a limit

    // Total count (for meta) — only when paginating
    let total = 0;
    if (paginate) {
      const [countRow] = await db
        .select({ count: sql<number>`COUNT(*)::int` })
        .from(propertiesTable)
        .leftJoin(providersTable, eq(propertiesTable.providerId, providersTable.id))
        .where(whereClause);
      total = countRow?.count ?? 0;
    }

    const baseQuery = db
      .select({
        ...getTableColumns(propertiesTable),
        agentName: usersTable.name,
        agentAvatar: providersTable.avatar,
        agentLogo: providersTable.logo,
        verified: providersTable.verified,
        providerPhone: providersTable.phone,
        providerWhatsapp: providersTable.whatsapp,
      })
      .from(propertiesTable)
      .leftJoin(providersTable, eq(propertiesTable.providerId, providersTable.id))
      .leftJoin(usersTable, eq(providersTable.userId, usersTable.id))
      .where(whereClause)
      .orderBy(sql`${propertiesTable.featured} DESC NULLS LAST`, sql`${propertiesTable.urgent} DESC NULLS LAST`, orderClause);

    const rows = paginate
      ? await baseQuery.limit(limitNum).offset((pageNum - 1) * limitNum)
      : await baseQuery;

    // Apply smart ranking (boost scores from active promotions)
    const ranked = await applySmartRanking(rows.map(r => ({
      ...r,
      featured: r.featured ?? false,
      urgent: r.urgent ?? false,
      viewCount: r.viewCount ?? 0,
    })));

    if (paginate) {
      res.json({
        success: true,
        data: ranked,
        meta: {
          total,
          page: pageNum,
          limit: limitNum,
          totalPages: Math.ceil(total / limitNum),
        },
      });
    } else {
      res.json({ success: true, data: ranked });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message ?? "Failed to fetch properties" });
  }
});

// ── GET /api/properties/:id ────────────────────────────────────────────────
router.get("/properties/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid id" });
    const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, id));
    if (!property) return res.status(404).json({ success: false, error: "Not found" });

    let agentName = "";
    let agentAvatar = "";
    let agentLogo = "";
    let agentCity = "";
    let agentDistrict = "";
    let agentMemberSince: string | null = null;
    let providerIdForAgent: number | null = property.providerId;
    let providerOwnerUserId: number | null = null;

    try {
      const [prov] = await db.select({
        id: providersTable.id,
        avatar: providersTable.avatar,
        logo: providersTable.logo,
        city: providersTable.city,
        district: providersTable.district,
        createdAt: providersTable.createdAt,
        userId: providersTable.userId,
      }).from(providersTable).where(eq(providersTable.id, property.providerId!));

      if (prov) {
        agentAvatar = prov.avatar ?? "";
        agentLogo = prov.logo ?? "";
        agentCity = prov.city ?? "";
        agentDistrict = prov.district ?? "";
        agentMemberSince = prov.createdAt?.toISOString() ?? null;
        providerOwnerUserId = prov.userId ?? null;

        const [usr] = await db.select({ name: usersTable.name })
          .from(usersTable).where(eq(usersTable.id, prov.userId));
        if (usr) agentName = usr.name ?? "";
      }
    } catch {}

    // Resolve final ownerUserId: direct user property or via provider
    const resolvedOwnerUserId = property.ownerUserId ?? providerOwnerUserId;

    // Fetch active promotion for this property
    let activePromotion: { type: string; boostScore: number; expiresAt: Date | null } | null = null;
    try {
      const [promo] = await db
        .select({
          type: propertyPromotionsTable.type,
          boostScore: propertyPromotionsTable.boostScore,
          expiresAt: propertyPromotionsTable.expiresAt,
        })
        .from(propertyPromotionsTable)
        .where(
          and(
            eq(propertyPromotionsTable.propertyId, id),
            eq(propertyPromotionsTable.isActive, true),
            sql`(${propertyPromotionsTable.expiresAt} IS NULL OR ${propertyPromotionsTable.expiresAt} > NOW())`
          )
        )
        .orderBy(desc(propertyPromotionsTable.boostScore))
        .limit(1);
      if (promo) {
        activePromotion = { type: promo.type, boostScore: promo.boostScore ?? 0, expiresAt: promo.expiresAt };
      }
    } catch {}

    res.json({
      success: true,
      data: {
        ...property,
        agentName,
        agentAvatar,
        agentLogo,
        agentCity,
        agentDistrict,
        agentMemberSince,
        providerId: providerIdForAgent,
        ownerUserId: resolvedOwnerUserId,
        activePromotion,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message ?? "Failed to fetch property" });
  }
});

// ── POST /api/properties/:id/view — deduplicated view count ───────────────
router.post("/properties/:id/view", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid id" });
    // Derive session identifier server-side — never trust the client-supplied sessionId
    const sessionId: string = (() => {
      const cookieToken = req.cookies?.session as string | undefined;
      const bearerToken = (req.headers.authorization as string | undefined)?.replace(/^Bearer\s+/i, "");
      const token = cookieToken ?? bearerToken;
      if (token) return `tok:${token.slice(-24)}`;
      return `ip:${(req.ip ?? "unknown").replace(/^::ffff:/, "")}`;
    })();

    // Check for existing view from same sessionId within 24 hours
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const existing = await db
      .select({ id: userViewsTable.id })
      .from(userViewsTable)
      .where(
        and(
          eq(userViewsTable.propertyId, id),
          eq(userViewsTable.sessionId, sessionId),
          gt(userViewsTable.createdAt, cutoff),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      // Already counted recently — return current count without incrementing
      const [row] = await db
        .select({ viewCount: propertiesTable.viewCount })
        .from(propertiesTable)
        .where(eq(propertiesTable.id, id))
        .limit(1);
      return res.json({ success: true, counted: false, viewCount: row?.viewCount ?? 0 });
    }

    // New view: insert record + increment counter
    await db.insert(userViewsTable).values({
      sessionId,
      propertyId: id,
      userId: null,
      durationSec: req.body?.durationSec ?? 0,
    });

    const [updated] = await db
      .update(propertiesTable)
      .set({ viewCount: sql`${propertiesTable.viewCount} + 1` })
      .where(eq(propertiesTable.id, id))
      .returning({ viewCount: propertiesTable.viewCount });

    res.json({ success: true, counted: true, viewCount: updated?.viewCount ?? 0 });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ── POST /api/properties/:id/phone-click — increment phone click count ────
router.post("/properties/:id/phone-click", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    await db.update(propertiesTable)
      .set({ phoneClickCount: sql`${propertiesTable.phoneClickCount} + 1` })
      .where(eq(propertiesTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ── POST /api/properties/:id/whatsapp-click — increment whatsapp click count ─
router.post("/properties/:id/whatsapp-click", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    await db.update(propertiesTable)
      .set({ whatsappClickCount: sql`${propertiesTable.whatsappClickCount} + 1` })
      .where(eq(propertiesTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ── POST /api/properties ──────────────────────────────────────────────────
/**
 * Resolves the active subscription for a provider and checks if they are within
 * their property quota. Returns an error string if over limit, or null if allowed.
 */
/**
 * Checks whether a regular (non-provider) user is within
 * their property quota based on their active subscription.
 * Returns an error string if over limit, or null if allowed.
 */
async function checkUserQuota(userId: number): Promise<string | null> {
  const now = new Date();
  const [activeSub] = await db
    .select({
      id: subscriptionsTable.id,
      billingPlanId: subscriptionsTable.billingPlanId,
      bpLimits: billingPlansTable.limits,
    })
    .from(subscriptionsTable)
    .leftJoin(billingPlansTable, eq(subscriptionsTable.billingPlanId, billingPlansTable.id))
    .where(
      and(
        eq(subscriptionsTable.userId, userId),
        eq(subscriptionsTable.status, "active"),
        sql`${subscriptionsTable.endDate} > ${now}`,
      )
    )
    .orderBy(desc(subscriptionsTable.id))
    .limit(1);

  // Default limit for users without a subscription
  const DEFAULT_USER_MAX = 3;

  let maxListings: number | null = DEFAULT_USER_MAX;
  if (activeSub?.bpLimits) {
    try {
      const parsed = JSON.parse(activeSub.bpLimits).properties ?? null;
      if (parsed !== null) maxListings = parsed;
    } catch { /* use default */ }
  }

  // -1 means unlimited
  if (maxListings === null || maxListings < 0) return null;

  const [countRow] = await db
    .select({ cnt: sql<number>`cast(count(*) as int)` })
    .from(propertiesTable)
    .where(
      and(
        eq(propertiesTable.ownerUserId, userId),
        or(
          eq(propertiesTable.status, "approved"),
          eq(propertiesTable.status, "active"),
          eq(propertiesTable.status, "pending"),
        )
      )
    );

  const used = countRow?.cnt ?? 0;
  if (used >= maxListings) {
    return `لقد وصلت إلى الحد الأقصى لعدد الإعلانات (${maxListings} إعلان). يرجى ترقية باقتك لإضافة المزيد.`;
  }

  return null;
}

async function checkProviderQuota(providerId: number): Promise<string | null> {
  const now = new Date();
  const [activeSub] = await db
    .select({
      id: subscriptionsTable.id,
      billingPlanId: subscriptionsTable.billingPlanId,
      packageId: subscriptionsTable.packageId,
      bpLimits: billingPlansTable.limits,
      pkgMaxListings: packagesTable.maxListings,
    })
    .from(subscriptionsTable)
    .leftJoin(billingPlansTable, eq(subscriptionsTable.billingPlanId, billingPlansTable.id))
    .leftJoin(packagesTable, eq(subscriptionsTable.packageId, packagesTable.id))
    .where(
      and(
        eq(subscriptionsTable.providerId, providerId),
        eq(subscriptionsTable.status, "active"),
        sql`${subscriptionsTable.endDate} > ${now}`,
      )
    )
    .orderBy(desc(subscriptionsTable.id))
    .limit(1);

  // Default listing quota for providers without an active subscription (matches free plan)
  const DEFAULT_PROVIDER_FREE_MAX = 3;

  if (!activeSub) {
    // Count current active + pending properties for this provider
    const [countRow] = await db
      .select({ cnt: sql<number>`cast(count(*) as int)` })
      .from(propertiesTable)
      .where(
        and(
          eq(propertiesTable.providerId, providerId),
          or(
            eq(propertiesTable.status, "approved"),
            eq(propertiesTable.status, "active"),
            eq(propertiesTable.status, "pending"),
          )
        )
      );
    const used = countRow?.cnt ?? 0;
    if (used >= DEFAULT_PROVIDER_FREE_MAX) {
      return `لقد وصلت إلى الحد الأقصى للباقة المجانية (${DEFAULT_PROVIDER_FREE_MAX} إعلانات). يرجى الاشتراك في إحدى الباقات لإضافة المزيد.`;
    }
    return null;
  }

  // Resolve max listings limit
  let maxListings: number | null = null;
  if (activeSub.bpLimits) {
    try { maxListings = JSON.parse(activeSub.bpLimits).properties ?? null; } catch { /* */ }
  }
  if (maxListings == null) maxListings = activeSub.pkgMaxListings ?? null;

  // -1 means unlimited
  if (maxListings === null || maxListings < 0) return null;

  // Count current active + pending properties for this provider
  const [countRow] = await db
    .select({ cnt: sql<number>`cast(count(*) as int)` })
    .from(propertiesTable)
    .where(
      and(
        eq(propertiesTable.providerId, providerId),
        or(
          eq(propertiesTable.status, "approved"),
          eq(propertiesTable.status, "active"),
          eq(propertiesTable.status, "pending"),
        )
      )
    );

  const used = countRow?.cnt ?? 0;
  if (used >= maxListings) {
    return `لقد وصلت إلى الحد الأقصى لعدد الإعلانات في باقتك (${maxListings} إعلان). يرجى ترقية باقتك لإضافة المزيد.`;
  }

  return null; // within quota
}

router.post("/properties", async (req, res) => {
  try {
    const session = await requireAuth(req);
    if (!session) return res.status(401).json({ success: false, error: "Not authenticated" });

    const {
      providerId, title, description, mainCategory, listingType, subCategory,
      price, area, rooms, bathrooms, floor, totalFloors, buildYear,
      finishing, condition, furnished, direction, paymentMethod,
      address, regionId, cityId, district, compound, street, latitude, longitude,
      images, videoUrl, brochureUrl, logoUrl, phone, whatsapp,
      features, nearbyServices, nearbyLandmarks, contactMethods, status,
      allPhones, negotiable, locationConfidence, extractedJson,
      urgent: urgentBody, advertiserType,
    } = req.body;

    if (!title) return res.status(400).json({ success: false, error: "العنوان مطلوب" });
    if (!mainCategory) return res.status(400).json({ success: false, error: "التصنيف الرئيسي مطلوب" });
    if (!listingType) return res.status(400).json({ success: false, error: "نوع القائمة مطلوب" });
    if (!providerId && !session.userId) return res.status(400).json({ success: false, error: "معرّف المزود أو المستخدم مطلوب" });

    // ── Subscription quota check ──────────────────────────────────────────────
    // Admin users bypass quota enforcement
    const parsedProviderId = providerId ? parseInt(String(providerId)) : null;
    const [sessionUser] = await db
      .select({ role: usersTable.role })
      .from(usersTable)
      .where(eq(usersTable.id, session.userId))
      .limit(1);
    const isAdmin = sessionUser?.role === "admin";

    if (!isAdmin) {
      if (parsedProviderId) {
        // ── Approval check: unapproved providers cannot add properties ──────────
        const [provStatus] = await db
          .select({ approved: providersTable.approved })
          .from(providersTable)
          .where(eq(providersTable.id, parsedProviderId))
          .limit(1);
        if (provStatus && provStatus.approved === false) {
          return res.status(403).json({
            success: false,
            error: "حسابك قيد المراجعة — سيتم تفعيله بعد موافقة فريق الإدارة. قد يستغرق ذلك حتى 24 ساعة.",
            code: "ACCOUNT_PENDING",
          });
        }

        // Provider quota: enforced via billing plan limits
        const quotaError = await checkProviderQuota(parsedProviderId);
        if (quotaError) {
          return res.status(403).json({ success: false, error: quotaError, code: "QUOTA_EXCEEDED" });
        }
      } else {
        // Regular user quota: check against active subscription max listings
        const quotaError = await checkUserQuota(session.userId);
        if (quotaError) {
          return res.status(403).json({ success: false, error: quotaError, code: "QUOTA_EXCEEDED" });
        }
      }
    }

    const [property] = await db.insert(propertiesTable).values({
      providerId: providerId ? parseInt(providerId) : null,
      ownerUserId: !providerId ? session.userId : null,
      title,
      description,
      mainCategory,
      listingType,
      subCategory,
      price: price ? String(price) : null,
      area: area ? String(area) : null,
      rooms: rooms ? parseInt(rooms) : null,
      bathrooms: bathrooms ? parseInt(bathrooms) : null,
      floor: floor != null ? parseInt(floor) : null,
      totalFloors: totalFloors ? parseInt(totalFloors) : null,
      buildYear: buildYear ? parseInt(buildYear) : null,
      finishing,
      condition,
      furnished,
      direction,
      paymentMethod,
      advertiserType: advertiserType ?? null,
      address,
      regionId: regionId ? parseInt(regionId) : null,
      cityId: cityId ? parseInt(cityId) : null,
      district,
      compound: compound ?? null,
      street: street ?? null,
      latitude: (latitude != null && latitude !== "") ? (() => {
        const lat = parseFloat(String(latitude));
        return (!isNaN(lat) && lat >= -90 && lat <= 90) ? String(lat) : null;
      })() : null,
      longitude: (longitude != null && longitude !== "") ? (() => {
        const lon = parseFloat(String(longitude));
        return (!isNaN(lon) && lon >= -180 && lon <= 180) ? String(lon) : null;
      })() : null,
      images: Array.isArray(images) ? JSON.stringify(images) : images,
      videoUrl,
      brochureUrl,
      logoUrl,
      phone,
      whatsapp: whatsapp ?? null,
      features: Array.isArray(features) ? JSON.stringify(features) : features,
      nearbyServices: Array.isArray(nearbyServices) ? JSON.stringify(nearbyServices) : nearbyServices,
      nearbyLandmarks: Array.isArray(nearbyLandmarks) ? JSON.stringify(nearbyLandmarks) : (nearbyLandmarks ?? null),
      contactMethods: Array.isArray(contactMethods) ? JSON.stringify(contactMethods) : contactMethods,
      allPhones: Array.isArray(allPhones) ? JSON.stringify(allPhones) : (allPhones ?? null),
      negotiable: negotiable === true || negotiable === "true" ? true : false,
      urgent: urgentBody === true || urgentBody === "true" ? true : false,
      locationConfidence: locationConfidence ?? null,
      extractedJson: extractedJson ? (typeof extractedJson === "string" ? extractedJson : JSON.stringify(extractedJson)) : null,
      status: (status as string) || "pending",
      approvedAt: ((status as string) === "approved" || (status as string) === "active") ? new Date() : null,
    }).returning();

    sendWhatsAppNotification(property).catch(() => {});
    triggerSavedSearchAlerts(property).catch(() => {});
    events.onPropertySubmitted(property).catch(() => {});

    // Invalidate market cache for this area/category
    import("../lib/market-engine").then(({ invalidateMarketCache }) =>
      invalidateMarketCache(property.mainCategory, property.cityId, property.regionId).catch(() => {})
    ).catch(() => {});

    res.json({ success: true, data: property });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message ?? "Failed to create property" });
  }
});

// ── PUT /api/properties/:id ────────────────────────────────────────────────
router.put("/properties/:id", async (req, res) => {
  try {
    const session = await requireAuth(req);
    if (!session) return res.status(401).json({ success: false, error: "Not authenticated" });

    const id = parseInt(String(req.params.id));
    if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid id" });
    const [existing] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, id));
    if (!existing) return res.status(404).json({ success: false, error: "Property not found" });

    // ── Ownership check ───────────────────────────────────────────────────
    const _role = (session as any).role;
    const _isAdmin = _role === "admin" || _role === "moderator";
    if (!_isAdmin) {
      const isOwnerDirect = existing.ownerUserId != null && existing.ownerUserId === session.userId;
      const isOwnerViaProvider =
        existing.providerId != null &&
        session.providerId != null &&
        existing.providerId === session.providerId;
      if (!isOwnerDirect && !isOwnerViaProvider) {
        return res.status(403).json({ success: false, error: "غير مصرح لك بتعديل هذا العقار" });
      }
    }

    // ── Explicit allowlist prevents mass-assignment of sensitive fields ──────
    // Owner-settable fields (content and location only)
    const USER_UPDATABLE: ReadonlyArray<string> = [
      "title", "description", "mainCategory", "listingType", "subCategory",
      "price", "area", "rooms", "bathrooms", "floor", "totalFloors", "buildYear",
      "finishing", "condition", "furnished", "direction", "facade",
      "paymentMethod", "rentDuration", "advertiserType", "compound",
      "address", "regionId", "cityId", "district", "street",
      "latitude", "longitude", "images", "videoUrl", "brochureUrl", "logoUrl",
      "phone", "whatsapp", "features", "nearbyServices", "contactMethods",
    ];
    // Admin/moderator can additionally update presentation and moderation fields
    const ADMIN_EXTRA: ReadonlyArray<string> = ["featured", "urgent", "expiresAt", "approvedAt"];
    const allowedKeys = _isAdmin ? [...USER_UPDATABLE, ...ADMIN_EXTRA] : USER_UPDATABLE;

    const updateData: any = {};
    for (const key of allowedKeys) {
      if (key in req.body) updateData[key] = req.body[key];
    }

    // Serialize array fields
    if (Array.isArray(updateData.images)) updateData.images = JSON.stringify(updateData.images);
    if (Array.isArray(updateData.features)) updateData.features = JSON.stringify(updateData.features);
    if (Array.isArray(updateData.nearbyServices)) updateData.nearbyServices = JSON.stringify(updateData.nearbyServices);
    if (Array.isArray(updateData.contactMethods)) updateData.contactMethods = JSON.stringify(updateData.contactMethods);

    // Convert empty strings → null (prevents type errors on numeric/foreign key columns)
    for (const key of Object.keys(updateData)) {
      if (updateData[key] === "") updateData[key] = null;
    }

    // Parse integer fields (accept string or number, null-safe)
    const intFields = ["rooms", "bathrooms", "floor", "totalFloors", "buildYear", "regionId", "cityId"];
    for (const field of intFields) {
      if (updateData[field] !== undefined && updateData[field] !== null) {
        const parsed = parseInt(String(updateData[field]), 10);
        updateData[field] = isNaN(parsed) ? null : parsed;
      }
    }

    // Parse decimal fields
    const decimalFields = ["latitude", "longitude"];
    for (const field of decimalFields) {
      if (updateData[field] !== undefined && updateData[field] !== null) {
        const parsed = parseFloat(String(updateData[field]));
        updateData[field] = isNaN(parsed) ? null : String(parsed);
      }
    }

    // Non-admin editing any non-pending property → reset to pending / updated_after_rejection
    const sessionRole = (session as any).role;
    const wasRejected   = sessionRole !== "admin" && existing.status === "rejected";
    const wasResubmit   = sessionRole !== "admin" && existing.status === "updated_after_rejection";

    if (sessionRole !== "admin") {
      if (existing.status === "rejected") {
        // Distinct status so admin can see this was previously rejected
        updateData.status = "updated_after_rejection";
        updateData.rejectionReason = null;
      } else if (["approved", "active", "updated_after_rejection"].includes(existing.status ?? "")) {
        updateData.status = "pending";
        updateData.rejectionReason = null;
      }
    }
    // Always track edit timestamp
    updateData.updatedAt = new Date();

    const [updated] = await db.update(propertiesTable).set(updateData).where(eq(propertiesTable.id, id)).returning();

    // Fire appropriate event
    if (wasRejected || wasResubmit) {
      // Resubmitted after rejection → distinct admin notification
      events.onPropertyUpdatedAfterRejection(updated ?? existing).catch(() => {});
    } else {
      events.onPropertyEdited(updated ?? existing).catch(() => {});
    }

    // Invalidate market cache
    import("../lib/market-engine").then(({ invalidateMarketCache }) =>
      invalidateMarketCache(existing.mainCategory, existing.cityId, existing.regionId).catch(() => {})
    ).catch(() => {});

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message ?? "Failed to update property" });
  }
});

// ── DELETE /api/properties/:id ─────────────────────────────────────────────
router.delete("/properties/:id", async (req, res) => {
  try {
    const session = await requireAuth(req);
    if (!session) return res.status(401).json({ success: false, error: "Not authenticated" });

    const id = parseInt(String(req.params.id));
    if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid id" });
    const [toDelete] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, id));
    if (!toDelete) return res.status(404).json({ success: false, error: "Property not found" });

    // ── Ownership check ───────────────────────────────────────────────────
    const sessionRole = (session as any).role;
    const deletedByAdmin = sessionRole === "admin" || sessionRole === "moderator";
    if (!deletedByAdmin) {
      const isOwnerDirect = toDelete.ownerUserId != null && toDelete.ownerUserId === session.userId;
      const isOwnerViaProvider =
        toDelete.providerId != null &&
        session.providerId != null &&
        toDelete.providerId === session.providerId;
      if (!isOwnerDirect && !isOwnerViaProvider) {
        return res.status(403).json({ success: false, error: "غير مصرح لك بحذف هذا العقار" });
      }
    }

    await db.delete(propertiesTable).where(eq(propertiesTable.id, id));

    // Fire events
    if (toDelete) {
      const deletedByAdmin = sessionRole === "admin" || sessionRole === "moderator";
      events.onPropertyDeleted(toDelete, deletedByAdmin).catch(() => {});

      import("../lib/market-engine").then(({ invalidateMarketCache }) =>
        invalidateMarketCache(toDelete.mainCategory, toDelete.cityId, toDelete.regionId).catch(() => {})
      ).catch(() => {});
    }

    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message ?? "Failed to delete property" });
  }
});

// ── GET /api/users/me/properties — current user's submitted properties ──────
// Legacy path /user/properties is kept as a backward-compat alias.
router.get(["/users/me/properties", "/user/properties"], async (req, res) => {
  try {
    const session = await requireAuth(req);
    if (!session) return res.status(401).json({ success: false, error: "Not authenticated" });

    // Find the provider record for this user (if provider role)
    let providerIdForUser: number | null = null;
    if ((session as any).role === "provider") {
      const [prov] = await db.select({ id: providersTable.id }).from(providersTable).where(eq(providersTable.userId, session.userId));
      if (prov) providerIdForUser = prov.id;
    }

    const rows = await db
      .select({
        ...getTableColumns(propertiesTable),
        favoritesCount: sql<number>`(SELECT COUNT(*)::int FROM property_favorites WHERE property_id = ${propertiesTable.id})`,
        messageCount: sql<number>`(SELECT COUNT(*)::int FROM messages WHERE property_id = ${propertiesTable.id})`,
      })
      .from(propertiesTable)
      .where(
        providerIdForUser
          ? or(eq(propertiesTable.ownerUserId, session.userId), eq(propertiesTable.providerId, providerIdForUser))
          : eq(propertiesTable.ownerUserId, session.userId)
      )
      .orderBy(desc(propertiesTable.createdAt));
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ── PATCH /api/properties/:id/status — admin only ─────────────────────────
router.patch("/properties/:id/status", adminOnly, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const { status, rejectionReason } = req.body;

    const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, id));
    if (!property) return res.status(404).json({ success: false, error: "Property not found" });

    const isApproving = status === "approved" || status === "active";
    const isRejecting = status === "rejected";
    const isExpiring  = status === "expired";

    // Default listing lifetime: 30 days from approval
    const LISTING_DAYS = 30;
    const expiresAt = isApproving
      ? new Date(Date.now() + LISTING_DAYS * 24 * 60 * 60 * 1000)
      : undefined;

    const [updated] = await db.update(propertiesTable)
      .set({
        status,
        updatedAt: new Date(),
        ...(isApproving ? { approvedAt: new Date(), expiresAt, rejectionReason: null } : {}),
        ...(isRejecting ? { rejectionReason: rejectionReason ?? null } : {}),
        ...(isExpiring  ? { expiresAt: new Date() } : {}),
      })
      .where(eq(propertiesTable.id, id))
      .returning();

    // Invalidate market cache on approval/rejection
    if (isApproving || isRejecting) {
      import("../lib/market-engine").then(({ invalidateMarketCache }) =>
        invalidateMarketCache(property.mainCategory, property.cityId, property.regionId).catch(() => {})
      ).catch(() => {});
    }

    // Fire events: email + in-app notification + SSE broadcast
    if (isApproving) {
      events.onPropertyApproved(property).catch(() => {});
    } else if (isRejecting) {
      events.onPropertyRejected(property, rejectionReason ?? "").catch(() => {});
    } else if (isExpiring) {
      events.onPropertyExpired(property).catch(() => {});
    }

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message ?? "Failed to update status" });
  }
});

// ── PATCH /api/properties/:id/renew — renew an expired listing ────────────
router.patch("/properties/:id/renew", async (req, res) => {
  try {
    const session = await requireAuth(req);
    if (!session) return res.status(401).json({ success: false, error: "Not authenticated" });

    const id = parseInt(String(req.params.id));
    if (isNaN(id)) return res.status(400).json({ success: false, error: "Invalid id" });

    const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, id));
    if (!property) return res.status(404).json({ success: false, error: "Property not found" });

    // Owner or admin can renew
    const sessionRole = (session as any).role;
    const isAdmin = sessionRole === "admin" || sessionRole === "moderator";
    if (!isAdmin) {
      const isOwnerDirect = property.ownerUserId != null && property.ownerUserId === session.userId;
      const isOwnerViaProvider =
        property.providerId != null &&
        session.providerId != null &&
        property.providerId === session.providerId;
      if (!isOwnerDirect && !isOwnerViaProvider) {
        return res.status(403).json({ success: false, error: "Forbidden" });
      }

      // Re-check quota on renewal: an expired listing was not counted toward the limit,
      // so renewing it must still fit within the current plan.
      const quotaError = property.providerId
        ? await checkProviderQuota(property.providerId)
        : await checkUserQuota(session.userId);
      if (quotaError) {
        return res.status(403).json({ success: false, error: quotaError, code: "QUOTA_EXCEEDED" });
      }
    }

    if (property.status !== "expired") {
      return res.status(400).json({ success: false, error: "Only expired listings can be renewed" });
    }

    const LISTING_DAYS = 30;
    const expiresAt = new Date(Date.now() + LISTING_DAYS * 24 * 60 * 60 * 1000);

    const [updated] = await db.update(propertiesTable)
      .set({ status: "approved", approvedAt: new Date(), expiresAt, updatedAt: new Date() })
      .where(eq(propertiesTable.id, id))
      .returning();

    events.onPropertyApproved(property).catch(() => {});

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message ?? "Failed to renew property" });
  }
});

// ── Property Favorites ─────────────────────────────────────────────────────
// GET /api/property-favorites?userId=…
router.get("/property-favorites", async (req, res) => {
  try {
    const session = await requireAuth(req);
    if (!session) return res.status(401).json({ success: false, error: "Unauthorized" });
    const userId = session.userId;
    const rows = await db.select({
      id: propertyFavoritesTable.id,
      propertyId: propertyFavoritesTable.propertyId,
      createdAt: propertyFavoritesTable.createdAt,
      title: propertiesTable.title,
      price: propertiesTable.price,
      images: propertiesTable.images,
      mainCategory: propertiesTable.mainCategory,
      listingType: propertiesTable.listingType,
      address: propertiesTable.address,
      district: propertiesTable.district,
      status: propertiesTable.status,
    }).from(propertyFavoritesTable)
      .leftJoin(propertiesTable, eq(propertyFavoritesTable.propertyId, propertiesTable.id))
      .where(eq(propertyFavoritesTable.userId, userId))
      .orderBy(desc(propertyFavoritesTable.createdAt));
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// POST /api/property-favorites  { propertyId }
router.post("/property-favorites", async (req, res) => {
  try {
    const session = await requireAuth(req);
    if (!session) return res.status(401).json({ success: false, error: "Unauthorized" });
    const userId = session.userId;
    const { propertyId } = req.body;
    if (!propertyId) return res.status(400).json({ success: false, error: "propertyId required" });
    const [row] = await db.insert(propertyFavoritesTable)
      .values({ userId, propertyId: parseInt(propertyId) })
      .onConflictDoNothing()
      .returning();
    res.json({ success: true, data: row ?? { userId, propertyId } });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// DELETE /api/property-favorites/:propertyId
router.delete("/property-favorites/:propertyId", async (req, res) => {
  try {
    const session = await requireAuth(req);
    if (!session) return res.status(401).json({ success: false, error: "Unauthorized" });
    const userId = session.userId;
    const propertyId = parseInt(String(req.params.propertyId));
    await db.delete(propertyFavoritesTable)
      .where(and(eq(propertyFavoritesTable.userId, userId), eq(propertyFavoritesTable.propertyId, propertyId)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ── Saved Searches ─────────────────────────────────────────────────────────
// GET /api/saved-searches
router.get("/saved-searches", async (req, res) => {
  try {
    const session = await requireAuth(req);
    if (!session) return res.status(401).json({ success: false, error: "Unauthorized" });
    const rows = await db.select().from(savedSearchesTable)
      .where(eq(savedSearchesTable.userId, session.userId))
      .orderBy(desc(savedSearchesTable.createdAt));
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// POST /api/saved-searches  { name, email, filters, notifyEmail, notifyApp }
router.post("/saved-searches", async (req, res) => {
  try {
    const session = await requireAuth(req);
    if (!session) return res.status(401).json({ success: false, error: "Unauthorized" });
    const { name, email, filters, notifyEmail, notifyApp } = req.body;
    const [row] = await db.insert(savedSearchesTable).values({
      userId: session.userId,
      name: name || "بحث محفوظ",
      email: email || null,
      filters: typeof filters === "object" ? JSON.stringify(filters) : (filters ?? "{}"),
      notifyEmail: notifyEmail !== false,
      notifyApp: notifyApp !== false,
    }).returning();
    res.json({ success: true, data: row });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// DELETE /api/saved-searches/:id
router.delete("/saved-searches/:id", async (req, res) => {
  try {
    const session = await requireAuth(req);
    if (!session) return res.status(401).json({ success: false, error: "Unauthorized" });
    const id = parseInt(String(req.params.id));
    await db.delete(savedSearchesTable)
      .where(and(eq(savedSearchesTable.id, id), eq(savedSearchesTable.userId, session.userId)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

export default router;
