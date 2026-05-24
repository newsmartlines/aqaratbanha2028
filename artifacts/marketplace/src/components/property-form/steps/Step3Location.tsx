import { useQuery } from "@tanstack/react-query";
import { UseFormSetValue } from "react-hook-form";
import { Label } from "@/components/ui/label";
import { MapPicker } from "../shared/MapPicker";
import { AddressAutocomplete } from "../shared/AddressAutocomplete";
import type { FormValues } from "../types";

interface Step3LocationProps {
  v:        FormValues;
  set:      (key: keyof FormValues, val: any) => void;
  register?: unknown;
  setValue: UseFormSetValue<FormValues>;
}

interface AreaRow  { id: number; nameAr: string; enabled: boolean; cityId: number }
interface CityRow  { id: number; nameAr: string; enabled: boolean; regionId: number; areas: AreaRow[] }
interface RegionRow { id: number; nameAr: string; enabled: boolean; cities: CityRow[] }

export function Step3Location({ v, set, setValue }: Step3LocationProps) {
  const { data: regions = [] } = useQuery<RegionRow[]>({
    queryKey: ["regions-public"],
    queryFn: async () => {
      const r = await fetch("/api/regions", { credentials: "include" });
      return (await r.json()).data ?? [];
    },
    staleTime: 10 * 60_000,
  });

  const allCities: CityRow[] = regions.flatMap(reg => reg.cities ?? []);
  const selectedCityObj = allCities.find(c => c.nameAr === v.city);
  const areas = selectedCityObj?.areas ?? [];

  return (
    <div className="space-y-5">
      {/* اختيار المدينة */}
      <div>
        <Label className="text-base font-bold mb-4 block">
          المدينة <span className="text-red-500">*</span>
        </Label>
        {allCities.length === 0 ? (
          <p className="text-sm text-muted-foreground">جارٍ تحميل المدن...</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {allCities.map((city) => (
              <button
                key={city.id} type="button"
                onClick={() => { set("city", city.nameAr); set("district", ""); }}
                className={`py-3 rounded-xl border-2 text-sm font-semibold transition-all ${
                  v.city === city.nameAr
                    ? "border-teal-600 bg-teal-50 text-teal-700"
                    : "border-border hover:border-teal-300 hover:bg-secondary/40"
                }`}
              >
                {city.nameAr}
              </button>
            ))}
          </div>
        )}
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
          disabled={!v.city || areas.length === 0}
        >
          <option value="">— اختر المنطقة —</option>
          {areas.map((area) => (
            <option key={area.id} value={area.nameAr}>{area.nameAr}</option>
          ))}
        </select>
        {v.city && areas.length === 0 && (
          <p className="text-xs text-muted-foreground mt-1">لا توجد مناطق مسجّلة لهذه المدينة</p>
        )}
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
