import { Router } from "express";
import { db } from "@workspace/db";
import { regionsTable, citiesTable, areasTable, providerServiceAreasTable } from "@workspace/db/schema";
import { eq, and } from "drizzle-orm";
import { adminOnly } from "../middleware/adminOnly";
import { autoExportGroup } from "../lib/auto-export";

const router = Router();

router.use("/admin", adminOnly);

// ── Write-through: auto-export seed files after any successful location mutation
router.use((req, res, next) => {
  if (["POST", "PUT", "PATCH", "DELETE"].includes(req.method)) {
    res.on("finish", () => {
      if (res.statusCode < 400) autoExportGroup("locations");
    });
  }
  next();
});

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

router.post("/admin/regions", async (req, res) => {
  try {
    const { nameAr, nameEn, order } = req.body ?? {};
    if (!nameAr || typeof nameAr !== "string")
      return res.status(400).json({ success: false, error: "nameAr is required" });
    const [row] = await db
      .insert(regionsTable)
      .values({
        nameAr: String(nameAr).trim(),
        nameEn: String(nameEn ?? nameAr).trim(),
        order: order != null ? Number(order) : 0,
        enabled: true,
      })
      .returning();
    res.status(201).json({ success: true, data: row });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create region" });
  }
});

router.patch("/admin/regions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, error: "Invalid id" });
    const { nameAr, nameEn, order, enabled } = req.body ?? {};
    const patch: Record<string, unknown> = {};
    if (nameAr !== undefined) patch.nameAr = String(nameAr).trim();
    if (nameEn !== undefined) patch.nameEn = String(nameEn).trim();
    if (order !== undefined) patch.order = Number(order);
    if (enabled !== undefined) patch.enabled = Boolean(enabled);
    if (Object.keys(patch).length === 0)
      return res.status(400).json({ success: false, error: "No fields to update" });
    const [row] = await db.update(regionsTable).set(patch as any).where(eq(regionsTable.id, id)).returning();
    if (!row) return res.status(404).json({ success: false, error: "Region not found" });
    res.json({ success: true, data: row });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update region" });
  }
});

router.delete("/admin/regions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, error: "Invalid id" });
    // cascade: delete areas → cities → region
    const regionCities = await db.select().from(citiesTable).where(eq(citiesTable.regionId, id));
    for (const city of regionCities) {
      await db.delete(areasTable).where(eq(areasTable.cityId, city.id));
    }
    await db.delete(citiesTable).where(eq(citiesTable.regionId, id));
    await db.delete(regionsTable).where(eq(regionsTable.id, id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: "Failed to delete region" });
  }
});

router.patch("/admin/regions/:id/toggle", async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!Number.isFinite(id)) return res.status(400).json({ success: false, error: "Invalid id" });
    const [current] = await db.select().from(regionsTable).where(eq(regionsTable.id, id));
    if (!current) return res.status(404).json({ success: false, error: "Region not found" });
    const [row] = await db
      .update(regionsTable)
      .set({ enabled: !current.enabled })
      .where(eq(regionsTable.id, id))
      .returning();
    res.json({ success: true, data: row });
  } catch {
    res.status(500).json({ success: false, error: "Failed to toggle region" });
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

// ── Admin: reset all areas for Banha city with the official list ─────────────
router.post("/admin/reset-banha-areas", async (_req, res) => {
  try {
    const BANHA_NEW_AREAS = [
      "أتريب", "الأهرام", "محيط كلية الحقوق", "كفر الجزار", "الآثار", "العلوم",
      "بطا", "شارع أبو حشيش", "وسط البلد", "الحرس الوطني", "المنشية", "النجدة",
      "الرملة", "عزبة المربع", "محيط النادي الرياضي", "مناطق أخرى", "التمثال",
      "بنها القديمة", "سندنهور", "شرق الاستاد", "طوخ", "عزبة الزراعة", "عزبة البرنس",
      "عزبة السوق", "كفر بطا", "كفر شكر", "محيط كلية التربية", "مدخل بنها", "مرصفا",
      "منشأة بنها", "منشية النور", "ميت عاصم", "الشدية", "الشموت", "الفيومي",
      "الكوبري", "الموالح", "بتمدة", "جزيرة بلى", "جمجرة", "دملو", "شبلنجة",
      "عزبة ذكي", "فرسيس", "كفر أبو زهرة", "كفر الأربعين", "كفر الحصة",
      "كفر الحمام", "كفر السرايا", "كفر الشموت", "كفر الشيخ إبراهيم", "كفر سعد",
      "كفر طحلة", "كفر عطا الله", "كفر مناقر", "كفر مويس", "مجول",
      "محيط كلية التربية الرياضية", "محيط مستشفى الأميري", "محيط نادي المعلمين",
      "منشأة أبو دياب", "منية السباع", "ميت العطار", "ميت راضي", "نقباس", "ورورة",
    ];

    // Find Banha city
    const cities = await db.select().from(citiesTable).orderBy(citiesTable.nameAr);
    const banha = cities.find(c => c.nameAr === "بنها" || c.nameEn === "Banha");
    if (!banha) return res.status(404).json({ success: false, error: "Banha city not found" });

    // Delete all existing areas for Banha
    await db.delete(areasTable).where(eq(areasTable.cityId, banha.id));

    // Insert new areas
    const inserted = await db.insert(areasTable).values(
      BANHA_NEW_AREAS.map(name => ({ cityId: banha.id, nameAr: name, nameEn: name, enabled: true }))
    ).returning();

    res.json({ success: true, data: { cityId: banha.id, cityName: banha.nameAr, deleted: "all", inserted: inserted.length } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e?.message ?? "Failed to reset areas" });
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
