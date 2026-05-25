import { useState } from "react";
import {
  DownloadCloud, CreditCard, DollarSign, Clock, X, Printer, Loader2,
  Package, Wallet, CheckCircle2, XCircle, ArrowDownCircle,
  Smartphone, Building2, Banknote, Wifi, AlertCircle, Receipt,
  ShoppingBag,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { api, type ProviderStats } from "@/lib/api";

const STATUS_CFG: Record<string, { label: string; cls: string; icon: React.ComponentType<{ className?: string }> }> = {
  paid:      { label: "مقبول ✓",       cls: "bg-emerald-100 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  pending:   { label: "قيد المراجعة", cls: "bg-amber-100 text-amber-700 border-amber-200",       icon: Clock },
  failed:    { label: "مرفوض",         cls: "bg-rose-100 text-rose-700 border-rose-200",          icon: XCircle },
  cancelled: { label: "ملغي",          cls: "bg-slate-100 text-slate-700 border-slate-200",       icon: AlertCircle },
};

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
                    <td className="px-4 py-3">{row.kind === "subscription" ? "اشتراك في المنصة" : "معاملة"}</td>
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

// ── Payment row component ───────────────────────────────────────────────────
function PaymentRow({ row, onClick }: { row: any; onClick: () => void }) {
  const cfg = STATUS_CFG[row.status] ?? STATUS_CFG.pending;
  const Icon = cfg.icon;
  return (
    <tr className="border-t hover:bg-secondary/30 transition-colors cursor-pointer" onClick={onClick}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-secondary flex items-center justify-center shrink-0">
            {row.kind === "subscription" ? <Package className="w-4 h-4 text-primary" /> : <Receipt className="w-4 h-4 text-blue-500" />}
          </div>
          <div>
            <p className="text-sm font-medium">{row.refId}</p>
            <p className="text-xs text-muted-foreground">{row.kind === "subscription" ? "اشتراك" : "معاملة"}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3 text-sm">{fmtDate(row.createdAt)}</td>
      <td className="px-4 py-3">
        <Badge variant="outline" className={`text-xs flex items-center gap-1 w-fit ${cfg.cls}`}>
          <Icon className="h-3 w-3" />
          {cfg.label}
        </Badge>
      </td>
      <td className="px-4 py-3"><GatewayBadge gateway={row.gateway ?? "manual"} /></td>
      <td className="px-4 py-3 text-sm font-bold text-left">{fmtMoney(row.amount)} ج.م</td>
    </tr>
  );
}

// ── Main ────────────────────────────────────────────────────────────────────
export default function PaymentsPage() {
  const { user } = useAuth();
  const isProvider = user?.role === "provider";
  const providerId = user?.providerId;
  const [selectedRow, setSelectedRow] = useState<InvoiceRow | null>(null);

  // Provider data
  const { data: stats, isLoading: statsLoading } = useQuery<ProviderStats>({
    queryKey: ["providerStats", providerId],
    queryFn: () => api.providers.stats(providerId!),
    enabled: isProvider && !!providerId,
    refetchInterval: 8000,
  });
  const { data: providerPayments, isLoading: providerLoading } = useQuery({
    queryKey: ["provider-payments", providerId],
    queryFn: () => api.payments.providerMyPayments(),
    enabled: isProvider && !!providerId,
    refetchInterval: 8000,
  });

  // User data
  const { data: userPayments, isLoading: userLoading } = useQuery({
    queryKey: ["user-payments", user?.id],
    queryFn: () => api.payments.myPayments(),
    enabled: !isProvider && !!user,
    refetchInterval: 8000,
  });

  const isLoading = isProvider ? providerLoading || statsLoading : userLoading;

  // Unify rows
  const rows: any[] = isProvider
    ? (providerPayments?.rows ?? [])
    : (userPayments?.rows ?? []);

  const totals = isProvider
    ? (providerPayments?.totals ?? { paid: 0, pending: 0, failed: 0, paidAmount: 0, pendingAmount: 0, failedAmount: 0, netEarnings: 0 })
    : (userPayments?.totals ?? { paid: 0, pending: 0, failed: 0, paidAmount: 0, pendingAmount: 0, failedAmount: 0 });

  const sub = stats?.subscription ?? null;

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6" dir="rtl">
        {/* Page header */}
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">المدفوعات</h1>
            <p className="text-sm text-gray-500 mt-1">
              {isProvider ? "سجل مدفوعاتك والإيرادات الواردة" : "سجل معاملاتك المالية"}
            </p>
          </div>
          <div className="text-left shrink-0">
            <p className="text-xs text-gray-400 mb-0.5">إجمالي المقبول</p>
            <p className="text-xl font-bold text-gray-900">{fmtMoney(totals.paidAmount)} <span className="text-sm font-normal text-gray-500">ج.م</span></p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <>
            {/* Stats row */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {isProvider && (
                <div className="bg-white rounded-xl border border-gray-100 p-5">
                  <div className="flex items-center gap-2 mb-2">
                    <ArrowDownCircle className="w-4 h-4 text-gray-400" />
                    <p className="text-xs text-gray-500 font-medium">صافي الإيرادات</p>
                  </div>
                  <p className="text-2xl font-bold text-gray-900">{fmtMoney((totals as any).netEarnings)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">جنيه مصري</p>
                </div>
              )}
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <CheckCircle2 className="w-4 h-4 text-gray-400" />
                  <p className="text-xs text-gray-500 font-medium">مقبول</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{fmtMoney(totals.paidAmount)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{totals.paid} معاملة</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Clock className="w-4 h-4 text-gray-400" />
                  <p className="text-xs text-gray-500 font-medium">قيد المراجعة</p>
                </div>
                <p className="text-2xl font-bold text-gray-900">{fmtMoney(totals.pendingAmount)}</p>
                <p className="text-xs text-gray-400 mt-0.5">{totals.pending} معاملة</p>
              </div>
            </div>

            {/* Subscription strip */}
            {isProvider && sub && (
              <div className="bg-white rounded-xl border border-gray-100 px-5 py-4 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Package className="w-4 h-4 text-gray-400" />
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{sub.packageNameAr ?? "باقة"}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {sub.isActive ? `${sub.daysLeft} يوم متبقٍ` : "منتهي الصلاحية"}
                    </p>
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${sub.isActive ? "bg-green-50 text-green-700" : "bg-red-50 text-red-600"}`}>
                  {sub.isActive ? "نشط" : "منتهي"}
                </span>
              </div>
            )}

            {/* Transactions table */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              <div className="px-5 py-4 flex flex-row items-center justify-between border-b border-gray-50">
                <div className="flex items-center gap-2">
                  <Wallet className="w-4 h-4 text-gray-400" />
                  <h3 className="text-sm font-semibold text-gray-900">سجل المعاملات</h3>
                </div>
                {rows.length > 0 && (
                  <Button variant="outline" size="sm" className="gap-2 rounded-xl" onClick={() => window.print()}>
                    <DownloadCloud className="w-4 h-4" />
                    تصدير
                  </Button>
                )}
              </div>
              {rows.length === 0 ? (
                <div className="py-16 text-center">
                  <ShoppingBag className="w-10 h-10 mx-auto text-gray-200 mb-3" />
                  <p className="text-sm text-gray-400">لا توجد معاملات بعد</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-right">
                    <thead>
                      <tr className="border-b border-gray-50">
                        <th className="px-5 py-3 text-xs font-medium text-gray-400">المعاملة</th>
                        <th className="px-5 py-3 text-xs font-medium text-gray-400">التاريخ</th>
                        <th className="px-5 py-3 text-xs font-medium text-gray-400">الحالة</th>
                        <th className="px-5 py-3 text-xs font-medium text-gray-400">طريقة الدفع</th>
                        <th className="px-5 py-3 text-xs font-medium text-gray-400 text-left">المبلغ</th>
                      </tr>
                    </thead>
                    <tbody>
                      {rows.map((row: any) => (
                        <PaymentRow
                          key={row.id}
                          row={row}
                          onClick={() => setSelectedRow({
                            id: String(row.id),
                            refId: row.refId ?? `#${row.id}`,
                            kind: row.kind ?? "service_request",
                            serviceTitle: row.serviceTitle ?? null,
                            amount: row.amount,
                            status: row.status,
                            gateway: row.gateway ?? "manual",
                            paidAt: row.paidAt ?? null,
                            createdAt: row.createdAt,
                          })}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}

        <InvoiceModal row={selectedRow} open={!!selectedRow} onClose={() => setSelectedRow(null)} />
      </div>
    </DashboardLayout>
  );
}
