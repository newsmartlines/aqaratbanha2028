import { PropertyTypeSelector } from "../shared/PropertyTypeSelector";
import type { FormValues } from "../types";

interface Step1TypeProps {
  v:   FormValues;
  set: (key: keyof FormValues, val: any) => void;
}

export function Step1Type({ v, set }: Step1TypeProps) {
  return <PropertyTypeSelector v={v} set={set} />;
}
