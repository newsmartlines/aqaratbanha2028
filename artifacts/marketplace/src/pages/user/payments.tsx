import { useMemo } from "react";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  CreditCard,
  CheckCircle2,
  Clock,
  XCircle,
  Wallet,
  Loader2,
  Receipt,
  Filter,
  ArrowUpRight,
  ShoppingBag,
} from "lucide-react";
import UserLayout from "@/components/UserLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

type StatusKey = "paid" | "pending" | "failed" | "cancelled";

const STATUS_CONFIG: Record<
  StatusKey,
  { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }
> = {
  paid:      { label: "مكتمل",  cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  pending:   { label: "قيد المعالجة", cls: "bg-amber-100 text-amber-700 border-amber-200",  icon: Clock },
  failed:    { label: "فشل",    cls: "bg-rose-100 text-rose-700 border-rose-200",          icon: XCircle },
  cancelled: { label: "ملغي",   cls: "bg-slate-100 text-slate-700 border-slate-200",       icon: XCircle },
};

const KIND_LABEL: Record<string, string> = {
  service_request: "طلب خدمة",
  subscription: "اشتراك باقة",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleString("ar-SA", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatMoney(v: string | number | null | undefined): string {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "0"));
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("ar-SA", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function UserPayments() {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["user-payments", user?.id],
    queryFn: () => api.payments.myPayments(),
    enabled: !!user,
    refetchInterval: 5000, // real-time refresh while a payment is being processed
  });

  const rows = data?.rows ?? [];
  const totals = data?.totals ?? { paid: 0, pending: 0, failed: 0, paidAmount: 0, pendingAmount: 0, failedAmount: 0 };

  const grouped = useMemo(() => {
    const all = rows;
    const paid = rows.filter((r) => r.status === "paid");
    const pending = rows.filter((r) => r.status === "pending");
    const failed = rows.filter((r) => r.status === "failed" || r.status === "cancelled");
    return { all, paid, pending, failed };
  }, [rows]);

  void grouped;

  if (!user) {
    return (
      <UserLayout>
        <div className="p-6 text-center">
          <p className="text-muted-foreground">يرجى تسجيل الدخول لعرض سجل المدفوعات.</p>
        </div>
      </UserLayout>
    );
  }

  return (
    <UserLayout>
      <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">مدفوعاتي</h1>
            <p className="text-sm text-muted-foreground mt-1">
              سجل كامل لجميع عمليات الدفع التي قمت بها عبر STC Pay
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link href="/user/requests">
              <ShoppingBag className="ml-2 h-4 w-4" />
              طلباتي
            </Link>
          </Button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
          <Card className="border-emerald-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">المدفوع</p>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <p className="text-2xl font-bold text-emerald-700 mt-2">
                {formatMoney(totals.paidAmount)} <span className="text-sm font-normal">ر.س</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">{totals.paid} عملية</p>
            </CardContent>
          </Card>
          <Card className="border-amber-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">قيد المعالجة</p>
                <Clock className="h-4 w-4 text-amber-600" />
              </div>
              <p className="text-2xl font-bold text-amber-700 mt-2">
                {formatMoney(totals.pendingAmount)} <span className="text-sm font-normal">ر.س</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">{totals.pending} عملية</p>
            </CardContent>
          </Card>
          <Card className="border-rose-200">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">فاشل</p>
                <XCircle className="h-4 w-4 text-rose-600" />
              </div>
              <p className="text-2xl font-bold text-rose-700 mt-2">
                {formatMoney(totals.failedAmount)} <span className="text-sm font-normal">ر.س</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">{totals.failed} عملية</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">إجمالي العمليات</p>
                <Receipt className="h-4 w-4 text-primary" />
              </div>
              <p className="text-2xl font-bold mt-2">{rows.length}</p>
              <p className="text-xs text-muted-foreground mt-1">معاملة</p>
            </CardContent>
          </Card>
        </div>

        {/* Transactions */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wallet className="h-4 w-4" />
              سجل المعاملات
            </CardTitle>
            <Badge variant="outline" className="gap-1.5">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              تحديث مباشر
            </Badge>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : rows.length === 0 ? (
              <div className="text-center py-16">
                <CreditCard className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                <p className="text-base font-medium">لا توجد مدفوعات بعد</p>
                <p className="text-sm text-muted-foreground mt-1">
                  ستظهر هنا جميع المعاملات التي تتم عبر STC Pay
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {/* Desktop table */}
                <div className="hidden md:block overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm text-right">
                    <thead className="bg-muted/40 text-xs text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-medium">رقم العملية</th>
                        <th className="px-4 py-3 font-medium">النوع</th>
                        <th className="px-4 py-3 font-medium">مقدم الخدمة</th>
                        <th className="px-4 py-3 font-medium">الخدمة</th>
                        <th className="px-4 py-3 font-medium">المبلغ</th>
                        <th className="px-4 py-3 font-medium">التاريخ</th>
                        <th className="px-4 py-3 font-medium">الحالة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row) => {
                        const cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.pending;
                        const Icon = cfg.icon;
                        return (
                          <tr key={row.id} className="border-t border-border/50 hover:bg-muted/20">
                            <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                              {row.refId}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="font-normal">
                                {KIND_LABEL[row.kind] ?? row.kind}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              {row.providerId ? (
                                <Link
                                  href={`/provider/${row.providerId}`}
                                  className="text-primary hover:underline inline-flex items-center gap-1"
                                >
                                  {row.providerName ?? `#${row.providerId}`}
                                  <ArrowUpRight className="h-3 w-3" />
                                </Link>
                              ) : (
                                "—"
                              )}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground">
                              {row.serviceTitle ?? "—"}
                            </td>
                            <td className="px-4 py-3 font-bold">
                              {formatMoney(row.amount)} <span className="text-xs font-normal">ر.س</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-muted-foreground">
                              {formatDate(row.createdAt)}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className={`${cfg.cls} gap-1`}>
                                <Icon className="h-3 w-3" />
                                {cfg.label}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Mobile cards */}
                <div className="md:hidden space-y-2">
                  {rows.map((row) => {
                    const cfg = STATUS_CONFIG[row.status] ?? STATUS_CONFIG.pending;
                    const Icon = cfg.icon;
                    return (
                      <Card key={row.id} className="overflow-hidden">
                        <CardContent className="p-4 space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-bold">
                                {KIND_LABEL[row.kind] ?? row.kind}
                              </p>
                              <p className="text-xs text-muted-foreground mt-0.5">
                                {row.providerName ?? "—"}
                              </p>
                              {row.serviceTitle && (
                                <p className="text-xs text-muted-foreground">{row.serviceTitle}</p>
                              )}
                            </div>
                            <Badge variant="outline" className={`${cfg.cls} gap-1 shrink-0`}>
                              <Icon className="h-3 w-3" />
                              {cfg.label}
                            </Badge>
                          </div>
                          <div className="flex items-center justify-between pt-2 border-t border-border/50">
                            <p className="text-lg font-bold text-primary">
                              {formatMoney(row.amount)}{" "}
                              <span className="text-xs font-normal text-muted-foreground">ر.س</span>
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {formatDate(row.createdAt)}
                            </p>
                          </div>
                          <p className="text-[10px] font-mono text-muted-foreground/60 truncate">
                            {row.refId}
                          </p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground">
          <Filter className="inline h-3 w-3 ml-1" />
          المدفوعات معالجة عبر STC Pay وتُحدّث تلقائياً عند نجاح أو فشل العملية.
        </p>
      </div>
    </UserLayout>
  );
}
