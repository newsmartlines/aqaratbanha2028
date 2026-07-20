import { useState, useEffect, useMemo } from "react";
import { useLocation } from "wouter";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Search, RefreshCw, Pencil, Trash2, Eye,
  CheckCircle2, XCircle, Building2, Home, Loader2,
  Plus, AlertCircle,
  MessageSquareWarning, Check,
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { api, type Category } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { PropertyDetailDrawer, type ExtendedProperty } from "@/components/admin/PropertyDetailDrawer";

type DbProperty = {
  id: number;
  providerId: number;
  ownerUserId: number | null;
  agentName?: string | null;
  title: string;
  description: string | null;
  mainCategory: string;
  listingType: string;
  subCategory: string | null;
  price: string | null;
  area: string | null;
  rooms: number | null;
  bathrooms: number | null;
  floor: number | null;
  totalFloors: number | null;
  buildYear: number | null;
  featured: boolean;
  status: string;
  rejectionReason: string | null;
  address: string | null;
  images: string | null;
  phone: string | null;
  whatsapp: string | null;
  latitude: string | null;
  longitude: string | null;
  createdAt: string;
  updatedAt: string | null;
  expiresAt: string | null;
};

const FALLBACK = "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=200&q=60";

const MAIN_CATEGORIES = [
  { value: "residential", label: "سكني" },
  { value: "land", label: "أراضي" },
  { value: "commercial", label: "تجاري" },
];
const LISTING_TYPES = [
  { value: "sale", label: "للبيع" },
  { value: "rent", label: "للإيجار" },
];

function getFirstImage(images: string | null): string {
  if (!images) return FALLBACK;
  try {
    const arr = JSON.parse(images);
    if (Array.isArray(arr) && arr.length > 0 && arr[0]) return arr[0];
  } catch {}
  if (typeof images === "string" && images.startsWith("http")) return images;
  return FALLBACK;
}

function fmtPrice(price: string | null): string {
  if (!price) return "—";
  const n = parseFloat(price);
  if (isNaN(n)) return price;
  return n.toLocaleString("en-US") + " ج.م";
}

function statusBadge(status: string) {
  if (status === "approved" || status === "active")
    return <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">منشور</Badge>;
  if (status === "pending")
    return <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50">قيد المراجعة</Badge>;
  if (status === "updated_after_rejection")
    return <Badge variant="outline" className="text-violet-700 border-violet-200 bg-violet-50 gap-1"><span>✏️</span> أُعيد إرساله</Badge>;
  if (status === "rejected")
    return <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">مرفوض</Badge>;
  if (status === "expired")
    return <Badge variant="outline" className="text-gray-500 border-gray-200 bg-gray-50">⏰ انتهت الصلاحية</Badge>;
  if (status === "draft")
    return <Badge variant="outline" className="text-gray-500 border-gray-200 bg-gray-50">مسودة</Badge>;
  if (status === "inactive")
    return <Badge variant="outline" className="text-gray-600 border-gray-200 bg-gray-50">غير نشط</Badge>;
  return <Badge variant="outline" className="text-gray-600 border-gray-200 bg-gray-50">{status}</Badge>;
}

const emptyForm = {
  title: "",
  address: "",
  price: "",
  listingType: "sale",
  mainCategory: "residential",
  rooms: 3,
  bathrooms: 2,
  area: 150,
  featured: false,
  description: "",
  img: "",
  providerId: "",
};

