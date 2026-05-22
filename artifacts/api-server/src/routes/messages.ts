import { Router } from "express";
import { db } from "@workspace/db";
import { messagesTable, usersTable, notificationsTable } from "@workspace/db";
import { eq, or, and, desc, sql } from "drizzle-orm";
import { getSession } from "./auth";
import type { Request, Response } from "express";

const router = Router();

async function getMe(req: Request): Promise<{ userId: number; role: string } | null> {
  const token = (req.cookies as Record<string, string>)?.session
    ?? (req.headers.authorization as string | undefined)?.replace("Bearer ", "");
  if (!token) return null;
  const session = await getSession(token);
  if (!session?.userId) return null;
  return { userId: session.userId, role: (session as any).role ?? "user" };
}

// ── GET /api/messages/unread-count ──────────────────────────────────────────
router.get("/messages/unread-count", async (req: Request, res: Response) => {
  const me = await getMe(req);
  if (!me) return res.status(401).json({ success: false, error: "Unauthorized" });
  try {
    const result = await db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(messagesTable)
      .where(and(eq(messagesTable.receiverId, me.userId), eq(messagesTable.isRead, false)));
    res.json({ success: true, data: result[0]?.count ?? 0 });
  } catch {
    res.status(500).json({ success: false, error: "Failed to fetch unread count" });
  }
});

// ── GET /api/messages/inbox ──────────────────────────────────────────────────
router.get("/messages/inbox", async (req: Request, res: Response) => {
  const me = await getMe(req);
  if (!me) return res.status(401).json({ success: false, error: "Unauthorized" });
  try {
    const rows = await db.execute(sql`
      SELECT
        t.id,
        t.content,
        t.created_at AS "createdAt",
        t.is_read AS "isRead",
        t.sender_id AS "senderId",
        t.receiver_id AS "receiverId",
        t.other_id AS "otherId",
        t.property_id AS "propertyId",
        u.name AS "otherName",
        u.avatar AS "otherAvatar",
        u.role AS "otherRole",
        (
          SELECT CAST(COUNT(*) AS INT) FROM messages unread
          WHERE unread.sender_id = t.other_id
            AND unread.receiver_id = ${me.userId}
            AND unread.is_read = false
            AND COALESCE(unread.property_id, 0) = COALESCE(t.property_id, 0)
        ) AS "unreadCount",
        p.title AS "propertyTitle",
        p.price AS "propertyPrice",
        p.images AS "propertyImages",
        p.listing_type AS "propertyListingType",
        p.main_category AS "propertyMainCategory"
      FROM (
        SELECT DISTINCT ON (other_id, COALESCE(property_id, 0))
          m.*,
          CASE WHEN m.sender_id = ${me.userId} THEN m.receiver_id ELSE m.sender_id END AS other_id
        FROM messages m
        WHERE m.sender_id = ${me.userId} OR m.receiver_id = ${me.userId}
        ORDER BY other_id, COALESCE(property_id, 0), m.created_at DESC
      ) t
      JOIN users u ON u.id = t.other_id
      LEFT JOIN properties p ON p.id = t.property_id
      ORDER BY t.created_at DESC
    `);
    res.json({ success: true, data: rows.rows });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch inbox" });
  }
});

