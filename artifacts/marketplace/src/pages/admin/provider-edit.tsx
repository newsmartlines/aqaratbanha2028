import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  ArrowRight, ArrowLeft, Save, Loader2, Star, MapPin, Phone, Mail, Image,
  User, Navigation, Globe,
} from "lucide-react";
import { api, type Category } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import { DisableAutoPan } from "@/components/DisableAutoPan";
import L from "leaflet";
import { useT, commonDict, useLanguage } from "@/lib/i18n";

delete (L.Icon.Default.prototype as unknown as { _getIconUrl?: unknown })._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DEFAULT_CENTER: [number, number] = [24.7136, 46.6753];

function DraggableMarker({ position, onMove }: { position: [number, number]; onMove: (lat: number, lng: number) => void }) {
  const [pos, setPos] = useState(position);
  useEffect(() => setPos(position), [position[0], position[1]]);
  const marker = {
    eventHandlers: {
      dragend(e: { target: { getLatLng: () => { lat: number; lng: number } } }) {
        const latlng = e.target.getLatLng();
        setPos([latlng.lat, latlng.lng]);
        onMove(latlng.lat, latlng.lng);
      },
    },
  };
  useMapEvents({
    click(e) {
      setPos([e.latlng.lat, e.latlng.lng]);
      onMove(e.latlng.lat, e.latlng.lng);
    },
  });
  return <Marker position={pos} draggable eventHandlers={marker.eventHandlers} />;
}

const dict = {
  back: { ar: "رجوع", en: "Back" },
  editTitle: { ar: "تعديل المقدم", en: "Edit Provider" },
  saveAll: { ar: "حفظ كل التغييرات", en: "Save All Changes" },
  saved: { ar: "تم الحفظ", en: "Saved" },
  savedDesc: { ar: "تم تحديث مقدم الخدمة بنجاح.", en: "Provider updated successfully." },
  verified: { ar: "موثّق", en: "Verified" },
  featured: { ar: "مميز", en: "Featured" },
  // tabs
  tabInfo: { ar: "البيانات الأساسية", en: "Basic Info" },
  tabImages: { ar: "الصور", en: "Images" },
  tabLocation: { ar: "الموقع", en: "Location" },
  // identity
  identity: { ar: "الهوية", en: "Identity" },
  fullName: { ar: "الاسم الكامل", en: "Full Name" },
  fullNamePh: { ar: "الاسم الكامل لمقدم الخدمة", en: "Provider full name" },
  emailPh: { ar: "email@example.com", en: "email@example.com" },
  whatsapp: { ar: "واتساب", en: "WhatsApp" },
  bioLabel: { ar: "نبذة / الوصف", en: "Bio / Description" },
  bioPh: { ar: "وصف مقدم الخدمة...", en: "Provider description..." },
  locationCard: { ar: "العنوان", en: "Location" },
  city: { ar: "المدينة", en: "City" },
  cityPh: { ar: "الرياض", en: "Riyadh" },
  district: { ar: "الحي", en: "District" },
  districtArea: { ar: "الحي / المنطقة", en: "District / Area" },
  districtPh: { ar: "العليا", en: "Al Olaya" },
  catStatusCard: { ar: "التصنيف والحالة", en: "Category & Status" },
  serviceCategory: { ar: "تصنيف الخدمة", en: "Service Category" },
  selectCategoryPh: { ar: "اختر التصنيف...", en: "Select category..." },
  noCategory: { ar: "بدون تصنيف", en: "No category" },
  showVerifiedBadge: { ar: "إظهار شارة التوثيق", en: "Show verified badge" },
  showInFeatured: { ar: "عرض في القسم المميز", en: "Show in featured section" },
  subscription: { ar: "الاشتراك", en: "Subscription" },
  sarPerMo: { ar: "ج.م / شهر", en: "EGP / mo" },
  // images
  profileImage: { ar: "الصورة الشخصية", en: "Profile Image" },
  noImage: { ar: "لا توجد صورة", en: "No image set" },
  imageUrlLbl: { ar: "رابط الصورة", en: "Image URL" },
  imageUrlPh: { ar: "https://example.com/photo.jpg", en: "https://example.com/photo.jpg" },
  imageHint: { ar: "ألصق رابطًا مباشرًا للصورة (JPG, PNG, WebP). يفضّل: مربعة 400×400 بكسل.", en: "Paste a direct image URL (JPG, PNG, WebP). Recommended: square 400×400px." },
  removeImage: { ar: "إزالة الصورة", en: "Remove Image" },
  bannerImage: { ar: "صورة الغلاف", en: "Cover / Banner Image" },
  noBanner: { ar: "لا يوجد غلاف", en: "No banner set" },
  bannerUrl: { ar: "رابط الغلاف", en: "Banner URL" },
  bannerHint: { ar: "ألصق رابطًا مباشرًا للصورة. يفضّل: عريضة 1200×400 بكسل.", en: "Paste a direct image URL. Recommended: wide 1200×400px landscape." },
  removeBanner: { ar: "إزالة الغلاف", en: "Remove Banner" },
  // location/map
  mapLocation: { ar: "موقع الخريطة", en: "Map Location" },
  useMyLocation: { ar: "استخدم موقعي الحالي", en: "Use My Location" },
  mapHint: { ar: "اضغط على أي مكان في الخريطة أو اسحب الدبوس لتحديد موقع المقدم.", en: "Click anywhere on the map or drag the pin to set the provider's location." },
  gps: { ar: "إحداثيات GPS", en: "GPS Coordinates" },
  latitude: { ar: "خط العرض", en: "Latitude" },
  longitude: { ar: "خط الطول", en: "Longitude" },
  openInOSM: { ar: "افتح في OpenStreetMap", en: "Open in OpenStreetMap" },
  clearLocation: { ar: "مسح الموقع", en: "Clear Location" },
  address: { ar: "العنوان", en: "Address" },
  locationError: { ar: "خطأ في الموقع", en: "Location Error" },
  locationErrorDesc: { ar: "تعذّر الحصول على موقعك.", en: "Could not get your location." },
  saveChanges: { ar: "حفظ التغييرات", en: "Save Changes" },
};

