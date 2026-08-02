import { AlertCircle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { UseFormSetValue } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { MapPicker } from "../shared/MapPicker";
import { AddressAutocomplete } from "../shared/AddressAutocomplete";
import type { FormValues } from "../types";
import type { FieldErrors } from "../use-step-validation";

interface Step3LocationProps {
  v:            FormValues;
  set:          (key: keyof FormValues, val: any) => void;
  register?:    unknown;
  setValue:     UseFormSetValue<FormValues>;
  fieldErrors?: FieldErrors;
}

interface AreaRow  { id: number; nameAr: string; enabled: boolean; cityId: number }
interface CityRow  { id: number; nameAr: string; enabled: boolean; regionId: number; areas: AreaRow[] }
interface RegionRow { id: number; nameAr: string; enabled: boolean; cities: CityRow[] }

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="mt-1.5 flex items-center gap-1 text-sm text-red-600" role="alert">
      <AlertCircle className="w-3.5 h-3.5 shrink-0" />
      {msg}
    </p>
  );
}

export function Step3Location({ v, set, setValue, fieldErrors = {} }: Step3LocationProps) {
  const { data: regions = [] } = useQuery<RegionRow[]>({
    queryKey: ["regions-public"],
    queryFn: async () => {
      const r = await fetch("/api/regions", { credentials: "include" });
      return (await r.json()).data ?? [];
    },
    staleTime: 10 * 60_000,
  });

  const allAreas: AreaRow[] = regions.flatMap(reg =>
    (reg.cities ?? []).flatMap(city => city.areas ?? [])
  );

  const hasDistrictError = !!fieldErrors.district;

  return (
    <div className="space-y-5">
      {/* المنطقة */}
      <div data-field="district">
        <Label htmlFor="f-district" className="text-base font-bold mb-3 block">
          المنطقة <span className="text-red-500" aria-hidden="true">*</span>
          <span className="sr-only"> (مطلوب)</span>
        </Label>
        {allAreas.length === 0 ? (
          <p className="text-sm text-muted-foreground">جارٍ تحميل المناطق...</p>
        ) : (
          <select
            id="f-district"
            value={v.district ?? ""}
            onChange={(e) => set("district", e.target.value)}
            aria-invalid={hasDistrictError}
            className={`w-full h-11 rounded-xl border bg-white px-3 text-sm font-medium text-right focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500 transition-colors ${
              hasDistrictError
                ? "border-red-400 focus:ring-red-400 focus:border-red-400"
                : "border-input"
            }`}
            dir="rtl"
          >
            <option value="">— اختر المنطقة —</option>
            {allAreas.map((area) => (
              <option key={area.id} value={area.nameAr}>{area.nameAr}</option>
            ))}
          </select>
        )}
        <FieldError msg={fieldErrors.district} />
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
