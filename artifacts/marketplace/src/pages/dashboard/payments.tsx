import { useState } from "react";
import {
  DownloadCloud, CreditCard, DollarSign, Clock, X, Printer, Loader2,
  Package, Wallet, CheckCircle2, XCircle, ArrowDownCircle,
  Smartphone, Building2, Banknote, Wifi, AlertCircle,
} from "lucide-react";
import ProviderLayout from "@/components/ProviderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { api, type ProviderStats } from "@/lib/api";

/* ── Status config ───────────────────────────────────────────────── */
const STATUS_CFG: Record<string, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  paid:      { label: "مقبول ✓",       cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  pending:   { label: "قيد المراجعة", cls: "bg-amber-100 text-amber-700 border-amber-200",       icon: Clock },
  failed:    { label: "مرفوض",         cls: "bg-rose-100 text-rose-700 border-rose-200",          icon: XCircle },
  cancelled: { label: "ملغي",          cls: "bg-slate-100 text-slate-700 border-slate-200",       icon: AlertCircle },
};

/* ── Payment gateway → Arabic label + icon ───────────────────────── */
const GATEWAY_CFG: Record<string, { label: string; icon: React.ComponentType<{ className?: string }>; cls: string }> = {
  vodafone_cash: { label: "فودافون كاش",  icon: Smartphone, cls: "text-red-600 bg-red-50 border-red-200" },
  instapay:      { label: "انستاباي",      icon: Wifi,       cls: "text-blue-600 bg-blue-50 border-blue-200" },
  orange_money:  { label: "أورنج موني",   icon: Smartphone, cls: "text-orange-600 bg-orange-50 border-orange-200" },
  etisalat_cash: { label: "اتصالات كاش",  icon: Smartphone, cls: "text-green-600 bg-green-50 border-green-200" },
  fawry:         { label: "فوري",          icon: Banknote,   cls: "text-amber-600 bg-amber-50 border-amber-200" },
  bank_transfer: { label: "تحويل بنكي",   icon: Building2,  cls: "text-slate-600 bg-slate-50 border-slate-200" },
  manual:        { label: "دفع يدوي",      icon: Banknote,   cls: "text-slate-600 bg-slate-50 border-slate-200" },
  stcpay:        { label: "STC Pay",       icon: Smartphone, cls: "text-purple-600 bg-purple-50 border-purple-200" },
  cash:          { label: "نقداً",          icon: Banknote,   cls: "text-emerald-600 bg-emerald-50 border-emerald-200" },
};

