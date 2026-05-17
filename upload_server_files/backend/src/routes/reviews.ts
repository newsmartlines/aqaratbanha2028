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
