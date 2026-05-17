import { Router } from "express";
import { db } from "@workspace/db";
import { emailTemplatesTable, emailLogsTable, siteSettingsTable } from "@workspace/db";
import { eq, desc } from "drizzle-orm";

const router = Router();

// ── helpers ────────────────────────────────────────────────────────────────

async function getSetting(key: string): Promise<string | null> {
  const [row] = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key));
  return row?.value ?? null;
}

function renderTemplate(html: string, vars: Record<string, string>): string {
  return html.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

async function getSmtpConfig() {
  const keys = ["smtpHost","smtpPort","smtpSecure","smtpUser","smtpPass","smtpFromName","smtpFromEmail"];
  const rows = await db.select().from(siteSettingsTable).where(
    // fetch all at once
    eq(siteSettingsTable.key, keys[0])
  );
  // fetch individually
  const cfg: Record<string, string> = {};
  await Promise.all(keys.map(async k => { cfg[k] = (await getSetting(k)) ?? ""; }));
  return cfg;
}

async function sendEmail(opts: {
  to: string;
  toName?: string;
  subject: string;
  html: string;
  templateId?: string;
  templateName?: string;
}) {
  const cfg = await getSmtpConfig();
  const configured = !!(cfg.smtpHost && cfg.smtpUser && cfg.smtpPass);

  let status = "sent";
  let error: string | null = null;

  if (configured) {
    try {
      const nodemailer = await import("nodemailer");
      const transporter = nodemailer.default.createTransport({
        host: cfg.smtpHost,
        port: Number(cfg.smtpPort) || 587,
        secure: cfg.smtpSecure === "true",
        auth: { user: cfg.smtpUser, pass: cfg.smtpPass },
      } as any);
      await transporter.sendMail({
        from: `"${cfg.smtpFromName || "دليل بلس"}" <${cfg.smtpFromEmail || cfg.smtpUser}>`,
        to: opts.toName ? `"${opts.toName}" <${opts.to}>` : opts.to,
        subject: opts.subject,
        html: opts.html,
      });
    } catch (err: any) {
      status = "failed";
      error = err?.message ?? "Unknown error";
    }
  } else {
    status = "preview";
  }

  await db.insert(emailLogsTable).values({
    templateId: opts.templateId ?? null,
    templateName: opts.templateName ?? null,
    toEmail: opts.to,
    toName: opts.toName ?? null,
    subject: opts.subject,
    status,
    error,
    metadata: null,
  });

  return { status, configured };
}

// ── default templates ──────────────────────────────────────────────────────

const BASE_HTML = (content: string) => `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<title>{{subject}}</title>
</head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:'Segoe UI',Tahoma,Arial,sans-serif;direction:rtl;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;padding:40px 0;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.10);">
      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#0d9488 0%,#0f766e 50%,#134e4a 100%);padding:36px 48px;text-align:center;">
          <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:14px;padding:10px 20px;margin-bottom:12px;">
            <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">✦ {{siteName}}</span>
          </div>
          <p style="margin:0;color:rgba(255,255,255,0.75);font-size:13px;">{{siteUrl}}</p>
        </td>
      </tr>
      <!-- Body -->
      <tr>
        <td style="padding:40px 48px;">
          ${content}
        </td>
      </tr>
      <!-- Divider -->
      <tr><td style="padding:0 48px;"><div style="height:1px;background:#e2e8f0;"></div></td></tr>
      <!-- Footer -->
      <tr>
        <td style="padding:28px 48px;background:#f8fafc;text-align:center;border-radius:0 0 20px 20px;">
          <p style="margin:0;color:#94a3b8;font-size:12px;line-height:1.8;">
            تم إرسال هذا البريد من <strong style="color:#0d9488;">{{siteName}}</strong><br/>
            {{contactEmail}} &nbsp;·&nbsp; {{siteUrl}}
          </p>
          <p style="margin:12px 0 0;color:#cbd5e1;font-size:11px;">© {{year}} {{siteName}} — جميع الحقوق محفوظة</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;

const DEFAULT_TEMPLATES = [
  {
    name: "مرحباً بك",
    slug: "welcome",
    subject: "مرحباً بك في {{siteName}} 🎉",
    category: "welcome",
    variables: JSON.stringify(["siteName","siteUrl","userName","contactEmail","year"]),
    htmlBody: BASE_HTML(`
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:26px;font-weight:800;">مرحباً {{userName}}! 👋</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.7;">يسعدنا انضمامك إلى <strong style="color:#0d9488;">{{siteName}}</strong> — منصتك الأولى للخدمات المحلية الموثوقة.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf9;border-radius:14px;border:1px solid #ccfbf1;margin-bottom:28px;">
        <tr><td style="padding:24px 28px;">
          <p style="margin:0 0 14px;color:#0f172a;font-weight:700;font-size:15px;">🚀 ما يمكنك فعله الآن:</p>
          <p style="margin:0 0 8px;color:#475569;font-size:14px;">✅ &nbsp; استعرض مئات مقدمي الخدمات</p>
          <p style="margin:0 0 8px;color:#475569;font-size:14px;">✅ &nbsp; احجز خدمة بضغطة واحدة</p>
          <p style="margin:0;color:#475569;font-size:14px;">✅ &nbsp; تابع طلباتك وتقييماتك</p>
        </td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 28px;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{siteUrl}}" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">ابدأ الاستكشاف →</a>
        </td></tr>
      </table>
      <p style="margin:0;color:#94a3b8;font-size:13px;line-height:1.7;text-align:center;">إذا واجهت أي مشكلة، تواصل معنا على <a href="mailto:{{contactEmail}}" style="color:#0d9488;">{{contactEmail}}</a></p>
    `),
  },
  {
    name: "إعادة تعيين كلمة المرور",
    slug: "password-reset",
    subject: "إعادة تعيين كلمة المرور — {{siteName}}",
    category: "reset",
    variables: JSON.stringify(["siteName","siteUrl","userName","resetLink","contactEmail","year"]),
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#fef3c7;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">🔐</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">إعادة تعيين كلمة المرور</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">مرحباً <strong>{{userName}}</strong>، تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بحسابك.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffbeb;border-radius:14px;border:1px solid #fde68a;margin-bottom:28px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0;color:#92400e;font-size:13px;line-height:1.7;">
            ⚠️ &nbsp;هذا الرابط صالح لمدة <strong>30 دقيقة</strong> فقط. إذا لم تطلب إعادة التعيين، تجاهل هذا البريد.
          </p>
        </td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 28px;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{resetLink}}" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">إعادة تعيين كلمة المرور →</a>
        </td></tr>
      </table>
      <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;line-height:1.7;">
        أو انسخ هذا الرابط في متصفحك:<br/>
        <span style="color:#0d9488;word-break:break-all;">{{resetLink}}</span>
      </p>
    `),
  },
  {
    name: "تأكيد الطلب",
    slug: "order-confirmation",
    subject: "تم استلام طلبك رقم #{{orderNumber}} ✅",
    category: "order",
    variables: JSON.stringify(["siteName","siteUrl","userName","orderNumber","serviceName","providerName","orderDate","amount","contactEmail","year"]),
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#dcfce7;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">✅</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">تم استلام طلبك!</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">مرحباً <strong>{{userName}}</strong>، تم تأكيد طلبك بنجاح.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:14px;border:1px solid #e2e8f0;margin-bottom:24px;">
        <tr><td style="padding:24px 28px;">
          <p style="margin:0 0 16px;color:#0f172a;font-weight:700;font-size:15px;">📋 تفاصيل الطلب</p>
          <table width="100%" cellpadding="0" cellspacing="0" border="0">
            <tr><td style="padding:8px 0;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0;">رقم الطلب</td><td style="padding:8px 0;color:#0f172a;font-weight:600;font-size:14px;text-align:left;border-bottom:1px solid #e2e8f0;">#{{orderNumber}}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0;">الخدمة</td><td style="padding:8px 0;color:#0f172a;font-weight:600;font-size:14px;text-align:left;border-bottom:1px solid #e2e8f0;">{{serviceName}}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0;">مقدم الخدمة</td><td style="padding:8px 0;color:#0f172a;font-weight:600;font-size:14px;text-align:left;border-bottom:1px solid #e2e8f0;">{{providerName}}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0;">التاريخ</td><td style="padding:8px 0;color:#0f172a;font-weight:600;font-size:14px;text-align:left;border-bottom:1px solid #e2e8f0;">{{orderDate}}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">المبلغ</td><td style="padding:8px 0;color:#0d9488;font-weight:700;font-size:16px;text-align:left;">{{amount}} ر.س</td></tr>
          </table>
        </td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{siteUrl}}/user/requests" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">تتبع طلبك →</a>
        </td></tr>
      </table>
    `),
  },
  {
    name: "تفعيل الاشتراك",
    slug: "subscription-activated",
    subject: "تم تفعيل اشتراكك في {{siteName}} 🌟",
    category: "subscription",
    variables: JSON.stringify(["siteName","siteUrl","userName","planName","startDate","endDate","price","contactEmail","year"]),
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#ede9fe;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">🌟</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">تم تفعيل اشتراكك!</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">أهلاً <strong>{{userName}}</strong>، يسعدنا إخبارك بأن اشتراكك قد تم تفعيله.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#f0fdf9,#dcfce7);border-radius:14px;border:1px solid #bbf7d0;margin-bottom:24px;">
        <tr><td style="padding:24px 28px;text-align:center;">
          <p style="margin:0 0 6px;color:#166534;font-size:22px;font-weight:800;">{{planName}}</p>
          <p style="margin:0 0 16px;color:#16a34a;font-size:28px;font-weight:900;">{{price}} ر.س</p>
          <p style="margin:0;color:#166534;font-size:13px;">من {{startDate}} حتى {{endDate}}</p>
        </td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{siteUrl}}/dashboard" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">إدارة لوحة التحكم →</a>
        </td></tr>
      </table>
    `),
  },
  {
    name: "إشعار عام",
    slug: "general-notification",
    subject: "{{notificationTitle}} — {{siteName}}",
    category: "notification",
    variables: JSON.stringify(["siteName","siteUrl","userName","notificationTitle","notificationBody","actionLink","actionText","contactEmail","year"]),
    htmlBody: BASE_HTML(`
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;">{{notificationTitle}}</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.8;">{{notificationBody}}</p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{actionLink}}" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">{{actionText}} →</a>
        </td></tr>
      </table>
    `),
  },
];