function GatewayBadge({ gateway }: { gateway: string }) {
  const cfg = GATEWAY_CFG[gateway] ?? { label: gateway, icon: CreditCard, cls: "text-slate-600 bg-slate-50 border-slate-200" };
  const Icon = cfg.icon;
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.cls}`}>
      <Icon className="h-3 w-3" />
      {cfg.label}
    </span>
  );
}

/* ── Helpers ─────────────────────────────────────────────────────── */
function fmtMoney(v: string | number | null | undefined): string {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "0"));
  if (!Number.isFinite(n)) return "0.00";
  return n.toLocaleString("ar-EG", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString("ar-EG", {
      year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch { return iso; }
}

/* ── Invoice modal ───────────────────────────────────────────────── */
interface InvoiceRow {
  id: string; refId: string; kind: string; serviceTitle: string | null;
  amount: string; status: string; gateway: string;
  paidAt: string | null; createdAt: string;
}

function InvoiceModal({ row, open, onClose }: { row: InvoiceRow | null; open: boolean; onClose: () => void }) {
  const { user } = useAuth();
  if (!row) return null;
  const cfg = STATUS_CFG[row.status] ?? STATUS_CFG.pending;
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">إيصال دفع #{row.refId}</DialogTitle>
        </DialogHeader>
        <div className="border rounded-xl overflow-hidden">
          <div className="bg-primary p-5 text-primary-foreground flex justify-between items-start">
            <div>
              <h2 className="text-xl font-black">عقارات بنها</h2>
              <p className="text-primary-foreground/70 text-sm mt-0.5">aqaratbanha.com</p>
            </div>
            <div className="text-left">
              <p className="text-xs text-primary-foreground/70">رقم الإيصال</p>
              <p className="text-lg font-black">{row.refId}</p>
            </div>
          </div>
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">صادرة إلى</p>
                <p className="font-bold">{user?.name ?? "—"}</p>
                <p className="text-muted-foreground text-xs">{user?.email ?? ""}</p>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">تاريخ الدفع</p>
                <p className="font-bold text-xs">{fmtDate(row.paidAt ?? row.createdAt)}</p>
              </div>
            </div>
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm text-right">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="px-4 py-3 font-medium">البيان</th>
                    <th className="px-4 py-3 font-medium text-left">المبلغ</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-t">
                    <td className="px-4 py-3">
                      {row.kind === "subscription" ? "اشتراك في المنصة" : "معاملة"}
                    </td>
                    <td className="px-4 py-3 text-left font-bold">{fmtMoney(row.amount)} ج.م</td>
                  </tr>
                </tbody>
                <tfoot className="bg-secondary/30 border-t">
                  <tr>
                    <td className="px-4 py-3 font-bold">الإجمالي</td>
                    <td className="px-4 py-3 text-left font-black text-primary">{fmtMoney(row.amount)} ج.م</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">طريقة الدفع:</span>
                <GatewayBadge gateway={row.gateway} />
              </div>
              <Badge variant="outline" className={cfg.cls}>{cfg.label}</Badge>
            </div>
          </div>
        </div>
        <div className="flex gap-3 mt-1">
          <Button className="flex-1 gap-2" onClick={() => window.print()}>
            <Printer className="w-4 h-4" /> طباعة / تحميل PDF
          </Button>
          <Button variant="outline" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

/* ── Main component ──────────────────────────────────────────────── */
export default function ProviderPayments() {
  const { user } = useAuth();
  const providerId = user?.providerId;
  const [selectedRow, setSelectedRow] = useState<InvoiceRow | null>(null);

  const { data: stats, isLoading } = useQuery<ProviderStats>({
    queryKey: ["providerStats", providerId],
    queryFn: () => api.providers.stats(providerId!),
    enabled: !!providerId,
    refetchInterval: 8000,
  });

  const { data: incoming, isLoading: incomingLoading } = useQuery({
    queryKey: ["provider-incoming-payments", providerId],
    queryFn: () => api.payments.providerMyPayments(),
    enabled: !!providerId,
    refetchInterval: 8000,
  });

  const sub = stats?.subscription ?? null;
  const incomingRows = incoming?.rows ?? [];
  const incomingTotals = incoming?.totals ?? {
    paid: 0, pending: 0, failed: 0,
    paidAmount: 0, pendingAmount: 0, failedAmount: 0, netEarnings: 0,
  };

  /* Subscription as a billing row */
  const subInvoice: InvoiceRow | null = sub
    ? {
        id: `INV-${sub.id}`,
        refId: `SUB-${sub.id}`,
        kind: "subscription",
        serviceTitle: sub.packageNameAr ?? null,
        amount: sub.packagePrice ?? "0",
        status: sub.isActive ? "paid" : "pending",
        gateway: "manual",
        paidAt: sub.startDate ? new Date(sub.startDate).toISOString() : null,
        createdAt: sub.startDate ? new Date(sub.startDate).toISOString() : new Date().toISOString(),
      }
    : null;

  return (
    <ProviderLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div>
          <h1 className="text-3xl font-bold">المدفوعات</h1>
          <p className="text-muted-foreground mt-1">سجل مدفوعاتك والإيرادات الواردة</p>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="bg-primary/5 border-primary/10">
                <CardContent className="p-6 flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">صافي الإيرادات</p>
                    <p className="text-3xl font-bold text-primary mt-2">
                      {fmtMoney(incomingTotals.netEarnings)} <span className="text-lg font-normal">ج.م</span>
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                    <ArrowDownCircle className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>
              <Card className="bg-amber-500/5 border-amber-500/10">
                <CardContent className="p-6 flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">قيد المراجعة</p>
                    <p className="text-3xl font-bold text-amber-600 mt-2">
                      {fmtMoney(incomingTotals.pendingAmount)} <span className="text-lg font-normal">ج.م</span>
                    </p>
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
                    <Clock className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 flex justify-between items-start">
                  <div>
                    <p className="text-sm text-muted-foreground">حالة الاشتراك</p>
                    <p className={`text-xl font-bold mt-2 ${sub?.isActive ? "text-green-600" : "text-red-500"}`}>
                      {sub ? (sub.isActive ? "نشط ✓" : "منتهي") : "لا يوجد"}
                    </p>
                    {sub?.daysLeft != null && (
                      <p className="text-xs text-muted-foreground mt-1">{sub.daysLeft} يوم متبقي</p>
                    )}
                  </div>
                  <div className="w-10 h-10 rounded-xl bg-secondary flex items-center justify-center">
                    <Package className="w-5 h-5" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Subscription details */}
            {sub && (
              <Card>
                <CardHeader><CardTitle>تفاصيل الاشتراك الحالي</CardTitle></CardHeader>
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

            {/* Subscription billing history */}
            <Card>
              <CardHeader><CardTitle className="flex items-center gap-2"><Wallet className="h-5 w-5" /> سجل الفواتير</CardTitle></CardHeader>
              <CardContent>
                {!subInvoice ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <DollarSign className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">لا توجد فواتير بعد</p>
                    <p className="text-sm mt-1">ستظهر فواتير اشتراكاتك هنا</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right">
                      <thead className="text-xs text-muted-foreground bg-secondary/50 border-b border-border">
                        <tr>
                          <th className="px-4 py-3 font-medium">رقم الفاتورة</th>
                          <th className="px-4 py-3 font-medium">النوع</th>
                          <th className="px-4 py-3 font-medium">طريقة الدفع</th>
                          <th className="px-4 py-3 font-medium">تاريخ الدفع</th>
                          <th className="px-4 py-3 font-medium">المبلغ</th>
                          <th className="px-4 py-3 font-medium">الحالة</th>
                          <th className="px-4 py-3 font-medium"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {[subInvoice].map((row) => {
                          const cfg = STATUS_CFG[row.status] ?? STATUS_CFG.pending;
                          const Icon = cfg.icon;
                          return (
                            <tr key={row.id} className="border-b border-border/50 hover:bg-secondary/20">
                              <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.refId}</td>
                              <td className="px-4 py-3">
                                {row.kind === "subscription" ? "اشتراك في المنصة" : "معاملة"}
                              </td>
                              <td className="px-4 py-3"><GatewayBadge gateway={row.gateway} /></td>
                              <td className="px-4 py-3 text-xs text-muted-foreground">{fmtDate(row.paidAt ?? row.createdAt)}</td>
                              <td className="px-4 py-3 font-bold">{fmtMoney(row.amount)} ج.م</td>
                              <td className="px-4 py-3">
                                <Badge variant="outline" className={`${cfg.cls} gap-1 text-xs`}>
                                  <Icon className="h-3 w-3" />{cfg.label}
                                </Badge>
                              </td>
                              <td className="px-4 py-3">
                                <Button variant="ghost" size="sm" onClick={() => setSelectedRow(row)}>
                                  <DownloadCloud className="w-4 h-4 ml-1.5" /> إيصال
                                </Button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Incoming service-request payments */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowDownCircle className="h-5 w-5 text-emerald-600" />
                  مدفوعات واردة من العملاء
                </CardTitle>
              </CardHeader>
              <CardContent>
                {incomingLoading ? (
                  <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin" /></div>
                ) : incomingRows.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-20" />
                    <p className="font-medium">لا توجد مدفوعات واردة بعد</p>
                  </div>
                ) : (
                  <>
                    {/* Summary */}
                    <div className="grid grid-cols-3 gap-3 mb-4">
                      <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3 text-center">
                        <p className="text-xs text-muted-foreground">مقبول</p>
                        <p className="text-lg font-bold text-emerald-700">{fmtMoney(incomingTotals.paidAmount)} <span className="text-xs">ج.م</span></p>
                      </div>
                      <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-center">
                        <p className="text-xs text-muted-foreground">قيد المراجعة</p>
                        <p className="text-lg font-bold text-amber-700">{fmtMoney(incomingTotals.pendingAmount)} <span className="text-xs">ج.م</span></p>
                      </div>
                      <div className="rounded-lg bg-rose-50 border border-rose-200 p-3 text-center">
                        <p className="text-xs text-muted-foreground">مرفوض</p>
                        <p className="text-lg font-bold text-rose-700">{fmtMoney(incomingTotals.failedAmount)} <span className="text-xs">ج.م</span></p>
                      </div>
                    </div>
                    <div className="overflow-x-auto rounded-lg border border-border">
                      <table className="w-full text-sm text-right">
                        <thead className="bg-muted/40 text-xs text-muted-foreground">
                          <tr>
                            <th className="px-4 py-3 font-medium">رقم العملية</th>
                            <th className="px-4 py-3 font-medium">العميل</th>
                            <th className="px-4 py-3 font-medium">طريقة الدفع</th>
                            <th className="px-4 py-3 font-medium">المبلغ</th>
                            <th className="px-4 py-3 font-medium">العمولة</th>
                            <th className="px-4 py-3 font-medium">تاريخ الدفع</th>
                            <th className="px-4 py-3 font-medium">الحالة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {incomingRows.map((row) => {
                            const cfg = STATUS_CFG[row.status] ?? STATUS_CFG.pending;
                            const Icon = cfg.icon;
                            const net = parseFloat(String(row.amount)) - parseFloat(String(row.commissionAmount ?? "0"));
                            return (
                              <tr key={row.id} className="border-t border-border/50 hover:bg-muted/20">
                                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.refId}</td>
                                <td className="px-4 py-3">
                                  <p className="font-medium">{row.customerName ?? "—"}</p>
                                  {row.serviceTitle && <p className="text-xs text-muted-foreground">{row.serviceTitle}</p>}
                                </td>
                                <td className="px-4 py-3"><GatewayBadge gateway={row.gateway} /></td>
                                <td className="px-4 py-3">
                                  <p className="font-bold">{fmtMoney(row.amount)} <span className="text-xs font-normal text-muted-foreground">ج.م</span></p>
                                  <p className="text-xs text-emerald-600 font-medium">صافي: {fmtMoney(net)} ج.م</p>
                                </td>
                                <td className="px-4 py-3 text-xs text-rose-600">{fmtMoney(row.commissionAmount)} ج.م</td>
                                <td className="px-4 py-3 text-xs text-muted-foreground whitespace-nowrap">{fmtDate(row.paidAt ?? row.createdAt)}</td>
                                <td className="px-4 py-3">
                                  <Badge variant="outline" className={`${cfg.cls} gap-1 text-xs`}>
                                    <Icon className="h-3 w-3" />{cfg.label}
                                  </Badge>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <InvoiceModal row={selectedRow} open={!!selectedRow} onClose={() => setSelectedRow(null)} />
    </ProviderLayout>
  );
}
