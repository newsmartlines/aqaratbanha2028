import { PropertyTypeSelector } from "../shared/PropertyTypeSelector";
import type { FormValues } from "../types";

interface Step1TypeProps {
  v:                    FormValues;
  set:                  (key: keyof FormValues, val: any) => void;
  onMainCategoryChange?: (cat: string) => void;
}

export function Step1Type({ v, set, onMainCategoryChange }: Step1TypeProps) {
  return <PropertyTypeSelector v={v} set={set} onMainCategoryChange={onMainCategoryChange} />;
}
