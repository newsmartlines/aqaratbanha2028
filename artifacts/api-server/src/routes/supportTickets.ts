import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { providersTable } from "@workspace/db";
import { supportTicketsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ensureSessionProviderId } from "./auth";
import type { TicketMessage } from "@workspace/db/schema";

const router = Router();

const ALLOWED_CATEGORY = new Set(["Technical", "Payment", "Account", "Other"]);
const ALLOWED_STATUS = new Set(["Replied", "Pending", "Closed"]);

function getBearerOrCookieToken(req: Request): string | null {
  const c = (req.cookies as Record<string, string> | undefined)?.session;
  const h = (req.headers.authorization as string | undefined)?.replace(/^Bearer\s+/i, "");
  return c || h || null;
}

async function canAccessProviderTickets(req: Request, providerId: number): Promise<boolean> {
  const token = getBearerOrCookieToken(req);
  const headerUserId = parseInt(String(req.headers["x-user-id"] ?? ""), 10);
  if (Number.isFinite(headerUserId) && headerUserId > 0) {
    const [prov] = await db
      .select({ id: providersTable.id })
      .from(providersTable)
      .where(and(eq(providersTable.id, providerId), eq(providersTable.userId, headerUserId)))
      .limit(1);
    if (prov) return true;
  }
  if (!token) return false;
  const sessionPid = await ensureSessionProviderId(token);
  return sessionPid != null && sessionPid === providerId;
}

function makePublicId() {
  const n = Math.floor(10000 + Math.random() * 89999);
  return `TK-${n}`;
}

function paramStr(v: string | string[] | undefined): string {
  if (v == null) return "";
  return Array.isArray(v) ? (v[0] ?? "") : v;
}

function serializeTicket(r: {
  id: string; subject: string; category: string; status: string;
  message: string; adminReply: string | null; messages: TicketMessage[] | null;
  createdAt: Date | string; updatedAt: Date | string;
}) {
  return {
    id: r.id,
    subject: r.subject,
    category: r.category,
    status: r.status,
    message: r.message,
    adminReply: r.adminReply ?? null,
    messages: r.messages ?? [],
    createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
    updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
  };
}

// ── GET list ─────────────────────────────────────────────────────────────────
router.get("/providers/:providerId/support-tickets", async (req: Request, res: Response) => {
  const providerId = parseInt(paramStr(req.params.providerId), 10);
  if (!Number.isFinite(providerId) || providerId < 1) {
    return res.status(400).json({ success: false, error: "معرّف الشركة العقارية غير صالح" });
  }
  if (!(await canAccessProviderTickets(req, providerId))) {
    return res.status(401).json({ success: false, error: "غير مصرح — سجّل الدخول بالحساب الصحيح" });
  }
  try {
    const rows = await db
      .select({
        id: supportTicketsTable.publicId,
        subject: supportTicketsTable.subject,
        category: supportTicketsTable.category,
        status: supportTicketsTable.status,
        message: supportTicketsTable.message,
        adminReply: supportTicketsTable.adminReply,
        messages: supportTicketsTable.messages,
        createdAt: supportTicketsTable.createdAt,
        updatedAt: supportTicketsTable.updatedAt,
      })
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.providerId, providerId))
      .orderBy(desc(supportTicketsTable.createdAt));
    return res.json({ success: true, data: rows.map(serializeTicket) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: "تعذر تحميل تذاكر الدعم" });
  }
});

// ── POST create ───────────────────────────────────────────────────────────────
router.post("/providers/:providerId/support-tickets", async (req: Request, res: Response) => {
  const providerId = parseInt(paramStr(req.params.providerId), 10);
  if (!Number.isFinite(providerId) || providerId < 1) {
    return res.status(400).json({ success: false, error: "معرّف الشركة العقارية غير صالح" });
  }
  if (!(await canAccessProviderTickets(req, providerId))) {
    return res.status(401).json({ success: false, error: "غير مصرح — سجّل الدخول بالحساب الصحيح" });
  }
  const { subject, category, message } = req.body ?? {};
  if (!subject || typeof subject !== "string" || !subject.trim()) {
    return res.status(400).json({ success: false, error: "الموضوع مطلوب" });
  }
  if (!category || !ALLOWED_CATEGORY.has(String(category))) {
    return res.status(400).json({ success: false, error: "تصنيف التذكرة غير صالح" });
  }
  if (!message || typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ success: false, error: "نص الرسالة مطلوب" });
  }
  try {
    const [p] = await db.select({ id: providersTable.id }).from(providersTable).where(eq(providersTable.id, providerId));
    if (!p) return res.status(404).json({ success: false, error: "لم يُعثر على الشركة العقارية" });

    let publicId = makePublicId();
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await db
        .select({ id: supportTicketsTable.id })
        .from(supportTicketsTable)
        .where(eq(supportTicketsTable.publicId, publicId))
        .limit(1);
      if (existing.length === 0) break;
      publicId = makePublicId();
    }

    const now = new Date();
    const initMessages: TicketMessage[] = [
      { role: "provider", text: message.trim(), createdAt: now.toISOString() },
    ];

    const [row] = await db
      .insert(supportTicketsTable)
      .values({
        publicId,
        providerId,
        subject: subject.trim(),
        category: String(category),
        status: "Pending",
        message: message.trim(),
        messages: initMessages,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: supportTicketsTable.publicId,
        subject: supportTicketsTable.subject,
        category: supportTicketsTable.category,
        status: supportTicketsTable.status,
        message: supportTicketsTable.message,
        adminReply: supportTicketsTable.adminReply,
        messages: supportTicketsTable.messages,
        createdAt: supportTicketsTable.createdAt,
        updatedAt: supportTicketsTable.updatedAt,
      });

    return res.status(201).json({ success: true, data: serializeTicket(row) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: "تعذر إنشاء التذكرة" });
  }
});

