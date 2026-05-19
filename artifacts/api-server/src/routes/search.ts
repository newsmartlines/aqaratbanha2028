import { Router } from "express";
import { db } from "@workspace/db";
import { propertiesTable, categoriesTable, citiesTable, areasTable } from "@workspace/db";
import { ilike, or, eq, and } from "drizzle-orm";

const router = Router();

const TRENDING_KEYWORDS = [
  { text: "شقة للبيع" },
  { text: "شقة للإيجار" },
  { text: "فيلا للبيع" },
  { text: "أرض للبيع" },
  { text: "مكتب للإيجار" },
  { text: "شاليه" },
  { text: "مفروش بالكامل" },
  { text: "سوبر لوكس" },
  { text: "تقسيط" },
  { text: "شقة مفروشة" },
];

router.get("/search/suggestions", async (req, res) => {
  try {
    const q = ((req.query.q as string) ?? "").trim();

    if (!q) {
      const [popularCities, popularAreas] = await Promise.all([
        db
          .select({ id: citiesTable.id, nameAr: citiesTable.nameAr })
          .from(citiesTable)
          .where(eq(citiesTable.enabled, true))
          .limit(8),
        db
          .select({ id: areasTable.id, nameAr: areasTable.nameAr })
          .from(areasTable)
          .limit(8),
      ]);

      return res.json({
        trending: TRENDING_KEYWORDS,
        cities: popularCities.map(c => ({ ...c, type: "city" })),
        areas: popularAreas.map(a => ({ ...a, type: "area" })),
        categories: [],
        properties: [],
      });
    }

    const pattern = `%${q}%`;

    const [properties, categories, cities, areas] = await Promise.all([
      db
        .select({
          id: propertiesTable.id,
          title: propertiesTable.title,
          listingType: propertiesTable.listingType,
          mainCategory: propertiesTable.mainCategory,
          district: propertiesTable.district,
        })
        .from(propertiesTable)
        .where(
          and(
            eq(propertiesTable.status, "active"),
            or(
              ilike(propertiesTable.title, pattern),
              ilike(propertiesTable.district, pattern),
              ilike(propertiesTable.address, pattern),
            ),
          ),
        )
        .limit(5),

      db
        .select({
          id: categoriesTable.id,
          nameAr: categoriesTable.nameAr,
          slug: categoriesTable.slug,
          categoryType: categoriesTable.type,
        })
        .from(categoriesTable)
        .where(
          or(
            ilike(categoriesTable.nameAr, pattern),
            ilike(categoriesTable.nameEn, pattern),
          ),
        )
        .limit(4),

      db
        .select({ id: citiesTable.id, nameAr: citiesTable.nameAr })
        .from(citiesTable)
        .where(
          and(
            eq(citiesTable.enabled, true),
            or(
              ilike(citiesTable.nameAr, pattern),
              ilike(citiesTable.nameEn, pattern),
            ),
          ),
        )
        .limit(4),

      db
        .select({ id: areasTable.id, nameAr: areasTable.nameAr })
        .from(areasTable)
        .where(
          or(
            ilike(areasTable.nameAr, pattern),
            ilike(areasTable.nameEn, pattern),
          ),
        )
        .limit(4),
    ]);

    const matchingTrending = TRENDING_KEYWORDS.filter(t =>
      t.text.includes(q) || q.split("").some(c => t.text.includes(c))
    ).slice(0, 4);

    res.json({
      trending: matchingTrending,
      properties: properties.map(p => ({ ...p, type: "property" })),
      categories: categories.map(c => ({ ...c, type: "category" })),
      cities: cities.map(c => ({ ...c, type: "city" })),
      areas: areas.map(a => ({ ...a, type: "area" })),
    });
  } catch (err) {
    console.error("[search/suggestions]", err);
    res.status(500).json({ error: "search failed" });
  }
});

export default router;