export default function AdminProperties() {
  const [properties, setProperties] = useState<DbProperty[]>([]);
  const [, setLocation] = useLocation();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterKind, setFilterKind] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  // Rejection modal state
  const [rejectTarget, setRejectTarget] = useState<DbProperty | null>(null);
  const [rejectChips, setRejectChips] = useState<string[]>([]);
  const [rejectNote, setRejectNote] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [providers, setProviders] = useState<{ id: number; name: string }[]>([]);
  const [selectedProp, setSelectedProp] = useState<ExtendedProperty | null>(null);

  const { data: reCategories = [] } = useQuery<Category[]>({
    queryKey: ["re-categories"],
    queryFn: () => api.categories.listByType("real_estate"),
    staleTime: 5 * 60 * 1000,
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.properties.list({ status: "all" });
      setProperties((data as unknown as DbProperty[]).sort((a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      ));
    } catch {
      toast.error("فشل تحميل العقارات");
    } finally {
      setLoading(false);
    }
  };

  const loadProviders = async () => {
    try {
      const data = await api.admin.providers.list();
      setProviders((data as unknown as { id: number; name: string }[]).map(p => ({ id: p.id, name: p.name })));
    } catch {}
  };

  useEffect(() => { load(); loadProviders(); }, []);

  const filtered = useMemo(() => properties.filter((p) => {
    const q = search.toLowerCase();
    if (q && !p.title.toLowerCase().includes(q) && !(p.address ?? "").toLowerCase().includes(q)) return false;
    if (filterType !== "all" && p.listingType !== filterType) return false;
    if (filterKind !== "all" && p.mainCategory !== filterKind) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    return true;
  }), [properties, search, filterType, filterKind, filterStatus]);

  const stats = useMemo(() => ({
    total: properties.length,
    published: properties.filter(p => p.status === "approved" || p.status === "active").length,
    pending: properties.filter(p => p.status === "pending").length,
    updatedAfterRejection: properties.filter(p => p.status === "updated_after_rejection").length,
    rejected: properties.filter(p => p.status === "rejected").length,
    expired: properties.filter(p => p.status === "expired").length,
    featured: properties.filter(p => p.featured).length,
    forSale: properties.filter(p => p.listingType === "sale").length,
    forRent: properties.filter(p => p.listingType === "rent").length,
  }), [properties]);

  const handleToggleFeatured = async (p: DbProperty) => {
    try {
      await api.properties.update(p.id, { featured: !p.featured });
      setProperties(prev => prev.map(x => x.id === p.id ? { ...x, featured: !x.featured } : x));
      toast.success(p.featured ? "تم إلغاء التمييز" : "تم تمييز العقار");
    } catch {
      toast.error("فشل تحديث التمييز");
    }
  };

  const REJECT_CHIPS = [
    { id: "photos", label: "📷 الصور غير واضحة أو منخفضة الجودة" },
    { id: "price",  label: "💰 السعر مبالغ فيه أو غير واقعي" },
    { id: "info",   label: "⚠️ معلومات مضللة أو غير دقيقة" },
    { id: "addr",   label: "📍 العنوان غير صحيح أو غير محدد" },
    { id: "dup",    label: "🔄 الإعلان مكرر أو موجود مسبقاً" },
    { id: "contact",label: "📞 بيانات التواصل مفقودة أو خاطئة" },
    { id: "policy", label: "🚫 المحتوى ينتهك سياسة المنصة" },
  ];

  const openRejectModal = (p: DbProperty) => {
    setRejectTarget(p);
    setRejectChips([]);
    setRejectNote("");
  };

  const handleRejectConfirm = async () => {
    if (!rejectTarget) return;
    setRejecting(true);
    try {
      const selectedLabels = rejectChips.map(id => REJECT_CHIPS.find(c => c.id === id)?.label ?? "").filter(Boolean);
      const parts: string[] = [...selectedLabels];
      if (rejectNote.trim()) parts.push(rejectNote.trim());
      const rejectionReason = parts.join("\n") || undefined;
      await api.properties.patchStatus(rejectTarget.id, "rejected", rejectionReason);
      setProperties(prev => prev.map(x => x.id === rejectTarget.id ? { ...x, status: "rejected" } : x));
      toast.success(`❌ تم رفض: ${rejectTarget.title} — تم إشعار المالك`);
      setRejectTarget(null);
    } catch {
      toast.error("فشل تحديث الحالة");
    } finally {
      setRejecting(false);
    }
  };

  const handleStatus = async (p: DbProperty, status: string) => {
    if (status === "rejected") { openRejectModal(p); return; }
    try {
      await api.properties.patchStatus(p.id, status);
      setProperties(prev => prev.map(x => x.id === p.id ? { ...x, status } : x));
      if (status === "approved") {
        toast.success(`✅ تمت الموافقة على: ${p.title} — تم إشعار المالك`);
      }
    } catch {
      toast.error("فشل تحديث الحالة");
    }
  };

  const handleDelete = async (id: number) => {
    if (deleteConfirmId === id) {
      try {
        await api.properties.delete(id);
        setProperties(prev => prev.filter(p => p.id !== id));
        setDeleteConfirmId(null);
        toast.success("تم حذف العقار");
      } catch {
        toast.error("فشل الحذف");
      }
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  const handleStatusFromDrawer = (id: number, newStatus: string) => {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, status: newStatus } : p));
    setSelectedProp(null);
  };

  const handleFeaturedFromDrawer = (id: number, featured: boolean) => {
    setProperties(prev => prev.map(p => p.id === id ? { ...p, featured } : p));
  };

  const handleDeleteFromDrawer = (id: number) => {
    setProperties(prev => prev.filter(p => p.id !== id));
    setSelectedProp(null);
  };

  const handleAddSave = async () => {
    if (!form.title || !form.providerId) {
      toast.error("العنوان واختيار المزود مطلوبان");
      return;
    }
    setSaving(true);
    try {
      const newProp = await api.properties.create({
        title: form.title,
        address: form.address,
        price: form.price || null,
        listingType: form.listingType,
        mainCategory: form.mainCategory,
        rooms: form.rooms,
        bathrooms: form.bathrooms,
        area: String(form.area),
        description: form.description || null,
        images: form.img ? JSON.stringify([form.img]) : null,
        featured: form.featured,
        providerId: parseInt(form.providerId),
        status: "approved",
      });
      setProperties(prev => [newProp as unknown as DbProperty, ...prev]);
      setAddOpen(false);
      setForm({ ...emptyForm });
      toast.success("تمت إضافة العقار");
    } catch (err: unknown) {
      toast.error((err as Error)?.message ?? "فشل الإضافة");
    } finally {
      setSaving(false);
    }
  };

  const FormFields = ({ f, setF }: { f: typeof emptyForm; setF: (v: typeof emptyForm) => void }) => (
    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 grid gap-1.5">
          <Label>عنوان العقار <span className="text-red-500">*</span></Label>
          <Input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="شقة فاخرة في الزمالك" />
        </div>
        <div className="col-span-2 grid gap-1.5">
          <Label>العنوان / الموقع</Label>
          <Input value={f.address} onChange={e => setF({ ...f, address: e.target.value })} placeholder="الزمالك، القاهرة" />
        </div>
        <div className="grid gap-1.5">
          <Label>نوع الصفقة</Label>
          <Select value={f.listingType} onValueChange={v => setF({ ...f, listingType: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {LISTING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>نوع العقار</Label>
          <Select value={f.mainCategory} onValueChange={v => setF({ ...f, mainCategory: v })}>
            <SelectTrigger><SelectValue placeholder="اختر نوع العقار" /></SelectTrigger>
            <SelectContent>
              {reCategories.length > 0
                ? reCategories.map(c => <SelectItem key={c.slug ?? c.id} value={c.slug ?? String(c.id)}>{c.nameAr}</SelectItem>)
                : MAIN_CATEGORIES.map(k => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)
              }
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>السعر (ج.م)</Label>
          <Input value={f.price} onChange={e => setF({ ...f, price: e.target.value })} placeholder="1500000" />
        </div>
        <div className="grid gap-1.5">
          <Label>المساحة (م²)</Label>
          <Input type="number" min={0} value={f.area} onChange={e => setF({ ...f, area: Number(e.target.value) })} />
        </div>
        <div className="grid gap-1.5">
          <Label>غرف النوم</Label>
          <Input type="number" min={0} value={f.rooms} onChange={e => setF({ ...f, rooms: Number(e.target.value) })} />
        </div>
        <div className="grid gap-1.5">
          <Label>الحمامات</Label>
          <Input type="number" min={0} value={f.bathrooms} onChange={e => setF({ ...f, bathrooms: Number(e.target.value) })} />
        </div>
        <div className="col-span-2 grid gap-1.5">
          <Label>رابط الصورة الرئيسية</Label>
          <Input value={f.img} onChange={e => setF({ ...f, img: e.target.value })} placeholder="https://..." />
        </div>
        <div className="col-span-2 grid gap-1.5">
          <Label>المزود (مالك العقار) <span className="text-red-500">*</span></Label>
          <Select value={f.providerId} onValueChange={v => setF({ ...f, providerId: v })}>
            <SelectTrigger>
              <SelectValue placeholder="اختر المزود..." />
            </SelectTrigger>
            <SelectContent>
              {providers.map(p => (
                <SelectItem key={p.id} value={String(p.id)}>{p.name} (#{p.id})</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 grid gap-1.5">
          <Label>الوصف</Label>
          <Input value={f.description} onChange={e => setF({ ...f, description: e.target.value })} placeholder="وصف مختصر عن العقار..." />
        </div>
        <div className="col-span-2 flex items-center gap-2">
          <input
            id="featured-check"
            type="checkbox"
            className="w-4 h-4 accent-teal-600 cursor-pointer"
            checked={f.featured}
            onChange={e => setF({ ...f, featured: e.target.checked })}
          />
          <Label htmlFor="featured-check" className="cursor-pointer font-normal">تمييز العقار (⭐ مميز)</Label>
        </div>
      </div>
    </div>
  );

  const pendingProps = useMemo(() =>
    properties.filter(p => p.status === "pending" || p.status === "updated_after_rejection"),
  [properties]);

  return (
    <AdminLayout title="إدارة العقارات">

      {/* ── Pending Alert Banner ── */}
      {pendingProps.length > 0 && (
        <div className="mb-6 rounded-xl border-2 border-amber-300 bg-amber-50 overflow-hidden shadow-sm">
          <div className="flex items-center justify-between px-5 py-3 bg-amber-100 border-b border-amber-200">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-amber-500 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4 text-white" />
              </div>
              <div>
                <h3 className="font-bold text-amber-900 text-sm">
                  عقارات تحتاج مراجعة
                </h3>
                <p className="text-xs text-amber-700">
                  {properties.filter(p => p.status === "pending").length} جديد
                  {stats.updatedAfterRejection > 0 && ` • ${stats.updatedAfterRejection} مُعدَّل بعد الرفض`}
                </p>
              </div>
            </div>
            <button
              onClick={() => setFilterStatus("pending")}
              className="text-xs font-semibold text-amber-800 hover:text-amber-900 underline underline-offset-2"
            >
              عرض الكل
            </button>
          </div>

          <div className="divide-y divide-amber-200 max-h-72 overflow-y-auto">
            {pendingProps.slice(0, 6).map((p) => (
              <div
                key={p.id}
                className={`flex items-center gap-3 px-5 py-3 hover:bg-amber-50/80 transition-colors ${p.status === "updated_after_rejection" ? "bg-violet-50/40 border-r-2 border-r-violet-400" : ""}`}
              >
                <div className="w-10 h-9 rounded-lg overflow-hidden border border-amber-200 shrink-0">
                  <img
                    src={getFirstImage(p.images)}
                    alt={p.title}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.src = FALLBACK; }}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-semibold text-slate-900 truncate" dir="rtl">{p.title}</p>
                    {p.status === "updated_after_rejection" && (
                      <span className="shrink-0 text-[10px] font-bold bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-full">✏️ مُعدَّل</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{p.address ?? "—"} • {fmtPrice(p.price)}</p>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-3 text-xs border-amber-400 text-amber-700 bg-amber-50 hover:bg-amber-100 gap-1 font-semibold"
                    onClick={() => setLocation(`/admin/properties/${p.id}/review`)}
                  >
                    <Eye className="w-3 h-3" />
                    مراجعة كاملة
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 px-3 text-xs bg-emerald-600 hover:bg-emerald-700 text-white gap-1"
                    onClick={() => handleStatus(p, "approved")}
                  >
                    <CheckCircle2 className="w-3 h-3" />
                    موافقة
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-7 px-3 text-xs border-red-300 text-red-600 hover:bg-red-50 gap-1"
                    onClick={() => handleStatus(p, "rejected")}
                  >
                    <XCircle className="w-3 h-3" />
                    رفض
                  </Button>
                </div>
              </div>
            ))}
            {pendingProps.length > 6 && (
              <div className="px-5 py-2.5 text-center">
                <button
                  onClick={() => setFilterStatus("pending")}
                  className="text-xs text-amber-700 font-medium hover:underline"
                >
                  + {pendingProps.length - 6} عقارات أخرى — عرض الكل
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[
          { label: "إجمالي العقارات",   value: stats.total,                 icon: Building2,     color: "text-slate-700 bg-slate-100",   onClick: () => setFilterStatus("all") },
          { label: "منشور",             value: stats.published,             icon: CheckCircle2,  color: "text-emerald-700 bg-emerald-50", onClick: () => setFilterStatus("approved") },
          { label: "قيد المراجعة",      value: stats.pending + stats.updatedAfterRejection, icon: AlertCircle, color: "text-amber-700 bg-amber-50", onClick: () => setFilterStatus("pending") },
          { label: "أُعيد إرساله",      value: stats.updatedAfterRejection, icon: MessageSquareWarning, color: "text-violet-700 bg-violet-50", onClick: () => setFilterStatus("updated_after_rejection") },
          { label: "انتهت الصلاحية",    value: stats.expired,               icon: AlertCircle,   color: "text-gray-600 bg-gray-100",      onClick: () => setFilterStatus("expired") },
          { label: "للبيع",             value: stats.forSale,               icon: Home,          color: "text-blue-700 bg-blue-50",       onClick: () => setFilterStatus("all") },
        ].map((s) => (
          <Card key={s.label} className="border-slate-200 shadow-sm cursor-pointer hover:border-teal-300 transition-colors" onClick={s.onClick}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${s.color}`}>
                <s.icon className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xl font-extrabold text-slate-900 leading-none">{s.value}</p>
                <p className="text-xs text-slate-500 mt-0.5 leading-none">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* ── Table Card ── */}
      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto flex-wrap">
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="بحث بالعنوان أو الموقع..."
                  className="ps-9"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-36"><SelectValue placeholder="نوع الصفقة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الصفقات</SelectItem>
                  {LISTING_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterKind} onValueChange={setFilterKind}>
                <SelectTrigger className="w-36"><SelectValue placeholder="نوع العقار" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأنواع</SelectItem>
                  {reCategories.length > 0
                    ? reCategories.map(c => <SelectItem key={c.id} value={c.slug ?? String(c.id)}>{c.nameAr}</SelectItem>)
                    : MAIN_CATEGORIES.map(k => <SelectItem key={k.value} value={k.value}>{k.label}</SelectItem>)
                  }
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-44"><SelectValue placeholder="الحالة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  <SelectItem value="approved">✅ منشور</SelectItem>
                  <SelectItem value="pending">⏳ قيد المراجعة</SelectItem>
                  <SelectItem value="updated_after_rejection">✏️ أُعيد إرساله</SelectItem>
                  <SelectItem value="rejected">❌ مرفوض</SelectItem>
                  <SelectItem value="expired">⏰ انتهت الصلاحية</SelectItem>
                  <SelectItem value="draft">📝 مسودة</SelectItem>
                  <SelectItem value="inactive">🔇 غير نشط</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button variant="outline" size="sm" onClick={load} disabled={loading} className="gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
                تحديث
              </Button>
              <span className="text-sm text-slate-500">{filtered.length} عقار</span>
              <Button
                size="sm"
                className="bg-teal-600 hover:bg-teal-700 text-white gap-1.5"
                onClick={() => setLocation("/admin/properties/new")}
              >
                <Plus className="w-4 h-4" /> إضافة عقار
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-50 border-b-2 border-slate-200 hover:bg-slate-50">
                  <TableHead className="w-14 text-center text-slate-500 text-xs font-bold py-3 ps-4">#</TableHead>
                  <TableHead className="min-w-[280px] text-slate-600 text-xs font-bold">العقار</TableHead>
                  <TableHead className="min-w-[130px] text-slate-600 text-xs font-bold">المالك</TableHead>
                  <TableHead className="min-w-[130px] text-slate-600 text-xs font-bold">نوع العقار</TableHead>
                  <TableHead className="min-w-[150px] text-slate-600 text-xs font-bold">السعر</TableHead>
                  <TableHead className="min-w-[110px] text-slate-600 text-xs font-bold">المنطقة</TableHead>
                  <TableHead className="min-w-[110px] text-slate-600 text-xs font-bold">تاريخ الإضافة</TableHead>
                  <TableHead className="min-w-[110px] text-slate-600 text-xs font-bold">آخر تعديل</TableHead>
                  <TableHead className="min-w-[130px] text-slate-600 text-xs font-bold">الحالة</TableHead>
                  <TableHead className="min-w-[240px] text-slate-600 text-xs font-bold text-end pe-4">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-16 text-slate-400">
                      <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-teal-500" />
                      جارٍ التحميل...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-16 text-slate-400">
                      <Building2 className="w-10 h-10 mx-auto mb-3 text-slate-200" />
                      <p className="font-semibold text-slate-500">لا توجد عقارات مطابقة</p>
                      <p className="text-xs mt-1 text-slate-400">جرّب تغيير معايير البحث أو الفلتر</p>
                    </TableCell>
                  </TableRow>
                ) : filtered.map((p) => {
                  const ownerName = providers.find(pr => pr.id === p.providerId)?.name
                    ?? p.agentName
                    ?? `#${p.providerId}`;
                  const fmtDate = (d: string | null | undefined) => {
                    if (!d) return "—";
                    return new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "short", day: "numeric" });
                  };
                  const categoryLabel = p.mainCategory === "residential" ? "سكني"
                    : p.mainCategory === "commercial" ? "تجاري"
                    : p.mainCategory === "land" ? "أراضي"
                    : p.mainCategory;
                  return (
                    <TableRow
                      key={p.id}
                      className="hover:bg-teal-50/30 transition-colors border-b border-slate-100 group"
                    >
                      {/* ID */}
                      <TableCell className="text-center ps-4">
                        <span className="text-xs font-mono font-bold text-slate-400">#{p.id}</span>
                      </TableCell>

                      {/* Image + Title */}
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-14 h-12 rounded-xl overflow-hidden border border-slate-200 shrink-0 cursor-pointer hover:ring-2 hover:ring-teal-400 transition-all"
                            onClick={() => setSelectedProp(p as unknown as ExtendedProperty)}
                          >
                            <img
                              src={getFirstImage(p.images)}
                              alt={p.title}
                              className="w-full h-full object-cover"
                              onError={(e) => { e.currentTarget.src = FALLBACK; }}
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p
                              className="font-bold text-slate-900 text-sm truncate max-w-[200px] cursor-pointer hover:text-teal-600 transition-colors leading-snug"
                              dir="rtl"
                              onClick={() => setSelectedProp(p as unknown as ExtendedProperty)}
                            >
                              {p.title}
                            </p>
                            <p className="text-xs text-slate-400 truncate max-w-[200px] mt-0.5">{p.address ?? "—"}</p>
                            {p.featured && (
                              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold text-amber-600 mt-0.5">⭐ مميز</span>
                            )}
                          </div>
                        </div>
                      </TableCell>

                      {/* Owner */}
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-teal-100 text-teal-700 flex items-center justify-center text-xs font-bold shrink-0 border border-teal-200">
                            {ownerName.charAt(0)}
                          </div>
                          <span className="text-xs text-slate-700 font-semibold truncate max-w-[90px]">{ownerName}</span>
                        </div>
                      </TableCell>

                      {/* Type */}
                      <TableCell>
                        <div className="flex flex-col gap-1">
                          <Badge variant="outline" className={`text-xs w-fit font-semibold ${p.listingType === "sale" ? "text-emerald-700 border-emerald-200 bg-emerald-50" : "text-blue-700 border-blue-200 bg-blue-50"}`}>
                            {p.listingType === "sale" ? "🏷 للبيع" : p.listingType === "rent" ? "🔑 للإيجار" : p.listingType}
                          </Badge>
                          <span className="text-[11px] text-slate-500 font-medium">{categoryLabel}</span>
                        </div>
                      </TableCell>

                      {/* Price */}
                      <TableCell>
                        <span className="text-sm font-black text-black tabular-nums">{fmtPrice(p.price)}</span>
                      </TableCell>

                      {/* District */}
                      <TableCell>
                        <span className="text-xs text-slate-600 font-medium">{(p as any).district ?? p.address?.split("،")[0] ?? "—"}</span>
                      </TableCell>

                      {/* Added date */}
                      <TableCell>
                        <span className="text-xs text-slate-500 font-medium">{fmtDate(p.createdAt)}</span>
                      </TableCell>

                      {/* Last updated */}
                      <TableCell>
                        <span className="text-xs text-slate-500 font-medium">{fmtDate(p.updatedAt)}</span>
                      </TableCell>

                      {/* Status */}
                      <TableCell>{statusBadge(p.status)}</TableCell>

                      {/* Actions */}
                      <TableCell className="pe-4">
                        <div className="flex items-center justify-end gap-1" onClick={e => e.stopPropagation()}>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-xs text-slate-600 border-slate-200 hover:bg-slate-100 gap-1 font-semibold"
                            onClick={() => setSelectedProp(p as unknown as ExtendedProperty)}
                          >
                            <Eye className="w-3 h-3" /> مشاهدة
                          </Button>
                          {(p.status === "pending" || p.status === "updated_after_rejection") && (
                            <Button
                              size="sm"
                              className="h-7 px-2.5 text-xs bg-amber-500 hover:bg-amber-600 text-white gap-1 font-semibold shadow-sm"
                              onClick={() => setLocation(`/admin/properties/${p.id}/review`)}
                            >
                              <AlertCircle className="w-3 h-3" /> مراجعة
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 px-2.5 text-xs text-teal-700 border-teal-200 hover:bg-teal-50 gap-1 font-semibold"
                            onClick={() => setLocation(`/admin/properties/${p.id}/edit`)}
                          >
                            <Pencil className="w-3 h-3" /> تعديل
                          </Button>
                          {p.status !== "approved" && p.status !== "active" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50 gap-1 font-semibold"
                              onClick={() => handleStatus(p, "approved")}
                            >
                              <CheckCircle2 className="w-3 h-3" /> موافقة
                            </Button>
                          )}
                          {p.status !== "rejected" && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-xs text-red-600 border-red-200 hover:bg-red-50 gap-1 font-semibold"
                              onClick={() => openRejectModal(p)}
                            >
                              <XCircle className="w-3 h-3" /> رفض
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className={`h-7 px-2.5 text-xs gap-1 font-semibold ${deleteConfirmId === p.id ? "bg-red-600 text-white hover:bg-red-700 hover:text-white" : "text-red-500 hover:text-red-600 hover:bg-red-50"}`}
                            onClick={() => handleDelete(p.id)}
                            title={deleteConfirmId === p.id ? "اضغط مجدداً للتأكيد" : "حذف"}
                          >
                            {deleteConfirmId === p.id ? <span className="font-black">تأكيد؟</span> : <><Trash2 className="w-3 h-3" /> حذف</>}
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Rejection Reason Modal ───────────────────────────────── */}
      <Dialog
        open={!!rejectTarget}
        onOpenChange={o => { if (!o && !rejecting) { setRejectTarget(null); } }}
      >
        <DialogContent className="max-w-lg p-0 overflow-hidden" dir="rtl">
          {/* Header */}
          <div className="bg-gradient-to-l from-red-600 to-rose-500 px-6 py-5 text-white">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <MessageSquareWarning className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-bold">رفض الإعلان مع ذكر السبب</h2>
                {rejectTarget && (
                  <p className="text-red-100 text-xs mt-0.5 truncate max-w-[280px]">{rejectTarget.title}</p>
                )}
              </div>
            </div>
          </div>

          <div className="p-5 space-y-4">
            {/* Reason chips */}
            <div>
              <p className="text-sm font-bold text-slate-700 mb-2.5 flex items-center gap-1.5">
                <AlertCircle className="w-4 h-4 text-rose-500" />
                اختر سبب الرفض (يمكن اختيار أكثر من سبب)
              </p>
              <div className="flex flex-wrap gap-2">
                {REJECT_CHIPS.map(chip => {
                  const isSelected = rejectChips.includes(chip.id);
                  return (
                    <button
                      key={chip.id}
                      type="button"
                      onClick={() =>
                        setRejectChips(prev =>
                          isSelected ? prev.filter(id => id !== chip.id) : [...prev, chip.id]
                        )
                      }
                      className={`relative flex items-center gap-1.5 text-xs font-medium px-3 py-2 rounded-xl border-2 transition-all duration-150 ${
                        isSelected
                          ? "border-rose-500 bg-rose-50 text-rose-700 shadow-sm"
                          : "border-slate-200 bg-white text-slate-600 hover:border-rose-200 hover:bg-rose-50/50"
                      }`}
                    >
                      {isSelected && (
                        <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 text-white" />
                        </span>
                      )}
                      {chip.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom note */}
            <div>
              <Label className="text-sm font-bold text-slate-700 mb-1.5 block">
                ملاحظة إضافية للمعلن <span className="font-normal text-slate-400">(اختياري)</span>
              </Label>
              <Textarea
                value={rejectNote}
                onChange={e => setRejectNote(e.target.value)}
                placeholder="أضف توضيحاً أو تفاصيل إضافية يراها المعلن في الإشعار وفي لوحة التحكم..."
                className="resize-none text-sm rounded-xl border-slate-200 focus-visible:ring-rose-400"
                rows={3}
              />
            </div>

            {/* Preview of what user will see */}
            {(rejectChips.length > 0 || rejectNote.trim()) && (
              <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                <p className="text-xs font-bold text-red-700 mb-1.5 flex items-center gap-1">
                  <Eye className="w-3.5 h-3.5" />
                  معاينة الرسالة التي سيراها المعلن:
                </p>
                <div className="text-xs text-red-800 space-y-1 leading-relaxed">
                  {rejectChips.map(id => (
                    <p key={id} className="flex items-start gap-1">
                      <span className="mt-0.5 shrink-0">•</span>
                      {REJECT_CHIPS.find(c => c.id === id)?.label}
                    </p>
                  ))}
                  {rejectNote.trim() && (
                    <p className="mt-1 pt-1 border-t border-red-100">{rejectNote.trim()}</p>
                  )}
                </div>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex gap-2.5 pt-1">
              <Button
                onClick={handleRejectConfirm}
                disabled={rejecting}
                className="flex-1 h-11 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl gap-2"
              >
                {rejecting
                  ? <><Loader2 className="w-4 h-4 animate-spin" />جاري الرفض...</>
                  : <><XCircle className="w-4 h-4" />تأكيد الرفض وإشعار المعلن</>}
              </Button>
              <Button
                variant="outline"
                onClick={() => setRejectTarget(null)}
                disabled={rejecting}
                className="h-11 px-5 rounded-xl"
              >
                إلغاء
              </Button>
            </div>

            <p className="text-xs text-center text-slate-400">
              سيصل إشعار فوري للمعلن مع أسباب الرفض في لوحة التحكم الخاصة به
            </p>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Add Dialog ── */}
      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>إضافة عقار جديد</DialogTitle>
          </DialogHeader>
          <FormFields f={form} setF={setForm} />
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setAddOpen(false)}>إلغاء</Button>
            <Button
              className="bg-teal-600 hover:bg-teal-700"
              onClick={handleAddSave}
              disabled={saving || !form.title || !form.providerId}
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin me-1" /> : <Plus className="w-4 h-4 me-1" />}
              إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* ── Property Detail Drawer ── */}
      <PropertyDetailDrawer
        property={selectedProp}
        onClose={() => setSelectedProp(null)}
        onStatusChange={handleStatusFromDrawer}
        onToggleFeatured={handleFeaturedFromDrawer}
        onDelete={handleDeleteFromDrawer}
      />

    </AdminLayout>
  );
}
