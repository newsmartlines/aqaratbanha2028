import {
  Building2, Home, Warehouse, Briefcase, ShoppingBag, Trees,
  MapPin, Phone, Crown,
  Eye, TrendingUp, Award, Star, Smartphone, BarChart2, Rocket, Bot,
} from "lucide-react";

export const PROPERTY_TYPES = [
  { value: "شقة",        label: "شقة",        icon: Home,        desc: "في عمارة أو مجمع" },
  { value: "فيلا",       label: "فيلا",       icon: Building2,   desc: "منزل مستقل" },
  { value: "أرض",        label: "أرض",        icon: Trees,       desc: "قطعة أرض" },
  { value: "مكتب",       label: "مكتب",       icon: Briefcase,   desc: "إداري أو تجاري" },
  { value: "محل تجاري",  label: "محل تجاري",  icon: ShoppingBag, desc: "على الشارع" },
  { value: "مستودع",     label: "مستودع",     icon: Warehouse,   desc: "للتخزين" },
  { value: "عمارة",      label: "عمارة",      icon: Building2,   desc: "مبنى كامل" },
  { value: "استراحة",    label: "استراحة",    icon: Home,        desc: "للإيجار اليومي" },
];

export const FINISHING = [
  { value: "super_lux",     label: "سوبر لوكس",  desc: "تشطيبات راقية جداً" },
  { value: "lux",           label: "لوكس",        desc: "تشطيبات جيدة" },
  { value: "semi_finished", label: "نصف تشطيب",  desc: "جاهز للتشطيب" },
  { value: "unfinished",    label: "بدون تشطيب", desc: "هيكل فقط" },
];

export const CONDITIONS = [
  { value: "new",                label: "جديد / لم يُسكن" },
  { value: "excellent",          label: "ممتاز" },
  { value: "good",               label: "جيد" },
  { value: "needs_renew",        label: "يحتاج تجديد" },
  { value: "under_construction", label: "تحت الإنشاء" },
];

export const DIRECTIONS = [
  "شمال", "جنوب", "شرق", "غرب",
  "شمال شرق", "شمال غرب", "جنوب شرق", "جنوب غرب",
];

export const ADVERTISER_TYPES = [
  { value: "owner",     label: "مالك مباشر" },
  { value: "broker",    label: "وسيط عقاري" },
  { value: "company",   label: "شركة عقارية" },
  { value: "developer", label: "مطور عقاري" },
];

export const CITIES = ["بنها", "قليوب", "شبرا الخيمة", "القناطر", "طوخ", "كفر شكر"];

export const BANHA_LAT = 30.4667;
export const BANHA_LNG = 31.1833;

export const STEPS_CONFIG = (showPlans: boolean) => [
  { id: 1, label: "نوع العقار",     icon: Building2 },
  { id: 2, label: "التفاصيل",       icon: Home },
  { id: 3, label: "الموقع",         icon: MapPin },
  { id: 4, label: "الصور والتواصل", icon: Phone },
  ...(showPlans ? [{ id: 5, label: "اختر الباقة", icon: Crown }] : []),
];

export const PLAN_LABELS: Record<string, string> = {
  homepageDisplay: "ظهور في الصفحة الرئيسية",
  topSearch:       "أولوية في نتائج البحث",
  verifiedBadge:   "شارة الموثوقية",
  premiumBadge:    "شارة مميز",
  prioritySupport: "دعم أولوية",
  analytics:       "إحصائيات الأداء",
  seo:             "تحسين محركات البحث",
  aiTools:         "أدوات الذكاء الاصطناعي",
  autoBoost:       "رفع تلقائي للإعلان",
};

export const PLAN_ICONS: Record<string, typeof Eye> = {
  homepageDisplay: Eye,
  topSearch:       TrendingUp,
  verifiedBadge:   Award,
  premiumBadge:    Star,
  prioritySupport: Smartphone,
  analytics:       BarChart2,
  seo:             Rocket,
  aiTools:         Bot,
  autoBoost:       TrendingUp,
};

export const NO_ROOM_CATEGORIES = ["أرض", "مستودع", "محل تجاري"];
