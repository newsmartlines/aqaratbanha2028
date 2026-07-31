import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Zap, Star, Sparkles, Crown, TrendingUp, Clock, CheckCircle2,
  XCircle, Loader2, RefreshCw, ArrowUpRight, Package, Lock,
  ChevronRight, AlertTriangle, Rocket, Info, ShoppingCart,
  BadgeCheck, Flame, Diamond, Tag, X, CreditCard, Building,
  Wallet, ChevronDown, ChevronUp, Receipt,
} from "lucide-react";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PromotionTypeRow {
  id: number;
  key: string;
  nameAr: string;
  nameEn: string;
  descriptionAr: string | null;
  isEnabled: boolean;
  price: string;
  durationDays: number;
  boostScore: number;
  badgeText: string | null;
  badgeColor: string;
  badgeBgColor: string;
  maxSimultaneous: number;
  vatPercent: string;
  discountPercent: string;
  requiresApproval: boolean;
  priority: number;
  benefits: string | null;
}

interface PromotionPurchase {
  id: number;
  propertyId: number;
  status: "pending" | "active" | "expired" | "cancelled" | "rejected";
  paymentMethod: string;
  priceAtPurchase: string;
  totalAmount: string;
  durationDays: number;
  paymentReference: string | null;
  adminNote: string | null;
  approvedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
  propertyTitle: string | null;
  typeNameAr: string | null;
  typeKey: string | null;
  typeBadgeBgColor: string | null;
  typeBadgeColor: string | null;
}

interface UserProperty {
  id: number;
  title: string;
  status: string;
  featured: boolean;
  urgent: boolean;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmtExpiry(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const days = Math.max(0, Math.ceil((d.getTime() - Date.now()) / 86400_000));
  if (days === 0) return "ينتهي اليوم";
  return `${days} يوم متبقي`;
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
}

function parseBenefits(raw: string | null): string[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return raw.split(",").map(s => s.trim()).filter(Boolean); }
}

const TYPE_ICONS: Record<string, React.ElementType> = {
  bump_up: Zap,
  spotlight: Sparkles,
  featured_homepage: Star,
  featured_category: Tag,
  urgent_badge: Flame,
  premium_listing: Diamond,
};

