import { Router } from "express";
import { db } from "@workspace/db";
import { featuredAreasTable, propertiesTable } from "@workspace/db";
import { eq, ilike, or, sql } from "drizzle-orm";

const router = Router();

// ── Public: get enabled featured areas with property count ──────────────────
router.get("/featured-areas", async (_req, res) => {
  try {
    const areas = await db
      .select()
      .from(featuredAreasTable)
      .where(eq(featuredAreasTable.enabled, true))
      .orderBy(featuredAreasTable.displayOrder);

    // Count properties per area (match district or address)
    const withCount = await Promise.all(
      areas.map(async (area) => {
        const pattern = `%${area.nameAr}%`;
        const result = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(propertiesTable)
          .where(
            or(
              ilike(propertiesTable.district, pattern),
              ilike(propertiesTable.address, pattern),
            ),
          );
        return { ...area, propertyCount: result[0]?.count ?? 0 };
      }),
    );

    res.json(withCount);
  } catch (err) {
    console.error("[featured-areas]", err);
    res.status(500).json({ error: "failed" });
  }
});

// ── Admin: list all ─────────────────────────────────────────────────────────
router.get("/admin/featured-areas", async (_req, res) => {
  try {
    const areas = await db
      .select()
      .from(featuredAreasTable)
      .orderBy(featuredAreasTable.displayOrder);

    const withCount = await Promise.all(
      areas.map(async (area) => {
        const pattern = `%${area.nameAr}%`;
        const result = await db
          .select({ count: sql<number>`count(*)::int` })
          .from(propertiesTable)
          .where(
            or(
              ilike(propertiesTable.district, pattern),
              ilike(propertiesTable.address, pattern),
            ),
          );
        return { ...area, propertyCount: result[0]?.count ?? 0 };
      }),
    );

    res.json(withCount);
  } catch (err) {
    console.error("[admin/featured-areas]", err);
    res.status(500).json({ error: "failed" });
  }
});

// ── Admin: create ───────────────────────────────────────────────────────────
router.post("/admin/featured-areas", async (req, res) => {
  try {
    const { nameAr, image, cityName, displayOrder, enabled } = req.body;
    if (!nameAr) return res.status(400).json({ error: "nameAr required" });

    const [created] = await db
      .insert(featuredAreasTable)
      .values({ nameAr, image: image || null, cityName: cityName || null, displayOrder: displayOrder ?? 0, enabled: enabled ?? true })
      .returning();

    res.json(created);
  } catch (err) {
    console.error("[admin/featured-areas POST]", err);
    res.status(500).json({ error: "failed" });
  }
});

// ── Admin: update ───────────────────────────────────────────────────────────
router.put("/admin/featured-areas/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { nameAr, image, cityName, displayOrder, enabled } = req.body;

    const [updated] = await db
      .update(featuredAreasTable)
      .set({ nameAr, image: image || null, cityName: cityName || null, displayOrder: displayOrder ?? 0, enabled: enabled ?? true })
      .where(eq(featuredAreasTable.id, id))
      .returning();

    if (!updated) return res.status(404).json({ error: "not found" });
    res.json(updated);
  } catch (err) {
    console.error("[admin/featured-areas PUT]", err);
    res.status(500).json({ error: "failed" });
  }
});

// ── Admin: toggle enabled ───────────────────────────────────────────────────
router.patch("/admin/featured-areas/:id/toggle", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const existing = await db
      .select()
      .from(featuredAreasTable)
      .where(eq(featuredAreasTable.id, id))
      .then(r => r[0]);

    if (!existing) return res.status(404).json({ error: "not found" });

    const [updated] = await db
      .update(featuredAreasTable)
      .set({ enabled: !existing.enabled })
      .where(eq(featuredAreasTable.id, id))
      .returning();

    res.json(updated);
  } catch (err) {
    console.error("[admin/featured-areas PATCH toggle]", err);
    res.status(500).json({ error: "failed" });
  }
});

// ── Admin: delete ───────────────────────────────────────────────────────────
router.delete("/admin/featured-areas/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(featuredAreasTable).where(eq(featuredAreasTable.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error("[admin/featured-areas DELETE]", err);
    res.status(500).json({ error: "failed" });
  }
});

export default router;
