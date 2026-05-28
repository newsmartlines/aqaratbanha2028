import { useState } from "react";
import { useLocation } from "wouter";
import {
  Plus, Loader2, RefreshCw, Trash2, Edit3, Eye, Building2,
  Phone, Heart, MessageSquare, AlertTriangle, CheckCircle2,
  Clock, XCircle, BarChart2, Search, Filter, MapPin, Maximize2, Star,
  LayoutList, LayoutGrid, BedDouble,
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
  rooms?: number;
  bathrooms?: number;
}

type ViewMode = "list" | "grid";

const STATUS_MAP: Record<string, {
  label: string;
  badgeCls: string;
  borderCls: string;
  icon: React.ReactNode;
}> = {
  approved: {
    label: "منشور",
    badgeCls: "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40",
    borderCls: "border-zinc-800",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  pending: {
    label: "قيد المراجعة",
    badgeCls: "bg-amber-500/20 text-amber-400 border border-amber-500/40",
    borderCls: "border-amber-900/40",
    icon: <Clock className="w-3 h-3" />,
  },
  rejected: {
    label: "مرفوض",
    badgeCls: "bg-red-500/20 text-red-400 border border-red-500/40",
    borderCls: "border-red-900/40",
    icon: <XCircle className="w-3 h-3" />,
  },
  draft: {
    label: "مسودة",
    badgeCls: "bg-zinc-700 text-zinc-300 border border-zinc-600",
    borderCls: "border-zinc-800",
    icon: <Edit3 className="w-3 h-3" />,
  },
};

const LISTING_LABELS: Record<string, string> = {
  sale: "للبيع", rent: "للإيجار", investment: "للاستثمار",
};

function getFirstImage(images: string | string[] | undefined): string | null {
  if (!images) return null;
  if (Array.isArray(images)) return images[0] ?? null;
  try {
    const parsed = JSON.parse(images);
    return Array.isArray(parsed) ? (parsed[0] ?? null) : null;
  } catch { return null; }
}

function fmtPrice(price: string | number | undefined): string | null {
  if (price == null || price === "") return null;
  const n = typeof price === "string" ? parseFloat(price) : price;
  if (isNaN(n) || n === 0) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)} م ج.م`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} ألف ج.م`;
  return `${n.toLocaleString("ar-EG")} ج.م`;
}

function StatPill({ icon, value, label }: { icon: React.ReactNode; value: number | undefined; label: string }) {
  return (
    <span className="flex items-center gap-1 text-xs text-zinc-500 shrink-0" title={label}>
      {icon}
      <span className="font-bold text-zinc-300">{(value ?? 0).toLocaleString("ar-EG")}</span>
    </span>
  );
}

