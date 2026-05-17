import { useMemo } from "react";
import { Redirect, useLocation } from "wouter";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle, AlertTriangle, Loader2 } from "lucide-react";
import ProviderLayout from "@/components/ProviderLayout";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

/**
 * Unified result page for both subscription payments and service-request
 * payments. The flavor is determined by the `kind` URL param (forwarded by the
 * `/api/stcpay/return` redirect) or the loaded transaction's `kind` field.
 */
export default function CheckoutResult() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();

  const { refId, urlStatus, urlKind, fromOnboarding } = useMemo(() => {
    const params = new URLSearchParams(typeof window !== "undefined" ? window.location.search : "");
    return {
      refId: params.get("refId") ?? "",
      urlStatus: (params.get("status") ?? "").toLowerCase(),
      urlKind: (params.get("kind") ?? "").toLowerCase(),
      fromOnboarding: params.get("from") === "onboarding",
    };
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["stcpay-status", refId],
    queryFn: () => api.payments.stcpayStatus(refId),
    enabled: !!refId && !!user,
    refetchInterval: (q) => {
      const s = (q.state.data as { status?: string } | undefined)?.status;
      return s === "pending" ? 2000 : false;
    },
  });

  if (!user) {
    return <Redirect to={`/login?returnTo=${encodeURIComponent(`/dashboard/checkout/result?refId=${refId}`)}`} />;
  }

  const kind = (data?.kind ?? urlKind) === "service_request" ? "service_request" : "subscription";
  const isRequest = kind === "service_request";
  // For service-request results, we don't want the provider sidebar.
  const Shell = ({ children }: { children: React.ReactNode }) =>
    isRequest ? (
      <div className="min-h-[100dvh] bg-secondary/30 py-12 px-4" dir="rtl">
        <div className="max-w-md mx-auto">{children}</div>
      </div>
    ) : (
      <ProviderLayout>{children}</ProviderLayout>
    );

  if (!refId) {
    return (
      <Shell>
        <div className="p-8 max-w-md mx-auto text-center space-y-4" dir="rtl">
          <p className="text-muted-foreground">لم يُعثر على عملية دفع.</p>
          <Button onClick={() => setLocation(isRequest ? "/" : "/dashboard/subscription")}>
            {isRequest ? "العودة للرئيسية" : "العودة إلى الاشتراكات"}
          </Button>
        </div>
      </Shell>
    );
  }

  const status = (data?.status ?? urlStatus) as "paid" | "failed" | "cancelled" | "pending" | "";

  if (isLoading || status === "pending" || status === "") {
    return (
      <Shell>
        <div className="p-12 max-w-md mx-auto text-center space-y-4" dir="rtl">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground">جارٍ التحقق من حالة الدفع…</p>
        </div>
      </Shell>
    );
  }

  if (status === "paid") {
    qc.invalidateQueries({ queryKey: ["providerStats"] });
    qc.invalidateQueries({ queryKey: ["admin-payments"] });
    qc.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    qc.invalidateQueries({ queryKey: ["notifications"] });
    if (isRequest) {
      qc.invalidateQueries({ queryKey: ["user-requests"] });
      qc.invalidateQueries({ queryKey: ["wallet"] });
    }

    return (
      <Shell>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 max-w-md mx-auto text-center space-y-6"
          dir="rtl"
        >
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-9 h-9" />
          </div>
          <h1 className="text-2xl font-bold">
            {isRequest
              ? "تم استلام الدفعة وإنشاء طلبك 🎉"
              : fromOnboarding
              ? "تم تفعيل اشتراكك بنجاح 🎉"
              : "تم الدفع بنجاح"}
          </h1>
          <p className="text-muted-foreground">
            {isRequest
              ? `تم تأكيد دفعتك بقيمة ${data?.amount ?? ""} ر.س. سيتلقى مقدم الخدمة إشعاراً بطلبك ويبدأ التنسيق معك.`
              : fromOnboarding
              ? `أهلاً بك! تم إنشاء حسابك وتفعيل ${data?.packageName ?? "باقتك"}. ابدأ الآن باستقبال طلبات العملاء.`
              : `تم تفعيل ${data?.packageName ?? "باقتك"}. يمكنك الآن الاستفادة من مزايا الاشتراك المدفوع.`}
          </p>
          <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 inline-block">
            رقم العملية: <span dir="ltr">{refId}</span>
          </div>
          <div className="space-y-2">
            {isRequest ? (
              <>
                <Button className="w-full rounded-xl h-11" onClick={() => setLocation("/profile/requests")}>
                  عرض طلباتي
                </Button>
                <Button
                  variant="outline"
                  className="w-full rounded-xl h-11"
                  onClick={() => setLocation(data?.providerId ? `/provider/${data.providerId}` : "/")}
                >
                  العودة لصفحة المزود
                </Button>
              </>
            ) : (
              <>
                <Button
                  className="w-full rounded-xl h-11"
                  onClick={() => setLocation(fromOnboarding ? "/dashboard" : "/dashboard/subscription")}
                >
                  {fromOnboarding ? "الذهاب إلى لوحة التحكم" : "العودة إلى لوحة الاشتراك"}
                </Button>
                {fromOnboarding && (
                  <Button variant="outline" className="w-full rounded-xl h-11" onClick={() => setLocation("/dashboard/services")}>
                    إدارة الخدمات
                  </Button>
                )}
              </>
            )}
          </div>
        </motion.div>
      </Shell>
    );
  }

  const isCancelled = status === "cancelled";
  return (
    <Shell>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-8 max-w-md mx-auto text-center space-y-6"
        dir="rtl"
      >
        <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto ${isCancelled ? "bg-amber-100 text-amber-700" : "bg-rose-100 text-rose-700"}`}>
          {isCancelled ? <AlertTriangle className="w-9 h-9" /> : <XCircle className="w-9 h-9" />}
        </div>
        <h1 className="text-2xl font-bold">
          {isCancelled ? "تم إلغاء عملية الدفع" : "تعذر إتمام الدفع"}
        </h1>
        <p className="text-muted-foreground">
          {isCancelled
            ? isRequest
              ? "لم يتم خصم أي مبلغ ولم يتم إنشاء الطلب. يمكنك المحاولة مرة أخرى في أي وقت."
              : "لم يتم خصم أي مبلغ ولم يتم تفعيل الاشتراك. يمكنك المحاولة مرة أخرى في أي وقت."
            : isRequest
            ? "حدثت مشكلة أثناء معالجة الدفعة عبر STC Pay. لم يتم إنشاء أي طلب."
            : "حدثت مشكلة أثناء معالجة الدفعة عبر STC Pay. لم يتم تفعيل أي اشتراك."}
        </p>
        <div className="text-xs text-muted-foreground bg-muted/50 rounded-lg px-3 py-2 inline-block">
          رقم العملية: <span dir="ltr">{refId}</span>
        </div>
        <div className="space-y-2">
          {isRequest ? (
            <>
              <Button
                className="w-full rounded-xl h-11"
                onClick={() => {
                  if (data?.providerId) {
                    const params = new URLSearchParams({
                      kind: "request",
                      providerId: String(data.providerId),
                    });
                    if (data.serviceId) params.set("serviceId", String(data.serviceId));
                    if (data.amount) params.set("amount", String(data.amount));
                    setLocation(`/dashboard/checkout?${params.toString()}`);
                  } else setLocation("/");
                }}
              >
                إعادة المحاولة
              </Button>
              <Button variant="outline" className="w-full rounded-xl h-11" onClick={() => refetch()}>
                تحديث الحالة
              </Button>
              <Button variant="ghost" className="w-full rounded-xl h-11" onClick={() => setLocation(data?.providerId ? `/provider/${data.providerId}` : "/")}>
                العودة لصفحة المزود
              </Button>
            </>
          ) : (
            <>
              <Button
                className="w-full rounded-xl h-11"
                onClick={() => {
                  if (data?.packageId) setLocation(`/dashboard/checkout?packageId=${data.packageId}${fromOnboarding ? "&from=onboarding" : ""}`);
                  else setLocation("/dashboard/subscription");
                }}
              >
                إعادة المحاولة
              </Button>
              <Button variant="outline" className="w-full rounded-xl h-11" onClick={() => refetch()}>
                تحديث الحالة
              </Button>
              <Button variant="ghost" className="w-full rounded-xl h-11" onClick={() => setLocation("/dashboard/subscription")}>
                العودة إلى الاشتراكات
              </Button>
            </>
          )}
        </div>
      </motion.div>
    </Shell>
  );
}
