import { Router } from "express";
import { db } from "@workspace/db";
import { favoritesTable, providersTable, usersTable, categoriesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { getSession } from "./auth";

const router = Router();

// ── Auth helper (same pattern used across routes) ─────────────────────────
async function requireAuth(req: any): Promise<{ userId: number } | null> {
  const token =
    req.cookies?.session ??
    (req.headers.authorization as string | undefined)?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const session = await getSession(token);
  if (!session) return null;
  return session as any;
}

// ── GET /api/users/:userId/favorites ─────────────────────────────────────
router.get("/users/:userId/favorites", async (req, res) => {
  try {
    const session = await requireAuth(req);
    if (!session) return res.status(401).json({ success: false, error: "Unauthorized" });

    const userId = parseInt(req.params.userId);
    if (isNaN(userId) || session.userId !== userId) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

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

// ── POST /api/users/:userId/favorites ────────────────────────────────────
router.post("/users/:userId/favorites", async (req, res) => {
  try {
    const session = await requireAuth(req);
    if (!session) return res.status(401).json({ success: false, error: "Unauthorized" });

    const userId = parseInt(req.params.userId);
    if (isNaN(userId) || session.userId !== userId) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const { providerId } = req.body;
    if (!providerId) return res.status(400).json({ success: false, error: "providerId required" });

    const existing = await db
      .select()
      .from(favoritesTable)
      .where(and(eq(favoritesTable.userId, userId), eq(favoritesTable.providerId, providerId)));
    if (existing.length > 0) return res.json({ success: true, data: existing[0] });
    const [fav] = await db.insert(favoritesTable).values({ userId, providerId }).returning();
    res.json({ success: true, data: fav });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to add favorite" });
  }
});

// ── DELETE /api/users/:userId/favorites/:providerId ───────────────────────
router.delete("/users/:userId/favorites/:providerId", async (req, res) => {
  try {
    const session = await requireAuth(req);
    if (!session) return res.status(401).json({ success: false, error: "Unauthorized" });

    const userId = parseInt(req.params.userId);
    if (isNaN(userId) || session.userId !== userId) {
      return res.status(403).json({ success: false, error: "Forbidden" });
    }

    const providerId = parseInt(req.params.providerId);
    if (isNaN(providerId)) return res.status(400).json({ success: false, error: "Invalid providerId" });

    await db
      .delete(favoritesTable)
      .where(and(eq(favoritesTable.userId, userId), eq(favoritesTable.providerId, providerId)));
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to remove favorite" });
  }
});

export default router;
