import { useState, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Upload, Plus, Camera, MapPin, CheckCircle2, ChevronLeft, ChevronRight, Check, Phone, MessageCircle, Mail, Video, User, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CityAreaSelector from "@/components/CityAreaSelector";
import { api } from "@/lib/api";
import { useApi } from "@/lib/use-api";
import { useAuth } from "@/lib/auth-context";

const CONTACT_METHODS = [
  { id: "call", label: "مكالمة هاتفية", icon: Phone },
  { id: "whatsapp", label: "واتساب", icon: MessageCircle },
  { id: "chat", label: "دردشة داخلية", icon: Video },
  { id: "email", label: "بريد إلكتروني", icon: Mail },
];

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, refetch: refetchAuth } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const { data: categories = [] } = useApi(() => api.categories.list(), []);

  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: api.settings.list,
    staleTime: 5 * 60 * 1000,
  });
  const siteName = (settings as any)?.siteName ?? "دليل بلس";

  const siteNavLinks = [
    { href: "/", label: "الرئيسية" },
    { href: "/categories", label: "التصنيفات" },
    { href: "/search", label: "تصفح الخدمات" },
    { href: "/about", label: "من نحن" },
    { href: "/contact", label: "تواصل معنا" },
  ];

  // Simulated form state
  const [basicInfo, setBasicInfo] = useState({ name: "", phone: "", email: "", bio: "", avatar: "", cover: "" });
  const [locCityId, setLocCityId] = useState<number | null>(null);
  const [locCityName, setLocCityName] = useState<string | null>(null);
  const [locAreaIds, setLocAreaIds] = useState<number[]>([]);
  const [locAreaNames, setLocAreaNames] = useState<string[]>([]);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<number[]>([]);
  const [selectedContactMethods, setSelectedContactMethods] = useState<string[]>(["whatsapp"]);
  const [services, setServices] = useState([{ id: 1, title: "", desc: "", price: "" }]);
  const [gallery, setGallery] = useState<string[]>([]);
  const [contact, setContact] = useState({ showPhone: true, whatsapp: "", visible: true });
  const [plan, setPlan] = useState("free");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const totalSteps = 7;

  const handleNext = () => {
    const newErrors: Record<string, string> = {};
    let valid = true;

    if (step === 1) {
      if (!basicInfo.name) newErrors.name = "الاسم مطلوب";
      if (!basicInfo.phone) newErrors.phone = "رقم الجوال مطلوب";
      if (!basicInfo.email) newErrors.email = "البريد الإلكتروني مطلوب";
      if (Object.keys(newErrors).length > 0) valid = false;
    } else if (step === 2) {
      if (!locCityId) newErrors.city = "يرجى اختيار المدينة";
      if (Object.keys(newErrors).length > 0) valid = false;
    } else if (step === 3) {
      if (!services[0].title) newErrors.service = "يجب إضافة خدمة واحدة على الأقل";
      if (Object.keys(newErrors).length > 0) valid = false;
    }

    if (!valid) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    if (step < totalSteps) {
      setStep(s => s + 1);
    }
  };

  const handleBack = () => {
    if (step > 1) setStep(s => s - 1);
  };

  const handleSubmit = async () => {
    if (!user?.providerId) {
      toast({ title: "خطأ", description: "يرجى تسجيل الدخول أولاً", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      // 1. Update user name + phone
      await api.users.update(user.id, {
        name: basicInfo.name || undefined,
        phone: basicInfo.phone || undefined,
      });

      // 2. Update provider profile
      await api.providers.update(user.providerId, {
        bio: basicInfo.bio || undefined,
        city: locCityName || undefined,
        phone: basicInfo.phone || undefined,
        whatsapp: contact.whatsapp || undefined,
        categoryId: selectedCategoryIds[0] || undefined,
      });

      // 3. Create services (skip empty ones)
      const validServices = services.filter(s => s.title.trim());
      for (const svc of validServices) {
        await api.services.create(user.providerId, {
          title: svc.title.trim(),
          description: svc.desc || undefined,
          price: svc.price || undefined,
          categoryId: selectedCategoryIds[0] || undefined,
        });
      }

      // 4. Subscribe to paid plan if selected
      if (plan !== "free") {
        const packages = await api.packages.list();
        // Match by approximate price bracket: bronze ≤ 150 SAR, premium > 150
        const matchPkg = packages.find(p =>
          plan === "bronze"
            ? parseFloat(p.price) > 0 && parseFloat(p.price) <= 150
            : parseFloat(p.price) > 150
        );
        if (matchPkg) {
          await api.subscriptions.subscribe(user.providerId, matchPkg.id);
        }
      }

      await refetchAuth();
      setStep(8);
    } catch (err: any) {
      toast({ title: "خطأ في حفظ البيانات", description: err.message ?? "حدث خطأ غير متوقع", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddService = () => {
    setServices([...services, { id: Date.now(), title: "", desc: "", price: "" }]);
  };

  const handleRemoveService = (id: number) => {
    if (services.length > 1) {
      setServices(services.filter(s => s.id !== id));
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBasicInfo({ ...basicInfo, avatar: URL.createObjectURL(e.target.files[0]) });
    }
  };

  const handleCoverUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setBasicInfo({ ...basicInfo, cover: URL.createObjectURL(e.target.files[0]) });
    }
  };

  const handleGalleryUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      if (gallery.length < 8) {
        setGallery([...gallery, URL.createObjectURL(e.target.files[0])]);
      } else {
        toast({ title: "عذراً", description: "الحد الأقصى هو 8 صور", variant: "destructive" });
      }
    }
  };

  // Step renderers
  const renderStep1 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="text-center md:text-start mb-8">
        <h2 className="text-3xl font-bold mb-2">المعلومات الأساسية</h2>
        <p className="text-muted-foreground">أخبرنا عن نفسك ليتعرف عليك العملاء</p>
      </div>

      <div className="relative mb-12">
        <div className="h-40 w-full rounded-2xl bg-secondary/50 border-2 border-dashed border-border relative overflow-hidden flex items-center justify-center group cursor-pointer">
          <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-20" accept="image/*" onChange={handleCoverUpload} />
          {basicInfo.cover ? (
            <img src={basicInfo.cover} alt="Cover" className="w-full h-full object-cover" />
          ) : (
            <div className="text-center text-muted-foreground group-hover:text-primary transition-colors">
              <Camera className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <span className="text-sm font-medium">إضافة صورة الغلاف</span>
            </div>
          )}
        </div>
        
        <div className="absolute -bottom-10 right-8 z-30">
          <div className="h-24 w-24 rounded-full bg-background border-4 border-background shadow-xl overflow-hidden relative group cursor-pointer">
            <input type="file" className="absolute inset-0 opacity-0 cursor-pointer z-20" accept="image/*" onChange={handleAvatarUpload} />
            {basicInfo.avatar ? (
              <img src={basicInfo.avatar} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary">
                <Upload className="h-6 w-6" />
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-5 pt-4">
        <div className="space-y-2">
          <Label htmlFor="name">الاسم الكامل *</Label>
          <Input id="name" value={basicInfo.name} onChange={e => setBasicInfo({...basicInfo, name: e.target.value})} className={`h-12 ${errors.name ? "border-destructive focus-visible:ring-destructive" : ""}`} placeholder="أدخل اسمك أو اسم نشاطك" />
          {errors.name && <p className="text-sm text-destructive">{errors.name}</p>}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label htmlFor="phone">رقم الجوال *</Label>
            <Input id="phone" value={basicInfo.phone} onChange={e => {
              setBasicInfo({...basicInfo, phone: e.target.value});
              if(step === 1 && !contact.whatsapp) setContact({...contact, whatsapp: e.target.value});
            }} className={`h-12 ${errors.phone ? "border-destructive focus-visible:ring-destructive" : ""}`} placeholder="05xxxxxxxx" dir="ltr" />
            {errors.phone && <p className="text-sm text-destructive">{errors.phone}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">البريد الإلكتروني *</Label>
            <Input id="email" type="email" value={basicInfo.email} onChange={e => setBasicInfo({...basicInfo, email: e.target.value})} className={`h-12 ${errors.email ? "border-destructive focus-visible:ring-destructive" : ""}`} placeholder="example@domain.com" dir="ltr" />
            {errors.email && <p className="text-sm text-destructive">{errors.email}</p>}
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="bio">نبذة تعريفية</Label>
          <Textarea id="bio" value={basicInfo.bio} onChange={e => setBasicInfo({...basicInfo, bio: e.target.value})} placeholder="اكتب نبذة مختصرة عنك وعن الخدمات التي تقدمها (اختياري)" className="resize-none h-24" />
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="text-center md:text-start mb-8">
        <h2 className="text-3xl font-bold mb-2">الموقع ومناطق الخدمة</h2>
        <p className="text-muted-foreground">حدد أين تقدم خدماتك ليتواصل معك العملاء في منطقتك</p>
      </div>

      <div className="space-y-6">
        <div className="space-y-2">
          <Label>المدينة ومناطق الخدمة *</Label>
          <CityAreaSelector
            selectedCityId={locCityId}
            selectedAreaIds={locAreaIds}
            onCityChange={(id, name) => { setLocCityId(id); setLocCityName(name); setLocAreaIds([]); setLocAreaNames([]); }}
            onAreasChange={(ids, names) => { setLocAreaIds(ids); setLocAreaNames(names); }}
            showAllOption={false}
          />
          {errors.city && <p className="text-sm text-destructive">{errors.city}</p>}
        </div>

        {locAreaNames.length > 0 && (
          <div className="pt-4 border-t">
            <Label className="text-base font-bold mb-3 block">مناطق الخدمة المختارة</Label>
            <div className="flex flex-wrap gap-2">
              {locAreaNames.map(name => (
                <span key={name} className="inline-flex items-center gap-1.5 bg-teal-100 text-teal-700 border border-teal-200 rounded-full px-3 py-1 text-sm font-medium">
                  <MapPin className="w-3 h-3" />
                  {name}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="text-center md:text-start mb-8">
        <h2 className="text-3xl font-bold mb-2">تفاصيل الخدمة</h2>
        <p className="text-muted-foreground">أضف الخدمات التي تقدمها بتفاصيلها وأسعارها</p>
      </div>

      <div className="space-y-4 mb-8">
        <div className="space-y-2">
          <Label className="text-base font-bold">التصنيفات الرئيسية * <span className="text-muted-foreground font-normal text-sm">(يمكنك اختيار أكثر من تصنيف)</span></Label>
          {errors.category && <p className="text-sm text-destructive">{errors.category}</p>}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {(categories as any[]).map((cat: any) => {
              const selected = selectedCategoryIds.includes(cat.id);
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => {
                    setSelectedCategoryIds(prev =>
                      selected ? prev.filter(id => id !== cat.id) : [...prev, cat.id]
                    );
                  }}
                  className={`flex items-center gap-2 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium text-right ${selected ? "border-primary bg-primary/8 text-primary" : "border-border/60 hover:border-primary/40 hover:bg-secondary/30"}`}
                >
                  {selected && <Check className="w-4 h-4 shrink-0 text-primary" />}
                  <span>{cat.nameAr}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="flex items-center justify-between border-b pb-4">
          <h3 className="font-bold text-lg">قائمة الخدمات</h3>
          <Button type="button" variant="outline" size="sm" onClick={handleAddService} className="rounded-full">
            <Plus className="w-4 h-4 ml-1" /> إضافة خدمة
          </Button>
        </div>

        {errors.service && <p className="text-sm text-destructive">{errors.service}</p>}

        <div className="space-y-6">
          {services.map((service, index) => (
            <Card key={service.id} className="relative overflow-visible border-border/50 shadow-sm">
              {services.length > 1 && (
                <button 
                  onClick={() => handleRemoveService(service.id)}
                  className="absolute -top-3 -left-3 w-8 h-8 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center shadow-md hover:bg-destructive/90 transition-colors z-10"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <CardContent className="p-5 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="space-y-2 md:col-span-3">
                    <Label>عنوان الخدمة *</Label>
                    <Input 
                      placeholder="مثال: صيانة مكيفات سبليت" 
                      value={service.title}
                      onChange={e => setServices(services.map(s => s.id === service.id ? {...s, title: e.target.value} : s))}
                      className="h-11"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>السعر (اختياري)</Label>
                    <div className="relative">
                      <Input 
                        placeholder="0.00" 
                        value={service.price}
                        onChange={e => setServices(services.map(s => s.id === service.id ? {...s, price: e.target.value} : s))}
                        className="h-11 pr-12" 
                        dir="ltr"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">ر.س</span>
                    </div>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>وصف الخدمة</Label>
                  <Textarea 
                    placeholder="اشرح تفاصيل الخدمة وما يميزها..." 
                    value={service.desc}
                    onChange={e => setServices(services.map(s => s.id === service.id ? {...s, desc: e.target.value} : s))}
                    className="resize-none h-20"
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="text-center md:text-start mb-8">
        <h2 className="text-3xl font-bold mb-2">معرض الأعمال</h2>
        <p className="text-muted-foreground">أضف صوراً لأعمالك السابقة لجذب المزيد من العملاء (اختياري)</p>
      </div>

      <div className="border-2 border-dashed border-border/60 rounded-2xl p-10 text-center hover:bg-secondary/20 hover:border-primary/50 transition-colors cursor-pointer relative group">
        <input type="file" multiple accept="image/jpeg,image/png" className="absolute inset-0 opacity-0 cursor-pointer z-10" onChange={handleGalleryUpload} />
        <div className="w-16 h-16 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform">
          <Upload className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold mb-1">اسحب الصور هنا أو اضغط للاختيار</h3>
        <p className="text-sm text-muted-foreground">صيغ JPG و PNG مدعومة (الحد الأقصى 8 صور)</p>
      </div>

      {gallery.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {gallery.map((img, i) => (
            <div key={i} className="relative aspect-square rounded-xl overflow-hidden border shadow-sm group">
              <img src={img} alt={`Gallery ${i}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
              <button 
                onClick={() => setGallery(gallery.filter((_, index) => index !== i))}
                className="absolute top-2 right-2 w-8 h-8 rounded-full bg-background/80 backdrop-blur-sm text-foreground flex items-center justify-center hover:bg-destructive hover:text-destructive-foreground transition-colors shadow-sm"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderStep5 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="text-center md:text-start mb-8">
        <h2 className="text-3xl font-bold mb-2">التواصل والظهور</h2>
        <p className="text-muted-foreground">كيف تفضل أن يتواصل معك العملاء؟</p>
      </div>

      <div className="space-y-8">
        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-6 space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-bold">إظهار رقم الهاتف للعملاء</Label>
                <p className="text-sm text-muted-foreground">سيتمكن العملاء من رؤية رقمك والاتصال بك مباشرة</p>
              </div>
              <Switch checked={contact.showPhone} onCheckedChange={c => setContact({...contact, showPhone: c})} />
            </div>

            <div className="pt-6 border-t">
              <Label className="text-base font-bold mb-4 block">طرق التواصل المتاحة <span className="text-muted-foreground font-normal text-sm">(اختر كل ما ينطبق)</span></Label>
              <div className="grid grid-cols-2 gap-3">
                {CONTACT_METHODS.map(m => {
                  const selected = selectedContactMethods.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedContactMethods(prev =>
                          selected ? prev.filter(x => x !== m.id) : [...prev, m.id]
                        );
                      }}
                      className={`flex items-center gap-2.5 px-4 py-3 rounded-xl border-2 transition-all text-sm font-medium ${selected ? "border-primary bg-primary/8 text-primary" : "border-border/60 hover:border-primary/40 hover:bg-secondary/30"}`}
                    >
                      <m.icon className={`w-4 h-4 ${selected ? "text-primary" : "text-muted-foreground"}`} />
                      {m.label}
                      {selected && <Check className="w-3.5 h-3.5 mr-auto text-primary" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedContactMethods.includes("whatsapp") && (
              <div className="pt-4 animate-in fade-in slide-in-from-top-2">
                <Label>رقم الواتساب</Label>
                <Input value={contact.whatsapp} onChange={e => setContact({...contact, whatsapp: e.target.value})} className="mt-2 h-11" dir="ltr" placeholder="+966xxxxxxxxx" />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60 shadow-sm">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label className="text-base font-bold">إظهار ملفي في نتائج البحث</Label>
                <p className="text-sm text-muted-foreground">يمكنك إيقاف هذا الخيار إذا كنت لا تستقبل طلبات جديدة حالياً</p>
              </div>
              <Switch checked={contact.visible} onCheckedChange={c => setContact({...contact, visible: c})} />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderStep6 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="text-center md:text-start mb-8">
        <h2 className="text-3xl font-bold mb-2">اختر باقتك</h2>
        <p className="text-muted-foreground">اختر الباقة التي تناسب حجم نشاطك</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Free Plan */}
        <Card 
          className={`cursor-pointer transition-all duration-300 relative overflow-hidden ${plan === "free" ? "border-primary shadow-md ring-1 ring-primary" : "border-border/60 hover:border-primary/50 hover:shadow-sm"}`}
          onClick={() => setPlan("free")}
        >
          <CardContent className="p-6 flex flex-col h-full">
            <div className="mb-4">
              <h3 className="font-bold text-xl mb-2">مجاني</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black">مجاناً</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8 flex-1 text-sm">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> ملف شخصي أساسي</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> ظهور في البحث</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> حتى 3 خدمات</li>
            </ul>
            <div className="pt-4 border-t border-border/40 mb-6 space-y-2 text-xs text-muted-foreground">
              <div className="flex justify-between"><span>عمولة المنصة</span><span className="font-bold text-foreground">15%</span></div>
              <div className="flex justify-between"><span>أولوية البحث</span><span className="font-bold text-foreground">عادية</span></div>
              <div className="flex justify-between"><span>إعلانات مميزة</span><span className="font-bold text-foreground">غير متاح</span></div>
            </div>
            <div className={`text-center py-2.5 rounded-lg font-bold text-sm transition-colors ${plan === "free" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
              اختر المجاني
            </div>
          </CardContent>
        </Card>

        {/* Bronze Plan */}
        <Card 
          className={`cursor-pointer transition-all duration-300 relative overflow-hidden md:-translate-y-4 md:scale-105 ${plan === "bronze" ? "border-primary shadow-xl ring-2 ring-primary" : "border-primary/30 shadow-md hover:border-primary/80"}`}
          onClick={() => setPlan("bronze")}
        >
          <div className="absolute top-0 inset-x-0 bg-primary text-primary-foreground text-xs font-bold text-center py-1">موصى به</div>
          <CardContent className="p-6 pt-8 flex flex-col h-full bg-primary/5">
            <div className="mb-4">
              <h3 className="font-bold text-xl mb-2 text-primary">برونزي</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-primary">٩٩</span>
                <span className="text-muted-foreground font-medium">ر.س / شهر</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8 flex-1 text-sm font-medium">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> كل مزايا المجاني</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> حتى 10 خدمات</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> ظهور مميز</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> شارة موثق</li>
            </ul>
            <div className={`text-center py-3 rounded-lg font-bold text-sm transition-colors ${plan === "bronze" ? "bg-primary text-primary-foreground" : "bg-primary/20 text-primary"}`}>
              اشترك الآن
            </div>
          </CardContent>
        </Card>

        {/* Premium Plan */}
        <Card 
          className={`cursor-pointer transition-all duration-300 relative overflow-hidden ${plan === "premium" ? "border-primary shadow-md ring-1 ring-primary" : "border-border/60 hover:border-primary/50 hover:shadow-sm"}`}
          onClick={() => setPlan("premium")}
        >
          <CardContent className="p-6 flex flex-col h-full">
            <div className="mb-4">
              <h3 className="font-bold text-xl mb-2">بريميوم</h3>
              <div className="flex items-baseline gap-1">
                <span className="text-3xl font-black">٢٤٩</span>
                <span className="text-muted-foreground text-sm">ر.س / شهر</span>
              </div>
            </div>
            <ul className="space-y-3 mb-8 flex-1 text-sm">
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> كل مزايا البرونزي</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> خدمات غير محدودة</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> أولوية في البحث</li>
              <li className="flex items-center gap-2"><Check className="w-4 h-4 text-primary" /> دعم مخصص</li>
            </ul>
            <div className={`text-center py-2.5 rounded-lg font-bold text-sm transition-colors ${plan === "premium" ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground"}`}>
              اشترك الآن
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  const renderStep7 = () => (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-8 duration-500">
      <div className="text-center md:text-start mb-8">
        <h2 className="text-3xl font-bold mb-2">مراجعة وإرسال</h2>
        <p className="text-muted-foreground">تأكد من صحة بياناتك قبل إرسال الطلب</p>
      </div>

      <div className="space-y-6">
        <Card className="overflow-hidden border-border/60">
          <div className="h-24 bg-muted relative">
            {basicInfo.cover && <img src={basicInfo.cover} alt="Cover" className="w-full h-full object-cover" />}
          </div>
          <CardContent className="p-6 relative pt-12">
            <div className="absolute -top-10 right-6 w-20 h-20 rounded-full border-4 border-card bg-background overflow-hidden">
              {basicInfo.avatar ? (
                <img src={basicInfo.avatar} alt="Avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-primary/10 flex items-center justify-center text-primary"><User className="w-8 h-8" /></div>
              )}
            </div>
            
            <div className="flex justify-between items-start mb-6">
              <div>
                <h3 className="font-bold text-xl">{basicInfo.name || "لم يتم إدخال الاسم"}</h3>
                <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5" /> 
                  {locCityName ? locCityName : "لم يتم تحديد الموقع"}
                </p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => setStep(1)} className="text-primary h-8">تعديل</Button>
            </div>

            <div className="space-y-4 border-t pt-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h4 className="font-bold text-sm text-muted-foreground">الخدمات المضافة ({services.filter(s=>s.title).length})</h4>
                  <Button variant="ghost" size="sm" onClick={() => setStep(3)} className="text-primary h-6 text-xs">تعديل</Button>
                </div>
                <div className="space-y-2">
                  {services.filter(s => s.title).map(s => (
                    <div key={s.id} className="flex justify-between bg-secondary/30 p-2 rounded text-sm">
                      <span className="font-medium">{s.title}</span>
                      {s.price && <span className="text-primary font-bold">{s.price} ر.س</span>}
                    </div>
                  ))}
                  {services.filter(s => s.title).length === 0 && <p className="text-sm text-muted-foreground">لم يتم إضافة خدمات</p>}
                </div>
              </div>
              
              <div className="flex items-center justify-between bg-primary/5 p-3 rounded-lg border border-primary/10">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-primary" />
                  <span className="font-bold">الباقة المختارة: 
                    {plan === 'free' ? ' مجاني' : plan === 'bronze' ? ' برونزي' : ' بريميوم'}
                  </span>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setStep(6)} className="text-primary h-6 text-xs">تغيير</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );

  if (step === 8) {
    return (
      <div className="min-h-[100dvh] bg-background flex flex-col items-center justify-center p-4" dir="rtl">
        <div className="max-w-md w-full text-center space-y-6 animate-in zoom-in-95 duration-500">
          <div className="w-24 h-24 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-6">
            <Check className="w-12 h-12" />
          </div>
          <h1 className="text-3xl font-bold">تم تسجيل بياناتك بنجاح! 🎉</h1>
          <p className="text-muted-foreground text-lg leading-relaxed">
            تم حفظ ملفك الشخصي وخدماتك. سيتم مراجعة حسابك من قِبَل فريقنا وتفعيله قريباً.
          </p>
          <div className="pt-6 space-y-3">
            <Button
              className="w-full h-14 rounded-xl text-lg font-bold shadow-lg bg-primary hover:bg-primary/90"
              onClick={() => setLocation("/dashboard")}
            >
              الذهاب إلى لوحة التحكم
            </Button>
            <Button variant="outline" className="w-full h-12 rounded-xl" onClick={() => setLocation("/")}>
              العودة إلى الرئيسية
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] flex flex-col font-sans selection:bg-primary/20 selection:text-primary bg-background">
      {/* ── Top Banner: Logo + Site Navigation ── */}
      <header className="shrink-0 bg-white border-b border-slate-200 shadow-sm" dir="rtl">
        {/* Row 1: Logo + nav + close */}
        <div className="max-w-screen-xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-4">
          <Link href="/" className="flex items-center gap-2 shrink-0 group">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-bold text-lg shadow group-hover:opacity-90 transition-opacity">
              د
            </div>
            <span className="font-extrabold text-xl text-primary tracking-tight hidden sm:block">{siteName}</span>
          </Link>

          <nav className="hidden md:flex items-center gap-1">
            {siteNavLinks.map(link => (
              <Link key={link.href} href={link.href}>
                <span className="px-3 py-1.5 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer transition-colors">
                  {link.label}
                </span>
              </Link>
            ))}
          </nav>

          <button
            onClick={() => setLocation("/")}
            className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 hover:text-slate-800 transition-colors shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Row 2: Step progress */}
        <div className="border-t border-slate-100 bg-slate-50/60 px-4 sm:px-6 py-2.5">
          <div className="max-w-2xl mx-auto flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 hidden sm:block">
              تسجيل مقدم خدمة — الخطوة {step} من {totalSteps}
            </span>
            <div className="flex items-center gap-1 md:gap-2 mx-auto sm:mx-0">
              {Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className="flex items-center">
                  <div
                    className={`w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center text-[11px] md:text-xs font-bold transition-all ${
                      step > i + 1 ? "bg-primary text-primary-foreground" :
                      step === i + 1 ? "bg-primary text-primary-foreground ring-4 ring-primary/15" :
                      "bg-slate-200 text-slate-500"
                    }`}
                  >
                    {step > i + 1 ? <Check className="w-3 h-3" /> : i + 1}
                  </div>
                  {i < totalSteps - 1 && (
                    <div className={`w-3 md:w-6 h-0.5 mx-0.5 rounded-full transition-colors ${step > i + 1 ? "bg-primary" : "bg-slate-200"}`} />
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto">
        <div className="container max-w-2xl mx-auto px-4 py-8 md:py-12 pb-32">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
          {step === 4 && renderStep4()}
          {step === 5 && renderStep5()}
          {step === 6 && renderStep6()}
          {step === 7 && renderStep7()}
        </div>
      </main>

      {/* Bottom Sticky Footer */}
      <footer className="fixed bottom-0 left-0 right-0 p-4 bg-background border-t shadow-[0_-10px_40px_rgba(0,0,0,0.05)] z-40">
        <div className="container max-w-2xl mx-auto flex items-center justify-between">
          <Button 
            variant="ghost" 
            size="lg"
            onClick={handleBack} 
            disabled={step === 1}
            className={`font-bold ${step === 1 ? 'opacity-0' : 'opacity-100'}`}
          >
            <ChevronRight className="w-5 h-5 ml-1" /> السابق
          </Button>
          
          {step < totalSteps ? (
            <Button size="lg" onClick={handleNext} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 rounded-xl shadow-md">
              التالي <ChevronLeft className="w-5 h-5 mr-1" />
            </Button>
          ) : (
            <Button
              size="lg"
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-10 rounded-xl shadow-lg"
            >
              {submitting ? (
                <><Loader2 className="w-5 h-5 animate-spin ml-2" /> جاري الحفظ...</>
              ) : (
                "إرسال الطلب"
              )}
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
