import { useState } from "react";
import {
  Crown, AlertTriangle, X, CheckCircle2,
  CreditCard, Zap, Star, Loader2, Package, Clock
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
import { api, type ProviderStats, type Package as PricingPackage } from "@/lib/api";

export default function ProviderSubscription() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const providerId = user?.providerId;

  const [alertDismissed, setAlertDismissed] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<PricingPackage | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const { data: stats, isLoading: statsLoading } = useQuery<ProviderStats>({
    queryKey: ["providerStats", providerId],
    queryFn: () => api.providers.stats(providerId!),
    enabled: !!providerId,
  });

  const { data: packages = [], isLoading: packagesLoading } = useQuery<PricingPackage[]>({
    queryKey: ["packages"],
    queryFn: api.packages.list,
  });

  const sub = stats?.subscription ?? null;

  const progressPct = sub?.daysLeft != null && sub?.durationDays
    ? Math.round((sub.daysLeft / sub.durationDays) * 100)
    : 0;

  /* ── Subscribe Mutation ── */
  const subscribeMutation = useMutation({
    mutationFn: (pkg: PricingPackage) =>
      api.subscriptions.subscribe(providerId!, pkg.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["providerStats", providerId] });
      toast({ title: "تم الاشتراك بنجاح! 🎉", description: `تم تفعيل باقة ${selectedPackage?.nameAr}` });
      setConfirmOpen(false);
      setSelectedPackage(null);
    },
    onError: (err: Error) => toast({ title: "فشل الاشتراك", description: err.message, variant: "destructive" }),
  });

  const isCurrentPlan = (pkg: PricingPackage) => {
    if (!sub?.isActive) return false;
    return sub.packageId === pkg.id;
  };
  const hasUsedFreePlan = Boolean(
    sub && (sub.packagePrice == null || parseFloat(String(sub.packagePrice)) === 0)
  );

  const handleSubscribeClick = (pkg: PricingPackage) => {
    if (isCurrentPlan(pkg)) return;
    if (parseFloat(String(pkg.price)) === 0 && hasUsedFreePlan) {
      toast({
        title: "غير متاح",
        description: "لا يمكن تفعيل الباقة المجانية أكثر من مرة. اختر باقة مدفوعة للترقية.",
        variant: "destructive",
      });
      return;
    }
    if (parseFloat(String(pkg.price)) > 0) {
      setLocation(`/dashboard/checkout?packageId=${pkg.id}`);
      return;
    }
    setSelectedPackage(pkg);
    setConfirmOpen(true);
  };

  const isLoading = statsLoading || packagesLoading;

  // Sort packages by price ascending (free first)
  const sortedPackages = [...packages].sort(
    (a, b) => parseFloat(a.price) - parseFloat(b.price)
  );

  const freePackage = sortedPackages.find(p => parseFloat(p.price) === 0);
  const paidPackages = sortedPackages.filter(p => parseFloat(p.price) > 0);

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
                <p className="text-sm text-amber-700 mt-1">لا تفوّت مزايا باقتك — جدد الآن واستمر في الظهور في نتائج البحث.</p>
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0 w-full sm:w-auto">
              {sortedPackages.find(p => p.nameAr === sub.packageNameAr) && (
                <Button
                  className="bg-amber-600 hover:bg-amber-700 text-white rounded-lg whitespace-nowrap flex-1 sm:flex-none"
                  size="sm"
                  onClick={() => handleSubscribeClick(sortedPackages.find(p => p.nameAr === sub.packageNameAr)!)}
                >
                  تجديد الآن
                </Button>
              )}
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
                        <p>تاريخ البدء: <strong className="text-foreground">{new Date(sub.startDate).toLocaleDateString("ar-SA")}</strong></p>
                        <p>تاريخ الانتهاء: <strong className="text-foreground">{new Date(sub.endDate).toLocaleDateString("ar-SA")}</strong></p>
                        {sub.packagePrice && (
                          <p>سعر الباقة: <strong className="text-primary">{sub.packagePrice} ر.س / شهر</strong></p>
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
                      {sortedPackages.find(p => p.nameAr === sub.packageNameAr) && (
                        <Button
                          variant="outline"
                          className="w-full border-primary text-primary hover:bg-primary hover:text-primary-foreground rounded-xl h-11 font-bold"
                          onClick={() => handleSubscribeClick(sortedPackages.find(p => p.nameAr === sub.packageNameAr)!)}
                        >
                          تجديد الباقة الحالية
                        </Button>
                      )}
                      {paidPackages.length > 0 && (
                        <Button
                          onClick={() => handleSubscribeClick(paidPackages[paidPackages.length - 1])}
                          className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white rounded-xl h-11 font-bold shadow-md"
                        >
                          <Crown className="w-4 h-4 ml-2" />
                          ترقية إلى {paidPackages[paidPackages.length - 1].nameAr}
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              /* ─── No Subscription ─── */
              <Card className="border-dashed border-2 border-border/50 shadow-sm">
                <CardContent className="p-10 text-center">
                  <Package className="w-12 h-12 mx-auto text-muted-foreground opacity-30 mb-4" />
                  <p className="text-xl font-bold text-foreground mb-2">لا يوجد اشتراك نشط</p>
                  <p className="text-muted-foreground mb-6">اشترك الآن للحصول على مزايا المنصة وزيادة ظهورك أمام العملاء</p>
                  {freePackage && (
                    <Button
                      className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl px-10"
                      onClick={() => handleSubscribeClick(freePackage)}
                    >
                      ابدأ مجاناً
                    </Button>
                  )}
                </CardContent>
              </Card>
            )}

            {/* ─── Plan Comparison ─── */}
            <div className="pt-4">
              <h2 className="text-2xl font-bold mb-6 text-center">قارن بين الباقات واختر الأنسب لك</h2>
              {packagesLoading ? (
                <div className="flex justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className={`grid gap-6 items-start ${sortedPackages.length === 1 ? "grid-cols-1 max-w-sm mx-auto" : sortedPackages.length === 2 ? "grid-cols-1 md:grid-cols-2 max-w-2xl mx-auto" : "grid-cols-1 md:grid-cols-3"}`}>
                  {sortedPackages.map((pkg, idx) => {
                    const isFree = parseFloat(pkg.price) === 0;
                    const isTopPlan = !isFree && idx === sortedPackages.length - 1 && sortedPackages.length >= 3;
                    const isCurrent = sub?.packageNameAr === pkg.nameAr;
                    const isMiddle = !isFree && !isTopPlan && sortedPackages.length >= 3 && idx > 0 && idx < sortedPackages.length - 1;

                    return (
                      <Card
                        key={pkg.id}
                        className={`h-full flex flex-col relative overflow-hidden transition-all ${
                          isTopPlan
                            ? "border-amber-300 ring-1 ring-amber-300 shadow-lg bg-gradient-to-b from-amber-50/50 to-background"
                            : isMiddle
                            ? "border-primary ring-2 ring-primary ring-offset-2 shadow-lg transform md:-translate-y-4 z-10"
                            : "border-border/60 hover:shadow-md"
                        }`}
                      >
                        {isCurrent && (
                          <div className="absolute top-0 inset-x-0 bg-primary text-primary-foreground text-xs font-bold text-center py-1.5">
                            باقتك الحالية ✓
                          </div>
                        )}
                        {isTopPlan && !isCurrent && (
                          <div className="absolute -right-12 top-6 bg-amber-500 text-white text-xs font-bold py-1 px-12 transform rotate-45 shadow-sm">
                            الأكثر شعبية
                          </div>
                        )}
                        <CardHeader className={`text-center pb-4 ${isCurrent ? "pt-8" : "pt-6"}`}>
                          <CardTitle className={`text-xl ${isTopPlan ? "text-amber-600" : isMiddle ? "text-[#cd7f32]" : ""} flex items-center justify-center gap-2`}>
                            {isTopPlan && <Crown className="w-5 h-5" />}
                            {pkg.nameAr}
                          </CardTitle>
                          <p className="text-3xl font-black mt-2">
                            {isFree ? "مجاني" : `${pkg.price}`}
                            {!isFree && <span className="text-base font-normal text-muted-foreground"> ر.س/{pkg.durationDays === 30 ? "شهر" : `${pkg.durationDays} يوم`}</span>}
                          </p>
                        </CardHeader>
                        <CardContent className="flex-1 flex flex-col">
                          <ul className="space-y-3 flex-1 text-sm">
                            {pkg.commissionRate && (
                              <li className="flex items-center gap-2">
                                <CheckCircle2 className={`w-4 h-4 shrink-0 ${isTopPlan ? "text-amber-500" : isMiddle ? "text-primary" : ""}`} />
                                عمولة المنصة: {pkg.commissionRate}%
                              </li>
                            )}
                            {pkg.maxListings && (
                              <li className="flex items-center gap-2">
                                <CheckCircle2 className={`w-4 h-4 shrink-0 ${isTopPlan ? "text-amber-500" : isMiddle ? "text-primary" : ""}`} />
                                عدد الخدمات: {pkg.maxListings > 99 ? "غير محدود" : `حتى ${pkg.maxListings}`}
                              </li>
                            )}
                            {pkg.featuredAllowed != null && pkg.featuredAllowed > 0 && (
                              <li className="flex items-center gap-2">
                                <CheckCircle2 className={`w-4 h-4 shrink-0 ${isTopPlan ? "text-amber-500" : isMiddle ? "text-primary" : ""}`} />
                                إعلانات مميزة: {pkg.featuredAllowed > 99 ? "غير محدودة" : `${pkg.featuredAllowed} شهرياً`}
                              </li>
                            )}
                            {pkg.topBadge && (
                              <li className="flex items-center gap-2">
                                <CheckCircle2 className={`w-4 h-4 shrink-0 ${isTopPlan ? "text-amber-500" : "text-primary"}`} />
                                شارة مزود مميز
                                <Star className="w-3 h-3 text-amber-500 fill-amber-500 mr-auto" />
                              </li>
                            )}
                            {pkg.priorityRank != null && pkg.priorityRank > 0 && (
                              <li className="flex items-center gap-2">
                                <CheckCircle2 className={`w-4 h-4 shrink-0 ${isTopPlan ? "text-amber-500" : "text-primary"}`} />
                                أولوية في البحث: {pkg.priorityRank >= 3 ? "أعلى" : "محسّن"}
                              </li>
                            )}
                          </ul>
                          <div className="mt-6 pt-4 border-t">
                            {isCurrent ? (
                              <Button
                                className="w-full rounded-xl h-11 bg-primary/10 text-primary border border-primary/30 hover:bg-primary hover:text-primary-foreground font-bold"
                                onClick={() => handleSubscribeClick(pkg)}
                              >
                                تجديد الباقة
                              </Button>
                            ) : (
                              <Button
                                className={`w-full rounded-xl h-11 font-bold ${
                                  isTopPlan
                                    ? "bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white shadow-lg"
                                    : isFree
                                    ? "bg-secondary text-foreground hover:bg-secondary/80"
                                    : "bg-primary hover:bg-primary/90 text-primary-foreground"
                                }`}
                                onClick={() => handleSubscribeClick(pkg)}
                                disabled={isFree && hasUsedFreePlan}
                              >
                                {isTopPlan && <Zap className="w-4 h-4 ml-2" />}
                                {isFree && hasUsedFreePlan ? "تم استخدام المجانية" : isFree ? "ابدأ مجاناً" : "اشترك الآن"}
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
                          <td className="px-4 py-4 text-muted-foreground">{new Date(sub.startDate).toLocaleDateString("ar-SA")}</td>
                          <td className="px-4 py-4 text-muted-foreground">{new Date(sub.endDate).toLocaleDateString("ar-SA")}</td>
                          <td className="px-4 py-4 font-bold">
                            {sub.packagePrice && parseFloat(sub.packagePrice) > 0 ? `${sub.packagePrice} ر.س` : "مجاني"}
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
        <Dialog open={confirmOpen} onOpenChange={(o) => { if (!subscribeMutation.isPending) { setConfirmOpen(o); if (!o) setSelectedPackage(null); } }}>
          <DialogContent className="sm:max-w-[420px]" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-2xl flex items-center gap-2">
                {selectedPackage && parseFloat(selectedPackage.price) > 0 ? (
                  <><Crown className="w-6 h-6 text-amber-500" /> الاشتراك في باقة {selectedPackage.nameAr}</>
                ) : (
                  <><Package className="w-6 h-6 text-primary" /> تفعيل الباقة المجانية</>
                )}
              </DialogTitle>
              <DialogDescription className="text-base mt-2">
                {selectedPackage && parseFloat(selectedPackage.price) > 0
                  ? `سيتم تفعيل باقة "${selectedPackage.nameAr}" لمدة ${selectedPackage.durationDays} يوم.`
                  : "ابدأ باستخدام المنصة مجاناً والترقية في أي وقت."}
              </DialogDescription>
            </DialogHeader>

            {selectedPackage && (
              <div className="py-4 space-y-4">
                <div className="bg-secondary/60 rounded-xl p-4 space-y-2 text-sm">
                  {selectedPackage.commissionRate && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">عمولة المنصة</span>
                      <span className="font-bold">{selectedPackage.commissionRate}%</span>
                    </div>
                  )}
                  {selectedPackage.maxListings && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">عدد الخدمات</span>
                      <span className="font-bold">{selectedPackage.maxListings > 99 ? "غير محدود" : `حتى ${selectedPackage.maxListings}`}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">مدة الاشتراك</span>
                    <span className="font-bold">{selectedPackage.durationDays} يوم</span>
                  </div>
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="font-semibold">الإجمالي</span>
                    <span className="text-lg font-black text-primary">
                      {parseFloat(selectedPackage.price) === 0 ? "مجاني" : `${selectedPackage.price} ر.س`}
                    </span>
                  </div>
                </div>
              </div>
            )}

            <DialogFooter className="flex-col gap-3 sm:flex-col">
              <Button
                className="w-full h-12 text-base font-bold rounded-xl bg-primary hover:bg-primary/90"
                onClick={() => selectedPackage && subscribeMutation.mutate(selectedPackage)}
                disabled={subscribeMutation.isPending}
              >
                {subscribeMutation.isPending ? (
                  <><Loader2 className="w-5 h-5 animate-spin ml-2" /> جاري التفعيل...</>
                ) : (
                  <><CreditCard className="w-5 h-5 ml-2" /> تأكيد الاشتراك</>
                )}
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-xl"
                onClick={() => { setConfirmOpen(false); setSelectedPackage(null); }}
                disabled={subscribeMutation.isPending}
              >
                إلغاء
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

      </div>
    </ProviderLayout>
  );
}
