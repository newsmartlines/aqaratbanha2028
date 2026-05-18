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
        host: cfg.smtpHost, port: Number(cfg.smtpPort) || 587,
        secure: cfg.smtpSecure === "true", auth: { user: cfg.smtpUser, pass: cfg.smtpPass },
      } as any);
      await transporter.sendMail({
        from: `"${cfg.smtpFromName || "دليل بلس"}" <${cfg.smtpFromEmail || cfg.smtpUser}>`,
        to: opts.toName ? `"${opts.toName}" <${opts.to}>` : opts.to,
        subject: opts.subject, html: opts.html,
      });
    } catch (err: any) { status = "failed"; error = err?.message ?? "Unknown error"; }
  } else { status = "preview"; }
  await db.insert(emailLogsTable).values({
    templateId: opts.templateId ?? null, templateName: opts.templateName ?? null,
    toEmail: opts.to, toName: opts.toName ?? null,
    subject: opts.subject, status, error, metadata: null,
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
      <tr>
        <td style="background:linear-gradient(135deg,#0d9488 0%,#0f766e 50%,#134e4a 100%);padding:36px 48px;text-align:center;">
          <div style="display:inline-block;background:rgba(255,255,255,0.15);border-radius:14px;padding:10px 20px;margin-bottom:12px;">
            <span style="color:#fff;font-size:22px;font-weight:800;letter-spacing:-0.5px;">✦ {{siteName}}</span>
          </div>
          <p style="margin:0;color:rgba(255,255,255,0.75);font-size:13px;">{{siteUrl}}</p>
        </td>
      </tr>
      <tr><td style="padding:40px 48px;">${content}</td></tr>
      <tr><td style="padding:0 48px;"><div style="height:1px;background:#e2e8f0;"></div></td></tr>
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
    channels: '["email"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","contactEmail","year"]),
    plainBody: "مرحباً {{userName}}! يسعدنا انضمامك إلى {{siteName}}. ابدأ الاستكشاف الآن: {{siteUrl}}",
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
    channels: '["email"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","resetLink","contactEmail","year"]),
    plainBody: "مرحباً {{userName}}، انقر على الرابط التالي لإعادة تعيين كلمة المرور (صالح 30 دقيقة): {{resetLink}}",
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
      <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;line-height:1.7;">أو انسخ هذا الرابط:<br/><span style="color:#0d9488;word-break:break-all;">{{resetLink}}</span></p>
    `),
  },
  {
    name: "تأكيد الطلب",
    slug: "order-confirmation",
    subject: "تم استلام طلبك رقم #{{orderNumber}} ✅",
    category: "order",
    channels: '["email","sms"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","orderNumber","serviceName","providerName","orderDate","amount","contactEmail","year"]),
    plainBody: "مرحباً {{userName}}، تم تأكيد طلبك #{{orderNumber}} للخدمة: {{serviceName}}. تابع طلبك: {{siteUrl}}/user/requests",
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
            <tr><td style="padding:8px 0;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0;">رقم الطلب</td><td style="padding:8px 0;color:#0f172a;font-weight:600;text-align:left;border-bottom:1px solid #e2e8f0;">#{{orderNumber}}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0;">الخدمة</td><td style="padding:8px 0;color:#0f172a;font-weight:600;text-align:left;border-bottom:1px solid #e2e8f0;">{{serviceName}}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0;">مقدم الخدمة</td><td style="padding:8px 0;color:#0f172a;font-weight:600;text-align:left;border-bottom:1px solid #e2e8f0;">{{providerName}}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:14px;border-bottom:1px solid #e2e8f0;">التاريخ</td><td style="padding:8px 0;color:#0f172a;font-weight:600;text-align:left;border-bottom:1px solid #e2e8f0;">{{orderDate}}</td></tr>
            <tr><td style="padding:8px 0;color:#64748b;font-size:14px;">المبلغ</td><td style="padding:8px 0;color:#0d9488;font-weight:700;font-size:16px;text-align:left;">{{amount}} ج.م</td></tr>
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
    channels: '["email","whatsapp"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","planName","startDate","endDate","price","contactEmail","year"]),
    plainBody: "مبروك {{userName}}! تم تفعيل باقة {{planName}} حتى {{endDate}}. أدر لوحتك: {{siteUrl}}/dashboard",
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#ede9fe;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">🌟</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">تم تفعيل اشتراكك!</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">أهلاً <strong>{{userName}}</strong>، يسعدنا إخبارك بأن اشتراكك قد تم تفعيله.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#f0fdf9,#dcfce7);border-radius:14px;border:1px solid #bbf7d0;margin-bottom:24px;">
        <tr><td style="padding:24px 28px;text-align:center;">
          <p style="margin:0 0 6px;color:#166534;font-size:22px;font-weight:800;">{{planName}}</p>
          <p style="margin:0 0 16px;color:#16a34a;font-size:28px;font-weight:900;">{{price}} ج.م</p>
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
    channels: '["email","in_app"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","notificationTitle","notificationBody","actionLink","actionText","contactEmail","year"]),
    plainBody: "{{notificationTitle}}: {{notificationBody}} — {{actionLink}}",
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
  {
    name: "تحقق من البريد الإلكتروني",
    slug: "email-verification",
    subject: "تحقق من بريدك الإلكتروني — {{siteName}}",
    category: "auth",
    channels: '["email"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","verificationLink","contactEmail","year"]),
    plainBody: "مرحباً {{userName}}، تحقق من بريدك الإلكتروني عبر الرابط: {{verificationLink}}",
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#dbeafe;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">📧</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">تحقق من بريدك الإلكتروني</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">مرحباً <strong>{{userName}}</strong>، انقر على الزر أدناه لتفعيل حسابك في <strong style="color:#0d9488;">{{siteName}}</strong>.</p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 24px;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 40px;text-align:center;">
          <a href="{{verificationLink}}" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">تفعيل الحساب ✓</a>
        </td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;border-radius:12px;margin-bottom:0;">
        <tr><td style="padding:16px 20px;text-align:center;">
          <p style="margin:0;color:#64748b;font-size:12px;">إذا لم تنشئ حساباً على {{siteName}}، فبإمكانك تجاهل هذا البريد بأمان.</p>
        </td></tr>
      </table>
    `),
  },
  {
    name: "تنبيه تسجيل الدخول",
    slug: "login-alert",
    subject: "تم تسجيل الدخول إلى حسابك — {{siteName}}",
    category: "auth",
    channels: '["email","in_app"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","loginTime","loginDevice","loginLocation","contactEmail","year"]),
    plainBody: "تم تسجيل الدخول إلى حسابك في {{siteName}} بتاريخ {{loginTime}}. إذا لم تكن أنت، تواصل معنا فوراً.",
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#dcfce7;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">🔓</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">تم تسجيل الدخول بنجاح</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">مرحباً <strong>{{userName}}</strong>، تم تسجيل الدخول إلى حسابك.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:14px;border:1px solid #e2e8f0;margin-bottom:24px;">
        <tr><td style="padding:24px 28px;">
          <p style="margin:0 0 12px;color:#0f172a;font-weight:700;font-size:14px;">📍 تفاصيل الجلسة</p>
          <table width="100%"><tr><td style="color:#64748b;font-size:13px;padding:6px 0;border-bottom:1px solid #e2e8f0;">الوقت</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:left;border-bottom:1px solid #e2e8f0;">{{loginTime}}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;padding:6px 0;border-bottom:1px solid #e2e8f0;">الجهاز</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:left;border-bottom:1px solid #e2e8f0;">{{loginDevice}}</td></tr>
          <tr><td style="color:#64748b;font-size:13px;padding:6px 0;">الموقع</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:left;">{{loginLocation}}</td></tr></table>
        </td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fef3c7;border-radius:12px;border:1px solid #fde68a;margin-bottom:0;">
        <tr><td style="padding:16px 20px;text-align:center;">
          <p style="margin:0;color:#92400e;font-size:13px;">إذا لم تكن أنت، <a href="{{siteUrl}}" style="color:#d97706;font-weight:700;">تواصل معنا فوراً</a>.</p>
        </td></tr>
      </table>
    `),
  },
  {
    name: "تغيير كلمة المرور",
    slug: "password-changed",
    subject: "تم تغيير كلمة المرور بنجاح — {{siteName}}",
    category: "auth",
    channels: '["email"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","changeTime","contactEmail","year"]),
    plainBody: "مرحباً {{userName}}، تم تغيير كلمة مرور حسابك في {{siteName}} بتاريخ {{changeTime}}. إذا لم تكن أنت، تواصل معنا.",
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#dcfce7;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">✅</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">تم تغيير كلمة المرور</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">مرحباً <strong>{{userName}}</strong>، تم تغيير كلمة مرور حسابك في <strong style="color:#0d9488;">{{siteName}}</strong> بتاريخ <strong>{{changeTime}}</strong>.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fef3c7;border-radius:12px;border:1px solid #fde68a;margin-bottom:24px;">
        <tr><td style="padding:16px 20px;text-align:center;">
          <p style="margin:0;color:#92400e;font-size:13px;">إذا لم تطلب هذا التغيير، <a href="{{contactEmail}}" style="color:#d97706;font-weight:700;">تواصل معنا فوراً</a> لتأمين حسابك.</p>
        </td></tr>
      </table>
    `),
  },
  {
    name: "إضافة خدمة جديدة",
    slug: "listing-submitted",
    subject: "تم استلام خدمتك وهي قيد المراجعة — {{siteName}}",
    category: "listing",
    channels: '["email","in_app"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","serviceName","reviewTime","contactEmail","year"]),
    plainBody: "مرحباً {{userName}}، تم استلام خدمتك \"{{serviceName}}\" وهي الآن قيد مراجعة الفريق. سنتواصل معك قريباً.",
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#dbeafe;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">📋</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">تم استلام خدمتك!</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">أهلاً <strong>{{userName}}</strong>، تم إضافة خدمة <strong style="color:#0d9488;">{{serviceName}}</strong> وهي الآن قيد المراجعة.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eff6ff;border-radius:14px;border:1px solid #bfdbfe;margin-bottom:24px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 10px;color:#1e40af;font-weight:700;font-size:14px;">⏱️ ما يحدث الآن:</p>
          <p style="margin:0 0 6px;color:#3730a3;font-size:13px;">1. يراجع فريقنا الخدمة للتأكد من مطابقتها للمعايير</p>
          <p style="margin:0 0 6px;color:#3730a3;font-size:13px;">2. سيتم إشعارك بنتيجة المراجعة خلال {{reviewTime}}</p>
          <p style="margin:0;color:#3730a3;font-size:13px;">3. بعد القبول ستظهر خدمتك للعملاء مباشرة</p>
        </td></tr>
      </table>
    `),
  },
  {
    name: "قبول الخدمة",
    slug: "listing-approved",
    subject: "🎉 تم قبول خدمتك في {{siteName}}!",
    category: "listing",
    channels: '["email","whatsapp","in_app"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","serviceName","serviceUrl","contactEmail","year"]),
    plainBody: "مبروك {{userName}}! تم قبول خدمتك \"{{serviceName}}\" وهي الآن ظاهرة للعملاء. شاهدها: {{serviceUrl}}",
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#dcfce7;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">🎉</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">تم قبول خدمتك!</h2>
      <p style="margin:0 0 16px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">مبروك <strong>{{userName}}</strong>! خدمتك <strong style="color:#0d9488;">{{serviceName}}</strong> تمت الموافقة عليها وهي الآن متاحة للعملاء.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;border-radius:14px;border:1px solid #bbf7d0;margin-bottom:24px;">
        <tr><td style="padding:20px 24px;text-align:center;">
          <p style="margin:0;color:#166534;font-weight:700;font-size:16px;">✅ الخدمة نشطة الآن</p>
        </td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{serviceUrl}}" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">عرض الخدمة →</a>
        </td></tr>
      </table>
    `),
  },
  {
    name: "رفض الخدمة",
    slug: "listing-rejected",
    subject: "إشعار بشأن خدمتك في {{siteName}}",
    category: "listing",
    channels: '["email","in_app"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","serviceName","rejectReason","contactEmail","year"]),
    plainBody: "مرحباً {{userName}}، للأسف لم يتم قبول خدمة \"{{serviceName}}\" للسبب التالي: {{rejectReason}}. يمكنك تعديلها وإعادة الرفع.",
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#fee2e2;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">📝</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">بشأن خدمتك</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">مرحباً <strong>{{userName}}</strong>، لم نتمكن من قبول خدمة <strong>{{serviceName}}</strong> في الوقت الحالي.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fef2f2;border-radius:14px;border:1px solid #fecaca;margin-bottom:24px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 8px;color:#991b1b;font-weight:700;font-size:14px;">📌 سبب عدم القبول:</p>
          <p style="margin:0;color:#7f1d1d;font-size:14px;line-height:1.7;">{{rejectReason}}</p>
        </td></tr>
      </table>
      <p style="margin:0 0 20px;color:#64748b;font-size:14px;text-align:center;">يمكنك تعديل خدمتك وفق الملاحظات وإعادة الرفع.</p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{siteUrl}}/dashboard/services" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">تعديل الخدمة →</a>
        </td></tr>
      </table>
    `),
  },
  {
    name: "مزود خدمة جديد",
    slug: "admin-new-provider",
    subject: "🔔 مزود خدمة جديد يحتاج مراجعة — {{siteName}}",
    category: "admin",
    channels: '["email","in_app"]',
    variables: JSON.stringify(["siteName","siteUrl","providerName","providerEmail","providerPhone","providerCategory","registrationDate","adminUrl","year"]),
    plainBody: "مزود خدمة جديد: {{providerName}} ({{providerEmail}}) في فئة {{providerCategory}}. راجع الطلب: {{adminUrl}}",
    htmlBody: BASE_HTML(`
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:22px;font-weight:800;">🔔 مزود خدمة جديد</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.7;">تم تسجيل مزود خدمة جديد يحتاج مراجعة وموافقة.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:14px;border:1px solid #e2e8f0;margin-bottom:24px;">
        <tr><td style="padding:24px 28px;">
          <table width="100%">
            <tr><td style="color:#64748b;font-size:13px;padding:7px 0;border-bottom:1px solid #e2e8f0;">الاسم</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:left;border-bottom:1px solid #e2e8f0;">{{providerName}}</td></tr>
            <tr><td style="color:#64748b;font-size:13px;padding:7px 0;border-bottom:1px solid #e2e8f0;">البريد</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:left;border-bottom:1px solid #e2e8f0;">{{providerEmail}}</td></tr>
            <tr><td style="color:#64748b;font-size:13px;padding:7px 0;border-bottom:1px solid #e2e8f0;">الهاتف</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:left;border-bottom:1px solid #e2e8f0;">{{providerPhone}}</td></tr>
            <tr><td style="color:#64748b;font-size:13px;padding:7px 0;border-bottom:1px solid #e2e8f0;">الفئة</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:left;border-bottom:1px solid #e2e8f0;">{{providerCategory}}</td></tr>
            <tr><td style="color:#64748b;font-size:13px;padding:7px 0;">التاريخ</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:left;">{{registrationDate}}</td></tr>
          </table>
        </td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{adminUrl}}" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">مراجعة الطلب →</a>
        </td></tr>
      </table>
    `),
  },
  {
    name: "اشتراك ينتهي قريباً",
    slug: "subscription-expiring",
    subject: "⚠️ اشتراكك ينتهي قريباً — {{siteName}}",
    category: "subscription",
    channels: '["email","whatsapp","in_app"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","planName","endDate","daysLeft","renewUrl","contactEmail","year"]),
    plainBody: "مرحباً {{userName}}، اشتراكك في {{planName}} ينتهي بعد {{daysLeft}} يوم ({{endDate}}). جدد اشتراكك: {{renewUrl}}",
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#fef3c7;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">⚠️</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">اشتراكك ينتهي قريباً</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">مرحباً <strong>{{userName}}</strong>، اشتراكك في <strong style="color:#0d9488;">{{planName}}</strong> سينتهي خلال <strong style="color:#ef4444;">{{daysLeft}} يوم</strong> بتاريخ {{endDate}}.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffbeb;border-radius:14px;border:1px solid #fde68a;margin-bottom:24px;">
        <tr><td style="padding:20px 24px;text-align:center;">
          <p style="margin:0;color:#92400e;font-size:14px;line-height:1.7;">جدد اشتراكك الآن للحفاظ على خدماتك النشطة ومكانتك في القوائم.</p>
        </td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="background:#f59e0b;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{renewUrl}}" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">تجديد الاشتراك الآن →</a>
        </td></tr>
      </table>
    `),
  },
  {
    name: "فشل الدفع",
    slug: "payment-failed",
    subject: "❌ فشل معالجة دفعتك — {{siteName}}",
    category: "payment",
    channels: '["email","in_app"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","amount","failReason","retryUrl","contactEmail","year"]),
    plainBody: "مرحباً {{userName}}، فشلت معالجة دفعتك بمبلغ {{amount}} ج.م. السبب: {{failReason}}. أعد المحاولة: {{retryUrl}}",
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#fee2e2;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">❌</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">فشل معالجة الدفعة</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">مرحباً <strong>{{userName}}</strong>، لم نتمكن من معالجة دفعتك بمبلغ <strong style="color:#ef4444;">{{amount}} ج.م</strong>.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fef2f2;border-radius:14px;border:1px solid #fecaca;margin-bottom:24px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 8px;color:#991b1b;font-weight:700;font-size:14px;">سبب الفشل:</p>
          <p style="margin:0;color:#7f1d1d;font-size:14px;">{{failReason}}</p>
        </td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="background:#ef4444;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{retryUrl}}" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">إعادة المحاولة →</a>
        </td></tr>
      </table>
    `),
  },
  {
    name: "نجاح الدفع",
    slug: "payment-success",
    subject: "✅ تم استلام دفعتك بنجاح — {{siteName}}",
    category: "payment",
    channels: '["email","whatsapp"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","amount","transactionId","paymentDate","contactEmail","year"]),
    plainBody: "مرحباً {{userName}}، تم استلام دفعتك {{amount}} ج.م بنجاح. رقم المعاملة: {{transactionId}}",
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#dcfce7;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">💳</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">تم استلام دفعتك!</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">مرحباً <strong>{{userName}}</strong>، تم استلام دفعتك بنجاح.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;border-radius:14px;border:1px solid #bbf7d0;margin-bottom:24px;">
        <tr><td style="padding:24px 28px;text-align:center;">
          <p style="margin:0 0 4px;color:#166534;font-size:14px;">المبلغ المدفوع</p>
          <p style="margin:0 0 12px;color:#16a34a;font-size:32px;font-weight:900;">{{amount}} ج.م</p>
          <p style="margin:0;color:#166534;font-size:12px;">رقم المعاملة: {{transactionId}} &nbsp;·&nbsp; {{paymentDate}}</p>
        </td></tr>
      </table>
    `),
  },
  {
    name: "رسالة SMS — تحقق",
    slug: "sms-verification",
    subject: "رمز التحقق",
    category: "sms",
    channels: '["sms"]',
    variables: JSON.stringify(["siteName","userName","otpCode","expiryMinutes"]),
    plainBody: "{{siteName}}: رمز التحقق الخاص بك هو {{otpCode}}. صالح لمدة {{expiryMinutes}} دقيقة. لا تشاركه مع أحد.",
    htmlBody: "",
  },
  {
    name: "رسالة SMS — تأكيد طلب",
    slug: "sms-order-confirmed",
    subject: "تأكيد الطلب",
    category: "sms",
    channels: '["sms"]',
    variables: JSON.stringify(["siteName","userName","orderNumber","serviceName","providerName"]),
    plainBody: "{{siteName}}: تم تأكيد طلبك #{{orderNumber}} للخدمة {{serviceName}} مع {{providerName}}. شكراً لك!",
    htmlBody: "",
  },
  {
    name: "واتساب — ترحيب",
    slug: "whatsapp-welcome",
    subject: "رسالة ترحيب واتساب",
    category: "whatsapp",
    channels: '["whatsapp"]',
    variables: JSON.stringify(["siteName","siteUrl","userName"]),
    plainBody: "أهلاً {{userName}}! 👋\n\nمرحباً بك في *{{siteName}}* — منصتك للخدمات المحلية الموثوقة.\n\nاستكشف مئات الخدمات: {{siteUrl}}\n\nنحن هنا لمساعدتك في أي وقت! 🙌",
    htmlBody: "",
  },
  {
    name: "واتساب — تحديث الطلب",
    slug: "whatsapp-order-update",
    subject: "تحديث الطلب واتساب",
    category: "whatsapp",
    channels: '["whatsapp"]',
    variables: JSON.stringify(["siteName","userName","orderNumber","orderStatus","serviceName","providerName"]),
    plainBody: "مرحباً {{userName}} 👋\n\nتحديث طلبك #{{orderNumber}}:\n📦 الخدمة: {{serviceName}}\n👤 مقدم الخدمة: {{providerName}}\n✅ الحالة: *{{orderStatus}}*\n\n{{siteName}}",
    htmlBody: "",
  },
  {
    name: "تنبيه صيانة النظام",
    slug: "system-maintenance",
    subject: "إشعار صيانة مجدولة — {{siteName}}",
    category: "system",
    channels: '["email","in_app"]',
    variables: JSON.stringify(["siteName","siteUrl","maintenanceStart","maintenanceEnd","maintenanceReason","contactEmail","year"]),
    plainBody: "إشعار: سيخضع {{siteName}} لصيانة مجدولة من {{maintenanceStart}} حتى {{maintenanceEnd}}. {{maintenanceReason}}",
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#fef3c7;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">🔧</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">صيانة مجدولة</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">نود إعلامكم بأن <strong style="color:#0d9488;">{{siteName}}</strong> سيخضع لصيانة مجدولة.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:14px;border:1px solid #e2e8f0;margin-bottom:24px;">
        <tr><td style="padding:24px 28px;">
          <table width="100%">
            <tr><td style="color:#64748b;font-size:13px;padding:7px 0;border-bottom:1px solid #e2e8f0;">بداية الصيانة</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:left;border-bottom:1px solid #e2e8f0;">{{maintenanceStart}}</td></tr>
            <tr><td style="color:#64748b;font-size:13px;padding:7px 0;border-bottom:1px solid #e2e8f0;">نهاية الصيانة</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:left;border-bottom:1px solid #e2e8f0;">{{maintenanceEnd}}</td></tr>
            <tr><td style="color:#64748b;font-size:13px;padding:7px 0;">السبب</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:left;">{{maintenanceReason}}</td></tr>
          </table>
        </td></tr>
      </table>
      <p style="margin:0;color:#94a3b8;font-size:13px;text-align:center;">نعتذر عن أي إزعاج. للاستفسار: <a href="mailto:{{contactEmail}}" style="color:#0d9488;">{{contactEmail}}</a></p>
    `),
  },

  // ── PROVIDER FLOWS ──────────────────────────────────────────────────────────

  {
    name: "مرحباً بمزود الخدمة",
    slug: "provider-welcome",
    subject: "مرحباً بك في {{siteName}} كمزود خدمة 🎉",
    category: "welcome",
    channels: '["email","whatsapp"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","providerCategory","contactEmail","year"]),
    plainBody: "مرحباً {{userName}}! يسعدنا انضمامك كمزود خدمة في {{siteName}}. ابدأ بإضافة خدماتك من لوحة التحكم: {{siteUrl}}/dashboard",
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:linear-gradient(135deg,#0d9488,#0f766e);border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">🏆</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:26px;font-weight:800;text-align:center;">أهلاً {{userName}}!</h2>
      <p style="margin:0 0 24px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">نرحب بك كمزود خدمة في <strong style="color:#0d9488;">{{siteName}}</strong>. حسابك قيد المراجعة وسيتم إشعارك بالموافقة قريباً.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf9;border-radius:14px;border:1px solid #ccfbf1;margin-bottom:28px;">
        <tr><td style="padding:24px 28px;">
          <p style="margin:0 0 14px;color:#0f172a;font-weight:700;font-size:15px;">📋 الخطوات القادمة:</p>
          <p style="margin:0 0 8px;color:#475569;font-size:14px;">1️⃣ &nbsp; مراجعة حسابك من قِبَل الفريق (خلال 24 ساعة)</p>
          <p style="margin:0 0 8px;color:#475569;font-size:14px;">2️⃣ &nbsp; استلام إشعار الموافقة</p>
          <p style="margin:0 0 8px;color:#475569;font-size:14px;">3️⃣ &nbsp; إضافة خدماتك من لوحة التحكم</p>
          <p style="margin:0;color:#475569;font-size:14px;">4️⃣ &nbsp; البدء في استقبال الطلبات من العملاء</p>
        </td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{siteUrl}}/dashboard" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">لوحة التحكم →</a>
        </td></tr>
      </table>
    `),
  },
  {
    name: "قبول حساب مزود الخدمة",
    slug: "provider-approved",
    subject: "🎉 تم قبول حسابك كمزود خدمة في {{siteName}}!",
    category: "listing",
    channels: '["email","whatsapp","in_app"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","providerCategory","contactEmail","year"]),
    plainBody: "مبروك {{userName}}! تم قبول حسابك كمزود خدمة في {{siteName}}. ابدأ الآن بإضافة خدماتك: {{siteUrl}}/dashboard/services",
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#dcfce7;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">🎉</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:26px;font-weight:800;text-align:center;">تم قبول حسابك!</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">مبروك <strong>{{userName}}</strong>! تمت الموافقة على حسابك كمزود خدمة في <strong style="color:#0d9488;">{{siteName}}</strong>.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#f0fdf9,#dcfce7);border-radius:14px;border:1px solid #bbf7d0;margin-bottom:24px;">
        <tr><td style="padding:24px 28px;text-align:center;">
          <p style="margin:0 0 6px;color:#166534;font-size:14px;">تخصصك</p>
          <p style="margin:0;color:#0d9488;font-size:20px;font-weight:800;">{{providerCategory}}</p>
        </td></tr>
      </table>
      <p style="margin:0 0 20px;color:#64748b;font-size:14px;text-align:center;line-height:1.7;">حسابك نشط الآن! ابدأ بإضافة خدماتك واستقبال الطلبات من العملاء.</p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{siteUrl}}/dashboard/services" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">أضف أول خدمة لك →</a>
        </td></tr>
      </table>
    `),
  },
  {
    name: "رفض حساب مزود الخدمة",
    slug: "provider-rejected",
    subject: "بشأن طلب تسجيلك في {{siteName}}",
    category: "listing",
    channels: '["email","in_app"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","rejectReason","contactEmail","year"]),
    plainBody: "مرحباً {{userName}}، للأسف لم نتمكن من قبول حسابك في الوقت الحالي. السبب: {{rejectReason}}. للاستفسار: {{contactEmail}}",
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#fee2e2;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">📄</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">بشأن طلب تسجيلك</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">مرحباً <strong>{{userName}}</strong>، شكراً لاهتمامك بالانضمام إلى <strong style="color:#0d9488;">{{siteName}}</strong>.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fef2f2;border-radius:14px;border:1px solid #fecaca;margin-bottom:24px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 8px;color:#991b1b;font-weight:700;font-size:14px;">📌 سبب عدم القبول:</p>
          <p style="margin:0;color:#7f1d1d;font-size:14px;line-height:1.7;">{{rejectReason}}</p>
        </td></tr>
      </table>
      <p style="margin:0 0 20px;color:#64748b;font-size:14px;text-align:center;line-height:1.7;">يمكنك تعديل بياناتك وإعادة التقديم، أو التواصل مع فريق الدعم للمساعدة.</p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="border:2px solid #0d9488;border-radius:12px;padding:12px 32px;text-align:center;">
          <a href="mailto:{{contactEmail}}" style="color:#0d9488;text-decoration:none;font-weight:700;font-size:15px;display:block;">تواصل مع الدعم →</a>
        </td></tr>
      </table>
    `),
  },

  // ── ORDER FLOWS ─────────────────────────────────────────────────────────────

  {
    name: "طلب جديد لمزود الخدمة",
    slug: "provider-new-order",
    subject: "📦 طلب خدمة جديد — {{siteName}}",
    category: "order",
    channels: '["email","whatsapp","in_app"]',
    variables: JSON.stringify(["siteName","siteUrl","providerName","userName","orderNumber","serviceName","orderDate","amount","adminUrl","year"]),
    plainBody: "مرحباً {{providerName}}! تلقيت طلباً جديداً #{{orderNumber}} من {{userName}} للخدمة: {{serviceName}}. اطلع على التفاصيل: {{siteUrl}}/dashboard/orders",
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#dbeafe;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">📦</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">طلب جديد بانتظارك!</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">مرحباً <strong>{{providerName}}</strong>، وصل طلب جديد من العميل <strong>{{userName}}</strong>.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:14px;border:1px solid #e2e8f0;margin-bottom:24px;">
        <tr><td style="padding:24px 28px;">
          <p style="margin:0 0 16px;color:#0f172a;font-weight:700;font-size:15px;">📋 تفاصيل الطلب</p>
          <table width="100%">
            <tr><td style="color:#64748b;font-size:13px;padding:7px 0;border-bottom:1px solid #e2e8f0;">رقم الطلب</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:left;border-bottom:1px solid #e2e8f0;">#{{orderNumber}}</td></tr>
            <tr><td style="color:#64748b;font-size:13px;padding:7px 0;border-bottom:1px solid #e2e8f0;">الخدمة</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:left;border-bottom:1px solid #e2e8f0;">{{serviceName}}</td></tr>
            <tr><td style="color:#64748b;font-size:13px;padding:7px 0;border-bottom:1px solid #e2e8f0;">العميل</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:left;border-bottom:1px solid #e2e8f0;">{{userName}}</td></tr>
            <tr><td style="color:#64748b;font-size:13px;padding:7px 0;border-bottom:1px solid #e2e8f0;">التاريخ</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:left;border-bottom:1px solid #e2e8f0;">{{orderDate}}</td></tr>
            <tr><td style="color:#64748b;font-size:13px;padding:7px 0;">المبلغ</td><td style="color:#0d9488;font-weight:700;font-size:15px;text-align:left;">{{amount}} ج.م</td></tr>
          </table>
        </td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{siteUrl}}/dashboard/orders" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">عرض الطلب →</a>
        </td></tr>
      </table>
    `),
  },
  {
    name: "إتمام الطلب",
    slug: "order-completed",
    subject: "✅ تم إتمام طلبك #{{orderNumber}} — {{siteName}}",
    category: "order",
    channels: '["email","whatsapp","in_app"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","orderNumber","serviceName","providerName","contactEmail","year"]),
    plainBody: "مرحباً {{userName}}، تم إتمام طلبك #{{orderNumber}} للخدمة {{serviceName}}. يسعدنا معرفة رأيك — قيّم مزود الخدمة: {{siteUrl}}/user/requests",
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#dcfce7;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">✅</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">تم إتمام طلبك!</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">مرحباً <strong>{{userName}}</strong>، تم إتمام طلبك #<strong>{{orderNumber}}</strong> للخدمة <strong style="color:#0d9488;">{{serviceName}}</strong> مع <strong>{{providerName}}</strong>.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;border-radius:14px;border:1px solid #bbf7d0;margin-bottom:24px;">
        <tr><td style="padding:20px 24px;text-align:center;">
          <p style="margin:0 0 8px;color:#166534;font-weight:700;font-size:15px;">⭐ شاركنا رأيك!</p>
          <p style="margin:0;color:#166534;font-size:13px;line-height:1.7;">تقييمك يساعد مزودي الخدمة على التطوير ويساعد العملاء الآخرين على الاختيار.</p>
        </td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{siteUrl}}/user/requests" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">تقييم الخدمة ⭐ →</a>
        </td></tr>
      </table>
    `),
  },
  {
    name: "إلغاء الطلب",
    slug: "order-cancelled",
    subject: "إشعار إلغاء الطلب #{{orderNumber}} — {{siteName}}",
    category: "order",
    channels: '["email","in_app"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","orderNumber","serviceName","rejectReason","contactEmail","year"]),
    plainBody: "مرحباً {{userName}}، تم إلغاء طلبك #{{orderNumber}} للخدمة {{serviceName}}. السبب: {{rejectReason}}. للاستفسار: {{contactEmail}}",
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#fee2e2;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">❌</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">تم إلغاء الطلب</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">مرحباً <strong>{{userName}}</strong>، تم إلغاء طلبك #<strong>{{orderNumber}}</strong> للخدمة <strong>{{serviceName}}</strong>.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fef2f2;border-radius:14px;border:1px solid #fecaca;margin-bottom:24px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 8px;color:#991b1b;font-weight:700;font-size:14px;">سبب الإلغاء:</p>
          <p style="margin:0;color:#7f1d1d;font-size:14px;line-height:1.7;">{{rejectReason}}</p>
        </td></tr>
      </table>
      <p style="margin:0 0 20px;color:#64748b;font-size:14px;text-align:center;">يمكنك البحث عن مزود خدمة آخر أو التواصل مع فريق الدعم.</p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{siteUrl}}/search" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">البحث عن خدمة أخرى →</a>
        </td></tr>
      </table>
    `),
  },

  // ── REVIEWS ─────────────────────────────────────────────────────────────────

  {
    name: "تقييم جديد لمزود الخدمة",
    slug: "provider-new-review",
    subject: "⭐ تقييم جديد لخدمتك في {{siteName}}",
    category: "notification",
    channels: '["email","in_app"]',
    variables: JSON.stringify(["siteName","siteUrl","providerName","userName","serviceName","reviewText","rating","contactEmail","year"]),
    plainBody: "مرحباً {{providerName}}! تلقيت تقييماً جديداً من {{userName}} على خدمة {{serviceName}}: {{reviewText}}. اطلع على التقييمات: {{siteUrl}}/dashboard/reviews",
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#fef3c7;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">⭐</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">تقييم جديد!</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">مرحباً <strong>{{providerName}}</strong>، قيّمك العميل <strong>{{userName}}</strong> على خدمة <strong style="color:#0d9488;">{{serviceName}}</strong>.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffbeb;border-radius:14px;border:1px solid #fde68a;margin-bottom:24px;">
        <tr><td style="padding:24px 28px;">
          <p style="margin:0 0 12px;color:#92400e;font-size:24px;text-align:center;">{{rating}} ⭐</p>
          <p style="margin:0;color:#78350f;font-size:14px;line-height:1.8;text-align:center;font-style:italic;">"{{reviewText}}"</p>
        </td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{siteUrl}}/dashboard/reviews" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">الرد على التقييم →</a>
        </td></tr>
      </table>
    `),
  },

  // ── SUBSCRIPTION ────────────────────────────────────────────────────────────

  {
    name: "انتهاء الاشتراك",
    slug: "subscription-expired",
    subject: "انتهى اشتراكك في {{siteName}} — جدد الآن",
    category: "subscription",
    channels: '["email","whatsapp","in_app"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","planName","renewUrl","contactEmail","year"]),
    plainBody: "مرحباً {{userName}}، انتهى اشتراكك في {{planName}}. جدد اشتراكك للحفاظ على خدماتك النشطة: {{renewUrl}}",
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#fee2e2;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">⏰</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">انتهى اشتراكك</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">مرحباً <strong>{{userName}}</strong>، انتهى اشتراكك في <strong style="color:#0d9488;">{{planName}}</strong>. خدماتك أُوقفت مؤقتاً.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fef2f2;border-radius:14px;border:1px solid #fecaca;margin-bottom:24px;">
        <tr><td style="padding:20px 24px;text-align:center;">
          <p style="margin:0;color:#991b1b;font-size:14px;line-height:1.7;">⚠️ لإعادة تفعيل خدماتك وظهورها للعملاء، جدد اشتراكك الآن.</p>
        </td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="background:#ef4444;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{renewUrl}}" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">تجديد الاشتراك الآن →</a>
        </td></tr>
      </table>
    `),
  },
  {
    name: "تجديد الاشتراك",
    slug: "subscription-renewed",
    subject: "تم تجديد اشتراكك في {{siteName}} ✅",
    category: "subscription",
    channels: '["email","whatsapp"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","planName","startDate","endDate","price","contactEmail","year"]),
    plainBody: "مرحباً {{userName}}! تم تجديد اشتراكك في {{planName}} بنجاح حتى {{endDate}}. أدر لوحتك: {{siteUrl}}/dashboard",
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#dcfce7;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">🔄</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">تم تجديد اشتراكك!</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">مرحباً <strong>{{userName}}</strong>، تم تجديد اشتراكك في <strong style="color:#0d9488;">{{planName}}</strong> بنجاح.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:linear-gradient(135deg,#f0fdf9,#dcfce7);border-radius:14px;border:1px solid #bbf7d0;margin-bottom:24px;">
        <tr><td style="padding:24px 28px;text-align:center;">
          <p style="margin:0 0 4px;color:#166534;font-size:14px;">{{planName}}</p>
          <p style="margin:0 0 12px;color:#16a34a;font-size:26px;font-weight:900;">{{price}} ج.م</p>
          <p style="margin:0;color:#166534;font-size:13px;">من {{startDate}} حتى {{endDate}}</p>
        </td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{siteUrl}}/dashboard" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">لوحة التحكم →</a>
        </td></tr>
      </table>
    `),
  },

  // ── PAYMENT / INVOICE ───────────────────────────────────────────────────────

  {
    name: "إيصال الدفع",
    slug: "payment-receipt",
    subject: "إيصال دفع #{{transactionId}} — {{siteName}}",
    category: "payment",
    channels: '["email"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","amount","transactionId","paymentDate","planName","contactEmail","year"]),
    plainBody: "إيصال دفع: {{userName}} دفع {{amount}} ج.م بتاريخ {{paymentDate}}. رقم المعاملة: {{transactionId}}",
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:20px;">
        <p style="margin:0;color:#94a3b8;font-size:12px;letter-spacing:2px;text-transform:uppercase;">إيصال رسمي</p>
        <h2 style="margin:4px 0 0;color:#0f172a;font-size:26px;font-weight:900;">إيصال الدفع</h2>
      </div>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:14px;border:1px solid #e2e8f0;margin-bottom:24px;">
        <tr><td style="padding:24px 28px;">
          <table width="100%">
            <tr><td style="color:#64748b;font-size:13px;padding:8px 0;border-bottom:1px solid #e2e8f0;">رقم المعاملة</td><td style="color:#0f172a;font-weight:700;font-size:13px;text-align:left;border-bottom:1px solid #e2e8f0;">{{transactionId}}</td></tr>
            <tr><td style="color:#64748b;font-size:13px;padding:8px 0;border-bottom:1px solid #e2e8f0;">الاسم</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:left;border-bottom:1px solid #e2e8f0;">{{userName}}</td></tr>
            <tr><td style="color:#64748b;font-size:13px;padding:8px 0;border-bottom:1px solid #e2e8f0;">الباقة</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:left;border-bottom:1px solid #e2e8f0;">{{planName}}</td></tr>
            <tr><td style="color:#64748b;font-size:13px;padding:8px 0;border-bottom:1px solid #e2e8f0;">تاريخ الدفع</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:left;border-bottom:1px solid #e2e8f0;">{{paymentDate}}</td></tr>
            <tr><td style="color:#64748b;font-size:14px;padding:12px 0 0;font-weight:700;">إجمالي المبلغ</td><td style="color:#0d9488;font-weight:900;font-size:20px;text-align:left;padding-top:12px;">{{amount}} ج.م</td></tr>
          </table>
        </td></tr>
      </table>
      <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;line-height:1.7;">للاستفسار أو طلب فاتورة رسمية: <a href="mailto:{{contactEmail}}" style="color:#0d9488;">{{contactEmail}}</a></p>
    `),
  },
  {
    name: "استرداد المبلغ",
    slug: "payment-refund",
    subject: "تم استرداد مبلغك — {{siteName}}",
    category: "payment",
    channels: '["email","in_app"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","amount","transactionId","paymentDate","contactEmail","year"]),
    plainBody: "مرحباً {{userName}}، تم استرداد مبلغ {{amount}} ج.م إلى حسابك. رقم المعاملة: {{transactionId}}. قد يستغرق ذلك 3-5 أيام عمل.",
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#dbeafe;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">💰</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">تم استرداد مبلغك</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">مرحباً <strong>{{userName}}</strong>، تمت معالجة طلب استرداد مبلغك بنجاح.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eff6ff;border-radius:14px;border:1px solid #bfdbfe;margin-bottom:24px;">
        <tr><td style="padding:24px 28px;text-align:center;">
          <p style="margin:0 0 4px;color:#1e40af;font-size:14px;">المبلغ المُسترد</p>
          <p style="margin:0 0 8px;color:#1d4ed8;font-size:28px;font-weight:900;">{{amount}} ج.م</p>
          <p style="margin:0;color:#3730a3;font-size:12px;">رقم المعاملة: {{transactionId}} &nbsp;·&nbsp; {{paymentDate}}</p>
        </td></tr>
      </table>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f1f5f9;border-radius:12px;">
        <tr><td style="padding:16px 20px;text-align:center;">
          <p style="margin:0;color:#64748b;font-size:13px;">قد يستغرق وصول المبلغ إلى حسابك البنكي من 3 إلى 5 أيام عمل.</p>
        </td></tr>
      </table>
    `),
  },

  // ── ACCOUNT ─────────────────────────────────────────────────────────────────

  {
    name: "تعليق الحساب",
    slug: "account-suspended",
    subject: "إشعار بشأن حسابك في {{siteName}}",
    category: "admin",
    channels: '["email","in_app"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","rejectReason","contactEmail","year"]),
    plainBody: "مرحباً {{userName}}، تم تعليق حسابك في {{siteName}} مؤقتاً. السبب: {{rejectReason}}. للاعتراض: {{contactEmail}}",
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#fef3c7;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">⚠️</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">تم تعليق حسابك مؤقتاً</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">مرحباً <strong>{{userName}}</strong>، تم تعليق حسابك في <strong style="color:#0d9488;">{{siteName}}</strong> مؤقتاً.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffbeb;border-radius:14px;border:1px solid #fde68a;margin-bottom:24px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 8px;color:#92400e;font-weight:700;font-size:14px;">السبب:</p>
          <p style="margin:0;color:#78350f;font-size:14px;line-height:1.7;">{{rejectReason}}</p>
        </td></tr>
      </table>
      <p style="margin:0 0 20px;color:#64748b;font-size:14px;text-align:center;">إذا كنت تعتقد أن هذا القرار خاطئ، تواصل مع فريق الدعم.</p>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="border:2px solid #d97706;border-radius:12px;padding:12px 32px;text-align:center;">
          <a href="mailto:{{contactEmail}}" style="color:#d97706;text-decoration:none;font-weight:700;font-size:15px;display:block;">تواصل مع الدعم →</a>
        </td></tr>
      </table>
    `),
  },
  {
    name: "إعادة تفعيل الحساب",
    slug: "account-reactivated",
    subject: "✅ تم إعادة تفعيل حسابك في {{siteName}}",
    category: "admin",
    channels: '["email","in_app"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","contactEmail","year"]),
    plainBody: "مرحباً {{userName}}! تم رفع التعليق عن حسابك في {{siteName}}. يمكنك تسجيل الدخول والاستمرار: {{siteUrl}}",
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#dcfce7;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">✅</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">تم إعادة تفعيل حسابك</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">مرحباً <strong>{{userName}}</strong>، يسعدنا إخبارك بأنه تم رفع التعليق عن حسابك في <strong style="color:#0d9488;">{{siteName}}</strong>.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;border-radius:14px;border:1px solid #bbf7d0;margin-bottom:24px;">
        <tr><td style="padding:20px 24px;text-align:center;">
          <p style="margin:0;color:#166534;font-size:14px;line-height:1.7;">حسابك نشط الآن ويمكنك الاستمرار في استخدام جميع الخدمات.</p>
        </td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{siteUrl}}" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">تسجيل الدخول →</a>
        </td></tr>
      </table>
    `),
  },

  // ── SUPPORT ─────────────────────────────────────────────────────────────────

  {
    name: "استلام رسالة دعم",
    slug: "support-ticket-received",
    subject: "تم استلام رسالتك — {{siteName}}",
    category: "system",
    channels: '["email","in_app"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","orderNumber","notificationBody","contactEmail","year"]),
    plainBody: "مرحباً {{userName}}، تم استلام رسالتك #{{orderNumber}} وسيرد عليك فريق الدعم خلال 24 ساعة.",
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#dbeafe;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">📨</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">تم استلام رسالتك!</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">مرحباً <strong>{{userName}}</strong>، تلقينا رسالتك رقم #<strong>{{orderNumber}}</strong>.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eff6ff;border-radius:14px;border:1px solid #bfdbfe;margin-bottom:24px;">
        <tr><td style="padding:20px 24px;">
          <p style="margin:0 0 8px;color:#1e40af;font-weight:700;font-size:14px;">موضوع رسالتك:</p>
          <p style="margin:0;color:#1e3a8a;font-size:14px;line-height:1.7;">{{notificationBody}}</p>
        </td></tr>
      </table>
      <p style="margin:0;color:#94a3b8;font-size:13px;text-align:center;line-height:1.7;">سيرد عليك فريق الدعم خلال <strong>24 ساعة عمل</strong>.<br/>للاستفسار العاجل: <a href="mailto:{{contactEmail}}" style="color:#0d9488;">{{contactEmail}}</a></p>
    `),
  },
  {
    name: "رد على رسالة الدعم",
    slug: "support-ticket-reply",
    subject: "رد من فريق الدعم — {{siteName}}",
    category: "system",
    channels: '["email","in_app"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","orderNumber","notificationBody","actionLink","contactEmail","year"]),
    plainBody: "مرحباً {{userName}}، رد فريق الدعم على رسالتك #{{orderNumber}}: {{notificationBody}}. شاهد التفاصيل: {{actionLink}}",
    htmlBody: BASE_HTML(`
      <div style="text-align:center;margin-bottom:28px;">
        <div style="display:inline-block;background:#dcfce7;border-radius:50%;width:72px;height:72px;line-height:72px;font-size:32px;text-align:center;">💬</div>
      </div>
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:24px;font-weight:800;text-align:center;">رد من فريق الدعم</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:15px;line-height:1.7;text-align:center;">مرحباً <strong>{{userName}}</strong>، ردّ فريق الدعم على رسالتك رقم #<strong>{{orderNumber}}</strong>.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;border-radius:14px;border:1px solid #bbf7d0;margin-bottom:24px;">
        <tr><td style="padding:24px 28px;">
          <p style="margin:0 0 8px;color:#166534;font-weight:700;font-size:14px;">رد فريق الدعم:</p>
          <p style="margin:0;color:#14532d;font-size:14px;line-height:1.8;">{{notificationBody}}</p>
        </td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{actionLink}}" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">عرض المحادثة →</a>
        </td></tr>
      </table>
    `),
  },

  // ── ADMIN NOTIFICATIONS ─────────────────────────────────────────────────────

  {
    name: "مستخدم جديد (للأدمن)",
    slug: "admin-new-user",
    subject: "👤 مستخدم جديد تسجّل في {{siteName}}",
    category: "admin",
    channels: '["email","in_app"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","userEmail","providerPhone","registrationDate","adminUrl","year"]),
    plainBody: "مستخدم جديد: {{userName}} ({{userEmail}}) سجّل في {{registrationDate}}. راجع: {{adminUrl}}",
    htmlBody: BASE_HTML(`
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:22px;font-weight:800;">👤 مستخدم جديد</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:14px;line-height:1.7;">تم تسجيل مستخدم جديد على المنصة.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:14px;border:1px solid #e2e8f0;margin-bottom:24px;">
        <tr><td style="padding:24px 28px;">
          <table width="100%">
            <tr><td style="color:#64748b;font-size:13px;padding:7px 0;border-bottom:1px solid #e2e8f0;">الاسم</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:left;border-bottom:1px solid #e2e8f0;">{{userName}}</td></tr>
            <tr><td style="color:#64748b;font-size:13px;padding:7px 0;border-bottom:1px solid #e2e8f0;">البريد</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:left;border-bottom:1px solid #e2e8f0;">{{userEmail}}</td></tr>
            <tr><td style="color:#64748b;font-size:13px;padding:7px 0;border-bottom:1px solid #e2e8f0;">الهاتف</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:left;border-bottom:1px solid #e2e8f0;">{{providerPhone}}</td></tr>
            <tr><td style="color:#64748b;font-size:13px;padding:7px 0;">تاريخ التسجيل</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:left;">{{registrationDate}}</td></tr>
          </table>
        </td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{adminUrl}}" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">لوحة الإدارة →</a>
        </td></tr>
      </table>
    `),
  },
  {
    name: "طلب جديد (للأدمن)",
    slug: "admin-new-order",
    subject: "🛒 طلب خدمة جديد #{{orderNumber}} — {{siteName}}",
    category: "admin",
    channels: '["email","in_app"]',
    variables: JSON.stringify(["siteName","siteUrl","userName","providerName","orderNumber","serviceName","amount","orderDate","adminUrl","year"]),
    plainBody: "طلب جديد #{{orderNumber}}: {{userName}} طلب {{serviceName}} من {{providerName}} بمبلغ {{amount}} ج.م. راجع: {{adminUrl}}",
    htmlBody: BASE_HTML(`
      <h2 style="margin:0 0 8px;color:#0f172a;font-size:22px;font-weight:800;">🛒 طلب خدمة جديد</h2>
      <p style="margin:0 0 20px;color:#64748b;font-size:14px;">تم تسجيل طلب خدمة جديد على المنصة.</p>
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f8fafc;border-radius:14px;border:1px solid #e2e8f0;margin-bottom:24px;">
        <tr><td style="padding:24px 28px;">
          <table width="100%">
            <tr><td style="color:#64748b;font-size:13px;padding:7px 0;border-bottom:1px solid #e2e8f0;">رقم الطلب</td><td style="color:#0f172a;font-weight:700;font-size:13px;text-align:left;border-bottom:1px solid #e2e8f0;">#{{orderNumber}}</td></tr>
            <tr><td style="color:#64748b;font-size:13px;padding:7px 0;border-bottom:1px solid #e2e8f0;">العميل</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:left;border-bottom:1px solid #e2e8f0;">{{userName}}</td></tr>
            <tr><td style="color:#64748b;font-size:13px;padding:7px 0;border-bottom:1px solid #e2e8f0;">مقدم الخدمة</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:left;border-bottom:1px solid #e2e8f0;">{{providerName}}</td></tr>
            <tr><td style="color:#64748b;font-size:13px;padding:7px 0;border-bottom:1px solid #e2e8f0;">الخدمة</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:left;border-bottom:1px solid #e2e8f0;">{{serviceName}}</td></tr>
            <tr><td style="color:#64748b;font-size:13px;padding:7px 0;border-bottom:1px solid #e2e8f0;">التاريخ</td><td style="color:#0f172a;font-weight:600;font-size:13px;text-align:left;border-bottom:1px solid #e2e8f0;">{{orderDate}}</td></tr>
            <tr><td style="color:#64748b;font-size:13px;padding:8px 0 0;font-weight:700;">المبلغ</td><td style="color:#0d9488;font-weight:900;font-size:18px;text-align:left;padding-top:8px;">{{amount}} ج.م</td></tr>
          </table>
        </td></tr>
      </table>
      <table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 0;">
        <tr><td style="background:#0d9488;border-radius:12px;padding:14px 36px;text-align:center;">
          <a href="{{adminUrl}}" style="color:#fff;text-decoration:none;font-weight:700;font-size:15px;display:block;">لوحة الإدارة →</a>
        </td></tr>
      </table>
    `),
  },

  // ── SMS TEMPLATES ───────────────────────────────────────────────────────────

  {
    name: "رسالة SMS — تذكير الاشتراك",
    slug: "sms-subscription-reminder",
    subject: "تذكير اشتراك",
    category: "sms",
    channels: '["sms"]',
    variables: JSON.stringify(["siteName","userName","planName","daysLeft","renewUrl"]),
    plainBody: "{{siteName}}: مرحباً {{userName}}، اشتراكك في {{planName}} ينتهي بعد {{daysLeft}} يوم. جدده الآن: {{renewUrl}}",
    htmlBody: "",
  },
  {
    name: "رسالة SMS — تأكيد الدفع",
    slug: "sms-payment-confirmed",
    subject: "تأكيد الدفع",
    category: "sms",
    channels: '["sms"]',
    variables: JSON.stringify(["siteName","userName","amount","transactionId"]),
    plainBody: "{{siteName}}: تم استلام دفعتك {{amount}} ج.م. رقم المعاملة: {{transactionId}}. شكراً!",
    htmlBody: "",
  },
  {
    name: "رسالة SMS — طلب جديد لمزود الخدمة",
    slug: "sms-provider-new-order",
    subject: "طلب خدمة جديد",
    category: "sms",
    channels: '["sms"]',
    variables: JSON.stringify(["siteName","providerName","orderNumber","serviceName","userName"]),
    plainBody: "{{siteName}}: مرحباً {{providerName}}! طلب جديد #{{orderNumber}} — {{serviceName}} من {{userName}}. افتح التطبيق للرد.",
    htmlBody: "",
  },

  // ── WHATSAPP TEMPLATES ──────────────────────────────────────────────────────

  {
    name: "واتساب — تأكيد الطلب",
    slug: "whatsapp-order-confirmed",
    subject: "تأكيد الطلب واتساب",
    category: "whatsapp",
    channels: '["whatsapp"]',
    variables: JSON.stringify(["siteName","userName","orderNumber","serviceName","providerName","amount","siteUrl"]),
    plainBody: "أهلاً {{userName}}! 👋\n\n✅ *تم تأكيد طلبك!*\n\n📋 رقم الطلب: *#{{orderNumber}}*\n🔧 الخدمة: {{serviceName}}\n👤 مقدم الخدمة: {{providerName}}\n💰 المبلغ: *{{amount}} ج.م*\n\nتابع طلبك: {{siteUrl}}/user/requests\n\n{{siteName}} 🌟",
    htmlBody: "",
  },
  {
    name: "واتساب — تذكير الاشتراك",
    slug: "whatsapp-subscription-reminder",
    subject: "تذكير اشتراك واتساب",
    category: "whatsapp",
    channels: '["whatsapp"]',
    variables: JSON.stringify(["siteName","userName","planName","daysLeft","renewUrl"]),
    plainBody: "مرحباً {{userName}} 👋\n\n⚠️ *تنبيه مهم*\n\nاشتراكك في *{{planName}}* ينتهي بعد *{{daysLeft}} يوم* فقط!\n\nجدد الآن للحفاظ على ظهور خدماتك:\n{{renewUrl}}\n\n{{siteName}}",
    htmlBody: "",
  },
  {
    name: "واتساب — إتمام الخدمة",
    slug: "whatsapp-service-completed",
    subject: "إتمام الخدمة واتساب",
    category: "whatsapp",
    channels: '["whatsapp"]',
    variables: JSON.stringify(["siteName","userName","orderNumber","serviceName","providerName","siteUrl"]),
    plainBody: "أهلاً {{userName}}! 🎉\n\n✅ *تم إتمام طلبك بنجاح!*\n\n📋 رقم الطلب: *#{{orderNumber}}*\n🔧 الخدمة: {{serviceName}}\n👤 مقدم الخدمة: {{providerName}}\n\n⭐ يسعدنا معرفة رأيك، قيّم الخدمة:\n{{siteUrl}}/user/requests\n\nشكراً لثقتك بنا! {{siteName}}",
    htmlBody: "",
  },

  // ── PUSH NOTIFICATIONS ──────────────────────────────────────────────────────

  {
    name: "إشعار Push — طلب جديد",
    slug: "push-new-order",
    subject: "طلب جديد",
    category: "notification",
    channels: '["push","in_app"]',
    variables: JSON.stringify(["userName","orderNumber","serviceName"]),
    plainBody: "طلب جديد #{{orderNumber}} — {{serviceName}} من {{userName}}",
    htmlBody: "",
  },
  {
    name: "إشعار Push — تقييم جديد",
    slug: "push-new-review",
    subject: "تقييم جديد",
    category: "notification",
    channels: '["push","in_app"]',
    variables: JSON.stringify(["userName","serviceName","rating"]),
    plainBody: "قيّمك {{userName}} على {{serviceName}} بـ {{rating}} نجوم ⭐",
    htmlBody: "",
  },
  {
    name: "إشعار Push — اشتراك ينتهي",
    slug: "push-subscription-expiring",
    subject: "اشتراكك ينتهي قريباً",
    category: "notification",
    channels: '["push","in_app"]',
    variables: JSON.stringify(["planName","daysLeft"]),
    plainBody: "اشتراكك في {{planName}} ينتهي بعد {{daysLeft}} يوم — جدد الآن! ⚠️",
    htmlBody: "",
  },
];

// ── routes ──────────────────────────────────────────────────────────────────

// GET /api/admin/email/templates
router.get("/admin/email/templates", async (_req, res) => {
  try {
    const templates = await db.select().from(emailTemplatesTable).orderBy(emailTemplatesTable.id);
    res.json({ success: true, data: templates });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// GET /api/admin/email/templates/:id
router.get("/admin/email/templates/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [tpl] = await db.select().from(emailTemplatesTable).where(eq(emailTemplatesTable.id, id));
    if (!tpl) return res.status(404).json({ success: false, error: "Template not found" });
    res.json({ success: true, data: tpl });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/admin/email/templates
router.post("/admin/email/templates", async (req, res) => {
  try {
    const { name, slug, subject, htmlBody, plainBody, category, channels, variables, isActive } = req.body;
    if (!name || !slug || !subject) return res.status(400).json({ success: false, error: "Missing required fields" });
    const [tpl] = await db.insert(emailTemplatesTable).values({
      name, slug, subject,
      htmlBody: htmlBody ?? "",
      plainBody: plainBody ?? "",
      category: category ?? "custom",
      channels: channels ?? '["email"]',
      variables: variables ?? "[]",
      isActive: isActive !== false,
    }).returning();
    res.json({ success: true, data: tpl });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// PUT /api/admin/email/templates/:id
router.put("/admin/email/templates/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { name, slug, subject, htmlBody, plainBody, category, channels, variables, isActive } = req.body;
    const update: Record<string, any> = { updatedAt: new Date() };
    if (name !== undefined) update.name = name;
    if (slug !== undefined) update.slug = slug;
    if (subject !== undefined) update.subject = subject;
    if (htmlBody !== undefined) update.htmlBody = htmlBody;
    if (plainBody !== undefined) update.plainBody = plainBody;
    if (category !== undefined) update.category = category;
    if (channels !== undefined) update.channels = channels;
    if (variables !== undefined) update.variables = variables;
    if (isActive !== undefined) update.isActive = isActive;
    const [tpl] = await db.update(emailTemplatesTable).set(update).where(eq(emailTemplatesTable.id, id)).returning();
    res.json({ success: true, data: tpl });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// DELETE /api/admin/email/templates/:id
router.delete("/admin/email/templates/:id", async (req, res) => {
  try {
    await db.delete(emailTemplatesTable).where(eq(emailTemplatesTable.id, Number(req.params.id)));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/admin/email/templates/:id/duplicate
router.post("/admin/email/templates/:id/duplicate", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [tpl] = await db.select().from(emailTemplatesTable).where(eq(emailTemplatesTable.id, id));
    if (!tpl) return res.status(404).json({ success: false, error: "Template not found" });
    const newSlug = `${tpl.slug}-copy-${Date.now()}`;
    const [newTpl] = await db.insert(emailTemplatesTable).values({
      name: `${tpl.name} (نسخة)`,
      slug: newSlug,
      subject: tpl.subject,
      htmlBody: tpl.htmlBody,
      plainBody: tpl.plainBody ?? "",
      category: tpl.category,
      channels: tpl.channels ?? '["email"]',
      variables: tpl.variables ?? "[]",
      isActive: false,
    }).returning();
    res.json({ success: true, data: newTpl });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/admin/email/templates/:id/restore-default
router.post("/admin/email/templates/:id/restore-default", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [tpl] = await db.select().from(emailTemplatesTable).where(eq(emailTemplatesTable.id, id));
    if (!tpl) return res.status(404).json({ success: false, error: "Template not found" });
    const defaultTpl = DEFAULT_TEMPLATES.find(d => d.slug === tpl.slug);
    if (!defaultTpl) return res.status(404).json({ success: false, error: "No default for this template" });
    const [updated] = await db.update(emailTemplatesTable).set({
      subject: defaultTpl.subject,
      htmlBody: defaultTpl.htmlBody,
      plainBody: defaultTpl.plainBody ?? "",
      variables: defaultTpl.variables,
      channels: defaultTpl.channels ?? '["email"]',
      updatedAt: new Date(),
    }).where(eq(emailTemplatesTable.id, id)).returning();
    res.json({ success: true, data: updated });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// GET /api/admin/email/export
router.get("/admin/email/export", async (_req, res) => {
  try {
    const templates = await db.select().from(emailTemplatesTable).orderBy(emailTemplatesTable.id);
    const exportData = { version: "1.0", exportedAt: new Date().toISOString(), count: templates.length, templates };
    res.setHeader("Content-Type", "application/json");
    res.setHeader("Content-Disposition", `attachment; filename="email-templates-${Date.now()}.json"`);
    res.json(exportData);
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/admin/email/import
router.post("/admin/email/import", async (req, res) => {
  try {
    const { templates } = req.body;
    if (!Array.isArray(templates)) return res.status(400).json({ success: false, error: "Invalid format: templates array required" });
    let added = 0; let updated = 0; const errors: string[] = [];
    for (const tpl of templates) {
      if (!tpl.name || !tpl.slug) { errors.push(`Skipped: missing name/slug`); continue; }
      try {
        const [existing] = await db.select({ id: emailTemplatesTable.id }).from(emailTemplatesTable).where(eq(emailTemplatesTable.slug, tpl.slug));
        if (existing) {
          await db.update(emailTemplatesTable).set({
            name: tpl.name, subject: tpl.subject ?? "", htmlBody: tpl.htmlBody ?? "",
            plainBody: tpl.plainBody ?? "", category: tpl.category ?? "custom",
            channels: tpl.channels ?? '["email"]', variables: tpl.variables ?? "[]",
            updatedAt: new Date(),
          }).where(eq(emailTemplatesTable.id, existing.id));
          updated++;
        } else {
          await db.insert(emailTemplatesTable).values({
            name: tpl.name, slug: tpl.slug, subject: tpl.subject ?? "", htmlBody: tpl.htmlBody ?? "",
            plainBody: tpl.plainBody ?? "", category: tpl.category ?? "custom",
            channels: tpl.channels ?? '["email"]', variables: tpl.variables ?? "[]",
            isActive: tpl.isActive !== false,
          });
          added++;
        }
      } catch (err: any) { errors.push(`${tpl.slug}: ${err.message}`); }
    }
    res.json({ success: true, added, updated, errors });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/admin/email/ai-assist
router.post("/admin/email/ai-assist", async (req, res) => {
  try {
    const { prompt, type, context } = req.body;
    if (!prompt) return res.status(400).json({ success: false, error: "Prompt required" });
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      // Return demo suggestions when no API key
      const demos: Record<string, string> = {
        subject: `اكتشف ${context?.siteName ?? "خدماتنا"} — عروض لا تفوّتها!`,
        body: `مرحباً {{userName}},\n\nيسعدنا تزويدك بأفضل الخدمات المحلية الموثوقة.\n\n✅ جودة عالية\n✅ أسعار منافسة\n✅ خدمة على مدار الساعة\n\nابدأ الآن واستمتع بتجربة فريدة.\n\nفريق {{siteName}}`,
        cta: "اكتشف الآن ←",
        improve: `${prompt}\n\n[تم تحسين النص ليكون أكثر وضوحاً وجاذبية]`,
      };
      return res.json({ success: true, result: demos[type] ?? demos.body, demo: true });
    }
    const systemPrompt = `أنت مساعد ذكي متخصص في كتابة محتوى تسويقي احترافي باللغة العربية لمنصة خدمات. 
