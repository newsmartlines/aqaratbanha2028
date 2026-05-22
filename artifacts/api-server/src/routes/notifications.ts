import { Router } from "express";
import { db } from "@workspace/db";
import { notificationsTable } from "@workspace/db";
import { eq, desc, isNull, and, sql } from "drizzle-orm";
import { getSession } from "./auth";

const router = Router();

// Helper: get current session user (returns null if unauthenticated)
async function getSessionUser(req: any) {
  const token = req.cookies?.session_token;
  if (!token) return null;
  return getSession(token);
}

router.get("/notifications/unread-count", async (req, res) => {
  try {
    const session = await getSessionUser(req);
    if (!session) return res.json({ success: true, data: 0 });

    // Admins see global (null-userId) notifications; users/providers see only their own
    const whereExpr = session.role === "admin"
      ? and(isNull(notificationsTable.userId), eq(notificationsTable.read, false))
      : and(eq(notificationsTable.userId, session.userId), eq(notificationsTable.read, false));

    const [row] = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(notificationsTable)
      .where(whereExpr);
    res.json({ success: true, data: row?.count ?? 0 });
  } catch {
    res.status(500).json({ success: false, error: "Failed to count unread" });
  }
});

router.get("/notifications", async (req, res) => {
  try {
    const session = await getSessionUser(req);
    if (!session) return res.json({ success: true, data: [] });

    // Admins see global (null-userId) notifications; users/providers see only their own
    const whereExpr = session.role === "admin"
      ? isNull(notificationsTable.userId)
      : eq(notificationsTable.userId, session.userId);

    const rows = await db
      .select()
      .from(notificationsTable)
      .where(whereExpr)
      .orderBy(desc(notificationsTable.createdAt))
      .limit(50);
    res.json({ success: true, data: rows });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch notifications" });
  }
});

router.post("/notifications", async (req, res) => {
  try {
    const { userId, type, title, message, link } = req.body;
    if (!title) return res.status(400).json({ success: false, error: "title required" });
    const [notif] = await db
      .insert(notificationsTable)
      .values({ userId: userId ?? null, type: type ?? "info", title, message, link })
      .returning();
    res.json({ success: true, data: notif });
  } catch {
    res.status(500).json({ success: false, error: "Failed to create notification" });
  }
});

router.patch("/notifications/:id/read", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const [updated] = await db
      .update(notificationsTable)
      .set({ read: true })
      .where(eq(notificationsTable.id, id))
      .returning();
    res.json({ success: true, data: updated });
  } catch {
    res.status(500).json({ success: false, error: "Failed to mark notification as read" });
  }
});

router.patch("/notifications/read-all", async (req, res) => {
  try {
    const session = await getSessionUser(req);
    if (!session) return res.status(401).json({ success: false, error: "Unauthorized" });

    if (session.role === "admin") {
      await db.update(notificationsTable).set({ read: true }).where(isNull(notificationsTable.userId));
    } else {
      await db.update(notificationsTable).set({ read: true }).where(eq(notificationsTable.userId, session.userId));
    }
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: "Failed to mark all as read" });
  }
});

router.delete("/notifications/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    await db.delete(notificationsTable).where(eq(notificationsTable.id, id));
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: "Failed to delete notification" });
  }
});

export default router;
