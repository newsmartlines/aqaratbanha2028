import { Router } from "express";
import { db } from "@workspace/db";
import {
  propertiesTable, propertyFavoritesTable, savedSearchesTable,
  notificationsTable, usersTable, siteSettingsTable, providersTable,
  userViewsTable,
} from "@workspace/db";
import { eq, desc, and, or, ilike, sql, getTableColumns, lt, gt, inArray } from "drizzle-orm";
import { getSession } from "./auth";

const router = Router();

// ── WhatsApp Notification via CallMeBot ────────────────────────────────────
const NOTIFY_PHONE = process.env.NOTIFY_WHATSAPP_PHONE ?? "00201066638523";
const CALLMEBOT_KEY = process.env.CALLMEBOT_API_KEY ?? "";

async function sendWhatsAppNotification(property: any) {
  if (!CALLMEBOT_KEY) {
    console.log("[WhatsApp] CALLMEBOT_API_KEY not set — skipping notification");
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

// ── Email helper (uses nodemailer via site settings) ──────────────────────
async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key));
  return row?.value ?? null;
}

async function sendSavedSearchEmail(toEmail: string, toName: string, property: any) {
  try {
    const cfg: Record<string, string> = {};
    for (const k of ["smtpHost", "smtpPort", "smtpSecure", "smtpUser", "smtpPass", "smtpFromName", "smtpFromEmail"]) {
      cfg[k] = (await getSetting(k)) ?? "";
    }
    if (!(cfg.smtpHost && cfg.smtpUser && cfg.smtpPass)) return;
    const nodemailer = await import("nodemailer");
    const tr = nodemailer.default.createTransport({
      host: cfg.smtpHost, port: Number(cfg.smtpPort) || 587,
      secure: cfg.smtpSecure === "true", auth: { user: cfg.smtpUser, pass: cfg.smtpPass },
    } as any);
    const siteName = (await getSetting("siteName")) ?? "عقارات بنها";
    const siteUrl = (await getSetting("siteUrl")) ?? "";
    const price = property.price ? `${Number(property.price).toLocaleString("ar-EG")} جنيه` : "السعر عند التواصل";
    const propLink = siteUrl ? `${siteUrl}/property/${property.id}` : `/property/${property.id}`;
    const html = `<!DOCTYPE html><html dir="rtl" lang="ar"><head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:Arial,sans-serif;direction:rtl;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:40px 0;">
<tr><td align="center">
<table width="580" cellpadding="0" cellspacing="0" border="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
<tr><td style="background:linear-gradient(135deg,#12B5D0,#0060A0);padding:32px;text-align:center;">
<p style="margin:0;color:#fff;font-size:22px;font-weight:800;">${siteName}</p>
<p style="margin:8px 0 0;color:rgba(255,255,255,0.8);font-size:14px;">عقار يطابق بحثك المحفوظ!</p>
</td></tr>
<tr><td style="padding:32px;">
<p style="color:#1e293b;font-size:16px;margin:0 0 8px;">مرحباً ${toName}،</p>
<p style="color:#475569;font-size:14px;margin:0 0 24px;">وجدنا عقاراً جديداً يتطابق مع بحثك المحفوظ:</p>
<div style="border:1px solid #e2e8f0;border-radius:12px;padding:20px;margin-bottom:24px;">
<p style="margin:0 0 8px;color:#1e293b;font-size:18px;font-weight:700;">${property.title}</p>
<p style="margin:0 0 4px;color:#0060A0;font-size:20px;font-weight:800;">${price}</p>
<p style="margin:0;color:#64748b;font-size:13px;">${property.address ?? property.district ?? ""}</p>
</div>
<a href="${propLink}" style="display:inline-block;background:linear-gradient(135deg,#12B5D0,#0060A0);color:#fff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:700;font-size:15px;">عرض العقار</a>
</td></tr>
</table></td></tr></table>
</body></html>`;
    await tr.sendMail({
      from: `"${cfg.smtpFromName || siteName}" <${cfg.smtpFromEmail || cfg.smtpUser}>`,
      to: `"${toName}" <${toEmail}>`,
      subject: `🏠 عقار جديد يطابق بحثك: ${property.title}`,
      html,
    });
  } catch (e) {
    console.warn("[SavedSearch] Email failed:", e);
  }
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

    for (const ss of searches) {
      let filters: Record<string, any> = {};
      try { filters = JSON.parse(ss.filters ?? "{}"); } catch { /* */ }
      if (!matchesFilters(property, filters)) continue;

      const [user] = await db.select({ name: usersTable.name, email: usersTable.email })
        .from(usersTable).where(eq(usersTable.id, ss.userId));
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
      search, category, subCategory, city, district, compound, street,
      status, providerId, featured, urgent, listingType,
      priceMin, priceMax, areaMin, areaMax,
      rooms, bathrooms, floor,
      ageMin, ageMax,
      finishing, condition, furnished, direction, facade,
      paymentMethod, rentDuration, advertiserType,
      features,
      sortBy,
    } = q;

    const conditions: any[] = [];

    // status=all → no filter (admin). status=<value> → exact match. no status → show active + approved
    if (status === "all") {
      // show everything — no filter
    } else if (status) {
      conditions.push(eq(propertiesTable.status, status));
    } else {
      conditions.push(inArray(propertiesTable.status, ["active", "approved"]));
    }
    if (category) conditions.push(eq(propertiesTable.mainCategory, category));
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
    if (floor) conditions.push(eq(propertiesTable.floor, parseInt(floor)));

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
    if (district) conditions.push(ilike(propertiesTable.district, `%${district}%`));
    if (compound) conditions.push(ilike(propertiesTable.compound, `%${compound}%`));
    if (street) conditions.push(ilike(propertiesTable.street, `%${street}%`));

    if (features) {
      const featureList = features.split(",").map(f => f.trim()).filter(Boolean);
      for (const feat of featureList) {
        conditions.push(sql`${propertiesTable.features}::text ILIKE ${'%' + feat + '%'}`);
      }
    }

    let orderClause: any = sql`COALESCE(${propertiesTable.approvedAt}, ${propertiesTable.createdAt}) DESC NULLS LAST`;
    if (sortBy === "price_asc") orderClause = sql`CAST(${propertiesTable.price} AS numeric) ASC NULLS LAST`;
    else if (sortBy === "price_desc") orderClause = sql`CAST(${propertiesTable.price} AS numeric) DESC NULLS LAST`;
    else if (sortBy === "popular") orderClause = desc(propertiesTable.viewCount);
    else if (sortBy === "area_asc") orderClause = sql`CAST(${propertiesTable.area} AS numeric) ASC NULLS LAST`;
    else if (sortBy === "area_desc") orderClause = sql`CAST(${propertiesTable.area} AS numeric) DESC NULLS LAST`;

    const rows = await db
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
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(sql`${propertiesTable.featured} DESC NULLS LAST`, sql`${propertiesTable.urgent} DESC NULLS LAST`, orderClause);

    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message ?? "Failed to fetch properties" });
  }
});

