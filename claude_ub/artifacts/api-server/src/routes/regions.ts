import { Router } from "express";
import { db } from "@workspace/db";
import { regionsTable, citiesTable, areasTable, providerServiceAreasTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();

router.use("/admin", adminOnly);

// ── Public: full hierarchy (enabled only) ──────────────────────────────────
router.get("/regions", async (_req, res) => {
  try {
    const regions = await db.select().from(regionsTable).orderBy(regionsTable.order, regionsTable.id);
    const cities = await db.select().from(citiesTable).orderBy(citiesTable.nameAr);
    const areas = await db.select().from(areasTable).orderBy(areasTable.nameAr);
    const data = regions
      .filter(r => r.enabled)
      .map(r => ({
        ...r,
        cities: cities
          .filter(c => c.regionId === r.id && c.enabled)
          .map(c => ({
            ...c,
            areas: areas.filter(a => a.cityId === c.id && a.enabled),
          })),
      }));
    res.json({ success: true, data });
  } catch (e: any) {
    console.error("Regions fetch error:", e?.message);
    res.status(500).json({ success: false, error: "Failed to load regions" });
  }
});

// ── Public: areas for a specific city ─────────────────────────────────────
router.get("/cities/:cityId/areas", async (req, res) => {
  try {
    const cityId = parseInt(req.params.cityId);
    const data = await db
      .select()
      .from(areasTable)
      .where(and(eq(areasTable.cityId, cityId), eq(areasTable.enabled, true)))
      .orderBy(areasTable.nameAr);
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: "Failed to load areas" });
  }
});

// ── Admin: all regions (including disabled) ────────────────────────────────
router.get("/admin/regions", async (_req, res) => {
  try {
    const regions = await db.select().from(regionsTable).orderBy(regionsTable.order, regionsTable.id);
    const cities = await db.select().from(citiesTable).orderBy(citiesTable.nameAr);
    const areas = await db.select().from(areasTable).orderBy(areasTable.nameAr);
    const data = regions.map(r => ({
      ...r,
      cities: cities
        .filter(c => c.regionId === r.id)
        .map(c => ({
          ...c,
          areas: areas.filter(a => a.cityId === c.id),
        })),
    }));
    res.json({ success: true, data });
  } catch (e: any) {
    res.status(500).json({ success: false, error: "Failed to load regions" });
  }
});

// ── Admin: all cities (including disabled) ─────────────────────────────────
router.get("/admin/cities", async (_req, res) => {
  try {
    const cities = await db.select().from(citiesTable).orderBy(citiesTable.nameAr);
    res.json({ success: true, data: cities });
  } catch {
    res.status(500).json({ success: false, error: "Failed to load cities" });
  }
});

router.post("/admin/cities", async (req, res) => {
  try {
    const { regionId, nameAr, nameEn } = req.body;
    if (!regionId || !nameAr) return res.status(400).json({ success: false, error: "regionId and nameAr required" });
    const [city] = await db.insert(citiesTable).values({ regionId, nameAr, nameEn: nameEn || nameAr, enabled: true }).returning();
    res.json({ success: true, data: city });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create city" });
  }
});

router.put("/admin/cities/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { regionId, nameAr, nameEn } = req.body;
    const [city] = await db.update(citiesTable).set({ regionId, nameAr, nameEn: nameEn || nameAr }).where(eq(citiesTable.id, id)).returning();
    res.json({ success: true, data: city });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update city" });
  }
});

router.patch("/admin/cities/:id/toggle", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [current] = await db.select().from(citiesTable).where(eq(citiesTable.id, id));
    if (!current) return res.status(404).json({ success: false, error: "City not found" });
    const [city] = await db.update(citiesTable).set({ enabled: !current.enabled }).where(eq(citiesTable.id, id)).returning();
    res.json({ success: true, data: city });
  } catch {
    res.status(500).json({ success: false, error: "Failed to toggle city" });
  }
});

router.delete("/admin/cities/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(citiesTable).where(eq(citiesTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete city" });
  }
});

// ── Admin: areas ────────────────────────────────────────────────────────────
router.get("/admin/areas", async (req, res) => {
  try {
    const cityId = req.query.cityId ? parseInt(req.query.cityId as string) : null;
    const query = db.select().from(areasTable).orderBy(areasTable.nameAr);
    const data = cityId
      ? await db.select().from(areasTable).where(eq(areasTable.cityId, cityId)).orderBy(areasTable.nameAr)
      : await query;
    res.json({ success: true, data });
  } catch {
    res.status(500).json({ success: false, error: "Failed to load areas" });
  }
});

router.post("/admin/areas", async (req, res) => {
  try {
    const { cityId, nameAr, nameEn } = req.body;
    if (!cityId || !nameAr) return res.status(400).json({ success: false, error: "cityId and nameAr required" });
    const [area] = await db.insert(areasTable).values({ cityId, nameAr, nameEn: nameEn || nameAr, enabled: true }).returning();
    res.json({ success: true, data: area });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create area" });
  }
});

router.put("/admin/areas/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { cityId, nameAr, nameEn } = req.body;
    const [area] = await db.update(areasTable).set({ cityId, nameAr, nameEn: nameEn || nameAr }).where(eq(areasTable.id, id)).returning();
    res.json({ success: true, data: area });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update area" });
  }
});

router.patch("/admin/areas/:id/toggle", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [current] = await db.select().from(areasTable).where(eq(areasTable.id, id));
    if (!current) return res.status(404).json({ success: false, error: "Area not found" });
    const [area] = await db.update(areasTable).set({ enabled: !current.enabled }).where(eq(areasTable.id, id)).returning();
    res.json({ success: true, data: area });
  } catch {
    res.status(500).json({ success: false, error: "Failed to toggle area" });
  }
});

router.delete("/admin/areas/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(areasTable).where(eq(areasTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete area" });
  }
});

// ── Provider service areas ─────────────────────────────────────────────────
router.get("/providers/:id/service-areas", async (req, res) => {
  try {
    const providerId = parseInt(req.params.id);
    const areas = await db.select().from(providerServiceAreasTable)
      .where(eq(providerServiceAreasTable.providerId, providerId));
    res.json({ success: true, data: areas });
  } catch (e: any) {
    res.status(500).json({ success: false, error: "Failed to load service areas" });
  }
});

router.put("/providers/:id/service-areas", async (req, res) => {
  try {
    const providerId = parseInt(req.params.id);
    const { areas } = req.body as { areas: { regionId: number; cityId?: number | null; areaId?: number | null }[] };
    await db.delete(providerServiceAreasTable)
      .where(eq(providerServiceAreasTable.providerId, providerId));
    if (areas && areas.length > 0) {
      await db.insert(providerServiceAreasTable).values(
        areas.map(a => ({
          providerId,
          regionId: a.regionId,
          cityId: a.cityId ?? null,
          areaId: a.areaId ?? null,
        }))
      );
    }
    const saved = await db.select().from(providerServiceAreasTable)
      .where(eq(providerServiceAreasTable.providerId, providerId));
    res.json({ success: true, data: saved });
  } catch (e: any) {
    res.status(500).json({ success: false, error: "Failed to save service areas", detail: e?.message });
  }
});

export default router;
