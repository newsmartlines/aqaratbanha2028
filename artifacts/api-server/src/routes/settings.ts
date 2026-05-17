import { Router } from "express";
import { db } from "@workspace/db";
import { siteSettingsTable } from "@workspace/db/schema";
import { eq } from "drizzle-orm";

const router = Router();

const DEFAULT_SETTINGS: Record<string, string> = {
  siteName: "سمارت لاينز للنظم المتطورة",
  siteNameEn: "Smart Lines Advanced Systems",
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
  aboutContent: "نحن منصة سمارت لاينز للنظم المتطورة، الوجهة الأولى للخدمات المنزلية والمحلية في جمهورية مصر العربية.",
  contactEmail: "info@dalilsmartlines.com",
  contactPhone: "+201000000000",
  contactWhatsapp: "+201000000000",
  contactAddress: "القاهرة، جمهورية مصر العربية",
  workingHours: "الأحد — الخميس، من 9 صباحاً حتى 6 مساءً",
  faqContent: JSON.stringify([
    { q: "كيف أسجل كمزود خدمة؟", a: "اضغط على 'انضم إلينا الآن' وأكمل نموذج التسجيل." },
    { q: "هل التسجيل مجاني؟", a: "نعم، التسجيل الأساسي مجاني تماماً." },
    { q: "كيف يتم الدفع؟", a: "يتم الدفع عبر وسائل الدفع الإلكتروني المتاحة." },
  ]),
  heroTitle: "اكتشف أفضل الخدمات من أيدي محلية موثوقة",
  heroSubtitle: 'سواء كنت تبحث عن طعام بيتي لذيذ، أو حرف يدوية متقنة، أو خدمات صيانة موثوقة، "سمارت لاينز للنظم المتطورة" يربطك بأفضل مقدمي الخدمات في منطقتك.',
  ctaText: "ندعم المشاريع المنزلية ونضمن حقوقك",
  ctaButtonText: "انضم إلينا الآن",
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
