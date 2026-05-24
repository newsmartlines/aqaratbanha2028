import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { FeatureIcon } from "@/components/FeatureIcon";
import { Check, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";

// ── Types ─────────────────────────────────────────────────────────────────────

export type DynFilter = {
  id: number;
  name: string;
  icon: string | null;
  filterType: string;       // checkbox | bool | select | range
  filterOptions: string | null; // JSON [{value,label}]
  filterGroup: string;
};

export type FilterOption = { value: string; label: string };

// ── Helpers ───────────────────────────────────────────────────────────────────

function parseOptions(raw: string | null | undefined): FilterOption[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}

function getSelectValue(selected: string[], name: string): string {
  const entry = selected.find((s) => s.startsWith(name + ":"));
  return entry ? entry.slice(name.length + 1) : "";
}

function setSelectValue(selected: string[], name: string, value: string): string[] {
  const without = selected.filter((s) => !s.startsWith(name + ":"));
  return value ? [...without, `${name}:${value}`] : without;
}

// Count how many filter values are active (for badge display)
export function countDynamicFilterActive(selected: string[], filters: DynFilter[]): number {
  let count = 0;
  for (const f of filters) {
    const ft = f.filterType || "checkbox";
    if (ft === "select") {
      if (getSelectValue(selected, f.name)) count++;
    } else {
      if (selected.includes(f.name)) count++;
    }
  }
  return count;
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface DynamicFilterPanelProps {
  group: string;          // residential | commercial | land | all
  category?: string;      // mainCategory Arabic name (e.g. "شقة", "أرض زراعية")
  selected: string[];
  onChange: (vals: string[]) => void;
  featureType?: "feature" | "service";
  compact?: boolean;      // true = search sidebar style, false = form style
}

// ── Component ─────────────────────────────────────────────────────────────────

export function DynamicFilterPanel({
  group,
  category = "",
  selected,
  onChange,
  featureType = "feature",
  compact = false,
}: DynamicFilterPanelProps) {
  const { data: filters = [], isLoading } = useQuery<DynFilter[]>({
    queryKey: ["dynamic-filters", group, category, featureType],
    queryFn:  () => api.propertyFeatures.dynamicFilters(group, category, featureType),
    staleTime: 5 * 60_000,
    enabled:  !!group,
  });

  if (isLoading || filters.length === 0) return null;

  const toggle = (name: string) => {
    onChange(selected.includes(name)
      ? selected.filter((s) => s !== name)
      : [...selected, name]);
  };

  const handleSelect = (name: string, value: string) => {
    onChange(setSelectValue(selected, name, value));
  };

  // ── Compact mode (search sidebar) ─────────────────────────────────────────
  if (compact) {
    // Separate selects and checkboxes for better layout
    const selects    = filters.filter((f) => (f.filterType || "checkbox") === "select");
    const checkboxes = filters.filter((f) => (f.filterType || "checkbox") !== "select");

    return (
      <div className="space-y-2.5" dir="rtl">
        {/* Select-type filters */}
        {selects.map((f) => {
          const options = parseOptions(f.filterOptions);
          const currentVal = getSelectValue(selected, f.name);
          return (
            <div key={f.id} className="space-y-1">
              <div className="flex items-center gap-1.5">
                <FeatureIcon name={f.icon} className="w-3.5 h-3.5 text-zinc-400" />
                <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-wide">{f.name}</span>
                {currentVal && (
                  <button
                    onClick={() => handleSelect(f.name, "")}
                    className="mr-auto text-zinc-400 hover:text-red-500 transition-colors"
                  >
                    <X className="w-3 h-3" />
                  </button>
                )}
              </div>
              <Select value={currentVal || "_all_"} onValueChange={(v) => handleSelect(f.name, v === "_all_" ? "" : v)}>
                <SelectTrigger className={cn(
                  "h-8 text-xs rounded-xl border-zinc-200",
                  currentVal && "border-primary text-primary bg-primary/5"
                )}>
                  <SelectValue placeholder="الكل" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all_">الكل</SelectItem>
                  {options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          );
        })}

        {/* Checkbox/bool-type filters */}
        {checkboxes.length > 0 && (
          <div className="grid grid-cols-2 gap-1.5">
            {checkboxes.map((f) => {
              const active = selected.includes(f.name);
              return (
                <button
                  key={f.id}
                  onClick={() => toggle(f.name)}
                  className={cn(
                    "flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-semibold border transition-all",
                    active
                      ? "bg-primary/8 border-primary text-primary"
                      : "border-zinc-200 text-zinc-600 bg-white hover:border-primary/40"
                  )}
                >
                  <FeatureIcon name={f.icon} className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate flex-1 text-right">{f.name}</span>
                  {active && <Check className="w-3 h-3 shrink-0" />}
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // ── Form mode ─────────────────────────────────────────────────────────────
  const selects    = filters.filter((f) => (f.filterType || "checkbox") === "select");
  const checkboxes = filters.filter((f) => (f.filterType || "checkbox") !== "select");

  return (
    <div className="space-y-4" dir="rtl">
      {/* Select-type filters (shown as labeled rows) */}
      {selects.length > 0 && (
        <div className="space-y-3">
          {selects.map((f) => {
            const options    = parseOptions(f.filterOptions);
            const currentVal = getSelectValue(selected, f.name);
            return (
              <div key={f.id} className="flex items-center gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <div className={cn(
                    "w-7 h-7 rounded-lg flex items-center justify-center shrink-0",
                    currentVal ? "bg-teal-600/10" : "bg-secondary"
                  )}>
                    <FeatureIcon
                      name={f.icon}
                      className={cn("w-3.5 h-3.5", currentVal ? "text-teal-600" : "text-muted-foreground")}
                    />
                  </div>
                  <span className={cn(
                    "text-sm font-semibold shrink-0",
                    currentVal ? "text-teal-700" : "text-foreground"
                  )}>{f.name}</span>
                </div>
                <div className="flex items-center gap-1 flex-1">
                  <Select value={currentVal || "_none_"} onValueChange={(v) => handleSelect(f.name, v === "_none_" ? "" : v)}>
                    <SelectTrigger className={cn(
                      "h-10 rounded-xl flex-1",
                      currentVal && "border-teal-400 text-teal-700"
                    )}>
                      <SelectValue placeholder="اختر..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none_">غير محدد</SelectItem>
                      {options.map((o) => (
                        <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {currentVal && (
                    <button
                      type="button"
                      onClick={() => handleSelect(f.name, "")}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-zinc-400 hover:text-red-500 hover:bg-red-50 transition-colors shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Checkbox/bool-type filters (grid) */}
      {checkboxes.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {checkboxes.map((f) => {
            const active = selected.includes(f.name);
            return (
              <button
                key={f.id}
                type="button"
                onClick={() => toggle(f.name)}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all",
                  active
                    ? "border-teal-600 bg-teal-50 text-teal-700"
                    : "border-border hover:border-teal-200 text-foreground"
                )}
              >
                <div className={cn(
                  "w-6 h-6 rounded-md flex items-center justify-center shrink-0",
                  active ? "bg-teal-600/10" : "bg-secondary"
                )}>
                  <FeatureIcon
                    name={f.icon}
                    className={cn("w-3.5 h-3.5", active ? "text-teal-600" : "text-muted-foreground")}
                  />
                </div>
                {f.name}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
