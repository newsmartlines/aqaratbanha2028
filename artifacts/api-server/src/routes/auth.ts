import { Router, type Request, type Response } from "express";
import { db } from "@workspace/db";
import { usersTable, providersTable, notificationsTable, siteSettingsTable } from "@workspace/db";
import { sessionsTable, resetTokensTable } from "@workspace/db";
import { adminStaffTable } from "@workspace/db/schema";
import { eq, and, gt } from "drizzle-orm";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import rateLimit from "express-rate-limit";
import { getEffectivePermissions } from "../middleware/requirePermission";

const router = Router();

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface SessionData { userId: number; role: string; providerId?: number }

// ── Session helpers (PostgreSQL-backed) ──────────────────────────────────────

async function createSession(userId: number, role: string, providerId?: number): Promise<string> {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessionsTable).values({ token, userId, role, providerId: providerId ?? null, expiresAt });
  return token;
}

export async function getSession(token: string): Promise<SessionData | null> {
  try {
    const [row] = await db
      .select()
      .from(sessionsTable)
      .where(and(eq(sessionsTable.token, token), gt(sessionsTable.expiresAt, new Date())));
    if (!row) return null;
    return { userId: row.userId, role: row.role, providerId: row.providerId ?? undefined };
  } catch {
    return null;
  }
}

async function deleteSession(token: string): Promise<void> {
  try { await db.delete(sessionsTable).where(eq(sessionsTable.token, token)); } catch { /* ignore */ }
}

async function deleteAllUserSessions(userId: number): Promise<void> {
  try { await db.delete(sessionsTable).where(eq(sessionsTable.userId, userId)); } catch { /* ignore */ }
}

async function updateSession(token: string, data: Partial<{ role: string; providerId: number | null }>): Promise<void> {
  try { await db.update(sessionsTable).set(data).where(eq(sessionsTable.token, token)); } catch { /* ignore */ }
}

// ── Reset token helpers (PostgreSQL-backed) ──────────────────────────────────

async function createResetToken(userId: number, email: string): Promise<string> {
  await db.delete(resetTokensTable).where(eq(resetTokensTable.userId, userId)).catch(() => {});
  const token = crypto.randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 min
  await db.insert(resetTokensTable).values({ token, userId, email, expiresAt });
  return token;
}

async function consumeResetToken(token: string): Promise<{ userId: number; email: string } | null> {
  const [row] = await db
    .select()
    .from(resetTokensTable)
    .where(and(eq(resetTokensTable.token, token), gt(resetTokensTable.expiresAt, new Date())));
  if (!row) return null;
  await db.delete(resetTokensTable).where(eq(resetTokensTable.token, token)).catch(() => {});
  return { userId: row.userId, email: row.email };
}

// ── Cookie helper ────────────────────────────────────────────────────────────

function setSessionCookie(res: Response, token: string) {
  res.cookie("session", token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: SESSION_TTL_MS,
  });
}

// ── Rate limiting (production only) ─────────────────────────────────────────

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "محاولات كثيرة، يرجى الانتظار 15 دقيقة والمحاولة مجدداً" },
  skip: () => process.env.NODE_ENV !== "production",
});

const forgotLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: "محاولات كثيرة، يرجى الانتظار ساعة والمحاولة مجدداً" },
  skip: () => process.env.NODE_ENV !== "production",
});

// ── Provider helper ──────────────────────────────────────────────────────────

async function getProviderId(userId: number): Promise<number | undefined> {
  const [p] = await db.select({ id: providersTable.id }).from(providersTable).where(eq(providersTable.userId, userId));
  return p?.id;
}

export async function ensureSessionProviderId(token: string): Promise<number | undefined> {
  const session = await getSession(token);
  if (!session) return undefined;
  if (session.providerId != null) return session.providerId;
  const [row] = await db.select({ role: usersTable.role }).from(usersTable).where(eq(usersTable.id, session.userId));
  if (row?.role !== "provider") return undefined;
  const pid = await getProviderId(session.userId);
  if (pid != null) {
    await updateSession(token, { providerId: pid, role: "provider" });
  }
  return pid;
}

// ── Routes ───────────────────────────────────────────────────────────────────

