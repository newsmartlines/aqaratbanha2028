export function parseLimits(raw?: string | null): Record<string, number> {
  try { return JSON.parse(raw ?? "{}"); } catch { return {}; }
}

export function parseFeatures(raw?: string | null): Record<string, boolean> {
  try { return JSON.parse(raw ?? "{}"); } catch { return {}; }
}

export function fmtLimit(n: number): string {
  return n < 0 ? "غير محدود" : n === 0 ? "—" : n.toLocaleString("ar-EG");
}

export function fmtMoney(v: string | number | null | undefined): string {
  const n = parseFloat(String(v ?? "0"));
  return isFinite(n)
    ? n.toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    : "0.00";
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-EG", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export const FEATURE_LABELS: Record<string, string> = {
  homepageDisplay: "ظهور في الصفحة الرئيسية",
  topSearch:       "أعلى نتائج البحث",
  verifiedBadge:   "شارة موثّق",
  premiumBadge:    "شارة مميز",
  prioritySupport: "دعم الأولوية",
  analytics:       "إحصائيات متقدمة",
  autoBoost:       "رفع تلقائي للإعلانات",
  aiTools:         "أدوات الذكاء الاصطناعي",
  seo:             "تحسين SEO",
};

export const LIMIT_LABELS: Record<string, string> = {
  properties:  "العقارات المسموحة",
  photos:      "الصور لكل عقار",
  videos:      "الفيديوهات",
  featuredAds: "إعلانات مميزة",
  pinnedAds:   "إعلانات مثبتة",
  leads:       "الطلبات الشهرية",
  messages:    "الرسائل",
};
