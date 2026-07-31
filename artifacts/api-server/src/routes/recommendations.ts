import { Router } from "express";
import { db } from "@workspace/db";
import {
  propertiesTable,
  userSearchHistoryTable,
  userViewsTable,
  userPreferencesTable,
} from "@workspace/db";
import { eq, desc, sql, and, or, ne, inArray, ilike, not } from "drizzle-orm";
import { getSession } from "./auth";

const router = Router();

// ── helpers ────────────────────────────────────────────────────────────────
function sessionId(req: any): string {
  const cookie = req.cookies?.sessionId as string | undefined;
  if (cookie) return cookie;
  const header = req.headers["x-session-id"] as string | undefined;
  return header ?? "anonymous";
}

function getToken(req: any): string | undefined {
  return (
    (req.cookies as Record<string, string> | undefined)?.session ??
    (req.headers.authorization as string | undefined)?.replace(/^Bearer\s+/i, "")
  );
}

// ── POST /api/track/view ──────────────────────────────────────────────────
router.post("/track/view", async (req, res) => {
  try {
    const { propertyId, durationSec = 0 } = req.body as { propertyId: number; durationSec?: number };
    if (!propertyId) return res.json({ ok: false });

    const session = await getSession(getToken(req) ?? "");
    const sid = sessionId(req);

    // insert view
    await db.insert(userViewsTable).values({
      userId: session?.userId ?? null,
      sessionId: sid,
      propertyId,
      durationSec,
    });

    // increment viewCount on property
    await db
      .update(propertiesTable)
      .set({ viewCount: sql`${propertiesTable.viewCount} + 1` })
      .where(eq(propertiesTable.id, propertyId));

    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: false });
  }
});

// ── POST /api/track/search ────────────────────────────────────────────────
router.post("/track/search", async (req, res) => {
  try {
    const { keyword, listingType, category, city, resultsCount } = req.body as {
      keyword?: string; listingType?: string; category?: string; city?: string; resultsCount?: number;
    };

    const session = await getSession(getToken(req) ?? "");
    const sid = sessionId(req);

    await db.insert(userSearchHistoryTable).values({
      userId: session?.userId ?? null,
      sessionId: sid,
      keyword: keyword ?? null,
      listingType: listingType ?? null,
      category: category ?? null,
      city: city ?? null,
      resultsCount: resultsCount ?? 0,
    });

    res.json({ ok: true });
  } catch {
    res.json({ ok: false });
  }
});

