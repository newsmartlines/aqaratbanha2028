// ─── Property Field Rules ─────────────────────────────────────────────────────
// Single source of truth for which structural fields are relevant per property
// type. Used by: search page filters, property form, map search, admin panels.

export type FieldKey =
  | "rooms" | "bathrooms" | "floor" | "totalFloors" | "buildYear"
  | "finishing" | "furnished" | "condition" | "direction" | "facade"
  | "paymentMethod" | "landType" | "landDimensions" | "buildRatio";

export interface FieldDef {
  key: FieldKey;
  label: string;
  group: "residential" | "land" | "commercial" | "all";
}

export const ALL_FIELD_DEFS: FieldDef[] = [
  { key: "rooms",          label: "الغرف",             group: "residential" },
  { key: "bathrooms",      label: "الحمامات",           group: "residential" },
  { key: "floor",          label: "الطابق",             group: "residential" },
  { key: "totalFloors",    label: "إجمالي الطوابق",     group: "residential" },
  { key: "buildYear",      label: "سنة البناء",         group: "all"         },
  { key: "finishing",      label: "التشطيب",            group: "residential" },
  { key: "furnished",      label: "الفرش",              group: "residential" },
  { key: "condition",      label: "حالة العقار",        group: "residential" },
  { key: "direction",      label: "الاتجاه",            group: "all"         },
  { key: "facade",         label: "الواجهة",            group: "all"         },
  { key: "paymentMethod",  label: "طريقة الدفع",        group: "all"         },
  { key: "landType",       label: "نوع الأرض",          group: "land"        },
  { key: "landDimensions", label: "أبعاد الأرض",        group: "land"        },
  { key: "buildRatio",     label: "نسبة البناء",        group: "land"        },
];

