/**
 * mailer.ts — Standalone email sender for عقارات بنها
 * Professional Arabic HTML emails, RTL, luxury design.
 * Uses SMTP settings from site_settings table.
 * Fire-and-forget: always resolves, never throws.
 */

import { db } from "@workspace/db";
import { siteSettingsTable, emailLogsTable, emailTemplatesTable } from "@workspace/db";
import { eq } from "drizzle-orm";

// ─── SMTP Config ──────────────────────────────────────────────────────────────

async function getSetting(key: string): Promise<string> {
  try {
    const [row] = await db.select({ value: siteSettingsTable.value })
      .from(siteSettingsTable).where(eq(siteSettingsTable.key, key));
    return row?.value ?? "";
  } catch { return ""; }
}

async function getSmtpConfig() {
  const keys = ["smtpHost","smtpPort","smtpSecure","smtpUser","smtpPass","smtpFromName","smtpFromEmail","siteName","siteUrl","contactEmail"];
  const cfg: Record<string, string> = {};
  await Promise.all(keys.map(async k => { cfg[k] = await getSetting(k); }));
  return cfg;
}

// ─── Base HTML wrapper ────────────────────────────────────────────────────────

function baseHtml(content: string, cfg: Record<string, string>): string {
  const siteName  = cfg.siteName  || "عقارات بنها";
  const siteUrl   = cfg.siteUrl   || "#";
  const contactEmail = cfg.contactEmail || "";
  const year      = new Date().getFullYear();

  return `<!DOCTYPE html>
<html dir="rtl" lang="ar">
<head>
<meta charset="UTF-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1.0"/>
<meta http-equiv="X-UA-Compatible" content="IE=edge"/>
<title>${siteName}</title>
</head>
<body style="margin:0;padding:0;background:#f0f4f8;font-family:'Segoe UI',Tahoma,Geneva,Arial,sans-serif;direction:rtl;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0f4f8;padding:32px 12px;">
  <tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:24px;overflow:hidden;box-shadow:0 12px 48px rgba(0,0,0,0.12);">

      <!-- Header -->
      <tr>
        <td style="background:linear-gradient(135deg,#0d9488 0%,#0f766e 55%,#134e4a 100%);padding:40px 48px 36px;text-align:center;">
          <div style="display:inline-block;background:rgba(255,255,255,0.18);border-radius:16px;padding:12px 28px;margin-bottom:14px;">
            <span style="color:#ffffff;font-size:24px;font-weight:900;letter-spacing:-0.5px;">🏠 ${siteName}</span>
          </div>
          <p style="margin:0;color:rgba(255,255,255,0.7);font-size:13px;letter-spacing:0.3px;">${siteUrl}</p>
        </td>
      </tr>

      <!-- Content -->
      <tr><td style="padding:44px 48px;">${content}</td></tr>

      <!-- Divider -->
      <tr><td style="padding:0 48px;"><div style="height:1px;background:#e2e8f0;"></div></td></tr>

      <!-- Footer -->
      <tr>
        <td style="padding:28px 48px 36px;background:#f8fafc;text-align:center;">
          <p style="margin:0 0 6px;color:#94a3b8;font-size:12px;line-height:1.8;">
            تم إرسال هذا البريد من <strong style="color:#0d9488;">${siteName}</strong>
          </p>
          ${contactEmail ? `<p style="margin:0 0 6px;color:#94a3b8;font-size:12px;">${contactEmail}</p>` : ""}
          <p style="margin:0;color:#cbd5e1;font-size:11px;">© ${year} ${siteName} — جميع الحقوق محفوظة</p>
        </td>
      </tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

// ─── Heading block ────────────────────────────────────────────────────────────

function heading(emoji: string, title: string, sub: string) {
  return `
    <h2 style="margin:0 0 6px;color:#0f172a;font-size:26px;font-weight:800;line-height:1.3;">${emoji} ${title}</h2>
    <p style="margin:0 0 28px;color:#64748b;font-size:15px;line-height:1.7;">${sub}</p>`;
}

function infoBox(rows: { label: string; value: string }[]) {
  const items = rows.map(r => `
    <tr>
      <td style="padding:10px 16px;color:#64748b;font-size:13px;border-bottom:1px solid #f1f5f9;font-weight:600;width:35%;">${r.label}</td>
      <td style="padding:10px 16px;color:#0f172a;font-size:13px;border-bottom:1px solid #f1f5f9;">${r.value}</td>
    </tr>`).join("");
  return `<table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;border-radius:14px;border:1px solid #e2e8f0;margin-bottom:28px;overflow:hidden;">
    ${items}
  </table>`;
}

function ctaButton(text: string, url: string) {
  return `<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto 28px;">
    <tr><td style="background:#0d9488;border-radius:14px;padding:15px 40px;text-align:center;">
      <a href="${url}" style="color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;display:block;white-space:nowrap;">${text}</a>
    </td></tr>
  </table>`;
}

function alertBox(type: "success"|"warning"|"info", text: string) {
  const colors: Record<string, { bg: string; border: string; icon: string }> = {
    success: { bg:"#f0fdf4", border:"#bbf7d0", icon:"✅" },
    warning: { bg:"#fffbeb", border:"#fed7aa", icon:"⚠️" },
    info:    { bg:"#f0f9ff", border:"#bae6fd", icon:"ℹ️" },
  };
  const c = colors[type];
  return `<div style="background:${c.bg};border:1px solid ${c.border};border-radius:12px;padding:16px 20px;margin-bottom:28px;">
    <p style="margin:0;color:#0f172a;font-size:14px;line-height:1.7;">${c.icon} ${text}</p>
  </div>`;
}

// ─── Email Templates ──────────────────────────────────────────────────────────

type EmailEvent =
  | { type: "welcome"; userName: string; siteUrl: string }
  | { type: "forgot-password"; userName: string; resetUrl: string; expiryMinutes: number }
  | { type: "property-submitted"; userName: string; propertyTitle: string; propertyId: number; siteUrl: string }
  | { type: "property-approved"; userName: string; propertyTitle: string; propertyId: number; siteUrl: string }
  | { type: "property-rejected"; userName: string; propertyTitle: string; rejectionReason: string; siteUrl: string }
  | { type: "saved-search-match"; userName: string; propertyTitle: string; propertyId: number; price: string; address: string; siteUrl: string }
  | { type: "new-message"; userName: string; senderName: string; messagePreview: string; siteUrl: string }
  | { type: "package-purchased"; userName: string; packageName: string; expiryDate: string; siteUrl: string };

function buildEmailContent(event: EmailEvent, cfg: Record<string, string>): { subject: string; html: string } {
  const siteUrl = cfg.siteUrl || "#";
  const siteName = cfg.siteName || "عقارات بنها";

  switch (event.type) {

    case "welcome": {
      const html = baseHtml(`
        ${heading("🎉", `مرحباً بك في ${siteName}`, `يسعدنا انضمامك ${event.userName}! حسابك جاهز وبإمكانك البدء فوراً.`)}
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf9;border-radius:14px;border:1px solid #ccfbf1;margin-bottom:28px;">
          <tr><td style="padding:24px 28px;">
            <p style="margin:0 0 14px;color:#0f172a;font-weight:700;font-size:15px;">🚀 ما يمكنك فعله الآن:</p>
            <p style="margin:0 0 10px;color:#475569;font-size:14px;">🏠 &nbsp; استعرض آلاف العقارات المتاحة</p>
            <p style="margin:0 0 10px;color:#475569;font-size:14px;">🔔 &nbsp; احفظ بحثك وستصلك إشعارات العقارات الجديدة</p>
            <p style="margin:0 0 10px;color:#475569;font-size:14px;">📞 &nbsp; تواصل مع المعلنين مباشرة</p>
            <p style="margin:0;color:#475569;font-size:14px;">📋 &nbsp; أضف عقارك وابدأ البيع أو الإيجار</p>
          </td></tr>
        </table>
        ${ctaButton("ابدأ الاستكشاف الآن →", siteUrl)}
        ${alertBox("info", "إذا لم تقم بإنشاء هذا الحساب، يرجى التواصل معنا فوراً.")}
      `, cfg);
      return { subject: `🎉 مرحباً بك في ${siteName}`, html };
    }

    case "forgot-password": {
      const html = baseHtml(`
        ${heading("🔐", "إعادة تعيين كلمة المرور", `مرحباً ${event.userName}، تلقينا طلب إعادة تعيين كلمة مرورك.`)}
        ${alertBox("warning", `هذا الرابط صالح لمدة ${event.expiryMinutes} دقيقة فقط.`)}
        ${ctaButton("إعادة تعيين كلمة المرور 🔐", event.resetUrl)}
        <p style="text-align:center;color:#94a3b8;font-size:13px;margin-top:16px;">إذا لم تطلب إعادة التعيين، تجاهل هذا البريد — كلمة مرورك آمنة.</p>
      `, cfg);
      return { subject: `🔐 إعادة تعيين كلمة المرور — ${siteName}`, html };
    }

    case "property-submitted": {
      const propUrl = `${siteUrl}/property/${event.propertyId}`;
      const html = baseHtml(`
        ${heading("📋", "تم استلام إعلانك بنجاح", `شكراً ${event.userName}! إعلانك قيد المراجعة من فريقنا.`)}
        ${infoBox([
          { label: "العقار", value: event.propertyTitle },
          { label: "الحالة", value: "🔄 قيد المراجعة" },
          { label: "المتوقع", value: "خلال 24 ساعة عمل" },
        ])}
        ${alertBox("info", "سنرسل لك إشعاراً فور مراجعة إعلانك. شكراً لثقتك بنا.")}
        ${ctaButton("متابعة إعلاناتي", `${siteUrl}/user/my-properties`)}
      `, cfg);
      return { subject: `📋 تم استلام إعلانك — ${event.propertyTitle}`, html };
    }

    case "property-approved": {
      const propUrl = `${siteUrl}/property/${event.propertyId}`;
      const html = baseHtml(`
        ${heading("✅", "تمت الموافقة على إعلانك!", `مبروك ${event.userName}! إعلانك الآن ظاهر للجمهور.`)}
        ${infoBox([
          { label: "العقار", value: event.propertyTitle },
          { label: "الحالة", value: "✅ منشور ومرئي للجمهور" },
        ])}
        ${alertBox("success", "إعلانك الآن يظهر في نتائج البحث وعلى الخريطة. يمكن للمهتمين التواصل معك مباشرة.")}
        ${ctaButton("مشاهدة إعلانك 🏠", propUrl)}
        <p style="text-align:center;color:#64748b;font-size:13px;">💡 نصيحة: شارك إعلانك على وسائل التواصل لزيادة الوصول</p>
      `, cfg);
      return { subject: `✅ تمت الموافقة على إعلانك — ${event.propertyTitle}`, html };
    }

    case "property-rejected": {
      const html = baseHtml(`
        ${heading("❌", "بخصوص إعلانك", `مرحباً ${event.userName}، بعد مراجعة إعلانك، لم نتمكن من نشره حالياً.`)}
        ${infoBox([
          { label: "العقار", value: event.propertyTitle },
          { label: "الحالة", value: "❌ مرفوض" },
        ])}
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:12px;padding:20px 24px;margin-bottom:28px;">
          <p style="margin:0 0 8px;color:#0f172a;font-weight:700;font-size:14px;">📋 سبب الرفض:</p>
          <p style="margin:0;color:#475569;font-size:14px;line-height:1.7;">${event.rejectionReason || "لم يتطابق الإعلان مع شروط النشر."}</p>
        </div>
        ${alertBox("info", "يمكنك تعديل بيانات الإعلان ثم إعادة تقديمه. نحن هنا لمساعدتك.")}
        ${ctaButton("تعديل الإعلان وإعادة التقديم", `${siteUrl}/user/my-properties`)}
      `, cfg);
      return { subject: `📋 بخصوص إعلانك — ${event.propertyTitle}`, html };
    }

    case "saved-search-match": {
      const propUrl = `${siteUrl}/property/${event.propertyId}`;
      const html = baseHtml(`
        ${heading("🔔", "عقار جديد يطابق بحثك!", `مرحباً ${event.userName}، وجدنا عقاراً يناسب معايير بحثك المحفوظ.`)}
        ${infoBox([
          { label: "العنوان", value: event.propertyTitle },
          { label: "السعر", value: event.price },
          { label: "الموقع", value: event.address },
        ])}
        ${ctaButton("مشاهدة العقار الآن 🏠", propUrl)}
        <p style="text-align:center;color:#94a3b8;font-size:12px;margin-top:12px;">
          يمكنك إدارة بحثك المحفوظ من <a href="${siteUrl}/dashboard/saved-searches" style="color:#0d9488;">لوحة التحكم</a>
        </p>
      `, cfg);
      return { subject: `🔔 عقار جديد يطابق بحثك — ${event.propertyTitle}`, html };
    }

    case "new-message": {
      const html = baseHtml(`
        ${heading("💬", "رسالة جديدة", `مرحباً ${event.userName}، وصلتك رسالة جديدة من ${event.senderName}.`)}
        <div style="background:#f8fafc;border-radius:12px;border:1px solid #e2e8f0;padding:20px 24px;margin-bottom:28px;">
          <p style="margin:0;color:#475569;font-size:14px;line-height:1.7;font-style:italic;">"${event.messagePreview}"</p>
        </div>
        ${ctaButton("عرض الرسالة والرد 💬", `${siteUrl}/dashboard/inbox`)}
      `, cfg);
      return { subject: `💬 رسالة جديدة من ${event.senderName}`, html };
    }

    case "package-purchased": {
      const html = baseHtml(`
        ${heading("🌟", "تم تفعيل باقتك بنجاح!", `مبروك ${event.userName}! باقتك فعّالة والمزايا متاحة الآن.`)}
        ${infoBox([
          { label: "الباقة", value: event.packageName },
          { label: "تنتهي في", value: event.expiryDate },
          { label: "الحالة", value: "✅ فعّالة" },
        ])}
        ${alertBox("success", "يمكنك الآن إضافة عقارات غير محدودة والاستفادة من جميع مزايا الباقة.")}
        ${ctaButton("إدارة باقتي", `${siteUrl}/dashboard/packages`)}
      `, cfg);
      return { subject: `🌟 تم تفعيل باقة ${event.packageName} — ${siteName}`, html };
    }

    default:
      return { subject: `إشعار من ${siteName}`, html: baseHtml(`<p style="color:#475569;font-size:15px;">لديك إشعار جديد من ${siteName}.</p>`, cfg) };
  }
}

// ─── Core sendMail function ───────────────────────────────────────────────────

async function sendMail(opts: {
  to: string;
  toName?: string;
  event: EmailEvent;
}): Promise<{ sent: boolean; status: string }> {
  try {
    const cfg = await getSmtpConfig();
    const { subject, html } = buildEmailContent(opts.event, cfg);

    let status = "preview";

    // Look for a matching DB template override
    let finalSubject = subject;
    let finalHtml = html;
    try {
      const [tpl] = await db.select()
        .from(emailTemplatesTable)
        .where(eq(emailTemplatesTable.slug, opts.event.type));
      if (tpl?.isActive && tpl.htmlBody) {
        // Render DB template with vars
        const vars = opts.event as unknown as Record<string, string>;
        vars.siteName = cfg.siteName || "عقارات بنها";
        vars.siteUrl = cfg.siteUrl || "#";
        vars.year = String(new Date().getFullYear());
        vars.contactEmail = cfg.contactEmail || "";
        finalSubject = tpl.subject.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
        finalHtml = tpl.htmlBody.replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? `{{${k}}}`);
      }
    } catch { /* use built-in template */ }

    const configured = !!(cfg.smtpHost && cfg.smtpUser && cfg.smtpPass);
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
          from: `"${cfg.smtpFromName || cfg.siteName || "عقارات بنها"}" <${cfg.smtpFromEmail || cfg.smtpUser}>`,
          to: opts.toName ? `"${opts.toName}" <${opts.to}>` : opts.to,
          subject: finalSubject,
          html: finalHtml,
        });
        status = "sent";
      } catch (err: any) {
        status = "failed";
        error = err?.message ?? "Unknown SMTP error";
        console.warn(`[mailer] Failed to send ${opts.event.type} to ${opts.to}:`, error);
      }
    } else {
      status = "preview";
      console.log(`[mailer] SMTP not configured — preview only. Event: ${opts.event.type}, To: ${opts.to}`);
    }

    // Log every send attempt
    await db.insert(emailLogsTable).values({
      templateName: opts.event.type,
      toEmail: opts.to,
      toName: opts.toName ?? null,
      subject: finalSubject,
      status,
      error,
      metadata: null,
    }).catch(() => {});

    return { sent: status === "sent", status };
  } catch (err: any) {
    console.error("[mailer] Unexpected error:", err?.message);
    return { sent: false, status: "error" };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const mailer = {
  /** Send welcome email to new user */
  async welcome(to: string, name: string) {
    const cfg = await getSmtpConfig();
    return sendMail({ to, toName: name, event: { type: "welcome", userName: name, siteUrl: cfg.siteUrl || "" } });
  },

  /** Send password reset email */
  async forgotPassword(to: string, name: string, resetToken: string) {
    const cfg = await getSmtpConfig();
    const siteUrl = cfg.siteUrl || "";
    const resetUrl = siteUrl
      ? `${siteUrl}/reset-password?token=${resetToken}`
      : `/reset-password?token=${resetToken}`;
    return sendMail({ to, toName: name, event: { type: "forgot-password", userName: name, resetUrl, expiryMinutes: 30 } });
  },

  /** Confirm property submission */
  async propertySubmitted(to: string, name: string, propertyTitle: string, propertyId: number) {
    const cfg = await getSmtpConfig();
    return sendMail({ to, toName: name, event: { type: "property-submitted", userName: name, propertyTitle, propertyId, siteUrl: cfg.siteUrl || "" } });
  },

  /** Notify owner that property was approved */
  async propertyApproved(to: string, name: string, propertyTitle: string, propertyId: number) {
    const cfg = await getSmtpConfig();
    return sendMail({ to, toName: name, event: { type: "property-approved", userName: name, propertyTitle, propertyId, siteUrl: cfg.siteUrl || "" } });
  },

  /** Notify owner that property was rejected with reason */
  async propertyRejected(to: string, name: string, propertyTitle: string, rejectionReason: string) {
    const cfg = await getSmtpConfig();
    return sendMail({ to, toName: name, event: { type: "property-rejected", userName: name, propertyTitle, rejectionReason, siteUrl: cfg.siteUrl || "" } });
  },

  /** Notify user of saved search match */
  async savedSearchMatch(to: string, name: string, propertyTitle: string, propertyId: number, price: string, address: string) {
    const cfg = await getSmtpConfig();
    return sendMail({ to, toName: name, event: { type: "saved-search-match", userName: name, propertyTitle, propertyId, price, address, siteUrl: cfg.siteUrl || "" } });
  },

  /** Notify user of new message */
  async newMessage(to: string, name: string, senderName: string, messagePreview: string) {
    const cfg = await getSmtpConfig();
    return sendMail({ to, toName: name, event: { type: "new-message", userName: name, senderName, messagePreview, siteUrl: cfg.siteUrl || "" } });
  },

  /** Confirm package purchase */
  async packagePurchased(to: string, name: string, packageName: string, expiryDate: string) {
    const cfg = await getSmtpConfig();
    return sendMail({ to, toName: name, event: { type: "package-purchased", userName: name, packageName, expiryDate, siteUrl: cfg.siteUrl || "" } });
  },
};