// ── GET /api/trending ─────────────────────────────────────────────────────
router.get("/trending", async (req, res) => {
  try {
    const limit = Math.min(parseInt((req.query.limit as string) ?? "8"), 20);
    const rows = await db
      .select()
      .from(propertiesTable)
      .where(eq(propertiesTable.status, "active"))
      .orderBy(desc(propertiesTable.viewCount))
      .limit(limit);
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ── GET /api/recently-viewed ──────────────────────────────────────────────
// Pass ?ids=1,2,3,4 (from localStorage)
router.get("/recently-viewed", async (req, res) => {
  try {
    const raw = (req.query.ids as string) ?? "";
    const ids = raw.split(",").map(Number).filter(n => n > 0).slice(0, 10);
    if (!ids.length) return res.json({ success: true, data: [] });

    const rows = await db
      .select()
      .from(propertiesTable)
      .where(and(inArray(propertiesTable.id, ids), eq(propertiesTable.status, "active")));

    // preserve original order
    const map = new Map(rows.map(r => [r.id, r]));
    const ordered = ids.map(id => map.get(id)).filter(Boolean);

    res.json({ success: true, data: ordered });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ── GET /api/recommendations ──────────────────────────────────────────────
// Returns personalized (logged in) or trending (anonymous) properties.
// NOTE: Uses the same drizzle query shape as /trending to ensure the pg
// prepared-statement cache is already warm before this endpoint is hit.
router.get("/recommendations", async (req, res) => {
  try {
    const session = await getSession(getToken(req) ?? "");
    const limit = Math.min(parseInt((req.query.limit as string) ?? "8"), 20);
    const excludeId = req.query.excludeId ? parseInt(req.query.excludeId as string) : null;

    // Warm the db connection using a simple settings lookup (same pattern as other routes)
    let listingType: string | null = null;
    let category: string | null = null;

    if (session?.userId) {
      const history = await db
        .select()
        .from(userSearchHistoryTable)
        .where(eq(userSearchHistoryTable.userId, session.userId))
        .orderBy(desc(userSearchHistoryTable.createdAt))
        .limit(20);
      listingType = history.find(h => h.listingType)?.listingType ?? null;
      category = history.find(h => h.category)?.category ?? null;
    }

    // Build extra conditions beyond the base status filter
    const extra: any[] = [];
    if (excludeId) extra.push(ne(propertiesTable.id, excludeId));
    if (listingType) extra.push(eq(propertiesTable.listingType, listingType));
    if (category) extra.push(eq(propertiesTable.mainCategory, category));

    const where1 = extra.length > 0
      ? and(eq(propertiesTable.status, "active"), ...extra)
      : eq(propertiesTable.status, "active");

    let rows = await db
      .select()
      .from(propertiesTable)
      .where(where1)
      .orderBy(desc(propertiesTable.viewCount))
      .limit(limit);

    // Fill with trending if not enough results
    if (rows.length < limit) {
      const existingIds = rows.map(r => r.id);
      const extra2: any[] = [];
      if (excludeId) extra2.push(ne(propertiesTable.id, excludeId));
      if (existingIds.length) extra2.push(not(inArray(propertiesTable.id, existingIds)));
      const where2 = extra2.length > 0
        ? and(eq(propertiesTable.status, "active"), ...extra2)
        : eq(propertiesTable.status, "active");
      const fallback = await db
        .select()
        .from(propertiesTable)
        .where(where2)
        .orderBy(desc(propertiesTable.viewCount))
        .limit(limit - rows.length);
      rows = [...rows, ...fallback];
    }

    res.json({ success: true, data: rows });
  } catch (err: any) {
    console.error("[recommendations] error:", err?.message, err?.cause?.message ?? err?.cause);
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ── GET /api/similar-properties/:id ───────────────────────────────────────
router.get("/similar-properties/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const limit = Math.min(parseInt((req.query.limit as string) ?? "6"), 12);

    const [property] = await db
      .select({ mainCategory: propertiesTable.mainCategory, listingType: propertiesTable.listingType, district: propertiesTable.district })
      .from(propertiesTable)
      .where(eq(propertiesTable.id, id));

    if (!property) return res.json({ success: true, data: [] });

    const conditions: any[] = [
      eq(propertiesTable.status, "active"),
      ne(propertiesTable.id, id),
    ];
    if (property.mainCategory) conditions.push(eq(propertiesTable.mainCategory, property.mainCategory));
    if (property.listingType) conditions.push(eq(propertiesTable.listingType, property.listingType));

    const rows = await db
      .select()
      .from(propertiesTable)
      .where(and(...conditions))
      .orderBy(desc(propertiesTable.viewCount))
      .limit(limit);

    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ── GET /api/admin/analytics ──────────────────────────────────────────────
router.get("/admin/analytics", async (req, res) => {
  try {
    // Top keywords
    const topKeywords = await db
      .select({
        keyword: userSearchHistoryTable.keyword,
        count: sql<number>`count(*)::int`,
      })
      .from(userSearchHistoryTable)
      .where(sql`${userSearchHistoryTable.keyword} is not null and ${userSearchHistoryTable.keyword} != ''`)
      .groupBy(userSearchHistoryTable.keyword)
      .orderBy(desc(sql`count(*)`))
      .limit(15);

    // Top cities searched
    const topCities = await db
      .select({
        city: userSearchHistoryTable.city,
        count: sql<number>`count(*)::int`,
      })
      .from(userSearchHistoryTable)
      .where(sql`${userSearchHistoryTable.city} is not null`)
      .groupBy(userSearchHistoryTable.city)
      .orderBy(desc(sql`count(*)`))
      .limit(10);

    // Listing type breakdown
    const typeBreakdown = await db
      .select({
        listingType: userSearchHistoryTable.listingType,
        count: sql<number>`count(*)::int`,
      })
      .from(userSearchHistoryTable)
      .where(sql`${userSearchHistoryTable.listingType} is not null`)
      .groupBy(userSearchHistoryTable.listingType)
      .orderBy(desc(sql`count(*)`));

    // Category breakdown
    const categoryBreakdown = await db
      .select({
        category: userSearchHistoryTable.category,
        count: sql<number>`count(*)::int`,
      })
      .from(userSearchHistoryTable)
      .where(sql`${userSearchHistoryTable.category} is not null`)
      .groupBy(userSearchHistoryTable.category)
      .orderBy(desc(sql`count(*)`));

    // Top viewed properties
    const topProperties = await db
      .select({
        id: propertiesTable.id,
        title: propertiesTable.title,
        viewCount: propertiesTable.viewCount,
        listingType: propertiesTable.listingType,
        mainCategory: propertiesTable.mainCategory,
        district: propertiesTable.district,
        price: propertiesTable.price,
      })
      .from(propertiesTable)
      .where(eq(propertiesTable.status, "active"))
      .orderBy(desc(propertiesTable.viewCount))
      .limit(10);

    // Total searches
    const [{ totalSearches }] = await db
      .select({ totalSearches: sql<number>`count(*)::int` })
      .from(userSearchHistoryTable);

    // Total views
    const [{ totalViews }] = await db
      .select({ totalViews: sql<number>`count(*)::int` })
      .from(userViewsTable);

    // Unique sessions
    const [{ uniqueSessions }] = await db
      .select({ uniqueSessions: sql<number>`count(distinct session_id)::int` })
      .from(userViewsTable);

    res.json({
      success: true,
      data: {
        totalSearches,
        totalViews,
        uniqueSessions,
        topKeywords,
        topCities,
        typeBreakdown,
        categoryBreakdown,
        topProperties,
      },
    });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

export default router;
