import type { PropertyTypeConfig } from "./types";

const RESIDENTIAL_FULL: PropertyTypeConfig = {
  showRooms:          true,
  roomsLabel:         "الغرف",
  showBathrooms:      true,
  showFloor:          true,
  floorLabel:         "الطابق",
  showTotalFloors:    true,
  showBuildYear:      true,
  showFinishing:      true,
  showFurnished:      true,
  showCondition:      true,
  showDirection:      true,
  showFacade:         true,
  showPaymentMethod:  true,
  showLandType:       false,
  showLandDimensions: false,
  showBuildRatio:     false,
  isLand:             false,
  isCommercial:       false,
};

const VILLA: PropertyTypeConfig = {
  ...RESIDENTIAL_FULL,
  showFloor:       false,
  floorLabel:      "الطابق",
};

const BUILDING: PropertyTypeConfig = {
  ...RESIDENTIAL_FULL,
  showFloor:        false,
  showBathrooms:    false,
  showFurnished:    false,
  roomsLabel:       "عدد الوحدات",
  floorLabel:       "الطابق",
};

const OFFICE_CLINIC: PropertyTypeConfig = {
  showRooms:          true,
  roomsLabel:         "عدد الغرف / المكاتب",
  showBathrooms:      true,
  showFloor:          true,
  floorLabel:         "الطابق",
  showTotalFloors:    true,
  showBuildYear:      true,
  showFinishing:      true,
  showFurnished:      true,
  showCondition:      true,
  showDirection:      true,
  showFacade:         true,
  showPaymentMethod:  true,
  showLandType:       false,
  showLandDimensions: false,
  showBuildRatio:     false,
  isLand:             false,
  isCommercial:       true,
};

const SHOP_MALL: PropertyTypeConfig = {
  showRooms:          false,
  roomsLabel:         "الغرف",
  showBathrooms:      false,
  showFloor:          true,
  floorLabel:         "الطابق",
  showTotalFloors:    false,
  showBuildYear:      true,
  showFinishing:      true,
  showFurnished:      false,
  showCondition:      true,
  showDirection:      true,
  showFacade:         true,
  showPaymentMethod:  true,
  showLandType:       false,
  showLandDimensions: false,
  showBuildRatio:     false,
  isLand:             false,
  isCommercial:       true,
};

const HOTEL: PropertyTypeConfig = {
  showRooms:          true,
  roomsLabel:         "عدد الغرف / الأجنحة",
  showBathrooms:      true,
  showFloor:          false,
  floorLabel:         "الطابق",
  showTotalFloors:    true,
  showBuildYear:      true,
  showFinishing:      true,
  showFurnished:      true,
  showCondition:      true,
  showDirection:      true,
  showFacade:         true,
  showPaymentMethod:  true,
  showLandType:       false,
  showLandDimensions: false,
  showBuildRatio:     false,
  isLand:             false,
  isCommercial:       true,
};

const WAREHOUSE: PropertyTypeConfig = {
  showRooms:          false,
  roomsLabel:         "الغرف",
  showBathrooms:      false,
  showFloor:          false,
  floorLabel:         "الطابق",
  showTotalFloors:    false,
  showBuildYear:      true,
  showFinishing:      false,
  showFurnished:      false,
  showCondition:      true,
  showDirection:      true,
  showFacade:         true,
  showPaymentMethod:  true,
  showLandType:       false,
  showLandDimensions: false,
  showBuildRatio:     false,
  isLand:             false,
  isCommercial:       true,
};

const LAND: PropertyTypeConfig = {
  showRooms:          false,
  roomsLabel:         "الغرف",
  showBathrooms:      false,
  showFloor:          false,
  floorLabel:         "الطابق",
  showTotalFloors:    false,
  showBuildYear:      false,
  showFinishing:      false,
  showFurnished:      false,
  showCondition:      false,
  showDirection:      true,
  showFacade:         true,
  showPaymentMethod:  true,
  showLandType:       false,
  showLandDimensions: true,
  showBuildRatio:     true,
  isLand:             true,
  isCommercial:       false,
};

const DEFAULT_CONFIG: PropertyTypeConfig = {
  showRooms:          true,
  roomsLabel:         "الغرف",
  showBathrooms:      true,
  showFloor:          true,
  floorLabel:         "الطابق",
  showTotalFloors:    true,
  showBuildYear:      true,
  showFinishing:      true,
  showFurnished:      true,
  showCondition:      true,
  showDirection:      true,
  showFacade:         true,
  showPaymentMethod:  true,
  showLandType:       false,
  showLandDimensions: false,
  showBuildRatio:     false,
  isLand:             false,
  isCommercial:       false,
};

// Keys are subcategory slugs (matches DB sub_category field)
export const PROPERTY_TYPE_CONFIGS: Record<string, PropertyTypeConfig> = {
  // Residential
  "apartment":           RESIDENTIAL_FULL,
  "duplex":              RESIDENTIAL_FULL,
  "studio":              RESIDENTIAL_FULL,
  "standalone":          VILLA,
  "single-room":         RESIDENTIAL_FULL,
  "chalet":              RESIDENTIAL_FULL,
  "villa":               VILLA,
  "full-floor":          BUILDING,
  // Commercial
  "office":              OFFICE_CLINIC,
  "pharmacy":            OFFICE_CLINIC,
  "shop":                SHOP_MALL,
  "showroom":            SHOP_MALL,
  "commercial-building": BUILDING,
  "restaurant":          HOTEL,
  "warehouse":           WAREHOUSE,
  // Land
  "land-residential":    LAND,
  "land-commercial":     LAND,
  "land-agricultural":   LAND,
  "land-industrial":     LAND,
  "land-service":        LAND,
  // Industrial
  "factory":             WAREHOUSE,
  "industrial-warehouse": WAREHOUSE,
  "workshop":            WAREHOUSE,
  "industrial-facility": WAREHOUSE,
};

/**
 * Get field visibility config for a property subtype.
 * Pass subCategory slug (preferred), falls back to mainCategory group slug.
 */
export function getPropertyTypeConfig(subCategory: string, mainCategory?: string): PropertyTypeConfig {
  if (subCategory && PROPERTY_TYPE_CONFIGS[subCategory]) {
    return PROPERTY_TYPE_CONFIGS[subCategory];
  }
  // Group-level defaults when no specific subtype selected
  if (mainCategory === "land") return LAND;
  if (mainCategory === "commercial") return OFFICE_CLINIC;
  return DEFAULT_CONFIG;
}

export const LAND_TYPE_OPTIONS = [
  { value: "residential", label: "سكنية" },
  { value: "commercial",  label: "تجارية" },
  { value: "agricultural",label: "زراعية" },
  { value: "industrial",  label: "صناعية" },
  { value: "investment",  label: "استثمارية" },
];

export const ALL_PROPERTY_TYPES = Object.keys(PROPERTY_TYPE_CONFIGS);
