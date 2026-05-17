import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Plus, Pencil, Trash2, ChevronRight, ChevronDown, Tag, Loader2, RefreshCw, Building2, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { api, type Category, type Subcategory } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";

const ICON_OPTIONS = [
  "Home", "Building2", "Building", "Warehouse", "Store", "Hotel",
  "Landmark", "MapPin", "Layers", "Grid", "Package", "Tag",
  "Trees", "Mountain", "Sunset", "Hammer", "Factory",
];

const REAL_ESTATE_PRESETS = [
  {
    nameAr: "سكني",
    nameEn: "Residential",
    icon: "Home",
    slug: "re-residential",
    description: "العقارات السكنية",
    subcategories: [
      { nameAr: "شقة", nameEn: "Apartment", icon: "Building2", slug: "re-apartment" },
      { nameAr: "فيلا", nameEn: "Villa", icon: "Home", slug: "re-villa" },
      { nameAr: "دوبلكس", nameEn: "Duplex", icon: "Layers", slug: "re-duplex" },
      { nameAr: "استوديو", nameEn: "Studio", icon: "Home", slug: "re-studio" },
      { nameAr: "شاليه", nameEn: "Chalet", icon: "Sunset", slug: "re-chalet" },
      { nameAr: "غرفة مفردة", nameEn: "Single Room", icon: "Tag", slug: "re-single-room" },
    ],
  },
  {
    nameAr: "تجاري",
    nameEn: "Commercial",
    icon: "Store",
    slug: "re-commercial",
    description: "العقارات التجارية",
    subcategories: [
      { nameAr: "محل تجاري", nameEn: "Shop", icon: "Store", slug: "re-shop" },
      { nameAr: "مكتب", nameEn: "Office", icon: "Building", slug: "re-office" },
      { nameAr: "مستودع", nameEn: "Warehouse", icon: "Warehouse", slug: "re-warehouse" },
      { nameAr: "عمارة تجارية", nameEn: "Commercial Building", icon: "Building2", slug: "re-commercial-building" },
      { nameAr: "معرض", nameEn: "Showroom", icon: "Layers", slug: "re-showroom" },
    ],
  },
  {
    nameAr: "أراضي",
    nameEn: "Land",
    icon: "MapPin",
    slug: "re-land",
    description: "الأراضي والقطع",
    subcategories: [
      { nameAr: "أرض سكنية", nameEn: "Residential Land", icon: "Home", slug: "re-land-residential" },
      { nameAr: "أرض تجارية", nameEn: "Commercial Land", icon: "Store", slug: "re-land-commercial" },
      { nameAr: "أرض زراعية", nameEn: "Agricultural Land", icon: "Trees", slug: "re-land-agricultural" },
      { nameAr: "أرض صناعية", nameEn: "Industrial Land", icon: "Factory", slug: "re-land-industrial" },
    ],
  },
  {
    nameAr: "صناعي",
    nameEn: "Industrial",
    icon: "Factory",
    slug: "re-industrial",
    description: "العقارات الصناعية",
    subcategories: [
      { nameAr: "مصنع", nameEn: "Factory", icon: "Factory", slug: "re-factory" },
      { nameAr: "مستودع صناعي", nameEn: "Industrial Warehouse", icon: "Warehouse", slug: "re-industrial-warehouse" },
      { nameAr: "ورشة", nameEn: "Workshop", icon: "Hammer", slug: "re-workshop" },
    ],
  },
];

const emptyCat = { nameAr: "", nameEn: "", icon: "Home", slug: "", description: "", image: "" };
const emptySub = { nameAr: "", nameEn: "", icon: "Tag", slug: "" };

