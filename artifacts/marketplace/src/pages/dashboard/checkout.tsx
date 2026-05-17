import { useMemo, useState } from "react";
import { Redirect, useLocation } from "wouter";
import toast from "react-hot-toast";
import { motion } from "framer-motion";
import { Loader2, Lock, ShieldCheck, ArrowRight, Smartphone } from "lucide-react";
import ProviderLayout from "@/components/ProviderLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/lib/auth-context";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

/**
 * Unified checkout entry-point — handles both:
 *  - kind=subscription (default) — provider pays for a package.
 *  - kind=request                — customer pays a provider for a service request.
 *
 * The route used to live behind /dashboard/checkout, so for subscription mode
 * we keep the provider-only layout. For service-request mode we render a
 * simpler centered layout that any logged-in user can reach.
 */
export default function ProviderCheckout() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();

  const { kind, packageId, fromOnboarding, providerId, serviceId, requestAmount } = useMemo(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    const rawKind = (params.get("kind") ?? "subscription").toLowerCase();
    return {
      kind: rawKind === "request" ? "request" : "subscription",
      packageId: parseInt(params.get("packageId") ?? "", 10),
      fromOnboarding: params.get("from") === "onboarding",
      providerId: parseInt(params.get("providerId") ?? "", 10),
      serviceId: parseInt(params.get("serviceId") ?? "", 10),
      requestAmount: parseFloat(params.get("amount") ?? ""),
    };
  }, []);

  const isRequest = kind === "request";

  if (!user) {
    const returnTo = typeof window !== "undefined" ? `${window.location.pathname}${window.location.search}` : "/dashboard/checkout";
    return <Redirect to={`/login?returnTo=${encodeURIComponent(returnTo)}`} />;
  }

  if (isRequest) {
    return <ServiceRequestCheckout providerId={providerId} serviceId={serviceId} initialAmount={requestAmount} />;
  }

  if (user.role !== "provider") {
    return <Redirect to="/" />;
  }
  return <SubscriptionCheckout packageId={packageId} fromOnboarding={fromOnboarding} setLocation={setLocation} />;
}

