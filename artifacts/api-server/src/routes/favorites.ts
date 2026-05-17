import { Router } from "express";
import { db } from "@workspace/db";
import { favoritesTable, providersTable, usersTable, categoriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";

const router = Router();

router.get("/users/:userId/favorites", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const rows = await db
      .select({
        id: favoritesTable.id,
        providerId: favoritesTable.providerId,
        providerName: usersTable.name,
        providerAvatar: providersTable.avatar,
        providerCity: providersTable.city,
        providerRating: providersTable.rating,
        providerReviewsCount: providersTable.reviewsCount,
        categoryNameAr: categoriesTable.nameAr,
      })
      .from(favoritesTable)
      .innerJoin(providersTable, eq(favoritesTable.providerId, providersTable.id))
      .innerJoin(usersTable, eq(providersTable.userId, usersTable.id))
      .leftJoin(categoriesTable, eq(providersTable.categoryId, categoriesTable.id))
      .where(eq(favoritesTable.userId, userId));
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch favorites" });
  }
});

router.post("/users/:userId/favorites", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const { providerId } = req.body;
    const existing = await db.select().from(favoritesTable).where(and(eq(favoritesTable.userId, userId), eq(favoritesTable.providerId, providerId)));
    if (existing.length > 0) return res.json({ success: true, data: existing[0] });
    const [fav] = await db.insert(favoritesTable).values({ userId, providerId }).returning();
    res.json({ success: true, data: fav });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to add favorite" });
  }
});

router.delete("/users/:userId/favorites/:providerId", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const providerId = parseInt(req.params.providerId);
    await db.delete(favoritesTable).where(and(eq(favoritesTable.userId, userId), eq(favoritesTable.providerId, providerId)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to remove favorite" });
  }
});

export default router;