الموقع: ${context?.siteName ?? "المنصة"}
النوع المطلوب: ${type === "subject" ? "سطر موضوع بريد إلكتروني" : type === "cta" ? "نص زر CTA" : type === "improve" ? "تحسين النص المقدم" : "نص رسالة"}
اكتب المحتوى باللغة العربية فقط، احترافي وجذاب.`;
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${apiKey}` },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: prompt }],
        max_tokens: 500, temperature: 0.7,
      }),
    });
    if (!response.ok) throw new Error(`OpenAI error: ${response.status}`);
    const data: any = await response.json();
    const result = data.choices?.[0]?.message?.content ?? "";
    res.json({ success: true, result });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
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
    const plain = renderTemplate(tpl.plainBody ?? "", vars);
    res.json({ success: true, data: { html, subject, plain } });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
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
    const result = await sendEmail({ to: toEmail, toName, subject, html, templateId: templateId ? String(templateId) : undefined, templateName });
    res.json({ success: true, data: result });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// GET /api/admin/email/logs
router.get("/admin/email/logs", async (_req, res) => {
  try {
    const logs = await db.select().from(emailLogsTable).orderBy(desc(emailLogsTable.sentAt)).limit(200);
    res.json({ success: true, data: logs });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// DELETE /api/admin/email/logs/:id
router.delete("/admin/email/logs/:id", async (req, res) => {
  try {
    await db.delete(emailLogsTable).where(eq(emailLogsTable.id, Number(req.params.id)));
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// GET /api/admin/email/smtp
router.get("/admin/email/smtp", async (_req, res) => {
  try {
    const keys = ["smtpHost","smtpPort","smtpSecure","smtpUser","smtpFromName","smtpFromEmail"];
    const cfg: Record<string, string> = {};
    await Promise.all(keys.map(async k => { cfg[k] = (await getSetting(k)) ?? ""; }));
    res.json({ success: true, data: cfg });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// PUT /api/admin/email/smtp
router.put("/admin/email/smtp", async (req, res) => {
  try {
    const fields = req.body as Record<string, string>;
    const allowedKeys = ["smtpHost","smtpPort","smtpSecure","smtpUser","smtpPass","smtpFromName","smtpFromEmail"];
    for (const key of allowedKeys) {
      if (fields[key] !== undefined) {
        await db.insert(siteSettingsTable).values({ key, value: fields[key] })
          .onConflictDoUpdate({ target: siteSettingsTable.key, set: { value: fields[key], updatedAt: new Date() } });
      }
    }
    res.json({ success: true });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

// POST /api/admin/email/smtp/test
router.post("/admin/email/smtp/test", async (_req, res) => {
  try {
    const cfg = await getSmtpConfig();
    if (!cfg.smtpHost || !cfg.smtpUser || !cfg.smtpPass) return res.json({ success: false, error: "SMTP not configured" });
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: cfg.smtpHost, port: Number(cfg.smtpPort) || 587,
      secure: cfg.smtpSecure === "true", auth: { user: cfg.smtpUser, pass: cfg.smtpPass },
    } as any);
    await transporter.verify();
    res.json({ success: true, message: "SMTP connection successful" });
  } catch (e: any) { res.json({ success: false, error: e?.message ?? "Connection failed" }); }
});

// POST /api/admin/email/seed
router.post("/admin/email/seed", async (_req, res) => {
  try {
    let added = 0;
    for (const tpl of DEFAULT_TEMPLATES) {
      const [existing] = await db.select({ id: emailTemplatesTable.id }).from(emailTemplatesTable).where(eq(emailTemplatesTable.slug, tpl.slug));
      if (!existing) { await db.insert(emailTemplatesTable).values(tpl); added++; }
    }
    res.json({ success: true, added });
  } catch (e: any) { res.status(500).json({ success: false, error: e.message }); }
});

export default router;
