import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MapPin, Building2, Plus, Pencil, Trash2, Eye, EyeOff,
  Search, Loader2, ChevronRight
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { api, type City, type Region } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function AdminLocations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<"regions" | "cities">("regions");
  const [citySearch, setCitySearch] = useState("");
  const [filterRegionId, setFilterRegionId] = useState<string>("all");
  const [expandedRegions, setExpandedRegions] = useState<Set<number>>(new Set());

  // City modal
  const [cityModal, setCityModal] = useState<{ open: boolean; city?: City }>({ open: false });
  const [cityForm, setCityForm] = useState({ regionId: "", nameAr: "", nameEn: "" });

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{ type: "city"; id: number; name: string } | null>(null);

  const [regionModal, setRegionModal] = useState<{ open: boolean; region?: Region }>({ open: false });
  const [regionForm, setRegionForm] = useState({ nameAr: "", nameEn: "", order: "0" });

  const { data: regions = [], isLoading: regionsLoading } = useQuery({
    queryKey: ["admin-regions"],
    queryFn: api.locations.admin.allRegions,
  });

  const { data: cities = [], isLoading: citiesLoading } = useQuery({
    queryKey: ["admin-cities"],
    queryFn: api.locations.admin.allCities,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-regions"] });
    qc.invalidateQueries({ queryKey: ["admin-cities"] });
  };

  // City mutations
  const createCity = useMutation({
    mutationFn: api.locations.admin.createCity,
    onSuccess: () => { invalidate(); setCityModal({ open: false }); toast({ title: "تمت الإضافة", description: "تمت إضافة المدينة بنجاح" }); },
  });
  const updateCity = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.locations.admin.updateCity(id, data),
    onSuccess: () => { invalidate(); setCityModal({ open: false }); toast({ title: "تم التحديث", description: "تم تحديث المدينة بنجاح" }); },
  });
  const toggleCity = useMutation({
    mutationFn: api.locations.admin.toggleCity,
    onSuccess: () => invalidate(),
  });
  const deleteCity = useMutation({
    mutationFn: api.locations.admin.deleteCity,
    onSuccess: () => { invalidate(); setDeleteTarget(null); toast({ title: "تم الحذف" }); },
  });

  const createRegion = useMutation({
    mutationFn: api.locations.admin.createRegion,
    onSuccess: () => {
      invalidate();
      setRegionModal({ open: false });
      toast({ title: "تمت الإضافة", description: "تم إنشاء المنطقة" });
    },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });
  const updateRegion = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Record<string, unknown> }) => api.locations.admin.updateRegion(id, data),
    onSuccess: () => {
      invalidate();
      setRegionModal({ open: false });
      toast({ title: "تم التحديث" });
    },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });

  const openCityCreate = (presetRegionId?: number) => {
    setCityForm({ regionId: presetRegionId ? String(presetRegionId) : "", nameAr: "", nameEn: "" });
    setCityModal({ open: true });
  };
  const openCityEdit = (city: City) => {
    setCityForm({ regionId: String(city.regionId), nameAr: city.nameAr, nameEn: city.nameEn });
    setCityModal({ open: true, city });
  };
  const submitCity = () => {
    const data = { regionId: Number(cityForm.regionId), nameAr: cityForm.nameAr, nameEn: cityForm.nameEn || cityForm.nameAr };
    if (cityModal.city) updateCity.mutate({ id: cityModal.city.id, data });
    else createCity.mutate(data);
  };

  const toggleRegionExpanded = (id: number) => {
    setExpandedRegions(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const openRegionCreate = () => {
    setRegionForm({ nameAr: "", nameEn: "", order: "0" });
    setRegionModal({ open: true });
  };
  const openRegionEdit = (r: Region) => {
    setRegionForm({ nameAr: r.nameAr, nameEn: r.nameEn, order: String(r.order ?? 0) });
    setRegionModal({ open: true, region: r });
  };
  const submitRegion = () => {
    const payload = {
      nameAr: regionForm.nameAr.trim(),
      nameEn: (regionForm.nameEn || regionForm.nameAr).trim(),
      order: parseInt(regionForm.order, 10) || 0,
    };
    if (regionModal.region) updateRegion.mutate({ id: regionModal.region.id, data: payload });
    else createRegion.mutate(payload);
  };

  // Filtered cities
  const filteredCities = cities.filter(c => {
    const matchSearch = c.nameAr.includes(citySearch) || c.nameEn.toLowerCase().includes(citySearch.toLowerCase());
    const matchRegion = filterRegionId === "all" || c.regionId === Number(filterRegionId);
    return matchSearch && matchRegion;
  });

  const getCityName = (cityId: number) => cities.find(c => c.id === cityId)?.nameAr ?? "—";
  const getRegionName = (regionId: number) => regions.find(r => r.id === regionId)?.nameAr ?? "—";

  const isMutating =
    createCity.isPending ||
    updateCity.isPending ||
    createRegion.isPending ||
    updateRegion.isPending;

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">إدارة المواقع الجغرافية</h1>
            <p className="text-muted-foreground mt-1">إدارة المناطق والمدن</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { label: "المناطق", value: regions.length, icon: ChevronRight, color: "text-indigo-600 bg-indigo-50" },
            { label: "المدن", value: cities.length, icon: Building2, color: "text-teal-600 bg-teal-50" },
          ].map(card => (
            <div key={card.label} className="bg-white dark:bg-card rounded-xl border border-border p-5 flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.color}`}>
                <card.icon className="w-6 h-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{card.value}</p>
                <p className="text-sm text-muted-foreground">{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "regions" | "cities")}>
          <TabsList className="mb-4 flex flex-wrap">
            <TabsTrigger value="regions" className="gap-2">
              <MapPin className="w-4 h-4" /> المناطق ({regions.length})
            </TabsTrigger>
            <TabsTrigger value="cities" className="gap-2">
              <Building2 className="w-4 h-4" /> المدن ({cities.length})
            </TabsTrigger>
          </TabsList>

          {/* ── REGIONS TAB ─────────────────────────────── */}
          <TabsContent value="regions">
            <div className="bg-white dark:bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex justify-between items-center">
                <p className="text-sm text-muted-foreground">إظهار/إخفاء المنطقة في الواجهة العامة (قائمة التسجيل والبحث)</p>
                <Button onClick={openRegionCreate} className="gap-2 shrink-0">
                  <Plus className="w-4 h-4" /> إضافة منطقة
                </Button>
              </div>
              {regionsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {regions.map((r) => (
                    <div key={r.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                      <div className="flex items-center gap-3 min-w-0">
                        <Badge variant="outline" className="shrink-0">#{r.id}</Badge>
                        <div className="min-w-0">
                          <p className="font-semibold truncate">{r.nameAr}</p>
                          <p className="text-xs text-muted-foreground truncate">{r.nameEn}</p>
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-4 sm:gap-6">
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground whitespace-nowrap">في الواجهة</span>
                          <Switch
                            checked={r.enabled}
                            onCheckedChange={(on) => updateRegion.mutate({ id: r.id, data: { enabled: on } })}
                            disabled={updateRegion.isPending}
                          />
                        </div>
                        <Button variant="outline" size="sm" className="gap-1 text-teal-700 border-teal-200 hover:bg-teal-50" onClick={() => openCityCreate(r.id)}>
                          <Plus className="w-4 h-4" /> مدينة
                        </Button>
                        <Button variant="outline" size="sm" className="gap-1" onClick={() => openRegionEdit(r)}>
                          <Pencil className="w-4 h-4" /> تعديل
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── CITIES TAB ─────────────────────────────── */}
          <TabsContent value="cities">
            <div className="bg-white dark:bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex flex-1 gap-3 items-center">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="ابحث عن مدينة..."
                      className="pr-9"
                      value={citySearch}
                      onChange={e => setCitySearch(e.target.value)}
                    />
                  </div>
                  <Select value={filterRegionId} onValueChange={setFilterRegionId}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="كل المناطق" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل المناطق</SelectItem>
                      {regions.map(r => (
                        <SelectItem key={r.id} value={String(r.id)}>{r.nameAr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => openCityCreate()} className="gap-2 shrink-0">
                  <Plus className="w-4 h-4" /> إضافة مدينة
                </Button>
              </div>

              {citiesLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredCities.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">لا توجد مدن تطابق البحث</div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredCities.map(city => (
                    <div key={city.id} className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{city.nameAr}</span>
                          {!city.enabled && (
                            <Badge variant="secondary" className="text-xs">معطّل</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {getRegionName(city.regionId)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          title={city.enabled ? "تعطيل" : "تفعيل"}
                          onClick={() => toggleCity.mutate(city.id)}
                        >
                          {city.enabled
                            ? <Eye className="w-4 h-4 text-teal-600" />
                            : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openCityEdit(city)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteTarget({ type: "city", id: city.id, name: city.nameAr })}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

        </Tabs>

        {/* Hierarchy View */}
        <div className="bg-white dark:bg-card rounded-xl border border-border overflow-hidden">
          <div className="p-4 border-b border-border">
            <h2 className="font-semibold flex items-center gap-2">
              <ChevronRight className="w-5 h-5 text-indigo-600" />
              عرض الهيكل الهرمي
            </h2>
          </div>
          {regionsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="divide-y divide-border">
              {regions.map(region => {
                const regionCities = cities.filter(c => c.regionId === region.id);
                const isExpanded = expandedRegions.has(region.id);
                return (
                  <div key={region.id}>
                    <button
                      onClick={() => toggleRegionExpanded(region.id)}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/30 transition-colors text-right"
                    >
                      <div className={`transition-transform ${isExpanded ? "rotate-90" : ""}`}>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </div>
                      <span className="font-semibold flex-1 text-right">{region.nameAr}</span>
                      <Badge variant="outline" className="text-xs">{regionCities.length} مدينة</Badge>
                      {!region.enabled && <Badge variant="secondary" className="text-xs">معطّل</Badge>}
                    </button>
                    {isExpanded && (
                      <div className="bg-secondary/10 border-t border-border">
                        {regionCities.length === 0 ? (
                          <p className="text-sm text-muted-foreground px-10 py-3">لا توجد مدن</p>
                        ) : (
                          regionCities.map(city => (
                            <div key={city.id} className="border-b border-border/50 last:border-0">
                              <div className="flex items-center gap-3 px-8 py-2">
                                <Building2 className="w-4 h-4 text-teal-500 shrink-0" />
                                <span className="font-medium text-sm flex-1">{city.nameAr}</span>
                                {!city.enabled && <Badge variant="secondary" className="text-xs">معطّل</Badge>}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Region Modal */}
      <Dialog open={regionModal.open} onOpenChange={(o) => !isMutating && setRegionModal({ open: o })}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{regionModal.region ? "تعديل المنطقة" : "إضافة منطقة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>الاسم بالعربية *</Label>
              <Input value={regionForm.nameAr} onChange={(e) => setRegionForm((f) => ({ ...f, nameAr: e.target.value }))} placeholder="مثال: الرياض" />
            </div>
            <div className="space-y-2">
              <Label>الاسم بالإنجليزية</Label>
              <Input dir="ltr" value={regionForm.nameEn} onChange={(e) => setRegionForm((f) => ({ ...f, nameEn: e.target.value }))} placeholder="Riyadh" />
            </div>
            <div className="space-y-2">
              <Label>ترتيب العرض</Label>
              <Input
                type="number"
                value={regionForm.order}
                onChange={(e) => setRegionForm((f) => ({ ...f, order: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRegionModal({ open: false })} disabled={isMutating}>
              إلغاء
            </Button>
            <Button onClick={submitRegion} disabled={!regionForm.nameAr.trim() || isMutating} className="gap-2">
              {isMutating && <Loader2 className="w-4 h-4 animate-spin" />}
              {regionModal.region ? "حفظ" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* City Modal */}
      <Dialog open={cityModal.open} onOpenChange={(o) => !isMutating && setCityModal({ open: o })}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{cityModal.city ? "تعديل المدينة" : "إضافة مدينة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>المنطقة *</Label>
              <Select value={cityForm.regionId} onValueChange={v => setCityForm(f => ({ ...f, regionId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المنطقة" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map(r => (
                    <SelectItem key={r.id} value={String(r.id)}>{r.nameAr}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>اسم المدينة بالعربية *</Label>
              <Input
                placeholder="مثال: الرياض"
                value={cityForm.nameAr}
                onChange={e => setCityForm(f => ({ ...f, nameAr: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>اسم المدينة بالإنجليزية</Label>
              <Input
                placeholder="e.g. Riyadh"
                value={cityForm.nameEn}
                onChange={e => setCityForm(f => ({ ...f, nameEn: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCityModal({ open: false })} disabled={isMutating}>إلغاء</Button>
            <Button
              onClick={submitCity}
              disabled={!cityForm.regionId || !cityForm.nameAr || isMutating}
              className="gap-2"
            >
              {isMutating && <Loader2 className="w-4 h-4 animate-spin" />}
              {cityModal.city ? "حفظ التعديلات" : "إضافة المدينة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>تأكيد الحذف</AlertDialogTitle>
            <AlertDialogDescription>
              هل أنت متأكد من حذف "{deleteTarget?.name}"؟ سيتم حذف جميع البيانات المرتبطة به.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => {
                if (!deleteTarget) return;
                deleteCity.mutate(deleteTarget.id);
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
