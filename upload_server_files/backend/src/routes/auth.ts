import { Router, type Request } from "express";
import { db } from "@workspace/db";
import { usersTable, providersTable, notificationsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const router = Router();

interface SessionData { userId: number; role: string; providerId?: number }
const sessions = new Map<string, SessionData>();

interface ResetToken { userId: number; email: string; expiresAt: number }
const resetTokens = new Map<string, ResetToken>();

function createSession(userId: number, role: string, providerId?: number): string {
  const token = crypto.randomBytes(32).toString("hex");
  sessions.set(token, { userId, role, providerId });
  return token;
}

export function getSession(token: string): SessionData | null {
  return sessions.get(token) ?? null;
}

async function getProviderId(userId: number): Promise<number | undefined> {
  const [p] = await db.select({ id: providersTable.id }).from(providersTable).where(eq(providersTable.userId, userId));
  return p?.id;
}

/** Load provider id from DB and persist on the in-memory session (fixes tickets/stats when cookie session predates provider row). */
export async function ensureSessionProviderId(token: string): Promise<number | undefined> {
  const session = sessions.get(token);
  if (!session) return undefined;
  if (session.providerId != null) return session.providerId;
  const [row] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, session.userId));
  if (row?.role !== "provider") return undefined;
  const pid = await getProviderId(session.userId);
  if (pid != null) {
    session.providerId = pid;
    session.role = "provider";
  }
  return pid;
}

router.post("/auth/register", async (req, res) => {
  try {
    const { name, email, phone, password, role = "user", regionId, cityId } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ success: false, error: "الاسم والبريد الإلكتروني وكلمة المرور مطلوبة" });

    if (password.length < 6)
      return res.status(400).json({ success: false, error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });

    const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing.length > 0)
      return res.status(409).json({ success: false, error: "البريد الإلكتروني مسجل مسبقاً" });

    const passwordHash = await bcrypt.hash(password, 10);
    const rid = parseInt(String(regionId ?? ""), 10);
    const cid = parseInt(String(cityId ?? ""), 10);
    const regionIdVal = Number.isFinite(rid) && rid > 0 ? rid : null;
    const cityIdVal = Number.isFinite(cid) && cid > 0 ? cid : null;
    const [user] = await db
      .insert(usersTable)
      .values({
        name,
        email,
        phone,
        passwordHash,
        role,
        regionId: regionIdVal,
        cityId: cityIdVal,
      })
      .returning({ id: usersTable.id, name: usersTable.name, email: usersTable.email, role: usersTable.role, avatar: usersTable.avatar });

    let providerId: number | undefined;
    if (role === "provider") {
      const [prov] = await db.insert(providersTable).values({ userId: user.id }).returning({ id: providersTable.id });
      if (!prov?.id) {
        await db.delete(usersTable).where(eq(usersTable.id, user.id));
        return res.status(500).json({ success: false, error: "تعذر إنشاء ملف مقدم الخدمة، حاول مرة أخرى" });
      }
      providerId = prov.id;
    }

    const token = createSession(user.id, user.role, providerId);
    res.cookie("session", token, { httpOnly: true, sameSite: "lax" });

    // Send admin notification for new registration
    const roleLabel = role === "provider" ? "مقدم خدمة" : "مستخدم عادي";
    db.insert(notificationsTable).values({
      userId: null as any,
      type: "info",
      title: `تسجيل جديد: ${name}`,
      message: `نوع الحساب: ${roleLabel} — ${new Date().toLocaleString("ar-SA")}`,
      link: "/admin/users",
    }).catch(() => {});

    res.json({ success: true, data: { ...user, providerId }, token });
  } catch (err: any) {
    const isUniqueViolation =
      err?.code === "23505" ||
      err?.cause?.code === "23505" ||
      String(err?.message ?? "").includes("23505");
    if (isUniqueViolation) {
      return res.status(409).json({ success: false, error: "البريد الإلكتروني مسجل مسبقاً" });
    }
    res.status(500).json({ success: false, error: "فشل إنشاء الحساب" });
  }
});

