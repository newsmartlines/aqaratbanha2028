import { PropertyTypeSelector } from "../shared/PropertyTypeSelector";
import type { FormValues } from "../types";
import type { FieldErrors } from "../use-step-validation";

interface Step1TypeProps {
  v:                    FormValues;
  set:                  (key: keyof FormValues, val: any) => void;
  onMainCategoryChange?: (cat: string) => void;
  fieldErrors?:         FieldErrors;
}

export function Step1Type({ v, set, onMainCategoryChange, fieldErrors }: Step1TypeProps) {
  return (
    <PropertyTypeSelector
      v={v}
      set={set}
      onMainCategoryChange={onMainCategoryChange}
      fieldErrors={fieldErrors}
    />
  );
}
