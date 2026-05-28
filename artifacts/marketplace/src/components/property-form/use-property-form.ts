import { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api, type BillingPlan } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { FormMode, FormValues, DynFeature } from "./types";
import { STEPS_CONFIG, LAND_CATEGORIES } from "./constants";
import { getPropertyTypeConfig } from "./property-type-config";

export function usePropertyForm(
  mode: FormMode,
  backPath: string,
  showPlans: boolean,
  editPropertyId?: number,
  initialData?: Partial<FormValues>,
) {
  const [, setLocation] = useLocation();
  const { user } = useAuth();

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const baseDefaults: FormValues = {
    listingType: "", propertyGroup: "", mainCategory: "",
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

  const cfg = getPropertyTypeConfig(v.mainCategory);
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

  const set = (key: keyof FormValues, val: any) => setValue(key, val);

  const setMainCategory = (cat: string) => {
    setValue("mainCategory", cat);
    if (!initialData) {
      setValue("features", []);
      setValue("nearbyServices", []);
    }
    if (!LAND_CATEGORIES.includes(cat)) {
      setValue("landType", "");
      setValue("landWidth", "");
      setValue("landDepth", "");
      setValue("buildRatio", "");
    }
  };

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

  const canProceed = (): boolean => {
    if (isEditMode) return !!v.title && !!v.area && !!v.phone;
    if (step === 1) return !!v.listingType && !!v.mainCategory;
    if (step === 2) return !!v.title && !!v.area;
    if (step === 3) return !!v.city;
    if (step === 4) return !!v.phone;
    if (step === 5) return !!selectedPlan;
    return true;
  };

  const buildPayload = () => {
    const f = getValues();
    return {
      listingType:    f.listingType,
      mainCategory:   f.mainCategory,
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
    reset(baseDefaults);
  };

  const goBack  = () => (step > 1 ? setStep(step - 1) : setLocation(backPath));
  const goNext  = () => setStep(step + 1);
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
