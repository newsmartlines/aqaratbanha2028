import { useState, useEffect, useRef, useMemo } from "react";
import { Save, User, MapPin, Shield, Loader2, Camera, Upload } from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, mediaUrl, type ProviderDetail } from "@/lib/api";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import L from "leaflet";

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

function MapClickPicker({
  lat,
  lng,
  onPick,
}: {
  lat: number;
  lng: number;
  onPick: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return <Marker position={[lat, lng]} />;
}

export default function ProviderSettings() {
  const { toast } = useToast();
  const { user, refetch: refetchAuth } = useAuth();
  const queryClient = useQueryClient();
  const providerId = user?.providerId;

  /* ─── Fetch provider detail ─── */
  const { data: provider, isLoading: providerLoading } = useQuery<ProviderDetail>({
    queryKey: ["providerDetail", providerId],
    queryFn: () => api.providers.get(providerId!),
    enabled: !!providerId,
  });

  /* ─── Local form state ─── */
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [banner, setBanner] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [regionId, setRegionId] = useState("");
  const [cityId, setCityId] = useState("");
  const [latitude, setLatitude] = useState("");
  const [longitude, setLongitude] = useState("");
  const [contactMethods, setContactMethods] = useState<string[]>([]);

  const { data: regions = [] } = useQuery({
    queryKey: ["regions"],
    queryFn: api.regions.list,
    staleTime: 5 * 60_000,
  });
  const selectedRegionCities = useMemo(() => {
    const rid = parseInt(regionId, 10);
    if (!Number.isFinite(rid)) return [];
    return (regions.find((r) => r.id === rid)?.cities ?? []).filter((c) => c.enabled !== false);
  }, [regions, regionId]);
  const mapLat = Number.parseFloat(latitude || "24.7136");
  const mapLng = Number.parseFloat(longitude || "46.6753");

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  /* ─── Populate form once data loads ─── */
  useEffect(() => {
    if (user) {
      setName(user.name ?? "");
      setEmail(user.email ?? "");
      setPhone(user.phone ?? "");
      setAvatar(user.avatar ?? "");
      setRegionId(user.regionId != null && user.regionId > 0 ? String(user.regionId) : "");
      setCityId(user.cityId != null && user.cityId > 0 ? String(user.cityId) : "");
    }
  }, [user]);

  useEffect(() => {
    if (provider) {
      setWhatsapp(provider.whatsapp ?? "");
      setBio(provider.bio ?? "");
      setCity(provider.city ?? "");
      setDistrict(provider.district ?? "");
      setLatitude(provider.latitude ?? "");
      setLongitude(provider.longitude ?? "");
      if (!avatar && provider.avatar) setAvatar(provider.avatar);
      if (!banner && provider.banner) setBanner(provider.banner);
      try {
        const raw = (provider as any).contactMethods;
        if (typeof raw === "string" && raw.trim()) {
          const v = JSON.parse(raw);
          if (Array.isArray(v)) setContactMethods(v.map(String));
        }
      } catch { /* ignore */ }
    }
  }, [provider]);

  /* ─── Mutations ─── */
  const invalidateProviderCaches = () => {
    queryClient.invalidateQueries({ queryKey: ["providerDetail", providerId] });
    queryClient.invalidateQueries({ queryKey: ["providers"] });
  };

  const updateUserMutation = useMutation({
    mutationFn: async () => {
      await api.users.update(user!.id, { name, email, phone: phone || undefined, avatar: avatar || undefined });
      if (providerId && avatar) {
        await api.providers.update(providerId, { avatar });
      }
    },
    onSuccess: () => {
      refetchAuth();
      invalidateProviderCaches();
      toast({ title: "تم الحفظ", description: "تم تحديث المعلومات الشخصية بنجاح" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const updateProviderMutation = useMutation({
    mutationFn: () =>
      api.providers.update(providerId!, {
        bio: bio || undefined,
        avatar: avatar || undefined,
        banner: banner || undefined,
        city: city || undefined,
        district: district || undefined,
        latitude: latitude || undefined,
        longitude: longitude || undefined,
        phone: phone || undefined,
        whatsapp: whatsapp || undefined,
        contactMethods: JSON.stringify(contactMethods),
      }),
    onSuccess: () => {
      invalidateProviderCaches();
      toast({ title: "تم الحفظ", description: "تم تحديث بيانات الموقع والخدمات بنجاح" });
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  const changePasswordMutation = useMutation({
    mutationFn: () => api.auth.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      toast({ title: "تم التغيير", description: "تم تحديث كلمة المرور بنجاح" });
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    },
    onError: (err: Error) => toast({ title: "خطأ", description: err.message, variant: "destructive" }),
  });

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-4xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold text-foreground">الإعدادات</h1>
          <p className="text-muted-foreground mt-1">تحديث ملفك الشخصي وتفضيلات الحساب</p>
        </div>

        <Tabs defaultValue="personal" className="w-full" dir="rtl">
          <TabsList className="w-full sm:w-auto grid w-full grid-cols-3 mb-6 bg-card border shadow-sm rounded-xl h-auto p-1">
            <TabsTrigger value="personal" className="py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <User className="w-4 h-4 ml-2" />
              <span className="hidden sm:inline">المعلومات الشخصية</span>
              <span className="sm:hidden">الشخصية</span>
            </TabsTrigger>
            <TabsTrigger value="location" className="py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <MapPin className="w-4 h-4 ml-2" />
              <span className="hidden sm:inline">الموقع والملف</span>
              <span className="sm:hidden">الموقع</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="py-2.5 rounded-lg data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Shield className="w-4 h-4 ml-2" />
              الأمان
            </TabsTrigger>
          </TabsList>

          {/* ─── Personal Info ─── */}
          <TabsContent value="personal" className="space-y-4">
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">المعلومات الأساسية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Avatar upload */}
                <div className="flex items-center gap-4">
                  <div className="relative group cursor-pointer" onClick={() => fileInputRef.current?.click()}>
                    <div className="w-20 h-20 rounded-full border-4 border-primary/20 overflow-hidden bg-secondary flex-shrink-0">
                      {avatar ? (
                        <img src={mediaUrl(avatar)} alt={name} className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.src = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`; }} />
                      ) : (
                        <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name)}`} alt={name} className="w-full h-full object-cover" />
                      )}
                    </div>
                    <div className="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      {uploadingAvatar ? (
                        <Loader2 className="w-6 h-6 text-white animate-spin" />
                      ) : (
                        <Camera className="w-6 h-6 text-white" />
                      )}
                    </div>
                  </div>
                  <div className="flex-1 space-y-2">
                    <Label>الصورة الشخصية</Label>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        setUploadingAvatar(true);
                        try {
                          const { url } = await api.upload.avatar(file);
                          setAvatar(url);
                          toast({ title: "تم رفع الصورة", description: "تذكّر حفظ التغييرات" });
                        } catch (err: any) {
                          toast({ title: "فشل رفع الصورة", description: err.message, variant: "destructive" });
                        } finally {
                          setUploadingAvatar(false);
                          e.target.value = "";
                        }
                      }}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full rounded-xl"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingAvatar}
                    >
                      {uploadingAvatar ? (
                        <><Loader2 className="w-4 h-4 animate-spin ml-2" /> جاري الرفع...</>
                      ) : (
                        <><Upload className="w-4 h-4 ml-2" /> اختر صورة (JPG / PNG / WEBP)</>
                      )}
                    </Button>
                    <p className="text-xs text-muted-foreground">الحجم الأقصى: 5 ميجابايت</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">الاسم الكامل</Label>
                    <Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">البريد الإلكتروني</Label>
                    <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="rounded-xl text-left" dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">رقم الجوال</Label>
                    <Input id="phone" value={phone} onChange={(e) => setPhone(e.target.value)} className="rounded-xl text-left" dir="ltr" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="whatsapp">رقم الواتساب</Label>
                    <Input id="whatsapp" value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className="rounded-xl text-left" dir="ltr" />
                  </div>
                </div>

                {/* Communication preferences */}
                {providerId && (
                  <div className="space-y-3 pt-4 border-t">
                    <div>
                      <Label className="text-base font-semibold">وسائل التواصل المتاحة للعملاء</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        اختر القنوات التي تريد ظهورها في صفحتك العامة. لو لم تختر أيًّا منها فلن يستطيع العملاء التواصل معك.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl border cursor-pointer transition-colors ${
                              checked ? "border-primary bg-primary/5" : "border-border hover:bg-secondary/50"
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
                              className="w-4 h-4 accent-primary"
                            />
                            <span className="text-sm font-medium">{opt.label}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex justify-end pt-4 border-t">
                  <Button
                    onClick={() => {
                      updateUserMutation.mutate();
                      if (providerId) {
                        updateProviderMutation.mutate();
                      }
                    }}
                    className="rounded-xl px-8 bg-primary hover:bg-primary/90"
                    disabled={updateUserMutation.isPending || updateProviderMutation.isPending}
                  >
                    {updateUserMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    ) : (
                      <Save className="w-4 h-4 ml-2" />
                    )}
                    حفظ التغييرات
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Location & Profile ─── */}
          <TabsContent value="location" className="space-y-4">
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">الموقع والنبذة الشخصية</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {providerLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-6 h-6 animate-spin text-primary" />
                  </div>
                ) : (
                  <>
                    {/* ── Banner upload ── */}
                    <div className="space-y-3">
                      <Label className="text-base font-semibold">صورة البانر (تظهر في أعلى صفحة ملفك الشخصي)</Label>
                      <div
                        className="relative w-full h-36 rounded-xl overflow-hidden bg-secondary border-2 border-dashed border-border/60 cursor-pointer group"
                        onClick={() => bannerInputRef.current?.click()}
                      >
                        {banner ? (
                          <img
                            src={banner}
                            alt="banner"
                            className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = "none"; }}
                          />
                        ) : (
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-muted-foreground">
                            <Upload className="w-8 h-8 mb-2 opacity-40" />
                            <span className="text-sm">اضغط لرفع صورة البانر</span>
                          </div>
                        )}
                        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity rounded-xl">
                          {uploadingBanner ? (
                            <Loader2 className="w-8 h-8 text-white animate-spin" />
                          ) : (
                            <Camera className="w-8 h-8 text-white" />
                          )}
                        </div>
                      </div>
                      <input
                        ref={bannerInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          setUploadingBanner(true);
                          try {
                            const { url } = await api.upload.banner(file);
                            setBanner(url);
                            toast({ title: "تم رفع البانر", description: "تذكّر الضغط على حفظ التغييرات" });
                          } catch (err: any) {
                            toast({ title: "فشل رفع البانر", description: err.message, variant: "destructive" });
                          } finally {
                            setUploadingBanner(false);
                            e.target.value = "";
                          }
                        }}
                      />
                      <div className="flex gap-3">
                        <Button
                          type="button"
                          variant="outline"
                          className="flex-1 rounded-xl"
                          onClick={() => bannerInputRef.current?.click()}
                          disabled={uploadingBanner}
                        >
                          {uploadingBanner ? (
                            <><Loader2 className="w-4 h-4 animate-spin ml-2" />جاري الرفع...</>
                          ) : (
                            <><Upload className="w-4 h-4 ml-2" />اختر صورة (JPG / PNG / WEBP)</>
                          )}
                        </Button>
                        {banner && (
                          <Button
                            type="button"
                            variant="outline"
                            className="rounded-xl text-destructive border-destructive/30 hover:bg-destructive/10"
                            onClick={() => setBanner("")}
                          >
                            حذف البانر
                          </Button>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">الأبعاد المثالية: 1200×300 بكسل — الحجم الأقصى: 5 ميجابايت</p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="region">المنطقة</Label>
                        <Select
                          value={regionId || "__none__"}
                          onValueChange={(v) => {
                            if (v === "__none__") {
                              setRegionId("");
                              setCityId("");
                              setCity("");
                              return;
                            }
                            setRegionId(v);
                            setCityId("");
                            setCity("");
                          }}
                        >
                          <SelectTrigger id="region" className="rounded-xl">
                            <SelectValue placeholder="اختر المنطقة" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">—</SelectItem>
                            {regions.map((r) => (
                              <SelectItem key={r.id} value={String(r.id)}>{r.nameAr}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="city">المدينة</Label>
                        <Select
                          value={cityId || "__none__"}
                          onValueChange={(v) => {
                            if (v === "__none__") {
                              setCityId("");
                              setCity("");
                              return;
                            }
                            setCityId(v);
                            const selected = selectedRegionCities.find((c) => c.id === parseInt(v, 10));
                            setCity(selected?.nameAr ?? "");
                          }}
                          disabled={!regionId}
                        >
                          <SelectTrigger id="city" className="rounded-xl">
                            <SelectValue placeholder="اختر المدينة" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">—</SelectItem>
                            {selectedRegionCities.map((c) => (
                              <SelectItem key={c.id} value={String(c.id)}>{c.nameAr}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-2 sm:col-span-1">
                        <Label>Latitude</Label>
                        <Input value={latitude} onChange={(e) => setLatitude(e.target.value)} dir="ltr" />
                      </div>
                      <div className="space-y-2 sm:col-span-1">
                        <Label>Longitude</Label>
                        <Input value={longitude} onChange={(e) => setLongitude(e.target.value)} dir="ltr" />
                      </div>
                      <div className="space-y-2 sm:col-span-1 flex items-end">
                        <Button
                          type="button"
                          variant="outline"
                          className="w-full rounded-xl"
                          onClick={() => {
                            if (!navigator.geolocation) return;
                            navigator.geolocation.getCurrentPosition((pos) => {
                              setLatitude(String(pos.coords.latitude.toFixed(6)));
                              setLongitude(String(pos.coords.longitude.toFixed(6)));
                            });
                          }}
                        >
                          تحديد موقعي
                        </Button>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>اختيار الموقع على الخريطة</Label>
                      <div className="h-72 overflow-hidden rounded-xl border border-border/60">
                        <MapContainer center={[mapLat, mapLng]} zoom={12} className="h-full w-full">
                          <TileLayer
                            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                            attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                          />
                          <MapClickPicker
                            lat={mapLat}
                            lng={mapLng}
                            onPick={(lat, lng) => {
                              setLatitude(lat.toFixed(6));
                              setLongitude(lng.toFixed(6));
                            }}
                          />
                        </MapContainer>
                      </div>
                      <p className="text-xs text-muted-foreground">اضغط على الخريطة لتحديد الإحداثيات تلقائياً.</p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bio">نبذة عنك (تظهر للعملاء)</Label>
                      <Textarea
                        id="bio"
                        rows={4}
                        value={bio}
                        onChange={(e) => setBio(e.target.value)}
                        className="rounded-xl resize-none"
                        placeholder="اكتب نبذة قصيرة تعريفية عنك وعن خدماتك..."
                      />
                    </div>

                    <div className="flex justify-end pt-4 border-t">
                      <Button
                        onClick={() => updateProviderMutation.mutate()}
                        className="rounded-xl px-8 bg-primary hover:bg-primary/90"
                        disabled={updateProviderMutation.isPending}
                      >
                        {updateProviderMutation.isPending ? (
                          <Loader2 className="w-4 h-4 animate-spin ml-2" />
                        ) : (
                          <Save className="w-4 h-4 ml-2" />
                        )}
                        حفظ التغييرات
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-xl mr-2"
                        onClick={async () => {
                          if (!user) return;
                          await api.users.update(user.id, {
                            regionId: regionId ? parseInt(regionId, 10) : null,
                            cityId: cityId ? parseInt(cityId, 10) : null,
                          });
                          await refetchAuth();
                          toast({ title: "تم الحفظ", description: "تم تحديث المنطقة والمدينة" });
                        }}
                      >
                        حفظ المنطقة/المدينة
                      </Button>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ─── Security ─── */}
          <TabsContent value="security" className="space-y-4">
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">تغيير كلمة المرور</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4 max-w-md">
                  <div className="space-y-2">
                    <Label htmlFor="current">كلمة المرور الحالية</Label>
                    <Input
                      id="current" type="password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="rounded-xl text-left" dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="new">كلمة المرور الجديدة</Label>
                    <Input
                      id="new" type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="rounded-xl text-left" dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm">تأكيد كلمة المرور الجديدة</Label>
                    <Input
                      id="confirm" type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="rounded-xl text-left" dir="ltr"
                    />
                    {newPassword && confirmPassword && newPassword !== confirmPassword && (
                      <p className="text-xs text-red-500">كلمتا المرور غير متطابقتين</p>
                    )}
                  </div>
                </div>

                <div className="flex justify-start pt-4 border-t max-w-md">
                  <Button
                    onClick={() => changePasswordMutation.mutate()}
                    className="rounded-xl px-8 bg-primary hover:bg-primary/90"
                    disabled={
                      !currentPassword ||
                      !newPassword ||
                      newPassword !== confirmPassword ||
                      changePasswordMutation.isPending
                    }
                  >
                    {changePasswordMutation.isPending ? (
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    ) : (
                      <Save className="w-4 h-4 ml-2" />
                    )}
                    تحديث كلمة المرور
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
