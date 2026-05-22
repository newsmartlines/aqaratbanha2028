import { UseFormRegister } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { TileButton } from "../shared/TileButton";
import { ADVERTISER_TYPES, FINISHING, CONDITIONS, DIRECTIONS } from "../constants";
import type { FormValues, DynFeature } from "../types";

interface Step2DetailsProps {
  v:             FormValues;
  set:           (key: keyof FormValues, val: any) => void;
  register:      UseFormRegister<FormValues>;
  toggleArr:     (key: "features" | "nearbyServices", val: string) => void;
  isCompany:     boolean;
  showRoomFields: boolean;
  amenitiesData: DynFeature[];
  servicesData:  DynFeature[];
}

export function Step2Details({
  v, set, register, toggleArr,
  isCompany, showRoomFields, amenitiesData, servicesData,
}: Step2DetailsProps) {
  return (
    <div className="space-y-6">

      {/* ── Company only: نوع المعلن ─────────────────────────── */}
      {isCompany && (
        <div>
          <Label className="text-sm font-semibold mb-3 block">نوع المعلن</Label>
          <div className="grid grid-cols-2 gap-2">
            {ADVERTISER_TYPES.map((at) => (
              <TileButton
                key={at.value}
                active={v.advertiserType === at.value}
                onClick={() => set("advertiserType", at.value)}
                className="px-4 py-2.5"
              >
                <span className={`text-sm font-medium ${
                  v.advertiserType === at.value ? "text-teal-700" : ""
                }`}>{at.label}</span>
              </TileButton>
            ))}
          </div>
        </div>
      )}

      {/* عنوان الإعلان */}
      <div>
        <Label htmlFor="f-title" className="text-base font-bold mb-2 block">
          عنوان الإعلان <span className="text-red-500">*</span>
        </Label>
        <Input
          id="f-title"
          placeholder="مثال: شقة 3 غرف للبيع في حي النزهة ببنها"
          {...register("title")}
          className="h-12 rounded-xl text-base"
        />
        <p className="text-xs text-muted-foreground mt-1.5">عنوان واضح يجذب أكثر مشترين</p>
      </div>

      {/* ── Company only: اسم المشروع ─────────────────────── */}
      {isCompany && (
        <div>
          <Label htmlFor="f-compound" className="text-sm font-semibold mb-2 block">
            اسم المشروع / المجمع
          </Label>
          <Input
            id="f-compound"
            placeholder="مثال: كمبوند الياسمين، مشروع النيل سيتي..."
            {...register("compound")}
            className="h-11 rounded-xl"
          />
        </div>
      )}

      {/* السعر والمساحة */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="f-price" className="text-sm font-semibold mb-2 block">
            السعر (ج.م)
          </Label>
          <Input
            id="f-price" type="number" placeholder="850,000"
            {...register("price")} className="h-11 rounded-xl"
          />
        </div>
        <div>
          <Label htmlFor="f-area" className="text-sm font-semibold mb-2 block">
            المساحة (م²) <span className="text-red-500">*</span>
          </Label>
          <Input
            id="f-area" type="number" placeholder="120"
            {...register("area")} className="h-11 rounded-xl"
          />
        </div>
      </div>

      {/* تفاصيل الوحدة */}
      {showRoomFields && (
        <div>
          <Label className="text-sm font-semibold mb-3 block">تفاصيل الوحدة</Label>
          <div className="grid grid-cols-3 gap-3">
            {[
              { id: "rooms",     label: "الغرف",    placeholder: "3" },
              { id: "bathrooms", label: "الحمامات", placeholder: "2" },
              { id: "floor",     label: "الطابق",   placeholder: "3" },
            ].map((f) => (
              <div key={f.id}>
                <p className="text-xs text-muted-foreground mb-1.5">{f.label}</p>
                <Input
                  type="number"
                  placeholder={f.placeholder}
                  {...register(f.id as keyof FormValues)}
                  className="h-11 rounded-xl text-center"
                />
              </div>
            ))}
          </div>
          <div className={`grid gap-3 mt-3 ${isCompany ? "grid-cols-2" : "grid-cols-1 max-w-[33%]"}`}>
            <div>
              <p className="text-xs text-muted-foreground mb-1.5">إجمالي الأدوار</p>
              <Input
                type="number" placeholder="10"
                {...register("totalFloors")} className="h-11 rounded-xl text-center"
              />
            </div>
            {/* ── Company only: سنة البناء ─── */}
            {isCompany && (
              <div>
                <p className="text-xs text-muted-foreground mb-1.5">سنة البناء</p>
                <Input
                  type="number" placeholder="2022"
                  {...register("buildYear")} className="h-11 rounded-xl text-center"
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* التشطيب والأثاث */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-sm font-semibold mb-2 block">حالة التشطيب</Label>
          <Select value={v.finishing} onValueChange={(val) => set("finishing", val)}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="اختر..." />
            </SelectTrigger>
            <SelectContent>
              {FINISHING.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  <span className="font-medium">{f.label}</span>
                  <span className="text-xs text-muted-foreground mr-2">{f.desc}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {showRoomFields && (
          <div>
            <Label className="text-sm font-semibold mb-2 block">الأثاث</Label>
            <Select value={v.furnished} onValueChange={(val) => set("furnished", val)}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="اختر..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="furnished">مفروشة بالكامل</SelectItem>
                <SelectItem value="semi_furnished">نصف مفروشة</SelectItem>
                <SelectItem value="unfurnished">غير مفروشة</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* ── Company only: حالة العقار + الاتجاه ─────────── */}
      {isCompany && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-semibold mb-2 block">حالة العقار</Label>
            <Select value={v.condition} onValueChange={(val) => set("condition", val)}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="اختر..." />
              </SelectTrigger>
              <SelectContent>
                {CONDITIONS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-sm font-semibold mb-2 block">اتجاه العقار</Label>
            <Select value={v.direction} onValueChange={(val) => set("direction", val)}>
              <SelectTrigger className="h-11 rounded-xl">
                <SelectValue placeholder="اختر..." />
              </SelectTrigger>
              <SelectContent>
                {DIRECTIONS.map((d) => (
                  <SelectItem key={d} value={d}>{d}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* فترة الإيجار (إذا كان النوع إيجار) */}
      {v.listingType === "rent" && (
        <div>
          <Label className="text-sm font-semibold mb-2 block">فترة الإيجار</Label>
          <Select value={v.paymentMethod} onValueChange={(val) => set("paymentMethod", val)}>
            <SelectTrigger className="h-11 rounded-xl">
              <SelectValue placeholder="اختر..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">يومي</SelectItem>
              <SelectItem value="monthly">شهري</SelectItem>
              <SelectItem value="quarterly">ربع سنوي</SelectItem>
              <SelectItem value="yearly">سنوي</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* مميزات العقار — dynamic from DB */}
      {amenitiesData.length > 0 && (
        <div>
          <Label className="text-sm font-semibold mb-3 block">مميزات العقار</Label>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {amenitiesData.map((am) => {
              const active = (v.features as string[]).includes(am.name);
              return (
                <button
                  key={am.id} type="button"
                  onClick={() => toggleArr("features", am.name)}
                  className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                    active
                      ? "border-teal-600 bg-teal-50 text-teal-700"
                      : "border-border hover:border-teal-200 text-foreground"
                  }`}
                >
                  <span className="text-base shrink-0 leading-none">{am.icon ?? "🏠"}</span>
                  {am.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* الخدمات الطرفية — dynamic from DB */}
      {servicesData.length > 0 && (
        <div>
          <Label className="text-sm font-semibold mb-3 block">الخدمات الطرفية القريبة</Label>
          <div className="flex flex-wrap gap-2">
            {servicesData.map((svc) => {
              const active = (v.nearbyServices as string[]).includes(svc.name);
              return (
                <button
                  key={svc.id} type="button"
                  onClick={() => toggleArr("nearbyServices", svc.name)}
                  className={`px-3 py-1.5 rounded-full border text-xs font-medium transition-all flex items-center gap-1 ${
                    active
                      ? "border-teal-600 bg-teal-50 text-teal-700"
                      : "border-border hover:border-teal-300 text-foreground"
                  }`}
                >
                  <span className="text-sm leading-none">{svc.icon ?? ""}</span>
                  {svc.name}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* وصف العقار */}
      <div>
        <Label htmlFor="f-desc" className="text-sm font-semibold mb-2 block">وصف العقار</Label>
        <Textarea
          id="f-desc"
          placeholder="صف العقار بالتفصيل — الموقع، المميزات، حالة العقار..."
          {...register("description")}
          className="rounded-xl min-h-28 resize-none"
          rows={4}
          maxLength={2000}
        />
        <p className="text-xs text-muted-foreground mt-1 text-left" dir="ltr">
          {(v.description ?? "").length}/2000
        </p>
      </div>
    </div>
  );
}
