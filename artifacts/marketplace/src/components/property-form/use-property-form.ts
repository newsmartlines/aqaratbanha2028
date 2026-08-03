import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type BillingPlan } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { FormMode, FormValues, DynFeature } from "./types";
import { STEPS_CONFIG, LAND_CATEGORIES } from "./constants";
import { getPropertyTypeConfig } from "./property-type-config";
import { validateStep, scrollToFirstError, type FieldErrors } from "./use-step-validation";

export function usePropertyForm(
  mode: FormMode,
  backPath: string,
  showPlans: boolean,
  editPropertyId?: number,
  initialData?: Partial<FormValues>,
) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const isCompany = mode === "company";
  const STEPS = STEPS_CONFIG(showPlans);
  const isEditMode = !!editPropertyId;

  const [step, setStep]             = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess]       = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [uploading, setUploading]   = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
  const [showPayment, setShowPayment]   = useState(false);
  const [fieldErrors, setFieldErrors]   = useState<FieldErrors>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const baseDefaults: FormValues = {
    listingType: "", propertyGroup: "", mainCategory: "", subCategory: "",
    title: "", description: "", price: "", area: "",
    rooms: "", bathrooms: "", floor: "", totalFloors: "", buildYear: "",
    finishing: "", furnished: "", paymentMethod: "", condition: "",
    advertiserType: isCompany ? "company" : "",
    compound: "", facade: "", direction: "",
    features: [], nearbyServices: [],
    city: "", district: "", address: "", street: "",
    latitude: "", longitude: "",
    contactName: user?.name ?? "", phone: user?.phone ?? "", contactMethod: ["phone"],
    videoUrl: "", images: [],
    landType: "", landWidth: "", landDepth: "", buildRatio: "",
  };

  const defaultValues: FormValues = initialData
    ? { ...baseDefaults, ...initialData }
    : baseDefaults;

  const { register, watch, setValue, getValues, reset } =
    useForm<FormValues>({ defaultValues });

  const v = watch();

  const cfg = getPropertyTypeConfig(v.subCategory, v.mainCategory);
  const showRoomFields = cfg.showRooms || cfg.showBathrooms || cfg.showFloor;

  const accountType: "company" | "user" = mode === "company" ? "company" : "user";

  const { data: plans = [], isLoading: plansLoading } = useQuery<BillingPlan[]>({
    queryKey: ["billingPlansPublic", accountType],
    queryFn:  () => api.billingPlans.publicListByType(accountType),
    enabled:  showPlans && !isEditMode,
    staleTime: 5 * 60_000,
  });

  const { data: amenitiesData = [] } = useQuery<DynFeature[]>({
    queryKey: ["property-features", "feature", v.mainCategory],
    queryFn:  () => api.propertyFeatures.listByType("feature", v.mainCategory),
    staleTime: 5 * 60_000,
  });

  const { data: servicesData = [] } = useQuery<DynFeature[]>({
    queryKey: ["property-features", "service", v.mainCategory],
    queryFn:  () => api.propertyFeatures.listByType("service", v.mainCategory),
    staleTime: 5 * 60_000,
  });

  const set = (key: keyof FormValues, val: any) => {
    setValue(key, val);
    // Clear error for this field immediately when user sets a value
    if (fieldErrors[key]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const setMainCategory = (cat: string) => {
    setValue("mainCategory", cat);
    if (!initialData) {
      setValue("features", []);
      setValue("nearbyServices", []);
    }
    if (cat !== "land") {
      setValue("landType", "");
      setValue("landWidth", "");
      setValue("landDepth", "");
      setValue("buildRatio", "");
    }
    // Clear mainCategory error when category is set
    if (fieldErrors.mainCategory) {
      setFieldErrors((prev) => { const n = { ...prev }; delete n.mainCategory; return n; });
    }
  };

  // Auto-clear errors as user fills fields (for react-hook-form registered inputs)
  useEffect(() => {
    if (Object.keys(fieldErrors).length === 0) return;
    setFieldErrors((prev) => {
      const next = { ...prev };
      let changed = false;
      for (const key of Object.keys(next) as (keyof FormValues)[]) {
        const val = v[key];
        const valid =
          (typeof val === "string" && val.trim() !== "") ||
          (Array.isArray(val) && val.length > 0);
        if (valid) {
          delete next[key];
          changed = true;
        }
      }
      return changed ? next : prev;
    });
  }, [v]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleArr = (key: "features" | "nearbyServices", val: string) => {
    const arr = getValues(key) as string[];
    setValue(key, arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val]);
  };

  const removeImage = (url: string) =>
    setValue("images", (getValues("images") as string[]).filter((i) => i !== url));

  const handleFileUpload = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    const imgs = getValues("images") as string[];
    const slots = 10 - imgs.length;
    const uploaded: string[] = [];
    for (const file of Array.from(files).slice(0, slots)) {
      try {
        const res = await api.upload.propertyImage(file);
        if (res?.url) uploaded.push(res.url);
      } catch { /**/ }
    }
    setValue("images", [...imgs, ...uploaded]);
    setUploading(false);
  };

  /** Quick check — used to show a visual ready indicator on the step bar. Does NOT show errors. */
  const canProceed = (): boolean => {
    if (isEditMode) return !!v.title && !!v.area && !!v.phone;
    if (step === 1) return !!v.listingType && !!v.mainCategory;
    if (step === 2) return !!v.title && !!v.area;
    if (step === 3) return !!v.district; // fixed: was v.city
    if (step === 4) return !!v.phone;
    if (step === 5) return !!selectedPlan;
    return true;
  };

  /**
   * Validate the current step, show per-field errors, scroll to first invalid field.
   * Returns true if the step is valid.
   */
  const validateCurrentStep = (): boolean => {
    if (isEditMode) return true; // edit mode uses a flat form — no per-step validation
    if (step === 5) return !!selectedPlan;

    const errors = validateStep(step, v, cfg);
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      scrollToFirstError(errors);
      return false;
    }
    setFieldErrors({});
    return true;
  };

  const buildPayload = () => {
    const f = getValues();
    return {
      listingType:    f.listingType,
      mainCategory:   f.mainCategory,
      subCategory:    f.subCategory    || undefined,
      title:          f.title,
      description:    f.description    || undefined,
      price:          f.price          || undefined,
      area:           f.area           || undefined,
      rooms:          f.rooms          ? parseInt(f.rooms)       : undefined,
      bathrooms:      f.bathrooms      ? parseInt(f.bathrooms)   : undefined,
      floor:          f.floor          ? parseInt(f.floor)       : undefined,
      totalFloors:    f.totalFloors    ? parseInt(f.totalFloors) : undefined,
      buildYear:      f.buildYear      ? parseInt(f.buildYear)   : undefined,
      finishing:      f.finishing      || undefined,
      furnished:      f.furnished      || undefined,
      condition:      f.condition      || undefined,
      paymentMethod:  f.paymentMethod  || undefined,
      advertiserType: f.advertiserType || undefined,
      compound:       f.compound       || undefined,
      facade:         f.facade         || undefined,
      direction:      f.direction      || undefined,
      city:           f.city           || undefined,
      district:       f.district       || undefined,
      address:        f.address        || undefined,
      street:         f.street         || undefined,
      latitude:       f.latitude       || undefined,
      longitude:      f.longitude      || undefined,
      phone:          f.phone          || undefined,
      videoUrl:       f.videoUrl       || undefined,
      landType:       f.landType       || undefined,
      landWidth:      f.landWidth      || undefined,
      landDepth:      f.landDepth      || undefined,
      buildRatio:     f.buildRatio     || undefined,
      features:       (f.features as string[]).length
                        ? JSON.stringify(f.features)       : undefined,
      nearbyServices: (f.nearbyServices as string[]).length
                        ? JSON.stringify(f.nearbyServices) : undefined,
      images:         (f.images as string[]).length
                        ? JSON.stringify(f.images)         : undefined,
      contactMethods: (f.contactMethod as string[]).length
                        ? JSON.stringify(f.contactMethod)  : undefined,
      ...(isEditMode ? {} : { status: "pending" as const }),
    };
  };

  const doCreate = async () => {
    if (isEditMode && editPropertyId) {
      await api.properties.update(editPropertyId, buildPayload());
    } else {
      await api.userProperties.create(buildPayload());
    }
    setSuccess(true);
  };

  const handleSubmit = async () => {
    // Validate the last step before submitting
    if (!validateCurrentStep()) return;

    if (!isEditMode && showPlans) {
      if (!selectedPlan) return;
      if (parseFloat(selectedPlan.price) > 0) {
        setSubmitting(true);
        setError(null);
        try {
          await doCreate();
          const qs = new URLSearchParams({
            planName: selectedPlan.nameAr ?? selectedPlan.name ?? "",
            price:    String(selectedPlan.price),
            duration: String(selectedPlan.durationDays),
            currency: selectedPlan.currency ?? "EGP",
            returnTo: backPath || "/dashboard/properties",
          }).toString();
          setLocation(`/pay/listing?${qs}`);
        } catch (e: any) {
          setError(e?.message ?? "حدث خطأ أثناء إرسال الطلب");
          setSubmitting(false);
        }
        return;
      }
      setSubmitting(true);
      setError(null);
      try {
        await doCreate();
        if (user?.id && selectedPlan?.id) {
          await api.userSubscription.subscribe(user.id, selectedPlan.id).catch(() => {});
          // Await the refetch so that add-property.tsx re-evaluates showPlans=false
          // before the success screen is interactive. Using invalidateQueries (fire-and-forget)
          // caused a race where the user could click "إضافة عقار آخر" before the cache
          // updated, making showPlans still appear true on the next form reset.
          await queryClient.refetchQueries({ queryKey: ["userCurrentSub"] });
          queryClient.invalidateQueries({ queryKey: ["subscriptionHistory"] });
        }
      } catch (e: any) {
        setError(e?.message ?? "حدث خطأ أثناء إرسال الطلب");
      } finally {
        setSubmitting(false);
      }
      return;
    }
    setSubmitting(true);
    setError(null);
    try { await doCreate(); }
    catch (e: any) { setError(e?.message ?? "حدث خطأ أثناء إرسال الطلب"); }
    finally { setSubmitting(false); }
  };

  const handlePaymentSuccess = async () => {
    setShowPayment(false);
    setSubmitting(true);
    setError(null);
    try { await doCreate(); }
    catch (e: any) { setError(e?.message ?? "حدث خطأ أثناء إرسال الطلب"); }
    finally { setSubmitting(false); }
  };

  const handleReset = () => {
    setSuccess(false);
    setStep(1);
    setSelectedPlan(null);
    setError(null);
    setFieldErrors({});
    reset(baseDefaults);
  };

  const goBack  = () => {
    setFieldErrors({});
    if (step > 1) setStep(step - 1);
    else setLocation(backPath);
  };

  const goNext  = () => {
    if (!validateCurrentStep()) return;
    setStep(step + 1);
  };

  const isLastStep = isEditMode ? true : step === STEPS.length;

  return {
    isCompany,
    isEditMode,
    accountType,
    STEPS,
    step, setStep,
    submitting,
    success,
    error,
    uploading,
    selectedPlan, setSelectedPlan,
    showPayment, setShowPayment,
    fileInputRef,
    register, watch, setValue,
    v,
    cfg,
    showRoomFields,
    plans, plansLoading,
    amenitiesData,
    servicesData,
    fieldErrors,
    set, setMainCategory, toggleArr, removeImage,
    handleFileUpload,
    canProceed,
    handleSubmit,
    handlePaymentSuccess,
    handleReset,
    goBack, goNext,
    isLastStep,
  };
}
