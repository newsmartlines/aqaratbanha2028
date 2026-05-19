import { useState } from "react";
import {
  Crown, AlertTriangle, X, CheckCircle2, XCircle,
  CreditCard, Zap, Star, Loader2, Package, Clock,
  Home, BarChart2, ShieldCheck, TrendingUp, Headphones,
  Search, Sparkles, Repeat2,
} from "lucide-react";
import ProviderLayout from "@/components/ProviderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { api, type ProviderStats, type BillingPlan } from "@/lib/api";

type Limits = { properties: number; photos: number; videos: number; featuredAds: number; pinnedAds: number; messages: number; leads: number };
type Features = { homepageDisplay: boolean; topSearch: boolean; verifiedBadge: boolean; premiumBadge: boolean; prioritySupport: boolean; analytics: boolean; seo: boolean; aiTools: boolean; autoBoost: boolean };

const LIMIT_LABELS: Record<keyof Limits, string> = {
  properties: "العقارات",
  photos: "الصور",
  videos: "الفيديوهات",
  featuredAds: "إعلانات مميزة",
  pinnedAds: "إعلانات مثبتة",
  messages: "الرسائل",
  leads: "الطلبات",
};

const FEATURE_ICONS: Record<keyof Features, any> = {
  homepageDisplay: Home,
  topSearch: Search,
  verifiedBadge: ShieldCheck,
  premiumBadge: Crown,
  prioritySupport: Headphones,
  analytics: BarChart2,
  seo: TrendingUp,
  aiTools: Sparkles,
  autoBoost: Repeat2,
};

const FEATURE_LABELS: Record<keyof Features, string> = {
  homepageDisplay: "ظهور في الصفحة الرئيسية",
  topSearch: "أعلى نتائج البحث",
  verifiedBadge: "شارة موثّق ✓",
  premiumBadge: "شارة Premium",
  prioritySupport: "دعم الأولوية",
  analytics: "إحصائيات متقدمة",
  seo: "تحسين SEO",
  aiTools: "أدوات الذكاء الاصطناعي",
  autoBoost: "رفع تلقائي للإعلانات",
};

function parseLimits(raw: string): Limits {
  try { return JSON.parse(raw); } catch { return { properties: 0, photos: 0, videos: 0, featuredAds: 0, pinnedAds: 0, messages: 0, leads: 0 }; }
}
function parseFeatures(raw: string): Features {
  try { return JSON.parse(raw); } catch { return { homepageDisplay: false, topSearch: false, verifiedBadge: false, premiumBadge: false, prioritySupport: false, analytics: false, seo: false, aiTools: false, autoBoost: false }; }
}
function formatLimit(v: number) { return v < 0 ? "غير محدود" : v === 0 ? "—" : v.toLocaleString("ar"); }

