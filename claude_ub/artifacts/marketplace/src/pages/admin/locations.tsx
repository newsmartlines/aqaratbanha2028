import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MapPin, Building2, Plus, Pencil, Trash2, Eye, EyeOff,
  Search, Loader2, Check, X, ChevronDown, ChevronRight
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
import { api, type City, type Area, type Region } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

export default function AdminLocations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<"cities" | "areas">("cities");
  const [citySearch, setCitySearch] = useState("");
  const [areaSearch, setAreaSearch] = useState("");
  const [filterRegionId, setFilterRegionId] = useState<string>("all");
  const [filterCityId, setFilterCityId] = useState<string>("all");
  const [expandedRegions, setExpandedRegions] = useState<Set<number>>(new Set());

  // City modal
  const [cityModal, setCityModal] = useState<{ open: boolean; city?: City }>({ open: false });
  const [cityForm, setCityForm] = useState({ regionId: "", nameAr: "", nameEn: "" });

  // Area modal
  const [areaModal, setAreaModal] = useState<{ open: boolean; area?: Area }>({ open: false });
  const [areaForm, setAreaForm] = useState({ cityId: "", nameAr: "", nameEn: "" });

  // Delete confirm
  const [deleteTarget, setDeleteTarget] = useState<{ type: "city" | "area"; id: number; name: string } | null>(null);

  const { data: regions = [], isLoading: regionsLoading } = useQuery({
    queryKey: ["admin-regions"],
    queryFn: api.locations.admin.allRegions,
  });

  const { data: cities = [], isLoading: citiesLoading } = useQuery({
    queryKey: ["admin-cities"],
    queryFn: api.locations.admin.allCities,
  });

  const { data: areas = [], isLoading: areasLoading } = useQuery({
    queryKey: ["admin-areas"],
    queryFn: () => api.locations.admin.allAreas(),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-regions"] });
    qc.invalidateQueries({ queryKey: ["admin-cities"] });
    qc.invalidateQueries({ queryKey: ["admin-areas"] });
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

  // Area mutations
  const createArea = useMutation({
    mutationFn: api.locations.admin.createArea,
    onSuccess: () => { invalidate(); setAreaModal({ open: false }); toast({ title: "تمت الإضافة", description: "تمت إضافة الحي بنجاح" }); },
  });
  const updateArea = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.locations.admin.updateArea(id, data),
    onSuccess: () => { invalidate(); setAreaModal({ open: false }); toast({ title: "تم التحديث", description: "تم تحديث الحي بنجاح" }); },
  });
  const toggleArea = useMutation({
    mutationFn: api.locations.admin.toggleArea,
    onSuccess: () => invalidate(),
  });
  const deleteArea = useMutation({
    mutationFn: api.locations.admin.deleteArea,
    onSuccess: () => { invalidate(); setDeleteTarget(null); toast({ title: "تم الحذف" }); },
  });

  const openCityCreate = () => {
    setCityForm({ regionId: "", nameAr: "", nameEn: "" });
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

  const openAreaCreate = () => {
    setAreaForm({ cityId: filterCityId !== "all" ? filterCityId : "", nameAr: "", nameEn: "" });
    setAreaModal({ open: true });
  };
  const openAreaEdit = (area: Area) => {
    setAreaForm({ cityId: String(area.cityId), nameAr: area.nameAr, nameEn: area.nameEn });
    setAreaModal({ open: true, area });
  };
  const submitArea = () => {
    const data = { cityId: Number(areaForm.cityId), nameAr: areaForm.nameAr, nameEn: areaForm.nameEn || areaForm.nameAr };
    if (areaModal.area) updateArea.mutate({ id: areaModal.area.id, data });
    else createArea.mutate(data);
  };

  const toggleRegion = (id: number) => {
    setExpandedRegions(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  // Filtered cities
  const filteredCities = cities.filter(c => {
    const matchSearch = c.nameAr.includes(citySearch) || c.nameEn.toLowerCase().includes(citySearch.toLowerCase());
    const matchRegion = filterRegionId === "all" || c.regionId === Number(filterRegionId);
    return matchSearch && matchRegion;
  });

  // Filtered areas
  const filteredAreas = areas.filter(a => {
    const matchSearch = a.nameAr.includes(areaSearch) || a.nameEn.toLowerCase().includes(areaSearch.toLowerCase());
    const matchCity = filterCityId === "all" || a.cityId === Number(filterCityId);
    return matchSearch && matchCity;
  });

  const getCityName = (cityId: number) => cities.find(c => c.id === cityId)?.nameAr ?? "—";
  const getRegionName = (regionId: number) => regions.find(r => r.id === regionId)?.nameAr ?? "—";

  const isMutating = createCity.isPending || updateCity.isPending || createArea.isPending || updateArea.isPending;

  return (
    <AdminLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">إدارة المواقع الجغرافية</h1>
            <p className="text-muted-foreground mt-1">إدارة المدن والأحياء ومناطق الخدمة</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: "المناطق", value: regions.length, icon: ChevronRight, color: "text-indigo-600 bg-indigo-50" },
            { label: "المدن", value: cities.length, icon: Building2, color: "text-teal-600 bg-teal-50" },
            { label: "الأحياء", value: areas.length, icon: MapPin, color: "text-amber-600 bg-amber-50" },
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

        <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="cities" className="gap-2">
              <Building2 className="w-4 h-4" /> المدن ({cities.length})
            </TabsTrigger>
            <TabsTrigger value="areas" className="gap-2">
              <MapPin className="w-4 h-4" /> الأحياء ({areas.length})
            </TabsTrigger>
          </TabsList>

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
                <Button onClick={openCityCreate} className="gap-2 shrink-0">
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
                          {getRegionName(city.regionId)} · {areas.filter(a => a.cityId === city.id).length} حي
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

          {/* ── AREAS TAB ─────────────────────────────── */}
          <TabsContent value="areas">
            <div className="bg-white dark:bg-card rounded-xl border border-border overflow-hidden">
              <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex flex-1 gap-3 items-center flex-wrap">
                  <div className="relative flex-1 max-w-xs">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="ابحث عن حي..."
                      className="pr-9"
                      value={areaSearch}
                      onChange={e => setAreaSearch(e.target.value)}
                    />
                  </div>
                  <Select value={filterCityId} onValueChange={setFilterCityId}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="كل المدن" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل المدن</SelectItem>
                      {/* FIX: Use Array.isArray to safely map over cities */}
                      {Array.isArray(cities) && cities.map(c => (
                        <SelectItem key={c.id} value={String(c.id)}>{c.nameAr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={openAreaCreate} className="gap-2 shrink-0">
                  <Plus className="w-4 h-4" /> إضافة حي
                </Button>
              </div>

              {areasLoading ? (
                <div className="flex items-center justify-center py-16">
                  <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                </div>
              ) : filteredAreas.length === 0 ? (
                <div className="text-center py-16 text-muted-foreground">لا توجد أحياء تطابق البحث</div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredAreas.map(area => (
                    <div key={area.id} className="flex items-center gap-4 px-4 py-3 hover:bg-secondary/30 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{area.nameAr}</span>
                          {!area.enabled && (
                            <Badge variant="secondary" className="text-xs">معطّل</Badge>
                          )}
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {getCityName(area.cityId)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8"
                          title={area.enabled ? "تعطيل" : "تفعيل"}
                          onClick={() => toggleArea.mutate(area.id)}
                        >
                          {area.enabled
                            ? <Eye className="w-4 h-4 text-teal-600" />
                            : <EyeOff className="w-4 h-4 text-muted-foreground" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openAreaEdit(area)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => setDeleteTarget({ type: "area", id: area.id, name: area.nameAr })}
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
                      onClick={() => toggleRegion(region.id)}
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
                          regionCities.map(city => {
                            const cityAreas = areas.filter(a => a.cityId === city.id);
                            return (
                              <div key={city.id} className="border-b border-border/50 last:border-0">
                                <div className="flex items-center gap-3 px-8 py-2">
                                  <Building2 className="w-4 h-4 text-teal-500 shrink-0" />
                                  <span className="font-medium text-sm flex-1">{city.nameAr}</span>
                                  <span className="text-xs text-muted-foreground">{cityAreas.length} حي</span>
                                  {!city.enabled && <Badge variant="secondary" className="text-xs">معطّل</Badge>}
                                </div>
                                {cityAreas.length > 0 && (
                                  <div className="flex flex-wrap gap-1.5 px-12 pb-3">
                                    {cityAreas.map(area => (
                                      <span
                                        key={area.id}
                                        className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border ${
                                          area.enabled
                                            ? "bg-teal-50 text-teal-700 border-teal-200"
                                            : "bg-secondary text-muted-foreground border-border"
                                        }`}
                                      >
                                        <MapPin className="w-2.5 h-2.5" />
                                        {area.nameAr}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            );
                          })
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

      {/* Area Modal */}
      <Dialog open={areaModal.open} onOpenChange={(o) => !isMutating && setAreaModal({ open: o })}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{areaModal.area ? "تعديل الحي" : "إضافة حي جديد"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>المدينة *</Label>
              <Select value={areaForm.cityId} onValueChange={v => setAreaForm(f => ({ ...f, cityId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="اختر المدينة" />
                </SelectTrigger>
                <SelectContent>
                  {cities.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nameAr} — {getRegionName(c.regionId)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>اسم الحي بالعربية *</Label>
              <Input
                placeholder="مثال: النخيل"
                value={areaForm.nameAr}
                onChange={e => setAreaForm(f => ({ ...f, nameAr: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label>اسم الحي بالإنجليزية</Label>
              <Input
                placeholder="e.g. Al-Nakheel"
                value={areaForm.nameEn}
                onChange={e => setAreaForm(f => ({ ...f, nameEn: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAreaModal({ open: false })} disabled={isMutating}>إلغاء</Button>
            <Button
              onClick={submitArea}
              disabled={!areaForm.cityId || !areaForm.nameAr || isMutating}
              className="gap-2"
            >
              {isMutating && <Loader2 className="w-4 h-4 animate-spin" />}
              {areaModal.area ? "حفظ التعديلات" : "إضافة الحي"}
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
                if (deleteTarget.type === "city") deleteCity.mutate(deleteTarget.id);
                else deleteArea.mutate(deleteTarget.id);
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
