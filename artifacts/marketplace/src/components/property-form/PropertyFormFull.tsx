import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Building2, CheckCircle2, CreditCard, Loader2, ImagePlus, X } from "lucide-react";
import { useLocation } from "wouter";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { FormSection } from "./shared/FormSection";
import { PropertyTypeSelector } from "./shared/PropertyTypeSelector";
import { FeatureIcon } from "@/components/FeatureIcon";
import { DynamicFilterPanel } from "./DynamicFilterPanel";
import { MapPicker } from "./shared/MapPicker";
import { AddressAutocomplete } from "./shared/AddressAutocomplete";
import { PaymentDialog } from "./shared/PaymentDialog";
import { Step5Plans } from "./steps/Step5Plans";
import { usePropertyForm } from "./use-property-form";
import {
  ADVERTISER_TYPES, FINISHING, CONDITIONS,
  DIRECTIONS,
} from "./constants";

import { LAND_TYPE_OPTIONS, getPropertyTypeConfig } from "./property-type-config";
import type { PropertyFormWizardProps } from "./types";

interface AreaRow   { id: number; nameAr: string; enabled: boolean; cityId: number }
interface CityRow   { id: number; nameAr: string; enabled: boolean; regionId: number; areas: AreaRow[] }
interface RegionRow { id: number; nameAr: string; enabled: boolean; cities: CityRow[] }