export default function ProviderSubscription() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const providerId = user?.providerId;

  const [alertDismissed, setAlertDismissed] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<BillingPlan | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<ProviderStats>({
    queryKey: ["providerStats", providerId],
    queryFn: () => api.providers.stats(providerId!),
    enabled: !!providerId,
  });

  const { data: plans = [], isLoading: plansLoading } = useQuery<BillingPlan[]>({
    queryKey: ["billingPlans"],
    queryFn: api.billingPlans.publicList,
  });

  const sub = stats?.subscription ?? null;

  const progressPct = sub?.daysLeft != null && sub?.durationDays
    ? Math.round((sub.daysLeft / sub.durationDays) * 100)
    : 0;

  const subscribeMutation = useMutation({
    mutationFn: (plan: BillingPlan) =>
      api.subscriptions.subscribe(providerId!, plan.id, true),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providerStats", providerId] });
      toast({ title: "تم الاشتراك بنجاح! 🎉", description: `تم تفعيل باقة ${selectedPlan?.nameAr ?? selectedPlan?.name}` });
      setConfirmOpen(false);
      setSelectedPlan(null);
    },
    onError: (err: Error) => toast({ title: "فشل الاشتراك", description: err.message, variant: "destructive" }),
  });

  const isCurrentPlan = (plan: BillingPlan) => {
    if (!sub?.isActive) return false;
    return sub.billingPlanId === plan.id || sub.packageNameAr === (plan.nameAr ?? plan.name);
  };

  const hasUsedFreePlan = Boolean(
    sub && (sub.packagePrice == null || parseFloat(String(sub.packagePrice)) === 0)
  );

  const handleSubscribeClick = (plan: BillingPlan) => {
    if (isCurrentPlan(plan)) return;
    if (parseFloat(String(plan.price)) === 0 && hasUsedFreePlan) {
      toast({ title: "غير متاح", description: "لا يمكن تفعيل الباقة المجانية أكثر من مرة.", variant: "destructive" });
      return;
    }
    setSelectedPlan(plan);
    setConfirmOpen(true);
  };

  const isLoading = statsLoading || plansLoading;
  const sortedPlans = [...plans].sort((a, b) => a.sortOrder - b.sortOrder || parseFloat(a.price) - parseFloat(b.price));
  const freePlan = sortedPlans.find(p => parseFloat(p.price) === 0);
  const paidPlans = sortedPlans.filter(p => parseFloat(p.price) > 0);

  return (
    <ProviderLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500" dir="rtl">

        {/* Expiry Alert */}
        {!statsLoading && sub?.isActive && sub.daysLeft != null && sub.daysLeft <= 7 && !alertDismissed && (
          <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-6 h-6 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <h3 className="font-bold text-amber-800">تنبيه: اشتراكك سينتهي خلال {sub.daysLeft} يوم</h3>
                <p className="text-sm text-amber-700 mt-1">جدّد الآن واستمر في الظهور في نتائج البحث.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Button className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm" size="sm"
                onClick={() => { const p = sortedPlans.find(p => isCurrentPlan(p)); if (p) handleSubscribeClick(p); }}>
                تجديد الآن
              </Button>
              <button onClick={() => setAlertDismissed(true)} className="p-2 text-amber-600 hover:bg-amber-100 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">إدارة الاشتراك</h1>
            <p className="text-muted-foreground mt-1">تحكم في باقتك الحالية وقم بالترقية للحصول على مميزات أكثر</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* ─── Current Plan Card ─── */}
            {sub ? (
              <Card className="border-border/60 shadow-md bg-gradient-to-br from-card to-secondary/30 relative overflow-hidden">
                <div className="absolute top-0 left-0 w-32 h-32 bg-primary/5 rounded-br-full -z-10" />
                <CardContent className="p-8">
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                    <div className="lg:col-span-4 space-y-4">
                      <div className="flex items-center gap-3 flex-wrap">
                        <Badge className="bg-primary hover:bg-primary/90 text-primary-foreground text-base py-1.5 px-4 border-none shadow-sm">
                          {sub.packageNameAr ?? "اشتراك"}
                        </Badge>
                        <Badge variant="outline" className={sub.isActive
                          ? "bg-green-500/10 text-green-700 border-green-200"
                          : "bg-red-500/10 text-red-700 border-red-200"
                        }>
                          {sub.isActive ? "نشط" : "منتهي"}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground space-y-1">
                        <p>تاريخ البدء: <strong className="text-foreground">{new Date(sub.startDate).toLocaleDateString("ar-EG")}</strong></p>
                        <p>تاريخ الانتهاء: <strong className="text-foreground">{new Date(sub.endDate).toLocaleDateString("ar-EG")}</strong></p>
                        {sub.packagePrice && (
                          <p>سعر الباقة: <strong className="text-primary">{sub.packagePrice} ج.م / شهر</strong></p>
                        )}
                      </div>
                    </div>

                    <div className="lg:col-span-4 space-y-3">
                      <div className="flex justify-between items-end">
                        <span className={`font-bold text-lg ${sub.isActive ? "text-primary" : "text-red-500"}`}>
                          {sub.daysLeft != null ? `${sub.daysLeft} يوم متبقي` : "—"}
                          {sub.durationDays ? ` من ${sub.durationDays}` : ""}
                        </span>
                        {sub.durationDays && sub.daysLeft != null && (
                          <span className="text-sm text-muted-foreground">{progressPct}%</span>
                        )}
                      </div>
                      {sub.durationDays && sub.daysLeft != null && (
                        <Progress value={progressPct} className="h-4 [&>div]:bg-primary rounded-full" />
                      )}
                      {!sub.isActive && (
                        <div className="bg-red-500/10 text-red-700 p-3 rounded-lg text-sm font-medium">
                          ⚠️ اشتراكك منتهي — اشترك مجدداً لاستقبال الطلبات.
                        </div>
                      )}
                    </div>

                    <div className="lg:col-span-4 flex flex-col gap-3 lg:pr-8">
                      {sortedPlans.find(p => isCurrentPlan(p)) && (
                        <Button variant="outline"
                          className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-xl h-11 font-bold"
                          onClick={() => { const p = sortedPlans.find(p => isCurrentPlan(p)); if (p) handleSubscribeClick(p); }}>
                          تجديد الباقة الحالية
                        </Button>
                      )}
                      {paidPlans.length > 0 && !isCurrentPlan(paidPlans[paidPlans.length - 1]) && (
                        <Button onClick={() => handleSubscribeClick(paidPlans[paidPlans.length - 1])}
                          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl h-11 font-bold shadow-md">
                          <Crown className="w-4 h-4 ml-2" />
                          ترقية إلى {paidPlans[paidPlans.length - 1].nameAr ?? paidPlans[paidPlans.length - 1].name}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-dashed border-2 border-border/50 shadow-sm">
                <CardContent className="p-10 text-center">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-4" />
                  <p className="text-xl font-bold text-foreground mb-2">لا يوجد اشتراك نشط</p>
                  <p className="text-muted-foreground mb-6">اشترك الآن للحصول على مزايا المنصة وزيادة ظهورك</p>
                  {freePlan && (
                    <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-10"
                      onClick={() => handleSubscribeClick(freePlan)}>
                      ابدأ مجاناً
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ─── Plan Comparison ─── */}
            <div className="pt-4">
              <h2 className="text-2xl font-bold mb-6 text-center">قارن بين الباقات واختر الأنسب لك</h2>
              {plansLoading ? (
                <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : sortedPlans.length === 0 ? (
                <div className="text-center py-10 text-muted-foreground">
                  <p>لا توجد باقات متاحة حالياً. تواصل مع الإدارة.</p>
                </div>
              ) : (
                <div className={`grid gap-6 items-start ${
                  sortedPlans.length === 1 ? "grid-cols-1 max-w-sm mx-auto"
                  : sortedPlans.length === 2 ? "grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto"
                  : sortedPlans.length <= 3 ? "grid-cols-1 md:grid-cols-3"
                  : "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5"
                }`}>
                  {sortedPlans.map((plan, idx) => {
                    const isFree = parseFloat(plan.price) === 0;
                    const isCurrent = isCurrentPlan(plan);
                    const isPopular = plan.isMostPopular;
                    const isRecommended = plan.isRecommended;
                    const limits = parseLimits(plan.limits ?? "{}");
                    const features = parseFeatures(plan.features ?? "{}");
                    const planColor = plan.color ?? "#0d9488";

                    return (
                      <Card
                        key={plan.id}
                        className={`h-full flex flex-col relative overflow-hidden transition-all ${
                          isRecommended
                            ? "border-primary ring-2 ring-primary ring-offset-2 shadow-lg transform md:-translate-y-2 z-10"
                            : isPopular
                            ? "border-amber-300 ring-1 ring-amber-300 shadow-lg"
                            : "border-border/60 hover:shadow-md"
                        }`}
                      >
                        {isCurrent && (
                          <div className="absolute top-0 inset-x-0 text-white text-xs font-bold text-center py-1.5" style={{ backgroundColor: planColor }}>
                            باقتك الحالية ✓
                          </div>
                        )}
                        {isPopular && !isCurrent && (
                          <div className="absolute top-3 left-0 bg-amber-500 text-white text-[10px] font-bold py-0.5 px-3 rounded-r-full shadow-sm">
                            الأكثر شعبية
                          </div>
                        )}
                        {isRecommended && !isCurrent && (
                          <div className="absolute top-3 left-0 bg-primary text-white text-[10px] font-bold py-0.5 px-3 rounded-r-full shadow-sm">
                            موصى به ⭐
                          </div>
                        )}

                        <CardHeader className={`text-center pb-3 ${isCurrent ? "pt-8" : "pt-6"}`}>
                          <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: planColor + "22", border: `2px solid ${planColor}44` }}>
                            {isFree ? <Package className="w-5 h-5" style={{ color: planColor }} />
                              : idx === sortedPlans.length - 1 ? <Crown className="w-5 h-5" style={{ color: planColor }} />
                              : <Star className="w-5 h-5" style={{ color: planColor }} />}
                          </div>
                          <CardTitle className="text-lg" style={{ color: planColor }}>
                            {plan.nameAr ?? plan.name}
                          </CardTitle>
                          {plan.descriptionAr && (
                            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{plan.descriptionAr}</p>
                          )}
                          <p className="text-3xl font-black mt-3">
                            {isFree ? "مجاني" : `${plan.price}`}
                            {!isFree && <span className="text-sm font-normal text-muted-foreground"> ج.م/شهر</span>}
                          </p>
                          {!isFree && plan.yearlyPrice && (
                            <p className="text-xs text-muted-foreground">{plan.yearlyPrice} ج.م / سنوي</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">عمولة المنصة: <strong>{plan.commissionPercent}%</strong></p>
                        </CardHeader>

                        <CardContent className="flex-1 flex flex-col px-4 pb-4">
                          {/* Limits */}
                          <div className="space-y-2 mb-4">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">الحدود</p>
                            {(Object.keys(LIMIT_LABELS) as Array<keyof Limits>).map(key => (
                              <div key={key} className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">{LIMIT_LABELS[key]}</span>
                                <span className={`font-bold ${limits[key] < 0 ? "text-green-600" : limits[key] === 0 ? "text-muted-foreground" : "text-foreground"}`}>
                                  {formatLimit(limits[key])}
                                </span>
                              </div>
                            ))}
                          </div>

                          {/* Features */}
                          <div className="space-y-1.5 flex-1 mb-4">
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-wide">المزايا</p>
                            {(Object.keys(FEATURE_LABELS) as Array<keyof Features>).map(key => {
                              const enabled = features[key];
                              const Icon = FEATURE_ICONS[key];
                              return (
                                <div key={key} className={`flex items-center gap-2 text-xs ${enabled ? "" : "opacity-40"}`}>
                                  {enabled
                                    ? <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-green-500" />
                                    : <XCircle className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />}
                                  <span className={enabled ? "text-foreground" : "text-muted-foreground line-through"}>
                                    {FEATURE_LABELS[key]}
                                  </span>
                                </div>
                              );
                            })}
                          </div>

                          {/* CTA */}
                          <div className="mt-auto pt-3 border-t">
                            {isCurrent ? (
                              <Button className="w-full rounded-xl h-10 font-bold text-white"
                                style={{ backgroundColor: planColor }}
                                onClick={() => handleSubscribeClick(plan)}>
                                تجديد الباقة
                              </Button>
                            ) : (
                              <Button
                                className="w-full rounded-xl h-10 font-bold text-white"
                                style={{ backgroundColor: isFree && hasUsedFreePlan ? "#94a3b8" : planColor }}
                                onClick={() => handleSubscribeClick(plan)}
                                disabled={isFree && hasUsedFreePlan}
                              >
                                {idx === sortedPlans.length - 1 && !isFree && <Zap className="w-4 h-4 ml-2" />}
                                {isFree && hasUsedFreePlan ? "تم الاستخدام" : isFree ? "ابدأ مجاناً" : "اشترك الآن"}
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ─── Invoice History ─── */}
            <Card className="border-border/50 shadow-sm mt-8">
              <CardHeader>
                <CardTitle className="text-xl flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  سجل الاشتراكات
                </CardTitle>
              </CardHeader>
              <CardContent>
                {sub ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                      <thead className="text-xs text-muted-foreground bg-secondary/50 border-b border-border">
                        <tr>
                          <th className="px-4 py-3 font-medium">رقم الاشتراك</th>
                          <th className="px-4 py-3 font-medium">الباقة</th>
                          <th className="px-4 py-3 font-medium">تاريخ البدء</th>
                          <th className="px-4 py-3 font-medium">تاريخ الانتهاء</th>
                          <th className="px-4 py-3 font-medium">المبلغ</th>
                          <th className="px-4 py-3 font-medium">الحالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                          <td className="px-4 py-4 font-medium">SUB-{sub.id}</td>
                          <td className="px-4 py-4">{sub.packageNameAr ?? "—"}</td>
                          <td className="px-4 py-4 text-muted-foreground">{new Date(sub.startDate).toLocaleDateString("ar-EG")}</td>
                          <td className="px-4 py-4 text-muted-foreground">{new Date(sub.endDate).toLocaleDateString("ar-EG")}</td>
                          <td className="px-4 py-4 font-bold">
                            {sub.packagePrice && parseFloat(sub.packagePrice) > 0 ? `${sub.packagePrice} ج.م` : "مجاني"}
                          </td>
                          <td className="px-4 py-4">
                            <Badge variant="outline" className={sub.isActive
                              ? "bg-green-500/10 text-green-600 border-green-200"
                              : "bg-red-500/10 text-red-600 border-red-200"
                            }>
                              {sub.isActive ? "نشط" : "منتهي"}
                            </Badge>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-10 text-muted-foreground">
                    <p>لا توجد سجلات اشتراك بعد.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {/* ─── Confirm Subscribe Dialog ─── */}
        <Dialog open={confirmOpen} onOpenChange={(o) => { if (!subscribeMutation.isPending) { setConfirmOpen(o); if (!o) setSelectedPlan(null); } }}>
          <DialogContent className="sm:max-w-[440px]" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                {selectedPlan && parseFloat(selectedPlan.price) > 0
                  ? <><Crown className="w-6 h-6 text-amber-500" /> الاشتراك في باقة {selectedPlan.nameAr ?? selectedPlan.name}</>
                  : <><Package className="w-6 h-6 text-primary" /> تفعيل الباقة المجانية</>
                }
              </DialogTitle>
              <DialogDescription className="text-base mt-2">
                {selectedPlan && parseFloat(selectedPlan.price) > 0
                  ? `سيتم تفعيل باقة "${selectedPlan.nameAr ?? selectedPlan.name}" لمدة ${selectedPlan.durationDays} يوم.`
                  : "ابدأ باستخدام المنصة مجاناً والترقية في أي وقت."}
              </DialogDescription>
            </DialogHeader>

            {selectedPlan && (
              <div className="py-4 space-y-4">
                <div className="bg-secondary/60 rounded-xl p-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">عمولة المنصة</span>
                    <span className="font-bold">{selectedPlan.commissionPercent}%</span>
                  </div>
                  {(() => {
                    const lim = parseLimits(selectedPlan.limits ?? "{}");
                    return (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">عدد العقارات</span>
                        <span className="font-bold">{formatLimit(lim.properties)}</span>
                      </div>
                    );
                  })()}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">مدة الاشتراك</span>
                    <span className="font-bold">{selectedPlan.durationDays} يوم</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="text-muted-foreground font-medium">المبلغ الإجمالي</span>
                    <span className="font-black text-primary text-base">
                      {parseFloat(selectedPlan.price) === 0 ? "مجاني" : `${selectedPlan.price} ج.م`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="flex gap-3 flex-row-reverse">
              <Button
                onClick={() => selectedPlan && subscribeMutation.mutate(selectedPlan)}
                disabled={subscribeMutation.isPending}
                className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl h-11 font-bold"
              >
                {subscribeMutation.isPending ? <><Loader2 className="w-4 h-4 animate-spin ml-2" /> جاري التفعيل...</> : "تأكيد الاشتراك"}
              </Button>
              <Button variant="outline" onClick={() => setConfirmOpen(false)} disabled={subscribeMutation.isPending}
                className="flex-1 rounded-xl h-11">
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </ProviderLayout>
  );
}
