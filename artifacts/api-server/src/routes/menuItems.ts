import { Router } from "express";
import { db } from "@workspace/db";
import { menuItemsTable } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();

// ── GET /api/menu-items — public, only visible items sorted by sortOrder ────
router.get("/menu-items", async (_req, res) => {
  try {
    const items = await db
      .select()
      .from(menuItemsTable)
      .where(eq(menuItemsTable.visible, true))
      .orderBy(asc(menuItemsTable.sortOrder));
    res.json({ success: true, data: items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ── GET /api/admin/menu-items — all items (admin) ───────────────────────────
router.get("/admin/menu-items", adminOnly, async (_req, res) => {
  try {
    const items = await db
      .select()
      .from(menuItemsTable)
      .orderBy(asc(menuItemsTable.sortOrder));
    res.json({ success: true, data: items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ── POST /api/admin/menu-items — create ─────────────────────────────────────
router.post("/admin/menu-items", adminOnly, async (req, res) => {
  try {
    const { label, href, icon, openInNewTab } = req.body;
    if (!label?.trim() || !href?.trim()) {
      return res.status(400).json({ success: false, error: "label و href مطلوبان" });
    }
    const all = await db
      .select({ sortOrder: menuItemsTable.sortOrder })
      .from(menuItemsTable)
      .orderBy(asc(menuItemsTable.sortOrder));
    const maxOrder = all.length > 0 ? Math.max(...all.map(r => r.sortOrder)) + 1 : 0;
    const [item] = await db.insert(menuItemsTable).values({
      label: label.trim(),
      href: href.trim(),
      icon: icon?.trim() || null,
      openInNewTab: !!openInNewTab,
      sortOrder: maxOrder,
      visible: true,
    }).returning();
    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ── PUT /api/admin/menu-items/reorder — batch reorder (before /:id) ─────────
router.put("/admin/menu-items/reorder", adminOnly, async (req, res) => {
  try {
    const { order } = req.body as { order: number[] };
    if (!Array.isArray(order)) {
      return res.status(400).json({ success: false, error: "order يجب أن يكون مصفوفة" });
    }
    await Promise.all(
      order.map((id, index) =>
        db.update(menuItemsTable)
          .set({ sortOrder: index, updatedAt: new Date() })
          .where(eq(menuItemsTable.id, id))
      )
    );
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ── PUT /api/admin/menu-items/:id — update ───────────────────────────────────
router.put("/admin/menu-items/:id", adminOnly, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) return res.status(400).json({ success: false, error: "id غير صالح" });
    const { label, href, icon, openInNewTab, visible } = req.body;
    const [item] = await db.update(menuItemsTable).set({
      ...(label !== undefined && { label: label.trim() }),
      ...(href  !== undefined && { href:  href.trim()  }),
      ...(icon  !== undefined && { icon:  icon?.trim() || null }),
      ...(openInNewTab !== undefined && { openInNewTab: !!openInNewTab }),
      ...(visible      !== undefined && { visible:      !!visible }),
      updatedAt: new Date(),
    }).where(eq(menuItemsTable.id, id)).returning();
    if (!item) return res.status(404).json({ success: false, error: "العنصر غير موجود" });
    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// ── DELETE /api/admin/menu-items/:id ─────────────────────────────────────────
router.delete("/admin/menu-items/:id", adminOnly, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    if (isNaN(id)) return res.status(400).json({ success: false, error: "id غير صالح" });
    await db.delete(menuItemsTable).where(eq(menuItemsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

export default router;