// ── routes ──────────────────────────────────────────────────────────────────

// GET /api/admin/email/templates
router.get("/admin/email/templates", async (_req, res) => {
  try {
    const templates = await db.select().from(emailTemplatesTable).orderBy(emailTemplatesTable.id);
    res.json({ success: true, data: templates });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/admin/email/templates/:id
router.get("/admin/email/templates/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [tpl] = await db.select().from(emailTemplatesTable).where(eq(emailTemplatesTable.id, id));
    if (!tpl) return res.status(404).json({ success: false, error: "Template not found" });
    res.json({ success: true, data: tpl });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/admin/email/templates
router.post("/admin/email/templates", async (req, res) => {
  try {
    const { name, slug, subject, htmlBody, category, variables, isActive } = req.body;
    if (!name || !slug || !subject || !htmlBody) {
      return res.status(400).json({ success: false, error: "Missing required fields" });
    }
    const [tpl] = await db.insert(emailTemplatesTable).values({
      name, slug, subject, htmlBody,
      category: category ?? "custom",
      variables: variables ?? "[]",
      isActive: isActive !== false,
    }).returning();
    res.json({ success: true, data: tpl });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// PUT /api/admin/email/templates/:id
router.put("/admin/email/templates/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, slug, subject, htmlBody, category, variables, isActive } = req.body;
    const update: Partial<typeof emailTemplatesTable.$inferInsert> = { updatedAt: new Date() };
    if (name !== undefined) update.name = name;
    if (slug !== undefined) update.slug = slug;
    if (subject !== undefined) update.subject = subject;
    if (htmlBody !== undefined) update.htmlBody = htmlBody;
    if (category !== undefined) update.category = category;
    if (variables !== undefined) update.variables = variables;
    if (isActive !== undefined) update.isActive = isActive;
    const [tpl] = await db.update(emailTemplatesTable).set(update).where(eq(emailTemplatesTable.id, id)).returning();
    res.json({ success: true, data: tpl });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/admin/email/templates/:id
router.delete("/admin/email/templates/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    await db.delete(emailTemplatesTable).where(eq(emailTemplatesTable.id, id));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/admin/email/templates/:id/preview
router.post("/admin/email/templates/:id/preview", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [tpl] = await db.select().from(emailTemplatesTable).where(eq(emailTemplatesTable.id, id));
    if (!tpl) return res.status(404).json({ success: false, error: "Template not found" });
    const vars: Record<string, string> = {
      siteName: (await getSetting("siteName")) ?? "دليل بلس",
      siteUrl: (await getSetting("siteUrl")) ?? "https://example.com",
      contactEmail: (await getSetting("contactEmail")) ?? "info@example.com",
      year: new Date().getFullYear().toString(),
      ...(req.body ?? {}),
    };
    const html = renderTemplate(tpl.htmlBody, vars);
    const subject = renderTemplate(tpl.subject, vars);
    res.json({ success: true, data: { html, subject } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/admin/email/send
router.post("/admin/email/send", async (req, res) => {
  try {
    const { templateId, toEmail, toName, extraVars } = req.body;
    if (!toEmail) return res.status(400).json({ success: false, error: "toEmail is required" });

    let subject = req.body.subject ?? "";
    let html = req.body.html ?? "";
    let templateName: string | undefined;

    if (templateId) {
      const [tpl] = await db.select().from(emailTemplatesTable).where(eq(emailTemplatesTable.id, Number(templateId)));
      if (!tpl) return res.status(404).json({ success: false, error: "Template not found" });
      templateName = tpl.name;
      const vars: Record<string, string> = {
        siteName: (await getSetting("siteName")) ?? "دليل بلس",
        siteUrl: (await getSetting("siteUrl")) ?? "https://example.com",
        contactEmail: (await getSetting("contactEmail")) ?? "info@example.com",
        year: new Date().getFullYear().toString(),
        ...(extraVars ?? {}),
      };
      html = renderTemplate(tpl.htmlBody, vars);
      subject = renderTemplate(tpl.subject, vars);
    }

    if (!subject || !html) return res.status(400).json({ success: false, error: "subject and html are required" });

    const result = await sendEmail({
      to: toEmail,
      toName,
      subject,
      html,
      templateId: templateId ? String(templateId) : undefined,
      templateName,
    });

    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/admin/email/logs
router.get("/admin/email/logs", async (_req, res) => {
  try {
    const logs = await db.select().from(emailLogsTable).orderBy(desc(emailLogsTable.sentAt)).limit(200);
    res.json({ success: true, data: logs });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// DELETE /api/admin/email/logs/:id
router.delete("/admin/email/logs/:id", async (req, res) => {
  try {
    await db.delete(emailLogsTable).where(eq(emailLogsTable.id, Number(req.params.id)));
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GET /api/admin/email/smtp
router.get("/admin/email/smtp", async (_req, res) => {
  try {
    const keys = ["smtpHost","smtpPort","smtpSecure","smtpUser","smtpFromName","smtpFromEmail"];
    const cfg: Record<string, string> = {};
    await Promise.all(keys.map(async k => { cfg[k] = (await getSetting(k)) ?? ""; }));
    res.json({ success: true, data: cfg });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// PUT /api/admin/email/smtp
router.put("/admin/email/smtp", async (req, res) => {
  try {
    const fields = req.body as Record<string, string>;
    const allowedKeys = ["smtpHost","smtpPort","smtpSecure","smtpUser","smtpPass","smtpFromName","smtpFromEmail"];
    for (const key of allowedKeys) {
      if (fields[key] !== undefined) {
        await db.insert(siteSettingsTable)
          .values({ key, value: fields[key] })
          .onConflictDoUpdate({ target: siteSettingsTable.key, set: { value: fields[key], updatedAt: new Date() } });
      }
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// POST /api/admin/email/smtp/test
router.post("/admin/email/smtp/test", async (req, res) => {
  try {
    const cfg = await getSmtpConfig();
    if (!cfg.smtpHost || !cfg.smtpUser || !cfg.smtpPass) {
      return res.json({ success: false, error: "SMTP not configured" });
    }
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: cfg.smtpHost,
      port: Number(cfg.smtpPort) || 587,
      secure: cfg.smtpSecure === "true",
      auth: { user: cfg.smtpUser, pass: cfg.smtpPass },
    } as any);
    await transporter.verify();
    res.json({ success: true, message: "SMTP connection successful" });
  } catch (e: any) {
    res.json({ success: false, error: e?.message ?? "Connection failed" });
  }
});

// POST /api/admin/email/seed
router.post("/admin/email/seed", async (_req, res) => {
  try {
    let added = 0;
    for (const tpl of DEFAULT_TEMPLATES) {
      const [existing] = await db.select({ id: emailTemplatesTable.id })
        .from(emailTemplatesTable)
        .where(eq(emailTemplatesTable.slug, tpl.slug));
      if (!existing) {
        await db.insert(emailTemplatesTable).values(tpl);
        added++;
      }
    }
    res.json({ success: true, added });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
