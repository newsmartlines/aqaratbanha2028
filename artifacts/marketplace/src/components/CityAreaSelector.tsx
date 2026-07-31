import { useQuery } from "@tanstack/react-query";
import { MapPin, Loader2 } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { api, type City, type Region } from "@/lib/api";

interface CityAreaSelectorProps {
  selectedCityId: number | null;
  onCityChange: (cityId: number | null, cityName: string | null) => void;
  showAllOption?: boolean;
  label?: string;
  compact?: boolean;
  regionFilterId?: number | null;
  selectedAreaIds?: number[];
  onAreasChange?: (areaIds: number[], areaNames: string[]) => void;
}

export default function CityAreaSelector({
  selectedCityId,
  onCityChange,
  showAllOption = true,
  label,
  compact = false,
  regionFilterId = null,
}: CityAreaSelectorProps) {
  const { data: regions = [], isLoading: regionsLoading } = useQuery({
    queryKey: ["regions"],
    queryFn: api.regions.list,
    staleTime: 5 * 60_000,
  });

  const regionsForCities = regionFilterId != null
    ? regions.filter(r => r.id === regionFilterId)
    : regions;

  const allCities: City[] = regionsForCities.flatMap(r => r.cities ?? []);

  const handleCityChange = (value: string) => {
    if (value === "all") {
      onCityChange(null, null);
    } else {
      const cityId = Number(value);
      const city = allCities.find(c => c.id === cityId);
      onCityChange(cityId, city?.nameAr ?? null);
    }
  };

  return (
    <div className="space-y-3">
      {label && (
        <p className="text-sm font-medium text-foreground">{label}</p>
      )}

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
            {regionsForCities.map(region => (
              <div key={region.id}>
                {regionFilterId == null && (
                  <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground bg-secondary/50 sticky top-0">
                    {region.nameAr}
                  </div>
                )}
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
    </div>
  );
}
