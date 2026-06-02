import { useLocation } from "wouter";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, Loader2, Save, Building2, User, Star, Zap, AlertCircle, CheckCircle2,
} from "lucide-react";
import { StepBar } from "@/components/property-form/shared/StepBar";
import { Step1Type } from "@/components/property-form/steps/Step1Type";
import { Step2Details } from "@/components/property-form/steps/Step2Details";
import { Step3Location } from "@/components/property-form/steps/Step3Location";
import { Step4Media } from "@/components/property-form/steps/Step4Media";
import { useAdminPropertyAdd } from "@/components/property-form/use-admin-property-add";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const STATUS_OPTIONS = [
  { value: "approved", label: "✅ معتمد — يظهر في الموقع فوراً", bg: "bg-green-50 border-green-200 text-green-700" },
  { value: "pending",  label: "🕐 قيد المراجعة",                 bg: "bg-yellow-50 border-yellow-200 text-yellow-700" },
  { value: "rejected", label: "❌ مرفوض",                        bg: "bg-red-50 border-red-200 text-red-700" },
];

export default function AdminPropertyAdd() {
  const [, setLocation] = useLocation();

  const form = useAdminPropertyAdd();
  const {
    STEPS, step, setStep,
    submitting, error,
    uploading,
    accountType, handleAccountTypeChange,
    adminStatus, setAdminStatus,
    adminFeatured, setAdminFeatured,
    adminUrgent, setAdminUrgent,
    fileInputRef,
    register, setValue,
    v,
    amenitiesData, servicesData,
    set, setMainCategory, toggleArr, removeImage,
    handleFileUpload,
    canProceed,
    handleSave,
    goBack, goNext,
    isLastStep,
    isCompany,
  } = form;

  const currentStatusOpt = STATUS_OPTIONS.find(s => s.value === adminStatus);

  return (
    <AdminLayout title="إضافة عقار جديد">

      {/* ── Top Bar ── */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setLocation("/admin/properties")}>
            <ArrowRight className="w-4 h-4" />
            العودة للقائمة
          </Button>
          <div>
            <h1 className="text-base font-bold text-slate-900 leading-none">إضافة عقار جديد</h1>
            <p className="text-xs text-slate-400 mt-0.5">سيُنشر مباشرة في الموقع بحالة المحددة أدناه</p>
          </div>
        </div>
        <Button
          size="sm"
          className="bg-teal-600 hover:bg-teal-700 gap-1.5"
          onClick={handleSave}
          disabled={submitting}
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          نشر العقار
        </Button>
      </div>

      {/* ── Account Type Selector ── */}
      <div className="mb-6">
        <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">نوع المعلن</p>
        <div className="grid grid-cols-2 gap-3 max-w-sm">
          <button
            type="button"
            onClick={() => handleAccountTypeChange("user")}
            className={`flex items-center gap-2.5 p-3.5 rounded-2xl border-2 transition-all text-right ${
              accountType === "user"
                ? "border-teal-500 bg-teal-50 shadow-sm shadow-teal-100"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              accountType === "user" ? "bg-teal-100" : "bg-slate-100"
            }`}>
              <User className={`w-4.5 h-4.5 ${accountType === "user" ? "text-teal-700" : "text-slate-500"}`} />
            </div>
            <div>
              <p className={`text-sm font-bold leading-tight ${accountType === "user" ? "text-teal-800" : "text-slate-700"}`}>
                فرد
              </p>
              <p className="text-[10px] text-slate-400 leading-tight">مالك أو وسيط عادي</p>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleAccountTypeChange("company")}
            className={`flex items-center gap-2.5 p-3.5 rounded-2xl border-2 transition-all text-right ${
              accountType === "company"
                ? "border-blue-500 bg-blue-50 shadow-sm shadow-blue-100"
                : "border-slate-200 bg-white hover:border-slate-300"
            }`}
          >
            <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              accountType === "company" ? "bg-blue-100" : "bg-slate-100"
            }`}>
              <Building2 className={`w-4 h-4 ${accountType === "company" ? "text-blue-700" : "text-slate-500"}`} />
            </div>
            <div>
              <p className={`text-sm font-bold leading-tight ${accountType === "company" ? "text-blue-800" : "text-slate-700"}`}>
                شركة / مكتب
              </p>
              <p className="text-[10px] text-slate-400 leading-tight">كيان تجاري معتمد</p>
            </div>
          </button>
        </div>
      </div>

      {/* ── Admin Settings Bar ── */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-slate-50 rounded-2xl border border-slate-200">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">إعدادات النشر:</span>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500">الحالة:</span>
          <Select value={adminStatus} onValueChange={setAdminStatus}>
            <SelectTrigger className={`h-8 text-xs font-semibold rounded-lg border px-3 min-w-[200px] ${currentStatusOpt?.bg ?? ""}`}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map(o => (
                <SelectItem key={o.value} value={o.value} className="text-xs">{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <button
          type="button"
          onClick={() => setAdminFeatured(!adminFeatured)}
          className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold border transition-all ${
            adminFeatured
              ? "bg-amber-100 border-amber-300 text-amber-800"
              : "bg-white border-slate-200 text-slate-500 hover:border-amber-200"
          }`}
        >
          <Star className={`w-3.5 h-3.5 ${adminFeatured ? "fill-amber-500 text-amber-500" : ""}`} />
          مميز
        </button>

        <button
          type="button"
          onClick={() => setAdminUrgent(!adminUrgent)}
          className={`flex items-center gap-1.5 px-3 h-8 rounded-lg text-xs font-semibold border transition-all ${
            adminUrgent
              ? "bg-red-100 border-red-300 text-red-800"
              : "bg-white border-slate-200 text-slate-500 hover:border-red-200"
          }`}
        >
          <Zap className={`w-3.5 h-3.5 ${adminUrgent ? "fill-red-500 text-red-500" : ""}`} />
          عاجل
        </button>

        {adminStatus === "approved" && (
          <div className="mr-auto flex items-center gap-1.5 text-xs text-teal-600 font-medium">
            <CheckCircle2 className="w-3.5 h-3.5" />
            سيظهر في الموقع فور النشر
          </div>
        )}
      </div>

      {/* ── Step Bar ── */}
      <div className="mb-6">
        <StepBar steps={STEPS} currentStep={step} />
      </div>

      {/* ── Step Content ── */}
      <div className="max-w-2xl mx-auto pb-32">

        {step === 1 && (
          <Step1Type v={v} set={set} onMainCategoryChange={setMainCategory} />
        )}

        {step === 2 && (
          <Step2Details
            v={v}
            set={set}
            register={register}
            toggleArr={toggleArr}
            isCompany={isCompany}
            amenitiesData={amenitiesData}
            servicesData={servicesData}
          />
        )}

        {step === 3 && (
          <Step3Location v={v} set={set} register={register} setValue={setValue} />
        )}

        {step === 4 && (
          <Step4Media
            v={v}
            register={register}
            isCompany={isCompany}
            uploading={uploading}
            fileInputRef={fileInputRef}
            removeImage={removeImage}
            handleFileUpload={handleFileUpload}
          />
        )}

        {step === 5 && (
          <div className="space-y-6">
            <h2 className="text-xl font-bold text-slate-900">مراجعة نهائية وحفظ</h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">المعلومات الأساسية</p>
                <p className="font-bold text-slate-900 truncate">{v.title || "—"}</p>
                <p className="text-sm text-slate-600">
                  {v.listingType === "sale" ? "للبيع" : v.listingType === "rent" ? "للإيجار" : "—"}
                  {v.mainCategory && ` · ${v.mainCategory}`}
                </p>
                {v.price && <p dir="ltr" className="text-sm font-semibold text-teal-700">{Number(v.price).toLocaleString("en-US")} ج.م</p>}
                {v.area && <p className="text-sm text-slate-500">{v.area} م²</p>}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">الموقع والتواصل</p>
                {v.district && <p className="text-sm text-slate-600">📍 {v.district}</p>}
                {v.address && <p className="text-sm text-slate-600">{v.address}</p>}
                {v.phone && <p className="text-sm text-slate-600">📞 {v.phone}</p>}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">الوسائط</p>
                <p className="text-sm text-slate-600">
                  {(v.images as string[]).length} صورة{v.videoUrl ? " · مع فيديو" : ""}
                </p>
                {(v.images as string[]).length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {(v.images as string[]).slice(0, 4).map((img, i) => (
                      <img key={i} src={img} className="w-12 h-12 rounded-lg object-cover border border-slate-200" />
                    ))}
                    {(v.images as string[]).length > 4 && (
                      <div className="w-12 h-12 rounded-lg bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-500">
                        +{(v.images as string[]).length - 4}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2">
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">إعدادات النشر</p>
                <p className="text-sm">{accountType === "company" ? "🏢 شركة / مكتب" : "👤 فرد"}</p>
                <p className="text-sm">{currentStatusOpt?.label.split("—")[0].trim() ?? adminStatus}</p>
                {adminFeatured && <p className="text-sm text-amber-600">⭐ إعلان مميز</p>}
                {adminUrgent   && <p className="text-sm text-red-600">⚡ إعلان عاجل</p>}
              </div>
            </div>

            <Button
              className="w-full h-12 text-base bg-teal-600 hover:bg-teal-700 gap-2"
              onClick={handleSave}
              disabled={submitting}
            >
              {submitting
                ? <><Loader2 className="w-5 h-5 animate-spin" />جارٍ النشر...</>
                : <><Save className="w-5 h-5" />نشر العقار</>}
            </Button>
          </div>
        )}

        {error && (
          <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            {error}
          </div>
        )}
      </div>

      {/* ── Fixed Bottom Navigation ── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 z-40 shadow-lg">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-gray-900 px-4 py-2.5 rounded-lg border border-gray-200 hover:border-gray-300 bg-white transition-colors shrink-0"
          >
            <ArrowRight className="w-4 h-4" />
            السابق
          </button>

          <div className="flex-1 flex justify-center gap-1.5">
            {STEPS.map(s => (
              <button
                key={s.id}
                type="button"
                onClick={() => setStep(s.id)}
                className={`h-1.5 rounded-full transition-all ${
                  s.id === step ? "w-6 bg-teal-600" :
                  s.id < step  ? "w-3 bg-teal-300" :
                                 "w-3 bg-gray-200"
                }`}
                title={s.label}
              />
            ))}
          </div>

          {!isLastStep ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canProceed()}
              className="flex items-center gap-1 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed px-6 py-2.5 rounded-lg transition-colors shrink-0"
            >
              التالي
              <ArrowRight className="w-4 h-4 rotate-180" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting}
              className="flex items-center gap-2 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed px-6 py-2.5 rounded-lg transition-colors shrink-0"
            >
              {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              نشر العقار
            </button>
          )}
        </div>
      </div>

    </AdminLayout>
  );
}
