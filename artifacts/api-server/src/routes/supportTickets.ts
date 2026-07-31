import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { providersTable } from "@workspace/db";
import { supportTicketsTable } from "@workspace/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { ensureSessionProviderId } from "./auth";

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
        createdAt: supportTicketsTable.createdAt,
        updatedAt: supportTicketsTable.updatedAt,
      })
      .from(supportTicketsTable)
      .where(eq(supportTicketsTable.providerId, providerId))
      .orderBy(desc(supportTicketsTable.createdAt));
    const data = rows.map((r) => ({
      id: r.id,
      subject: r.subject,
      category: r.category,
      status: r.status,
      message: r.message,
      adminReply: r.adminReply ?? null,
      createdAt: r.createdAt instanceof Date ? r.createdAt.toISOString() : String(r.createdAt),
      updatedAt: r.updatedAt instanceof Date ? r.updatedAt.toISOString() : String(r.updatedAt),
    }));
    return res.json({ success: true, data });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: "تعذر تحميل تذاكر الدعم" });
  }
});

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
    const [row] = await db
      .insert(supportTicketsTable)
      .values({
        publicId,
        providerId,
        subject: subject.trim(),
        category: String(category),
        status: "Pending",
        message: message.trim(),
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
        createdAt: supportTicketsTable.createdAt,
        updatedAt: supportTicketsTable.updatedAt,
      });

    return res.status(201).json({
      success: true,
      data: {
        id: row.id,
        subject: row.subject,
        category: row.category,
        status: row.status,
        message: row.message,
        adminReply: row.adminReply ?? null,
        createdAt: row.createdAt instanceof Date ? row.createdAt.toISOString() : String(row.createdAt),
        updatedAt: row.updatedAt instanceof Date ? row.updatedAt.toISOString() : String(row.updatedAt),
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: "تعذر إنشاء التذكرة" });
  }
});

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
        createdAt: supportTicketsTable.createdAt,
        updatedAt: supportTicketsTable.updatedAt,
      });
    if (!updated) return res.status(404).json({ success: false, error: "التذكرة غير موجودة" });
    return res.json({
      success: true,
      data: {
        id: updated.id,
        subject: updated.subject,
        category: updated.category,
        status: updated.status,
        message: updated.message,
        adminReply: updated.adminReply ?? null,
        createdAt: updated.createdAt instanceof Date ? updated.createdAt.toISOString() : String(updated.createdAt),
        updatedAt: updated.updatedAt instanceof Date ? updated.updatedAt.toISOString() : String(updated.updatedAt),
      },
    });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: "تعذر تحديث التذكرة" });
  }
});

export default router;
