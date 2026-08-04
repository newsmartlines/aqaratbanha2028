import { Router } from "express";
import { db } from "@workspace/db";
import { siteSettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";
import { autoExportGroup } from "../lib/auto-export";
import { writeAuditLog } from "../lib/auditLog";
import { invalidateSetting } from "../lib/settingsCache";
import { adminOnly } from "../middleware/adminOnly";

const router = Router();

// Keys that must never be sent to the browser (not even to admins via the public endpoint)
const SENSITIVE_KEYS = new Set<string>([
  "googleClientSecret",
  "smtpPassword",
  "openaiApiKey",
  "stripeSecretKey",
]);

// Keys that the public GET /settings endpoint may expose (allowlist for unauthenticated callers)
const PUBLIC_KEYS = new Set<string>([
  "siteName",
  "siteNameEn",
  "logoUrl",
  "faviconUrl",
  "heroImage",
  "primaryColor",
  "themePreset",
  "primaryColorHsl",
  "secondaryColorHsl",
  "accentColorHsl",
  "fontFamily",
  "borderRadius",
  "heroTitle",
  "heroSubtitle",
  "ctaText",
  "ctaButtonText",
  "aboutContent",
  "contactEmail",
  "contactPhone",
  "contactWhatsapp",
  "contactAddress",
  "workingHours",
  "faqContent",
  "featuredSectionTitle",
  "featuredSectionSubtitle",
  "featuredSectionTypes",
  "featuredSectionCount",
  "featuredSectionCustomCount",
  "featuredSectionColumns",
  "featuredSectionSort",
  "listingsPerPage",
  "subscriptionsEnabled",
  "servicesModuleEnabled",
  "paymentGateway",
  "vodafoneCashEnabled",
  "vodafoneCashNumber",
  "vodafoneCashName",
  "fawryEnabled",
  "fawryCode",
  "fawryMerchantName",
  "instaPayEnabled",
  "instaPayIPA",
  "instaPayName",
  "bankTransferEnabled",
  "bankName",
  "bankAccountName",
  "bankAccountNumber",
  "bankIBAN",
  "paymentInstructions",
  // Google Sign-In client ID is public (used in OAuth flows)
  "googleClientId",
  // AdSense — publisher ID and auto-ads flag must be public (loaded by frontend)
  "adsensePublisherId",
  "adsenseAutoAdsEnabled",
]);

const DEFAULT_SETTINGS: Record<string, string> = {
  watermarkConfig: JSON.stringify({
    enabled: false,
    type: "text",
    text: "عقارات الإسكندرية",
    textColor: "#ffffff",
    fontSize: 32,
    imageUrl: "",
    position: "bottom-right",
    opacity: 60,
    scale: 30,
    padding: 20,
    repeat: false,
  }),
  googleClientId: "",
  googleClientSecret: "",
  // ── AdSense ─────────────────────────────────────────────────────────────
  adsensePublisherId: "",
  adsenseAutoAdsEnabled: "false",
  servicesModuleEnabled: "true",
  subscriptionsEnabled: "true",
  // ── Payment gateway ─────────────────────────────────────────────
  paymentGateway: "vodafone_cash",
  vodafoneCashEnabled: "true",
  vodafoneCashNumber: "01001234567",
  vodafoneCashName: "عقارات الإسكندرية",
  fawryEnabled: "false",
  fawryCode: "12345",
  fawryMerchantName: "عقارات الإسكندرية",
  instaPayEnabled: "true",
  instaPayIPA: "aqarat.alex@instapay",
  instaPayName: "عقارات الإسكندرية",
  bankTransferEnabled: "true",
  bankName: "البنك الأهلي المصري",
  bankAccountName: "شركة عقارات الإسكندرية",
  bankAccountNumber: "1234567890",
  bankIBAN: "EG380019001280000000123456789",
  paymentInstructions: "",
  featuredSectionTitle: "اكتشف أفضل العقارات في الإسكندرية",
  featuredSectionSubtitle: "استعرض أحدث العقارات السكنية والتجارية وأفضل الفرص الاستثمارية في مدينة الإسكندرية.",
  featuredSectionTypes: JSON.stringify(["all"]),
  featuredSectionCount: "5",
  featuredSectionCustomCount: "12",
  featuredSectionColumns: "3",
  featuredSectionSort: "newest",
  listingsPerPage: "12",
  siteName: "عقارات الإسكندرية",
  siteNameEn: "Aqarat Alexandria",
  logoUrl: "",
  faviconUrl: "",
  heroImage: "",
  primaryColor: "#0d9488",
  themePreset: "teal-sand",
  primaryColorHsl: "180 65% 35%",
  secondaryColorHsl: "35 50% 88%",
  accentColorHsl: "25 80% 60%",
  fontFamily: "Proxima Nova",
  borderRadius: "0.75rem",
  aboutContent: "نحن منصة عقارات الإسكندرية، الوجهة الأولى لبيع وشراء وإيجار العقارات في محافظة الإسكندرية. نربطك بأفضل العروض العقارية بسرعة وأمان وشفافية تامة.",
  contactEmail: "info@aqaratalexandria.com",
  contactPhone: "+201000000000",
  contactWhatsapp: "+201000000000",
  contactAddress: "الإسكندرية، جمهورية مصر العربية",
  workingHours: "الأحد — الخميس، من 9 صباحاً حتى 6 مساءً",
  faqContent: JSON.stringify([
    { q: "كيف أعرض عقاري على الموقع؟", a: "سجّل كمزود وأضف بيانات العقار من لوحة التحكم." },
    { q: "هل التسجيل مجاني؟", a: "نعم، التسجيل الأساسي مجاني تماماً." },
    { q: "ما المناطق التي يغطيها الموقع؟", a: "نغطي جميع أحياء ومناطق محافظة الإسكندرية (المنتزه، الرمل، العجمي، المعمورة، برج العرب وغيرها)." },
  ]),
  heroTitle: "اعثر على عقارك المثالي في الإسكندرية",
  heroSubtitle: "سواء كنت تبحث عن شقة أو فيلا أو أرض للبيع أو الإيجار، \"عقارات الإسكندرية\" يربطك بأفضل العروض بسرعة وأمان.",
  ctaText: "نضمن لك أفضل العقارات بأفضل الأسعار في الإسكندرية",
  ctaButtonText: "تصفح العقارات الآن",
};

// ── GET /settings — public endpoint (safe keys only) ──────────────────────────
router.get("/settings", async (_req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  res.set("Pragma", "no-cache");
  try {
    const rows = await db.select().from(siteSettingsTable);
    const all: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      all[row.key] = row.value ?? "";
    }
    // Only expose public keys to unauthenticated callers
    const safe: Record<string, string> = {};
    for (const key of PUBLIC_KEYS) {
      if (all[key] !== undefined) safe[key] = all[key];
    }
    res.json({ success: true, data: safe });
  } catch {
    res.status(500).json({ success: false, error: "Failed to load settings" });
  }
});

