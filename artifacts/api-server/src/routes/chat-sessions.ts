import { Router } from "express";
import { db, chatSessionsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

// POST /api/chat-sessions — save or update session
router.post("/chat-sessions", async (req, res) => {
  try {
    const { sessionId, messages, metadata } = req.body;
    if (!sessionId) return res.status(400).json({ error: "sessionId required" });

    const existing = await db
      .select()
      .from(chatSessionsTable)
      .where(eq(chatSessionsTable.sessionId, sessionId))
      .limit(1);

    if (existing.length > 0) {
      const [updated] = await db
        .update(chatSessionsTable)
        .set({
          messages: JSON.stringify(messages ?? []),
          metadata: JSON.stringify(metadata ?? {}),
          updatedAt: new Date(),
        })
        .where(eq(chatSessionsTable.sessionId, sessionId))
        .returning();
      return res.json(updated);
    } else {
      const [created] = await db
        .insert(chatSessionsTable)
        .values({
          sessionId,
          messages: JSON.stringify(messages ?? []),
          metadata: JSON.stringify(metadata ?? {}),
        })
        .returning();
      return res.json(created);
    }
  } catch (err) {
    console.error("[chat-sessions POST]", err);
    return res.status(500).json({ error: "Server error" });
  }
});

// GET /api/chat-sessions — admin view all sessions
router.get("/chat-sessions", async (req, res) => {
  try {
    const sessions = await db
      .select()
      .from(chatSessionsTable)
      .orderBy(desc(chatSessionsTable.updatedAt))
      .limit(100);
    return res.json(sessions);
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
});

// DELETE /api/chat-sessions/:id
router.delete("/chat-sessions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(chatSessionsTable).where(eq(chatSessionsTable.id, id));
    return res.json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
