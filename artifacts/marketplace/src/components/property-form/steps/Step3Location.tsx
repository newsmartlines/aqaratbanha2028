import { UseFormSetValue } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { MapPicker } from "../shared/MapPicker";
import { AddressAutocomplete } from "../shared/AddressAutocomplete";
import { CITIES, CITY_AREAS } from "../constants";
import type { FormValues } from "../types";

interface Step3LocationProps {
  v:        FormValues;
  set:      (key: keyof FormValues, val: any) => void;
  register?: unknown;
  setValue: UseFormSetValue<FormValues>;
}

export function Step3Location({ v, set, setValue }: Step3LocationProps) {
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

      {/* المنطقة */}
      <div>
        <Label htmlFor="f-district" className="text-sm font-semibold mb-2 block">
          المنطقة
        </Label>
        <select
          id="f-district"
          value={v.district ?? ""}
          onChange={(e) => set("district", e.target.value)}
          className="w-full h-11 rounded-xl border border-input bg-white px-3 text-sm font-medium text-right focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          dir="rtl"
        >
          <option value="">— اختر المنطقة —</option>
          {(CITY_AREAS[v.city] ?? []).map((area) => (
            <option key={area} value={area}>{area}</option>
          ))}
        </select>
      </div>

      {/* العنوان التفصيلي مع اقتراحات تلقائية */}
      <div>
        <Label htmlFor="f-address" className="text-sm font-semibold mb-2 block">
          العنوان التفصيلي
        </Label>
        <AddressAutocomplete
          id="f-address"
          placeholder="ابحث عن العنوان أو اكتب تفاصيل الموقع..."
          value={v.address ?? ""}
          onChange={(val) => setValue("address", val)}
          onSelect={(lat, lng, displayName) => {
            setValue("address", displayName);
            setValue("latitude", String(lat));
            setValue("longitude", String(lng));
          }}
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