// ── GET /api/properties/:id ────────────────────────────────────────────────
router.get("/properties/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
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
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message ?? "Failed to fetch property" });
  }
});

// ── POST /api/properties/:id/view — deduplicated view count ───────────────
router.post("/properties/:id/view", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const sessionId: string = req.body?.sessionId ?? req.ip ?? "anon";

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
    const id = parseInt(req.params.id);
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
    const id = parseInt(req.params.id);
    await db.update(propertiesTable)
      .set({ whatsappClickCount: sql`${propertiesTable.whatsappClickCount} + 1` })
      .where(eq(propertiesTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ── POST /api/properties ──────────────────────────────────────────────────
router.post("/properties", async (req, res) => {
  try {
    const session = await requireAuth(req);
    if (!session) return res.status(401).json({ success: false, error: "Not authenticated" });

    const {
      providerId, title, description, mainCategory, listingType, subCategory,
      price, area, rooms, bathrooms, floor, totalFloors, buildYear,
      finishing, condition, furnished, direction, paymentMethod,
      address, regionId, cityId, district, latitude, longitude,
      images, videoUrl, brochureUrl, logoUrl, phone, whatsapp,
      features, nearbyServices, contactMethods, status,
    } = req.body;

    if (!title) return res.status(400).json({ success: false, error: "العنوان مطلوب" });
    if (!mainCategory) return res.status(400).json({ success: false, error: "التصنيف الرئيسي مطلوب" });
    if (!listingType) return res.status(400).json({ success: false, error: "نوع القائمة مطلوب" });
    if (!providerId && !session.userId) return res.status(400).json({ success: false, error: "معرّف المزود أو المستخدم مطلوب" });

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
      address,
      regionId: regionId ? parseInt(regionId) : null,
      cityId: cityId ? parseInt(cityId) : null,
      district,
      latitude: latitude ? String(latitude) : null,
      longitude: longitude ? String(longitude) : null,
      images: Array.isArray(images) ? JSON.stringify(images) : images,
      videoUrl,
      brochureUrl,
      logoUrl,
      phone,
      whatsapp,
      features: Array.isArray(features) ? JSON.stringify(features) : features,
      nearbyServices: Array.isArray(nearbyServices) ? JSON.stringify(nearbyServices) : nearbyServices,
      contactMethods: Array.isArray(contactMethods) ? JSON.stringify(contactMethods) : contactMethods,
      status: (status as string) || "pending",
      approvedAt: ((status as string) === "approved" || (status as string) === "active") ? new Date() : null,
    }).returning();

    sendWhatsAppNotification(property).catch(() => {});
    triggerSavedSearchAlerts(property).catch(() => {});

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

    const id = parseInt(req.params.id);
    const [existing] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, id));
    if (!existing) return res.status(404).json({ success: false, error: "Property not found" });

    const updateData: any = { ...req.body };

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

    // Remove read-only / computed columns
    delete updateData.viewCount;
    delete updateData.phoneClickCount;
    delete updateData.createdAt;
    delete updateData.id;

    // Non-admin editing an active/approved property → reset to pending for re-review
    const sessionRole = (session as any).role;
    if (sessionRole !== "admin" && (existing.status === "approved" || existing.status === "active")) {
      updateData.status = "pending";
    }

    const [updated] = await db.update(propertiesTable).set(updateData).where(eq(propertiesTable.id, id)).returning();
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

    const id = parseInt(req.params.id);
    await db.delete(propertiesTable).where(eq(propertiesTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message ?? "Failed to delete property" });
  }
});

