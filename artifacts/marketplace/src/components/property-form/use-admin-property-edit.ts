import { useState, useRef, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Home, FileText, MapPin, Image, Settings } from "lucide-react";
import { api } from "@/lib/api";
import type { FormValues, DynFeature } from "./types";
import { getPropertyTypeConfig } from "./property-type-config";
import toast from "react-hot-toast";

function parseJsonArr(val: string | null | undefined): string[] {
  if (!val) return [];
  try {
    const a = JSON.parse(val);
    if (Array.isArray(a)) return a.map(String);
  } catch {}
  return [];
}

// Admin edit has 5 steps: same 4 as add-property + admin settings
const ADMIN_STEPS = [
  { id: 1, label: "النوع",      icon: Home },
  { id: 2, label: "التفاصيل",  icon: FileText },
  { id: 3, label: "الموقع",    icon: MapPin },
  { id: 4, label: "الوسائط",   icon: Image },
  { id: 5, label: "الإعدادات", icon: Settings },
];

export function useAdminPropertyEdit(propertyId: number) {
  const [, setLocation] = useLocation();

  const [step, setStep]           = useState(1);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError]         = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);

  // Admin-only fields
  const [adminStatus,   setAdminStatus]   = useState("approved");
  const [adminFeatured, setAdminFeatured] = useState(false);
  const [adminUrgent,   setAdminUrgent]   = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const defaultValues: FormValues = {
    listingType: "", propertyGroup: "", mainCategory: "",
    title: "", description: "", price: "", area: "",
    rooms: "", bathrooms: "", floor: "", totalFloors: "", buildYear: "",
    finishing: "", furnished: "", paymentMethod: "", condition: "",
    advertiserType: "", compound: "", facade: "", direction: "",
    features: [], nearbyServices: [],
    city: "بنها", district: "", address: "", street: "",
    latitude: "", longitude: "",
    contactName: "", phone: "", contactMethod: ["phone"],
    videoUrl: "", images: [],
    landType: "", landWidth: "", landDepth: "", buildRatio: "",
  };

  const { register, watch, setValue, getValues, reset } =
    useForm<FormValues>({ defaultValues });

  const v = watch();

  // Load existing property
  const [loadError, setLoadError] = useState<string | null>(null);
  const { data: propData, isLoading: loadingProp } = useQuery<any>({
    queryKey: ["admin-property-edit", propertyId],
    queryFn: () => api.properties.get(propertyId),
    enabled: !!propertyId,
    staleTime: 0,
  });

  useEffect(() => {
    if (!propData) return;
    const p: any = (propData as any)?.data ?? propData;
    if (!p?.id) { setLoadError("لم يتم العثور على العقار"); return; }

    reset({
      listingType:    p.listingType     ?? "",
      propertyGroup:  "",
      mainCategory:   p.mainCategory    ?? "",
      title:          p.title           ?? "",
      description:    p.description     ?? "",
      price:          p.price           ?? "",
      area:           p.area            ?? "",
      rooms:          p.rooms     != null ? String(p.rooms)      : "",
      bathrooms:      p.bathrooms != null ? String(p.bathrooms)  : "",
      floor:          p.floor     != null ? String(p.floor)      : "",
      totalFloors:    p.totalFloors != null ? String(p.totalFloors) : "",
      buildYear:      p.buildYear != null ? String(p.buildYear)  : "",
      finishing:      p.finishing       ?? "",
      furnished:      p.furnished       ?? "",
      paymentMethod:  p.paymentMethod   ?? "",
      condition:      p.condition       ?? "",
      advertiserType: p.advertiserType  ?? "",
      compound:       p.compound        ?? "",
      facade:         p.facade          ?? "",
      direction:      p.direction       ?? "",
      features:       parseJsonArr(p.features),
      nearbyServices: parseJsonArr(p.nearbyServices),
      city:           p.district?.split(" ")?.[0] ?? "بنها",
      district:       p.district        ?? "",
      address:        p.address         ?? "",
      street:         p.street          ?? "",
      latitude:       p.latitude        ?? "",
      longitude:      p.longitude       ?? "",
      contactName:    p.agentName       ?? "",
      phone:          p.phone           ?? "",
      contactMethod:  ["phone"],
      videoUrl:       p.videoUrl        ?? "",
      images:         parseJsonArr(p.images),
      landType:       p.landType        ?? "",
      landWidth:      p.landWidth       ?? "",
      landDepth:      p.landDepth       ?? "",
      buildRatio:     p.buildRatio      ?? "",
    });

    setAdminStatus(p.status ?? "approved");
    setAdminFeatured(p.featured ?? false);
    setAdminUrgent(p.urgent ?? false);
  }, [propData, reset]);

  const cfg = getPropertyTypeConfig(v.mainCategory);
  const showRoomFields = cfg.showRooms || cfg.showBathrooms || cfg.showFloor;

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
    setValue("features", []);
    setValue("nearbyServices", []);
  };

  const toggleArr = (key: "features" | "nearbyServices", val: string) => {
    const arr = getValues(key) as string[];
    setValue(key, arr.includes(val) ? arr.filter(x => x !== val) : [...arr, val]);
  };

  const removeImage = (url: string) =>
    setValue("images", (getValues("images") as string[]).filter(i => i !== url));

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
      } catch {}
    }
    setValue("images", [...imgs, ...uploaded]);
    setUploading(false);
  };

  const canProceed = (): boolean => {
    if (step === 1) return !!v.listingType && !!v.mainCategory;
    if (step === 2) return !!v.title;
    if (step === 3) return true;
    if (step === 4) return true;
    if (step === 5) return true;
    return true;
  };

  const buildPayload = () => {
    const f = getValues();
    return {
      listingType:    f.listingType,
      mainCategory:   f.mainCategory,
      title:          f.title,
      description:    f.description    || null,
      price:          f.price          || null,
      area:           f.area           || null,
      rooms:          f.rooms          ? parseInt(f.rooms)       : null,
      bathrooms:      f.bathrooms      ? parseInt(f.bathrooms)   : null,
      floor:          f.floor          ? parseInt(f.floor)       : null,
      totalFloors:    f.totalFloors    ? parseInt(f.totalFloors) : null,
      buildYear:      f.buildYear      ? parseInt(f.buildYear)   : null,
      finishing:      f.finishing      || null,
      furnished:      f.furnished      || null,
      condition:      f.condition      || null,
      paymentMethod:  f.paymentMethod  || null,
      advertiserType: f.advertiserType || null,
      compound:       f.compound       || null,
      facade:         f.facade         || null,
      direction:      f.direction      || null,
      district:       f.district       || null,
      address:        f.address        || null,
      street:         f.street         || null,
      latitude:       f.latitude       || null,
      longitude:      f.longitude      || null,
      phone:          f.phone          || null,
      videoUrl:       f.videoUrl       || null,
      landType:       f.landType       || null,
      landWidth:      f.landWidth      || null,
      landDepth:      f.landDepth      || null,
      buildRatio:     f.buildRatio     || null,
      features:       (f.features as string[]).length ? JSON.stringify(f.features) : null,
      nearbyServices: (f.nearbyServices as string[]).length ? JSON.stringify(f.nearbyServices) : null,
      images:         (f.images as string[]).length ? JSON.stringify(f.images) : null,
      status:         adminStatus,
      featured:       adminFeatured,
      urgent:         adminUrgent,
    };
  };

  const handleSave = async () => {
    if (!getValues("title")) { toast.error("العنوان مطلوب"); return; }
    setSubmitting(true);
    setError(null);
    try {
      await api.properties.update(propertyId, buildPayload());
      toast.success("✅ تم حفظ التعديلات بنجاح");
      setLocation("/admin/properties");
    } catch (e: any) {
      const msg = e?.message ?? "حدث خطأ أثناء الحفظ";
      setError(msg);
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const STEPS = ADMIN_STEPS;
  const isLastStep = step === STEPS.length;

  const goBack = () => {
    if (step > 1) setStep(step - 1);
    else setLocation("/admin/properties");
  };
  const goNext = () => { if (step < STEPS.length) setStep(step + 1); };

  return {
    STEPS,
    step, setStep,
    loadingProp, loadError,
    submitting, error,
    uploading,
    adminStatus, setAdminStatus,
    adminFeatured, setAdminFeatured,
    adminUrgent, setAdminUrgent,
    fileInputRef,
    register, watch, setValue,
    v, cfg, showRoomFields,
    amenitiesData, servicesData,
    set, setMainCategory, toggleArr, removeImage,
    handleFileUpload,
    canProceed,
    handleSave,
    goBack, goNext,
    isLastStep,
  };
}
