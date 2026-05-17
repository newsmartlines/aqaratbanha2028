import { useState, useMemo } from "react";
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
import { useToast } from "@/hooks/use-toast";
import {
  Search, RefreshCw, Pencil, Trash2, Eye, Star, StarOff,
  CheckCircle2, XCircle, Building2, TrendingUp, Home, Loader2,
  Plus, BedDouble, Bath, Maximize2, AlertCircle, ExternalLink,
} from "lucide-react";
import { PROPERTIES } from "@/pages/home";

type PropertyStatus = "published" | "pending" | "rejected";

type AdminProperty = typeof PROPERTIES[0] & { status: PropertyStatus };

const initialProperties: AdminProperty[] = PROPERTIES.map((p) => ({
  ...p,
  status: "published" as PropertyStatus,
}));

const KINDS = ["فيلا", "شقة", "مكتب", "دوبلكس", "أرض"];
const TYPES = ["للبيع", "للإيجار"];
const CITIES = ["الرياض", "جدة", "الدمام", "مكة المكرمة", "المدينة المنورة", "الخبر"];

const FALLBACK = "https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=200&q=60";

function statusBadge(status: PropertyStatus) {
  if (status === "published") return <Badge variant="outline" className="text-emerald-700 border-emerald-200 bg-emerald-50">منشور</Badge>;
  if (status === "pending")   return <Badge variant="outline" className="text-amber-700 border-amber-200 bg-amber-50">قيد المراجعة</Badge>;
  return <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">مرفوض</Badge>;
}

const emptyForm = {
  title: "", location: "", price: "", priceNum: 0, type: "للبيع", kind: "شقة",
  beds: 3, baths: 2, area: 150, featured: false, status: "pending" as PropertyStatus,
  description: "", img: "",
};