export default function AdminProviderEdit() {
  const { id } = useParams<{ id: string }>();
  const providerId = parseInt(id!);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const t = useT(dict);
  const tc = useT(commonDict);
  const { lang, formatDate } = useLanguage();
  const BackIcon = lang === "ar" ? ArrowRight : ArrowLeft;

  const { data: provider, isLoading } = useQuery({
    queryKey: ["provider-detail", providerId],
    queryFn: () => api.providers.get(providerId),
    enabled: !isNaN(providerId),
  });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: api.categories.list });
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [banner, setBanner] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [categoryId, setCategoryId] = useState("none");
  const [verified, setVerified] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [contactMethods, setContactMethods] = useState<string[]>([]);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  useEffect(() => {
    if (provider) {
      setName(provider.userName ?? "");
      setEmail(provider.userEmail ?? "");
      setPhone(provider.phone ?? "");
      setWhatsapp(provider.whatsapp ?? "");
      setBio(provider.bio ?? "");
      setAvatar(provider.avatar ?? "");
      setBanner(provider.banner ?? "");
      setCity(provider.city ?? "");
      setDistrict(provider.district ?? "");
      setCategoryId(provider.categoryId ? String(provider.categoryId) : "none");
      setVerified(provider.verified ?? false);
      setFeatured(provider.featured ?? false);
      setLat(provider.latitude ?? "");
      setLng(provider.longitude ?? "");
      try {
        const raw = (provider as any).contactMethods;
        if (typeof raw === "string" && raw.trim()) {
          const v = JSON.parse(raw);
          if (Array.isArray(v)) setContactMethods(v.map(String));
        } else {
          setContactMethods([]);
        }
      } catch { setContactMethods([]); }
    }
  }, [provider]);

  const mapCenter: [number, number] = lat && lng ? [parseFloat(lat), parseFloat(lng)] : DEFAULT_CENTER;

  const saveProviderMut = useMutation({
    mutationFn: () => {
      const providerPromise = api.admin.providers.update(providerId, {
        bio: bio || undefined, avatar: avatar || undefined, banner: banner || undefined,
        city: city || undefined, district: district || undefined,
        phone: phone || undefined, whatsapp: whatsapp || undefined,
        categoryId: categoryId !== "none" ? parseInt(categoryId) : undefined,
        verified, featured,
        latitude: lat ? parseFloat(lat) : undefined,
        longitude: lng ? parseFloat(lng) : undefined,
        contactMethods: JSON.stringify(contactMethods),
      });
      const userPromise = api.users.update(provider!.userId, {
        name: name || undefined, email: email || undefined, phone: phone || undefined,
      });
      return Promise.all([providerPromise, userPromise]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-detail", providerId] });
      queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      toast({ title: t("saved"), description: t("savedDesc") });
    },
    onError: (e: Error) => toast({ title: tc("error"), description: e.message, variant: "destructive" }),
  });

  const handleGetMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      setLat(pos.coords.latitude.toFixed(6));
      setLng(pos.coords.longitude.toFixed(6));
    }, () => {
      toast({ title: t("locationError"), description: t("locationErrorDesc"), variant: "destructive" });
    });
  };

  if (isLoading || !provider) {
    return (
      <AdminLayout title={t("editTitle")}>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title={`${t("editTitle")}: ${provider.userName}`}>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setLocation("/admin/providers")} className="gap-1">
            <BackIcon className="w-4 h-4" />
            {t("back")}
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{provider.userName}</h1>
            <p className="text-sm text-slate-500">{provider.userEmail}</p>
          </div>
          <div className="flex gap-2">
            {provider.verified && <Badge className="bg-blue-100 text-blue-700 border-none">{t("verified")}</Badge>}
            {provider.featured && <Badge className="bg-amber-100 text-amber-700 border-none">{t("featured")}</Badge>}
            <Badge className="bg-slate-100 text-slate-600 border-none flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {parseFloat(provider.rating).toFixed(1)} ({provider.reviewsCount})
            </Badge>
          </div>
        </div>
        <Button onClick={() => saveProviderMut.mutate()} disabled={saveProviderMut.isPending} className="bg-teal-600 hover:bg-teal-700 gap-2">
          {saveProviderMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t("saveAll")}
        </Button>
      </div>

      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="info" className="gap-1.5"><User className="w-4 h-4" />{t("tabInfo")}</TabsTrigger>
          <TabsTrigger value="images" className="gap-1.5"><Image className="w-4 h-4" />{t("tabImages")}</TabsTrigger>
          <TabsTrigger value="location" className="gap-1.5"><MapPin className="w-4 h-4" />{t("tabLocation")}</TabsTrigger>
        </TabsList>

        <TabsContent value="info">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3"><CardTitle className="text-base">{t("identity")}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>{t("fullName")} *</Label>
                      <div className="relative">
                        <User className="absolute start-3 top-2.5 w-4 h-4 text-slate-400" />
                        <Input className="ps-9" value={name} onChange={e => setName(e.target.value)} placeholder={t("fullNamePh")} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{tc("email")}</Label>
                      <div className="relative">
                        <Mail className="absolute start-3 top-2.5 w-4 h-4 text-slate-400" />
                        <Input dir="ltr" className="ps-9" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder={t("emailPh")} />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{tc("phone")}</Label>
                      <div className="relative">
                        <Phone className="absolute start-3 top-2.5 w-4 h-4 text-slate-400" />
                        <Input dir="ltr" className="ps-9" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+20..." />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("whatsapp")}</Label>
                      <div className="relative">
                        <Globe className="absolute start-3 top-2.5 w-4 h-4 text-slate-400" />
                        <Input dir="ltr" className="ps-9" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+20..." />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("bioLabel")}</Label>
                    <Textarea value={bio} onChange={e => setBio(e.target.value)} rows={4} dir="rtl" placeholder={t("bioPh")} className="resize-none" />
                  </div>

                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    <Label className="text-sm font-semibold">وسائل التواصل المتاحة للعملاء</Label>
                    <p className="text-xs text-slate-500">اختر القنوات التي ستظهر للعملاء في صفحة المزود.</p>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: "phone",    label: "اتصال هاتفي" },
                        { id: "whatsapp", label: "واتساب" },
                        { id: "message",  label: "رسالة داخل الموقع" },
                        { id: "email",    label: "البريد الإلكتروني" },
                      ].map(opt => {
                        const checked = contactMethods.includes(opt.id);
                        return (
                          <label
                            key={opt.id}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition-colors ${
                              checked ? "border-teal-500 bg-teal-50" : "border-slate-200 hover:bg-slate-50"
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) => {
                                setContactMethods(prev =>
                                  e.target.checked ? [...prev, opt.id] : prev.filter(x => x !== opt.id),
                                );
                              }}
                              className="w-4 h-4 accent-teal-600"
                            />
                            <span className="text-sm">{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3"><CardTitle className="text-base">{t("locationCard")}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>{t("city")}</Label>
                      <Input value={city} onChange={e => setCity(e.target.value)} placeholder={t("cityPh")} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t("district")}</Label>
                      <Input value={district} onChange={e => setDistrict(e.target.value)} placeholder={t("districtPh")} />
                    </div>
                  </div>
                </CardContent>
              </Card>

            </div>

            <div className="space-y-5">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3"><CardTitle className="text-base">{t("catStatusCard")}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{t("verified")}</p>
                        <p className="text-xs text-slate-500">{t("showVerifiedBadge")}</p>
                      </div>
                      <Switch checked={verified} onCheckedChange={setVerified} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{t("featured")}</p>
                        <p className="text-xs text-slate-500">{t("showInFeatured")}</p>
                      </div>
                      <Switch checked={featured} onCheckedChange={setFeatured} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {provider.subscription && (
                <Card className="border-teal-200 bg-teal-50 shadow-sm">
                  <CardHeader className="pb-3"><CardTitle className="text-base text-teal-800">{t("subscription")}</CardTitle></CardHeader>
                  <CardContent className="space-y-2 text-sm text-teal-700">
                    <p className="font-bold text-lg">{provider.subscription.packageName}</p>
                    <p>{provider.subscription.packagePrice} {t("sarPerMo")}</p>
                    <p className="text-xs text-teal-500">
                      {formatDate(provider.subscription.startDate)} → {formatDate(provider.subscription.endDate)}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="images">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">{t("profileImage")}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center h-48 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden">
                  {avatar ? (
                    <img src={avatar} alt="avatar" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = "none"; }} />
                  ) : (
                    <div className="text-center text-slate-400">
                      <User className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">{t("noImage")}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>{t("imageUrlLbl")}</Label>
                  <Input dir="ltr" value={avatar} onChange={e => setAvatar(e.target.value)} placeholder={t("imageUrlPh")} />
                  <p className="text-xs text-slate-400">{t("imageHint")}</p>
                </div>
                {avatar && (
                  <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50 w-full" onClick={() => setAvatar("")}>
                    {t("removeImage")}
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3"><CardTitle className="text-base">{t("bannerImage")}</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center h-48 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden">
                  {banner ? (
                    <img src={banner} alt="banner" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = "none"; }} />
                  ) : (
                    <div className="text-center text-slate-400">
                      <Image className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">{t("noBanner")}</p>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>{t("bannerUrl")}</Label>
                  <Input dir="ltr" value={banner} onChange={e => setBanner(e.target.value)} placeholder="https://example.com/banner.jpg" />
                  <p className="text-xs text-slate-400">{t("bannerHint")}</p>
                </div>
                {banner && (
                  <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50 w-full" onClick={() => setBanner("")}>
                    {t("removeBanner")}
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="location">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{t("mapLocation")}</CardTitle>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={handleGetMyLocation}>
                      <Navigation className="w-3.5 h-3.5" />
                      {t("useMyLocation")}
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">{t("mapHint")}</p>
                </CardHeader>
                <CardContent className="p-0 rounded-b-xl overflow-hidden">
                  <div className="h-[420px] w-full">
                    <MapContainer center={mapCenter} zoom={13} style={{ height: "100%", width: "100%" }} key={`${mapCenter[0]}-${mapCenter[1]}`}>
                      <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                      <DisableAutoPan />
                      <DraggableMarker position={mapCenter} onMove={(newLat, newLng) => { setLat(newLat.toFixed(6)); setLng(newLng.toFixed(6)); }} />
                    </MapContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-5">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3"><CardTitle className="text-base">{t("gps")}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>{t("latitude")}</Label>
                    <Input dir="ltr" type="number" step="0.000001" value={lat} onChange={e => setLat(e.target.value)} placeholder="24.688700" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("longitude")}</Label>
                    <Input dir="ltr" type="number" step="0.000001" value={lng} onChange={e => setLng(e.target.value)} placeholder="46.721900" />
                  </div>
                  {lat && lng && (
                    <a href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=15`} target="_blank" rel="noreferrer" className="text-xs text-teal-600 hover:underline flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5" />
                      {t("openInOSM")}
                    </a>
                  )}
                  <Button variant="outline" size="sm" className="w-full text-slate-500" onClick={() => { setLat(""); setLng(""); }}>
                    {t("clearLocation")}
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3"><CardTitle className="text-base">{t("address")}</CardTitle></CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>{t("city")}</Label>
                    <Input value={city} onChange={e => setCity(e.target.value)} placeholder={t("cityPh")} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>{t("districtArea")}</Label>
                    <Input value={district} onChange={e => setDistrict(e.target.value)} placeholder={t("districtPh")} />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

      </Tabs>

      <div className={`fixed bottom-6 ${lang === "ar" ? "left-6" : "right-6"} z-50`}>
        <Button onClick={() => saveProviderMut.mutate()} disabled={saveProviderMut.isPending} size="lg" className="bg-teal-600 hover:bg-teal-700 shadow-xl rounded-full px-8 gap-2">
          {saveProviderMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          {t("saveAll")}
        </Button>
      </div>

    </AdminLayout>
  );
}
