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

// Canonical default field visibility per subcategory slug
export const DEFAULT_FIELD_VISIBILITY: Record<string, Record<FieldKey, boolean>> = {
  // Residential
  "apartment":    { rooms: true,  bathrooms: true,  floor: true,  totalFloors: true,  buildYear: true,  finishing: true,  furnished: true,  condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  "duplex":       { rooms: true,  bathrooms: true,  floor: true,  totalFloors: true,  buildYear: true,  finishing: true,  furnished: true,  condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  "studio":       { rooms: true,  bathrooms: true,  floor: true,  totalFloors: true,  buildYear: true,  finishing: true,  furnished: true,  condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  "standalone":   { rooms: true,  bathrooms: true,  floor: false, totalFloors: true,  buildYear: true,  finishing: true,  furnished: true,  condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  "single-room":  { rooms: true,  bathrooms: true,  floor: true,  totalFloors: true,  buildYear: true,  finishing: true,  furnished: true,  condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  "chalet":       { rooms: true,  bathrooms: true,  floor: false, totalFloors: true,  buildYear: true,  finishing: true,  furnished: true,  condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  "villa":        { rooms: true,  bathrooms: true,  floor: false, totalFloors: true,  buildYear: true,  finishing: true,  furnished: true,  condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  "full-floor":   { rooms: true,  bathrooms: false, floor: false, totalFloors: true,  buildYear: true,  finishing: true,  furnished: false, condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  // Commercial
  "office":              { rooms: true,  bathrooms: true,  floor: true,  totalFloors: true,  buildYear: true,  finishing: true,  furnished: true,  condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  "pharmacy":            { rooms: true,  bathrooms: true,  floor: true,  totalFloors: true,  buildYear: true,  finishing: true,  furnished: true,  condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  "shop":                { rooms: false, bathrooms: false, floor: true,  totalFloors: false, buildYear: true,  finishing: true,  furnished: false, condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  "showroom":            { rooms: false, bathrooms: false, floor: true,  totalFloors: false, buildYear: true,  finishing: true,  furnished: false, condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  "commercial-building": { rooms: true,  bathrooms: false, floor: false, totalFloors: true,  buildYear: true,  finishing: true,  furnished: false, condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  "restaurant":          { rooms: true,  bathrooms: true,  floor: false, totalFloors: true,  buildYear: true,  finishing: true,  furnished: true,  condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  "warehouse":           { rooms: false, bathrooms: false, floor: false, totalFloors: false, buildYear: true,  finishing: false, furnished: false, condition: true,  direction: true, facade: true, paymentMethod: true, landType: false, landDimensions: false, buildRatio: false },
  // Land
  "land-residential":    { rooms: false, bathrooms: false, floor: false, totalFloors: false, buildYear: false, finishing: false, furnished: false, condition: false, direction: true, facade: true, paymentMethod: true, landType: true,  landDimensions: true,  buildRatio: true  },
  "land-commercial":     { rooms: false, bathrooms: false, floor: false, totalFloors: false, buildYear: false, finishing: false, furnished: false, condition: false, direction: true, facade: true, paymentMethod: true, landType: true,  landDimensions: true,  buildRatio: true  },
  "land-agricultural":   { rooms: false, bathrooms: false, floor: false, totalFloors: false, buildYear: false, finishing: false, furnished: false, condition: false, direction: true, facade: true, paymentMethod: true, landType: true,  landDimensions: true,  buildRatio: false },
  "land-industrial":     { rooms: false, bathrooms: false, floor: false, totalFloors: false, buildYear: false, finishing: false, furnished: false, condition: false, direction: true, facade: true, paymentMethod: true, landType: true,  landDimensions: true,  buildRatio: true  },
  "land-service":        { rooms: false, bathrooms: false, floor: false, totalFloors: false, buildYear: false, finishing: false, furnished: false, condition: false, direction: true, facade: true, paymentMethod: true, landType: true,  landDimensions: true,  buildRatio: false },
};

// Subcategory slug → group slug mapping
export const SUBCAT_TO_GROUP: Record<string, string> = {
  "apartment": "residential", "villa": "residential", "duplex": "residential",
  "studio": "residential", "chalet": "residential", "standalone": "residential",
  "single-room": "residential", "full-floor": "residential",
  "shop": "commercial", "office": "commercial", "warehouse": "commercial",
  "showroom": "commercial", "commercial-building": "commercial",
  "pharmacy": "commercial", "restaurant": "commercial",
  "land-residential": "land", "land-commercial": "land",
  "land-agricultural": "land", "land-industrial": "land", "land-service": "land",
  "factory": "industrial", "industrial-warehouse": "industrial",
  "workshop": "industrial", "industrial-facility": "industrial",
};

// Subcategory slugs belonging to each category group
const CATEGORY_SUBS: Record<string, string[]> = {
  residential: ["apartment", "villa", "duplex", "studio", "chalet", "standalone", "single-room", "full-floor"],
  commercial:  ["shop", "office", "warehouse", "showroom", "commercial-building", "pharmacy", "restaurant"],
  land:        ["land-residential", "land-commercial", "land-agricultural", "land-industrial", "land-service"],
  industrial:  ["factory", "industrial-warehouse", "workshop", "industrial-facility"],
};

// All-visible fallback
const ALL_VISIBLE: Record<FieldKey, boolean> = {
  rooms: true, bathrooms: true, floor: true, totalFloors: true, buildYear: true,
  finishing: true, furnished: true, condition: true, direction: true, facade: true,
  paymentMethod: true, landType: true, landDimensions: true, buildRatio: true,
};

/**
 * Resolve the subtype slug from search page filter values.
 * Returns the subCategory slug when set, or null when category-level or "all".
 */
export function resolveMainCategory(category: string, subCategory: string): string | null {
  if (subCategory && subCategory !== "all") return subCategory;
  return category !== "all" ? category : null;
}

export type FieldConfigRow = { mainCategory: string; fieldKey: string; isVisible: boolean };

/**
 * Get field visibility rules for the current search filter state.
 *
 * Priority:
 * 1. DB configs for the exact subCategory slug (if subCategory is set)
 * 2. Union of DB configs across the category's subtypes
 * 3. Hardcoded DEFAULT_FIELD_VISIBILITY fallback
 */
export function getFieldRules(
  category: string,
  subCategory: string,
  dbConfigs?: FieldConfigRow[]
): Record<FieldKey, boolean> {
  const subCat = subCategory && subCategory !== "all" ? subCategory : null;

  if (dbConfigs && dbConfigs.length > 0) {
    if (subCat) {
      const forType = dbConfigs.filter((c) => c.mainCategory === subCat);
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
      if (subs.length > 0) {
        const rules: Record<FieldKey, boolean> = {
          rooms: false, bathrooms: false, floor: false, totalFloors: false,
          buildYear: false, finishing: false, furnished: false, condition: false,
          direction: false, facade: false, paymentMethod: false,
          landType: false, landDimensions: false, buildRatio: false,
        };
        for (const fk of ALL_FIELD_DEFS.map((f) => f.key)) {
          const anyVisible = subs.some((s) => {
            const cfgs = dbConfigs.filter((c) => c.mainCategory === s);
            if (cfgs.length === 0) {
              return DEFAULT_FIELD_VISIBILITY[s]?.[fk] ?? true;
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
  if (subCat && DEFAULT_FIELD_VISIBILITY[subCat]) {
    return { ...DEFAULT_FIELD_VISIBILITY[subCat] } as Record<FieldKey, boolean>;
  }

  if (category !== "all") {
    const subs = CATEGORY_SUBS[category] ?? [];
    if (subs.length > 0) {
      const rules: Record<FieldKey, boolean> = {
        rooms: false, bathrooms: false, floor: false, totalFloors: false,
        buildYear: false, finishing: false, furnished: false, condition: false,
        direction: false, facade: false, paymentMethod: false,
        landType: false, landDimensions: false, buildRatio: false,
      };
      for (const fk of ALL_FIELD_DEFS.map((f) => f.key)) {
        rules[fk] = subs.some((s) => DEFAULT_FIELD_VISIBILITY[s]?.[fk] ?? true);
      }
      return rules;
    }
  }

  return { ...ALL_VISIBLE };
}

// Subcategory slugs per category group (for getFieldRulesForCategorySlug)
const SLUG_TO_SUBTYPES: Record<string, string[]> = {
  residential: ["apartment", "villa", "duplex", "studio", "chalet", "standalone", "single-room", "full-floor"],
  commercial:  ["shop", "office", "warehouse", "showroom", "commercial-building", "pharmacy", "restaurant"],
  land:        ["land-residential", "land-commercial", "land-agricultural", "land-industrial", "land-service"],
  industrial:  ["factory", "industrial-warehouse", "workshop", "industrial-facility"],
};

/**
 * Get field visibility rules for a specific subCategory slug.
 * Used by properties.tsx / map-search.tsx.
 * When subCategory is null/undefined → shows ALL fields (no filter selected).
 */
export function getFieldRulesForMainCategory(
  subCategory: string | null | undefined,
  dbConfigs?: FieldConfigRow[]
): Record<FieldKey, boolean> {
  if (!subCategory) return { ...ALL_VISIBLE };

  // DB configs take priority over hardcoded defaults
  if (dbConfigs && dbConfigs.length > 0) {
    const forType = dbConfigs.filter((c) => c.mainCategory === subCategory);
    if (forType.length > 0) {
      const rules: Record<FieldKey, boolean> = { ...ALL_VISIBLE };
      for (const cfg of forType) {
        (rules as Record<string, boolean>)[cfg.fieldKey] = cfg.isVisible;
      }
      return rules;
    }
  }

  return DEFAULT_FIELD_VISIBILITY[subCategory]
    ? { ...DEFAULT_FIELD_VISIBILITY[subCategory] } as Record<FieldKey, boolean>
    : { ...ALL_VISIBLE };
}

/**
 * Get field rules for a category slug (e.g. "residential", "commercial", "land").
 * Returns the UNION of all subtype field visibilities.
 */
export function getFieldRulesForCategorySlug(
  slug: string | null | undefined,
  dbConfigs?: FieldConfigRow[]
): Record<FieldKey, boolean> {
  if (!slug) return { ...ALL_VISIBLE };

  const subtypes = SLUG_TO_SUBTYPES[slug];
  if (!subtypes || subtypes.length === 0) return { ...ALL_VISIBLE };

  const rules: Record<FieldKey, boolean> = {
    rooms: false, bathrooms: false, floor: false, totalFloors: false,
    buildYear: false, finishing: false, furnished: false, condition: false,
    direction: false, facade: false, paymentMethod: false,
    landType: false, landDimensions: false, buildRatio: false,
  };

  for (const subtype of subtypes) {
    const subRules = getFieldRulesForMainCategory(subtype, dbConfigs);
    for (const fk of ALL_FIELD_DEFS.map((f) => f.key)) {
      if (subRules[fk]) rules[fk] = true;
    }
  }
  return rules;
}

/** Export for use in UI (e.g. map-search subcategory selector) */
export { SLUG_TO_SUBTYPES };
