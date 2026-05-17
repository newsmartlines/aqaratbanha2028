import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, ChevronDown, X, Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api, type City, type Area, type Region } from "@/lib/api";

interface CityAreaSelectorProps {
  /** Currently selected city ID (null = all cities) */
  selectedCityId: number | null;
  /** Selected area IDs (multi-select) */
  selectedAreaIds: number[];
  onCityChange: (cityId: number | null, cityName: string | null) => void;
  onAreasChange: (areaIds: number[], areaNames: string[]) => void;
  /** Show "كل المدن" option */
  showAllOption?: boolean;
  /** Optional label shown above the city selector */
  label?: string;
  /** Compact mode: smaller badges */
  compact?: boolean;
}

export default function CityAreaSelector({
  selectedCityId,
  selectedAreaIds,
  onCityChange,
  onAreasChange,
  showAllOption = true,
  label,
  compact = false,
}: CityAreaSelectorProps) {
  const { data: regions = [], isLoading: regionsLoading } = useQuery({
    queryKey: ["regions"],
    queryFn: api.regions.list,
    staleTime: 5 * 60_000,
  });

  // Flatten all cities from all regions
  const allCities: City[] = regions.flatMap(r => r.cities ?? []);

  // Load areas for selected city
  const { data: areas = [], isLoading: areasLoading } = useQuery({
    queryKey: ["areas-by-city", selectedCityId],
    queryFn: () => api.locations.getAreasByCity(selectedCityId!),
    enabled: selectedCityId !== null,
    staleTime: 5 * 60_000,
  });

  // When city changes, clear selected areas
  const handleCityChange = (value: string) => {
    if (value === "all") {
      onCityChange(null, null);
      onAreasChange([], []);
    } else {
      const cityId = Number(value);
      const city = allCities.find(c => c.id === cityId);
      onCityChange(cityId, city?.nameAr ?? null);
      onAreasChange([], []);
    }
  };

  const toggleArea = (area: Area) => {
    const isSelected = selectedAreaIds.includes(area.id);
    let newIds: number[];
    if (isSelected) {
      newIds = selectedAreaIds.filter(id => id !== area.id);
    } else {
      newIds = [...selectedAreaIds, area.id];
    }
    const newNames = areas
      .filter(a => newIds.includes(a.id))
      .map(a => a.nameAr);
    onAreasChange(newIds, newNames);
  };

  const clearAreas = () => onAreasChange([], []);

  const selectedCity = allCities.find(c => c.id === selectedCityId);

  return (
    <div className="space-y-3">
      {label && (
        <p className="text-sm font-medium text-foreground">{label}</p>
      )}

      {/* City dropdown */}
      <div className="space-y-1">
        <Select
          value={selectedCityId !== null ? String(selectedCityId) : "all"}
          onValueChange={handleCityChange}
          disabled={regionsLoading}
        >
          <SelectTrigger className={compact ? "h-9 text-sm" : "h-11"}>
            <div className="flex items-center gap-2">
              {regionsLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
              ) : (
                <MapPin className="w-4 h-4 text-teal-600 shrink-0" />
              )}
              <SelectValue placeholder="اختر المدينة" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {showAllOption && <SelectItem value="all">كل المدن</SelectItem>}
            {regions.map(region => (
              <div key={region.id}>
                <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-secondary/50 sticky top-0">
                  {region.nameAr}
                </div>
                {(region.cities ?? []).map(city => (
                  <SelectItem key={city.id} value={String(city.id)}>
                    {city.nameAr}
                  </SelectItem>
                ))}
              </div>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Areas multi-select — only shown after a city is selected */}
      {selectedCityId !== null && (
        <div className="space-y-2">
          {areasLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              جار تحميل الأحياء...
            </div>
          ) : areas.length === 0 ? (
            <p className="text-sm text-muted-foreground py-1">لا توجد أحياء مسجلة لهذه المدينة</p>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground">
                  اختر الأحياء في {selectedCity?.nameAr}
                  {selectedAreaIds.length > 0 && (
                    <span className="ml-1 text-teal-600 font-medium">({selectedAreaIds.length} محدد)</span>
                  )}
                </p>
                {selectedAreaIds.length > 0 && (
                  <button
                    type="button"
                    onClick={clearAreas}
                    className="text-xs text-red-500 hover:text-red-600 hover:underline"
                  >
                    مسح الكل
                  </button>
                )}
              </div>
              <div className="flex flex-wrap gap-1.5">
                {areas.map(area => {
                  const selected = selectedAreaIds.includes(area.id);
                  return (
                    <button
                      key={area.id}
                      type="button"
                      onClick={() => toggleArea(area)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-sm border transition-all ${
                        selected
                          ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                          : "bg-background text-foreground border-border hover:border-teal-400 hover:bg-teal-50"
                      }`}
                    >
                      {selected && <Check className="w-3 h-3" />}
                      {area.nameAr}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
