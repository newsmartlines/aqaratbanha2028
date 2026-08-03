import {
  Building2, Home, Warehouse, Briefcase, ShoppingBag, Trees,
  MapPin, Phone, Crown, Layers, Stethoscope, Store, Utensils, Factory,
  Eye, TrendingUp, Award, Star, Smartphone, BarChart2, Rocket, Bot,
} from "lucide-react";

export const PROPERTY_GROUPS = [
  {
    value: "residential",
    label: "سكني",
    icon: Home,
    desc: "شقق، فيلات، وحدات سكنية",
    subtypes: [
      { value: "apartment",   label: "شقة",         icon: Home },
      { value: "villa",       label: "فيلا",        icon: Building2 },
      { value: "duplex",      label: "دوبلكس",      icon: Layers },
      { value: "studio",      label: "استوديو",      icon: Building2 },
      { value: "chalet",      label: "شاليه",        icon: Building2 },
      { value: "standalone",  label: "منزل مستقل",   icon: Crown },
      { value: "single-room", label: "غرفة مفردة",   icon: Building2 },
      { value: "full-floor",  label: "طابق كامل",    icon: Layers },
    ],
  },
  {
    value: "commercial",
    label: "تجاري",
    icon: Briefcase,
    desc: "مكاتب، محلات، مستودعات",
    subtypes: [
      { value: "shop",                label: "محل تجاري",    icon: ShoppingBag },
      { value: "office",              label: "مكتب",         icon: Briefcase },
      { value: "warehouse",           label: "مستودع",       icon: Warehouse },
      { value: "showroom",            label: "معرض",         icon: Store },
      { value: "commercial-building", label: "عمارة تجارية", icon: Building2 },
      { value: "pharmacy",            label: "صيدلية",       icon: Stethoscope },
      { value: "restaurant",          label: "مطعم",         icon: Utensils },
    ],
  },
  {
    value: "land",
    label: "أراضي",
    icon: Trees,
    desc: "أراضي سكنية وتجارية وزراعية",
    subtypes: [
      { value: "land-residential",  label: "أرض سكنية",   icon: Trees },
      { value: "land-commercial",   label: "أرض تجارية",  icon: Trees },
      { value: "land-agricultural", label: "أرض زراعية",  icon: Trees },
      { value: "land-industrial",   label: "أرض صناعية",  icon: Trees },
      { value: "land-service",      label: "أرض خدمية",   icon: Trees },
    ],
  },
  {
    value: "industrial",
    label: "صناعي",
    icon: Factory,
    desc: "مصانع، ورش، مستودعات صناعية",
    subtypes: [
      { value: "factory",              label: "مصنع",             icon: Factory },
      { value: "industrial-warehouse", label: "مستودع صناعي",     icon: Warehouse },
      { value: "workshop",             label: "ورشة",             icon: Factory },
      { value: "industrial-facility",  label: "منشأة صناعية",     icon: Factory },
    ],
  },
] as const;

export type PropertyGroupValue = typeof PROPERTY_GROUPS[number]["value"];

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

export const BANHA_LAT = 31.2001;
export const BANHA_LNG = 29.9187;

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
  "land-residential", "land-commercial", "land-agricultural", "land-industrial",
  "land-service", "warehouse", "shop",
];

export const LAND_CATEGORIES = [
  "land-residential", "land-commercial", "land-agricultural",
  "land-industrial", "land-service",
];
