import { Router } from "express";
import { db } from "@workspace/db";
import { reviewsTable, usersTable, providersTable } from "@workspace/db";
import { eq, avg, count } from "drizzle-orm";
import { getSession } from "./auth";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();

// ── Auth helper ──────────────────────────────────────────────────────────────
async function requireAuth(req: any): Promise<number | null> {
  const token = req.cookies?.session ?? req.headers.authorization?.replace("Bearer ", "");
  if (!token) return null;
  const session = await getSession(token);
  return session ? (session as any).userId as number : null;
}

// ── Recompute provider rating after any review change ───────────────────────
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

// ── GET /api/providers/:providerId/reviews ───────────────────────────────────
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
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch reviews" });
  }
});

// ── POST /api/providers/:providerId/reviews ──────────────────────────────────
// Must be authenticated — userId taken from session, NOT body
router.post("/providers/:providerId/reviews", async (req, res) => {
  try {
    const userId = await requireAuth(req);
    if (!userId) return res.status(401).json({ success: false, error: "Authentication required" });

    const providerId = parseInt(req.params.providerId);
    const { rating, text } = req.body;
    if (!rating || rating < 1 || rating > 5)
      return res.status(400).json({ success: false, error: "Rating must be between 1 and 5" });

    const [review] = await db
      .insert(reviewsTable)
      .values({ providerId, userId, rating, text })
      .returning();

    await recomputeProviderRating(providerId);
    res.json({ success: true, data: review });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create review" });
  }
});

// ── GET /api/users/:userId/reviews ───────────────────────────────────────────
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
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch reviews" });
  }
});

// ── PATCH /api/reviews/:id — update own review or admin ──────────────────────
router.patch("/reviews/:id", async (req, res) => {
  try {
    const userId = await requireAuth(req);
    if (!userId) return res.status(401).json({ success: false, error: "Authentication required" });

    const id = parseInt(req.params.id);
    const { rating, text } = req.body;
    const patch: Record<string, unknown> = {};
    if (rating != null) {
      if (rating < 1 || rating > 5) return res.status(400).json({ success: false, error: "Rating must be between 1 and 5" });
      patch.rating = rating;
    }
    if (text !== undefined) patch.text = text;

    // Verify ownership
    const [existing] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id));
    if (!existing) return res.status(404).json({ success: false, error: "Review not found" });
    if (existing.userId !== userId) return res.status(403).json({ success: false, error: "Not your review" });

    const [updated] = await db.update(reviewsTable).set(patch).where(eq(reviewsTable.id, id)).returning();
    if (updated) await recomputeProviderRating(updated.providerId);
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to update review" });
  }
});

// ── DELETE /api/reviews/:id — delete own review or admin ─────────────────────
router.delete("/reviews/:id", async (req, res) => {
  try {
    const userId = await requireAuth(req);
    if (!userId) return res.status(401).json({ success: false, error: "Authentication required" });

    const id = parseInt(req.params.id);
    const [existing] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id));
    if (!existing) return res.status(404).json({ success: false, error: "Review not found" });
    if (existing.userId !== userId) return res.status(403).json({ success: false, error: "Not your review" });

    await db.delete(reviewsTable).where(eq(reviewsTable.id, id));
    await recomputeProviderRating(existing.providerId);
    res.json({ success: true, data: { id } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete review" });
  }
});

// ── PATCH /api/reviews/:id/reply — provider replies to a review ──────────────
router.patch("/reviews/:id/reply", async (req, res) => {
  try {
    const userId = await requireAuth(req);
    if (!userId) return res.status(401).json({ success: false, error: "Authentication required" });

    const id = parseInt(req.params.id);
    const { reply } = req.body;
    if (!reply?.trim()) return res.status(400).json({ success: false, error: "Reply text required" });

    const [updated] = await db
      .update(reviewsTable)
      .set({ reply: reply.trim() })
      .where(eq(reviewsTable.id, id))
      .returning();
    if (!updated) return res.status(404).json({ success: false, error: "Review not found" });
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to add reply" });
  }
});

// ── Admin: delete any review ──────────────────────────────────────────────────
router.delete("/admin/reviews/:id", adminOnly, async (req, res) => {
  try {
    const id = parseInt(String(req.params.id));
    const [existing] = await db.select().from(reviewsTable).where(eq(reviewsTable.id, id));
    if (!existing) return res.status(404).json({ success: false, error: "Review not found" });
    await db.delete(reviewsTable).where(eq(reviewsTable.id, id));
    await recomputeProviderRating(existing.providerId);
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete review" });
  }
});

export default router;