export function PropertyFormFull({ mode, backPath, showPlans = false, editPropertyId, initialData }: PropertyFormWizardProps) {
  const [, setLocation] = useLocation();
  const [view, setView] = useState<"form" | "plans" | "success">("form");

  const form = usePropertyForm(mode, backPath, showPlans, editPropertyId, initialData);
  const {
    isCompany, isEditMode, accountType,
    submitting, error,
    uploading, selectedPlan, setSelectedPlan,
    showPayment, setShowPayment,
    fileInputRef,
    register, setValue,
    v,
    plans, plansLoading,
    amenitiesData, servicesData,
    set, setMainCategory, toggleArr, removeImage,
    handleFileUpload,
    handlePaymentSuccess,
    handleSubmit,
    handleReset,
    goBack,
  } = form;

  const cfg = getPropertyTypeConfig(v.mainCategory);

  const { data: regions = [] } = useQuery<RegionRow[]>({
    queryKey: ["regions-public"],
    queryFn: async () => {
      const r = await fetch("/api/regions", { credentials: "include" });
      return (await r.json()).data ?? [];
    },
    staleTime: 10 * 60_000,
  });
  const locationAreas: AreaRow[] = regions.flatMap(reg => (reg.cities ?? []).flatMap(c => c.areas ?? []));

  const isFormUnlocked = !!v.propertyGroup && !!v.mainCategory && !!v.listingType;

  const canSubmitForm = !!v.listingType && !!v.mainCategory && !!v.title && !!v.area && !!v.phone;


  const handleFormNext = () => {
    if (!canSubmitForm) return;
    if (showPlans) {
      setView("plans");
      window.scrollTo({ top: 0, behavior: "smooth" });
    } else {
      handleSubmit();
    }
  };

  // ── Success ────────────────────────────────────────────────────────────────

  if (view === "success" || form.success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-6">
        <div className="max-w-md w-full text-center">
          <div className="w-24 h-24 rounded-full bg-teal-100 flex items-center justify-center mx-auto mb-6 shadow-sm">
            <CheckCircle2 className="w-12 h-12 text-teal-600" />
          </div>
          {isEditMode ? (
            <>
              <h2 className="text-2xl font-bold mb-2">تم تحديث إعلانك!</h2>
              <p className="text-muted-foreground mb-1">
                سيُراجع إعلانك من قبل فريقنا إن لزم، ثم يُعاد نشره تلقائياً.
              </p>
              <p className="text-sm text-muted-foreground mb-8">ستصلك إشعار فور الموافقة على التعديلات.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setLocation("/dashboard/properties")}
                  className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-11 px-6 font-semibold transition-colors"
                >
                  <Building2 className="w-4 h-4" />
                  عقاراتي
                </button>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold mb-2">تم إرسال إعلانك!</h2>
              <p className="text-muted-foreground mb-1">
                سيتم مراجعة إعلانك من قبل فريقنا وسيُنشر بعد الموافقة.
              </p>
              {showPlans && selectedPlan && parseFloat(selectedPlan.price) > 0 && (
                <p className="text-sm text-teal-600 font-medium mb-1">
                  تم تفعيل باقة {selectedPlan.nameAr ?? selectedPlan.name} بنجاح.
                </p>
              )}
              <p className="text-sm text-muted-foreground mb-8">ستصلك إشعار فور الموافقة على إعلانك.</p>
              <div className="flex flex-col sm:flex-row justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setLocation("/dashboard/properties")}
                  className="flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white rounded-xl h-11 px-6 font-semibold transition-colors"
                >
                  <Building2 className="w-4 h-4" />
                  عقاراتي
                </button>
                <button
                  type="button"
                  onClick={() => { handleReset(); setView("form"); }}
                  className="flex items-center justify-center gap-2 border border-border bg-white hover:bg-secondary/40 rounded-xl h-11 px-6 font-semibold transition-colors"
                >
                  إضافة عقار آخر
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ── Package Selection View ─────────────────────────────────────────────────

  if (view === "plans") {
    return (
      <div dir="rtl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => setView("form")}
            className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div>
            <h1 className="text-xl font-bold">اختر الباقة المناسبة</h1>
            <p className="text-sm text-muted-foreground">آخر خطوة قبل نشر إعلانك</p>
          </div>
        </div>

        {/* Progress indicator */}
        <div className="flex items-center gap-2 mb-6 text-sm">
          <span className="flex items-center gap-1.5 text-teal-600 font-medium">
            <div className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold">✓</div>
            بيانات العقار
          </span>
          <div className="flex-1 h-0.5 bg-teal-200" />
          <span className="flex items-center gap-1.5 text-teal-700 font-bold">
            <div className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold">2</div>
            اختيار الباقة
          </span>
        </div>

        <Step5Plans
          plans={plans}
          plansLoading={plansLoading}
          selectedPlan={selectedPlan}
          setSelectedPlan={setSelectedPlan}
          error={error}
          accountType={accountType}
        />

        <div className="mt-6 flex gap-3">
          <button
            type="button"
            onClick={() => setView("form")}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 px-5 py-3 rounded-xl border border-gray-200 hover:border-gray-300 bg-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            رجوع
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!selectedPlan || submitting}
            className={`flex-1 flex items-center justify-center gap-2 text-sm font-bold text-white py-3 rounded-xl transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${
              selectedPlan && parseFloat(selectedPlan.price) > 0
                ? "bg-amber-600 hover:bg-amber-700"
                : "bg-teal-600 hover:bg-teal-700"
            }`}
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" />جارٍ النشر...</>
            ) : selectedPlan && parseFloat(selectedPlan.price) > 0 ? (
              <><CreditCard className="w-4 h-4" />ادفع وانشر</>
            ) : (
              <>نشر الإعلان مجاناً</>
            )}
          </button>
        </div>

        <PaymentDialog
          open={showPayment}
          plan={selectedPlan}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
        />
      </div>
    );
  }

  // ── Main Form View (single scrollable page) ────────────────────────────────

  return (
    <div dir="rtl">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          type="button"
          onClick={goBack}
          className="w-9 h-9 rounded-full border border-border flex items-center justify-center hover:bg-secondary transition-colors shrink-0"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-2xl font-bold">{isEditMode ? "تعديل إعلانك" : "أضف عقارك"}</h1>
          <p className="text-sm text-muted-foreground">{isEditMode ? "عدّل بيانات العقار ثم احفظ التعديلات" : "أنشر إعلانك ووصّل لآلاف الباحثين"}</p>
        </div>
      </div>

      {/* Progress indicator */}
      {showPlans && (
        <div className="flex items-center gap-2 mb-6 text-sm">
          <span className="flex items-center gap-1.5 text-teal-700 font-bold">
            <div className="w-5 h-5 rounded-full bg-teal-600 text-white flex items-center justify-center text-[10px] font-bold">1</div>
            بيانات العقار
          </span>
          <div className="flex-1 h-0.5 bg-gray-200" />
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <div className="w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center text-[10px]">2</div>
            اختيار الباقة
          </span>
        </div>
      )}

      <div className="space-y-4 pb-24">

        {/* ── 1. نوع العقار ──────────────────────────────────────── */}
        <FormSection title="نوع العقار" required>
          <div className="space-y-5">
            <PropertyTypeSelector v={v} set={set} onMainCategoryChange={setMainCategory} />

            {/* Company only: نوع المعلن */}
            {isCompany && (
              <div>
                <Label className="text-sm font-semibold mb-3 block">نوع المعلن</Label>
                <div className="grid grid-cols-2 gap-2">
                  {ADVERTISER_TYPES.map((at) => (
                    <button
                      key={at.value}
                      type="button"
                      onClick={() => set("advertiserType", at.value)}
                      className={`px-4 py-2.5 rounded-2xl border-2 transition-all text-right ${
                        v.advertiserType === at.value
                          ? "border-teal-600 bg-teal-50 shadow-sm"
                          : "border-border hover:border-teal-300 hover:bg-secondary/40"
                      }`}
                    >
                      <span className={`text-sm font-medium ${v.advertiserType === at.value ? "text-teal-700" : ""}`}>
                        {at.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </FormSection>

        {/* ── Sections 2–9: only visible after all 3 type selections are made ── */}
        <div
          style={{
            overflow: isFormUnlocked ? "visible" : "hidden",
            maxHeight: isFormUnlocked ? "9999px" : "0px",
            opacity: isFormUnlocked ? 1 : 0,
            transition: isFormUnlocked
              ? "opacity 0.5s ease 0.1s, max-height 0.6s ease 0.05s"
              : "opacity 0.2s ease, max-height 0.3s ease",
          }}
          aria-hidden={!isFormUnlocked}
        >
        <div className="space-y-4 pt-1">

        {/* ── 2. تفاصيل الإعلان ─────────────────────────────────── */}
        <FormSection title="تفاصيل الإعلان" required>
          <div className="space-y-4">
            <div>
              <Label htmlFor="f-title" className="text-sm font-semibold mb-1.5 block">
                عنوان الإعلان <span className="text-red-500">*</span>
              </Label>
              <Input
                id="f-title"
                placeholder="مثال: شقة 3 غرف للبيع في حي النزهة ببنها"
                {...register("title")}
                className="h-12 rounded-xl text-base"
              />
              <p className="text-xs text-muted-foreground mt-1">عنوان واضح يجذب أكثر مشترين</p>
            </div>
            {isCompany && (
              <div>
                <Label htmlFor="f-compound" className="text-sm font-semibold mb-1.5 block">اسم المشروع / المجمع</Label>
                <Input id="f-compound" placeholder="مثال: كمبوند الياسمين، مشروع النيل سيتي..." {...register("compound")} className="h-11 rounded-xl" />
              </div>
            )}
            <div>
              <Label htmlFor="f-desc" className="text-sm font-semibold mb-1.5 block">وصف العقار</Label>
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
        </FormSection>

        {/* ── 3. المساحات والأسعار ──────────────────────────────── */}
        <FormSection title={cfg.isLand ? "مساحة الأرض والسعر" : "المساحات والأسعار"}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="f-price" className="text-sm font-semibold mb-1.5 block">السعر (ج.م)</Label>
                <Input id="f-price" type="number" placeholder="850,000" {...register("price")} className="h-11 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="f-area" className="text-sm font-semibold mb-1.5 block">
                  {cfg.isLand ? "المساحة الإجمالية (م²)" : "المساحة (م²)"} <span className="text-red-500">*</span>
                </Label>
                <Input id="f-area" type="number" placeholder="120" {...register("area")} className="h-11 rounded-xl" />
              </div>
            </div>

            {/* أبعاد الأرض — للأراضي فقط */}
            {cfg.showLandDimensions && (
              <div>
                <Label className="text-sm font-semibold mb-2 block">أبعاد الأرض</Label>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">الطول (م)</p>
                    <Input type="number" placeholder="20" {...register("landDepth")} className="h-11 rounded-xl text-center" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground mb-1.5">العرض (م)</p>
                    <Input type="number" placeholder="15" {...register("landWidth")} className="h-11 rounded-xl text-center" />
                  </div>
                </div>
              </div>
            )}

            {/* نسبة البناء — للأراضي فقط */}
            {cfg.showBuildRatio && (
              <div>
                <Label htmlFor="f-build-ratio" className="text-sm font-semibold mb-1.5 block">نسبة البناء المسموحة (%)</Label>
                <Input id="f-build-ratio" type="number" placeholder="60" {...register("buildRatio")} className="h-11 rounded-xl max-w-[200px]" />
              </div>
            )}

            {/* الغرف / الحمامات / الطابق — للوحدات فقط */}
            {(cfg.showRooms || cfg.showBathrooms || cfg.showFloor) && (
              <div>
                <Label className="text-sm font-semibold mb-2 block">تفاصيل الوحدة</Label>
                <div className="grid grid-cols-3 gap-3">
                  {cfg.showRooms && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">{cfg.roomsLabel}</p>
                      <Input type="number" placeholder="3" {...register("rooms")} className="h-11 rounded-xl text-center" />
                    </div>
                  )}
                  {cfg.showBathrooms && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">الحمامات</p>
                      <Input type="number" placeholder="2" {...register("bathrooms")} className="h-11 rounded-xl text-center" />
                    </div>
                  )}
                  {cfg.showFloor && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">{cfg.floorLabel}</p>
                      <Input type="number" placeholder="3" {...register("floor")} className="h-11 rounded-xl text-center" />
                    </div>
                  )}
                  {cfg.showTotalFloors && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">إجمالي الأدوار</p>
                      <Input type="number" placeholder="10" {...register("totalFloors")} className="h-11 rounded-xl text-center" />
                    </div>
                  )}
                  {isCompany && cfg.showBuildYear && (
                    <div>
                      <p className="text-xs text-muted-foreground mb-1.5">سنة البناء</p>
                      <Input type="number" placeholder="2022" {...register("buildYear")} className="h-11 rounded-xl text-center" />
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </FormSection>

        {/* ── 4. التفاصيل الإضافية — تُخفى تلقائياً إن لم يكن فيها شيء ── */}
        {(cfg.showFinishing || cfg.showFurnished || (isCompany && (cfg.showCondition || cfg.showDirection)) || (v.listingType === "rent" && cfg.showPaymentMethod) || cfg.showFacade) && (
          <FormSection title="التفاصيل الإضافية">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                {cfg.showFinishing && (
                  <div>
                    <Label className="text-sm font-semibold mb-1.5 block">حالة التشطيب</Label>
                    <Select value={v.finishing} onValueChange={(val) => set("finishing", val)}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="اختر..." /></SelectTrigger>
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
                )}
                {cfg.showFurnished && (
                  <div>
                    <Label className="text-sm font-semibold mb-1.5 block">الأثاث</Label>
                    <Select value={v.furnished} onValueChange={(val) => set("furnished", val)}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="اختر..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="furnished">مفروشة بالكامل</SelectItem>
                        <SelectItem value="semi_furnished">نصف مفروشة</SelectItem>
                        <SelectItem value="unfurnished">غير مفروشة</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {isCompany && cfg.showCondition && (
                  <div>
                    <Label className="text-sm font-semibold mb-1.5 block">حالة العقار</Label>
                    <Select value={v.condition} onValueChange={(val) => set("condition", val)}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="اختر..." /></SelectTrigger>
                      <SelectContent>
                        {CONDITIONS.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {isCompany && cfg.showDirection && (
                  <div>
                    <Label className="text-sm font-semibold mb-1.5 block">اتجاه العقار</Label>
                    <Select value={v.direction} onValueChange={(val) => set("direction", val)}>
                      <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="اختر..." /></SelectTrigger>
                      <SelectContent>
                        {DIRECTIONS.map((d) => (
                          <SelectItem key={d} value={d}>{d}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {cfg.showFacade && (
                  <div className="col-span-2">
                    <Label className="text-sm font-semibold mb-2 block">واجهة {cfg.isLand ? "الأرض" : "العقار"}</Label>
                    <div className="grid grid-cols-4 gap-2">
                      {["شمال","جنوب","شرق","غرب","شمال شرق","شمال غرب","جنوب شرق","جنوب غرب"].map((f) => (
                        <button key={f} type="button" onClick={() => set("facade", f)}
                          className={`py-2 rounded-xl border text-xs font-medium transition-all ${
                            v.facade === f ? "border-teal-600 bg-teal-50 text-teal-700" : "border-border hover:border-teal-300"
                          }`}>{f}</button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              {v.listingType === "rent" && cfg.showPaymentMethod && (
                <div>
                  <Label className="text-sm font-semibold mb-1.5 block">فترة الإيجار</Label>
                  <Select value={v.paymentMethod} onValueChange={(val) => set("paymentMethod", val)}>
                    <SelectTrigger className="h-11 rounded-xl"><SelectValue placeholder="اختر..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="daily">يومي</SelectItem>
                      <SelectItem value="monthly">شهري</SelectItem>
                      <SelectItem value="quarterly">ربع سنوي</SelectItem>
                      <SelectItem value="yearly">سنوي</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </FormSection>
        )}

        {/* ── 5. المميزات — dynamic filters engine ──────────────────── */}
        {amenitiesData.length > 0 && (
          <FormSection title={cfg.isLand ? "مميزات الأرض" : cfg.isCommercial ? "مميزات الوحدة التجارية" : "مميزات العقار"}>
            <DynamicFilterPanel
              group={cfg.isLand ? "land" : cfg.isCommercial ? "commercial" : "residential"}
              category={v.mainCategory}
              selected={v.features as string[]}
              onChange={(vals) => setValue("features", vals)}
            />
          </FormSection>
        )}

        {/* ── 6. الخدمات الطرفية ──────────────────────────────────── */}
        {servicesData.length > 0 && (
          <FormSection title="الخدمات الطرفية القريبة">
            <DynamicFilterPanel
              group="all"
              category=""
              selected={v.nearbyServices as string[]}
              onChange={(vals) => setValue("nearbyServices", vals)}
              featureType="service"
            />
          </FormSection>
        )}

        {/* ── 7. الصور — عنوان ديناميكي ───────────────────────────── */}
        <FormSection title={cfg.isLand ? "صور الأرض" : "صور العقار"}>
          <div className="space-y-5">
            <div>
              <p className="text-xs text-muted-foreground mb-3">أضف حتى 10 صور — الصورة الأولى تكون الغلاف</p>
              {(v.images as string[]).length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {(v.images as string[]).map((img, i) => (
                    <div key={i} className="relative group rounded-xl overflow-hidden border border-border/50 aspect-video bg-muted">
                      <img src={img} alt="" className="w-full h-full object-cover" />
                      {i === 0 && (
                        <span className="absolute bottom-1 right-1 bg-teal-600 text-white text-[10px] px-1.5 py-0.5 rounded-full font-medium">غلاف</span>
                      )}
                      <button
                        type="button"
                        onClick={() => removeImage(img)}
                        className="absolute top-1 left-1 w-5 h-5 bg-black/60 hover:bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <X className="w-3 h-3 text-white" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {(v.images as string[]).length < 10 && (
                <>
                  <input
                    ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
                    onChange={(e) => handleFileUpload(e.target.files)}
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={uploading}
                    className="w-full py-7 rounded-2xl border-2 border-dashed border-border hover:border-teal-400 hover:bg-teal-50/30 transition-all flex flex-col items-center gap-2 text-muted-foreground"
                  >
                    {uploading ? (
                      <><Loader2 className="w-6 h-6 animate-spin text-teal-500" /><span className="text-sm">جارٍ الرفع...</span></>
                    ) : (
                      <><ImagePlus className="w-6 h-6" /><span className="text-sm font-medium">اضغط لاختيار الصور</span><span className="text-xs">PNG, JPG حتى 5MB</span></>
                    )}
                  </button>
                </>
              )}
            </div>
            {isCompany && (
              <div>
                <Label htmlFor="f-video" className="text-sm font-semibold mb-1.5 block">رابط فيديو يوتيوب (اختياري)</Label>
                <Input id="f-video" placeholder="https://youtube.com/watch?v=..." {...register("videoUrl")} className="h-11 rounded-xl" dir="ltr" />
                <p className="text-xs text-muted-foreground mt-1">أضف فيديو جولة افتراضية أو عرض المشروع</p>
              </div>
            )}
          </div>
        </FormSection>

        {/* ── 8. الموقع والخريطة — في الآخر ──────────────────────── */}
        <FormSection title="الموقع" required>
          <div className="space-y-4">
            {/* اختيار المنطقة */}
            <div>
              <Label htmlFor="f-district" className="text-sm font-semibold mb-1.5 block">
                المنطقة <span className="text-red-500">*</span>
              </Label>
              <select
                id="f-district"
                value={v.district ?? ""}
                onChange={(e) => setValue("district", e.target.value)}
                className="w-full h-11 rounded-xl border border-input bg-white px-3 text-sm font-medium text-right focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                dir="rtl"
              >
                <option value="">— اختر المنطقة —</option>
                {locationAreas.map((area) => (
                  <option key={area.id} value={area.nameAr}>{area.nameAr}</option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="f-address" className="text-sm font-semibold mb-1.5 block">العنوان التفصيلي</Label>
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
            <MapPicker
              lat={v.latitude} lng={v.longitude}
              onPick={(lat, lng) => { setValue("latitude", String(lat)); setValue("longitude", String(lng)); }}
              onClear={() => { setValue("latitude", ""); setValue("longitude", ""); }}
            />
          </div>
        </FormSection>

        {/* ── 9. معلومات التواصل ──────────────────────────────────── */}
        <FormSection title="معلومات التواصل" required>
          <div className="space-y-4">

            {/* الاسم */}
            <div>
              <Label htmlFor="f-cname" className="text-sm font-semibold mb-1.5 block">
                الاسم <span className="text-red-500">*</span>
              </Label>
              <Input
                id="f-cname"
                placeholder="الاسم الكامل"
                {...register("contactName")}
                className="h-11 rounded-xl"
              />
            </div>

            {/* رقم الهاتف المحمول مع مفتاح مصر */}
            <div>
              <Label htmlFor="f-phone" className="text-sm font-semibold mb-1.5 block">
                رقم الهاتف المحمول <span className="text-red-500">*</span>
              </Label>
              <div className="flex items-stretch" dir="ltr">
                <div
                  className="h-11 px-3.5 flex items-center rounded-r-xl border border-l-0 bg-gray-50 text-sm font-semibold text-gray-500 select-none shrink-0"
                  style={{ borderColor: "hsl(var(--border))" }}
                >
                  +20
                </div>
                <Input
                  id="f-phone"
                  placeholder="1XXXXXXXXX"
                  {...register("phone")}
                  className="h-11 rounded-l-xl rounded-r-none flex-1"
                  dir="ltr"
                />
              </div>
            </div>

            {/* طريقة التواصل */}
            <div>
              <Label className="text-sm font-semibold mb-2 block">طريقة التواصل</Label>
              <div className="flex flex-wrap gap-2">
                {[
                  { key: "phone",    label: "رقم الموبايل" },
                  { key: "whatsapp", label: "واتساب"       },
                  { key: "chat",     label: "شات المنصة"   },
                  { key: "call",     label: "اتصال مباشر"  },
                ].map((m) => {
                  const active = (v.contactMethod ?? []).includes(m.key);
                  return (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => {
                        const cur: string[] = v.contactMethod ?? [];
                        set("contactMethod", active
                          ? cur.filter((x) => x !== m.key)
                          : [...cur, m.key]
                        );
                      }}
                      className="px-4 py-2 rounded-lg border text-sm font-medium transition-all duration-150 focus:outline-none"
                      style={{
                        borderColor: active ? "#059669" : "#e5e7eb",
                        background:  active ? "rgba(236,253,245,0.85)" : "#fff",
                        color:       active ? "#065f46" : "#4b5563",
                        boxShadow:   active ? "0 0 0 1px #059669" : "none",
                      }}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

          </div>
        </FormSection>

        {/* ── زر النشر — تحت الاستمارة مباشرةً ─────────────────── */}
        <div className="flex items-center gap-3 pt-3 pb-10">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-1.5 text-sm font-semibold text-gray-600 hover:text-gray-900 px-5 py-3 rounded-xl border border-gray-200 bg-white hover:bg-gray-50 transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            رجوع
          </button>
          <div className="flex-1" />
          {!canSubmitForm && (
            <p className="text-xs text-gray-400 hidden sm:block">
              أكمل الحقول المطلوبة للمتابعة
            </p>
          )}
          <button
            type="button"
            onClick={handleFormNext}
            disabled={!canSubmitForm || submitting}
            className="flex items-center gap-2 text-sm font-bold text-white px-8 py-3 rounded-xl shadow-sm transition-all duration-150 shrink-0 focus:outline-none"
            style={{
              background: canSubmitForm && !submitting
                ? "linear-gradient(135deg,#059669 0%,#0d9488 100%)"
                : "#d1d5db",
              cursor: canSubmitForm && !submitting ? "pointer" : "not-allowed",
            }}
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" />{isEditMode ? "جارٍ الحفظ..." : "جارٍ الإرسال..."}</>
            ) : isEditMode ? (
              <>حفظ التعديلات</>
            ) : showPlans ? (
              <>التالي — اختر الباقة<ChevronLeft className="w-4 h-4 rotate-180" /></>
            ) : (
              <>نشر الإعلان</>
            )}
          </button>
        </div>

        </div>{/* end inner space-y-4 */}
        </div>{/* end animated reveal wrapper */}

      </div>

      {/* Error banner */}
      {error && (
        <div className="fixed bottom-6 left-4 right-4 max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 z-50 shadow-lg">
          {error}
        </div>
      )}
    </div>
  );
}
