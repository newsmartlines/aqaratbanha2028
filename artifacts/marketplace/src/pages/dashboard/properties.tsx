import { useState } from "react";
import { useLocation } from "wouter";
import {
  Plus, Loader2, RefreshCw, Trash2, Edit3, Eye, Building2,
  Phone, Heart, MessageSquare, AlertTriangle, CheckCircle2,
  Clock, XCircle, BarChart2, Search, Filter, MapPin, Maximize2, Star,
  LayoutList, LayoutGrid, BedDouble, Rocket, X, CheckCheck, CreditCard,
  Wallet, Landmark, TrendingUp, ChevronRight,
} from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { api, mediaUrl } from "@/lib/api";
import toast from "react-hot-toast";
import DashboardLayout from "@/components/DashboardLayout";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

/* ─── TYPES ──────────────────────────────────────────────────── */
interface PromotionType {
  id: number;
  key: string;
  nameAr: string;
  descriptionAr?: string;
  price: string;
  durationDays: number;
  boostScore: number;
  badgeText?: string;
  badgeColor?: string;
  badgeBgColor?: string;
  vatPercent?: string;
  discountPercent?: string;
  benefits?: string;
}

/* ─── PROMOTE MODAL ──────────────────────────────────────────── */
function PromoteModal({ property, onClose }: { property: Property; onClose: () => void }) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<1 | 2>(1);
  const [selected, setSelected] = useState<PromotionType | null>(null);
  const [payMethod, setPayMethod] = useState<"cash" | "card" | "bank">("cash");

  const { data: typesData, isLoading: typesLoading } = useQuery({
    queryKey: ["promotion-types"],
    queryFn: () => api.fetchJson<{ data: PromotionType[] }>("/promotion-types"),
    staleTime: 60_000,
  });
  const types: PromotionType[] = (typesData as any)?.data ?? [];

  const purchaseMutation = useMutation({
    mutationFn: () => api.fetchJson("/promotion-purchases", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        propertyId: property.id,
        promotionTypeId: selected!.id,
        paymentMethod: payMethod,
      }),
    }),
    onSuccess: () => {
      toast.success("✅ تم إرسال طلب الترقية — في انتظار مراجعة الإدارة");
      queryClient.invalidateQueries({ queryKey: ["user-properties-cards"] });
      queryClient.invalidateQueries({ queryKey: ["user-properties"] });
      onClose();
    },
    onError: (e: any) => toast.error(e?.message ?? "فشل الطلب، حاول مرة أخرى"),
  });

  const price    = selected ? parseFloat(selected.price) : 0;
  const vat      = selected ? parseFloat(selected.vatPercent ?? "0") : 0;
  const discount = selected ? parseFloat(selected.discountPercent ?? "0") : 0;
  const discAmt  = price * (discount / 100);
  const vatAmt   = (price - discAmt) * (vat / 100);
  const total    = price - discAmt + vatAmt;

  const parseBenefits = (b?: string): string[] => {
    if (!b) return [];
    try { return JSON.parse(b); } catch { return []; }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="bg-white dark:bg-card rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl" dir="rtl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 bg-white dark:bg-card border-b border-border px-5 py-4 flex items-center justify-between rounded-t-2xl z-10">
          <div>
            <h2 className="text-base font-bold flex items-center gap-2">
              <Rocket className="w-4 h-4 text-teal-600" />
              {step === 1 ? "اختر نوع الترقية" : "تأكيد الطلب"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 truncate max-w-xs">{property.title}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">

          {step === 1 && (
            <>
              {typesLoading && (
                <div className="flex items-center justify-center py-10">
                  <Loader2 className="w-6 h-6 animate-spin text-teal-600" />
                </div>
              )}
              {!typesLoading && types.length === 0 && (
                <div className="text-center py-10 text-muted-foreground text-sm">لا توجد أنواع ترقية متاحة حالياً</div>
              )}
              {types.map(t => {
                const benefits = parseBenefits(t.benefits);
                const isSelected = selected?.id === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => setSelected(t)}
                    className={`w-full text-right rounded-2xl border-2 p-4 transition-all duration-200 ${
                      isSelected
                        ? "border-teal-500 bg-teal-50"
                        : "border-border hover:border-teal-300 hover:bg-gray-50"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-sm text-foreground">{t.nameAr}</span>
                          {t.badgeText && (
                            <span
                              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                              style={{ background: t.badgeBgColor ?? "#e0f2fe", color: t.badgeColor ?? "#0369a1" }}
                            >
                              {t.badgeText}
                            </span>
                          )}
                        </div>
                        {t.descriptionAr && <p className="text-xs text-muted-foreground mb-2">{t.descriptionAr}</p>}
                        {benefits.length > 0 && (
                          <ul className="space-y-0.5">
                            {benefits.map((b, i) => (
                              <li key={i} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <CheckCheck className="w-3 h-3 text-teal-500 shrink-0" />
                                {b}
                              </li>
                            ))}
                          </ul>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">المدة: {t.durationDays} يوم</p>
                      </div>
                      <div className="text-left shrink-0">
                        <span className="text-lg font-black text-teal-700">{parseFloat(t.price).toLocaleString("ar-EG")}</span>
                        <span className="text-xs text-muted-foreground"> ج.م</span>
                      </div>
                    </div>
                  </button>
                );
              })}

              {selected && (
                <button
                  onClick={() => setStep(2)}
                  className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  متابعة <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </>
          )}

          {step === 2 && selected && (
            <>
              {/* Summary */}
              <div className="rounded-xl bg-gray-50 border border-border p-4 space-y-2">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">ملخص الطلب</p>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">نوع الترقية</span>
                  <span className="font-bold">{selected.nameAr}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">السعر الأساسي</span>
                  <span>{price.toLocaleString("ar-EG")} ج.م</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-sm text-emerald-600">
                    <span>خصم {discount}%</span>
                    <span>- {discAmt.toLocaleString("ar-EG")} ج.م</span>
                  </div>
                )}
                {vat > 0 && (
                  <div className="flex justify-between text-sm text-muted-foreground">
                    <span>ضريبة {vat}%</span>
                    <span>+ {vatAmt.toFixed(2)} ج.م</span>
                  </div>
                )}
                <div className="pt-2 border-t border-border flex justify-between font-black text-base">
                  <span>الإجمالي</span>
                  <span className="text-teal-700">{total.toFixed(2)} ج.م</span>
                </div>
              </div>

              {/* Payment method */}
              <div>
                <p className="text-sm font-bold mb-2">طريقة الدفع</p>
                <div className="grid grid-cols-3 gap-2">
                  {([
                    { key: "cash", label: "كاش", Icon: Wallet },
                    { key: "card", label: "بطاقة", Icon: CreditCard },
                    { key: "bank", label: "تحويل", Icon: Landmark },
                  ] as const).map(({ key, label, Icon }) => (
                    <button
                      key={key}
                      onClick={() => setPayMethod(key)}
                      className={`flex flex-col items-center gap-1 py-3 rounded-xl border-2 text-xs font-semibold transition-all ${
                        payMethod === key
                          ? "border-teal-500 bg-teal-50 text-teal-700"
                          : "border-border text-muted-foreground hover:border-teal-200"
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 border border-border rounded-xl py-2.5 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  رجوع
                </button>
                <button
                  onClick={() => purchaseMutation.mutate()}
                  disabled={purchaseMutation.isPending}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors"
                >
                  {purchaseMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Rocket className="w-4 h-4" /> تأكيد الطلب</>}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── PROPERTY TYPE ──────────────────────────────────────────── */
interface Property {
  id: number;
  title: string;
  mainCategory?: string;
  listingType?: string;
  price?: string | number;
  area?: string | number;
  city?: string;
  district?: string;
  address?: string;
  status: string;
  rejectionReason?: string;
  featured?: boolean;
  viewCount?: number;
  phoneClickCount?: number;
  whatsappClickCount?: number;
  favoritesCount?: number;
  messageCount?: number;
  images?: string | string[];
  createdAt?: string;
  updatedAt?: string;
  expiresAt?: string;
  rooms?: number;
  bathrooms?: number;
}

type ViewMode = "list" | "grid";

const STATUS_MAP: Record<string, {
  label: string;
  badgeCls: string;
  borderCls: string;
  dot: string;
  icon: React.ReactNode;
}> = {
  approved: {
    label: "منشور",
    badgeCls: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    borderCls: "border-l-4 border-l-emerald-500 border-border",
    dot: "bg-emerald-500",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  active: {
    label: "منشور",
    badgeCls: "bg-emerald-100 text-emerald-700 border border-emerald-200",
    borderCls: "border-l-4 border-l-emerald-500 border-border",
    dot: "bg-emerald-500",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  pending: {
    label: "قيد المراجعة",
    badgeCls: "bg-amber-100 text-amber-700 border border-amber-200",
    borderCls: "border-l-4 border-l-amber-400 border-border",
    dot: "bg-amber-400",
    icon: <Clock className="w-3 h-3" />,
  },
  updated_after_rejection: {
    label: "أُعيد إرساله",
    badgeCls: "bg-violet-100 text-violet-700 border border-violet-200",
    borderCls: "border-l-4 border-l-violet-400 border-border",
    dot: "bg-violet-400",
    icon: <Clock className="w-3 h-3" />,
  },
  rejected: {
    label: "مرفوض",
    badgeCls: "bg-red-100 text-red-700 border border-red-200",
    borderCls: "border-l-4 border-l-red-500 border-border",
    dot: "bg-red-500",
    icon: <XCircle className="w-3 h-3" />,
  },
  expired: {
    label: "انتهت الصلاحية",
    badgeCls: "bg-gray-100 text-gray-500 border border-gray-200",
    borderCls: "border-l-4 border-l-gray-300 border-border",
    dot: "bg-gray-400",
    icon: <AlertTriangle className="w-3 h-3" />,
  },
  draft: {
    label: "مسودة",
    badgeCls: "bg-gray-100 text-gray-500 border border-gray-200",
    borderCls: "border-l-4 border-l-gray-300 border-border",
    dot: "bg-gray-300",
    icon: <Edit3 className="w-3 h-3" />,
  },
};

const LISTING_LABELS: Record<string, string> = {
  sale: "للبيع", rent: "للإيجار", investment: "للاستثمار",
};

const LISTING_COLORS: Record<string, string> = {
  sale: "bg-blue-600", rent: "bg-teal-600", investment: "bg-purple-600",
};

function fmtAdNumber(id: number, createdAt?: string): string {
  const year = createdAt ? new Date(createdAt).getFullYear() : new Date().getFullYear();
  return `AD-${year}${String(id).padStart(6, "0")}`;
}

function getFirstImage(images: string | string[] | undefined): string | null {
  if (!images) return null;
  if (Array.isArray(images)) return images[0] ?? null;
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? (parsed[0] ?? null) : null;
  } catch { return null; }
}

function fmtCreatedAt(createdAt?: string): string | null {
  if (!createdAt) return null;
  return new Date(createdAt).toLocaleDateString("en-US", {
    year: "numeric", month: "long", day: "numeric",
  });
}

function fmtExpiry(expiresAt?: string): string | null {
  if (!expiresAt) return null;
  const diffMs = new Date(expiresAt).getTime() - Date.now();
  if (diffMs <= 0) return null;
  const totalHours = Math.floor(diffMs / 3_600_000);
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days > 0 && hours > 0) return `${days} أيام, ${hours} ساعات`;
  if (days > 0) return `${days} أيام`;
  return `${hours} ساعات`;
}

function fmtPrice(price: string | number | undefined): string | null {
  if (price == null || price === "") return null;
  const n = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(n) || n === 0) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)} م ج.م`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} ألف ج.م`;
  return `${n.toLocaleString("en-US")} ج.م`;
}

function StatPill({ icon, value, label }: { icon: React.ReactNode; value: number | undefined; label: string }) {
  return (
    <div className="flex flex-col items-center gap-0.5" title={label}>
      <span className="flex items-center gap-1">{icon}<span className="text-sm font-bold text-foreground tabular-nums">{(value ?? 0).toLocaleString("ar-EG")}</span></span>
      <span className="text-[10px] text-muted-foreground">{label}</span>
    </div>
  );
}

/* ─── ACTION BUTTON COMPONENTS ───────────────────────────────── */
function PrimaryBtn({ icon, label, onClick, disabled, className = "" }: {
  icon: React.ReactNode; label: string; onClick?: () => void;
  disabled?: boolean; className?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${className}`}
    >
      {icon}{label}
    </button>
  );
}

function SecondaryBtn({ icon, label, onClick, href, className = "" }: {
  icon: React.ReactNode; label: string; onClick?: () => void;
  href?: string; className?: string;
}) {
  const base = `flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 hover:text-gray-900 hover:border-gray-300 transition-all duration-200 ${className}`;
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={base}>{icon}{label}</a>;
  return <button onClick={onClick} className={base}>{icon}{label}</button>;
}

function DangerIconBtn({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title="حذف الإعلان"
      className="flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 bg-white text-gray-400 hover:text-red-500 hover:border-red-200 hover:bg-red-50 transition-all duration-200"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}

/* ─── LIST CARD ─────────────────────────────────────────────── */
function ListCard({ prop, onEdit, onDelete, onRenew, isRenewing, onPromote }: {
  prop: Property; onEdit: (id: number) => void; onDelete: (id: number, title: string) => void;
  onRenew?: (id: number) => void; isRenewing?: boolean; onPromote?: (p: Property) => void;
}) {
  const imgSrc = getFirstImage(prop.images);
  const st = STATUS_MAP[prop.status] ?? STATUS_MAP.pending;
  const loc = [prop.district, prop.city].filter(Boolean).join("، ");
  const price = fmtPrice(prop.price);
  const totalCalls = (prop.phoneClickCount ?? 0) + (prop.whatsappClickCount ?? 0);
  const canPromote = prop.status === "approved" || prop.status === "active";

  return (
    <div className={`bg-white dark:bg-card rounded-2xl border overflow-hidden flex flex-row group shadow-sm hover:shadow-md transition-all duration-300 ${st.borderCls}`}
         style={{ borderColor: undefined }}>

      {/* Image */}
      <div className="relative w-36 sm:w-44 md:w-48 shrink-0 overflow-hidden">
        {imgSrc ? (
          <img
            src={mediaUrl(imgSrc)}
            alt={prop.title}
            className="w-full h-full object-cover group-hover:scale-[1.03] transition-transform duration-500"
            loading="lazy"
            onError={e => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 text-gray-300 gap-2">
            <Building2 className="w-8 h-8" />
          </div>
        )}
        {/* Listing type badge */}
        {prop.listingType && (
          <span className={`absolute top-2 right-2 text-[10px] font-bold ${LISTING_COLORS[prop.listingType] ?? "bg-teal-600"} text-white px-2 py-0.5 rounded-md shadow-sm`}>
            {LISTING_LABELS[prop.listingType] ?? prop.listingType}
          </span>
        )}
        {/* Featured */}
        {prop.featured && (
          <span className="absolute bottom-2 right-2 text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm">
            <Star className="w-2.5 h-2.5 fill-current" /> مميز
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col gap-2.5 min-w-0">

        {/* Top: ad number + status */}
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-mono font-semibold text-muted-foreground bg-gray-50 border border-gray-200 rounded-lg px-2 py-0.5">
            {fmtAdNumber(prop.id, prop.createdAt)}
          </span>
          <span className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full shrink-0 ${st.badgeCls}`}>
            {st.icon} {st.label}
          </span>
        </div>

        {/* Title */}
        <h3 className="text-foreground font-bold text-sm leading-snug line-clamp-1">{prop.title}</h3>

        {/* Added + expiry */}
        {(prop.createdAt || prop.expiresAt) && (
          <div className="flex items-center gap-3 flex-wrap text-xs">
            {prop.createdAt && (
              <span className="text-muted-foreground">
                أضيف: <span className="text-teal-600 font-semibold">{fmtCreatedAt(prop.createdAt)}</span>
              </span>
            )}
            {prop.expiresAt && fmtExpiry(prop.expiresAt) && (
              <span className="text-muted-foreground">
                تنتهي صلاحيتها: <span className="text-teal-600 font-semibold">{fmtExpiry(prop.expiresAt)}</span>
              </span>
            )}
          </div>
        )}

        {/* Location + specs row */}
        <div className="flex items-center gap-3 flex-wrap">
          {loc && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="w-3 h-3 text-teal-500 shrink-0" />{loc}
            </span>
          )}
          {prop.area && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <Maximize2 className="w-3 h-3" /> {prop.area} م²
            </span>
          )}
          {prop.rooms != null && Number(prop.rooms) > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-muted-foreground">
              <BedDouble className="w-3 h-3" /> {prop.rooms} غرف
            </span>
          )}
          {price && <span className="text-teal-700 font-bold text-sm ms-auto">{price}</span>}
        </div>

        {/* Status-specific banners */}
        {prop.status === "rejected" && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-xs font-bold text-red-600 flex items-center gap-1 mb-0.5">
              <AlertTriangle className="w-3 h-3" /> سبب الرفض
            </p>
            <p className="text-xs text-red-500 line-clamp-1">
              {prop.rejectionReason || "لا يتوافق مع شروط النشر."}
            </p>
          </div>
        )}
        {prop.status === "updated_after_rejection" && (
          <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2">
            <p className="text-xs font-semibold text-violet-700 flex items-center gap-1">
              <Clock className="w-3 h-3" /> أُعيد إرساله — في انتظار المراجعة
            </p>
          </div>
        )}
        {prop.status === "expired" && (
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-3 py-2 flex items-center justify-between gap-2">
            <p className="text-xs font-semibold text-orange-700 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> انتهت صلاحية الإعلان
            </p>
            <button
              onClick={() => onRenew?.(prop.id)}
              disabled={isRenewing}
              className="flex items-center gap-1 text-xs font-bold bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white px-2.5 py-1 rounded-lg transition-colors shrink-0"
            >
              <RefreshCw className={`w-3 h-3 ${isRenewing ? "animate-spin" : ""}`} /> تجديد
            </button>
          </div>
        )}

        <div className="flex-1" />

        {/* Bottom: stats + actions */}
        <div className="flex items-center gap-2 pt-2 border-t border-gray-100 flex-wrap">

          {/* Stats */}
          <div className="flex items-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1 text-xs" title="مشاهدات">
              <Eye className="w-3.5 h-3.5 text-blue-400" />
              <span className="font-semibold text-foreground">{(prop.viewCount ?? 0).toLocaleString("ar-EG")}</span>
            </span>
            <span className="flex items-center gap-1 text-xs" title="اتصالات">
              <Phone className="w-3.5 h-3.5 text-emerald-400" />
              <span className="font-semibold text-foreground">{totalCalls.toLocaleString("ar-EG")}</span>
            </span>
            <span className="flex items-center gap-1 text-xs" title="مفضلة">
              <Heart className="w-3.5 h-3.5 text-pink-400" />
              <span className="font-semibold text-foreground">{(prop.favoritesCount ?? 0).toLocaleString("ar-EG")}</span>
            </span>
          </div>

          <div className="flex-1" />

          {/* Actions */}
          <div className="flex items-center gap-1.5">
            {canPromote && onPromote && (
              <button
                onClick={() => onPromote(prop)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600 shadow-sm hover:shadow-md transition-all duration-200"
              >
                <Rocket className="w-3.5 h-3.5" /> روّج
              </button>
            )}
            {prop.status === "rejected" && (
              <button
                onClick={() => onEdit(prop.id)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" /> تعديل وإعادة التقديم
              </button>
            )}
            <SecondaryBtn
              icon={<Eye className="w-3.5 h-3.5" />}
              label="عرض"
              href={`/property/${prop.id}`}
            />
            <SecondaryBtn
              icon={<Edit3 className="w-3.5 h-3.5" />}
              label="تعديل"
              onClick={() => onEdit(prop.id)}
            />
            <DangerIconBtn onClick={() => onDelete(prop.id, prop.title)} />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── GRID CARD ─────────────────────────────────────────────── */
function GridCard({ prop, onEdit, onDelete, onRenew, isRenewing, onPromote }: {
  prop: Property; onEdit: (id: number) => void; onDelete: (id: number, title: string) => void;
  onRenew?: (id: number) => void; isRenewing?: boolean; onPromote?: (p: Property) => void;
}) {
  const imgSrc = getFirstImage(prop.images);
  const st = STATUS_MAP[prop.status] ?? STATUS_MAP.pending;
  const loc = [prop.district, prop.city].filter(Boolean).join("، ");
  const price = fmtPrice(prop.price);
  const totalCalls = (prop.phoneClickCount ?? 0) + (prop.whatsappClickCount ?? 0);
  const canPromote = prop.status === "approved" || prop.status === "active";

  return (
    <div className={`bg-white dark:bg-card rounded-2xl border overflow-hidden flex flex-col group shadow-sm hover:shadow-lg transition-all duration-300 ${st.borderCls}`}>

      {/* Image */}
      <div className="relative aspect-[4/3] bg-gray-100 overflow-hidden shrink-0">
        {imgSrc ? (
          <img
            src={mediaUrl(imgSrc)}
            alt={prop.title}
            className="w-full h-full object-cover group-hover:scale-[1.04] transition-transform duration-500"
            loading="lazy"
            onError={e => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 text-gray-300">
            <Building2 className="w-12 h-12" />
          </div>
        )}

        {/* Top badges */}
        <div className="absolute top-2.5 right-2.5 flex flex-col gap-1.5">
          {prop.listingType && (
            <span className={`text-[10px] font-bold ${LISTING_COLORS[prop.listingType] ?? "bg-teal-600"} text-white px-2 py-0.5 rounded-md shadow-sm`}>
              {LISTING_LABELS[prop.listingType] ?? prop.listingType}
            </span>
          )}
          {prop.featured && (
            <span className="text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-md flex items-center gap-0.5 shadow-sm">
              <Star className="w-2.5 h-2.5 fill-current" /> مميز
            </span>
          )}
        </div>

        {/* Status badge bottom */}
        <div className="absolute bottom-2.5 inset-x-2.5 flex justify-between items-end">
          <span className={`flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full ${st.badgeCls}`}>
            {st.icon} {st.label}
          </span>
          {price && (
            <span className="text-xs font-black text-white bg-black/60 backdrop-blur-sm px-2.5 py-1 rounded-full">
              {price}
            </span>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-2.5 flex-1">

        {/* Ad number */}
        <span className="text-[11px] font-mono font-semibold text-muted-foreground w-fit">
          {fmtAdNumber(prop.id, prop.createdAt)}
        </span>

        {/* Title */}
        <h3 className="text-foreground font-bold text-sm leading-snug line-clamp-2">{prop.title}</h3>

        {/* Location + specs */}
        {loc && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="w-3 h-3 text-teal-500 shrink-0" />
            <span className="truncate">{loc}</span>
          </div>
        )}
        <div className="flex items-center gap-3 flex-wrap text-xs text-muted-foreground">
          {prop.area && <span className="flex items-center gap-0.5"><Maximize2 className="w-3 h-3" /> {prop.area} م²</span>}
          {prop.rooms != null && Number(prop.rooms) > 0 && <span className="flex items-center gap-0.5"><BedDouble className="w-3 h-3" /> {prop.rooms} غرف</span>}
        </div>

        {/* Status banners */}
        {prop.status === "rejected" && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-3 py-2">
            <p className="text-xs font-bold text-red-600 flex items-center gap-1 mb-0.5">
              <AlertTriangle className="w-3 h-3" /> سبب الرفض
            </p>
            <p className="text-xs text-red-500 line-clamp-2">
              {prop.rejectionReason || "لا يتوافق مع شروط النشر."}
            </p>
          </div>
        )}
        {prop.status === "updated_after_rejection" && (
          <div className="rounded-xl border border-violet-200 bg-violet-50 px-3 py-2">
            <p className="text-xs font-semibold text-violet-700 flex items-center gap-1">
              <Clock className="w-3 h-3" /> أُعيد إرساله — في انتظار المراجعة
            </p>
          </div>
        )}
        {prop.status === "expired" && (
          <button
            onClick={() => onRenew?.(prop.id)}
            disabled={isRenewing}
            className="w-full flex items-center justify-center gap-1.5 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white text-xs font-bold py-2 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRenewing ? "animate-spin" : ""}`} /> تجديد الإعلان (30 يوم)
          </button>
        )}

        {/* Stats row */}
        <div className="flex items-center gap-3 pt-2 border-t border-gray-100">
          <span className="flex items-center gap-1 text-xs text-muted-foreground" title="مشاهدات">
            <Eye className="w-3.5 h-3.5 text-blue-400" />
            <span className="font-semibold text-foreground">{(prop.viewCount ?? 0).toLocaleString("ar-EG")}</span>
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground" title="اتصالات">
            <Phone className="w-3.5 h-3.5 text-emerald-400" />
            <span className="font-semibold text-foreground">{totalCalls.toLocaleString("ar-EG")}</span>
          </span>
          <span className="flex items-center gap-1 text-xs text-muted-foreground" title="مفضلة">
            <Heart className="w-3.5 h-3.5 text-pink-400" />
            <span className="font-semibold text-foreground">{(prop.favoritesCount ?? 0).toLocaleString("ar-EG")}</span>
          </span>
        </div>

        <div className="flex-1" />

        {/* Action buttons */}
        <div className="flex flex-col gap-2 pt-1">
          {canPromote && onPromote && (
            <button
              onClick={() => onPromote(prop)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-gradient-to-l from-teal-600 to-emerald-500 hover:from-teal-700 hover:to-emerald-600 shadow-sm hover:shadow-md transition-all duration-200"
            >
              <Rocket className="w-4 h-4" /> روّج إعلانك
            </button>
          )}
          {prop.status === "rejected" && (
            <button
              onClick={() => onEdit(prop.id)}
              className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold text-white bg-red-600 hover:bg-red-700 transition-colors"
            >
              <Edit3 className="w-4 h-4" /> تعديل وإعادة التقديم
            </button>
          )}
          <div className="grid grid-cols-2 gap-1.5">
            <a
              href={`/property/${prop.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 hover:border-gray-300 transition-all duration-200"
            >
              <Eye className="w-3.5 h-3.5" /> عرض
            </a>
            <button
              onClick={() => onEdit(prop.id)}
              className="flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium border border-gray-200 bg-white hover:bg-gray-50 text-gray-700 hover:border-gray-300 transition-all duration-200"
            >
              <Edit3 className="w-3.5 h-3.5" /> تعديل
            </button>
          </div>
          <button
            onClick={() => onDelete(prop.id, prop.title)}
            className="w-full flex items-center justify-center gap-1.5 py-1.5 rounded-xl text-xs font-medium text-gray-400 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-100 transition-all duration-200"
          >
            <Trash2 className="w-3.5 h-3.5" /> حذف الإعلان
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── STAT SUMMARY CARD ─────────────────────────────────────── */
function StatCard({ icon, label, value, colorClass }: {
  icon: React.ReactNode; label: string; value: number; colorClass: string;
}) {
  return (
    <div className={`rounded-2xl border p-4 ${colorClass}`}>
      <div className="flex items-center gap-2 mb-1.5">{icon}<span className="text-xs font-medium text-muted-foreground">{label}</span></div>
      <span className="text-2xl font-black text-gray-900 tabular-nums">{value.toLocaleString("ar-EG")}</span>
    </div>
  );
}

/* ─── MAIN PAGE ─────────────────────────────────────────────── */
export default function MyPropertiesPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
  const [promotingProperty, setPromotingProperty] = useState<Property | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [viewMode, setViewMode] = useState<ViewMode>("list");

  const { data: rawData, isLoading, refetch, isFetching } = useQuery({
    queryKey: ["user-properties-cards"],
    queryFn: async () => {
      const r = await api.userProperties.list();
      return Array.isArray(r) ? r : (r as any)?.data ?? [];
    },
    enabled: !!user,
  });

  const properties: Property[] = Array.isArray(rawData) ? rawData : [];

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.properties.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-properties-cards"] });
      queryClient.invalidateQueries({ queryKey: ["user-properties"] });
      toast.success("تم حذف الإعلان");
      setDeleteTarget(null);
    },
    onError: () => toast.error("فشل الحذف"),
  });

  const renewMutation = useMutation({
    mutationFn: (id: number) => api.properties.renew(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-properties-cards"] });
      queryClient.invalidateQueries({ queryKey: ["user-properties"] });
      toast.success("✅ تم تجديد الإعلان بنجاح — سيظهر في نتائج البحث مجدداً");
    },
    onError: () => toast.error("فشل تجديد الإعلان"),
  });

  const filtered = properties.filter((p) => {
    const matchQ  = !searchQ || p.title.toLowerCase().includes(searchQ.toLowerCase());
    const matchSt = filterStatus === "all" || p.status === filterStatus;
    const matchTy = filterType  === "all" || p.listingType === filterType;
    return matchQ && matchSt && matchTy;
  });

  const approved   = properties.filter(p => p.status === "approved" || p.status === "active").length;
  const pending    = properties.filter(p => p.status === "pending" || p.status === "updated_after_rejection").length;
  const rejected   = properties.filter(p => p.status === "rejected").length;
  const expired    = properties.filter(p => p.status === "expired").length;
  const totalViews = properties.reduce((s, p) => s + (p.viewCount ?? 0), 0);

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5" dir="rtl">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2 text-foreground">
              <Building2 className="w-5 h-5 text-teal-600" />
              عقاراتي
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">إدارة إعلاناتك العقارية</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              title="تحديث"
              className="flex items-center justify-center w-9 h-9 rounded-xl border border-gray-200 bg-white text-gray-500 hover:text-teal-700 hover:border-teal-300 hover:bg-teal-50 transition-all duration-200 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => navigate("/add-property")}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-sm hover:shadow-md"
            >
              <Plus className="w-4 h-4" />
              إعلان جديد
            </button>
          </div>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={<Building2 className="w-4 h-4 text-teal-600" />}       label="إجمالي الإعلانات" value={properties.length} colorClass="bg-teal-50/70 border-teal-100" />
          <StatCard icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}  label="منشور"            value={approved}         colorClass="bg-emerald-50/70 border-emerald-100" />
          <StatCard icon={<Clock className="w-4 h-4 text-amber-500" />}           label="قيد المراجعة"     value={pending}          colorClass="bg-amber-50/70 border-amber-100" />
          {expired > 0
            ? <StatCard icon={<AlertTriangle className="w-4 h-4 text-orange-500" />} label="انتهت الصلاحية" value={expired}         colorClass="bg-orange-50/70 border-orange-100" />
            : rejected > 0
            ? <StatCard icon={<XCircle className="w-4 h-4 text-red-500" />}       label="مرفوض"            value={rejected}         colorClass="bg-red-50/70 border-red-100" />
            : <StatCard icon={<TrendingUp className="w-4 h-4 text-blue-500" />}   label="إجمالي المشاهدات" value={totalViews}        colorClass="bg-blue-50/70 border-blue-100" />
          }
        </div>

        {/* Alert banners */}
        {rejected > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-red-50 border border-red-200 text-red-800">
            <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-red-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">لديك {rejected} إعلان{rejected > 1 ? "ات" : ""} مرفوضة</p>
              <p className="text-xs text-red-600 mt-0.5">راجع سبب الرفض وعدّل الإعلان لإعادة التقديم.</p>
            </div>
          </div>
        )}
        {expired > 0 && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-orange-50 border border-orange-200 text-orange-800">
            <div className="w-8 h-8 rounded-full bg-orange-100 flex items-center justify-center shrink-0">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
            </div>
            <div className="flex-1">
              <p className="font-bold text-sm">لديك {expired} إعلان{expired > 1 ? "ات" : ""} انتهت صلاحيتها</p>
              <p className="text-xs text-orange-600 mt-0.5">جدِّد إعلاناتك المنتهية لإعادة ظهورها في نتائج البحث.</p>
            </div>
          </div>
        )}

        {/* Filters + View toggle */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              value={searchQ}
              onChange={e => setSearchQ(e.target.value)}
              placeholder="ابحث في إعلاناتك..."
              className="w-full border border-gray-200 rounded-xl pr-9 pl-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 focus:border-teal-400 bg-white"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 bg-white"
          >
            <option value="all">كل الحالات</option>
            <option value="approved">✅ منشور</option>
            <option value="pending">⏳ قيد المراجعة</option>
            <option value="updated_after_rejection">✏️ أُعيد إرساله</option>
            <option value="rejected">❌ مرفوض</option>
            <option value="expired">⏰ انتهت الصلاحية</option>
            <option value="draft">📝 مسودة</option>
          </select>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-300 bg-white"
          >
            <option value="all">كل الأنواع</option>
            <option value="sale">للبيع</option>
            <option value="rent">للإيجار</option>
          </select>

          {/* View mode toggle */}
          <div className="flex items-center border border-gray-200 rounded-xl overflow-hidden shrink-0 ms-auto bg-white">
            <button
              onClick={() => setViewMode("list")}
              title="عرض قائمة"
              className={`flex items-center justify-center p-2.5 transition-colors ${viewMode === "list" ? "bg-teal-600 text-white" : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"}`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              title="عرض شبكة"
              className={`flex items-center justify-center p-2.5 transition-colors border-r border-l border-gray-200 ${viewMode === "grid" ? "bg-teal-600 text-white" : "text-gray-400 hover:text-gray-700 hover:bg-gray-50"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-24">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && properties.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-teal-50 border border-teal-100 flex items-center justify-center mb-5">
              <Building2 className="w-10 h-10 text-teal-300" />
            </div>
            <h3 className="font-bold text-gray-700 text-lg mb-1">لا توجد إعلانات بعد</h3>
            <p className="text-sm text-muted-foreground mb-6">ابدأ بنشر أول إعلان عقاري الآن ويصلك المشترون</p>
            <button
              onClick={() => navigate("/add-property")}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-bold px-6 py-3 rounded-xl transition-colors shadow-sm hover:shadow-md"
            >
              <Plus className="w-4 h-4" />
              أضف أول إعلان
            </button>
          </div>
        )}

        {/* No filter results */}
        {!isLoading && properties.length > 0 && filtered.length === 0 && (
          <div className="text-center py-16 text-muted-foreground">
            <Filter className="w-10 h-10 mx-auto mb-3 text-gray-200" />
            <p className="text-sm font-medium">لا توجد نتائج للفلاتر المحددة</p>
            <button onClick={() => { setFilterStatus("all"); setFilterType("all"); setSearchQ(""); }} className="text-teal-600 text-xs mt-2 hover:underline">إعادة ضبط الفلاتر</button>
          </div>
        )}

        {/* Property list */}
        {!isLoading && filtered.length > 0 && (
          viewMode === "list" ? (
            <div className="flex flex-col gap-3">
              {filtered.map(prop => (
                <ListCard
                  key={prop.id}
                  prop={prop}
                  onEdit={id => navigate(`/dashboard/edit-property/${id}`)}
                  onDelete={(id, title) => setDeleteTarget({ id, title })}
                  onRenew={id => renewMutation.mutate(id)}
                  isRenewing={renewMutation.isPending}
                  onPromote={p => setPromotingProperty(p)}
                />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filtered.map(prop => (
                <GridCard
                  key={prop.id}
                  prop={prop}
                  onEdit={id => navigate(`/dashboard/edit-property/${id}`)}
                  onDelete={(id, title) => setDeleteTarget({ id, title })}
                  onRenew={id => renewMutation.mutate(id)}
                  isRenewing={renewMutation.isPending}
                  onPromote={p => setPromotingProperty(p)}
                />
              ))}
            </div>
          )
        )}

        {/* Delete confirm dialog */}
        <AlertDialog open={!!deleteTarget} onOpenChange={o => { if (!o) setDeleteTarget(null); }}>
          <AlertDialogContent dir="rtl">
            <AlertDialogHeader>
              <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
              <AlertDialogDescription>
                هل أنت متأكد من حذف إعلان "<span className="font-semibold">{deleteTarget?.title}</span>"؟
                لا يمكن التراجع عن هذا الإجراء.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="flex-row-reverse gap-2">
              <AlertDialogCancel className="rounded-xl">إلغاء</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="bg-red-600 hover:bg-red-700 rounded-xl"
              >
                {deleteMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "حذف"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

      </div>

      {/* Promote modal */}
      {promotingProperty && (
        <PromoteModal
          property={promotingProperty}
          onClose={() => setPromotingProperty(null)}
        />
      )}

    </DashboardLayout>
  );
}
