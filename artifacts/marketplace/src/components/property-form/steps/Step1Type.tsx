import { Building2, Tag } from "lucide-react";
import { Label } from "@/components/ui/label";
import { TileButton } from "../shared/TileButton";
import { PROPERTY_TYPES } from "../constants";
import type { FormValues } from "../types";

interface Step1TypeProps {
  v:   FormValues;
  set: (key: keyof FormValues, val: any) => void;
}

export function Step1Type({ v, set }: Step1TypeProps) {
  return (
    <div className="space-y-6">
      {/* نوع الإعلان */}
      <div>
        <Label className="text-base font-bold mb-4 block">
          نوع الإعلان <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-2 gap-4">
          {[
            { value: "sale", label: "للبيع",   icon: Tag,       desc: "بيع عقارك بأفضل سعر" },
            { value: "rent", label: "للإيجار", icon: Building2, desc: "أجّر عقارك شهرياً أو سنوياً" },
          ].map((opt) => (
            <TileButton
              key={opt.value}
              active={v.listingType === opt.value}
              onClick={() => set("listingType", opt.value)}
              className="p-5"
            >
              <p className={`text-xl font-bold mb-1 ${v.listingType === opt.value ? "text-teal-700" : ""}`}>
                {opt.label}
              </p>
              <p className="text-xs text-muted-foreground">{opt.desc}</p>
            </TileButton>
          ))}
        </div>
      </div>

      {/* نوع العقار */}
      <div>
        <Label className="text-base font-bold mb-4 block">
          نوع العقار <span className="text-red-500">*</span>
        </Label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {PROPERTY_TYPES.map((type) => {
            const Icon   = type.icon;
            const active = v.mainCategory === type.value;
            return (
              <TileButton
                key={type.value}
                active={active}
                onClick={() => set("mainCategory", type.value)}
                className="p-4 flex flex-col items-center gap-2 text-center"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  active ? "bg-teal-600 text-white" : "bg-secondary text-muted-foreground"
                }`}>
                  <Icon className="w-5 h-5" />
                </div>
                <p className={`text-sm font-semibold ${active ? "text-teal-700" : ""}`}>
                  {type.label}
                </p>
                <p className="text-[10px] text-muted-foreground hidden sm:block">{type.desc}</p>
              </TileButton>
            );
          })}
        </div>
      </div>
    </div>
  );
}
