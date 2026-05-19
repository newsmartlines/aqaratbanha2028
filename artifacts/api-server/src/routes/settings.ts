import { Router } from "express";
import { db } from "@workspace/db";
import { siteSettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

const DEFAULT_SETTINGS: Record<string, string> = {
  googleClientId: "",
  googleClientSecret: "",
  servicesModuleEnabled: "true",
  siteName: "عقارات بنها",
  siteNameEn: "Aqarat Banha",
  logoUrl: "",
  faviconUrl: "",
  heroImage: "",
  primaryColor: "#0d9488",
  themePreset: "teal-sand",
  primaryColorHsl: "180 65% 35%",
  secondaryColorHsl: "35 50% 88%",
  accentColorHsl: "25 80% 60%",
  fontFamily: "Tajawal",
  borderRadius: "0.75rem",
  aboutContent: "نحن منصة عقارات بنها، الوجهة الأولى لبيع وشراء وإيجار العقارات في بنها والقليوبية، مع خدمات التشطيبات والديكور ومواد البناء.",
  contactEmail: "info@aqarat-banha.com",
  contactPhone: "+201000000000",
  contactWhatsapp: "+201000000000",
  contactAddress: "بنها، القليوبية، جمهورية مصر العربية",
  workingHours: "الأحد — الخميس، من 9 صباحاً حتى 6 مساءً",
  faqContent: JSON.stringify([
    { q: "كيف أعرض عقاري على الموقع؟", a: "سجّل كمزود وأضف بيانات العقار من لوحة التحكم." },
    { q: "هل التسجيل مجاني؟", a: "نعم، التسجيل الأساسي مجاني تماماً." },
    { q: "ما هي الخدمات المتاحة بجانب العقارات؟", a: "نوفر خدمات التشطيبات والديكور وأعمال الجبس والسيراميك ومواد البناء." },
  ]),
  heroTitle: "اعثر على عقارك المثالي في بنها",
  heroSubtitle: "سواء كنت تبحث عن شقة أو فيلا أو أرض للبيع أو الإيجار، \"عقارات بنها\" يربطك بأفضل العروض في القليوبية بسرعة وأمان.",
  ctaText: "نضمن لك أفضل العقارات بأفضل الأسعار في بنها",
  ctaButtonText: "تصفح العقارات الآن",
};

router.get("/settings", async (_req, res) => {
  try {
    const rows = await db.select().from(siteSettingsTable);
    const settings: Record<string, string> = { ...DEFAULT_SETTINGS };
    for (const row of rows) {
      settings[row.key] = row.value ?? "";
    }
    res.json({ success: true, data: settings });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to load settings" });
  }
});

router.get("/settings/:key", async (req, res) => {
  try {
    const row = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, req.params.key)).limit(1);
    const value = row[0]?.value ?? DEFAULT_SETTINGS[req.params.key] ?? null;
    res.json({ success: true, data: { key: req.params.key, value } });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to load setting" });
  }
});

router.post("/settings", async (req, res) => {
  try {
    const updates: Record<string, string> = req.body;
    for (const [key, value] of Object.entries(updates)) {
      const existing = await db.select().from(siteSettingsTable).where(eq(siteSettingsTable.key, key)).limit(1);
      if (existing.length > 0) {
        await db.update(siteSettingsTable).set({ value: String(value), updatedAt: new Date() }).where(eq(siteSettingsTable.key, key));
      } else {
        await db.insert(siteSettingsTable).values({ key, value: String(value) });
      }
    }
    res.json({ success: true, data: {} });
  } catch (e) {
    res.status(500).json({ success: false, error: "Failed to save settings" });
  }
});

export default router;
