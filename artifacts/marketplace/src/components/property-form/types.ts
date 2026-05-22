export type FormMode = "user" | "company";

export interface PropertyFormWizardProps {
  mode: FormMode;
  backPath: string;
  showPlans?: boolean;
}

export interface FormValues {
  listingType:    string;
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
  phone:          string;
  whatsapp:       string;
  videoUrl:       string;
  images:         string[];
}

export interface DynFeature {
  id:   number;
  name: string;
  icon: string | null;
}
