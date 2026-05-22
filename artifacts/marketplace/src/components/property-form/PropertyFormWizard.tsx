import { Building2, ChevronLeft, CheckCircle2, CreditCard, Loader2 } from "lucide-react";
import { useLocation } from "wouter";
import { StepBar } from "./shared/StepBar";
import { PaymentDialog } from "./shared/PaymentDialog";
import { Step1Type } from "./steps/Step1Type";
import { Step2Details } from "./steps/Step2Details";
import { Step3Location } from "./steps/Step3Location";
import { Step4Media } from "./steps/Step4Media";
import { Step5Plans } from "./steps/Step5Plans";
import { usePropertyForm } from "./use-property-form";
import type { PropertyFormWizardProps } from "./types";

export function PropertyFormWizard({ mode, backPath, showPlans = false }: PropertyFormWizardProps) {
  const [, setLocation] = useLocation();

  const form = usePropertyForm(mode, backPath, showPlans);

  const {
    isCompany, STEPS, step,
    submitting, success, error,
    uploading, selectedPlan, setSelectedPlan,
    showPayment, setShowPayment,
    fileInputRef,
    register, watch, setValue,
    v, showRoomFields,
    plans, plansLoading,
    amenitiesData, servicesData,
    set, toggleArr, removeImage,
    handleFileUpload,
    canProceed,
    handleSubmit,
    handlePaymentSuccess,
    handleReset,
    goBack, goNext,
    isLastStep,
  } = form;

  // ── Success Screen ─────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center p-6">
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
          <p className="text-sm text-muted-foreground mb-8">
            ستصلك إشعار فور الموافقة على إعلانك.
          </p>
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
              onClick={handleReset}
              className="flex items-center justify-center gap-2 border border-border bg-white hover:bg-secondary/40 rounded-xl h-11 px-6 font-semibold transition-colors"
            >
              إضافة عقار آخر
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Submit label helper ────────────────────────────────────────────────────

  const submitLabel = () => {
    if (submitting) return <><Loader2 className="w-4 h-4 animate-spin" />جارٍ النشر...</>;
    if (showPlans && selectedPlan && parseFloat(selectedPlan.price) > 0)
      return <><CreditCard className="w-4 h-4" />ادفع وانشر</>;
    return <>نشر الإعلان</>;
  };

  const submitBg =
    showPlans && selectedPlan && parseFloat(selectedPlan.price) > 0
      ? "bg-amber-600 hover:bg-amber-700"
      : "bg-teal-600 hover:bg-teal-700";

  // ── Main Render ────────────────────────────────────────────────────────────

  return (
    <>
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
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

      {/* Step indicator */}
      <StepBar steps={STEPS} currentStep={step} />

      {/* Step content */}
      <div className="pb-28">
        {step === 1 && (
          <Step1Type v={v} set={set} />
        )}
        {step === 2 && (
          <Step2Details
            v={v}
            set={set}
            register={register}
            toggleArr={toggleArr}
            isCompany={isCompany}
            showRoomFields={showRoomFields}
            amenitiesData={amenitiesData}
            servicesData={servicesData}
          />
        )}
        {step === 3 && (
          <Step3Location
            v={v}
            set={set}
            register={register}
            setValue={setValue}
          />
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
        {step === 5 && showPlans && (
          <Step5Plans
            plans={plans}
            plansLoading={plansLoading}
            selectedPlan={selectedPlan}
            setSelectedPlan={setSelectedPlan}
            error={error}
          />
        )}
      </div>

      {/* Error banner (non-plan steps) */}
      {error && step !== 5 && (
        <div className="fixed bottom-20 left-4 right-4 max-w-2xl mx-auto bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 z-50">
          {error}
        </div>
      )}

      {/* Fixed bottom navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 z-40 shadow-lg">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          {/* Back */}
          <button
            type="button"
            onClick={goBack}
            className="flex items-center gap-1 text-sm font-semibold text-gray-600 hover:text-gray-900 px-4 py-2.5 rounded-lg border border-gray-200 hover:border-gray-300 bg-white transition-colors shrink-0"
          >
            <ChevronLeft className="w-4 h-4" />
            السابق
          </button>

          {/* Dot progress */}
          <div className="flex-1 flex justify-center gap-1.5">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`h-1.5 rounded-full transition-all ${
                  s.id === step ? "w-6 bg-teal-600" :
                  s.id < step  ? "w-3 bg-teal-300" :
                                 "w-3 bg-gray-200"
                }`}
              />
            ))}
          </div>

          {/* Next / Submit */}
          {!isLastStep ? (
            <button
              type="button"
              onClick={goNext}
              disabled={!canProceed()}
              className="flex items-center gap-1 text-sm font-bold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-40 disabled:cursor-not-allowed px-6 py-2.5 rounded-lg transition-colors shrink-0"
            >
              التالي
              <ChevronLeft className="w-4 h-4 rotate-180" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!canProceed() || submitting}
              className={`flex items-center gap-2 text-sm font-bold text-white px-6 py-2.5 rounded-lg transition-colors shrink-0 disabled:opacity-40 disabled:cursor-not-allowed ${submitBg}`}
            >
              {submitLabel()}
            </button>
          )}
        </div>
      </div>

      {/* Payment dialog */}
      {showPlans && (
        <PaymentDialog
          open={showPayment}
          plan={selectedPlan}
          onClose={() => setShowPayment(false)}
          onSuccess={handlePaymentSuccess}
        />
      )}
    </>
  );
}
