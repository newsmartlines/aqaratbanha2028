import {
  Building2, Home, Warehouse, Briefcase, ShoppingBag, Trees,
  MapPin, Phone, Crown, Layers, Stethoscope, Hotel, Store, Utensils,
  Eye, TrendingUp, Award, Star, Smartphone, BarChart2, Rocket, Bot,
} from "lucide-react";

export const PROPERTY_GROUPS = [
  {
    value: "residential",
    label: "سكني",
    icon: Home,
    desc: "شقق، فيلات، وحدات سكنية",
    subtypes: [
      { value: "شقة",        label: "شقة",        icon: Home },
      { value: "فيلا",       label: "فيلا",       icon: Building2 },
      { value: "دوبلكس",    label: "دوبلكس",    icon: Layers },
      { value: "بنتهاوس",   label: "بنتهاوس",   icon: Crown },
      { value: "استوديو",    label: "استوديو",    icon: Building2 },
      { value: "تاون هاوس", label: "تاون هاوس", icon: Building2 },
    ],
  },
  {
    value: "commercial",
    label: "تجاري",
    icon: Briefcase,
    desc: "مكاتب، محلات، مستودعات",
    subtypes: [
      { value: "محل",      label: "محل",      icon: ShoppingBag },
      { value: "مكتب",     label: "مكتب",     icon: Briefcase },
      { value: "مستودع",   label: "مستودع",   icon: Warehouse },
      { value: "معرض",     label: "معرض",     icon: Store },
      { value: "عيادة",    label: "عيادة",    icon: Stethoscope },
      { value: "مطعم",     label: "مطعم",     icon: Utensils },
    ],
  },
  {
    value: "land",
    label: "أراضي",
    icon: Trees,
    desc: "أراضي سكنية وتجارية وزراعية",
    subtypes: [
      { value: "أرض سكنية",   label: "أرض سكنية",  icon: Trees },
      { value: "أرض زراعية",  label: "أرض زراعية", icon: Trees },
      { value: "أرض تجارية",  label: "أرض تجارية", icon: Trees },
      { value: "أرض صناعية",  label: "أرض صناعية", icon: Trees },
    ],
  },
] as const;

export type PropertyGroupValue = typeof PROPERTY_GROUPS[number]["value"];

export const PROPERTY_TYPES = [
  { value: "شقة",        label: "شقة",        icon: Home,        desc: "في عمارة أو مجمع" },
  { value: "فيلا",       label: "فيلا",       icon: Building2,   desc: "منزل مستقل" },
  { value: "أرض سكنية",  label: "أرض سكنية",  icon: Trees,       desc: "قطعة أرض" },
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

export const NO_ROOM_CATEGORIES = [
  "أرض سكنية", "أرض تجارية", "أرض زراعية", "أرض صناعية",
  "أرض", "مستودع", "محل تجاري",
];

export const LAND_CATEGORIES = [
  "أرض سكنية", "أرض تجارية", "أرض زراعية", "أرض صناعية", "أرض",
];
