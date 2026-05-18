import { useState } from "react";
import { DownloadCloud, CreditCard, DollarSign, Clock, X, Printer, Loader2, Package, Wallet, CheckCircle2, XCircle, TrendingUp, ArrowDownCircle } from "lucide-react";
import ProviderLayout from "@/components/ProviderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { api, type ProviderStats } from "@/lib/api";

const INCOMING_STATUS_CFG: Record<string, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  paid:      { label: "مكتمل", cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  pending:   { label: "قيد المعالجة", cls: "bg-amber-100 text-amber-700 border-amber-200", icon: Clock },
  failed:    { label: "فشل",   cls: "bg-rose-100 text-rose-700 border-rose-200", icon: XCircle },
  cancelled: { label: "ملغي",  cls: "bg-slate-100 text-slate-700 border-slate-200", icon: XCircle },
};

function fmtMoney(v: string | number | null | undefined): string {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "0"));
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleString("ar-EG", {
      year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

interface FakeInvoice {
  id: string;
  type: string;
  date: string;
  amount: string;
  status: string;
  packageName?: string;
}

function InvoiceModal({ invoice, open, onClose }: { invoice: FakeInvoice | null; open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  if (!invoice) return null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">فاتورة {invoice.id}</DialogTitle>
        </DialogHeader>

        <div id="invoice-content">
          <div className="border rounded-xl overflow-hidden">
            <div className="bg-primary p-6 text-primary-foreground">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-2xl font-black">عقارتي</h2>
                  <p className="text-primary-foreground/70 text-sm mt-1">عقارات بنها</p>
                </div>
                <div className="text-left">
                  <p className="text-sm font-bold text-primary-foreground/80">فاتورة رقم</p>
                  <p className="text-2xl font-black">{invoice.id}</p>
                </div>
              </div>
            </div>

            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground mb-1">صادرة إلى</p>
                  <p className="font-bold">{user?.name ?? "مقدم الخدمة"}</p>
                  <p className="text-muted-foreground">{user?.email ?? ""}</p>
                </div>
                <div className="text-left">
                  <p className="text-muted-foreground mb-1">التاريخ</p>
                  <p className="font-bold">{invoice.date}</p>
                </div>
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full text-sm text-right">
                  <thead className="bg-secondary/50">
                    <tr>
                      <th className="px-4 py-3 font-medium">الوصف</th>
                      <th className="px-4 py-3 font-medium text-left">المبلغ</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-t">
                      <td className="px-4 py-3">
                        {invoice.type}
                        {invoice.packageName && <span className="text-muted-foreground text-xs block">{invoice.packageName}</span>}
                      </td>
                      <td className="px-4 py-3 text-left font-bold">{invoice.amount} ج.م</td>
                    </tr>
                  </tbody>
                  <tfoot className="bg-secondary/30 border-t">
                    <tr>
                      <td className="px-4 py-3 font-bold">الإجمالي</td>
                      <td className="px-4 py-3 text-left font-black text-primary">{invoice.amount} ج.م</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div className="flex items-center justify-between pt-2">
                <Badge
                  variant="outline"
                  className={
                    invoice.status === "مدفوع"
                      ? "bg-green-500/10 text-green-600 border-green-200"
                      : invoice.status === "معلق"
                      ? "bg-amber-500/10 text-amber-600 border-amber-200"
                      : "bg-red-500/10 text-red-600 border-red-200"
                  }
                >
                  {invoice.status}
                </Badge>
                <p className="text-xs text-muted-foreground">عقارات بنها © {new Date().getFullYear()}</p>
              </div>
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-2">
          <Button className="flex-1 gap-2" onClick={() => window.print()}>
            <Printer className="w-4 h-4" />
            طباعة / تحميل PDF
          </Button>
          <Button variant="outline" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function ProviderPayments() {
  const { user } = useAuth();
  const providerId = user?.providerId;
  const [selectedInvoice, setSelectedInvoice] = useState<FakeInvoice | null>(null);

  const { data: stats, isLoading } = useQuery<ProviderStats>({
    queryKey: ["providerStats", providerId],
    queryFn: () => api.providers.stats(providerId!),
    enabled: !!providerId,
    refetchInterval: 5000,
  });

  // Full incoming service-request payments history
  const { data: incoming, isLoading: incomingLoading } = useQuery({
    queryKey: ["provider-incoming-payments", providerId],
    queryFn: () => api.payments.providerMyPayments(),
    enabled: !!providerId,
    refetchInterval: 5000,
  });

  const sub = stats?.subscription ?? null;
  const incomingRows = incoming?.rows ?? [];
  const incomingTotals = incoming?.totals ?? { paid: 0, pending: 0, failed: 0, paidAmount: 0, pendingAmount: 0, failedAmount: 0, netEarnings: 0 };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "مدفوع": return "bg-green-500/10 text-green-600 border-green-200";
      case "معلق": return "bg-amber-500/10 text-amber-600 border-amber-200";
      case "منتهي": return "bg-red-500/10 text-red-600 border-red-200";
      default: return "bg-gray-500/10 text-gray-600 border-gray-200";
    }
  };

  /* Build invoices from real subscription data */
  const invoices: FakeInvoice[] = sub
    ? [
        {
          id: `INV-${sub.id}`,
          type: "اشتراك في المنصة",
          date: new Date(sub.startDate).toLocaleDateString("ar-EG"),
          amount: sub.packagePrice ?? "—",
          status: sub.isActive ? "مدفوع" : "منتهي",
          packageName: sub.packageNameAr ?? undefined,
        },
      ]
    : [];

  const totalPaid = invoices.filter(p => p.status === "مدفوع").reduce((s, p) => s + (Number(p.amount) || 0), 0);
  const totalPending = invoices.filter(p => p.status === "معلق").reduce((s, p) => s + (Number(p.amount) || 0), 0);

  return (
    <ProviderLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold text-foreground">المدفوعات</h1>
          <p className="text-muted-foreground mt-1">سجل المدفوعات والاشتراكات</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-border/50 shadow-sm bg-primary/5 border-primary/10">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">إجمالي المدفوعات</p>
                      <p className="text-3xl font-bold text-primary mt-2">
                        {totalPaid.toLocaleString("ar-EG")} <span className="text-lg font-normal">ج.م</span>
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                      <CreditCard className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50 shadow-sm bg-amber-500/5 border-amber-500/10">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">الرصيد المعلق</p>
                      <p className="text-3xl font-bold text-amber-600 mt-2">
                        {totalPending.toLocaleString("ar-EG")} <span className="text-lg font-normal">ج.م</span>
                      </p>
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                      <Clock className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card className="border-border/50 shadow-sm">
                <CardContent className="p-6">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">حالة الاشتراك</p>
                      <p className={`text-xl font-bold mt-2 ${sub?.isActive ? "text-green-600" : "text-red-500"}`}>
                        {sub ? (sub.isActive ? "نشط" : "منتهي") : "لا يوجد"}
                      </p>
                      {sub?.daysLeft !== null && sub?.daysLeft !== undefined && (
                        <p className="text-xs text-muted-foreground mt-1">{sub.daysLeft} يوم متبقي</p>
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center text-foreground">
                      <Package className="w-5 h-5" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Subscription Info */}
            {sub && (
              <Card className="border-border/50 shadow-sm">
                <CardHeader>
                  <CardTitle className="text-xl">تفاصيل الاشتراك الحالي</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground mb-1">الباقة</p>
                      <p className="font-bold">{sub.packageNameAr ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">تاريخ البداية</p>
                      <p className="font-bold">{new Date(sub.startDate).toLocaleDateString("ar-EG")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">تاريخ الانتهاء</p>
                      <p className="font-bold">{new Date(sub.endDate).toLocaleDateString("ar-EG")}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground mb-1">المبلغ</p>
                      <p className="font-bold text-primary">{sub.packagePrice ?? "—"} ج.م</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Invoice History */}
            <Card className="border-border/50 shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl">سجل الفواتير</CardTitle>
              </CardHeader>
              <CardContent>
                {invoices.length === 0 ? (
                  <div className="text-center py-16 text-muted-foreground">
                    <DollarSign className="w-12 h-12 mx-auto mb-3 opacity-20" />
                    <p className="text-base font-medium">لا توجد فواتير بعد</p>
                    <p className="text-sm mt-1">ستظهر فواتير اشتراكاتك هنا</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                      <thead className="text-xs text-muted-foreground bg-secondary/50 border-b border-border">
                        <tr>
                          <th className="px-4 py-4 font-medium">رقم الفاتورة</th>
                          <th className="px-4 py-4 font-medium">النوع</th>
                          <th className="px-4 py-4 font-medium">التاريخ</th>
                          <th className="px-4 py-4 font-medium">المبلغ</th>
                          <th className="px-4 py-4 font-medium">الحالة</th>
                          <th className="px-4 py-4 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {invoices.map((row) => (
                          <tr key={row.id} className="border-b border-border/50 hover:bg-secondary/20 transition-colors">
                            <td className="px-4 py-4 font-medium">{row.id}</td>
                            <td className="px-4 py-4">
                              {row.type}
                              {row.packageName && <span className="text-xs text-muted-foreground block">{row.packageName}</span>}
                            </td>
                            <td className="px-4 py-4 text-muted-foreground">{row.date}</td>
                            <td className="px-4 py-4 font-bold">{row.amount} ج.م</td>
                            <td className="px-4 py-4">
                              <Badge variant="outline" className={getStatusColor(row.status)}>
                                {row.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-4 text-left">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="text-muted-foreground hover:text-primary"
                                onClick={() => setSelectedInvoice(row)}
                              >
                                <DownloadCloud className="w-4 h-4 ml-1.5" />
                                تحميل
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <InvoiceModal
        invoice={selectedInvoice}
        open={!!selectedInvoice}
        onClose={() => setSelectedInvoice(null)}
      />
    </ProviderLayout>
  );
}