router.post("/auth/login", async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, error: "البريد الإلكتروني وكلمة المرور مطلوبان" });

    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user) return res.status(401).json({ success: false, error: "بيانات الدخول غير صحيحة" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ success: false, error: "بيانات الدخول غير صحيحة" });

    const providerId = user.role === "provider" ? await getProviderId(user.id) : undefined;
    const token = createSession(user.id, user.role, providerId);
    res.cookie("session", token, { httpOnly: true, sameSite: "lax" });
    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        avatar: user.avatar,
        regionId: user.regionId,
        cityId: user.cityId,
        providerId,
      },
      token,
    });
  } catch {
    res.status(500).json({ success: false, error: "فشل تسجيل الدخول" });
  }
});

/** Logged-in user (role user) starts provider onboarding: create provider row, set role provider, refresh session. Idempotent for existing providers. */
router.post("/auth/become-provider", async (req: Request, res) => {
  const token =
    (req.cookies as Record<string, string> | undefined)?.session ??
    (req.headers.authorization as string | undefined)?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ success: false, error: "يجب تسجيل الدخول أولاً" });
  const session = sessions.get(token);
  if (!session) return res.status(401).json({ success: false, error: "انتهت الجلسة" });
  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, session.userId));
    if (!user) return res.status(401).json({ success: false, error: "المستخدم غير موجود" });
    if (user.role === "admin") return res.status(403).json({ success: false, error: "غير مسموح" });

    let providerId = await getProviderId(user.id);

    if (user.role === "provider") {
      if (!providerId) {
        const [prov] = await db.insert(providersTable).values({ userId: user.id }).returning({ id: providersTable.id });
        providerId = prov!.id;
      }
    } else if (user.role === "user") {
      if (!providerId) {
        const [prov] = await db.insert(providersTable).values({ userId: user.id }).returning({ id: providersTable.id });
        providerId = prov!.id;
      }
      await db.update(usersTable).set({ role: "provider" }).where(eq(usersTable.id, user.id));
    } else {
      return res.status(400).json({ success: false, error: "نوع الحساب غير مدعوم" });
    }

    if (!providerId) {
      return res.status(500).json({ success: false, error: "تعذر إنشاء ملف مقدم الخدمة" });
    }

    session.role = "provider";
    session.providerId = providerId;

    const [updatedUser] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        phone: usersTable.phone,
        role: usersTable.role,
        avatar: usersTable.avatar,
      })
      .from(usersTable)
      .where(eq(usersTable.id, session.userId));

    if (!updatedUser) {
      return res.status(500).json({ success: false, error: "فشل تحميل بيانات المستخدم" });
    }

    let providerApproved: boolean | undefined;
    if (providerId) {
      const [prov] = await db.select({ approved: providersTable.approved }).from(providersTable).where(eq(providersTable.id, providerId));
      providerApproved = prov?.approved ?? false;
    }

    res.json({ success: true, data: { ...updatedUser, providerId, providerApproved } });
  } catch (e) {
    console.error(e);
    res.status(500).json({ success: false, error: "فشل تجهيز حساب مقدم الخدمة" });
  }
});

router.post("/auth/logout", (req, res) => {
  const token = req.cookies?.session;
  if (token) sessions.delete(token);
  res.clearCookie("session");
  res.json({ success: true });
});

router.get("/auth/me", async (req: Request, res) => {
  const token = req.cookies?.session ?? req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ success: false, error: "يجب تسجيل الدخول أولاً" });
  let session = sessions.get(token);
  if (!session) return res.status(401).json({ success: false, error: "انتهت الجلسة أو غير صالحة" });
  try {
    await ensureSessionProviderId(token);
    session = sessions.get(token)!;

    const [user] = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        email: usersTable.email,
        phone: usersTable.phone,
        role: usersTable.role,
        avatar: usersTable.avatar,
        regionId: usersTable.regionId,
        cityId: usersTable.cityId,
      })
      .from(usersTable)
      .where(eq(usersTable.id, session.userId));
    if (!user) return res.status(401).json({ success: false, error: "المستخدم غير موجود" });

    let providerId = session.providerId ?? (user.role === "provider" ? await getProviderId(user.id) : undefined);
    if (providerId != null && session.providerId == null) {
      session.providerId = providerId;
    }

    let providerApproved: boolean | undefined;
    if (providerId) {
      const [prov] = await db.select({ approved: providersTable.approved }).from(providersTable).where(eq(providersTable.id, providerId));
      providerApproved = prov?.approved ?? false;
    }

    res.json({ success: true, data: { ...user, providerId, providerApproved } });
  } catch {
    res.status(500).json({ success: false, error: "تعذر تحميل بيانات الحساب" });
  }
});