const STATUS_META: Record<string, { label: string; cls: string }> = {
  pending:   { label: "في الانتظار", cls: "bg-amber-50 text-amber-700 border-amber-200" },
  active:    { label: "نشط", cls: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  expired:   { label: "منتهي", cls: "bg-slate-50 text-slate-500 border-slate-200" },
  cancelled: { label: "ملغي", cls: "bg-red-50 text-red-600 border-red-200" },
  rejected:  { label: "مرفوض", cls: "bg-red-50 text-red-600 border-red-200" },
};

const PAYMENT_METHODS = [
  { value: "manual_transfer", label: "تحويل بنكي يدوي", icon: Building, desc: "أرسل المبلغ وأضف رقم المرجع" },
  { value: "wallet", label: "المحفظة", icon: Wallet, desc: "قريباً" },
];

// ── Buy Modal ─────────────────────────────────────────────────────────────────

function BuyPromotionModal({
  property,
  promotionTypes,
  onClose,
  onSuccess,
}: {
  property: UserProperty;
  promotionTypes: PromotionTypeRow[];
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [step, setStep] = useState<"select" | "details" | "pay">("select");
  const [selected, setSelected] = useState<PromotionTypeRow | null>(null);
  const [paymentMethod, setPaymentMethod] = useState("manual_transfer");
  const [paymentReference, setPaymentReference] = useState("");
  const { toast } = useToast();

  const buyMutation = useMutation({
    mutationFn: () => api.fetchJson("/promotion-purchases", {
      method: "POST",
      body: JSON.stringify({
        propertyId: property.id,
        promotionTypeId: selected!.id,
        paymentMethod,
        paymentReference: paymentReference || undefined,
      }),
    }),
    onSuccess: (res: any) => {
      toast({ title: "✅ تم إرسال طلبك!", description: res.message });
      onSuccess();
      onClose();
    },
    onError: (e: any) => {
      const msg = e?.message || "حدث خطأ";
      toast({ title: "فشل إرسال الطلب", description: msg, variant: "destructive" });
    },
  });

  const totalAmt = selected
    ? (() => {
        const base = parseFloat(selected.price ?? "0");
        const disc = parseFloat(selected.discountPercent ?? "0");
        const vat = parseFloat(selected.vatPercent ?? "0");
        const discounted = base * (1 - disc / 100);
        return (discounted + discounted * (vat / 100)).toFixed(2);
      })()
    : "0";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" dir="rtl">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-slate-100 px-6 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-lg font-bold text-slate-800 flex items-center gap-2">
              <Rocket className="w-5 h-5 text-violet-600" />
              {step === "select" ? "اختر نوع الترقية" : step === "details" ? selected?.nameAr : "إتمام الدفع"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">العقار: {property.title}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          {/* Step 1: Select type */}
          {step === "select" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {promotionTypes.map(pt => {
                const Icon = TYPE_ICONS[pt.key] ?? Rocket;
                const benefits = parseBenefits(pt.benefits);
                const vatPct = parseFloat(pt.vatPercent ?? "0");
                const discPct = parseFloat(pt.discountPercent ?? "0");
                const base = parseFloat(pt.price ?? "0");
                const discounted = base * (1 - discPct / 100);
                const total = (discounted + discounted * (vatPct / 100)).toFixed(2);

                return (
                  <button
                    key={pt.id}
                    onClick={() => { setSelected(pt); setStep("details"); }}
                    className="text-right border-2 rounded-xl p-4 hover:border-violet-400 hover:shadow-md transition-all group"
                    style={{ borderColor: selected?.id === pt.id ? pt.badgeBgColor : undefined }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mt-0.5"
                        style={{ backgroundColor: pt.badgeBgColor + "22" }}>
                        <Icon className="w-5 h-5" style={{ color: pt.badgeBgColor }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-bold text-slate-800 text-sm">{pt.nameAr}</p>
                          {discPct > 0 && (
                            <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full font-semibold">
                              خصم {discPct}%
                            </span>
                          )}
                        </div>
                        {pt.descriptionAr && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{pt.descriptionAr}</p>}
                        <div className="flex items-center gap-3 mt-2">
                          <span className="text-lg font-black" style={{ color: pt.badgeBgColor }}>{total} ج.م</span>
                          <span className="text-xs text-slate-400">{pt.durationDays} يوم</span>
                        </div>
                        {benefits.slice(0, 2).map((b, i) => (
                          <p key={i} className="text-[10px] text-emerald-600 flex items-center gap-1 mt-1">
                            <CheckCircle2 className="w-3 h-3 shrink-0" /> {b}
                          </p>
                        ))}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Step 2: Details */}
          {step === "details" && selected && (
            <div className="space-y-5">
              {/* Type hero */}
              <div className="rounded-xl p-5 border-2" style={{ borderColor: selected.badgeBgColor + "44", backgroundColor: selected.badgeBgColor + "11" }}>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: selected.badgeBgColor }}>
                    {(() => { const Icon = TYPE_ICONS[selected.key] ?? Rocket; return <Icon className="w-6 h-6 text-white" />; })()}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-800">{selected.nameAr}</h3>
                    <p className="text-xs text-slate-500">{selected.nameEn}</p>
                  </div>
                  <div className="mr-auto text-right">
                    <p className="text-2xl font-black" style={{ color: selected.badgeBgColor }}>{totalAmt} ج.م</p>
                    <p className="text-xs text-slate-400">{selected.durationDays} يوم</p>
                  </div>
                </div>
                {selected.descriptionAr && <p className="text-sm text-slate-700">{selected.descriptionAr}</p>}
              </div>

              {/* Benefits */}
              {parseBenefits(selected.benefits).length > 0 && (
                <div>
                  <p className="text-xs font-bold text-slate-500 uppercase mb-2">المميزات</p>
                  <div className="space-y-2">
                    {parseBenefits(selected.benefits).map((b, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span className="text-sm text-slate-700">{b}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pricing breakdown */}
              <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex justify-between text-slate-600">
                  <span>السعر الأساسي</span>
                  <span>{parseFloat(selected.price).toFixed(2)} ج.م</span>
                </div>
                {parseFloat(selected.discountPercent) > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>خصم ({selected.discountPercent}%)</span>
                    <span>- {(parseFloat(selected.price) * parseFloat(selected.discountPercent) / 100).toFixed(2)} ج.م</span>
                  </div>
                )}
                {parseFloat(selected.vatPercent) > 0 && (
                  <div className="flex justify-between text-slate-500">
                    <span>ضريبة القيمة المضافة ({selected.vatPercent}%)</span>
                    <span>{(parseFloat(selected.price) * (1 - parseFloat(selected.discountPercent) / 100) * parseFloat(selected.vatPercent) / 100).toFixed(2)} ج.م</span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-slate-800 border-t pt-2">
                  <span>الإجمالي</span>
                  <span>{totalAmt} ج.م</span>
                </div>
              </div>

              {selected.requiresApproval && (
                <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                  <p>هذه الترقية تحتاج موافقة الإدارة قبل التفعيل. سيتم إعلامك فور المراجعة.</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("select")} className="flex-1">
                  العودة
                </Button>
                <Button onClick={() => setStep("pay")} className="flex-1 bg-violet-600 hover:bg-violet-700">
                  المتابعة للدفع <ArrowUpRight className="w-4 h-4 mr-2" />
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Payment */}
          {step === "pay" && selected && (
            <div className="space-y-5">
              {/* Summary */}
              <div className="bg-slate-50 rounded-xl p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: selected.badgeBgColor }}>
                  {(() => { const Icon = TYPE_ICONS[selected.key] ?? Rocket; return <Icon className="w-5 h-5 text-white" />; })()}
                </div>
                <div className="flex-1">
                  <p className="font-bold text-slate-800 text-sm">{selected.nameAr} — {selected.durationDays} يوم</p>
                  <p className="text-xs text-slate-500">{property.title}</p>
                </div>
                <p className="font-black text-slate-800">{totalAmt} ج.م</p>
              </div>

              {/* Payment method */}
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase mb-3">طريقة الدفع</p>
                <div className="space-y-2">
                  {PAYMENT_METHODS.map(pm => {
                    const Icon = pm.icon;
                    const isDisabled = pm.value === "wallet";
                    return (
                      <button
                        key={pm.value}
                        disabled={isDisabled}
                        onClick={() => setPaymentMethod(pm.value)}
                        className={`w-full text-right flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${
                          paymentMethod === pm.value ? "border-violet-400 bg-violet-50" : "border-slate-200 hover:border-slate-300"
                        } ${isDisabled ? "opacity-40 cursor-not-allowed" : ""}`}
                      >
                        <Icon className="w-5 h-5 text-slate-500 shrink-0" />
                        <div className="flex-1">
                          <p className="font-semibold text-sm text-slate-700">{pm.label}</p>
                          <p className="text-xs text-slate-400">{pm.desc}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border-2 shrink-0 ${paymentMethod === pm.value ? "border-violet-600 bg-violet-600" : "border-slate-300"}`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Bank transfer ref */}
              {paymentMethod === "manual_transfer" && (
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 block">رقم مرجع التحويل (اختياري)</label>
                  <input
                    value={paymentReference}
                    onChange={e => setPaymentReference(e.target.value)}
                    placeholder="مثال: TXN-123456789"
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-300"
                  />
                  <p className="text-xs text-slate-400">يمكنك إضافة الرقم لاحقاً عبر التواصل مع الدعم</p>
                </div>
              )}

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("details")} className="flex-1">
                  العودة
                </Button>
                <Button
                  onClick={() => buyMutation.mutate()}
                  disabled={buyMutation.isPending}
                  className="flex-1 bg-violet-600 hover:bg-violet-700"
                >
                  {buyMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin ml-2" /> : <CreditCard className="w-4 h-4 ml-2" />}
                  إرسال الطلب
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Purchase History Item ─────────────────────────────────────────────────────

function PurchaseItem({ purchase, onCancel }: { purchase: PromotionPurchase; onCancel: (id: number) => void }) {
  const [expanded, setExpanded] = useState(false);
  const sm = STATUS_META[purchase.status] ?? STATUS_META.pending;

  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
      <button
        className="w-full text-right flex items-center gap-3 p-4 hover:bg-slate-50 transition-colors"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ backgroundColor: (purchase.typeBadgeBgColor ?? "#6366f1") + "22" }}>
          {(() => { const Icon = TYPE_ICONS[purchase.typeKey ?? ""] ?? Rocket; return <Icon className="w-4 h-4" style={{ color: purchase.typeBadgeBgColor ?? "#6366f1" }} />; })()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm text-slate-800 truncate">{purchase.typeNameAr ?? "ترقية"}</p>
          <p className="text-xs text-slate-500 truncate">{purchase.propertyTitle ?? `عقار #${purchase.propertyId}`}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${sm.cls}`}>{sm.label}</span>
          <span className="text-sm font-bold text-slate-700">{parseFloat(purchase.totalAmount).toFixed(0)} ج.م</span>
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 pb-4 pt-0 border-t border-slate-100 space-y-2 text-sm">
          <div className="grid grid-cols-2 gap-2 mt-3">
            <div><p className="text-xs text-slate-400">المدة</p><p className="font-medium">{purchase.durationDays} يوم</p></div>
            <div><p className="text-xs text-slate-400">طريقة الدفع</p><p className="font-medium">{purchase.paymentMethod === "manual_transfer" ? "تحويل بنكي" : purchase.paymentMethod}</p></div>
            <div><p className="text-xs text-slate-400">تاريخ الطلب</p><p className="font-medium">{fmtDate(purchase.createdAt)}</p></div>
            {purchase.expiresAt && <div><p className="text-xs text-slate-400">تنتهي في</p><p className="font-medium">{fmtExpiry(purchase.expiresAt)}</p></div>}
            {purchase.approvedAt && <div><p className="text-xs text-slate-400">تاريخ الموافقة</p><p className="font-medium">{fmtDate(purchase.approvedAt)}</p></div>}
            {purchase.paymentReference && <div><p className="text-xs text-slate-400">مرجع الدفع</p><p className="font-medium font-mono text-xs">{purchase.paymentReference}</p></div>}
          </div>
          {purchase.adminNote && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs text-amber-800">
              <span className="font-bold">ملاحظة الإدارة:</span> {purchase.adminNote}
            </div>
          )}
          {purchase.status === "pending" && (
            <Button
              size="sm"
              variant="outline"
              className="text-red-600 border-red-200 hover:bg-red-50 h-7 px-3 text-xs mt-2"
              onClick={() => onCancel(purchase.id)}
            >
              إلغاء الطلب
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DashboardPromotions() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const userId = user?.id;
  const [promotingProperty, setPromotingProperty] = useState<UserProperty | null>(null);
  const [activeTab, setActiveTab] = useState<"marketplace" | "history">("marketplace");

  // Queries
  const { data: typesData, isLoading: typesLoading } = useQuery({
    queryKey: ["promotion-types"],
    queryFn: () => api.fetchJson("/promotion-types"),
  });

  const { data: purchasesData, isLoading: purchasesLoading, refetch: refetchPurchases } = useQuery({
    queryKey: ["promotion-purchases", userId],
    queryFn: () => api.fetchJson("/users/me/promotion-purchases"),
    enabled: !!userId,
  });

  const { data: myPropsData, isLoading: propsLoading } = useQuery({
    queryKey: ["user-properties", userId],
    queryFn: () => api.userProperties.list(),
    enabled: !!userId,
  });

  const cancelMutation = useMutation({
    mutationFn: (id: number) => api.fetchJson(`/users/me/promotion-purchases/${id}/cancel`, { method: "PATCH" }),
    onSuccess: () => {
      toast({ title: "تم إلغاء الطلب" });
      refetchPurchases();
    },
    onError: (e: any) => toast({ title: "فشل الإلغاء", description: e.message, variant: "destructive" }),
  });

  const promotionTypes: PromotionTypeRow[] = typesData ?? [];
  const purchases: PromotionPurchase[] = purchasesData ?? [];
  const myProps: UserProperty[] = ((myPropsData ?? []) as UserProperty[]).filter((p: any) => ["active", "approved"].includes(p.status));

  const pendingCount = purchases.filter(p => p.status === "pending").length;
  const activeCount = purchases.filter(p => p.status === "active").length;

  const isLoading = typesLoading || propsLoading;

  return (
    <DashboardLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6" dir="rtl">

        {/* Header */}
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <Rocket className="w-6 h-6 text-violet-600" />
              سوق الترقيات
            </h1>
            <p className="text-muted-foreground mt-1 text-sm">ارفع ظهور عقاراتك مع ترقيات مدفوعة مستقلة عن الباقة</p>
          </div>
          {(pendingCount > 0 || activeCount > 0) && (
            <div className="flex items-center gap-2">
              {pendingCount > 0 && (
                <Badge variant="outline" className="bg-amber-50 border-amber-200 text-amber-700">
                  {pendingCount} في الانتظار
                </Badge>
              )}
              {activeCount > 0 && (
                <Badge variant="outline" className="bg-emerald-50 border-emerald-200 text-emerald-700">
                  {activeCount} نشط
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-200 gap-1">
          {([
            { key: "marketplace", label: "سوق الترقيات", icon: ShoppingCart },
            { key: "history", label: `مشترياتي (${purchases.length})`, icon: Receipt },
          ] as const).map(tab => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-violet-600 text-violet-700"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-violet-600" />
          </div>
        ) : (
          <>
            {/* ── Marketplace Tab ───────────────────────────────────────────── */}
            {activeTab === "marketplace" && (
              <div className="space-y-6">

                {/* Promotion types grid */}
                {promotionTypes.length > 0 && (
                  <div>
                    <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <ShoppingCart className="w-4 h-4 text-violet-600" />
                      أنواع الترقيات المتاحة
                    </h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {promotionTypes.map(pt => {
                        const Icon = TYPE_ICONS[pt.key] ?? Rocket;
                        const benefits = parseBenefits(pt.benefits);
                        const base = parseFloat(pt.price ?? "0");
                        const disc = parseFloat(pt.discountPercent ?? "0");
                        const vat = parseFloat(pt.vatPercent ?? "0");
                        const discounted = base * (1 - disc / 100);
                        const total = (discounted + discounted * (vat / 100)).toFixed(2);
                        return (
                          <div key={pt.id} className="border border-slate-200 rounded-xl p-4 bg-white hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-2 mb-3">
                              <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ backgroundColor: pt.badgeBgColor }}>
                                <Icon className="w-4 h-4 text-white" />
                              </div>
                              <div className="flex-1">
                                <p className="font-bold text-sm text-slate-800">{pt.nameAr}</p>
                                <p className="text-xs text-slate-400">{pt.durationDays} يوم</p>
                              </div>
                              {disc > 0 && (
                                <span className="text-[10px] bg-red-50 text-red-600 border border-red-200 px-1.5 py-0.5 rounded-full">خصم {disc}%</span>
                              )}
                            </div>
                            {pt.descriptionAr && <p className="text-xs text-slate-500 mb-3 line-clamp-2">{pt.descriptionAr}</p>}
                            <div className="space-y-1 mb-3">
                              {benefits.slice(0, 3).map((b, i) => (
                                <div key={i} className="flex items-center gap-1.5">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                                  <span className="text-[11px] text-slate-600">{b}</span>
                                </div>
                              ))}
                            </div>
                            <div className="flex items-center justify-between mt-3 pt-3 border-t border-slate-100">
                              <span className="text-lg font-black" style={{ color: pt.badgeBgColor }}>{total} ج.م</span>
                              <Button
                                size="sm"
                                onClick={() => {
                                  if (!myProps.length) {
                                    toast({ title: "لا توجد عقارات مفعّلة", description: "يجب أن يكون لديك عقار معتمد لترويجه", variant: "destructive" });
                                    return;
                                  }
                                  setPromotingProperty(myProps[0]);
                                }}
                                className="h-8 px-3 text-xs"
                                style={{ backgroundColor: pt.badgeBgColor }}
                              >
                                <ShoppingCart className="w-3 h-3 ml-1" />
                                اشترِ
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* My properties with promote button */}
                {myProps.length > 0 && (
                  <div>
                    <h2 className="text-base font-bold text-slate-800 mb-4 flex items-center gap-2">
                      <Building className="w-4 h-4 text-slate-500" />
                      عقاراتي — روّج إعلانك
                    </h2>
                    <div className="space-y-3">
                      {myProps.slice(0, 10).map(prop => {
                        const activePurchases = purchases.filter(p => p.propertyId === prop.id && ["pending", "active"].includes(p.status));
                        return (
                          <div key={prop.id} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center justify-between gap-3 hover:shadow-sm transition-shadow">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                                <Package className="w-4 h-4 text-slate-500" />
                              </div>
                              <div className="min-w-0">
                                <p className="font-semibold text-slate-800 text-sm truncate">{prop.title}</p>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  {activePurchases.map(pp => (
                                    <span key={pp.id} className={`text-[10px] px-1.5 py-0.5 rounded-full border font-medium ${STATUS_META[pp.status]?.cls}`}>
                                      {pp.typeNameAr} — {STATUS_META[pp.status]?.label}
                                    </span>
                                  ))}
                                  {prop.featured && (
                                    <span className="text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">مميز</span>
                                  )}
                                </div>
                              </div>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => setPromotingProperty(prop)}
                              className="shrink-0 h-8 px-3 text-xs bg-violet-600 hover:bg-violet-700"
                            >
                              <Rocket className="w-3 h-3 ml-1" />
                              روّج إعلانك
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {myProps.length === 0 && (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center">
                    <Building className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-700 mb-1">لا توجد عقارات معتمدة</h3>
                    <p className="text-sm text-slate-500">يجب أن يكون لديك عقار معتمد لبدء ترويجه</p>
                    <Link href="/dashboard/properties">
                      <Button className="mt-4" size="sm">إضافة عقار</Button>
                    </Link>
                  </div>
                )}

                {/* How it works */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
                  <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                    <Info className="w-4 h-4 text-slate-400" />
                    كيف تعمل ترقيات Dalil؟
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {[
                      { step: "١", title: "اختر ترقية", desc: "اختر نوع الترقية المناسب لإعلانك وادفع المبلغ" },
                      { step: "٢", title: "مراجعة الإدارة", desc: "تراجع الإدارة طلبك وتوافق عليه خلال 24 ساعة" },
                      { step: "٣", title: "التفعيل التلقائي", desc: "تُفعَّل الترقية تلقائياً وتنتهي عند اكتمال المدة" },
                    ].map(s => (
                      <div key={s.step} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-violet-100 text-violet-700 font-bold text-sm flex items-center justify-center shrink-0">{s.step}</div>
                        <div>
                          <p className="font-semibold text-slate-700 text-sm">{s.title}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{s.desc}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Purchase History Tab ─────────────────────────────────────── */}
            {activeTab === "history" && (
              <div className="space-y-4">
                {purchasesLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-6 h-6 animate-spin text-violet-600" />
                  </div>
                ) : purchases.length === 0 ? (
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-10 text-center">
                    <Receipt className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-700 mb-1">لا توجد مشتريات</h3>
                    <p className="text-sm text-slate-500 mb-4">ابدأ بترويج عقاراتك الآن</p>
                    <Button size="sm" onClick={() => setActiveTab("marketplace")} className="bg-violet-600 hover:bg-violet-700">
                      استعرض الترقيات
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* Summary */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {(["pending", "active", "expired", "rejected"] as const).map(st => {
                        const count = purchases.filter(p => p.status === st).length;
                        const meta = STATUS_META[st];
                        return (
                          <div key={st} className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                            <p className="text-2xl font-black text-slate-800">{count}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${meta.cls}`}>{meta.label}</span>
                          </div>
                        );
                      })}
                    </div>

                    {purchases.map(p => (
                      <PurchaseItem
                        key={p.id}
                        purchase={p}
                        onCancel={id => cancelMutation.mutate(id)}
                      />
                    ))}
                  </>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Buy Modal */}
      {promotingProperty && promotionTypes.length > 0 && (
        <BuyPromotionModal
          property={promotingProperty}
          promotionTypes={promotionTypes}
          onClose={() => setPromotingProperty(null)}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ["promotion-purchases", userId] });
            setActiveTab("history");
          }}
        />
      )}
    </DashboardLayout>
  );
}