// ── GET /api/messages/conversation/:otherId?propertyId= ─────────────────────
router.get("/messages/conversation/:otherId", async (req: Request, res: Response) => {
  const me = await getMe(req);
  if (!me) return res.status(401).json({ success: false, error: "Unauthorized" });
  const otherId = parseInt(String(req.params.otherId));
  const propertyId = req.query.propertyId ? parseInt(String(req.query.propertyId)) : null;
  if (isNaN(otherId)) return res.status(400).json({ success: false, error: "Invalid user" });
  try {
    const baseCondition = or(
      and(eq(messagesTable.senderId, me.userId), eq(messagesTable.receiverId, otherId)),
      and(eq(messagesTable.senderId, otherId), eq(messagesTable.receiverId, me.userId))
    );

    const msgs = await db
      .select({
        id: messagesTable.id,
        senderId: messagesTable.senderId,
        receiverId: messagesTable.receiverId,
        content: messagesTable.content,
        isRead: messagesTable.isRead,
        propertyId: messagesTable.propertyId,
        createdAt: messagesTable.createdAt,
        senderName: usersTable.name,
        senderAvatar: usersTable.avatar,
      })
      .from(messagesTable)
      .innerJoin(usersTable, eq(usersTable.id, messagesTable.senderId))
      .where(
        propertyId
          ? and(baseCondition!, eq(messagesTable.propertyId, propertyId))
          : and(baseCondition!, sql`${messagesTable.propertyId} IS NULL`)
      )
      .orderBy(messagesTable.createdAt);

    // Mark received messages as read
    await db
      .update(messagesTable)
      .set({ isRead: true })
      .where(
        and(
          eq(messagesTable.senderId, otherId),
          eq(messagesTable.receiverId, me.userId),
          propertyId
            ? eq(messagesTable.propertyId, propertyId)
            : sql`${messagesTable.propertyId} IS NULL`
        )
      );

    // Fetch property info if propertyId
    let property = null;
    if (propertyId) {
      try {
        const result = await db.execute(sql`
          SELECT id, title, price, images, listing_type AS "listingType", main_category AS "mainCategory"
          FROM properties WHERE id = ${propertyId}
        `);
        property = result.rows[0] ?? null;
      } catch {}
    }

    res.json({ success: true, data: { messages: msgs, property: property || null } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to fetch conversation" });
  }
});

// ── POST /api/messages ───────────────────────────────────────────────────────
router.post("/messages", async (req: Request, res: Response) => {
  const me = await getMe(req);
  if (!me) return res.status(401).json({ success: false, error: "Unauthorized" });
  const { receiverId, content, propertyId } = req.body;
  if (!receiverId || !content?.trim()) {
    return res.status(400).json({ success: false, error: "receiverId and content are required" });
  }
  if (parseInt(receiverId) === me.userId) {
    return res.status(400).json({ success: false, error: "Cannot message yourself" });
  }
  try {
    const [msg] = await db
      .insert(messagesTable)
      .values({
        senderId: me.userId,
        receiverId: parseInt(receiverId),
        content: content.trim(),
        propertyId: propertyId ? parseInt(propertyId) : null,
      })
      .returning();

    // Create notification for recipient
    try {
      const [sender] = await db.select({ name: usersTable.name })
        .from(usersTable).where(eq(usersTable.id, me.userId));
      const [receiver] = await db.select({ role: usersTable.role })
        .from(usersTable).where(eq(usersTable.id, parseInt(receiverId)));
      const isReceiverProvider = receiver?.role === "provider";
      let notifMessage = `أرسل لك ${sender?.name ?? "مستخدم"} رسالة جديدة`;
      const inboxPath = isReceiverProvider ? `/dashboard/inbox` : `/user/inbox`;
      let link = `${inboxPath}?otherId=${me.userId}`;
      if (propertyId) link += `&propertyId=${propertyId}`;

      await db.insert(notificationsTable).values({
        userId: parseInt(receiverId),
        type: "info",
        title: "رسالة جديدة",
        message: notifMessage,
        link,
      });
    } catch {}

    res.json({ success: true, data: msg });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "Failed to send message" });
  }
});

// ── PATCH /api/messages/conversation/:otherId/read ──────────────────────────
router.patch("/messages/conversation/:otherId/read", async (req: Request, res: Response) => {
  const me = await getMe(req);
  if (!me) return res.status(401).json({ success: false, error: "Unauthorized" });
  const otherId = parseInt(String(req.params.otherId));
  const propertyId = req.query.propertyId ? parseInt(String(req.query.propertyId)) : null;
  try {
    await db.update(messagesTable).set({ isRead: true }).where(
      and(
        eq(messagesTable.senderId, otherId),
        eq(messagesTable.receiverId, me.userId),
        propertyId
          ? eq(messagesTable.propertyId, propertyId)
          : sql`${messagesTable.propertyId} IS NULL`
      )
    );
    res.json({ success: true });
  } catch {
    res.status(500).json({ success: false, error: "Failed to mark as read" });
  }
});

export default router;