// Canonical default field visibility per property type (matches property-type-config.ts)
export const DEFAULT_FIELD_VISIBILITY: Record<string, Record<FieldKey, boolean>> = {
  "شقة":         { rooms: true,  bathrooms: true,  floor: true,  totalFloors: true,  buildYear: true,  finishing: true,  furnished: true,  condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  "دوبلكس":      { rooms: true,  bathrooms: true,  floor: true,  totalFloors: true,  buildYear: true,  finishing: true,  furnished: true,  condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  "استوديو":     { rooms: true,  bathrooms: true,  floor: true,  totalFloors: true,  buildYear: true,  finishing: true,  furnished: true,  condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  "روف":         { rooms: true,  bathrooms: true,  floor: true,  totalFloors: true,  buildYear: true,  finishing: true,  furnished: true,  condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  "غرفة":        { rooms: true,  bathrooms: true,  floor: true,  totalFloors: true,  buildYear: true,  finishing: true,  furnished: true,  condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  "فيلا":        { rooms: true,  bathrooms: true,  floor: false, totalFloors: true,  buildYear: true,  finishing: true,  furnished: true,  condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  "استراحة":     { rooms: true,  bathrooms: true,  floor: false, totalFloors: true,  buildYear: true,  finishing: true,  furnished: true,  condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  "عمارة":       { rooms: true,  bathrooms: false, floor: false, totalFloors: true,  buildYear: true,  finishing: true,  furnished: false, condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  "مكتب":        { rooms: true,  bathrooms: true,  floor: true,  totalFloors: true,  buildYear: true,  finishing: true,  furnished: true,  condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  "عيادة":       { rooms: true,  bathrooms: true,  floor: true,  totalFloors: true,  buildYear: true,  finishing: true,  furnished: true,  condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  "محل تجاري":  { rooms: false, bathrooms: false, floor: true,  totalFloors: false, buildYear: true,  finishing: true,  furnished: false, condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  "مجمع تجاري": { rooms: false, bathrooms: false, floor: true,  totalFloors: false, buildYear: true,  finishing: true,  furnished: false, condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  "فندق":        { rooms: true,  bathrooms: true,  floor: false, totalFloors: true,  buildYear: true,  finishing: true,  furnished: true,  condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  "مستودع":      { rooms: false, bathrooms: false, floor: false, totalFloors: false, buildYear: true,  finishing: false, furnished: false, condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  "أرض سكنية":  { rooms: false, bathrooms: false, floor: false, totalFloors: false, buildYear: false, finishing: false, furnished: false, condition: false, direction: true, facade: true, paymentMethod: true, landType: true,  landDimensions: true,  buildRatio: true  },
  "أرض تجارية": { rooms: false, bathrooms: false, floor: false, totalFloors: false, buildYear: false, finishing: false, furnished: false, condition: false, direction: true, facade: true, paymentMethod: true, landType: true,  landDimensions: true,  buildRatio: true  },
  "أرض زراعية": { rooms: false, bathrooms: false, floor: false, totalFloors: false, buildYear: false, finishing: false, furnished: false, condition: false, direction: true, facade: true, paymentMethod: true, landType: true,  landDimensions: true,  buildRatio: false },
  "أرض صناعية": { rooms: false, bathrooms: false, floor: false, totalFloors: false, buildYear: false, finishing: false, furnished: false, condition: false, direction: true, facade: true, paymentMethod: true, landType: true,  landDimensions: true,  buildRatio: true  },
};

// Maps search page subCategory values → DB mainCategory values
export const SEARCH_SUB_TO_MAIN: Record<string, string> = {
  apartment:        "شقة",
  villa:            "فيلا",
  duplex:           "دوبلكس",
  roof:             "روف",
  chalet:           "استراحة",
  studio:           "استوديو",
  building:         "عمارة",
  shop:             "محل تجاري",
  office:           "مكتب",
  showroom:         "مجمع تجاري",
  warehouse:        "مستودع",
  clinic:           "عيادة",
  hotel:            "فندق",
  residential_land: "أرض سكنية",
  commercial_land:  "أرض تجارية",
  farm:             "أرض زراعية",
  industrial_land:  "أرض صناعية",
};

// Subcategory values belonging to each search category
const CATEGORY_SUBS: Record<string, string[]> = {
  residential: ["apartment","villa","duplex","roof","chalet","studio","building"],
  commercial:  ["shop","office","showroom","warehouse","clinic","hotel"],
  land:        ["residential_land","commercial_land","farm","industrial_land"],
  industrial:  ["industrial_land"],
};

// All-visible fallback
const ALL_VISIBLE: Record<FieldKey, boolean> = {
  rooms: true, bathrooms: true, floor: true, totalFloors: true, buildYear: true,
  finishing: true, furnished: true, condition: true, direction: true, facade: true,
  paymentMethod: true, landType: true, landDimensions: true, buildRatio: true,
};

/**
 * Resolve the DB mainCategory string from search page filter values.
 * Returns null when category="all" or subCategory="all".
 */
export function resolveMainCategory(category: string, subCategory: string): string | null {
  if (subCategory && subCategory !== "all") {
    return SEARCH_SUB_TO_MAIN[subCategory] ?? null;
  }
  return null;
}

export type FieldConfigRow = { mainCategory: string; fieldKey: string; isVisible: boolean };

/**
 * Get field visibility rules for the current search filter state.
 *
 * Priority:
 * 1. DB configs for the exact mainCategory (if subCategory is set)
 * 2. Union of DB configs across the category's subtypes
 * 3. Hardcoded DEFAULT_FIELD_VISIBILITY fallback
 */
export function getFieldRules(
  category: string,
  subCategory: string,
  dbConfigs?: FieldConfigRow[]
): Record<FieldKey, boolean> {
  const mainCat = resolveMainCategory(category, subCategory);

  if (dbConfigs && dbConfigs.length > 0) {
    if (mainCat) {
      const forType = dbConfigs.filter((c) => c.mainCategory === mainCat);
      if (forType.length > 0) {
        const rules: Record<FieldKey, boolean> = { ...ALL_VISIBLE };
        for (const cfg of forType) {
          (rules as any)[cfg.fieldKey] = cfg.isVisible;
        }
        return rules;
      }
    }

    // Category-level: a field is shown if ANY subtype in the category shows it
    if (category !== "all") {
      const subs = CATEGORY_SUBS[category] ?? [];
      const subtypeMainCats = subs.map((s) => SEARCH_SUB_TO_MAIN[s]).filter(Boolean);
      if (subtypeMainCats.length > 0) {
        const rules: Record<FieldKey, boolean> = {
          rooms: false, bathrooms: false, floor: false, totalFloors: false,
          buildYear: false, finishing: false, furnished: false, condition: false,
          direction: false, facade: false, paymentMethod: false,
          landType: false, landDimensions: false, buildRatio: false,
        };
        for (const fk of ALL_FIELD_DEFS.map((f) => f.key)) {
          const anyVisible = subtypeMainCats.some((mc) => {
            const cfgs = dbConfigs.filter((c) => c.mainCategory === mc);
            if (cfgs.length === 0) {
              return DEFAULT_FIELD_VISIBILITY[mc]?.[fk] ?? true;
            }
            const cfg = cfgs.find((c) => c.fieldKey === fk);
            return cfg ? cfg.isVisible : true;
          });
          rules[fk] = anyVisible;
        }
        return rules;
      }
    }
  }

  // Fallback to hardcoded defaults
  if (mainCat && DEFAULT_FIELD_VISIBILITY[mainCat]) {
    return { ...DEFAULT_FIELD_VISIBILITY[mainCat] } as Record<FieldKey, boolean>;
  }

  if (category !== "all") {
    const subs = CATEGORY_SUBS[category] ?? [];
    const subtypeMainCats = subs.map((s) => SEARCH_SUB_TO_MAIN[s]).filter(Boolean);
    if (subtypeMainCats.length > 0) {
      const rules: Record<FieldKey, boolean> = {
        rooms: false, bathrooms: false, floor: false, totalFloors: false,
        buildYear: false, finishing: false, furnished: false, condition: false,
        direction: false, facade: false, paymentMethod: false,
        landType: false, landDimensions: false, buildRatio: false,
      };
      for (const fk of ALL_FIELD_DEFS.map((f) => f.key)) {
        rules[fk] = subtypeMainCats.some(
          (mc) => DEFAULT_FIELD_VISIBILITY[mc]?.[fk] ?? true
        );
      }
      return rules;
    }
  }

  return { ...ALL_VISIBLE };
}
