import { Router } from "express";
import { db } from "@workspace/db";
import { reviewsTable, usersTable, providersTable } from "@workspace/db";
import { eq, avg, count } from "drizzle-orm";

const router = Router();

router.get("/providers/:providerId/reviews", async (req, res) => {
  try {
    const providerId = parseInt(req.params.providerId);
    const rows = await db
      .select({
        id: reviewsTable.id,
        rating: reviewsTable.rating,
        text: reviewsTable.text,
        reply: reviewsTable.reply,
        createdAt: reviewsTable.createdAt,
        userId: reviewsTable.userId,
        userName: usersTable.name,
        userAvatar: usersTable.avatar,
      })
      .from(reviewsTable)
      .leftJoin(usersTable, eq(reviewsTable.userId, usersTable.id))
      .where(eq(reviewsTable.providerId, providerId))
      .orderBy(reviewsTable.createdAt);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch reviews" });
  }
});

router.post("/providers/:providerId/reviews", async (req, res) => {
  try {
    const providerId = parseInt(req.params.providerId);
    const { userId, rating, text } = req.body;
    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ success: false, error: "Rating 1-5 required" });
    const [review] = await db.insert(reviewsTable).values({ providerId, userId, rating, text }).returning();

    const [stats] = await db
      .select({ avg: avg(reviewsTable.rating), count: count() })
      .from(reviewsTable)
      .where(eq(reviewsTable.providerId, providerId));
    if (stats) {
      await db.update(providersTable).set({ rating: stats.avg ?? "0", reviewsCount: stats.count }).where(eq(providersTable.id, providerId));
    }
    res.json({ success: true, data: review });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to create review" });
  }
});

router.get("/users/:userId/reviews", async (req, res) => {
  try {
    const userId = parseInt(req.params.userId);
    const rows = await db
      .select({
        id: reviewsTable.id,
        providerId: reviewsTable.providerId,
        rating: reviewsTable.rating,
        text: reviewsTable.text,
        reply: reviewsTable.reply,
        createdAt: reviewsTable.createdAt,
        providerName: usersTable.name,
        providerAvatar: usersTable.avatar,
      })
      .from(reviewsTable)
      .leftJoin(providersTable, eq(reviewsTable.providerId, providersTable.id))
      .leftJoin(usersTable, eq(providersTable.userId, usersTable.id))
      .where(eq(reviewsTable.userId, userId))
      .orderBy(reviewsTable.createdAt);
    res.json({ success: true, data: rows });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to fetch reviews" });
  }
});

async function recomputeProviderRating(providerId: number) {
  const [stats] = await db
    .select({ avg: avg(reviewsTable.rating), count: count() })
    .from(reviewsTable)
    .where(eq(reviewsTable.providerId, providerId));
  await db
    .update(providersTable)
    .set({ rating: stats?.avg ?? "0", reviewsCount: stats?.count ?? 0 })
    .where(eq(providersTable.id, providerId));
}

router.patch("/reviews/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { rating, text } = req.body;
    const patch: Record<string, unknown> = {};
    if (rating != null) {
      if (rating < 1 || rating > 5) return res.status(400).json({ success: false, error: "Rating 1-5 required" });
      patch.rating = rating;
    }
    if (text !== undefined) patch.text = text;
    const [updated] = await db.update(reviewsTable).set(patch).where(eq(reviewsTable.id, id)).returning();
    if (updated) await recomputeProviderRating(updated.providerId);
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update review" });
  }
});

router.delete("/reviews/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [existing] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id));
    if (!existing) return res.status(404).json({ success: false, error: "Not found" });
    await db.delete(reviewsTable).where(eq(reviewsTable.id, id));
    await recomputeProviderRating(existing.providerId);
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete review" });
  }
});

router.patch("/reviews/:id/reply", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const { reply } = req.body;
    const [updated] = await db.update(reviewsTable).set({ reply }).where(eq(reviewsTable.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: "Failed to add reply" });
  }
});

export default router;