export default function AdminRealEstateCategories() {
  const { toast: toastLib } = useToast();
  const queryClient = useQueryClient();
  const { lang } = useLanguage();

  const [catModal, setCatModal] = useState<{ open: boolean; mode: "add" | "edit"; data: Partial<Category> }>({ open: false, mode: "add", data: emptyCat });
  const [subModal, setSubModal] = useState<{ open: boolean; mode: "add" | "edit"; categoryId: number; data: Partial<Subcategory> }>({ open: false, mode: "add", categoryId: 0, data: emptySub });
  const [deleteTarget, setDeleteTarget] = useState<{ type: "category" | "subcategory"; id: number; name: string } | null>(null);
  const [expandedCats, setExpandedCats] = useState<Set<number>>(new Set());
  const [seeding, setSeeding] = useState(false);

  const { data: allCategories = [], isLoading } = useQuery({
    queryKey: ["re-categories"],
    queryFn: () => api.categories.listByType("real_estate"),
  });

  const { data: allSubs = [] } = useQuery({
    queryKey: ["re-subcategories"],
    queryFn: api.subcategories.list,
  });

  const reCategories = allCategories;
  const catSubs = (catId: number) => allSubs.filter((s) => s.categoryId === catId);

  const invalidate = async () => {
    await queryClient.invalidateQueries({ queryKey: ["re-categories"] });
    await queryClient.invalidateQueries({ queryKey: ["re-subcategories"] });
  };

  const createCat = useMutation({
    mutationFn: (d: typeof emptyCat) =>
      api.categories.create({ nameAr: d.nameAr, nameEn: d.nameEn, icon: d.icon, slug: d.slug, description: d.description, image: d.image, type: "real_estate" }),
    onSuccess: async () => { await invalidate(); toast.success("تمت إضافة التصنيف العقاري"); setCatModal((m) => ({ ...m, open: false })); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateCat = useMutation({
    mutationFn: ({ id, d }: { id: number; d: Partial<Category> }) => api.categories.update(id, { ...d, type: "real_estate" }),
    onSuccess: async () => { await invalidate(); toast.success("تم تحديث التصنيف"); setCatModal((m) => ({ ...m, open: false })); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCat = useMutation({
    mutationFn: (id: number) => api.categories.delete(id),
    onSuccess: async () => { await invalidate(); toast.success("تم حذف التصنيف"); setDeleteTarget(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const createSub = useMutation({
    mutationFn: ({ catId, d }: { catId: number; d: typeof emptySub }) =>
      api.subcategories.create(catId, { nameAr: d.nameAr, nameEn: d.nameEn, icon: d.icon, slug: d.slug }),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["re-subcategories"] }); toast.success("تمت إضافة التصنيف الفرعي"); setSubModal((m) => ({ ...m, open: false })); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateSub = useMutation({
    mutationFn: ({ id, d }: { id: number; d: Partial<Subcategory> }) => api.subcategories.update(id, d),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["re-subcategories"] }); toast.success("تم تحديث التصنيف الفرعي"); setSubModal((m) => ({ ...m, open: false })); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteSub = useMutation({
    mutationFn: (id: number) => api.subcategories.delete(id),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ["re-subcategories"] }); toast.success("تم حذف التصنيف الفرعي"); setDeleteTarget(null); },
    onError: (e: Error) => toast.error(e.message),
  });

  const handleSeedPresets = async () => {
    setSeeding(true);
    try {
      for (const preset of REAL_ESTATE_PRESETS) {
        const existing = reCategories.find((c) => c.slug === preset.slug);
        let catId: number;
        if (!existing) {
          const newCat = await api.categories.create({ nameAr: preset.nameAr, nameEn: preset.nameEn, icon: preset.icon, slug: preset.slug, description: preset.description, image: "", type: "real_estate" });
          catId = newCat.id;
        } else {
          catId = existing.id;
        }
        const existingSubs = catSubs(catId);
        for (const sub of preset.subcategories) {
          if (!existingSubs.find((s) => s.slug === sub.slug)) {
            await api.subcategories.create(catId, { nameAr: sub.nameAr, nameEn: sub.nameEn, icon: sub.icon, slug: sub.slug });
          }
        }
      }
      await invalidate();
      toast.success("تمت إضافة التصنيفات العقارية الافتراضية بنجاح");
    } catch (e) {
      toast.error("فشل في إضافة بعض التصنيفات");
    } finally {
      setSeeding(false);
    }
  };

  const openAddCat = () => setCatModal({ open: true, mode: "add", data: { ...emptyCat } });
  const openEditCat = (c: Category) => setCatModal({ open: true, mode: "edit", data: { ...c } });
  const openAddSub = (catId: number) => setSubModal({ open: true, mode: "add", categoryId: catId, data: { ...emptySub } });
  const openEditSub = (s: Subcategory) => setSubModal({ open: true, mode: "edit", categoryId: s.categoryId, data: { ...s } });
  const toggleExpand = (id: number) => setExpandedCats((prev) => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });

  const submitCat = () => {
    const d = catModal.data as typeof emptyCat;
    if (!d.nameAr || !d.nameEn || !d.slug) { toast.error("يرجى تعبئة الحقول المطلوبة"); return; }
    if (catModal.mode === "add") createCat.mutate(d);
    else updateCat.mutate({ id: (catModal.data as Category).id, d });
  };

  const submitSub = () => {
    const d = subModal.data as typeof emptySub;
    if (!d.nameAr || !d.nameEn || !d.slug) { toast.error("يرجى تعبئة الحقول المطلوبة"); return; }
    if (subModal.mode === "add") createSub.mutate({ catId: subModal.categoryId, d });
    else updateSub.mutate({ id: (subModal.data as Subcategory).id, d });
  };

  const totalSubs = reCategories.reduce((acc, c) => acc + catSubs(c.id).length, 0);

  return (
    <AdminLayout title="التصنيفات العقارية">
      <div className="space-y-4">
        {reCategories.length === 0 && !isLoading && (
          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-5">
              <div className="flex items-center gap-3">
                <Building2 className="w-8 h-8 text-amber-600" />
                <div>
                  <p className="font-semibold text-amber-900">لا توجد تصنيفات عقارية بعد</p>
                  <p className="text-sm text-amber-700">يمكنك إضافة التصنيفات يدوياً أو استخدام التصنيفات الافتراضية الجاهزة</p>
                </div>
              </div>
              <Button
                onClick={handleSeedPresets}
                disabled={seeding}
                className="bg-amber-600 hover:bg-amber-700 text-white shrink-0"
              >
                {seeding ? <Loader2 className="w-4 h-4 me-2 animate-spin" /> : <Sparkles className="w-4 h-4 me-2" />}
                إضافة التصنيفات الافتراضية
              </Button>
            </CardContent>
          </Card>
        )}

        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-teal-600" />
                التصنيفات العقارية
              </CardTitle>
              <p className="text-sm text-slate-500 mt-1">
                {reCategories.length} تصنيف رئيسي · {totalSubs} تصنيف فرعي
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={invalidate}>
                <RefreshCw className="w-4 h-4 me-1" /> تحديث
              </Button>
              {reCategories.length > 0 && (
                <Button variant="outline" size="sm" onClick={handleSeedPresets} disabled={seeding} className="text-amber-600 border-amber-300 hover:bg-amber-50">
                  {seeding ? <Loader2 className="w-4 h-4 me-1 animate-spin" /> : <Sparkles className="w-4 h-4 me-1" />}
                  إضافة الافتراضية
                </Button>
              )}
              <Button onClick={openAddCat} className="bg-teal-600 hover:bg-teal-700">
                <Plus className="w-4 h-4 me-2" /> إضافة تصنيف
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>
            ) : (
              <div className="rounded-md border border-slate-200">
                <Table>
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead className="w-8"></TableHead>
                      <TableHead>الاسم بالعربي</TableHead>
                      <TableHead>الاسم بالإنجليزي</TableHead>
                      <TableHead>الأيقونة</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>التصنيفات الفرعية</TableHead>
                      <TableHead className="text-end">الإجراءات</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reCategories.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center text-slate-400 py-12">
                          <Building2 className="w-8 h-8 mx-auto mb-2 opacity-30" />
                          <p>لا توجد تصنيفات عقارية</p>
                        </TableCell>
                      </TableRow>
                    ) : (
                      reCategories.map((c) => {
                        const subs = catSubs(c.id);
                        const expanded = expandedCats.has(c.id);
                        return (
                          <React.Fragment key={c.id}>
                            <TableRow className="cursor-pointer hover:bg-slate-50">
                              <TableCell>
                                <button onClick={() => toggleExpand(c.id)} className="text-slate-400 hover:text-slate-700">
                                  {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                </button>
                              </TableCell>
                              <TableCell className="font-medium" dir="rtl">{c.nameAr}</TableCell>
                              <TableCell dir="ltr">{c.nameEn}</TableCell>
                              <TableCell><Badge variant="outline" className="text-xs">{c.icon}</Badge></TableCell>
                              <TableCell className="font-mono text-xs text-slate-500">{c.slug}</TableCell>
                              <TableCell>
                                <Badge variant="secondary" className="bg-teal-50 text-teal-700 border-teal-200">
                                  {subs.length} فرعي
                                </Badge>
                              </TableCell>
                              <TableCell className="text-end">
                                <div className="flex justify-end gap-1">
                                  <Button variant="ghost" size="sm" onClick={() => openAddSub(c.id)} className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 text-xs">
                                    <Plus className="w-3 h-3 me-1" /> إضافة فرعي
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => openEditCat(c)} className="text-teal-600 hover:text-teal-700 hover:bg-teal-50">
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                  <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ type: "category", id: c.id, name: lang === "ar" ? c.nameAr : c.nameEn })} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                            {expanded && subs.map((sub) => (
                              <TableRow key={`sub-${sub.id}`} className="bg-teal-50/30 border-b border-dashed">
                                <TableCell></TableCell>
                                <TableCell className="ps-8">
                                  <div className="flex items-center gap-2">
                                    <Tag className="w-3 h-3 text-teal-400" />
                                    <span className="text-sm" dir="rtl">{sub.nameAr}</span>
                                  </div>
                                </TableCell>
                                <TableCell className="text-sm text-slate-600" dir="ltr">{sub.nameEn}</TableCell>
                                <TableCell><Badge variant="outline" className="text-xs">{sub.icon}</Badge></TableCell>
                                <TableCell className="font-mono text-xs text-slate-400">{sub.slug}</TableCell>
                                <TableCell></TableCell>
                                <TableCell className="text-end">
                                  <div className="flex justify-end gap-1">
                                    <Button variant="ghost" size="sm" onClick={() => openEditSub(sub)} className="text-teal-600 hover:text-teal-700 hover:bg-teal-50">
                                      <Pencil className="w-4 h-4" />
                                    </Button>
                                    <Button variant="ghost" size="sm" onClick={() => setDeleteTarget({ type: "subcategory", id: sub.id, name: lang === "ar" ? sub.nameAr : sub.nameEn })} className="text-red-500 hover:text-red-600 hover:bg-red-50">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                          </React.Fragment>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Modal */}
      <Dialog open={catModal.open} onOpenChange={(o) => setCatModal((m) => ({ ...m, open: o }))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{catModal.mode === "add" ? "إضافة تصنيف عقاري" : "تعديل التصنيف العقاري"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>الاسم بالعربي *</Label>
                <Input dir="rtl" value={catModal.data.nameAr ?? ""} onChange={(e) => setCatModal((m) => ({ ...m, data: { ...m.data, nameAr: e.target.value } }))} placeholder="مثال: سكني" />
              </div>
              <div className="space-y-1">
                <Label>الاسم بالإنجليزي *</Label>
                <Input dir="ltr" value={catModal.data.nameEn ?? ""} onChange={(e) => setCatModal((m) => ({ ...m, data: { ...m.data, nameEn: e.target.value } }))} placeholder="e.g. Residential" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Slug *</Label>
                <Input dir="ltr" value={catModal.data.slug ?? ""} onChange={(e) => setCatModal((m) => ({ ...m, data: { ...m.data, slug: e.target.value } }))} placeholder="e.g. re-residential" />
              </div>
              <div className="space-y-1">
                <Label>الأيقونة</Label>
                <select className="w-full h-9 rounded-md border border-input px-3 text-sm bg-background" value={catModal.data.icon ?? "Home"} onChange={(e) => setCatModal((m) => ({ ...m, data: { ...m.data, icon: e.target.value } }))}>
                  {ICON_OPTIONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                </select>
              </div>
            </div>
            <div className="space-y-1">
              <Label>الوصف</Label>
              <Textarea rows={2} value={catModal.data.description ?? ""} onChange={(e) => setCatModal((m) => ({ ...m, data: { ...m.data, description: e.target.value } }))} placeholder="وصف مختصر للتصنيف..." />
            </div>
            <div className="space-y-1">
              <Label>رابط الصورة</Label>
              <Input dir="ltr" value={catModal.data.image ?? ""} onChange={(e) => setCatModal((m) => ({ ...m, data: { ...m.data, image: e.target.value } }))} placeholder="https://..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCatModal((m) => ({ ...m, open: false }))}>إلغاء</Button>
            <Button onClick={submitCat} disabled={createCat.isPending || updateCat.isPending} className="bg-teal-600 hover:bg-teal-700">
              {(createCat.isPending || updateCat.isPending) && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {catModal.mode === "add" ? "إضافة التصنيف" : "حفظ التغييرات"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subcategory Modal */}
      <Dialog open={subModal.open} onOpenChange={(o) => setSubModal((m) => ({ ...m, open: o }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {subModal.mode === "add" ? "إضافة تصنيف فرعي" : "تعديل التصنيف الفرعي"}
              {subModal.mode === "add" && (
                <span className="block text-sm font-normal text-slate-500 mt-1">
                  تحت: {reCategories.find((c) => c.id === subModal.categoryId)?.[lang === "ar" ? "nameAr" : "nameEn"]}
                </span>
              )}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>الاسم بالعربي *</Label>
                <Input dir="rtl" value={subModal.data.nameAr ?? ""} onChange={(e) => setSubModal((m) => ({ ...m, data: { ...m.data, nameAr: e.target.value } }))} placeholder="مثال: شقة" />
              </div>
              <div className="space-y-1">
                <Label>الاسم بالإنجليزي *</Label>
                <Input dir="ltr" value={subModal.data.nameEn ?? ""} onChange={(e) => setSubModal((m) => ({ ...m, data: { ...m.data, nameEn: e.target.value } }))} placeholder="e.g. Apartment" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label>Slug *</Label>
                <Input dir="ltr" value={subModal.data.slug ?? ""} onChange={(e) => setSubModal((m) => ({ ...m, data: { ...m.data, slug: e.target.value } }))} placeholder="e.g. re-apartment" />
              </div>
              <div className="space-y-1">
                <Label>الأيقونة</Label>
                <select className="w-full h-9 rounded-md border border-input px-3 text-sm bg-background" value={subModal.data.icon ?? "Tag"} onChange={(e) => setSubModal((m) => ({ ...m, data: { ...m.data, icon: e.target.value } }))}>
                  {ICON_OPTIONS.map((ic) => <option key={ic} value={ic}>{ic}</option>)}
                </select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubModal((m) => ({ ...m, open: false }))}>إلغاء</Button>
            <Button onClick={submitSub} disabled={createSub.isPending || updateSub.isPending} className="bg-teal-600 hover:bg-teal-700">
              {(createSub.isPending || updateSub.isPending) && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {subModal.mode === "add" ? "إضافة" : "حفظ"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {deleteTarget?.type === "category" ? "حذف التصنيف العقاري؟" : "حذف التصنيف الفرعي؟"}
            </AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف <strong>"{deleteTarget?.name}"</strong>؟
              {deleteTarget?.type === "category" && " سيتم حذف جميع التصنيفات الفرعية أيضاً."}
              {" "}لا يمكن التراجع عن هذا الإجراء.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (!deleteTarget) return;
                if (deleteTarget.type === "category") deleteCat.mutate(deleteTarget.id);
                else deleteSub.mutate(deleteTarget.id);
              }}
            >
              حذف
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