router.post("/auth/register", authLimiter, async (req, res) => {
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
      .values({ name, email, phone, passwordHash, role, regionId: regionIdVal, cityId: cityIdVal })
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

    const token = await createSession(user.id, user.role, providerId);
    setSessionCookie(res, token);

    const roleLabel = role === "provider" ? "مقدم خدمة" : "مستخدم عادي";
    db.insert(notificationsTable).values({
      userId: null as any,
      type: "info",
      title: `تسجيل جديد: ${name}`,
      message: `نوع الحساب: ${roleLabel} — ${new Date().toLocaleString("ar-EG")}`,
      link: "/admin/users",
    }).catch(() => {});

    res.json({ success: true, data: { ...user, providerId } });
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

router.post("/auth/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ success: false, error: "البريد الإلكتروني وكلمة المرور مطلوبان" });

    let [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

    if (!user) {
      const [staff] = await db.select().from(adminStaffTable).where(eq(adminStaffTable.email, email));
      if (staff && staff.status === "active") {
        const validStaff = await bcrypt.compare(password, staff.passwordHash);
        if (!validStaff) return res.status(401).json({ success: false, error: "بيانات الدخول غير صحيحة" });
        const [existingMirror] = await db.select().from(usersTable).where(eq(usersTable.email, staff.email));
        if (existingMirror) {
          user = existingMirror;
          if (existingMirror.role === "admin") {
            const [demoted] = await db.update(usersTable).set({ role: "moderator" }).where(eq(usersTable.id, existingMirror.id)).returning();
            user = demoted ?? existingMirror;
          }
        } else {
          const [created] = await db.insert(usersTable).values({
            name: staff.name, email: staff.email, phone: null,
            passwordHash: staff.passwordHash, role: "moderator",
          }).returning();
          user = created;
        }
      }
    }

    if (!user) return res.status(401).json({ success: false, error: "بيانات الدخول غير صحيحة" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(401).json({ success: false, error: "بيانات الدخول غير صحيحة" });

    const providerId = user.role === "provider" ? await getProviderId(user.id) : undefined;
    const token = await createSession(user.id, user.role, providerId);
    setSessionCookie(res, token);

    const { permissions, staffRole, isSuperAdmin } = await getEffectivePermissions(user.id);
    res.json({
      success: true,
      data: {
        id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar,
        regionId: user.regionId, cityId: user.cityId, providerId, staffRole, permissions, isSuperAdmin,
      },
    });
  } catch {
    res.status(500).json({ success: false, error: "فشل تسجيل الدخول" });
  }
});

router.post("/auth/become-provider", async (req: Request, res) => {
  const token =
    (req.cookies as Record<string, string> | undefined)?.session ??
    (req.headers.authorization as string | undefined)?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ success: false, error: "يجب تسجيل الدخول أولاً" });
  const session = await getSession(token);
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

    await updateSession(token, { role: "provider", providerId });

    const [updatedUser] = await db
      .select({ id: usersTable.id, name: usersTable.name, email: usersTable.email, phone: usersTable.phone, role: usersTable.role, avatar: usersTable.avatar })
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

router.post("/auth/logout", async (req, res) => {
  const token = req.cookies?.session;
  if (token) await deleteSession(token);
  res.clearCookie("session");
  res.json({ success: true });
});

router.get("/auth/me", async (req: Request, res) => {
  const token = req.cookies?.session ?? req.headers.authorization?.replace(/^Bearer\s+/i, "");
  if (!token) return res.status(401).json({ success: false, error: "يجب تسجيل الدخول أولاً" });
  let session = await getSession(token);
  if (!session) return res.status(401).json({ success: false, error: "انتهت الجلسة أو غير صالحة" });
  try {
    await ensureSessionProviderId(token);
    session = await getSession(token);
    if (!session) return res.status(401).json({ success: false, error: "انتهت الجلسة أو غير صالحة" });

    const [user] = await db
      .select({
        id: usersTable.id, name: usersTable.name, email: usersTable.email, phone: usersTable.phone,
        role: usersTable.role, avatar: usersTable.avatar, regionId: usersTable.regionId, cityId: usersTable.cityId,
      })
      .from(usersTable)
      .where(eq(usersTable.id, session.userId));
    if (!user) return res.status(401).json({ success: false, error: "المستخدم غير موجود" });

    let providerId = session.providerId ?? (user.role === "provider" ? await getProviderId(user.id) : undefined);
    if (providerId != null && session.providerId == null) {
      await updateSession(token, { providerId });
    }

    let providerApproved: boolean | undefined;
    if (providerId) {
      const [prov] = await db.select({ approved: providersTable.approved }).from(providersTable).where(eq(providersTable.id, providerId));
      providerApproved = prov?.approved ?? false;
    }

    const { permissions, staffRole, isSuperAdmin } = await getEffectivePermissions(user.id);
    res.json({
      success: true,
      data: { ...user, providerId, providerApproved, staffRole, permissions, isSuperAdmin },
    });
  } catch {
    res.status(500).json({ success: false, error: "تعذر تحميل بيانات الحساب" });
  }
});

router.post("/auth/forgot-password", forgotLimiter, async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, error: "البريد الإلكتروني مطلوب" });

    const [user] = await db.select({ id: usersTable.id, email: usersTable.email }).from(usersTable).where(eq(usersTable.email, email));
    if (!user) {
      return res.json({ success: true, message: "إذا كان البريد مسجلاً، ستصل رسالة إعادة التعيين قريباً" });
    }

    const resetToken = await createResetToken(user.id, user.email);

    res.json({
      success: true,
      message: "تم إرسال رابط إعادة التعيين إلى بريدك الإلكتروني",
      dev_reset_token: process.env.NODE_ENV !== "production" ? resetToken : undefined,
    });
  } catch {
    res.status(500).json({ success: false, error: "فشلت عملية إعادة التعيين" });
  }
});