// ── POST reply (provider adds a follow-up message) ────────────────────────────
router.post("/providers/:providerId/support-tickets/:publicId/reply", async (req: Request, res: Response) => {
  const providerId = parseInt(paramStr(req.params.providerId), 10);
  const publicId = paramStr(req.params.publicId);
  if (!Number.isFinite(providerId) || providerId < 1) {
    return res.status(400).json({ success: false, error: "معرّف الشركة العقارية غير صالح" });
  }
  if (!(await canAccessProviderTickets(req, providerId))) {
    return res.status(401).json({ success: false, error: "غير مصرح" });
  }
  const { message: replyText } = req.body ?? {};
  if (!replyText || typeof replyText !== "string" || !replyText.trim()) {
    return res.status(400).json({ success: false, error: "نص الرد مطلوب" });
  }
  try {
    const [ticket] = await db
      .select({
        id: supportTicketsTable.id,
        message: supportTicketsTable.message,
        adminReply: supportTicketsTable.adminReply,
        messages: supportTicketsTable.messages,
        status: supportTicketsTable.status,
        createdAt: supportTicketsTable.createdAt,
        updatedAt: supportTicketsTable.updatedAt,
      })
      .from(supportTicketsTable)
      .where(and(eq(supportTicketsTable.providerId, providerId), eq(supportTicketsTable.publicId, publicId)))
      .limit(1);

    if (!ticket) return res.status(404).json({ success: false, error: "التذكرة غير موجودة" });
    if (ticket.status === "Closed") {
      return res.status(400).json({ success: false, error: "لا يمكن الرد على تذكرة مغلقة" });
    }

    // Build existing messages — migrate old tickets if messages array is empty
    const existing: TicketMessage[] = Array.isArray(ticket.messages) && ticket.messages.length > 0
      ? ticket.messages
      : [
          { role: "provider", text: ticket.message, createdAt: (ticket.createdAt instanceof Date ? ticket.createdAt : new Date(ticket.createdAt)).toISOString() },
          ...(ticket.adminReply ? [{ role: "admin" as const, text: ticket.adminReply, createdAt: (ticket.updatedAt instanceof Date ? ticket.updatedAt : new Date(ticket.updatedAt)).toISOString() }] : []),
        ];

    const now = new Date();
    const newMessages: TicketMessage[] = [
      ...existing,
      { role: "provider", text: replyText.trim(), createdAt: now.toISOString() },
    ];

    const [updated] = await db
      .update(supportTicketsTable)
      .set({ messages: newMessages, status: "Pending", updatedAt: now })
      .where(and(eq(supportTicketsTable.providerId, providerId), eq(supportTicketsTable.publicId, publicId)))
      .returning({
        id: supportTicketsTable.publicId,
        subject: supportTicketsTable.subject,
        category: supportTicketsTable.category,
        status: supportTicketsTable.status,
        message: supportTicketsTable.message,
        adminReply: supportTicketsTable.adminReply,
        messages: supportTicketsTable.messages,
        createdAt: supportTicketsTable.createdAt,
        updatedAt: supportTicketsTable.updatedAt,
      });

    if (!updated) return res.status(404).json({ success: false, error: "التذكرة غير موجودة" });
    return res.json({ success: true, data: serializeTicket(updated) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: "تعذر إرسال الرد" });
  }
});

// ── PATCH status (provider close) ─────────────────────────────────────────────
router.patch("/providers/:providerId/support-tickets/:publicId", async (req: Request, res: Response) => {
  const providerId = parseInt(paramStr(req.params.providerId), 10);
  const publicId = paramStr(req.params.publicId);
  if (!Number.isFinite(providerId) || providerId < 1) {
    return res.status(400).json({ success: false, error: "معرّف الشركة العقارية غير صالح" });
  }
  if (!(await canAccessProviderTickets(req, providerId))) {
    return res.status(401).json({ success: false, error: "غير مصرح" });
  }
  const { status } = req.body ?? {};
  if (!status || !ALLOWED_STATUS.has(String(status))) {
    return res.status(400).json({ success: false, error: "حالة التذكرة غير صالحة" });
  }
  try {
    const now = new Date();
    const [updated] = await db
      .update(supportTicketsTable)
      .set({ status: String(status), updatedAt: now })
      .where(and(eq(supportTicketsTable.providerId, providerId), eq(supportTicketsTable.publicId, publicId)))
      .returning({
        id: supportTicketsTable.publicId,
        subject: supportTicketsTable.subject,
        category: supportTicketsTable.category,
        status: supportTicketsTable.status,
        message: supportTicketsTable.message,
        adminReply: supportTicketsTable.adminReply,
        messages: supportTicketsTable.messages,
        createdAt: supportTicketsTable.createdAt,
        updatedAt: supportTicketsTable.updatedAt,
      });
    if (!updated) return res.status(404).json({ success: false, error: "التذكرة غير موجودة" });
    return res.json({ success: true, data: serializeTicket(updated) });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: "تعذر تحديث التذكرة" });
  }
});

export default router;
