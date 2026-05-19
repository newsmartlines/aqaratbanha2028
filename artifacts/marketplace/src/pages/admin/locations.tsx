import { useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  MapPin, Building2, Plus, Pencil, Trash2, Eye, EyeOff,
  Search, Loader2, ChevronRight, LayoutList, Map,
} from "lucide-react";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog as AD, AlertDialogAction as ADA, AlertDialogCancel as ADC,
  AlertDialogContent as ADCont, AlertDialogDescription as ADD,
  AlertDialogFooter as ADF, AlertDialogHeader as ADH, AlertDialogTitle as ADT,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { api, type City, type Region, type Area } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

type Tab = "governorates" | "cities" | "areas";

export default function AdminLocations() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [tab, setTab] = useState<Tab>("governorates");

  // search / filter
  const [govSearch, setGovSearch] = useState("");
  const [citySearch, setCitySearch] = useState("");
  const [areaSearch, setAreaSearch] = useState("");
  const [filterGovId, setFilterGovId] = useState("all");
  const [filterCityId, setFilterCityId] = useState("all");

  // hierarchy expand
  const [expandedGovs, setExpandedGovs] = useState<Set<number>>(new Set());
  const [expandedCities, setExpandedCities] = useState<Set<number>>(new Set());

  // ── Governorate modal ──────────────────────────────────────────────────────
  const [govModal, setGovModal] = useState<{ open: boolean; gov?: Region }>({ open: false });
  const [govForm, setGovForm] = useState({ nameAr: "", nameEn: "", order: "0" });

  // ── City modal ─────────────────────────────────────────────────────────────
  const [cityModal, setCityModal] = useState<{ open: boolean; city?: City }>({ open: false });
  const [cityForm, setCityForm] = useState({ regionId: "", nameAr: "", nameEn: "" });

  // ── Area modal ─────────────────────────────────────────────────────────────
  const [areaModal, setAreaModal] = useState<{ open: boolean; area?: Area }>({ open: false });
  const [areaForm, setAreaForm] = useState({ cityId: "", nameAr: "", nameEn: "" });

  // ── Delete ─────────────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<{ type: "gov" | "city" | "area"; id: number; name: string } | null>(null);

  // ── Queries ────────────────────────────────────────────────────────────────
  const { data: regions = [], isLoading: regsLoading } = useQuery({
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
    qc.invalidateQueries({ queryKey: ["regions"] });
  };

  // ── Governorate mutations ──────────────────────────────────────────────────
  const createGov = useMutation({
    mutationFn: api.locations.admin.createRegion,
    onSuccess: () => { invalidate(); setGovModal({ open: false }); toast({ title: "تمت إضافة المحافظة" }); },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });
  const updateGov = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.locations.admin.updateRegion(id, data),
    onSuccess: () => { invalidate(); setGovModal({ open: false }); toast({ title: "تم تحديث المحافظة" }); },
    onError: () => toast({ title: "خطأ", variant: "destructive" }),
  });
  const deleteGov = useMutation({
    mutationFn: api.locations.admin.deleteRegion,
    onSuccess: () => { invalidate(); setDeleteTarget(null); toast({ title: "تم حذف المحافظة وكل مدنها ومناطقها" }); },
    onError: () => toast({ title: "فشل الحذف", variant: "destructive" }),
  });

  // ── City mutations ─────────────────────────────────────────────────────────
  const createCity = useMutation({
    mutationFn: api.locations.admin.createCity,
    onSuccess: () => { invalidate(); setCityModal({ open: false }); toast({ title: "تمت إضافة المدينة" }); },
  });
  const updateCity = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.locations.admin.updateCity(id, data),
    onSuccess: () => { invalidate(); setCityModal({ open: false }); toast({ title: "تم تحديث المدينة" }); },
  });
  const toggleCity = useMutation({
    mutationFn: api.locations.admin.toggleCity,
    onSuccess: () => invalidate(),
  });
  const deleteCity = useMutation({
    mutationFn: api.locations.admin.deleteCity,
    onSuccess: () => { invalidate(); setDeleteTarget(null); toast({ title: "تم الحذف" }); },
  });

  // ── Area mutations ─────────────────────────────────────────────────────────
  const createArea = useMutation({
    mutationFn: api.locations.admin.createArea,
    onSuccess: () => { invalidate(); setAreaModal({ open: false }); toast({ title: "تمت إضافة المنطقة" }); },
  });
  const updateArea = useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => api.locations.admin.updateArea(id, data),
    onSuccess: () => { invalidate(); setAreaModal({ open: false }); toast({ title: "تم تحديث المنطقة" }); },
  });
  const toggleArea = useMutation({
    mutationFn: api.locations.admin.toggleArea,
    onSuccess: () => invalidate(),
  });
  const deleteArea = useMutation({
    mutationFn: api.locations.admin.deleteArea,
    onSuccess: () => { invalidate(); setDeleteTarget(null); toast({ title: "تم الحذف" }); },
  });

  // ── Helpers ────────────────────────────────────────────────────────────────
  const getGovName = (id: number) => regions.find(r => r.id === id)?.nameAr ?? "—";
  const getCityName = (id: number) => cities.find(c => c.id === id)?.nameAr ?? "—";

  const openGovCreate = () => { setGovForm({ nameAr: "", nameEn: "", order: "0" }); setGovModal({ open: true }); };
  const openGovEdit = (r: Region) => { setGovForm({ nameAr: r.nameAr, nameEn: r.nameEn, order: String(r.order ?? 0) }); setGovModal({ open: true, gov: r }); };
  const submitGov = () => {
    const payload = { nameAr: govForm.nameAr.trim(), nameEn: (govForm.nameEn || govForm.nameAr).trim(), order: parseInt(govForm.order) || 0 };
    if (govModal.gov) updateGov.mutate({ id: govModal.gov.id, data: payload });
    else createGov.mutate(payload);
  };

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

  const openAreaCreate = (presetCityId?: number) => {
    setAreaForm({ cityId: presetCityId ? String(presetCityId) : "", nameAr: "", nameEn: "" });
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

  const confirmDelete = () => {
    if (!deleteTarget) return;
    if (deleteTarget.type === "gov") deleteGov.mutate(deleteTarget.id);
    else if (deleteTarget.type === "city") deleteCity.mutate(deleteTarget.id);
    else if (deleteTarget.type === "area") deleteArea.mutate(deleteTarget.id);
  };

  // filtered lists
  const filteredGovs = regions.filter(r =>
    r.nameAr.includes(govSearch) || r.nameEn.toLowerCase().includes(govSearch.toLowerCase())
  );
  const filteredCities = cities.filter(c => {
    const matchSearch = c.nameAr.includes(citySearch) || c.nameEn.toLowerCase().includes(citySearch.toLowerCase());
    const matchGov = filterGovId === "all" || c.regionId === Number(filterGovId);
    return matchSearch && matchGov;
  });
  const filteredAreas = areas.filter((a: Area) => {
    const matchSearch = a.nameAr.includes(areaSearch) || a.nameEn.toLowerCase().includes(areaSearch.toLowerCase());
    const city = cities.find(c => c.id === a.cityId);
    const matchCity = filterCityId === "all" || a.cityId === Number(filterCityId);
    const matchGov = filterGovId === "all" || city?.regionId === Number(filterGovId);
    return matchSearch && matchCity && matchGov;
  });

  const isMutating = createGov.isPending || updateGov.isPending || createCity.isPending || updateCity.isPending || createArea.isPending || updateArea.isPending;

  return (
    <AdminLayout title="إدارة المواقع الجغرافية">
      <div className="space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-violet-600 flex items-center justify-center shadow-sm">
            <MapPin className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800">إدارة المواقع الجغرافية</h1>
            <p className="text-sm text-slate-500">محافظات ← مدن ← مناطق</p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "محافظات", value: regions.length, icon: Map, color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
            { label: "مدن", value: cities.length, icon: Building2, color: "text-teal-600 bg-teal-50 border-teal-100" },
            { label: "مناطق", value: areas.length, icon: LayoutList, color: "text-violet-600 bg-violet-50 border-violet-100" },
          ].map(card => (
            <div key={card.label} className={`rounded-xl border p-4 flex items-center gap-3 bg-white ${card.color.split(" ").slice(2).join(" ")}`}>
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${card.color.split(" ").slice(0, 2).join(" ")}`}>
                <card.icon className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xl font-bold text-slate-800">{card.value}</p>
                <p className="text-xs text-slate-500">{card.label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <Tabs value={tab} onValueChange={v => setTab(v as Tab)}>
          <TabsList className="grid grid-cols-3 w-full max-w-lg">
            <TabsTrigger value="governorates" className="gap-1.5">
              <Map className="w-3.5 h-3.5" /> المحافظات ({regions.length})
            </TabsTrigger>
            <TabsTrigger value="cities" className="gap-1.5">
              <Building2 className="w-3.5 h-3.5" /> المدن ({cities.length})
            </TabsTrigger>
            <TabsTrigger value="areas" className="gap-1.5">
              <LayoutList className="w-3.5 h-3.5" /> المناطق ({areas.length})
            </TabsTrigger>
          </TabsList>

          {/* ── GOVERNORATES TAB ─────────────────────────────────────────── */}
          <TabsContent value="governorates" className="mt-5">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="relative flex-1 max-w-xs">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input placeholder="ابحث عن محافظة..." className="pr-9" value={govSearch} onChange={e => setGovSearch(e.target.value)} />
                </div>
                <Button onClick={openGovCreate} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
                  <Plus className="w-4 h-4" /> إضافة محافظة
                </Button>
              </div>

              {regsLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
              ) : filteredGovs.length === 0 ? (
                <div className="text-center py-16 text-slate-400">لا توجد محافظات</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredGovs.map(r => {
                    const govCities = cities.filter(c => c.regionId === r.id);
                    return (
                      <div key={r.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">{r.nameAr}</span>
                            <span className="text-xs text-slate-400 font-mono">{r.nameEn}</span>
                            {!r.enabled && <Badge variant="secondary" className="text-xs">معطّل</Badge>}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">{govCities.length} مدينة</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1.5 border border-slate-200 rounded-lg px-2 py-1">
                            <Switch
                              checked={r.enabled}
                              onCheckedChange={on => updateGov.mutate({ id: r.id, data: { enabled: on } })}
                              disabled={updateGov.isPending}
                              className="scale-75"
                            />
                            <span className="text-xs text-slate-500">{r.enabled ? "ظاهرة" : "مخفية"}</span>
                          </div>
                          <Button variant="outline" size="sm" className="gap-1 text-teal-700 border-teal-200 hover:bg-teal-50 h-8 text-xs" onClick={() => { openCityCreate(r.id); setTab("cities"); }}>
                            <Plus className="w-3.5 h-3.5" /> مدينة
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openGovEdit(r)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost" size="icon"
                            className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50"
                            onClick={() => setDeleteTarget({ type: "gov", id: r.id, name: r.nameAr })}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── CITIES TAB ───────────────────────────────────────────────── */}
          <TabsContent value="cities" className="mt-5">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex flex-1 gap-3 items-center flex-wrap">
                  <div className="relative flex-1 min-w-40 max-w-xs">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder="ابحث عن مدينة..." className="pr-9" value={citySearch} onChange={e => setCitySearch(e.target.value)} />
                  </div>
                  <Select value={filterGovId} onValueChange={setFilterGovId}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="كل المحافظات" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل المحافظات</SelectItem>
                      {regions.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.nameAr}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => openCityCreate()} className="gap-2 bg-teal-600 hover:bg-teal-700 shrink-0">
                  <Plus className="w-4 h-4" /> إضافة مدينة
                </Button>
              </div>

              {citiesLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
              ) : filteredCities.length === 0 ? (
                <div className="text-center py-16 text-slate-400">لا توجد مدن تطابق البحث</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredCities.map(city => (
                    <div key={city.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-800">{city.nameAr}</span>
                          {!city.enabled && <Badge variant="secondary" className="text-xs">معطّل</Badge>}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          <span className="text-indigo-600 font-medium">{getGovName(city.regionId)}</span>
                          {" · "}
                          {areas.filter((a: Area) => a.cityId === city.id).length} منطقة
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button variant="outline" size="sm" className="gap-1 text-violet-700 border-violet-200 hover:bg-violet-50 h-8 text-xs" onClick={() => { openAreaCreate(city.id); setTab("areas"); }}>
                          <Plus className="w-3.5 h-3.5" /> منطقة
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" title={city.enabled ? "تعطيل" : "تفعيل"} onClick={() => toggleCity.mutate(city.id)}>
                          {city.enabled ? <Eye className="w-4 h-4 text-teal-600" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openCityEdit(city)}>
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget({ type: "city", id: city.id, name: city.nameAr })}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── AREAS TAB ────────────────────────────────────────────────── */}
          <TabsContent value="areas" className="mt-5">
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                <div className="flex flex-1 gap-3 items-center flex-wrap">
                  <div className="relative flex-1 min-w-40 max-w-xs">
                    <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <Input placeholder="ابحث عن منطقة..." className="pr-9" value={areaSearch} onChange={e => setAreaSearch(e.target.value)} />
                  </div>
                  <Select value={filterGovId} onValueChange={v => { setFilterGovId(v); setFilterCityId("all"); }}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="كل المحافظات" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل المحافظات</SelectItem>
                      {regions.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.nameAr}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <Select value={filterCityId} onValueChange={setFilterCityId}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="كل المدن" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">كل المدن</SelectItem>
                      {cities
                        .filter(c => filterGovId === "all" || c.regionId === Number(filterGovId))
                        .map(c => <SelectItem key={c.id} value={String(c.id)}>{c.nameAr}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <Button onClick={() => openAreaCreate()} className="gap-2 bg-violet-600 hover:bg-violet-700 shrink-0">
                  <Plus className="w-4 h-4" /> إضافة منطقة
                </Button>
              </div>

              {areasLoading ? (
                <div className="flex justify-center py-16"><Loader2 className="w-8 h-8 animate-spin text-slate-400" /></div>
              ) : filteredAreas.length === 0 ? (
                <div className="text-center py-16 text-slate-400">لا توجد مناطق تطابق البحث</div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {filteredAreas.map((area: Area) => {
                    const city = cities.find(c => c.id === area.cityId);
                    return (
                      <div key={area.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50 transition-colors">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-slate-800">{area.nameAr}</span>
                            {!area.enabled && <Badge variant="secondary" className="text-xs">معطّل</Badge>}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5">
                            <span className="text-indigo-600 font-medium">{city ? getGovName(city.regionId) : "—"}</span>
                            {" ← "}
                            <span className="text-teal-600 font-medium">{getCityName(area.cityId)}</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button variant="ghost" size="icon" className="h-8 w-8" title={area.enabled ? "تعطيل" : "تفعيل"} onClick={() => toggleArea.mutate(area.id)}>
                            {area.enabled ? <Eye className="w-4 h-4 text-teal-600" /> : <EyeOff className="w-4 h-4 text-slate-400" />}
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openAreaEdit(area)}>
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400 hover:text-red-600 hover:bg-red-50" onClick={() => setDeleteTarget({ type: "area", id: area.id, name: area.nameAr })}>
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>

        {/* ── Hierarchy View ───────────────────────────────────────────────── */}
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
          <div className="p-4 border-b border-slate-200">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <ChevronRight className="w-5 h-5 text-indigo-600" />
              العرض الهرمي الكامل — محافظة ← مدينة ← منطقة
            </h2>
          </div>
          {regsLoading ? (
            <div className="flex justify-center py-8"><Loader2 className="w-6 h-6 animate-spin text-slate-400" /></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {regions.map(region => {
                const govCities = cities.filter(c => c.regionId === region.id);
                const isGovExpanded = expandedGovs.has(region.id);
                return (
                  <div key={region.id}>
                    {/* Level 1: محافظة */}
                    <button
                      onClick={() => setExpandedGovs(prev => { const s = new Set(prev); s.has(region.id) ? s.delete(region.id) : s.add(region.id); return s; })}
                      className="w-full flex items-center gap-3 px-4 py-3 hover:bg-indigo-50/60 transition-colors text-right"
                    >
                      <div className={`transition-transform duration-200 ${isGovExpanded ? "rotate-90" : ""}`}>
                        <ChevronRight className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center shrink-0">
                        <Map className="w-4 h-4 text-indigo-600" />
                      </div>
                      <span className="font-bold flex-1 text-right text-slate-800">{region.nameAr}</span>
                      <Badge variant="outline" className="text-xs border-indigo-200 text-indigo-700 bg-indigo-50">{govCities.length} مدينة</Badge>
                      {!region.enabled && <Badge variant="secondary" className="text-xs">معطّل</Badge>}
                    </button>

                    {isGovExpanded && (
                      <div className="bg-slate-50/80">
                        {govCities.length === 0 ? (
                          <p className="text-sm text-slate-400 px-16 py-3">لا توجد مدن</p>
                        ) : (
                          govCities.map(city => {
                            const cityAreas = areas.filter((a: Area) => a.cityId === city.id);
                            const isCityExpanded = expandedCities.has(city.id);
                            return (
                              <div key={city.id}>
                                {/* Level 2: مدينة */}
                                <button
                                  onClick={() => setExpandedCities(prev => { const s = new Set(prev); s.has(city.id) ? s.delete(city.id) : s.add(city.id); return s; })}
                                  className="w-full flex items-center gap-3 px-4 py-2.5 pr-10 hover:bg-teal-50/60 transition-colors text-right border-t border-slate-100"
                                >
                                  <div className={`transition-transform duration-200 ${isCityExpanded ? "rotate-90" : ""}`}>
                                    <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                                  </div>
                                  <div className="w-7 h-7 rounded-lg bg-teal-100 flex items-center justify-center shrink-0">
                                    <Building2 className="w-3.5 h-3.5 text-teal-600" />
                                  </div>
                                  <span className="font-semibold flex-1 text-right text-slate-700">{city.nameAr}</span>
                                  <Badge variant="outline" className="text-xs border-teal-200 text-teal-700 bg-teal-50">{cityAreas.length} منطقة</Badge>
                                  {!city.enabled && <Badge variant="secondary" className="text-xs">معطّل</Badge>}
                                </button>

                                {isCityExpanded && (
                                  <div className="bg-white">
                                    {cityAreas.length === 0 ? (
                                      <p className="text-sm text-slate-400 px-20 py-2.5">لا توجد مناطق</p>
                                    ) : (
                                      cityAreas.map((area: Area) => (
                                        <div key={area.id} className="flex items-center gap-3 px-6 py-2 pr-24 border-t border-slate-100/80 hover:bg-violet-50/40 transition-colors">
                                          <div className="w-6 h-6 rounded-md bg-violet-100 flex items-center justify-center shrink-0">
                                            <LayoutList className="w-3 h-3 text-violet-600" />
                                          </div>
                                          <span className="text-sm font-medium flex-1 text-slate-700">{area.nameAr}</span>
                                          {!area.enabled && <Badge variant="secondary" className="text-xs">معطّل</Badge>}
                                        </div>
                                      ))
                                    )}
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

      {/* ── Governorate Modal ─────────────────────────────────────────────── */}
      <Dialog open={govModal.open} onOpenChange={o => !isMutating && setGovModal({ open: o })}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{govModal.gov ? "تعديل المحافظة" : "إضافة محافظة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>اسم المحافظة بالعربية <span className="text-red-500">*</span></Label>
              <Input value={govForm.nameAr} onChange={e => setGovForm(f => ({ ...f, nameAr: e.target.value }))} placeholder="مثال: القاهرة" />
            </div>
            <div className="space-y-2">
              <Label>الاسم بالإنجليزية</Label>
              <Input dir="ltr" value={govForm.nameEn} onChange={e => setGovForm(f => ({ ...f, nameEn: e.target.value }))} placeholder="Cairo" />
            </div>
            <div className="space-y-2">
              <Label>ترتيب العرض</Label>
              <Input type="number" value={govForm.order} onChange={e => setGovForm(f => ({ ...f, order: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setGovModal({ open: false })} disabled={isMutating}>إلغاء</Button>
            <Button onClick={submitGov} disabled={!govForm.nameAr.trim() || isMutating} className="gap-2 bg-indigo-600 hover:bg-indigo-700">
              {isMutating && <Loader2 className="w-4 h-4 animate-spin" />}
              {govModal.gov ? "حفظ" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── City Modal ────────────────────────────────────────────────────── */}
      <Dialog open={cityModal.open} onOpenChange={o => !isMutating && setCityModal({ open: o })}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{cityModal.city ? "تعديل المدينة" : "إضافة مدينة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>المحافظة <span className="text-red-500">*</span></Label>
              <Select value={cityForm.regionId} onValueChange={v => setCityForm(f => ({ ...f, regionId: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر المحافظة" /></SelectTrigger>
                <SelectContent>
                  {regions.map(r => <SelectItem key={r.id} value={String(r.id)}>{r.nameAr}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>اسم المدينة بالعربية <span className="text-red-500">*</span></Label>
              <Input placeholder="مثال: الإسكندرية" value={cityForm.nameAr} onChange={e => setCityForm(f => ({ ...f, nameAr: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>الاسم بالإنجليزية</Label>
              <Input dir="ltr" placeholder="Alexandria" value={cityForm.nameEn} onChange={e => setCityForm(f => ({ ...f, nameEn: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCityModal({ open: false })} disabled={isMutating}>إلغاء</Button>
            <Button onClick={submitCity} disabled={!cityForm.regionId || !cityForm.nameAr || isMutating} className="gap-2 bg-teal-600 hover:bg-teal-700">
              {isMutating && <Loader2 className="w-4 h-4 animate-spin" />}
              {cityModal.city ? "حفظ" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Area Modal ────────────────────────────────────────────────────── */}
      <Dialog open={areaModal.open} onOpenChange={o => !isMutating && setAreaModal({ open: o })}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>{areaModal.area ? "تعديل المنطقة" : "إضافة منطقة جديدة"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>المدينة <span className="text-red-500">*</span></Label>
              <Select value={areaForm.cityId} onValueChange={v => setAreaForm(f => ({ ...f, cityId: v }))}>
                <SelectTrigger><SelectValue placeholder="اختر المدينة" /></SelectTrigger>
                <SelectContent>
                  {cities.map(c => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {c.nameAr} — {getGovName(c.regionId)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>اسم المنطقة بالعربية <span className="text-red-500">*</span></Label>
              <Input placeholder="مثال: مدينة نصر" value={areaForm.nameAr} onChange={e => setAreaForm(f => ({ ...f, nameAr: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label>الاسم بالإنجليزية</Label>
              <Input dir="ltr" placeholder="Nasr City" value={areaForm.nameEn} onChange={e => setAreaForm(f => ({ ...f, nameEn: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAreaModal({ open: false })} disabled={isMutating}>إلغاء</Button>
            <Button onClick={submitArea} disabled={!areaForm.cityId || !areaForm.nameAr || isMutating} className="gap-2 bg-violet-600 hover:bg-violet-700">
              {isMutating && <Loader2 className="w-4 h-4 animate-spin" />}
              {areaModal.area ? "حفظ" : "إضافة"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ───────────────────────────────────────────────── */}
      <AD open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <ADCont dir="rtl">
          <ADH>
            <ADT>تأكيد الحذف</ADT>
            <ADD>
              هل أنت متأكد من حذف "{deleteTarget?.name}"؟{" "}
              {deleteTarget?.type === "gov"
                ? "سيتم حذف المحافظة وجميع مدنها ومناطقها نهائياً."
                : deleteTarget?.type === "city"
                ? "سيتم حذف المدينة وجميع مناطقها نهائياً."
                : "سيتم حذف المنطقة نهائياً."}
              {" "}لا يمكن التراجع عن هذا الإجراء.
            </ADD>
          </ADH>
          <ADF>
            <ADC>إلغاء</ADC>
            <ADA className="bg-red-600 hover:bg-red-700" onClick={confirmDelete}>حذف</ADA>
          </ADF>
        </ADCont>
      </AD>
    </AdminLayout>
  );
}