// Forgot password — generates reset token (in production, email would be sent)
router.post("/auth/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: "البريد الإلكتروني مطلوب" });

    const [user] = await db.select({ id: usersTable.id, email: usersTable.email }).from(usersTable).where(eq(usersTable.email, email));
    if (!user) {
      // Don't reveal whether the email exists
      return res.json({ success: true, message: "إذا كان البريد مسجلاً، ستصل رسالة إعادة التعيين قريباً" });
    }

    // Invalidate any old tokens for this user
    for (const [tok, data] of resetTokens) {
      if (data.userId === user.id) resetTokens.delete(tok);
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    resetTokens.set(resetToken, {
      userId: user.id,
      email: user.email,
      expiresAt: Date.now() + 1000 * 60 * 30, // 30 minutes
    });

    // In production: send email with link containing resetToken
    // For dev: return token in response so it can be used directly
    res.json({
      success: true,
      message: "تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني",
      // Dev-only field — remove in production:
      dev_reset_token: process.env.NODE_ENV === "development" ? resetToken : undefined,
    });
  } catch {
    res.status(500).json({ success: false, error: "فشلت عملية إعادة التعيين" });
  }
});

// Reset password using token
router.post("/auth/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ success: false, error: "الرمز وكلمة المرور الجديدة مطلوبان" });
    if (newPassword.length < 6) return res.status(400).json({ success: false, error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });

    const data = resetTokens.get(token);
    if (!data) return res.status(400).json({ success: false, error: "رمز إعادة التعيين غير صالح" });
    if (Date.now() > data.expiresAt) {
      resetTokens.delete(token);
      return res.status(400).json({ success: false, error: "انتهت صلاحية رمز إعادة التعيين" });
    }

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, data.userId));
    resetTokens.delete(token);

    // Invalidate all existing sessions for this user
    for (const [tok, session] of sessions) {
      if (session.userId === data.userId) sessions.delete(tok);
    }

    res.json({ success: true, message: "تم تغيير كلمة المرور بنجاح" });
  } catch {
    res.status(500).json({ success: false, error: "فشل تغيير كلمة المرور" });
  }
});

// Change password for logged-in user
router.post("/auth/change-password", async (req: Request, res) => {
  const token = req.cookies?.session ?? req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ success: false, error: "Not authenticated" });
  const session = sessions.get(token);
  if (!session) return res.status(401).json({ success: false, error: "Session expired" });

  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword)
      return res.status(400).json({ success: false, error: "كلمة المرور الحالية والجديدة مطلوبتان" });
    if (newPassword.length < 6)
      return res.status(400).json({ success: false, error: "كلمة المرور الجديدة يجب أن تكون 6 أحرف على الأقل" });

    const [user] = await db
      .select({ id: usersTable.id, passwordHash: usersTable.passwordHash })
      .from(usersTable)
      .where(eq(usersTable.id, session.userId));

    if (!user) return res.status(404).json({ success: false, error: "المستخدم غير موجود" });

    const valid = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!valid) return res.status(400).json({ success: false, error: "كلمة المرور الحالية غير صحيحة" });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, user.id));

    res.json({ success: true, message: "تم تغيير كلمة المرور بنجاح" });
  } catch {
    res.status(500).json({ success: false, error: "فشل تغيير كلمة المرور" });
  }
});

export default router;
