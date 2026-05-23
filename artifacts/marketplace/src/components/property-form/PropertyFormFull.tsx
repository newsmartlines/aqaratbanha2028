import { useState } from "react";
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
import { MapPicker } from "./shared/MapPicker";
import { AddressAutocomplete } from "./shared/AddressAutocomplete";
import { PaymentDialog } from "./shared/PaymentDialog";
import { Step5Plans } from "./steps/Step5Plans";
import { usePropertyForm } from "./use-property-form";
import {
  ADVERTISER_TYPES, FINISHING, CONDITIONS,
  DIRECTIONS, CITIES,
} from "./constants";
import { LAND_TYPE_OPTIONS, getPropertyTypeConfig } from "./property-type-config";
import type { PropertyFormWizardProps } from "./types";

export function PropertyFormFull({ mode, backPath, showPlans = false }: PropertyFormWizardProps) {
  const [, setLocation] = useLocation();
  const [view, setView] = useState<"form" | "plans" | "success">("form");

  const form = usePropertyForm(mode, backPath, showPlans);
  const {
    isCompany,
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

  const canSubmitForm = !!v.listingType && !!v.mainCategory && !!v.title && !!v.area && !!v.city && !!v.phone;


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
              onClick={() => setLocation("/user/my-properties")}
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
          <h1 className="text-2xl font-bold">أضف عقارك</h1>
          <p className="text-sm text-muted-foreground">أنشر إعلانك ووصّل لآلاف الباحثين</p>
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

        {/* ── 2. الموقع ──────────────────────────────────────────── */}
        <FormSection title="الموقع" required>
          <div className="space-y-4">
            <div>
              <Label className="text-sm font-semibold mb-2 block">المدينة <span className="text-red-500">*</span></Label>
              <div className="grid grid-cols-3 gap-2">
                {CITIES.map((city) => (
                  <button
                    key={city} type="button"
                    onClick={() => set("city", city)}
                    className={`py-2.5 rounded-xl border-2 text-sm font-semibold transition-all ${
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
            <div>
              <Label htmlFor="f-street" className="text-sm font-semibold mb-1.5 block">اسم الشارع</Label>
              <Input id="f-street" placeholder="شارع الجمهورية..." {...register("street")} className="h-11 rounded-xl" />
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

        {/* ── 3. تفاصيل الإعلان ─────────────────────────────────── */}
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

        {/* ── 4. المساحات والأسعار ──────────────────────────────── */}
        <FormSection title="المساحات والأسعار">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="f-price" className="text-sm font-semibold mb-1.5 block">السعر (ج.م)</Label>
                <Input id="f-price" type="number" placeholder="850,000" {...register("price")} className="h-11 rounded-xl" />
              </div>
              <div>
                <Label htmlFor="f-area" className="text-sm font-semibold mb-1.5 block">
                  المساحة (م²) <span className="text-red-500">*</span>
                </Label>
                <Input id="f-area" type="number" placeholder="120" {...register("area")} className="h-11 rounded-xl" />
              </div>
            </div>
            {/* Land type & dimensions */}
            {cfg.showLandType && (
              <div>
                <Label className="text-sm font-semibold mb-2 block">نوع الأرض</Label>
                <div className="flex flex-wrap gap-2">
                  {LAND_TYPE_OPTIONS.map((opt) => (
                    <button key={opt.value} type="button" onClick={() => set("landType", opt.value)}
                      className={`px-4 py-2 rounded-xl border-2 text-sm font-semibold transition-all ${
                        v.landType === opt.value ? "border-teal-600 bg-teal-50 text-teal-700" : "border-border hover:border-teal-300"
                      }`}>{opt.label}</button>
                  ))}
                </div>
              </div>
            )}
            {cfg.showLandDimensions && (
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
            )}
            {cfg.showBuildRatio && (
              <div>
                <Label htmlFor="f-build-ratio" className="text-sm font-semibold mb-1.5 block">نسبة البناء (%)</Label>
                <Input id="f-build-ratio" type="number" placeholder="60" {...register("buildRatio")} className="h-11 rounded-xl max-w-[160px]" />
              </div>
            )}
            {/* Room details */}
            {(cfg.showRooms || cfg.showBathrooms || cfg.showFloor) && (
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
            )}
          </div>
        </FormSection>

        {/* ── 5. التفاصيل الإضافية ──────────────────────────────── */}
        <FormSection title="التفاصيل الإضافية">
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
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
              {isCompany && (
                <>
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
                </>
              )}
            </div>
            {v.listingType === "rent" && (
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

        {/* ── 6. مميزات العقار ────────────────────────────────────── */}
        {amenitiesData.length > 0 && (
          <FormSection title="مميزات العقار">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {amenitiesData.map((am) => {
                const active = (v.features as string[]).includes(am.name);
                return (
                  <button
                    key={am.id} type="button"
                    onClick={() => toggleArr("features", am.name)}
                    className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl border text-sm font-medium transition-all ${
                      active ? "border-teal-600 bg-teal-50 text-teal-700" : "border-border hover:border-teal-200 text-foreground"
                    }`}
                  >
                    <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${active ? "bg-teal-600/10" : "bg-secondary"}`}>
                      <FeatureIcon name={am.icon} className={`w-3.5 h-3.5 ${active ? "text-teal-600" : "text-muted-foreground"}`} />
                    </div>
                    {am.name}
                  </button>
                );
              })}
            </div>
          </FormSection>
        )}

        {/* ── 7. الخدمات الطرفية ──────────────────────────────────── */}
        {servicesData.length > 0 && (
          <FormSection title="الخدمات الطرفية القريبة">
            <div className="flex flex-wrap gap-2">
              {servicesData.map((svc) => {
                const active = (v.nearbyServices as string[]).includes(svc.name);
                return (
                  <button
                    key={svc.id} type="button"
                    onClick={() => toggleArr("nearbyServices", svc.name)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all ${
                      active ? "border-teal-600 bg-teal-50 text-teal-700" : "border-border hover:border-teal-300 text-foreground"
                    }`}
                  >
                    <FeatureIcon name={svc.icon} className={`w-3 h-3 shrink-0 ${active ? "text-teal-600" : "text-muted-foreground"}`} />
                    {svc.name}
                  </button>
                );
              })}
            </div>
          </FormSection>
        )}

        {/* ── 8. صور العقار والتواصل ──────────────────────────────── */}
        <FormSection title="صور العقار">
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

            {/* Company only: video URL */}
            {isCompany && (
              <div>
                <Label htmlFor="f-video" className="text-sm font-semibold mb-1.5 block">رابط فيديو يوتيوب (اختياري)</Label>
                <Input id="f-video" placeholder="https://youtube.com/watch?v=..." {...register("videoUrl")} className="h-11 rounded-xl" dir="ltr" />
                <p className="text-xs text-muted-foreground mt-1">أضف فيديو جولة افتراضية أو عرض المشروع</p>
              </div>
            )}
          </div>
        </FormSection>

        {/* ── 9. معلومات التواصل ──────────────────────────────────── */}
        <FormSection title="معلومات التواصل" required>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="f-phone" className="text-sm font-semibold mb-1.5 block">
                رقم الهاتف <span className="text-red-500">*</span>
              </Label>
              <Input id="f-phone" placeholder="01XXXXXXXXX" {...register("phone")} className="h-11 rounded-xl" dir="ltr" />
            </div>
            <div>
              <Label htmlFor="f-whatsapp" className="text-sm font-semibold mb-1.5 block">واتساب (اختياري)</Label>
              <Input id="f-whatsapp" placeholder="01XXXXXXXXX" {...register("whatsapp")} className="h-11 rounded-xl" dir="ltr" />
            </div>
          </div>
        </FormSection>

      </div>

      {/* Error banner */}
      {error && (
        <div className="fixed bottom-20 left-4 right-4 max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 z-50">
          {error}
        </div>
      )}

      {/* Fixed bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 z-40 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-gray-900 px-4 py-2.5 rounded-lg border border-gray-200 bg-white transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            رجوع
          </button>
          <div className="flex-1" />
          {!canSubmitForm && (
            <p className="text-xs text-muted-foreground hidden sm:block">
              أكمل الحقول المطلوبة للمتابعة
            </p>
          )}
          <button
            type="button"
            onClick={handleFormNext}
            disabled={!canSubmitForm || submitting}
            className="flex items-center gap-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed px-6 py-2.5 rounded-lg transition-colors shrink-0"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" />جارٍ الإرسال...</>
            ) : showPlans ? (
              <>التالي — اختر الباقة<ChevronLeft className="w-4 h-4 rotate-180" /></>
            ) : (
              <>نشر الإعلان</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
