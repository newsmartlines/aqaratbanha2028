import { Router } from "express";
import { db } from "@workspace/db";
import { propertyReportsTable } from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { adminOnly } from "../middleware/adminOnly";
import { getSession } from "./auth";

const router = Router();

// ── Auth helper ──────────────────────────────────────────────────────────
async function requireAuth(req: any): Promise<{ userId: number } | null> {
  const token =
    req.cookies?.session ??
    (req.headers.authorization as string | undefined)?.replace(/^Bearer\s+/i, "");
  if (!token) return null;
  const session = await getSession(token);
  if (!session) return null;
  return session as any;
}

// ── In-memory IP rate limiter: max 5 reports per IP per hour ─────────────
const reportLimiter = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = reportLimiter.get(ip);
  if (!entry || now > entry.resetAt) {
    reportLimiter.set(ip, { count: 1, resetAt: now + 60 * 60 * 1000 });
    return true; // allowed
  }
  if (entry.count >= 5) return false; // blocked
  entry.count++;
  return true;
}

// ── POST /api/property-reports — requires auth + rate limit ──────────────
router.post("/property-reports", async (req, res) => {
  const session = await requireAuth(req);
  if (!session) {
    return res.status(401).json({ error: "يجب تسجيل الدخول لإرسال بلاغ" });
  }

  const ip = (req.ip ?? "unknown").replace(/^::ffff:/, "");
  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: "لقد تجاوزت الحد المسموح به من البلاغات. حاول مجدداً بعد ساعة." });
  }

  const { propertyId, email, message } = req.body;
  if (!propertyId || !message) {
    return res.status(400).json({ error: "بيانات ناقصة" });
  }

  try {
    const [row] = await db
      .insert(propertyReportsTable)
      .values({ propertyId: Number(propertyId), email: email ?? null, message })
      .returning();
    return res.json({ ok: true, id: row.id });
  } catch {
    return res.status(500).json({ error: "فشل إرسال البلاغ" });
  }
});

// ── GET /api/admin/property-reports — admin only ─────────────────────────
router.get("/admin/property-reports", adminOnly, async (req, res) => {
  try {
    const rows = await db
      .select()
      .from(propertyReportsTable)
      .orderBy(desc(propertyReportsTable.createdAt));
    return res.json(rows);
  } catch {
    return res.status(500).json({ error: "Failed to fetch reports" });
  }
});

// ── PATCH /api/admin/property-reports/:id — admin only ───────────────────
router.patch("/admin/property-reports/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid report ID" });
  }
  const { status } = req.body;
  try {
    await db
      .update(propertyReportsTable)
      .set({ status })
      .where(eq(propertyReportsTable.id, id));
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Failed to update report" });
  }
});

// ── DELETE /api/admin/property-reports/:id — admin only ──────────────────
router.delete("/admin/property-reports/:id", adminOnly, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid report ID" });
  }
  try {
    await db
      .delete(propertyReportsTable)
      .where(eq(propertyReportsTable.id, id));
    return res.json({ ok: true });
  } catch {
    return res.status(500).json({ error: "Failed to delete report" });
  }
});

export default router;