// ---------------------------------------------------------------------------
// Subscription checkout (existing flow, lightly refactored)
// ---------------------------------------------------------------------------
function SubscriptionCheckout({
  packageId,
  fromOnboarding,
  setLocation,
}: {
  packageId: number;
  fromOnboarding: boolean;
  setLocation: (href: string) => void;
}) {
  const [redirecting, setRedirecting] = useState(false);
  const { data: packages = [], isLoading: packagesLoading } = useQuery({
    queryKey: ["packages"],
    queryFn: api.packages.list,
  });
  const pkg = packages.find((p) => p.id === packageId);

  const startMutation = useMutation({
    mutationFn: async () => {
      if (!pkg) throw new Error("بيانات الباقة غير مكتملة");
      return api.payments.stcpayCreateSession(pkg.id, fromOnboarding);
    },
    onSuccess: (data) => {
      setRedirecting(true);
      toast.success("جارٍ التحويل إلى STC Pay…");
      window.location.href = data.redirectUrl;
    },
    onError: (err: Error) => {
      toast.error(err.message || "تعذر بدء جلسة الدفع");
    },
  });

  if (!Number.isFinite(packageId) || packageId < 1) {
    return (
      <ProviderLayout>
        <div className="p-8 max-w-lg mx-auto text-center space-y-4" dir="rtl">
          <p className="text-muted-foreground">لم يتم تحديد الباقة. يرجى اختيار باقة من صفحة الاشتراكات.</p>
          <Button onClick={() => setLocation("/dashboard/subscription")}>العودة إلى الاشتراكات</Button>
        </div>
      </ProviderLayout>
    );
  }

  if (packagesLoading) {
    return (
      <ProviderLayout>
        <div className="p-12 flex justify-center" dir="rtl">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </ProviderLayout>
    );
  }

  if (!pkg) {
    return (
      <ProviderLayout>
        <div className="p-8 max-w-lg mx-auto text-center space-y-4" dir="rtl">
          <p className="text-muted-foreground">الباقة المطلوبة غير موجودة. ربما تم حذفها أو تعطيلها.</p>
          <Button onClick={() => setLocation("/dashboard/subscription")}>العودة إلى الاشتراكات</Button>
        </div>
      </ProviderLayout>
    );
  }

  if (parseFloat(String(pkg.price)) === 0) {
    return <Redirect to="/dashboard/subscription" />;
  }

  return (
    <ProviderLayout>
      <div className="p-6 max-w-3xl mx-auto space-y-8" dir="rtl">
        <div>
          <h1 className="text-2xl font-bold">إتمام الدفع عبر STC Pay</h1>
          <p className="text-muted-foreground mt-1">
            سيتم تحويلك إلى بوابة STC Pay لإتمام عملية الدفع بشكل آمن، ثم العودة إلى سمارت لاينز للنظم المتطورة لتفعيل اشتراكك.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-5">
          <Card className="md:col-span-2 border-border/60">
            <CardHeader>
              <CardTitle className="text-lg">ملخص الطلب</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">الباقة</span>
                <span className="font-semibold">{pkg.nameAr}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">المدة</span>
                <span>{pkg.durationDays} يوم</span>
              </div>
              <div className="flex justify-between pt-2 border-t text-base">
                <span className="font-bold">الإجمالي</span>
                <span className="font-black text-primary">{pkg.price} ر.س</span>
              </div>
            </CardContent>
          </Card>

          <Card className="md:col-span-3 border-border/60 shadow-sm">
            <CardHeader className="flex flex-row items-center gap-2 space-y-0">
              <Smartphone className="w-5 h-5 text-purple-700" />
              <CardTitle className="text-lg">الدفع عبر STC Pay</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <StcPayBanner />
              <ul className="text-sm text-muted-foreground space-y-1 list-disc pr-5">
                <li>سيتم إنشاء جلسة دفع آمنة بقيمة {pkg.price} ر.س.</li>
                <li>عند نجاح الدفع، يُفعَّل اشتراكك تلقائياً.</li>
                <li>إذا ألغيت العملية أو فشلت، لن يتم تفعيل أي اشتراك.</li>
              </ul>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <Button
                  className="flex-1 h-12 rounded-xl gap-2 bg-purple-700 hover:bg-purple-800 text-white"
                  disabled={startMutation.isPending || redirecting}
                  onClick={() => startMutation.mutate()}
                >
                  {startMutation.isPending || redirecting ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Lock className="w-4 h-4" />
                  )}
                  ادفع {pkg.price} ر.س عبر STC Pay
                </Button>
                {!fromOnboarding && (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-12 rounded-xl"
                    disabled={startMutation.isPending || redirecting}
                    onClick={() => setLocation("/dashboard/subscription")}
                  >
                    إلغاء
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {!fromOnboarding && (
          <motion.button
            type="button"
            className="text-sm text-primary flex items-center gap-1 hover:underline mx-auto"
            onClick={() => setLocation("/dashboard/subscription")}
            whileTap={{ scale: 0.98 }}
          >
            <ArrowRight className="w-4 h-4 rotate-180" /> العودة لاختيار باقة أخرى
          </motion.button>
        )}
      </div>
    </ProviderLayout>
  );
}

// ---------------------------------------------------------------------------
// Service-request checkout (new) — used by customers to pay for a request.
// ---------------------------------------------------------------------------
function ServiceRequestCheckout({
  providerId,
  serviceId,
  initialAmount,
}: {
  providerId: number;
  serviceId: number;
  initialAmount: number;
}) {
  const [, setLocation] = useLocation();
  const [redirecting, setRedirecting] = useState(false);
  const [amountStr, setAmountStr] = useState<string>(
    Number.isFinite(initialAmount) && initialAmount > 0 ? String(initialAmount) : "",
  );

  const validProviderId = Number.isFinite(providerId) && providerId > 0;
  const hasService = Number.isFinite(serviceId) && serviceId > 0;

  const { data: providerDetail, isLoading: providerLoading } = useQuery({
    queryKey: ["providerDetail", providerId],
    queryFn: () => api.providers.get(providerId),
    enabled: validProviderId,
  });

  const service = hasService
    ? (providerDetail as any)?.services?.find((s: any) => s.id === serviceId)
    : null;

  const startMutation = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(amountStr);
      if (!Number.isFinite(amount) || amount <= 0) throw new Error("يرجى إدخال قيمة صالحة");
      return api.payments.stcpayCreateRequestSession({
        providerId,
        serviceId: hasService ? serviceId : null,
        amount,
      });
    },
    onSuccess: (data) => {
      setRedirecting(true);
      toast.success("جارٍ التحويل إلى STC Pay…");
      window.location.href = data.redirectUrl;
    },
    onError: (err: Error) => {
      toast.error(err.message || "تعذر بدء جلسة الدفع");
    },
  });

  if (!validProviderId) {
    return (
      <CenteredShell title="رابط غير صالح">
        <p className="text-muted-foreground text-sm">رابط الطلب غير مكتمل. يرجى العودة إلى صفحة مقدم الخدمة.</p>
      </CenteredShell>
    );
  }
  if (providerLoading) {
    return (
      <CenteredShell title="جارٍ التحميل...">
        <Loader2 className="w-6 h-6 animate-spin text-primary mx-auto" />
      </CenteredShell>
    );
  }

  return (
    <CenteredShell title="دفع طلب خدمة عبر STC Pay">
      <div className="grid gap-6 md:grid-cols-5" dir="rtl">
        <Card className="md:col-span-2 border-border/60">
          <CardHeader>
            <CardTitle className="text-lg">ملخص الطلب</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">المزود</span>
              <span className="font-semibold">{(providerDetail as any)?.userName ?? "—"}</span>
            </div>
            {service ? (
              <div className="flex justify-between">
                <span className="text-muted-foreground">الخدمة</span>
                <span className="font-semibold">{service.title}</span>
              </div>
            ) : null}
            <div className="flex justify-between pt-2 border-t text-base">
              <span className="font-bold">المبلغ</span>
              <span className="font-black text-primary">{amountStr || "—"} ر.س</span>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-3 border-border/60 shadow-sm">
          <CardHeader className="flex flex-row items-center gap-2 space-y-0">
            <Smartphone className="w-5 h-5 text-purple-700" />
            <CardTitle className="text-lg">الدفع عبر STC Pay</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <StcPayBanner />

            <div className="space-y-2">
              <label className="text-sm font-medium">قيمة الطلب (ر.س)</label>
              <input
                type="number"
                inputMode="decimal"
                min="1"
                step="0.01"
                className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                placeholder="أدخل المبلغ المتفق عليه"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
              />
              <p className="text-[11px] text-muted-foreground">
                {service?.price
                  ? `سعر الخدمة المعلن يبدأ من ${service.price} ر.س — يمكنك تعديله بحسب اتفاقك مع المزود.`
                  : "ستحصل المنصة على عمولة بسيطة من قيمة الطلب لتغطية تكاليف الخدمة."}
              </p>
            </div>

            <ul className="text-sm text-muted-foreground space-y-1 list-disc pr-5">
              <li>سيتم تحويلك إلى بوابة STC Pay لإكمال الدفع بأمان.</li>
              <li>عند نجاح الدفع، يُسجَّل طلبك تلقائياً ويصل إشعار للمزود.</li>
              <li>إذا فشل الدفع أو ألغيت العملية، لن يُنشأ أي طلب.</li>
            </ul>

            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Button
                className="flex-1 h-12 rounded-xl gap-2 bg-purple-700 hover:bg-purple-800 text-white"
                disabled={
                  startMutation.isPending ||
                  redirecting ||
                  !(parseFloat(amountStr) > 0)
                }
                onClick={() => startMutation.mutate()}
              >
                {startMutation.isPending || redirecting ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                ادفع وأتمّ الطلب
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-xl"
                disabled={startMutation.isPending || redirecting}
                onClick={() => setLocation(`/provider/${providerId}`)}
              >
                إلغاء
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </CenteredShell>
  );
}

// ---------------------------------------------------------------------------
// Shared bits
// ---------------------------------------------------------------------------
function StcPayBanner() {
  return (
    <div className="rounded-2xl bg-gradient-to-br from-purple-700 to-purple-900 text-white p-5 shadow-md">
      <div className="text-2xl font-extrabold tracking-wider">stc pay</div>
      <p className="text-sm opacity-90 mt-2">
        ادفع باستخدام محفظة STC Pay الخاصة بك. ستحوّل إلى بوابة الدفع لإكمال العملية بأمان.
      </p>
      <div className="mt-3 inline-flex items-center gap-1 text-[11px] bg-white/15 px-2 py-1 rounded-full">
        <ShieldCheck className="w-3.5 h-3.5" /> اتصال مشفّر — بيئة تجريبية
      </div>
    </div>
  );
}

function CenteredShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-[100dvh] bg-secondary/30 py-12 px-4" dir="rtl">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-2xl font-bold text-center">{title}</h1>
        {children}
      </div>
    </div>
  );
}
