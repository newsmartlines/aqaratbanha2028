import { Router } from "express";
import { db } from "@workspace/db";
import {
  regionsTable, citiesTable, areasTable, featuredAreasTable,
  emailTemplatesTable, siteSettingsTable, propertiesTable,
  categoriesTable, providersTable, usersTable,
} from "@workspace/db";
import { eq, count } from "drizzle-orm";
import { forceSeedSection } from "../lib/seed";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();

// ── GET /admin/seed-status — counts of all seeded entities (admin only) ───────
router.get("/admin/seed-status", adminOnly, async (_req, res) => {
  try {
    const [regions] = await db.select({ n: count() }).from(regionsTable);
    const [cities] = await db.select({ n: count() }).from(citiesTable);
    const [areas] = await db.select({ n: count() }).from(areasTable);
    const [featuredAreas] = await db.select({ n: count() }).from(featuredAreasTable);
    const [emailTemplates] = await db.select({ n: count() }).from(emailTemplatesTable);
    const [siteSettings] = await db.select({ n: count() }).from(siteSettingsTable);
    const [properties] = await db.select({ n: count() }).from(propertiesTable);
    const [reCategories] = await db.select({ n: count() }).from(categoriesTable)
      .where(eq(categoriesTable.type, "real_estate"));
    const [allCategories] = await db.select({ n: count() }).from(categoriesTable);
    const [providers] = await db.select({ n: count() }).from(providersTable);
    const [users] = await db.select({ n: count() }).from(usersTable);

    // Check Egypt specifically
    const egyptRegion = await db.select({ id: regionsTable.id }).from(regionsTable)
      .where(eq(regionsTable.nameAr, "محافظة القليوبية")).limit(1);

    res.json({
      success: true,
      data: {
        regions: regions.n,
        cities: cities.n,
        areas: areas.n,
        featuredAreas: featuredAreas.n,
        emailTemplates: emailTemplates.n,
        siteSettings: siteSettings.n,
        properties: properties.n,
        realEstateCategories: reCategories.n,
        allCategories: allCategories.n,
        providers: providers.n,
        users: users.n,
        hasEgyptLocations: egyptRegion.length > 0,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "فشل جلب الإحصائيات";
    res.status(500).json({ success: false, error: message });
  }
});

// ── POST /admin/seed-demo — run seed for a specific section (admin only) ──────
router.post("/admin/seed-demo", adminOnly, async (req, res) => {
  try {
    const { section } = req.body as { section: string };
    if (!section) {
      return res.status(400).json({ success: false, error: "section مطلوب" });
    }
    const result = await forceSeedSection(section);
    res.json({ success: result.ok, message: result.message });
  } catch (err) {
    const message = err instanceof Error ? err.message : "حدث خطأ غير متوقع";
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
