import { Router } from "express";
import { db, popupsTable } from "@workspace/db";
import { eq, and, lte, gte, or, isNull } from "drizzle-orm";

const router = Router();

// ── GET /api/popups — public, returns active & scheduled popups ─────────────
router.get("/popups", async (_req, res) => {
  try {
    const now = new Date();
    const rows = await db
      .select()
      .from(popupsTable)
      .where(
        and(
          eq(popupsTable.isActive, true),
          or(isNull(popupsTable.startDate), lte(popupsTable.startDate, now)),
          or(isNull(popupsTable.endDate), gte(popupsTable.endDate, now))
        )
      )
      .orderBy(popupsTable.sortOrder);
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ── GET /api/admin/popups — admin, all popups ───────────────────────────────
router.get("/admin/popups", async (_req, res) => {
  try {
    const rows = await db.select().from(popupsTable).orderBy(popupsTable.sortOrder);
    res.json({ success: true, data: rows });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ── POST /api/admin/popups ──────────────────────────────────────────────────
router.post("/admin/popups", async (req, res) => {
  try {
    const body = req.body;
    const [row] = await db.insert(popupsTable).values({
      name: body.name ?? "Popup",
      title: body.title ?? null,
      description: body.description ?? null,
      imageUrl: body.imageUrl ?? null,
      ctaText: body.ctaText ?? null,
      ctaLink: body.ctaLink ?? null,
      bgColor: body.bgColor ?? "#ffffff",
      overlayOpacity: body.overlayOpacity ?? 50,
      textColor: body.textColor ?? "#111827",
      btnColor: body.btnColor ?? "#0d9488",
      btnTextColor: body.btnTextColor ?? "#ffffff",
      borderRadius: body.borderRadius ?? 12,
      size: body.size ?? "md",
      position: body.position ?? "center",
      triggerType: body.triggerType ?? "immediate",
      triggerDelay: body.triggerDelay ?? 3,
      triggerScrollPct: body.triggerScrollPct ?? 50,
      pages: JSON.stringify(body.pages ?? ["all"]),
      showCloseBtn: body.showCloseBtn ?? true,
      cookieDuration: body.cookieDuration ?? 1,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      isActive: body.isActive ?? false,
      sortOrder: body.sortOrder ?? 0,
    }).returning();
    res.json({ success: true, data: row });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ── PUT /api/admin/popups/:id ───────────────────────────────────────────────
router.put("/admin/popups/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const body = req.body;
    const update: any = {};
    const fields = [
      "name","title","description","imageUrl","ctaText","ctaLink","bgColor",
      "overlayOpacity","textColor","btnColor","btnTextColor","borderRadius",
      "size","position","triggerType","triggerDelay","triggerScrollPct",
      "showCloseBtn","cookieDuration","isActive","sortOrder"
    ];
    for (const f of fields) {
      if (body[f] !== undefined) update[f] = body[f];
    }
    if (body.pages !== undefined) update.pages = JSON.stringify(body.pages);
    if (body.startDate !== undefined) update.startDate = body.startDate ? new Date(body.startDate) : null;
    if (body.endDate !== undefined) update.endDate = body.endDate ? new Date(body.endDate) : null;
    const [row] = await db.update(popupsTable).set(update).where(eq(popupsTable.id, id)).returning();
    res.json({ success: true, data: row });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ── PATCH /api/admin/popups/:id/toggle ─────────────────────────────────────
router.patch("/admin/popups/:id/toggle", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [cur] = await db.select().from(popupsTable).where(eq(popupsTable.id, id));
    if (!cur) return res.status(404).json({ success: false, error: "Not found" });
    const [row] = await db.update(popupsTable).set({ isActive: !cur.isActive }).where(eq(popupsTable.id, id)).returning();
    res.json({ success: true, data: row });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ── DELETE /api/admin/popups/:id ────────────────────────────────────────────
router.delete("/admin/popups/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(popupsTable).where(eq(popupsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

export default router;