// ── GET /settings/:key — individual key lookup (public-safe only) ──────────────
router.get("/settings/:key", async (req, res) => {
  const key = req.params.key;
  if (SENSITIVE_KEYS.has(key)) {
    return res.status(403).json({ success: false, error: "Forbidden" });
  }
  try {
    const row = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
    const value = row[0]?.value ?? DEFAULT_SETTINGS[key] ?? null;
    res.json({ success: true, data: { key, value } });
  } catch {
    res.status(500).json({ success: false, error: "Failed to load setting" });
  }
});

// ── GET /admin/settings — admin-only: returns all settings including sensitive ─
router.get("/admin/settings", adminOnly, async (_req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate");
  try {
    const rows = await db.select().from(siteSettingsTable);
    const settings: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      settings[row.key] = row.value ?? "";
    }
    res.json({ success: true, data: settings });
  } catch {
    res.status(500).json({ success: false, error: "Failed to load settings" });
  }
});

// ── POST /settings — admin only ────────────────────────────────────────────────
router.post("/settings", adminOnly, async (req, res) => {
  try {
    const updates: Record<string, string> = req.body;
    for (const [key, value] of Object.entries(updates)) {
      const existing = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);

      // For subscriptionsEnabled: capture previous value and write audit log
      if (key === "subscriptionsEnabled") {
        const prevValue = existing[0]?.value ?? "true";
        const newValue = String(value);
        if (prevValue !== newValue) {
          const sess = (req as any).session as { userId?: number; email?: string } | undefined;
          writeAuditLog({
            ts: new Date().toISOString(),
            ip: req.ip ?? "unknown",
            userId: sess?.userId,
            email: sess?.email,
            method: "PATCH",
            path: "/api/admin/settings/subscriptionsEnabled",
            body: {
              action: "toggle_subscriptions",
              previousStatus: prevValue === "false" ? "disabled" : "enabled",
              newStatus: newValue === "false" ? "disabled" : "enabled",
            },
          });
        }
      }

      // Always invalidate the cache for any updated key so stale values don't persist
      invalidateSetting(key);

      if (existing.length > 0) {
        await db.update(siteSettingsTable).set({ value: String(value), updatedAt: new Date() }).where(eq(siteSettingsTable.key, key));
      } else {
        await db.insert(siteSettingsTable).values({ key, value: String(value) });
      }
    }
    // Write-through: persist settings changes to seed file immediately
    autoExportGroup("settings");
    res.json({ success: true, data: {} });
  } catch {
    res.status(500).json({ success: false, error: "Failed to save settings" });
  }
});

export default router;
