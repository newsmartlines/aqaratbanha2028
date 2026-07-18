import { Router } from "express";
import { db } from "@workspace/db";
import { menuItemsTable } from "@workspace/db/schema";
import { eq, asc } from "drizzle-orm";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();

// Default menu items seeded on first request
const DEFAULT_MENU: Array<typeof menuItemsTable.$inferInsert> = [
  { label: "الرئيسية",        href: "/",                             sortOrder: 0, visible: true },
  { label: "للبيع",           href: "/properties?listingType=sale",  sortOrder: 1, visible: true },
  { label: "للإيجار",         href: "/properties?listingType=rent",  sortOrder: 2, visible: true },
  { label: "الباقات",         href: "/pricing",                      sortOrder: 3, visible: true },
  { label: "🗺 بحث بالخريطة", href: "/map-search",                   sortOrder: 4, visible: true },
  { label: "📊 مؤشرات السوق", href: "/market",                       sortOrder: 5, visible: true },
];

async function ensureDefaults() {
  const existing = await db
    .select({ id: menuItemsTable.id })
    .from(menuItemsTable)
    .limit(1);
  if (existing.length === 0) {
    await db.insert(menuItemsTable).values(DEFAULT_MENU);
  }
}

// ── GET /api/menu-items — public, only visible items ────────────────────────
router.get("/menu-items", async (_req, res) => {
  try {
    await ensureDefaults();
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

// ── Admin routes (all protected by adminOnly middleware) ─────────────────────
router.use("/admin/menu-items", adminOnly);

// GET /api/admin/menu-items — all items
router.get("/admin/menu-items", async (_req, res) => {
  try {
    await ensureDefaults();
    const items = await db
      .select()
      .from(menuItemsTable)
      .orderBy(asc(menuItemsTable.sortOrder));
    res.json({ success: true, data: items });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// POST /api/admin/menu-items — create
router.post("/admin/menu-items", async (req, res) => {
  try {
    const { label, href, icon, openInNewTab } = req.body;
    if (!label?.trim() || !href?.trim()) {
      return res.status(400).json({ success: false, error: "label and href are required" });
    }
    const all = await db
      .select({ sortOrder: menuItemsTable.sortOrder })
      .from(menuItemsTable)
      .orderBy(asc(menuItemsTable.sortOrder));
    const maxOrder = all.length > 0 ? Math.max(...all.map(r => r.sortOrder)) + 1 : 0;
    const [item] = await db.insert(menuItemsTable).values({
      label: label.trim(),
      href:  href.trim(),
      icon:  icon?.trim() || null,
      openInNewTab: !!openInNewTab,
      sortOrder: maxOrder,
      visible: true,
    }).returning();
    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// PUT /api/admin/menu-items/reorder — batch reorder (must be before /:id)
router.put("/admin/menu-items/reorder", async (req, res) => {
  try {
    const { order } = req.body as { order: number[] };
    if (!Array.isArray(order)) {
      return res.status(400).json({ success: false, error: "order must be an array of ids" });
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

// PUT /api/admin/menu-items/:id — update
router.put("/admin/menu-items/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const { label, href, icon, openInNewTab, visible } = req.body;
    const [item] = await db.update(menuItemsTable).set({
      ...(label       !== undefined && { label:       label.trim() }),
      ...(href        !== undefined && { href:        href.trim() }),
      ...(icon        !== undefined && { icon:        icon?.trim() || null }),
      ...(openInNewTab !== undefined && { openInNewTab: !!openInNewTab }),
      ...(visible     !== undefined && { visible:     !!visible }),
      updatedAt: new Date(),
    }).where(eq(menuItemsTable.id, id)).returning();
    if (!item) return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, data: item });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

// DELETE /api/admin/menu-items/:id
router.delete("/admin/menu-items/:id", async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    await db.delete(menuItemsTable).where(eq(menuItemsTable.id, id));
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err?.message });
  }
});

export default router;
