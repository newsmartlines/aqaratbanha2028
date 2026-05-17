import { Router } from "express";
import { db } from "@workspace/db";
import { messagesTable, usersTable } from "@workspace/db";
import { eq, or, and, desc, sql } from "drizzle-orm";
import { getSession } from "./auth";
import type { Request, Response } from "express";

const router = Router();

function getMe(req: Request): number | null {
  const token = (req.cookies as Record<string, string>)?.session
    ?? (req.headers.authorization as string | undefined)?.replace("Bearer ", "");
  if (!token) return null;
  const session = getSession(token);
  return session?.userId ?? null;
}

// Get unread count for current user
router.get("/messages/unread-count", async (req: Request, res: Response) => {
  const me = getMe(req);
  if (!me) return res.status(401).json({ success: false, error: "Unauthorized" });
  try {
    const result = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(messagesTable)
      .where(and(eq(messagesTable.receiverId, me), eq(messagesTable.isRead, false)));
    res.json({ success: true, data: result[0]?.count ?? 0 });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch unread count" });
  }
});

// Get all conversations (inbox) for current user
router.get("/messages/inbox", async (req: Request, res: Response) => {
  const me = getMe(req);
  if (!me) return res.status(401).json({ success: false, error: "Unauthorized" });
  try {
    const rows = await db.execute(sql`
      SELECT DISTINCT ON (other_id)
        m.id,
        m.content,
        m.created_at AS "createdAt",
        m.is_read AS "isRead",
        m.sender_id AS "senderId",
        m.receiver_id AS "receiverId",
        CASE WHEN m.sender_id = ${me} THEN m.receiver_id ELSE m.sender_id END AS "otherId",
        u.name AS "otherName",
        u.avatar AS "otherAvatar",
        u.role AS "otherRole",
        (SELECT CAST(COUNT(*) AS INT) FROM messages unread
          WHERE unread.sender_id = (CASE WHEN m.sender_id = ${me} THEN m.receiver_id ELSE m.sender_id END)
          AND unread.receiver_id = ${me}
          AND unread.is_read = false) AS "unreadCount"
      FROM messages m
      JOIN users u ON u.id = CASE WHEN m.sender_id = ${me} THEN m.receiver_id ELSE m.sender_id END
      WHERE m.sender_id = ${me} OR m.receiver_id = ${me}
      ORDER BY other_id, m.created_at DESC
    `);
    res.json({ success: true, data: rows.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch inbox" });
  }
});

// Get conversation between current user and another user
router.get("/messages/conversation/:otherId", async (req: Request, res: Response) => {
  const me = getMe(req);
  if (!me) return res.status(401).json({ success: false, error: "Unauthorized" });
  const otherId = parseInt(req.params.otherId);
  if (isNaN(otherId)) return res.status(400).json({ success: false, error: "Invalid user" });
  try {
    const msgs = await db
      .select({
        id: messagesTable.id,
        senderId: messagesTable.senderId,
        receiverId: messagesTable.receiverId,
        content: messagesTable.content,
        isRead: messagesTable.isRead,
        createdAt: messagesTable.createdAt,
        senderName: usersTable.name,
        senderAvatar: usersTable.avatar,
      })
      .from(messagesTable)
      .innerJoin(usersTable, eq(usersTable.id, messagesTable.senderId))
      .where(
        or(
          and(eq(messagesTable.senderId, me), eq(messagesTable.receiverId, otherId)),
          and(eq(messagesTable.senderId, otherId), eq(messagesTable.receiverId, me))
        )
      )
      .orderBy(messagesTable.createdAt);

    // Mark received messages as read
    await db
      .update(messagesTable)
      .set({ isRead: true })
      .where(and(eq(messagesTable.senderId, otherId), eq(messagesTable.receiverId, me)));

    res.json({ success: true, data: msgs });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch conversation" });
  }
});

// Send a message
router.post("/messages", async (req: Request, res: Response) => {
  const me = getMe(req);
  if (!me) return res.status(401).json({ success: false, error: "Unauthorized" });
  const { receiverId, content } = req.body;
  if (!receiverId || !content?.trim()) {
    return res.status(400).json({ success: false, error: "receiverId and content are required" });
  }
  try {
    const [msg] = await db
      .insert(messagesTable)
      .values({ senderId: me, receiverId: parseInt(receiverId), content: content.trim() })
      .returning();
    res.json({ success: true, data: msg });
  } catch {
    res.status(500).json({ success: false, error: "Failed to send message" });
  }
});

export default router;
