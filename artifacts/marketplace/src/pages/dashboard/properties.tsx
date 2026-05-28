import { useState } from "react";
import { useLocation } from "wouter";
import {
  Plus, Loader2, RefreshCw, Trash2, Edit3, Eye, Building2,
  Phone, Heart, MessageSquare, AlertTriangle, CheckCircle2,
  Clock, XCircle, BarChart2, Search, Filter, MapPin, Maximize2, Star,
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

const STATUS_MAP: Record<string, {
  label: string; color: string; bg: string; border: string; icon: React.ReactNode;
}> = {
  approved: { label: "منشور",         color: "text-emerald-700", bg: "bg-emerald-50", border: "border-emerald-200", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  pending:  { label: "قيد المراجعة", color: "text-amber-700",  bg: "bg-amber-50",   border: "border-amber-200",  icon: <Clock className="w-3.5 h-3.5" /> },
  rejected: { label: "مرفوض",         color: "text-red-700",    bg: "bg-red-50",     border: "border-red-200",    icon: <XCircle className="w-3.5 h-3.5" /> },
  draft:    { label: "مسودة",          color: "text-gray-600",   bg: "bg-gray-50",    border: "border-gray-200",   icon: <Edit3 className="w-3.5 h-3.5" /> },
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

function StatChip({
  icon, value, label,
}: { icon: React.ReactNode; value: number | undefined; label: string }) {
  return (
    <span className="flex items-center gap-1 text-xs text-gray-500" title={label}>
      {icon}
      <span className="font-semibold text-gray-700">{(value ?? 0).toLocaleString("ar-EG")}</span>
    </span>
  );
}

function PropertyCard({
  prop, onEdit, onDelete,
}: {
  prop: Property;
  onEdit: (id: number) => void;
  onDelete: (id: number, title: string) => void;
}) {
  const imgSrc = getFirstImage(prop.images);
  const statusInfo = STATUS_MAP[prop.status] ?? STATUS_MAP.pending;
  const locationText = [prop.district, prop.city, prop.address].filter(Boolean).join("، ");
  const totalPhoneCalls = (prop.phoneClickCount ?? 0) + (prop.whatsappClickCount ?? 0);

  return (
    <div className="bg-white rounded-2xl border border-border/60 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group">

      {/* Image */}
      <div className="relative aspect-[16/9] bg-gradient-to-br from-slate-100 to-slate-200 overflow-hidden shrink-0">
        {imgSrc ? (
          <img
            src={mediaUrl(imgSrc)}
            alt={prop.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
            onError={(e) => { e.currentTarget.style.display = "none"; }}
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center text-slate-300">
            <Building2 className="w-10 h-10 mb-1" />
            <span className="text-xs">لا توجد صورة</span>
          </div>
        )}

        {/* Listing type badge */}
        {prop.listingType && (
          <span className="absolute top-2.5 right-2.5 bg-teal-600 text-white text-[11px] font-bold px-2.5 py-1 rounded-full shadow">
            {LISTING_LABELS[prop.listingType] ?? prop.listingType}
          </span>
        )}

        {/* Featured badge */}
        {prop.featured && (
          <span className="absolute top-2.5 left-2.5 bg-amber-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-full flex items-center gap-1 shadow">
            <Star className="w-3 h-3" />
            مميز
          </span>
        )}

        {/* Status overlay */}
        <div className={`absolute bottom-2.5 right-2.5 flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-full border backdrop-blur-sm ${statusInfo.color} ${statusInfo.bg} ${statusInfo.border} shadow-sm`}>
          {statusInfo.icon}
          {statusInfo.label}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex flex-col gap-2.5 flex-1">

        {/* Title */}
        <h3 className="font-bold text-sm text-gray-900 leading-snug line-clamp-2">{prop.title}</h3>

        {/* Location */}
        {locationText && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <MapPin className="w-3.5 h-3.5 text-teal-500 shrink-0" />
            <span className="line-clamp-1">{locationText}</span>
          </div>
        )}

        {/* Price & Area */}
        <div className="flex items-center gap-3 flex-wrap">
          {fmtPrice(prop.price) && (
            <span className="text-sm font-bold text-teal-700">{fmtPrice(prop.price)}</span>
          )}
          {prop.area && (
            <span className="flex items-center gap-1 text-xs text-gray-500">
              <Maximize2 className="w-3 h-3" />
              {prop.area} م²
            </span>
          )}
          {prop.rooms != null && Number(prop.rooms) > 0 && (
            <span className="text-xs text-gray-500">{prop.rooms} غرف</span>
          )}
        </div>

        {/* Rejection reason */}
        {prop.status === "rejected" && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-3 mt-1">
            <div className="flex items-start gap-2 mb-2">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-xs font-bold text-red-700 mb-0.5">سبب الرفض:</p>
                <p className="text-xs text-red-600 leading-relaxed">
                  {prop.rejectionReason || "لا يتوافق مع شروط النشر. يرجى مراجعة الإعلان وإعادة التقديم."}
                </p>
              </div>
            </div>
            <button
              onClick={() => onEdit(prop.id)}
              className="w-full flex items-center justify-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-bold py-2 px-3 rounded-lg transition-colors"
            >
              <Edit3 className="w-3.5 h-3.5" />
              تعديل وإعادة التقديم
            </button>
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Stats row */}
        <div className="flex items-center gap-3 pt-2 border-t border-border/40 flex-wrap">
          <StatChip icon={<Eye className="w-3.5 h-3.5 text-blue-400" />}         value={prop.viewCount}      label="مشاهدات" />
          <StatChip icon={<Phone className="w-3.5 h-3.5 text-green-500" />}       value={totalPhoneCalls}     label="اتصالات" />
          <StatChip icon={<Heart className="w-3.5 h-3.5 text-pink-500" />}        value={prop.favoritesCount} label="مفضلة" />
          <StatChip icon={<MessageSquare className="w-3.5 h-3.5 text-purple-500" />} value={prop.messageCount} label="رسائل" />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 pt-1">
          <a
            href={`/property/${prop.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 hover:text-teal-900 border border-teal-200 hover:border-teal-400 bg-teal-50 hover:bg-teal-100 rounded-lg py-2 px-3 transition-colors"
          >
            <Eye className="w-3.5 h-3.5" />
            عرض
          </a>
          <button
            onClick={() => onEdit(prop.id)}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-700 hover:text-blue-900 border border-blue-200 hover:border-blue-400 bg-blue-50 hover:bg-blue-100 rounded-lg py-2 px-3 transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            تعديل
          </button>
          <div className="flex-1" />
          <button
            onClick={() => onDelete(prop.id, prop.title)}
            className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 border border-transparent hover:border-red-200 hover:bg-red-50 rounded-lg py-2 px-2.5 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon, label, value, colorClass,
}: { icon: React.ReactNode; label: string; value: number; colorClass: string }) {
  return (
    <div className={`rounded-xl border p-4 ${colorClass}`}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
      <span className="text-2xl font-bold text-gray-900">{value.toLocaleString("ar-EG")}</span>
    </div>
  );
}

export default function MyPropertiesPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; title: string } | null>(null);
  const [searchQ, setSearchQ] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterType, setFilterType] = useState("all");

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
    const matchQ   = !searchQ || p.title.toLowerCase().includes(searchQ.toLowerCase());
    const matchSt  = filterStatus === "all" || p.status === filterStatus;
    const matchTy  = filterType  === "all" || p.listingType === filterType;
    return matchQ && matchSt && matchTy;
  });

  const approved   = properties.filter((p) => p.status === "approved").length;
  const pending    = properties.filter((p) => p.status === "pending").length;
  const rejected   = properties.filter((p) => p.status === "rejected").length;
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

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <StatCard icon={<Building2 className="w-4 h-4 text-teal-600" />}     label="إجمالي الإعلانات" value={properties.length} colorClass="bg-teal-50 border-teal-100" />
          <StatCard icon={<CheckCircle2 className="w-4 h-4 text-emerald-600" />} label="منشور"           value={approved}         colorClass="bg-emerald-50 border-emerald-100" />
          <StatCard icon={<Clock className="w-4 h-4 text-amber-600" />}         label="قيد المراجعة"    value={pending}          colorClass="bg-amber-50 border-amber-100" />
          {rejected > 0 ? (
            <StatCard icon={<XCircle className="w-4 h-4 text-red-600" />}       label="مرفوض"            value={rejected}         colorClass="bg-red-50 border-red-100" />
          ) : (
            <StatCard icon={<BarChart2 className="w-4 h-4 text-blue-500" />}    label="إجمالي المشاهدات" value={totalViews}        colorClass="bg-blue-50 border-blue-100" />
          )}
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

        {/* Filters */}
        <div className="flex flex-wrap gap-2 items-center">
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <input
              value={searchQ}
              onChange={(e) => setSearchQ(e.target.value)}
              placeholder="ابحث في إعلاناتك..."
              className="w-full border border-border rounded-xl pr-9 pl-3 py-2 text-sm focus:outline-none focus:border-teal-400 bg-white"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
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
            onChange={(e) => setFilterType(e.target.value)}
            className="border border-border rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400 bg-white"
          >
            <option value="all">كل الأنواع</option>
            <option value="sale">للبيع</option>
            <option value="rent">للإيجار</option>
          </select>
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
            <div className="w-20 h-20 rounded-full bg-teal-50 flex items-center justify-center mb-4">
              <Building2 className="w-10 h-10 text-teal-400" />
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

        {/* Cards grid */}
        {!isLoading && filtered.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {filtered.map((prop) => (
              <PropertyCard
                key={prop.id}
                prop={prop}
                onEdit={(id) => navigate(`/dashboard/edit-property/${id}`)}
                onDelete={(id, title) => setDeleteTarget({ id, title })}
              />
            ))}
          </div>
        )}

        {/* Delete confirm dialog */}
        <AlertDialog open={!!deleteTarget} onOpenChange={(o) => { if (!o) setDeleteTarget(null); }}>
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