/* ─── LIST CARD ─────────────────────────────────────────────── */
function ListCard({ prop, onEdit, onDelete }: {
  prop: Property; onEdit: (id: number) => void; onDelete: (id: number, title: string) => void;
}) {
  const imgSrc = getFirstImage(prop.images);
  const st = STATUS_MAP[prop.status] ?? STATUS_MAP.pending;
  const loc = [prop.district, prop.city].filter(Boolean).join("، ");
  const price = fmtPrice(prop.price);
  const totalCalls = (prop.phoneClickCount ?? 0) + (prop.whatsappClickCount ?? 0);

  return (
    <div className={`bg-zinc-900 rounded-2xl border overflow-hidden flex flex-row group shadow-sm hover:shadow-lg hover:brightness-110 transition-all duration-300 ${st.borderCls}`}>

      {/* Image — fixed width, full height */}
      <div className="relative w-36 sm:w-44 md:w-52 shrink-0 overflow-hidden">
        {imgSrc ? (
          <img
            src={mediaUrl(imgSrc)}
            alt={prop.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={e => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center bg-zinc-800 text-zinc-600 gap-1">
            <Building2 className="w-8 h-8" />
          </div>
        )}
        {/* Listing type */}
        {prop.listingType && (
          <span className="absolute top-2 right-2 text-[10px] font-bold bg-teal-600 text-white px-2 py-0.5 rounded-full shadow">
            {LISTING_LABELS[prop.listingType] ?? prop.listingType}
          </span>
        )}
        {/* Featured */}
        {prop.featured && (
          <span className="absolute top-2 left-2 text-[10px] font-bold bg-amber-500 text-white px-2 py-0.5 rounded-full flex items-center gap-0.5 shadow">
            <Star className="w-2.5 h-2.5" /> مميز
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 p-3.5 sm:p-4 flex flex-col gap-2 min-w-0">

        {/* Top row: title + status */}
        <div className="flex items-start gap-2">
          <h3 className="text-white font-bold text-sm leading-snug line-clamp-2 flex-1">{prop.title}</h3>
          <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full shrink-0 whitespace-nowrap ${st.badgeCls}`}>
            {st.icon} {st.label}
          </span>
        </div>

        {/* Location */}
        {loc && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <MapPin className="w-3 h-3 text-teal-500 shrink-0" />
            <span className="truncate">{loc}</span>
          </div>
        )}

        {/* Price + specs */}
        <div className="flex items-center gap-3 flex-wrap">
          {price && <span className="text-teal-400 font-bold text-sm">{price}</span>}
          {prop.area && (
            <span className="flex items-center gap-0.5 text-xs text-zinc-500">
              <Maximize2 className="w-3 h-3" /> {prop.area} م²
            </span>
          )}
          {prop.rooms != null && Number(prop.rooms) > 0 && (
            <span className="flex items-center gap-0.5 text-xs text-zinc-500">
              <BedDouble className="w-3 h-3" /> {prop.rooms} غرف
            </span>
          )}
        </div>

        {/* Rejection reason */}
        {prop.status === "rejected" && (
          <div className="rounded-xl border border-red-900/50 bg-red-950/50 p-2.5 mt-0.5">
            <p className="text-xs font-bold text-red-400 mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> سبب الرفض:
            </p>
            <p className="text-xs text-red-400/80 leading-relaxed line-clamp-2">
              {prop.rejectionReason || "لا يتوافق مع شروط النشر. راجع الإعلان وأعد التقديم."}
            </p>
            <button
              onClick={() => onEdit(prop.id)}
              className="mt-2 w-full flex items-center justify-center gap-1.5 bg-red-700 hover:bg-red-600 text-white text-xs font-bold py-1.5 rounded-lg transition-colors"
            >
              <Edit3 className="w-3 h-3" /> تعديل وإعادة التقديم
            </button>
          </div>
        )}

        <div className="flex-1" />

        {/* Stats + Actions */}
        <div className="flex items-center gap-2.5 pt-2 border-t border-zinc-800 flex-wrap">
          <StatPill icon={<Eye className="w-3.5 h-3.5 text-blue-400" />}          value={prop.viewCount}      label="مشاهدات" />
          <StatPill icon={<Phone className="w-3.5 h-3.5 text-green-400" />}       value={totalCalls}           label="اتصالات" />
          <StatPill icon={<Heart className="w-3.5 h-3.5 text-pink-500" />}        value={prop.favoritesCount}  label="مفضلة" />
          <StatPill icon={<MessageSquare className="w-3.5 h-3.5 text-violet-400" />} value={prop.messageCount}  label="رسائل" />
          <div className="flex-1" />
          <a
            href={`/property/${prop.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-teal-400 border border-zinc-700 hover:border-teal-600 bg-zinc-800 hover:bg-zinc-700 rounded-lg py-1.5 px-2.5 transition-colors"
          >
            <Eye className="w-3 h-3" /> عرض
          </a>
          <button
            onClick={() => onEdit(prop.id)}
            className="flex items-center gap-1 text-xs font-semibold text-zinc-400 hover:text-blue-400 border border-zinc-700 hover:border-blue-600 bg-zinc-800 hover:bg-zinc-700 rounded-lg py-1.5 px-2.5 transition-colors"
          >
            <Edit3 className="w-3 h-3" /> تعديل
          </button>
          <button
            onClick={() => onDelete(prop.id, prop.title)}
            className="flex items-center gap-1 text-xs text-zinc-600 hover:text-red-400 border border-transparent hover:border-red-900 hover:bg-red-950/40 rounded-lg py-1.5 px-2 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── GRID CARD ─────────────────────────────────────────────── */
function GridCard({ prop, onEdit, onDelete }: {
  prop: Property; onEdit: (id: number) => void; onDelete: (id: number, title: string) => void;
}) {
  const imgSrc = getFirstImage(prop.images);
  const st = STATUS_MAP[prop.status] ?? STATUS_MAP.pending;
  const loc = [prop.district, prop.city].filter(Boolean).join("، ");
  const price = fmtPrice(prop.price);
  const totalCalls = (prop.phoneClickCount ?? 0) + (prop.whatsappClickCount ?? 0);

  return (
    <div className={`bg-zinc-900 rounded-2xl border overflow-hidden flex flex-col group shadow-sm hover:shadow-xl hover:brightness-110 transition-all duration-300 ${st.borderCls}`}>

      {/* Image */}
      <div className="relative aspect-[16/9] bg-zinc-800 overflow-hidden shrink-0">
        {imgSrc ? (
          <img
            src={mediaUrl(imgSrc)}
            alt={prop.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={e => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-zinc-700">
            <Building2 className="w-10 h-10" />
          </div>
        )}
        {prop.listingType && (
          <span className="absolute top-2.5 right-2.5 text-[11px] font-bold bg-teal-600 text-white px-2.5 py-0.5 rounded-full shadow">
            {LISTING_LABELS[prop.listingType] ?? prop.listingType}
          </span>
        )}
        {prop.featured && (
          <span className="absolute top-2.5 left-2.5 text-[11px] font-bold bg-amber-500 text-white px-2.5 py-0.5 rounded-full flex items-center gap-1 shadow">
            <Star className="w-3 h-3" /> مميز
          </span>
        )}
        <span className={`absolute bottom-2.5 right-2.5 flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full ${st.badgeCls}`}>
          {st.icon} {st.label}
        </span>
      </div>

      {/* Body */}
      <div className="p-3.5 flex flex-col gap-2 flex-1">
        <h3 className="text-white font-bold text-sm leading-snug line-clamp-2">{prop.title}</h3>
        {loc && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <MapPin className="w-3 h-3 text-teal-500 shrink-0" />
            <span className="truncate">{loc}</span>
          </div>
        )}
        <div className="flex items-center gap-2.5 flex-wrap">
          {price && <span className="text-teal-400 font-bold text-sm">{price}</span>}
          {prop.area && <span className="text-xs text-zinc-500 flex items-center gap-0.5"><Maximize2 className="w-3 h-3" /> {prop.area} م²</span>}
          {prop.rooms != null && Number(prop.rooms) > 0 && <span className="text-xs text-zinc-500 flex items-center gap-0.5"><BedDouble className="w-3 h-3" /> {prop.rooms}</span>}
        </div>

        {prop.status === "rejected" && (
          <div className="rounded-xl border border-red-900/50 bg-red-950/50 p-2.5">
            <p className="text-xs font-bold text-red-400 mb-1 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3" /> سبب الرفض:
            </p>
            <p className="text-xs text-red-400/80 leading-relaxed line-clamp-2">
              {prop.rejectionReason || "لا يتوافق مع شروط النشر."}
            </p>
            <button
              onClick={() => onEdit(prop.id)}
              className="mt-2 w-full flex items-center justify-center gap-1.5 bg-red-700 hover:bg-red-600 text-white text-xs font-bold py-1.5 rounded-lg transition-colors"
            >
              <Edit3 className="w-3 h-3" /> تعديل وإعادة التقديم
            </button>
          </div>
        )}

        <div className="flex-1" />

        {/* Stats */}
        <div className="flex items-center gap-2.5 pt-2 border-t border-zinc-800 flex-wrap">
          <StatPill icon={<Eye className="w-3 h-3 text-blue-400" />}              value={prop.viewCount}      label="مشاهدات" />
          <StatPill icon={<Phone className="w-3 h-3 text-green-400" />}           value={totalCalls}           label="اتصالات" />
          <StatPill icon={<Heart className="w-3 h-3 text-pink-500" />}            value={prop.favoritesCount}  label="مفضلة" />
          <StatPill icon={<MessageSquare className="w-3 h-3 text-violet-400" />}  value={prop.messageCount}    label="رسائل" />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1.5">
          <a
            href={`/property/${prop.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold text-zinc-400 hover:text-teal-400 border border-zinc-700 hover:border-teal-600 bg-zinc-800 hover:bg-zinc-700 rounded-lg py-1.5 px-2 transition-colors"
          >
            <Eye className="w-3 h-3" /> عرض
          </a>
          <button
            onClick={() => onEdit(prop.id)}
            className="flex-1 flex items-center justify-center gap-1 text-xs font-semibold text-zinc-400 hover:text-blue-400 border border-zinc-700 hover:border-blue-600 bg-zinc-800 hover:bg-zinc-700 rounded-lg py-1.5 px-2 transition-colors"
          >
            <Edit3 className="w-3 h-3" /> تعديل
          </button>
          <button
            onClick={() => onDelete(prop.id, prop.title)}
            className="flex items-center justify-center text-xs text-zinc-600 hover:text-red-400 border border-transparent hover:border-red-900 hover:bg-red-950/40 rounded-lg p-1.5 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
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
    <div className={`rounded-xl border p-4 ${colorClass}`}>
      <div className="flex items-center gap-2 mb-1">{icon}<span className="text-xs text-muted-foreground">{label}</span></div>
      <span className="text-2xl font-bold text-gray-900">{value.toLocaleString("ar-EG")}</span>
    </div>
  );
}

/* ─── MAIN PAGE ─────────────────────────────────────────────── */
export default function MyPropertiesPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
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
      toast.success("تم حذف الإعلان");
      setDeleteTarget(null);
    },
    onError: () => toast.error("فشل الحذف"),
  });

  const filtered = properties.filter((p) => {
    const matchQ  = !searchQ || p.title.toLowerCase().includes(searchQ.toLowerCase());
    const matchSt = filterStatus === "all" || p.status === filterStatus;
    const matchTy = filterType  === "all" || p.listingType === filterType;
    return matchQ && matchSt && matchTy;
  });

  const approved   = properties.filter(p => p.status === "approved").length;
  const pending    = properties.filter(p => p.status === "pending").length;
  const rejected   = properties.filter(p => p.status === "rejected").length;
  const totalViews = properties.reduce((s, p) => s + (p.viewCount ?? 0), 0);

  if (!user) return null;

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 space-y-5" dir="rtl">

        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-600" />
              عقاراتي
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">إدارة إعلاناتك العقارية</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="flex items-center gap-1.5 text-sm text-gray-600 hover:text-teal-700 border border-border px-3 py-2 rounded-xl hover:border-teal-300 transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isFetching ? "animate-spin" : ""}`} />
              تحديث
            </button>
            <button
              onClick={() => navigate("/add-property")}
              className="flex items-center gap-1.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-semibold px-4 py-2 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              إعلان جديد
            </button>
          </div>
        </div>

        {/* Stats summary */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={<Building2 className="w-4 h-4 text-teal-600" />}       label="إجمالي الإعلانات" value={properties.length} colorClass="bg-teal-50 border-teal-100" />
          <StatCard icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />}  label="منشور"            value={approved}         colorClass="bg-emerald-50 border-emerald-100" />
          <StatCard icon={<Clock className="w-4 h-4 text-amber-600" />}           label="قيد المراجعة"     value={pending}          colorClass="bg-amber-50 border-amber-100" />
          {rejected > 0
            ? <StatCard icon={<XCircle className="w-4 h-4 text-red-600" />}       label="مرفوض"            value={rejected}         colorClass="bg-red-50 border-red-100" />
            : <StatCard icon={<BarChart2 className="w-4 h-4 text-blue-500" />}    label="إجمالي المشاهدات" value={totalViews}        colorClass="bg-blue-50 border-blue-100" />
          }
        </div>

        {/* Rejection alert */}
        {rejected > 0 && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 border border-red-200 text-red-800">
            <AlertTriangle className="w-5 h-5 shrink-0 mt-0.5 text-red-600" />
            <div>
              <p className="font-bold text-sm">لديك {rejected} إعلان{rejected > 1 ? "ات" : ""} مرفوضة</p>
              <p className="text-xs text-red-600 mt-0.5">راجع سبب الرفض في كل إعلان وعدّله لإعادة التقديم.</p>
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
              className="w-full border border-border rounded-xl pr-9 pl-3 py-2 text-sm focus:outline-none focus:border-teal-400 bg-white"
            />
          </div>
          <select
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
            className="border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400 bg-white"
          >
            <option value="all">كل الحالات</option>
            <option value="approved">منشور</option>
            <option value="pending">قيد المراجعة</option>
            <option value="rejected">مرفوض</option>
            <option value="draft">مسودة</option>
          </select>
          <select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            className="border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400 bg-white"
          >
            <option value="all">كل الأنواع</option>
            <option value="sale">للبيع</option>
            <option value="rent">للإيجار</option>
          </select>

          {/* View mode toggle */}
          <div className="flex items-center border border-border rounded-xl overflow-hidden shrink-0 ms-auto">
            <button
              onClick={() => setViewMode("list")}
              title="عرض قائمة"
              className={`flex items-center justify-center p-2 transition-colors ${viewMode === "list" ? "bg-zinc-900 text-white" : "bg-white text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50"}`}
            >
              <LayoutList className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("grid")}
              title="عرض شبكة"
              className={`flex items-center justify-center p-2 transition-colors border-r border-l border-border ${viewMode === "grid" ? "bg-zinc-900 text-white" : "bg-white text-zinc-400 hover:text-zinc-700 hover:bg-zinc-50"}`}
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
        )}

        {/* Empty state */}
        {!isLoading && properties.length === 0 && (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-20 h-20 rounded-full bg-zinc-100 flex items-center justify-center mb-4">
              <Building2 className="w-10 h-10 text-zinc-400" />
            </div>
            <h3 className="font-bold text-gray-700 mb-1">لا توجد إعلانات بعد</h3>
            <p className="text-sm text-muted-foreground mb-5">ابدأ بنشر أول إعلان عقاري الآن</p>
            <button
              onClick={() => navigate("/add-property")}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors"
            >
              <Plus className="w-4 h-4" />
              إضافة أول إعلان
            </button>
          </div>
        )}

        {/* No filter results */}
        {!isLoading && properties.length > 0 && filtered.length === 0 && (
          <div className="text-center py-12 text-muted-foreground">
            <Filter className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm">لا توجد نتائج للفلاتر المحددة</p>
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
    </DashboardLayout>
  );
}