export default function AdminProperties() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const [properties, setProperties] = useState<AdminProperty[]>(initialProperties);
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [filterKind, setFilterKind] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [editingProp, setEditingProp] = useState<AdminProperty | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [viewProp, setViewProp] = useState<AdminProperty | null>(null);

  const filtered = useMemo(() => properties.filter((p) => {
    if (search && !p.title.includes(search) && !p.location.includes(search)) return false;
    if (filterType !== "all" && p.type !== filterType) return false;
    if (filterKind !== "all" && p.kind !== filterKind) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    return true;
  }), [properties, search, filterType, filterKind, filterStatus]);

  // Stats
  const stats = useMemo(() => ({
    total: properties.length,
    published: properties.filter(p => p.status === "published").length,
    pending: properties.filter(p => p.status === "pending").length,
    featured: properties.filter(p => p.featured).length,
    forSale: properties.filter(p => p.type === "للبيع").length,
    forRent: properties.filter(p => p.type === "للإيجار").length,
  }), [properties]);

  const update = (id: number, patch: Partial<AdminProperty>) =>
    setProperties(prev => prev.map(p => p.id === id ? { ...p, ...patch } : p));

  const handleDelete = (id: number) => {
    if (deleteConfirmId === id) {
      setProperties(prev => prev.filter(p => p.id !== id));
      setDeleteConfirmId(null);
      toast({ title: "تم الحذف", description: "تم حذف العقار بنجاح" });
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  const handleEditOpen = (p: AdminProperty) => {
    setEditingProp(p);
    setForm({
      title: p.title, location: p.location, price: p.price,
      priceNum: p.priceNum, type: p.type, kind: p.kind,
      beds: p.beds, baths: p.baths, area: p.area,
      featured: p.featured, status: p.status,
      description: p.description ?? "", img: p.img ?? "",
    });
  };

  const handleEditSave = () => {
    if (!editingProp) return;
    update(editingProp.id, { ...form });
    setEditingProp(null);
    toast({ title: "تم التعديل", description: "تم تحديث بيانات العقار بنجاح" });
  };

  const handleAddSave = () => {
    const newId = Math.max(...properties.map(p => p.id)) + 1;
    const newProp: AdminProperty = {
      ...emptyForm,
      ...form,
      id: newId,
      img: form.img || FALLBACK,
      gallery: [form.img || FALLBACK],
      videoId: "", address: form.location,
      amenities: [], agentName: "", agentPhone: "", agentAvatar: "", agentTitle: "",
      floors: 1, garage: 1, year: new Date().getFullYear(),
      lat: 24.7136, lng: 46.6753,
    };
    setProperties(prev => [newProp, ...prev]);
    setAddOpen(false);
    setForm({ ...emptyForm });
    toast({ title: "تمت الإضافة", description: "تم إضافة العقار بنجاح" });
  };

  const FormFields = ({ f, setF }: { f: typeof emptyForm; setF: (v: typeof emptyForm) => void }) => (
    <div className="grid gap-4 py-2">
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2 grid gap-1.5">
          <Label>عنوان العقار</Label>
          <Input value={f.title} onChange={e => setF({ ...f, title: e.target.value })} placeholder="فيلا فاخرة في حي النرجس" />
        </div>
        <div className="col-span-2 grid gap-1.5">
          <Label>الموقع</Label>
          <Input value={f.location} onChange={e => setF({ ...f, location: e.target.value })} placeholder="حي النرجس، الرياض" />
        </div>
        <div className="grid gap-1.5">
          <Label>السعر (نص)</Label>
          <Input value={f.price} onChange={e => setF({ ...f, price: e.target.value })} placeholder="٢,٨٠٠,٠٠٠" />
        </div>
        <div className="grid gap-1.5">
          <Label>السعر الرقمي</Label>
          <Input type="number" value={f.priceNum} onChange={e => setF({ ...f, priceNum: Number(e.target.value) })} placeholder="2800000" />
        </div>
        <div className="grid gap-1.5">
          <Label>نوع الصفقة</Label>
          <Select value={f.type} onValueChange={v => setF({ ...f, type: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>نوع العقار</Label>
          <Select value={f.kind} onValueChange={v => setF({ ...f, kind: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{KINDS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="grid gap-1.5">
          <Label>غرف النوم</Label>
          <Input type="number" min={0} value={f.beds} onChange={e => setF({ ...f, beds: Number(e.target.value) })} />
        </div>
        <div className="grid gap-1.5">
          <Label>الحمامات</Label>
          <Input type="number" min={0} value={f.baths} onChange={e => setF({ ...f, baths: Number(e.target.value) })} />
        </div>
        <div className="grid gap-1.5">
          <Label>المساحة (م²)</Label>
          <Input type="number" min={0} value={f.area} onChange={e => setF({ ...f, area: Number(e.target.value) })} />
        </div>
        <div className="grid gap-1.5">
          <Label>الحالة</Label>
          <Select value={f.status} onValueChange={v => setF({ ...f, status: v as PropertyStatus })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="published">منشور</SelectItem>
              <SelectItem value="pending">قيد المراجعة</SelectItem>
              <SelectItem value="rejected">مرفوض</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="col-span-2 grid gap-1.5">
          <Label>رابط الصورة الرئيسية</Label>
          <Input value={f.img} onChange={e => setF({ ...f, img: e.target.value })} placeholder="https://..." />
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
              {/* Search */}
              <div className="relative w-full sm:w-56">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="بحث بالعنوان أو الموقع..."
                  className="ps-9"
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              {/* Filters */}
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-36"><SelectValue placeholder="نوع الصفقة" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الصفقات</SelectItem>
                  {TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterKind} onValueChange={setFilterKind}>
                <SelectTrigger className="w-36"><SelectValue placeholder="نوع العقار" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">كل الأنواع</SelectItem>
                  {KINDS.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
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
                {filtered.length === 0 ? (
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
                          src={p.img}
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
                        <p className="text-xs text-slate-400 truncate max-w-[180px]">{p.location}</p>
                      </div>
                    </TableCell>

                    {/* Type + Kind */}
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className={`text-xs w-fit ${p.type === "للبيع" ? "text-emerald-700 border-emerald-200 bg-emerald-50" : "text-blue-700 border-blue-200 bg-blue-50"}`}>
                          {p.type}
                        </Badge>
                        <span className="text-xs text-slate-500">{p.kind}</span>
                      </div>
                    </TableCell>

                    {/* Specs */}
                    <TableCell>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        {p.beds > 0 && <span className="flex items-center gap-0.5"><BedDouble className="w-3 h-3" />{p.beds}</span>}
                        {p.baths > 0 && <span className="flex items-center gap-0.5"><Bath className="w-3 h-3" />{p.baths}</span>}
                        <span className="flex items-center gap-0.5"><Maximize2 className="w-3 h-3" />{p.area}م²</span>
                      </div>
                    </TableCell>

                    {/* Price */}
                    <TableCell>
                      <span className="text-sm font-bold text-teal-700">{p.price}</span>
                    </TableCell>

                    {/* Featured toggle */}
                    <TableCell>
                      <button
                        title={p.featured ? "إلغاء التمييز" : "تمييز العقار"}
                        onClick={() => {
                          update(p.id, { featured: !p.featured });
                          toast({ title: p.featured ? "تم إلغاء التمييز" : "تم التمييز", description: p.title });
                        }}
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
                        {/* View on site */}
                        <Button
                          variant="ghost" size="sm"
                          className="text-slate-500 hover:text-slate-700 h-8 px-2"
                          onClick={() => setLocation(`/property/${p.id}`)}
                          title="عرض في الموقع"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Button>

                        {/* Quick view */}
                        <Button
                          variant="ghost" size="sm"
                          className="text-slate-500 hover:text-blue-600 h-8 px-2"
                          onClick={() => setViewProp(p)}
                          title="معاينة سريعة"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </Button>

                        {/* Publish / Reject */}
                        {p.status !== "published" && (
                          <Button
                            variant="ghost" size="sm"
                            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 h-8 px-2"
                            onClick={() => { update(p.id, { status: "published" }); toast({ title: "تم النشر", description: p.title }); }}
                            title="نشر"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </Button>
                        )}
                        {p.status !== "rejected" && (
                          <Button
                            variant="ghost" size="sm"
                            className="text-red-500 hover:text-red-600 hover:bg-red-50 h-8 px-2"
                            onClick={() => { update(p.id, { status: "rejected" }); toast({ title: "تم الرفض", description: p.title, variant: "destructive" }); }}
                            title="رفض"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                          </Button>
                        )}

                        {/* Edit */}
                        <Button
                          variant="ghost" size="sm"
                          className="text-teal-600 hover:text-teal-700 hover:bg-teal-50 h-8 px-2"
                          onClick={() => handleEditOpen(p)}
                          title="تعديل"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>

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

      {/* ── Edit Dialog ── */}
      <Dialog open={!!editingProp} onOpenChange={open => !open && setEditingProp(null)}>
        <DialogContent className="sm:max-w-[560px] max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>تعديل العقار</DialogTitle>
          </DialogHeader>
          <FormFields f={form} setF={setForm} />
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setEditingProp(null)}>إلغاء</Button>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={handleEditSave}>حفظ التعديلات</Button>
          </DialogFooter>
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
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={handleAddSave} disabled={!form.title}>
              <Plus className="w-4 h-4 me-1" /> إضافة
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Quick View Dialog ── */}
      <Dialog open={!!viewProp} onOpenChange={open => !open && setViewProp(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="text-right">{viewProp?.title}</DialogTitle>
          </DialogHeader>
          {viewProp && (
            <div className="space-y-4" dir="rtl">
              <img
                src={viewProp.img}
                alt={viewProp.title}
                className="w-full h-52 object-cover rounded-xl"
                onError={(e) => { e.currentTarget.src = FALLBACK; }}
              />
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-0.5">نوع الصفقة</p>
                  <p className="font-bold">{viewProp.type}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-0.5">نوع العقار</p>
                  <p className="font-bold">{viewProp.kind}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-0.5">السعر</p>
                  <p className="font-bold text-teal-700">{viewProp.price} ج.م</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-0.5">المساحة</p>
                  <p className="font-bold">{viewProp.area} م²</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-0.5">الموقع</p>
                  <p className="font-bold text-xs">{viewProp.location}</p>
                </div>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500 mb-0.5">الحالة</p>
                  <div className="mt-0.5">{statusBadge(viewProp.status)}</div>
                </div>
                {viewProp.beds > 0 && (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-500 mb-0.5">الغرف</p>
                    <p className="font-bold flex items-center gap-1"><BedDouble className="w-3.5 h-3.5" />{viewProp.beds} غرفة</p>
                  </div>
                )}
                {viewProp.baths > 0 && (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-xs text-slate-500 mb-0.5">الحمامات</p>
                    <p className="font-bold flex items-center gap-1"><Bath className="w-3.5 h-3.5" />{viewProp.baths}</p>
                  </div>
                )}
              </div>
              {viewProp.description && (
                <div className="bg-slate-50 rounded-xl p-3 text-sm text-slate-600 leading-relaxed">
                  {viewProp.description}
                </div>
              )}
              <div className="flex gap-2">
                <Button
                  className="flex-1 bg-teal-600 hover:bg-teal-700 gap-2"
                  onClick={() => { setViewProp(null); setLocation(`/property/${viewProp.id}`); }}
                >
                  <ExternalLink className="w-4 h-4" /> عرض في الموقع
                </Button>
                <Button variant="outline" className="flex-1 gap-2" onClick={() => { setViewProp(null); handleEditOpen(viewProp); }}>
                  <Pencil className="w-4 h-4" /> تعديل
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
