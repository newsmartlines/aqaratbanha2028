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

export const PROPERTY_TYPE_CONFIGS: Record<string, PropertyTypeConfig> = {
  "شقة":          RESIDENTIAL_FULL,
  "دوبلكس":       RESIDENTIAL_FULL,
  "استوديو":      RESIDENTIAL_FULL,
  "روف":          RESIDENTIAL_FULL,
  "غرفة":         RESIDENTIAL_FULL,
  "فيلا":         VILLA,
  "استراحة":      VILLA,
  "عمارة":        BUILDING,
  "مكتب":         OFFICE_CLINIC,
  "عيادة":        OFFICE_CLINIC,
  "محل تجاري":   SHOP_MALL,
  "مجمع تجاري":  SHOP_MALL,
  "فندق":         HOTEL,
  "مستودع":       WAREHOUSE,
  "أرض سكنية":   LAND,
  "أرض تجارية":  LAND,
  "أرض زراعية":  LAND,
  "أرض صناعية":  LAND,
};

export function getPropertyTypeConfig(mainCategory: string): PropertyTypeConfig {
  return PROPERTY_TYPE_CONFIGS[mainCategory] ?? DEFAULT_CONFIG;
}

export const LAND_TYPE_OPTIONS = [
  { value: "residential", label: "سكنية" },
  { value: "commercial",  label: "تجارية" },
  { value: "agricultural",label: "زراعية" },
  { value: "industrial",  label: "صناعية" },
  { value: "investment",  label: "استثمارية" },
];

export const ALL_PROPERTY_TYPES = Object.keys(PROPERTY_TYPE_CONFIGS);
