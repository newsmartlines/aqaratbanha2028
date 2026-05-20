import { useState, useEffect, useMemo } from "react";
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
  Search, RefreshCw, Pencil, Trash2, Eye, Star, StarOff,
  CheckCircle2, XCircle, Building2, TrendingUp, Home, Loader2,
  Plus, BedDouble, Bath, Maximize2, AlertCircle, ExternalLink,
} from "lucide-react";
import { api, type Category } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";

type DbProperty = {
  id: number;
  providerId: number;
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
  address: string | null;
  images: string | null;
  phone: string | null;
  whatsapp: string | null;
  latitude: string | null;
  longitude: string | null;
  createdAt: string;
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
  return n.toLocaleString("ar-EG") + " ج.م";
}

function statusBadge(status: string) {
  if (status === "published") return <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">منشور</Badge>;
  if (status === "pending")   return <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50">قيد المراجعة</Badge>;
  return <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">مرفوض</Badge>;
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
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterKind, setFilterKind] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [providers, setProviders] = useState<{ id: number; name: string }[]>([]);

  const { data: reCategories = [] } = useQuery<Category[]>({
    queryKey: ["re-categories"],
    queryFn: () => api.categories.listByType("real_estate"),
    staleTime: 5 * 60 * 1000,
  });

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.properties.list();
      setProperties(data as unknown as DbProperty[]);
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
    published: properties.filter(p => p.status === "published").length,
    pending: properties.filter(p => p.status === "pending").length,
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

  const handleStatus = async (p: DbProperty, status: string) => {
    try {
      await api.properties.patchStatus(p.id, status);
      setProperties(prev => prev.map(x => x.id === p.id ? { ...x, status } : x));
      toast.success(status === "published" ? `تم نشر: ${p.title}` : `تم رفض: ${p.title}`);
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
        status: "published",
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

  return (
    <AdminLayout title="إدارة العقارات">

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
        {[
          { label: "إجمالي العقارات", value: stats.total, icon: Building2, color: "text-slate-700 bg-slate-100" },
          { label: "منشور", value: stats.published, icon: CheckCircle2, color: "text-emerald-700 bg-emerald-50" },
          { label: "قيد المراجعة", value: stats.pending, icon: AlertCircle, color: "text-amber-700 bg-amber-50" },
          { label: "مميز", value: stats.featured, icon: Star, color: "text-yellow-700 bg-yellow-50" },
          { label: "للبيع", value: stats.forSale, icon: Home, color: "text-blue-700 bg-blue-50" },
          { label: "للإيجار", value: stats.forRent, icon: TrendingUp, color: "text-purple-700 bg-purple-50" },
        ].map((s) => (
          <Card key={s.label} className="border-slate-200 shadow-sm">
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
                <SelectTrigger className="w-36"><SelectValue placeholder="الحالة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الحالات</SelectItem>
                  <SelectItem value="published">منشور</SelectItem>
                  <SelectItem value="pending">قيد المراجعة</SelectItem>
                  <SelectItem value="rejected">مرفوض</SelectItem>
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
                onClick={() => { setForm({ ...emptyForm }); setAddOpen(true); }}
              >
                <Plus className="w-4 h-4" /> إضافة عقار
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <div className="rounded-lg border border-slate-200 overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50">
                <TableRow>
                  <TableHead className="w-14">صورة</TableHead>
                  <TableHead>العقار</TableHead>
                  <TableHead>النوع</TableHead>
                  <TableHead>التفاصيل</TableHead>
                  <TableHead>السعر</TableHead>
                  <TableHead>مميز</TableHead>
                  <TableHead>الحالة</TableHead>
                  <TableHead className="text-end">الإجراءات</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                      <Loader2 className="w-6 h-6 mx-auto mb-2 animate-spin text-teal-500" />
                      جارٍ التحميل...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12 text-slate-400">
                      <Building2 className="w-10 h-10 mx-auto mb-2 text-slate-200" />
                      لا توجد عقارات مطابقة
                    </TableCell>
                  </TableRow>
                ) : filtered.map((p) => (
                  <TableRow key={p.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* Image */}
                    <TableCell>
                      <div className="w-12 h-10 rounded-lg overflow-hidden border border-slate-200 shrink-0">
                        <img
                          src={getFirstImage(p.images)}
                          alt={p.title}
                          className="w-full h-full object-cover"
                          onError={(e) => { e.currentTarget.src = FALLBACK; }}
                        />
                      </div>
                    </TableCell>

                    {/* Title + Location */}
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900 text-sm truncate max-w-[180px]" dir="rtl">{p.title}</p>
                        <p className="text-xs text-slate-400 truncate max-w-[180px]">{p.address ?? "—"}</p>
                      </div>
                    </TableCell>

                    {/* Type + Kind */}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className={`text-xs w-fit ${p.listingType === "sale" ? "text-emerald-700 border-emerald-200 bg-emerald-50" : "text-blue-700 border-blue-200 bg-blue-50"}`}>
                          {p.listingType === "sale" ? "للبيع" : p.listingType === "rent" ? "للإيجار" : p.listingType}
                        </Badge>
                        <span className="text-xs text-slate-500">{p.mainCategory}</span>
                      </div>
                    </TableCell>

                    {/* Specs */}
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        {(p.rooms ?? 0) > 0 && <span className="flex items-center gap-0.5"><BedDouble className="w-3 h-3" />{p.rooms}</span>}
                        {(p.bathrooms ?? 0) > 0 && <span className="flex items-center gap-0.5"><Bath className="w-3 h-3" />{p.bathrooms}</span>}
                        {p.area && <span className="flex items-center gap-0.5"><Maximize2 className="w-3 h-3" />{parseFloat(p.area)}م²</span>}
                      </div>
                    </TableCell>

                    {/* Price */}
                    <TableCell>
                      <span className="text-sm font-bold text-teal-700">{fmtPrice(p.price)}</span>
                    </TableCell>

                    {/* Featured toggle */}
                    <TableCell>
                      <button
                        title={p.featured ? "إلغاء التمييز" : "تمييز العقار"}
                        onClick={() => handleToggleFeatured(p)}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${p.featured ? "bg-amber-100 text-amber-500 hover:bg-amber-200" : "bg-slate-100 text-slate-400 hover:bg-amber-50 hover:text-amber-400"}`}
                      >
                        {p.featured ? <Star className="w-4 h-4 fill-amber-400" /> : <StarOff className="w-4 h-4" />}
                      </button>
                    </TableCell>

                    {/* Status */}
                    <TableCell>{statusBadge(p.status)}</TableCell>

                    {/* Actions */}
                    <TableCell>
                      <div className="flex items-center justify-end gap-1 flex-wrap">

                        {/* View in site — opens new tab */}
                        <Button
                          variant="ghost" size="sm"
                          className="text-blue-500 hover:text-blue-700 hover:bg-blue-50 h-8 px-2"
                          onClick={() => window.open(`/property/${p.id}`, "_blank")}
                          title="معاينة الإعلان في صفحة جديدة"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>

                        {/* Edit — opens admin edit page in new tab */}
                        <Button
                          variant="ghost" size="sm"
                          className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 h-8 px-2"
                          onClick={() => window.open(`/admin/properties/${p.id}/edit`, "_blank")}
                          title="تعديل في صفحة جديدة"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>

                        {/* Publish */}
                        {p.status !== "published" && (
                          <Button
                            variant="ghost" size="sm"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8 px-2"
                            onClick={() => handleStatus(p, "published")}
                            title="نشر"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {/* Reject */}
                        {p.status !== "rejected" && (
                          <Button
                            variant="ghost" size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2"
                            onClick={() => handleStatus(p, "rejected")}
                            title="رفض"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {/* Delete */}
                        <Button
                          variant="ghost" size="sm"
                          className={`h-8 px-2 ${deleteConfirmId === p.id ? "bg-red-600 text-white hover:bg-red-700" : "text-red-500 hover:text-red-600 hover:bg-red-50"}`}
                          onClick={() => handleDelete(p.id)}
                          title={deleteConfirmId === p.id ? "اضغط مجدداً للتأكيد" : "حذف"}
                        >
                          {deleteConfirmId === p.id ? <span className="text-xs font-bold">تأكيد؟</span> : <Trash2 className="w-3.5 h-3.5" />}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
    </AdminLayout>
  );
}
