import { UseFormRegister, UseFormSetValue } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { MapPicker } from "../shared/MapPicker";
import { CITIES } from "../constants";
import type { FormValues } from "../types";

interface Step3LocationProps {
  v:        FormValues;
  set:      (key: keyof FormValues, val: any) => void;
  register: UseFormRegister<FormValues>;
  setValue: UseFormSetValue<FormValues>;
}

export function Step3Location({ v, set, register, setValue }: Step3LocationProps) {
  return (
    <div className="space-y-5">
      {/* اختيار المدينة */}
      <div>
        <Label className="text-base font-bold mb-4 block">
          المدينة <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {CITIES.map((city) => (
            <button
              key={city} type="button"
              onClick={() => set("city", city)}
              className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                v.city === city
                  ? "border-teal-600 bg-teal-50 text-teal-700"
                  : "border-border hover:border-teal-300 hover:bg-secondary/40"
              }`}
            >
              {city}
            </button>
          ))}
        </div>
      </div>

      {/* الحي والشارع */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="f-district" className="text-sm font-semibold mb-2 block">
            الحي / المنطقة
          </Label>
          <Input
            id="f-district"
            placeholder="حي النزهة، حي الزهراء..."
            {...register("district")}
            className="h-11 rounded-xl"
          />
        </div>
        <div>
          <Label htmlFor="f-street" className="text-sm font-semibold mb-2 block">
            اسم الشارع
          </Label>
          <Input
            id="f-street"
            placeholder="شارع الجمهورية..."
            {...register("street")}
            className="h-11 rounded-xl"
          />
        </div>
      </div>

      {/* العنوان التفصيلي */}
      <div>
        <Label htmlFor="f-address" className="text-sm font-semibold mb-2 block">
          العنوان التفصيلي
        </Label>
        <Input
          id="f-address"
          placeholder="مثال: بجوار المسجد الكبير، أمام البنك الأهلي..."
          {...register("address")}
          className="h-11 rounded-xl"
        />
      </div>

      {/* الخريطة */}
      <MapPicker
        lat={v.latitude}
        lng={v.longitude}
        onPick={(lat, lng) => {
          setValue("latitude",  String(lat));
          setValue("longitude", String(lng));
        }}
        onClear={() => {
          setValue("latitude",  "");
          setValue("longitude", "");
        }}
      />
    </div>
  );
}
