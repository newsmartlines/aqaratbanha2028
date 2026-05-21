import { useState, useEffect } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { RealEstateFooter } from "@/components/RealEstateFooter";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  MapPin, Phone, MessageCircle, Share2,
  Heart, ShieldCheck, Clock, CheckCircle2, X, Crown,
  ArrowUpCircle, Loader2, Send, Copy, Check, ChevronDown, ChevronUp,
  Briefcase, Plus, Gift,
} from "lucide-react";
import toast from "react-hot-toast";
import { api, type ProviderDetail, type Provider, mediaUrl } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const DEFAULT_IMG =
  "https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=800&q=80";

function providerMedia(url: string | null | undefined, fallback = DEFAULT_IMG): string {
  const resolved = mediaUrl(url, "");
  return resolved || fallback;
}

export default function ProviderPage() {
  const params = useParams<{ id: string }>();
  const [showPhone, setShowPhone] = useState(false);
  const [expandedAbout, setExpandedAbout] = useState(false);
  const [showMsgModal, setShowMsgModal] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [msgText, setMsgText] = useState("");
  const [msgSent, setMsgSent] = useState(false);
  const [copied, setCopied] = useState(false);
  // Request type chooser modal
  const [requestModal, setRequestModal] = useState<{
    open: boolean;
    serviceId?: number;
    price?: number;
  }>({ open: false });
  const [freeReqMessage, setFreeReqMessage] = useState("");
  const [freeReqSent, setFreeReqSent] = useState(false);
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const providerId = Number.parseInt(params.id ?? "", 10);

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [providerId]);

  function parseContactMethods(s: string | null | undefined): string[] {
    if (!s) return [];
    try { const v = JSON.parse(s); return Array.isArray(v) ? v.map(String) : []; } catch { return []; }
  }
  function trackInteraction(type: "phone" | "whatsapp" | "message") {
    if (!Number.isFinite(providerId)) return;
    api.providers.trackInteraction(providerId, type).catch(() => {});
  }

  const { data: provider, isLoading, isError } = useQuery<ProviderDetail>({
    queryKey: ["providerDetail", providerId],
    queryFn: () => api.providers.get(providerId),
    enabled: Number.isFinite(providerId) && providerId > 0,
    staleTime: 60_000,
  });

  const { data: allProviders } = useQuery<Provider[]>({
    queryKey: ["providers"],
    queryFn: () => api.providers.list(),
    staleTime: 60_000,
  });
  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: api.settings.list,
    staleTime: 5 * 60 * 1000,
  });

  const shareUrl = typeof window !== "undefined" ? window.location.href : "";
  const shareTitle = provider ? `${provider.userName} – عقارات بنها` : "عقارات بنها";

  /* ─── Favorites ─── */
  const { data: favorites } = useQuery<{ providerId: number }[]>({
    queryKey: ["favorites", user?.id],
    queryFn: () => (user ? api.favorites.list(user.id) : Promise.resolve([])),
    enabled: !!user,
  });

  const isFavorite = Number.isFinite(providerId) ? (favorites?.some((f) => f.providerId === providerId) ?? false) : false;

  const addFavMutation = useMutation({
    mutationFn: () => api.favorites.add(user!.id, providerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favorites", user?.id] }),
  });

  const removeFavMutation = useMutation({
    mutationFn: () => api.favorites.remove(user!.id, providerId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["favorites", user?.id] }),
  });

  const toggleFavorite = () => {
    if (!user) { setLocation("/login"); return; }
    if (isFavorite) removeFavMutation.mutate();
    else addFavMutation.mutate();
  };
  const favPending = addFavMutation.isPending || removeFavMutation.isPending;

  /* ─── Message ─── */
  const sendMessageMutation = useMutation({
    mutationFn: () =>
      api.messages.send(provider!.userId, msgText),
    onSuccess: () => {
      setMsgSent(true);
      setTimeout(() => { setShowMsgModal(false); setMsgSent(false); setMsgText(""); }, 2000);
    },
  });

  /* ─── Share ─── */
  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: shareTitle, url: shareUrl }).catch(() => {});
    } else {
      setShowShareModal(true);
    }
  };

  /* ─── Request service: open the chooser modal (free vs paid) ─── */
  const requestService = (serviceId?: number, priceRaw?: string | number | null) => {
    if (!user) {
      const returnTo = `/provider/${providerId}`;
      setLocation(`/login?returnTo=${encodeURIComponent(returnTo)}`);
      return;
    }
    const price = typeof priceRaw === "number" ? priceRaw : parseFloat(String(priceRaw ?? ""));
    setRequestModal({
      open: true,
      serviceId: serviceId,
      price: Number.isFinite(price) && price > 0 ? price : undefined,
    });
    setFreeReqMessage("");
    setFreeReqSent(false);
  };

  /* ─── Submit a free (normal) request directly via the API ─── */
  const freeRequestMutation = useMutation({
    mutationFn: async () => {
      return await api.requests.create({
        providerId,
        serviceId: requestModal.serviceId ?? null,
        message: freeReqMessage.trim() || null,
      });
    },
    onSuccess: () => {
      setFreeReqSent(true);
      toast.success("تم إرسال طلبك بنجاح");
      queryClient.invalidateQueries({ queryKey: ["providerDetail", providerId] });
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ["user-requests", user.id] });
      }
    },
    onError: (err: Error) => {
      toast.error(err.message || "تعذر إرسال الطلب");
    },
  });


  /* ─── Loading / not found ─── */
  if (!Number.isFinite(providerId) || providerId < 1) {
    return (
      <div className="min-h-[100dvh] flex flex-col font-sans bg-background" dir="rtl">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">رابط المزود غير صالح</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex flex-col font-sans bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (isError || !provider) {
    return (
      <div className="min-h-[100dvh] flex flex-col font-sans bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">مزود الخدمة غير موجود</p>
        </div>
      </div>
    );
  }

  const similarProviders = (allProviders ?? [])
    .filter((p: Provider) => p.id !== providerId && p.categoryId === provider.categoryId)
    .slice(0, 4);

  const pRow = provider as ProviderDetail & { cover_image?: string | null; profile_image?: string | null };
  const coverRaw = pRow.cover_image ?? pRow.banner ?? null;
  const profileRaw = pRow.profile_image ?? pRow.avatar ?? null;
  const bannerSrc = providerMedia(coverRaw, DEFAULT_IMG);
  const avatarSrc = providerMedia(profileRaw, DEFAULT_IMG);

  return (
    <div className="min-h-[100dvh] flex flex-col font-sans bg-background" dir="rtl">
      <Header />

      <main className="flex-1 pb-28 md:pb-16">
        {/* ── Hero Banner ── */}
        <div className="relative h-44 sm:h-56 md:h-72 lg:h-80 w-full overflow-hidden bg-slate-900">
          <img
            src={bannerSrc}
            alt=""
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { e.currentTarget.src = DEFAULT_IMG; }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent pointer-events-none" />
        </div>

        <div className="container mx-auto px-3 sm:px-4 relative -mt-20 sm:-mt-24 md:-mt-32 z-10">
          <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">

            {/* ── Main Column ── */}
            <div className="flex-1 min-w-0">

              {/* ── Profile Header Card ── */}
              <Card className="border-border/40 shadow-xl bg-card rounded-2xl overflow-hidden mb-6">
                <CardContent className="p-4 sm:p-5 md:p-7">
                  <div className="flex flex-col sm:flex-row gap-4 sm:gap-5 items-center sm:items-start text-center sm:text-right">
                    {/* Avatar — full image visible (no cropping), responsive sizes */}
                    <div className="w-32 h-32 sm:w-36 sm:h-36 md:w-40 md:h-40 lg:w-44 lg:h-44 rounded-2xl border-4 border-card ring-2 ring-primary/30 shadow-xl flex-shrink-0 -mt-20 sm:-mt-24 md:-mt-28 bg-white z-10 overflow-hidden">
                      <img
                        src={avatarSrc}
                        alt={provider.userName}
                        className="w-full h-full object-contain"
                        loading="lazy"
                        onError={(e) => { e.currentTarget.src = DEFAULT_IMG; }}
                      />
                    </div>

                    <div className="flex-1 min-w-0 pt-1">
                      {/* Name + Badges */}
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <h1 className="text-2xl md:text-3xl font-extrabold leading-tight">{provider.userName}</h1>
                        {provider.verified && (
                          <Badge className="bg-green-100 text-green-700 border-none px-2 py-0.5 rounded-md flex items-center gap-1 text-xs">
                            <ShieldCheck className="w-3 h-3" /> موثق
                          </Badge>
                        )}
                        {provider.featured && (
                          <Badge className="bg-amber-100 text-amber-700 border-none px-2 py-0.5 rounded-md flex items-center gap-1 text-xs">
                            <Crown className="w-3 h-3" /> مميز
                          </Badge>
                        )}
                      </div>

                      {/* Category + Location */}
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mb-4">
                        {provider.categoryNameAr && (
                          <Badge variant="outline" className="rounded-full bg-primary/5 border-primary/20 text-primary font-medium">
                            {provider.categoryNameAr}
                          </Badge>
                        )}
                        {provider.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-primary" />
                            {provider.city}{provider.district && ` - ${provider.district}`}
                          </span>
                        )}
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          size="sm"
                          className="rounded-xl h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md gap-1.5"
                          onClick={() => requestService()}
                          data-testid="button-request-service-header"
                        >
                          <Briefcase className="w-4 h-4" />
                          اطلب الخدمة الآن
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className={`rounded-xl h-9 border-border/60 transition-all ${isFavorite ? "bg-red-50 border-red-200 text-red-500" : ""}`}
                          onClick={toggleFavorite}
                          disabled={favPending}
                        >
                          <Heart className={`w-4 h-4 ml-1.5 transition-all ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
                          {isFavorite ? "محفوظ" : "حفظ"}
                        </Button>

                        <Button
                          variant="outline"
                          size="sm"
                          className="rounded-xl h-9 border-border/60"
                          onClick={handleShare}
                        >
                          <Share2 className="w-4 h-4 ml-1.5" /> مشاركة
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* ── About Section ── */}
              {provider.bio && (
                <section className="mb-6">
                  <h2 className="text-xl font-bold mb-3 flex items-center gap-2">
                    <Briefcase className="w-5 h-5 text-primary" />
                    عن مقدم الخدمة
                  </h2>
                  <div className="bg-card rounded-2xl border border-border/40 p-5 shadow-sm">
                    <p className="text-muted-foreground leading-relaxed text-base">
                      {expandedAbout ? provider.bio : provider.bio.slice(0, 200)}
                      {provider.bio.length > 200 && !expandedAbout && "..."}
                    </p>
                    {provider.bio.length > 200 && (
                      <button
                        className="mt-2 text-primary text-sm font-medium flex items-center gap-1 hover:underline"
                        onClick={() => setExpandedAbout(!expandedAbout)}
                      >
                        {expandedAbout ? <><ChevronUp className="w-4 h-4" /> عرض أقل</> : <><ChevronDown className="w-4 h-4" /> اقرأ المزيد</>}
                      </button>
                    )}
                  </div>
                </section>
              )}

              {/* ── Info Cards ── */}
              <section className="mb-6">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-card rounded-2xl border border-border/40 p-4 flex items-start gap-3 shadow-sm">
                    <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center shrink-0">
                      <Clock className="w-4.5 h-4.5 text-primary" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">أوقات العمل</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{(settings as any)?.businessHours || "متاح طوال أيام الأسبوع"}</p>
                    </div>
                  </div>
                  <div className="bg-card rounded-2xl border border-border/40 p-4 flex items-start gap-3 shadow-sm">
                    <div className="w-9 h-9 bg-green-100 rounded-xl flex items-center justify-center shrink-0">
                      <CheckCircle2 className="w-4.5 h-4.5 text-green-600" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">ضمان الجودة</p>
                      <p className="text-xs text-muted-foreground mt-0.5">رضاك التام مضمون</p>
                    </div>
                  </div>
                  <div className="bg-card rounded-2xl border border-border/40 p-4 flex items-start gap-3 shadow-sm">
                    <div className="w-9 h-9 bg-blue-100 rounded-xl flex items-center justify-center shrink-0">
                      <MapPin className="w-4.5 h-4.5 text-blue-600" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">نطاق الخدمة</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{provider.city ?? "مصر"} وما حولها</p>
                    </div>
                  </div>
                </div>
              </section>

              {/* ── Services ── */}
              <section className="mb-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-primary" />
                    الخدمات المقدمة
                    <Badge variant="outline" className="rounded-full text-xs font-normal">
                      {provider.services.filter(s => s.status === "active").length}
                    </Badge>
                  </h2>
                </div>

                {provider.services.filter(s => s.status === "active").length === 0 ? (
                  <div className="bg-card rounded-2xl border border-dashed border-border/60 p-8 text-center shadow-sm">
                    <p className="text-muted-foreground">لا توجد خدمات متاحة حالياً</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {provider.services.filter(s => s.status === "active").map((service) => (
                      <Card key={service.id} className="border-border/40 hover:border-primary/30 hover:shadow-md transition-all duration-200 overflow-hidden">
                        <CardContent className="p-0">
                          <div className="flex flex-col sm:flex-row">
                            {service.img && (
                              <div className="sm:w-36 h-32 sm:h-auto shrink-0 overflow-hidden bg-secondary">
                                <img
                                  src={service.img}
                                  alt={service.title}
                                  className="w-full h-full object-cover"
                                  onError={(e) => { e.currentTarget.style.display = "none"; }}
                                />
                              </div>
                            )}
                            <div className="flex-1 p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                              <div className="flex-1">
                                <h3 className="font-bold text-base mb-1">{service.title}</h3>
                                {service.subcategory && (
                                  <span className="text-xs bg-secondary/70 text-muted-foreground px-2 py-0.5 rounded-full inline-block mb-2">
                                    {service.subcategory}
                                  </span>
                                )}
                                {service.description && (
                                  <p className="text-sm text-muted-foreground line-clamp-2">{service.description}</p>
                                )}
                              </div>
                              <div className="flex flex-col items-start sm:items-end gap-2 shrink-0">
                                {service.price && (
                                  <span className="font-bold text-lg text-primary">تبدأ من {service.price} ج.م</span>
                                )}
                                <Button
                                  size="sm"
                                  className="rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-white border-none"
                                  onClick={() => requestService(service.id, service.price)}
                                >
                                  طلب الخدمة
                                </Button>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </section>

              {/* ── Similar Providers ── */}
              {similarProviders.length > 0 && (
                <section>
                  <h2 className="text-xl font-bold mb-4">مقدمو خدمات مشابهون</h2>
                  <div className="flex overflow-x-auto pb-4 -mx-1 px-1 gap-4 snap-x snap-mandatory" style={{ scrollbarWidth: "none" }}>
                    {similarProviders.map((p: Provider) => (
                      <Card key={p.id} className="min-w-[220px] w-[220px] snap-start overflow-hidden group border-border/40 hover:shadow-lg transition-all duration-300 cursor-pointer"
                        onClick={() => setLocation(`/provider/${p.id}`)}>
                        <div className="relative h-28 overflow-hidden bg-muted">
                          <img
                            src={providerMedia(p.avatar)}
                            alt={p.userName}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => { e.currentTarget.src = DEFAULT_IMG; }}
                          />
                        </div>
                        <CardContent className="p-3">
                          <h3 className="font-bold text-sm truncate">{p.userName}</h3>
                          <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                            <MapPin className="w-3 h-3 text-primary" />
                            {p.city ?? "بنها"}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </section>
              )}
            </div>

            {/* ── Sticky Sidebar ── */}
            <aside className="hidden lg:block w-[320px] shrink-0">
              <div className="sticky top-24 space-y-4">
                {/* Contact Card */}
                <Card className="border-border/40 shadow-xl bg-card rounded-2xl overflow-hidden">
                  <div className="h-1.5 bg-primary w-full" />
                  <CardContent className="p-5">
                    <Button
                      className="w-full h-12 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-lg gap-2 mb-5"
                      onClick={() => requestService()}
                      data-testid="button-request-service-sidebar"
                    >
                      <Briefcase className="w-4 h-4" />
                      اطلب الخدمة الآن
                    </Button>

                    <div className="flex items-center gap-2 mb-4">
                      <h3 className="font-bold text-lg">أو تواصل مباشرة</h3>
                    </div>
                    {(() => {
                      const cm = parseContactMethods(provider.contactMethods);
                      // Backwards compat: if provider hasn't set any preferences yet, show all.
                      const enabled = cm.length === 0
                        ? { phone: true, whatsapp: true, message: true }
                        : { phone: cm.includes("phone"), whatsapp: cm.includes("whatsapp"), message: cm.includes("message") };
                      const anyEnabled = enabled.phone || enabled.whatsapp || enabled.message;
                      return (
                        <div className="space-y-3">
                          {!anyEnabled && (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              لم يقم مقدم الخدمة بتفعيل وسائل التواصل بعد.
                            </p>
                          )}
                          {enabled.phone && (showPhone ? (
                            <div className="flex items-center justify-center p-3 bg-secondary/50 rounded-xl border border-border/50 animate-in fade-in duration-300">
                              <span className="font-bold text-lg tracking-wider" dir="ltr">{provider.phone ?? "+20 50 000 0000"}</span>
                            </div>
                          ) : (
                            <Button
                              className="w-full h-11 rounded-xl bg-primary/10 text-primary hover:bg-primary hover:text-primary-foreground font-bold border-none shadow-none"
                              onClick={() => { trackInteraction("phone"); setShowPhone(true); }}
                            >
                              <Phone className="w-4 h-4 ml-2" />
                              عرض رقم الهاتف
                            </Button>
                          ))}

                          {enabled.whatsapp && (
                            <Button
                              className="w-full h-11 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold shadow-md border-none"
                              onClick={() => {
                                const raw = (provider.whatsapp ?? provider.phone ?? "").replace(/[^0-9]/g, "");
                                if (!raw) { alert("لا يوجد رقم واتساب متاح"); return; }
                                trackInteraction("whatsapp");
                                window.open(`https://wa.me/${raw}`, "_blank");
                              }}
                            >
                              <MessageCircle className="w-4 h-4 ml-2" />
                              تواصل عبر واتساب
                            </Button>
                          )}

                          {enabled.message && (
                            <Button
                              variant="outline"
                              className="w-full h-11 rounded-xl border-border/60 font-bold hover:bg-secondary"
                              onClick={() => { if (!user) { setLocation("/login"); return; } trackInteraction("message"); setShowMsgModal(true); }}
                            >
                              أرسل رسالة خاصة
                            </Button>
                          )}
                        </div>
                      );
                    })()}

                    <div className="mt-4 pt-4 border-t border-border/40 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                      <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                      تواصل مع مقدم الخدمة مباشرة لتنسيق التفاصيل
                    </div>
                  </CardContent>
                </Card>

                {/* Featured Upgrade Card */}
                {!provider.featured && (
                  <Card className="border-amber-200 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl overflow-hidden">
                    <CardContent className="p-4 text-center">
                      <div className="w-10 h-10 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-2 text-amber-600">
                        <ArrowUpCircle className="w-5 h-5" />
                      </div>
                      <h3 className="font-bold text-amber-900 mb-1">إعلان مميز</h3>
                      <p className="text-xs text-amber-700/80 mb-3 leading-relaxed">ارفع ظهورك في نتائج البحث واحصل على عملاء أكثر</p>
                      <Button
                        size="sm"
                        className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold"
                        onClick={() =>
                          user?.role === "provider"
                            ? setLocation("/dashboard/subscription")
                            : setLocation(`/login?returnTo=${encodeURIComponent("/dashboard/subscription")}`)
                        }
                      >
                        ترقية الآن
                      </Button>
                    </CardContent>
                  </Card>
                )}
              </div>
            </aside>
          </div>
        </div>
      </main>

      {/* Mobile Fixed Bottom Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 p-3 bg-background/95 backdrop-blur-md border-t border-border/50 z-50 flex gap-2 shadow-lg">
        <Button
          className="flex-[2] h-11 rounded-xl bg-primary hover:bg-primary/90 text-primary-foreground font-bold shadow-md text-sm gap-1.5"
          onClick={() => requestService()}
          data-testid="button-request-service-mobile"
        >
          <Briefcase className="w-4 h-4" /> اطلب الخدمة
        </Button>
        {(() => {
          const cm = parseContactMethods(provider.contactMethods);
          const enabled = cm.length === 0
            ? { whatsapp: true }
            : { whatsapp: cm.includes("whatsapp") };
          if (!enabled.whatsapp) return null;
          return (
            <Button
              variant="outline"
              size="icon"
              className="h-11 w-11 rounded-xl border-[#25D366] text-[#25D366] hover:bg-[#25D366]/10 shrink-0"
              onClick={() => {
                const raw = (provider.whatsapp ?? provider.phone ?? "").replace(/[^0-9]/g, "");
                if (!raw) { alert("لا يوجد رقم واتساب متاح"); return; }
                trackInteraction("whatsapp");
                window.open(`https://wa.me/${raw}`, "_blank");
              }}
            >
              <MessageCircle className="w-4 h-4" />
            </Button>
          );
        })()}
        <Button
          variant="outline"
          size="icon"
          className={`h-11 w-11 rounded-xl border-border/60 shrink-0 transition-all ${isFavorite ? "bg-red-50 border-red-200 text-red-500" : ""}`}
          onClick={toggleFavorite}
          disabled={favPending}
        >
          <Heart className={`w-4 h-4 transition-all ${isFavorite ? "fill-red-500 text-red-500" : ""}`} />
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-11 w-11 rounded-xl border-border/60 shrink-0"
          onClick={handleShare}
        >
          <Share2 className="w-4 h-4" />
        </Button>
      </div>

      {/* Request Type Chooser Modal (Free vs Paid) */}
      <Dialog
        open={requestModal.open}
        onOpenChange={(open) => {
          if (!open) {
            setRequestModal({ open: false });
            setFreeReqMessage("");
            setFreeReqSent(false);
          }
        }}
      >
        <DialogContent className="max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">اختر نوع الطلب</DialogTitle>
          </DialogHeader>

          {freeReqSent ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3 text-center">
              <CheckCircle2 className="h-14 w-14 text-emerald-500" />
              <p className="text-lg font-semibold">تم إرسال طلبك بنجاح</p>
              <p className="text-sm text-muted-foreground">
                سيتم التواصل معك قريباً من قِبل {provider.userName}.
              </p>
              <Button
                className="mt-2"
                onClick={() => {
                  setRequestModal({ open: false });
                  setFreeReqMessage("");
                  setFreeReqSent(false);
                }}
              >
                تم
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              <p className="text-sm text-muted-foreground">
                أرسل طلبك لمقدم الخدمة وسيتواصل معك مباشرة.
              </p>

              {/* Request */}
              <Card className="border-2 border-emerald-200 hover:border-emerald-400 transition-colors">
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="rounded-full bg-emerald-100 p-2 shrink-0">
                      <Gift className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-bold">إرسال طلب</h3>
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">مجاني</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        يصل الطلب لمقدم الخدمة مباشرة دون أي رسوم.
                      </p>
                    </div>
                  </div>
                  <Textarea
                    placeholder="اكتب وصفاً مختصراً لطلبك (اختياري)…"
                    value={freeReqMessage}
                    onChange={(e) => setFreeReqMessage(e.target.value.slice(0, 1000))}
                    className="resize-none"
                    rows={3}
                  />
                  <Button
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                    onClick={() => freeRequestMutation.mutate()}
                    disabled={freeRequestMutation.isPending}
                  >
                    {freeRequestMutation.isPending ? (
                      <>
                        <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                        جارِ الإرسال…
                      </>
                    ) : (
                      <>
                        <Send className="ml-2 h-4 w-4" />
                        إرسال الطلب
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Message Modal */}
      <Dialog open={showMsgModal} onOpenChange={setShowMsgModal}>
        <DialogContent className="max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">أرسل رسالة لـ {provider.userName}</DialogTitle>
          </DialogHeader>
          {msgSent ? (
            <div className="flex flex-col items-center justify-center py-8 gap-3">
              <div className="w-14 h-14 rounded-full bg-green-100 flex items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-green-600" />
              </div>
              <p className="text-lg font-bold">تم إرسال الرسالة بنجاح!</p>
              <p className="text-sm text-muted-foreground">سيتواصل معك مقدم الخدمة قريباً.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <Textarea
                placeholder="اكتب رسالتك هنا... مثال: أحتاج تصميم شعار لمطعم جديد"
                value={msgText}
                onChange={(e) => setMsgText(e.target.value)}
                className="resize-none rounded-xl"
                rows={4}
              />
              <div className="flex gap-3">
                <Button
                  className="flex-1 gap-2"
                  disabled={!msgText.trim() || sendMessageMutation.isPending}
                  onClick={() => sendMessageMutation.mutate()}
                >
                  {sendMessageMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  إرسال
                </Button>
                <Button variant="outline" onClick={() => setShowMsgModal(false)}>إلغاء</Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Share Modal */}
      <Dialog open={showShareModal} onOpenChange={setShowShareModal}>
        <DialogContent className="max-w-sm" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">مشاركة الصفحة</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-1">
            <Button variant="outline" className="w-full h-11 rounded-xl justify-start gap-3" onClick={handleCopyLink}>
              {copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
              {copied ? "تم النسخ!" : "نسخ الرابط"}
            </Button>
            <Button
              className="w-full h-11 rounded-xl bg-[#25D366] hover:bg-[#20bd5a] text-white font-bold gap-3 justify-start"
              onClick={() => window.open(`https://wa.me/?text=${encodeURIComponent(shareTitle + "\n" + shareUrl)}`, "_blank")}
            >
              <MessageCircle className="w-4 h-4" /> واتساب
            </Button>
            <Button
              className="w-full h-11 rounded-xl bg-[#1877F2] hover:bg-[#166fe5] text-white font-bold gap-3 justify-start"
              onClick={() => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, "_blank")}
            >
              <Share2 className="w-4 h-4" /> فيسبوك
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <RealEstateFooter />
    </div>
  );
}
