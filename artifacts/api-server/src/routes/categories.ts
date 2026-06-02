import { Router } from "express";
import { db } from "@workspace/db";
import { categoriesTable, subcategoriesTable, propertiesTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { autoExportGroup } from "../lib/auto-export";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();

// ── Write-through: auto-export seed files after any successful category mutation
router.use((req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    res.on("finish", () => {
      if (res.statusCode < 400) autoExportGroup("categories");
    });
  }
  next();
});

router.get("/categories", async (req, res) => {
  try {
    const { type } = req.query as { type?: string };
    const query = db.select().from(categoriesTable);
    const categories = type
      ? await query.where(eq(categoriesTable.type, type)).orderBy(categoriesTable.id)
      : await query.orderBy(categoriesTable.id);

    // Embed subcategories into each category
    const allSubs = await db.select().from(subcategoriesTable).orderBy(subcategoriesTable.categoryId, subcategoriesTable.id);

    // Property count per category (match by slug)
    const countRows = await db
      .select({
        slug: propertiesTable.mainCategory,
        count: sql<number>`count(*)::int`,
      })
      .from(propertiesTable)
      .groupBy(propertiesTable.mainCategory);
    const countMap: Record<string, number> = {};
    for (const r of countRows) {
      if (r.slug) countMap[r.slug] = r.count;
    }

    const data = categories.map(cat => ({
      ...cat,
      propertyCount: countMap[cat.slug ?? ""] ?? 0,
      subcategories: allSubs.filter(s => s.categoryId === cat.id),
    }));

    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch categories" });
  }
});

router.get("/categories/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [category] = await db.select().from(categoriesTable).where(eq(categoriesTable.id, id));
    if (!category) return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, data: category });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch category" });
  }
});

router.post("/categories", adminOnly, async (req, res) => {
  try {
    const { nameAr, nameEn, icon, slug, description, image, type } = req.body;
    if (!nameAr || !nameEn || !slug) return res.status(400).json({ success: false, error: "nameAr, nameEn, slug required" });
    const [cat] = await db.insert(categoriesTable).values({ nameAr, nameEn, icon: icon ?? "Grid", slug, description, image, type: type ?? "service" }).returning();
    res.json({ success: true, data: cat });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create category";
    res.status(500).json({ success: false, error: msg });
  }
});

router.put("/categories/:id", adminOnly, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const { nameAr, nameEn, icon, slug, description, image, type } = req.body;
    const updateData: Record<string, unknown> = { nameAr, nameEn, icon, slug, description, image };
    if (type !== undefined) updateData.type = type;
    const [updated] = await db.update(categoriesTable).set(updateData).where(eq(categoriesTable.id, id)).returning();
    if (!updated) return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, data: updated });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to update category";
    res.status(500).json({ success: false, error: msg });
  }
});

router.delete("/categories/:id", adminOnly, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    await db.delete(categoriesTable).where(eq(categoriesTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete category" });
  }
});

// --- Subcategories ---

router.get("/categories/:id/subcategories", async (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    const subs = await db.select().from(subcategoriesTable).where(eq(subcategoriesTable.categoryId, categoryId)).orderBy(subcategoriesTable.id);
    res.json({ success: true, data: subs });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch subcategories" });
  }
});

router.get("/subcategories", async (_req, res) => {
  try {
    const subs = await db.select().from(subcategoriesTable).orderBy(subcategoriesTable.categoryId, subcategoriesTable.id);
    res.json({ success: true, data: subs });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch subcategories" });
  }
});

router.post("/categories/:id/subcategories", adminOnly, async (req, res) => {
  try {
    const categoryId = parseInt(String(req.params.id));
    const { nameAr, nameEn, icon, slug } = req.body;
    if (!nameAr || !nameEn || !slug) return res.status(400).json({ success: false, error: "nameAr, nameEn, slug required" });
    const [sub] = await db.insert(subcategoriesTable).values({ categoryId, nameAr, nameEn, icon: icon ?? "Tag", slug }).returning();
    res.json({ success: true, data: sub });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Failed to create subcategory";
    res.status(500).json({ success: false, error: msg });
  }
});

router.put("/subcategories/:id", adminOnly, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const { nameAr, nameEn, icon, slug } = req.body;
    const [updated] = await db.update(subcategoriesTable).set({ nameAr, nameEn, icon, slug }).where(eq(subcategoriesTable.id, id)).returning();
    if (!updated) return res.status(404).json({ success: false, error: "Not found" });
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update subcategory" });
  }
});

router.delete("/subcategories/:id", adminOnly, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    await db.delete(subcategoriesTable).where(eq(subcategoriesTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete subcategory" });
  }
});

export default router;
