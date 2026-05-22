import {
  Waves, Car, TreePine, ArrowUpDown, Building, Wind, Shield,
  BedDouble, BedSingle, Package, DoorOpen, Cpu, UtensilsCrossed,
  WashingMachine, Sun, CarFront, Dumbbell, Trophy,
  Building2, School, Hospital, ShoppingBag, Utensils, Coffee,
  Fuel, Pill, GraduationCap, Landmark, ShoppingCart,
  Home, Bath, Layers, MapPin, Wifi, Zap, Cross, Trees,
  type LucideIcon, type LucideProps,
} from "lucide-react";

// ── Icon map: Lucide name → component ────────────────────────────────────────

export const FEATURE_ICON_MAP: Record<string, LucideIcon> = {
  Waves, Car, TreePine, ArrowUpDown, Building, Wind, Shield,
  BedDouble, BedSingle, Package, DoorOpen, Cpu, UtensilsCrossed,
  WashingMachine, Sun, CarFront, Dumbbell, Trophy,
  Building2, School, Hospital, ShoppingBag, Utensils, Coffee,
  Fuel, Pill, GraduationCap, Landmark, ShoppingCart,
  Home, Bath, Layers, MapPin, Wifi, Zap, Cross, Trees,
};

// ── Arabic feature name → Lucide icon name ───────────────────────────────────

export const FEATURE_NAME_TO_ICON: Record<string, string> = {
  "مسبح":           "Waves",
  "جراج مغطى":      "Car",
  "حديقة خاصة":    "TreePine",
  "مصعد":           "ArrowUpDown",
  "شرفة":           "Building",
  "مكيف مركزي":    "Wind",
  "أمن 24 ساعة":   "Shield",
  "غرفة خادمة":    "BedDouble",
  "غرفة سائق":     "BedSingle",
  "مستودع":         "Package",
  "بوابة ذكية":    "DoorOpen",
  "نظام منزل ذكي": "Cpu",
  "مطبخ مجهز":     "UtensilsCrossed",
  "غرفة غسيل":     "WashingMachine",
  "طاقة شمسية":    "Sun",
  "موقف خاص":      "CarFront",
  "صالة رياضية":   "Dumbbell",
  "ملعب":           "Trophy",
  // services
  "مسجد":           "Building2",
  "مدرسة":          "School",
  "مستشفى":         "Hospital",
  "مول تجاري":     "ShoppingBag",
  "مطاعم":          "Utensils",
  "كافيهات":        "Coffee",
  "محطة وقود":     "Fuel",
  "صيدلية":         "Pill",
  "جامعة":          "GraduationCap",
  "بنك":            "Landmark",
  "سوبر ماركت":    "ShoppingCart",
};

// ── Available icons for picker ─────────────────────────────────────────────

export const FEATURE_ICONS_LIST = [
  "Waves", "Car", "TreePine", "ArrowUpDown", "Building", "Wind",
  "Shield", "BedDouble", "BedSingle", "Package", "DoorOpen", "Cpu",
  "UtensilsCrossed", "WashingMachine", "Sun", "CarFront", "Dumbbell",
  "Trophy", "Home", "Bath", "Wifi", "Zap", "Layers",
];

export const SERVICE_ICONS_LIST = [
  "Building2", "School", "Hospital", "ShoppingBag", "Utensils", "Coffee",
  "Fuel", "Pill", "GraduationCap", "Landmark", "ShoppingCart",
  "MapPin", "Trees", "Cross",
];

// ── FeatureIcon: renders by Lucide icon name (e.g. "Waves") ──────────────────

interface FeatureIconProps extends Omit<LucideProps, "name"> {
  name: string | null | undefined;
}

export function FeatureIcon({ name, ...props }: FeatureIconProps) {
  if (!name) return <Home {...props} />;
  const Icon = FEATURE_ICON_MAP[name];
  if (Icon) return <Icon {...props} />;
  // Legacy: short emoji or unknown string
  if (name.length <= 4) return <span style={{ fontSize: "1.05rem", lineHeight: 1 }}>{name}</span>;
  return <Home {...props} />;
}

// ── FeatureIconByName: renders by Arabic feature name (e.g. "مسبح") ──────────

interface FeatureIconByNameProps extends Omit<LucideProps, "name"> {
  featureName: string;
}

export function FeatureIconByName({ featureName, ...props }: FeatureIconByNameProps) {
  const iconName = FEATURE_NAME_TO_ICON[featureName];
  return <FeatureIcon name={iconName ?? "Home"} {...props} />;
}