router.post("/auth/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    if (!token || !newPassword) return res.status(400).json({ success: false, error: "الرمز وكلمة المرور الجديدة مطلوبان" });
    if (newPassword.length < 6) return res.status(400).json({ success: false, error: "كلمة المرور يجب أن تكون 6 أحرف على الأقل" });

    const data = await consumeResetToken(token);
    if (!data) return res.status(400).json({ success: false, error: "رمز إعادة التعيين غير صالح أو منتهي الصلاحية" });

    const passwordHash = await bcrypt.hash(newPassword, 10);
    await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, data.userId));
    await deleteAllUserSessions(data.userId);

    res.json({ success: true, message: "تم تغيير كلمة المرور بنجاح" });
  } catch {
    res.status(500).json({ success: false, error: "فشل تغيير كلمة المرور" });
  }
});

router.post("/auth/change-password", async (req: Request, res) => {
  const token = req.cookies?.session ?? req.headers.authorization?.replace("Bearer ", "");
  if (!token) return res.status(401).json({ success: false, error: "Not authenticated" });
  const session = await getSession(token);
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

// ── Google OAuth ──────────────────────────────────────────────────────────────

router.post("/auth/google", async (req, res) => {
  const { credential, access_token } = req.body;
  if (!credential && !access_token) return res.status(400).json({ success: false, error: "credential or access_token required" });
  const clientIdFromEnv = process.env.GOOGLE_CLIENT_ID;
  const [settingRow] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, "googleClientId")).limit(1);
  const clientId = settingRow?.value || clientIdFromEnv;
  if (!clientId) return res.status(503).json({ success: false, error: "Google Sign-In not configured" });
  try {
    let email: string, name: string | undefined, picture: string | undefined, googleId: string;
    if (access_token) {
      const resp = await fetch(`https://www.googleapis.com/oauth2/v3/userinfo?access_token=${access_token}`);
      if (!resp.ok) return res.status(400).json({ success: false, error: "Invalid Google access_token" });
      const info = await resp.json() as any;
      if (!info.email) return res.status(400).json({ success: false, error: "Invalid Google credential" });
      email = info.email; name = info.name; picture = info.picture; googleId = info.sub;
    } else {
      const { OAuth2Client } = await import("google-auth-library");
      const client = new OAuth2Client(clientId);
      const ticket = await client.verifyIdToken({ idToken: credential, audience: clientId });
      const payload = ticket.getPayload();
      if (!payload?.email) return res.status(400).json({ success: false, error: "Invalid Google credential" });
      email = payload.email; name = payload.name; picture = payload.picture; googleId = payload.sub!;
    }
    let [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user) {
      const [newUser] = await db.insert(usersTable).values({
        name: name ?? email.split("@")[0],
        email,
        passwordHash: crypto.randomBytes(32).toString("hex"),
        role: "user",
        avatar: picture ?? null,
        googleId,
        authProvider: "google",
      } as any).returning();
      user = newUser;
      db.insert(notificationsTable).values({
        userId: null as any,
        type: "info",
        title: `تسجيل جديد عبر جوجل: ${name ?? email}`,
        message: `حساب جوجل — ${new Date().toLocaleString("ar-EG")}`,
        link: "/admin/users",
      }).catch(() => {});
    } else if (!(user as any).googleId) {
      await db.update(usersTable).set({
        googleId, authProvider: "google",
        avatar: user.avatar ?? (picture ?? null),
      } as any).where(eq(usersTable.id, user.id));
    }
    if (user.status === "suspended") return res.status(403).json({ success: false, error: "الحساب موقوف" });
    const providerId = user.role === "provider" ? await getProviderId(user.id) : undefined;
    const token = await createSession(user.id, user.role, providerId);
    setSessionCookie(res, token);
    const { permissions, staffRole, isSuperAdmin } = await getEffectivePermissions(user.id);
    res.json({
      success: true,
      data: {
        id: user.id, name: user.name, email: user.email, role: user.role, avatar: user.avatar,
        regionId: user.regionId, cityId: user.cityId, providerId, staffRole, permissions, isSuperAdmin,
      },
    });
  } catch (err: any) {
    console.error("[Google Auth]", err.message);
    res.status(400).json({ success: false, error: "فشل التحقق من حساب جوجل" });
  }
});

export default router;
