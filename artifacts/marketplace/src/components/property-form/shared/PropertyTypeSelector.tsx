import { Tag } from "lucide-react";
import { PROPERTY_GROUPS } from "../constants";
import type { FormValues } from "../types";

interface PropertyTypeSelectorProps {
  v:   FormValues;
  set: (key: keyof FormValues, val: any) => void;
}

export function PropertyTypeSelector({ v, set }: PropertyTypeSelectorProps) {
  const activeGroup = PROPERTY_GROUPS.find((g) => g.value === v.propertyGroup);

  const handleGroupClick = (groupValue: string) => {
    if (v.propertyGroup === groupValue) return;
    set("propertyGroup", groupValue);
    set("mainCategory", "");
  };

  return (
    <div className="space-y-5">

      {/* ── الخطوة 1: نوع العقار ── */}
      <div>
        <p className="text-sm font-bold text-gray-700 mb-3">
          نوع العقار <span className="text-red-500">*</span>
        </p>
        <div className="grid grid-cols-3 gap-3">
          {PROPERTY_GROUPS.map((group) => {
            const Icon = group.icon;
            const active = v.propertyGroup === group.value;
            return (
              <button
                key={group.value}
                type="button"
                onClick={() => handleGroupClick(group.value)}
                className={`relative flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-2 font-semibold transition-all text-center ${
                  active
                    ? "border-teal-600 bg-teal-50 shadow-sm"
                    : "border-border hover:border-teal-300 hover:bg-gray-50"
                }`}
              >
                {active && (
                  <span className="absolute top-2 left-2 w-4 h-4 rounded-full bg-teal-600 flex items-center justify-center">
                    <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                )}
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center transition-colors ${
                  active ? "bg-teal-600 text-white shadow-md shadow-teal-200" : "bg-gray-100 text-gray-500"
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className={`text-sm font-bold ${active ? "text-teal-700" : "text-gray-700"}`}>
                  {group.label}
                </span>
                <span className="text-[10px] text-muted-foreground leading-tight hidden sm:block">
                  {group.desc}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── الخطوة 2: نوع الوحدة (يظهر عند اختيار المجموعة) ── */}
      {activeGroup && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-sm font-bold text-gray-700 mb-3">
            نوع الوحدة <span className="text-red-500">*</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {activeGroup.subtypes.map((sub) => {
              const SubIcon = sub.icon;
              const active = v.mainCategory === sub.value;
              return (
                <button
                  key={sub.value}
                  type="button"
                  onClick={() => set("mainCategory", sub.value)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
                    active
                      ? "border-teal-600 bg-teal-600 text-white shadow-sm"
                      : "border-border bg-white hover:border-teal-300 hover:bg-teal-50 text-gray-700"
                  }`}
                >
                  <SubIcon className="w-3.5 h-3.5 shrink-0" />
                  {sub.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── الخطوة 3: نوع الإعلان (يظهر عند اختيار نوع الوحدة) ── */}
      {v.mainCategory && (
        <div className="animate-in fade-in slide-in-from-top-2 duration-200">
          <p className="text-sm font-bold text-gray-700 mb-3">
            نوع الإعلان <span className="text-red-500">*</span>
          </p>
          <div className="grid grid-cols-2 gap-3">
            {[
              {
                value: "sale",
                label: "للبيع",
                icon: Tag,
                desc: "بيع عقارك بأفضل سعر",
                color: "amber",
              },
              {
                value: "rent",
                label: "للإيجار",
                icon: Tag,
                desc: "أجّر عقارك شهرياً أو سنوياً",
                color: "teal",
              },
            ].map((opt) => {
              const active = v.listingType === opt.value;
              return (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => set("listingType", opt.value)}
                  className={`relative flex flex-col items-start gap-1.5 p-4 rounded-2xl border-2 text-right transition-all ${
                    active
                      ? opt.value === "sale"
                        ? "border-amber-500 bg-amber-50 shadow-sm"
                        : "border-teal-600 bg-teal-50 shadow-sm"
                      : "border-border hover:border-gray-300 hover:bg-gray-50"
                  }`}
                >
                  {active && (
                    <span className={`absolute top-2 left-2 w-4 h-4 rounded-full flex items-center justify-center ${
                      opt.value === "sale" ? "bg-amber-500" : "bg-teal-600"
                    }`}>
                      <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                    </span>
                  )}
                  <span className={`text-lg font-extrabold ${
                    active
                      ? opt.value === "sale" ? "text-amber-600" : "text-teal-700"
                      : "text-gray-800"
                  }`}>
                    {opt.label}
                  </span>
                  <span className="text-xs text-muted-foreground">{opt.desc}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

    </div>
  );
}
