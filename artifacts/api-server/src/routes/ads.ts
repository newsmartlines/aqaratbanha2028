import { Router } from "express";
import { db } from "@workspace/db";
import { adSpotsTable } from "@workspace/db";
import { eq, asc, sql } from "drizzle-orm";
import { getSession } from "./auth";

const router = Router();

/* ── Default ad spots seed data ─────────────────────────────────── */
export const AD_POSITIONS = [
  { position: "hero_bottom",        name: "بانر الهيرو السفلي",         adType: "leaderboard" },
  { position: "homepage_mid",       name: "بانر منتصف الرئيسية",        adType: "leaderboard" },
  { position: "homepage_before_footer", name: "بانر قبل الفوتر",       adType: "leaderboard" },
  { position: "search_top",         name: "بانر أعلى نتائج البحث",     adType: "leaderboard" },
  { position: "search_inline",      name: "إعلان داخل نتائج البحث",    adType: "native" },
  { position: "property_sidebar",   name: "بانر الشريط الجانبي للعقار", adType: "box" },
  { position: "property_bottom",    name: "بانر أسفل تفاصيل العقار",   adType: "leaderboard" },
  { position: "categories_top",     name: "بانر أعلى صفحة التصنيفات",  adType: "leaderboard" },
] as const;

/* ── GET /api/ads — public: fetch active ads by position(s) ──────── */
router.get("/ads", async (req, res) => {
  try {
    const { positions } = req.query as { positions?: string };
    const rows = await db
      .select()
      .from(adSpotsTable)
      .where(eq(adSpotsTable.isActive, true))
      .orderBy(asc(adSpotsTable.sortOrder));

    const filtered = positions
      ? rows.filter(r => positions.split(",").includes(r.position))
      : rows;

    res.json({ success: true, data: filtered });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

/* ── POST /api/ads/:id/impression — track impression ─────────────── */
router.post("/ads/:id/impression", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(adSpotsTable)
      .set({ impressions: sql`${adSpotsTable.impressions} + 1` })
      .where(eq(adSpotsTable.id, id));
    res.json({ ok: true });
  } catch { res.json({ ok: false }); }
});

/* ── POST /api/ads/:id/click — track click ───────────────────────── */
router.post("/ads/:id/click", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.update(adSpotsTable)
      .set({ clicks: sql`${adSpotsTable.clicks} + 1` })
      .where(eq(adSpotsTable.id, id));
    res.json({ ok: true });
  } catch { res.json({ ok: false }); }
});

/* ── GET /api/admin/ads — all spots ──────────────────────────────── */
router.get("/admin/ads", async (req, res) => {
  try {
    const rows = await db.select().from(adSpotsTable).orderBy(asc(adSpotsTable.sortOrder));
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

/* ── POST /api/admin/ads — create spot ───────────────────────────── */
router.post("/admin/ads", async (req, res) => {
  try {
    const body = req.body;
    const [row] = await db.insert(adSpotsTable).values({
      name: body.name,
      position: body.position,
      isActive: body.isActive ?? false,
      adType: body.adType ?? "banner",
      title: body.title ?? null,
      subtitle: body.subtitle ?? null,
      imageUrl: body.imageUrl ?? null,
      linkUrl: body.linkUrl ?? null,
      linkTarget: body.linkTarget ?? "_blank",
      bgColor: body.bgColor ?? "#0d9488",
      textColor: body.textColor ?? "#ffffff",
      badgeText: body.badgeText ?? null,
      buttonText: body.buttonText ?? null,
      customHtml: body.customHtml ?? null,
      sortOrder: body.sortOrder ?? 0,
    }).returning();
    res.json({ success: true, data: row });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

/* ── PUT /api/admin/ads/:id — update spot ────────────────────────── */
router.put("/admin/ads/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const [row] = await db.update(adSpotsTable).set({
      name: body.name,
      position: body.position,
      isActive: body.isActive,
      adType: body.adType,
      title: body.title,
      subtitle: body.subtitle,
      imageUrl: body.imageUrl,
      linkUrl: body.linkUrl,
      linkTarget: body.linkTarget,
      bgColor: body.bgColor,
      textColor: body.textColor,
      badgeText: body.badgeText,
      buttonText: body.buttonText,
      customHtml: body.customHtml,
      sortOrder: body.sortOrder,
      updatedAt: new Date(),
    }).where(eq(adSpotsTable.id, id)).returning();
    res.json({ success: true, data: row });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

/* ── PATCH /api/admin/ads/:id/toggle — quick toggle ─────────────── */
router.patch("/admin/ads/:id/toggle", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [current] = await db.select({ isActive: adSpotsTable.isActive }).from(adSpotsTable).where(eq(adSpotsTable.id, id));
    const [row] = await db.update(adSpotsTable)
      .set({ isActive: !current?.isActive, updatedAt: new Date() })
      .where(eq(adSpotsTable.id, id))
      .returning();
    res.json({ success: true, data: row });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

/* ── DELETE /api/admin/ads/:id ────────────────────────────────────── */
router.delete("/admin/ads/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(adSpotsTable).where(eq(adSpotsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

/* ── POST /api/admin/ads/seed — seed default positions ──────────── */
router.post("/admin/ads/seed", async (req, res) => {
  try {
    const existing = await db.select({ position: adSpotsTable.position }).from(adSpotsTable);
    const existingPos = new Set(existing.map(r => r.position));

    const toInsert = AD_POSITIONS
      .filter(p => !existingPos.has(p.position))
      .map((p, i) => ({
        name: p.name,
        position: p.position,
        adType: p.adType,
        isActive: false,
        sortOrder: i,
        title: `عنوان الإعلان — ${p.name}`,
        subtitle: "نص تعريفي للإعلان — يمكن تعديله من لوحة التحكم",
        bgColor: ["#0d9488","#6366f1","#f59e0b","#ef4444","#3b82f6","#8b5cf6","#ec4899","#14b8a6"][i % 8],
        textColor: "#ffffff",
        buttonText: "اعرف أكثر",
        linkUrl: "#",
      }));

    if (toInsert.length) {
      await db.insert(adSpotsTable).values(toInsert);
    }
    res.json({ success: true, inserted: toInsert.length });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

export default router;