// ── GET /api/user/properties — current user's submitted properties ─────────
router.get("/user/properties", async (req, res) => {
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
      .select()
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

// ── PATCH /api/properties/:id/status ──────────────────────────────────────
router.patch("/properties/:id/status", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { status, rejectionReason } = req.body;

    const [property] = await db.select().from(propertiesTable).where(eq(propertiesTable.id, id));
    if (!property) return res.status(404).json({ success: false, error: "Property not found" });

    const isApproving = status === "approved" || status === "active";
    const isRejecting = status === "rejected";

    const [updated] = await db.update(propertiesTable)
      .set({
        status,
        ...(isApproving ? { approvedAt: new Date() } : {}),
        ...(isRejecting ? { rejectionReason: rejectionReason ?? null } : {}),
      })
      .where(eq(propertiesTable.id, id))
      .returning();

    const ownerUserId = property.ownerUserId;
    if (ownerUserId && (isApproving || isRejecting)) {
      let notifMessage: string;
      if (isApproving) {
        notifMessage = `تمت الموافقة على إعلانك "${property.title}" وهو الآن ظاهر للجمهور.`;
      } else {
        notifMessage = `تم رفض إعلانك "${property.title}".`;
        if (rejectionReason) {
          notifMessage += `\n\n📋 سبب الرفض:\n${rejectionReason}`;
        }
        notifMessage += "\n\nيمكنك تعديل البيانات وإعادة تقديم الإعلان.";
      }
      await db.insert(notificationsTable).values({
        userId: ownerUserId,
        title: isApproving ? "✅ تمت الموافقة على عقارك" : "❌ تم رفض عقارك",
        message: notifMessage,
        type: isApproving ? "success" : "warning",
        link: "/user/my-properties",
      });
    }

    res.json({ success: true, data: updated });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message ?? "Failed to update status" });
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
    const propertyId = parseInt(req.params.propertyId);
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
    const id = parseInt(req.params.id);
    await db.delete(savedSearchesTable)
      .where(and(eq(savedSearchesTable.id, id), eq(savedSearchesTable.userId, session.userId)));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

export default router;
