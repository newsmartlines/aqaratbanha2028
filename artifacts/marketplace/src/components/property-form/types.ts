export type FormMode = "user" | "company";

export interface PropertyFormWizardProps {
  mode: FormMode;
  backPath: string;
  showPlans?: boolean;
}

export interface FormValues {
  listingType:    string;
  propertyGroup:  string;
  mainCategory:   string;
  title:          string;
  description:    string;
  price:          string;
  area:           string;
  rooms:          string;
  bathrooms:      string;
  floor:          string;
  totalFloors:    string;
  buildYear:      string;
  finishing:      string;
  furnished:      string;
  paymentMethod:  string;
  condition:      string;
  advertiserType: string;
  compound:       string;
  facade:         string;
  direction:      string;
  features:       string[];
  nearbyServices: string[];
  city:           string;
  district:       string;
  address:        string;
  street:         string;
  latitude:       string;
  longitude:      string;
  contactName:    string;
  phone:          string;
  contactMethod:  string[];
  videoUrl:       string;
  images:         string[];
  // Land-specific fields
  landType:       string;
  landWidth:      string;
  landDepth:      string;
  buildRatio:     string;
}

export interface DynFeature {
  id:              number;
  name:            string;
  icon:            string | null;
  applicableTypes?: string | null;
}

export interface PropertyTypeConfig {
  showRooms:          boolean;
  roomsLabel:         string;
  showBathrooms:      boolean;
  showFloor:          boolean;
  floorLabel:         string;
  showTotalFloors:    boolean;
  showBuildYear:      boolean;
  showFinishing:      boolean;
  showFurnished:      boolean;
  showCondition:      boolean;
  showDirection:      boolean;
  showFacade:         boolean;
  showPaymentMethod:  boolean;
  showLandType:       boolean;
  showLandDimensions: boolean;
  showBuildRatio:     boolean;
  isLand:             boolean;
  isCommercial:       boolean;
}
