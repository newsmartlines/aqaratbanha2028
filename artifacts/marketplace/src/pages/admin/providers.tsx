import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Search, MoreVertical, CheckCircle2, XCircle, Eye, Ban, Loader2, RefreshCw, Star, MapPin, Phone, Plus, Pencil } from "lucide-react";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api, type AdminProvider, type ProviderDetail, type Category, type Region } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useT, commonDict, useLanguage } from "@/lib/i18n";

interface ProviderForm {
  name: string; email: string; phone: string; password: string; bio: string;
  avatar: string; banner: string; city: string; district: string; whatsapp: string;
  categoryId: string; latitude: string; longitude: string;
}

const emptyProviderForm = (): ProviderForm => ({
  name: "", email: "", phone: "", password: "", bio: "",
  avatar: "", banner: "", city: "", district: "", whatsapp: "",
  categoryId: "", latitude: "", longitude: "",
});

type StatusAction = "approve" | "reject" | "suspend";

function providerStatusKey(p: AdminProvider) {
  if (p.suspended) return "suspended";
  if (p.approved) return "approved";
  return "pending";
}

const STATUS_STYLE: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-700",
  pending: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
  suspended: "bg-slate-100 text-slate-600",
};

const dict = {
  pageTitle: { ar: "مقدمو الخدمات", en: "Service Providers" },
  total: { ar: "الإجمالي", en: "Total" },
  approved: { ar: "معتمد", en: "Approved" },
  pending: { ar: "قيد المراجعة", en: "Pending" },
  rejected: { ar: "مرفوض", en: "Rejected" },
  suspended: { ar: "موقوف", en: "Suspended" },
  all: { ar: "الكل", en: "All" },
  searchPh: { ar: "ابحث عن مقدم خدمة...", en: "Search providers..." },
  allRegions: { ar: "كل المناطق", en: "All regions" },
  allCities: { ar: "كل المدن", en: "All cities" },
  addProvider: { ar: "إضافة مقدم", en: "Add Provider" },
  region: { ar: "المنطقة", en: "Region" },
  city: { ar: "المدينة", en: "City" },
  category: { ar: "التصنيف", en: "Category" },
  rating: { ar: "التقييم", en: "Rating" },
  joined: { ar: "تاريخ الانضمام", en: "Joined" },
  noProviders: { ar: "لا يوجد مقدمو خدمة", en: "No providers found" },
  viewProfile: { ar: "عرض الملف", en: "View Profile" },
  editProvider: { ar: "تعديل المقدم", en: "Edit Provider" },
  approveAct: { ar: "اعتماد", en: "Approve" },
  rejectAct: { ar: "رفض", en: "Reject" },
  suspendAct: { ar: "إيقاف", en: "Suspend" },
  restoreAct: { ar: "إعادة تفعيل", en: "Restore" },
  providerProfile: { ar: "ملف مقدم الخدمة", en: "Provider Profile" },
  verified: { ar: "موثّق", en: "Verified" },
  bio: { ar: "نبذة", en: "Bio" },
  reviews: { ar: "تقييمات", en: "reviews" },
  categoryLbl: { ar: "التصنيف:", en: "Category:" },
  subscription: { ar: "الاشتراك", en: "Subscription" },
  sarPerMo: { ar: "ر.س/شهر", en: "SAR/mo" },
  servicesCount: { ar: "الخدمات", en: "Services" },
  noServices: { ar: "لا توجد خدمات بعد", en: "No services yet" },
  sar: { ar: "ر.س", en: "SAR" },
  active: { ar: "نشطة", en: "active" },
  inactive: { ar: "غير نشطة", en: "inactive" },
  loadFailedProvider: { ar: "فشل تحميل مقدم الخدمة", en: "Failed to load provider" },
  // Add modal
  addNewTitle: { ar: "إضافة مقدم خدمة جديد", en: "Add New Provider" },
  editTitle: { ar: "تعديل مقدم الخدمة", en: "Edit Provider" },
  fullName: { ar: "الاسم الكامل", en: "Full Name" },
  fullNamePh: { ar: "اسم مقدم الخدمة", en: "Provider name" },
  emailPh: { ar: "provider@example.com", en: "provider@example.com" },
  whatsapp: { ar: "واتساب", en: "WhatsApp" },
  passwordHint: { ar: "كلمة المرور (الافتراضي: provider123)", en: "Password (default: provider123)" },
  passwordPh: { ar: "اتركها فارغة للافتراضي", en: "Leave blank for default" },
  bioLabel: { ar: "نبذة / الوصف", en: "Bio / Description" },
  bioPh: { ar: "وصف مقدم الخدمة...", en: "Provider description..." },
  avatarUrl: { ar: "رابط الصورة الشخصية", en: "Profile Image URL" },
  bannerUrl: { ar: "رابط صورة الغلاف", en: "Cover / Banner URL" },
  cityPh: { ar: "الرياض", en: "Riyadh" },
  district: { ar: "الحي", en: "District" },
  districtPh: { ar: "العليا", en: "Al Olaya" },
  selectPh: { ar: "اختر...", en: "Select..." },
  noCategory: { ar: "بدون تصنيف", en: "No category" },
  gpsLabel: { ar: "الموقع (إحداثيات GPS)", en: "Location (GPS Coordinates)" },
  useMyLocation: { ar: "استخدم موقعي الحالي", en: "Use My Location" },
  latitude: { ar: "خط العرض", en: "Latitude" },
  longitude: { ar: "خط الطول", en: "Longitude" },
  previewMap: { ar: "معاينة على الخريطة ←", en: "Preview on map →" },
  createProvider: { ar: "إنشاء مقدم", en: "Create Provider" },
  saveChanges: { ar: "حفظ التغييرات", en: "Save Changes" },
  missingFields: { ar: "حقول ناقصة", en: "Missing fields" },
  missingFieldsDesc: { ar: "الاسم والبريد الإلكتروني مطلوبان.", en: "Name and email are required." },
  providerCreated: { ar: "تم إنشاء مقدم الخدمة", en: "Provider Created" },
  providerCreatedDesc: { ar: "تمت إضافة مقدم الخدمة بنجاح.", en: "New provider added successfully." },
  providerUpdated: { ar: "تم تحديث مقدم الخدمة", en: "Provider Updated" },
  providerApproved: { ar: "تم اعتماد مقدم الخدمة", en: "Provider approved" },
  providerRejected: { ar: "تم رفض مقدم الخدمة", en: "Provider rejected" },
  providerSuspended: { ar: "تم إيقاف مقدم الخدمة", en: "Provider suspended" },
  confirmAction: { ar: "تأكيد الإجراء", en: "Confirm Action" },
  confirmApproveAr: { ar: "هل أنت متأكد من اعتماد", en: "Are you sure you want to approve" },
  confirmRejectAr: { ar: "هل أنت متأكد من رفض", en: "Are you sure you want to reject" },
  confirmSuspendAr: { ar: "هل أنت متأكد من إيقاف", en: "Are you sure you want to suspend" },
  qmark: { ar: "؟", en: "?" },
  confirm: { ar: "تأكيد", en: "Confirm" },
};

export default function AdminProviders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const t = useT(dict);
  const tc = useT(commonDict);
  const { lang, formatDate } = useLanguage();

  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<ProviderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionTarget, setActionTarget] = useState<{ id: number; action: StatusAction; name: string } | null>(null);
  const [providerModal, setProviderModal] = useState<"add" | "edit" | null>(null);
  const [editingProvider, setEditingProvider] = useState<AdminProvider | null>(null);
  const [providerForm, setProviderForm] = useState<ProviderForm>(emptyProviderForm());
  const [regionFilter, setRegionFilter] = useState<string>("all");
  const [cityFilter, setCityFilter] = useState<string>("all");
  void editingProvider;

  const { data: regionsAdmin = [] } = useQuery({
    queryKey: ["admin-regions-providers"],
    queryFn: api.locations.admin.allRegions,
  });
  const cityOptions = regionFilter === "all"
    ? []
    : ((regionsAdmin as Region[]).find((r) => r.id === parseInt(regionFilter, 10))?.cities ?? []);

  const { data: providers = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-providers", regionFilter, cityFilter],
    queryFn: () =>
      api.admin.providers.list({
        ...(regionFilter !== "all" ? { regionId: regionFilter } : {}),
        ...(cityFilter !== "all" ? { city: cityFilter } : {}),
      }),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories.list,
  });

  const createProviderMutation = useMutation({
    mutationFn: (data: ProviderForm) => api.admin.providers.create({
      name: data.name, email: data.email, phone: data.phone || undefined,
      password: data.password || undefined, bio: data.bio || undefined,
      avatar: data.avatar || undefined, banner: data.banner || undefined,
      city: data.city || undefined, district: data.district || undefined,
      whatsapp: data.whatsapp || undefined,
      categoryId: data.categoryId && data.categoryId !== "none" ? parseInt(data.categoryId) : undefined,
      latitude: data.latitude ? parseFloat(data.latitude) : undefined,
      longitude: data.longitude ? parseFloat(data.longitude) : undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
      setProviderModal(null);
      setProviderForm(emptyProviderForm());
      toast({ title: t("providerCreated"), description: t("providerCreatedDesc") });
    },
    onError: (e: Error) => toast({ title: tc("error"), description: e.message, variant: "destructive" }),
  });

  const updateProviderMutation = useMutation({
    mutationFn: ({ id, data }: { id: number; data: ProviderForm }) =>
      api.admin.providers.update(id, {
        bio: data.bio || undefined, avatar: data.avatar || undefined,
        banner: data.banner || undefined, city: data.city || undefined,
        district: data.district || undefined, phone: data.phone || undefined,
        whatsapp: data.whatsapp || undefined,
        categoryId: data.categoryId && data.categoryId !== "none" ? parseInt(data.categoryId) : undefined,
        latitude: data.latitude ? parseFloat(data.latitude) : undefined,
        longitude: data.longitude ? parseFloat(data.longitude) : undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
      setProviderModal(null);
      setEditingProvider(null);
      toast({ title: t("providerUpdated") });
    },
    onError: (e: Error) => toast({ title: tc("error"), description: e.message, variant: "destructive" }),
  });

  const openAdd = () => {
    setEditingProvider(null);
    setProviderForm(emptyProviderForm());
    setProviderModal("add");
  };

  const openEdit = (p: AdminProvider) => {
    setLocation(`/admin/providers/${p.id}/edit`);
  };

  const handleProviderSubmit = () => {
    if (providerModal === "add") {
      if (!providerForm.name || !providerForm.email) {
        toast({ title: t("missingFields"), description: t("missingFieldsDesc"), variant: "destructive" });
        return;
      }
      createProviderMutation.mutate(providerForm);
    } else if (providerModal === "edit" && editingProvider) {
      updateProviderMutation.mutate({ id: editingProvider.id, data: providerForm });
    }
  };

  const tryGetLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      setProviderForm(f => ({
        ...f,
        latitude: String(pos.coords.latitude.toFixed(6)),
        longitude: String(pos.coords.longitude.toFixed(6)),
      }));
    });
  };

  const doAction = useMutation({
    mutationFn: ({ id, action }: { id: number; action: StatusAction }) => {
      if (action === "approve") return api.admin.providers.approve(id);
      if (action === "reject") return api.admin.providers.reject(id);
      return api.admin.providers.suspend(id);
    },
    onSuccess: (_, { action, id }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
      // Also refresh the public-facing caches so the listing/profile reflect
      // the new status immediately for any other open tabs.
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      queryClient.invalidateQueries({ queryKey: ["providerDetail", id] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      const titleKey = action === "approve" ? "providerApproved" : action === "reject" ? "providerRejected" : "providerSuspended";
      toast({ title: t(titleKey) });
      setActionTarget(null);
    },
    onError: (e: Error) => toast({ title: tc("error"), description: e.message, variant: "destructive" }),
  });

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const d = await api.providers.get(id);
      setDetail(d);
    } catch {
      toast({ title: t("loadFailedProvider"), variant: "destructive" });
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = providers.filter(p => {
    const status = providerStatusKey(p);
    const matchFilter = filter === "all" || status === filter;
    const matchSearch = !search ||
      p.userName.toLowerCase().includes(search.toLowerCase()) ||
      p.userEmail.toLowerCase().includes(search.toLowerCase()) ||
      (p.categoryNameAr ?? "").includes(search);
    return matchFilter && matchSearch;
  });

  const counts = {
    all: providers.length,
    approved: providers.filter(p => p.approved && !p.suspended).length,
    pending: providers.filter(p => !p.approved && !p.suspended).length,
    suspended: providers.filter(p => p.suspended).length,
  };

  return (
    <AdminLayout title={t("pageTitle")}>
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { key: "all", label: t("total") },
          { key: "approved", label: t("approved") },
          { key: "pending", label: t("pending") },
          { key: "suspended", label: t("suspended") },
        ].map(({ key, label }) => (
          <Card key={key} className="border-slate-200 shadow-sm cursor-pointer hover:border-teal-300 transition-colors" onClick={() => setFilter(key)}>
            <CardContent className="pt-4 pb-4 text-center">
              <p className="text-2xl font-bold">{counts[key as keyof typeof counts]}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div className="flex items-center gap-4">
              <Tabs value={filter} onValueChange={setFilter}>
                <TabsList>
                  <TabsTrigger value="all">{t("all")} ({counts.all})</TabsTrigger>
                  <TabsTrigger value="approved">{t("approved")}</TabsTrigger>
                  <TabsTrigger value="pending">{t("pending")}</TabsTrigger>
                  <TabsTrigger value="suspended">{t("suspended")}</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="flex flex-col sm:flex-row gap-2 sm:items-center flex-wrap">
              <div className="relative w-full md:w-64">
                <Search className="absolute start-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input placeholder={t("searchPh")} className="ps-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Select value={regionFilter} onValueChange={(v) => { setRegionFilter(v); setCityFilter("all"); }}>
                <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder={t("allRegions")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allRegions")}</SelectItem>
                  {(regionsAdmin as Region[]).map((r) => (
                    <SelectItem key={r.id} value={String(r.id)}>{lang === "ar" ? r.nameAr : (r.nameEn ?? r.nameAr)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={cityFilter} onValueChange={setCityFilter} disabled={regionFilter === "all"}>
                <SelectTrigger className="w-full sm:w-[220px]"><SelectValue placeholder={t("allCities")} /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allCities")}</SelectItem>
                  {cityOptions.map((c) => (
                    <SelectItem key={c.id} value={c.nameAr}>{lang === "ar" ? c.nameAr : (c.nameEn ?? c.nameAr)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw className="w-4 h-4" /></Button>
              <Button onClick={openAdd} className="bg-teal-600 hover:bg-teal-700 text-white gap-2 whitespace-nowrap">
                <Plus className="w-4 h-4" /> {t("addProvider")}
              </Button>
            </div>
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
                    <TableHead className="font-semibold text-slate-700">#</TableHead>
                    <TableHead className="font-semibold text-slate-700">{tc("name")}</TableHead>
                    <TableHead className="font-semibold text-slate-700">{tc("email")}</TableHead>
                    <TableHead className="font-semibold text-slate-700">{tc("phone")}</TableHead>
                    <TableHead className="font-semibold text-slate-700">{t("region")}</TableHead>
                    <TableHead className="font-semibold text-slate-700">{t("city")}</TableHead>
                    <TableHead className="font-semibold text-slate-700">{t("category")}</TableHead>
                    <TableHead className="font-semibold text-slate-700">{t("rating")}</TableHead>
                    <TableHead className="font-semibold text-slate-700">{tc("status")}</TableHead>
                    <TableHead className="font-semibold text-slate-700">{t("joined")}</TableHead>
                    <TableHead className="text-end font-semibold text-slate-700">{tc("actions")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={11} className="text-center py-8 text-slate-500">{t("noProviders")}</TableCell></TableRow>
                  ) : filtered.map((p) => {
                    const statusKey = providerStatusKey(p);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-slate-400 text-sm">{p.id}</TableCell>
                        <TableCell className="font-medium">{p.userName}</TableCell>
                        <TableCell className="text-slate-500 text-sm">{p.userEmail}</TableCell>
                        <TableCell className="text-slate-500 text-sm">{p.phone ?? "—"}</TableCell>
                        <TableCell className="text-slate-600 text-sm">{p.regionNameAr ?? "—"}</TableCell>
                        <TableCell className="text-slate-600 text-sm">{p.city ?? "—"}</TableCell>
                        <TableCell>{p.categoryNameAr ?? "—"}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-sm">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            {p.rating} ({p.reviewsCount})
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className={STATUS_STYLE[statusKey] ?? ""}>{t(statusKey)}</Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {p.createdAt ? formatDate(p.createdAt) : "—"}
                        </TableCell>
                        <TableCell className="text-end">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>{tc("actions")}</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openDetail(p.id)}>
                                <Eye className="me-2 h-4 w-4" /> {t("viewProfile")}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(p)}>
                                <Pencil className="me-2 h-4 w-4" /> {t("editProvider")}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {!p.approved && !p.suspended && (
                                <DropdownMenuItem className="text-emerald-600" onClick={() => setActionTarget({ id: p.id, action: "approve", name: p.userName })}>
                                  <CheckCircle2 className="me-2 h-4 w-4" /> {t("approveAct")}
                                </DropdownMenuItem>
                              )}
                              {(p.approved || !p.suspended) && !p.suspended && (
                                <DropdownMenuItem className="text-red-600" onClick={() => setActionTarget({ id: p.id, action: "reject", name: p.userName })}>
                                  <XCircle className="me-2 h-4 w-4" /> {t("rejectAct")}
                                </DropdownMenuItem>
                              )}
                              {!p.suspended && (
                                <DropdownMenuItem className="text-amber-600" onClick={() => setActionTarget({ id: p.id, action: "suspend", name: p.userName })}>
                                  <Ban className="me-2 h-4 w-4" /> {t("suspendAct")}
                                </DropdownMenuItem>
                              )}
                              {p.suspended && (
                                <DropdownMenuItem className="text-emerald-600" onClick={() => setActionTarget({ id: p.id, action: "approve", name: p.userName })}>
                                  <CheckCircle2 className="me-2 h-4 w-4" /> {t("restoreAct")}
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Provider Detail Sheet */}
      <Sheet open={!!detail || detailLoading} onOpenChange={o => !o && setDetail(null)}>
        <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{t("providerProfile")}</SheetTitle>
          </SheetHeader>
          {detailLoading && <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>}
          {detail && !detailLoading && (
            <div className="space-y-5 mt-4">
              <div className="flex items-center gap-4">
                {detail.avatar ? (
                  <img src={detail.avatar} alt={detail.userName} className="w-16 h-16 rounded-full object-cover border" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-2xl font-bold text-slate-500">?</div>
                )}
                <div>
                  <h3 className="font-bold text-lg">{detail.userName}</h3>
                  <p className="text-sm text-slate-500">{detail.userEmail}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={STATUS_STYLE[providerStatusKey(detail as unknown as AdminProvider)] ?? ""}>
                      {t(providerStatusKey(detail as unknown as AdminProvider))}
                    </Badge>
                    {detail.verified && <Badge className="bg-blue-100 text-blue-700">{t("verified")}</Badge>}
                  </div>
                </div>
              </div>

              {detail.bio && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">{t("bio")}</p>
                  <p className="text-sm">{detail.bio}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                {detail.city && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <MapPin className="w-4 h-4 text-slate-400" /> {detail.city}
                  </div>
                )}
                {detail.phone && (
                  <div className="flex items-center gap-2 text-sm text-slate-600">
                    <Phone className="w-4 h-4 text-slate-400" /> {detail.phone}
                  </div>
                )}
                <div className="flex items-center gap-2 text-sm text-slate-600">
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> {detail.rating} ({detail.reviewsCount} {t("reviews")})
                </div>
                {detail.categoryNameAr && (
                  <div className="text-sm text-slate-600">{t("categoryLbl")} {detail.categoryNameAr}</div>
                )}
              </div>

              {detail.subscription && (
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                  <p className="text-xs text-teal-600 uppercase tracking-wide font-medium mb-1">{t("subscription")}</p>
                  <p className="font-medium text-teal-800">{detail.subscription.packageName}</p>
                  <p className="text-sm text-teal-600">{detail.subscription.packagePrice} {t("sarPerMo")}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {formatDate(detail.subscription.startDate)} — {formatDate(detail.subscription.endDate)}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-semibold mb-2">{t("servicesCount")} ({detail.services?.length || 0})</p>
                {(detail.services && detail.services.length > 0) ? (
                  <div className="space-y-2">
                    {detail.services.map(s => (
                      <div key={s.id} className="flex justify-between items-center bg-slate-50 rounded p-2">
                        <span className="text-sm font-medium" dir="rtl">{s.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-teal-600">{s.price} {t("sar")}</span>
                          <Badge variant="outline" className={s.status === "active" ? "text-emerald-600" : "text-slate-500"}>
                            {s.status === "active" ? t("active") : t("inactive")}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">{t("noServices")}</p>
                )}
              </div>

              <div className="border-t pt-4 flex gap-2">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 flex-1" onClick={() => {
                  setActionTarget({ id: detail.id, action: "approve", name: detail.userName });
                  setDetail(null);
                }}>
                  <CheckCircle2 className="w-4 h-4 me-1" /> {t("approveAct")}
                </Button>
                <Button size="sm" variant="outline" className="text-amber-600 border-amber-300 hover:bg-amber-50 flex-1" onClick={() => {
                  setActionTarget({ id: detail.id, action: "suspend", name: detail.userName });
                  setDetail(null);
                }}>
                  <Ban className="w-4 h-4 me-1" /> {t("suspendAct")}
                </Button>
                <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 flex-1" onClick={() => {
                  setActionTarget({ id: detail.id, action: "reject", name: detail.userName });
                  setDetail(null);
                }}>
                  <XCircle className="w-4 h-4 me-1" /> {t("rejectAct")}
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add/Edit Provider Modal */}
      <Dialog open={!!providerModal} onOpenChange={o => !o && setProviderModal(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{providerModal === "add" ? t("addNewTitle") : t("editTitle")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {providerModal === "add" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>{t("fullName")} *</Label>
                  <Input value={providerForm.name} onChange={e => setProviderForm(f => ({ ...f, name: e.target.value }))} placeholder={t("fullNamePh")} />
                </div>
                <div className="space-y-1.5">
                  <Label>{tc("email")} *</Label>
                  <Input dir="ltr" type="email" value={providerForm.email} onChange={e => setProviderForm(f => ({ ...f, email: e.target.value }))} placeholder={t("emailPh")} />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{tc("phone")}</Label>
                <Input dir="ltr" value={providerForm.phone} onChange={e => setProviderForm(f => ({ ...f, phone: e.target.value }))} placeholder="+966..." />
              </div>
              <div className="space-y-1.5">
                <Label>{t("whatsapp")}</Label>
                <Input dir="ltr" value={providerForm.whatsapp} onChange={e => setProviderForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="+966..." />
              </div>
            </div>
            {providerModal === "add" && (
              <div className="space-y-1.5">
                <Label>{t("passwordHint")}</Label>
                <Input type="password" value={providerForm.password} onChange={e => setProviderForm(f => ({ ...f, password: e.target.value }))} placeholder={t("passwordPh")} />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>{t("bioLabel")}</Label>
              <Textarea value={providerForm.bio} onChange={e => setProviderForm(f => ({ ...f, bio: e.target.value }))} placeholder={t("bioPh")} rows={3} dir="rtl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>{t("avatarUrl")}</Label>
                <Input dir="ltr" value={providerForm.avatar} onChange={e => setProviderForm(f => ({ ...f, avatar: e.target.value }))} placeholder="https://..." />
                {providerForm.avatar && <img src={providerForm.avatar} alt="avatar" className="h-12 rounded-lg mt-1 border" onError={e => { e.currentTarget.style.display="none"; }} />}
              </div>
              <div className="space-y-1.5">
                <Label>{t("bannerUrl")}</Label>
                <Input dir="ltr" value={providerForm.banner} onChange={e => setProviderForm(f => ({ ...f, banner: e.target.value }))} placeholder="https://..." />
                {providerForm.banner && <img src={providerForm.banner} alt="banner" className="h-12 rounded-lg mt-1 border object-cover w-full" onError={e => { e.currentTarget.style.display="none"; }} />}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>{t("city")}</Label>
                <Input value={providerForm.city} onChange={e => setProviderForm(f => ({ ...f, city: e.target.value }))} placeholder={t("cityPh")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("district")}</Label>
                <Input value={providerForm.district} onChange={e => setProviderForm(f => ({ ...f, district: e.target.value }))} placeholder={t("districtPh")} />
              </div>
              <div className="space-y-1.5">
                <Label>{t("category")}</Label>
                <Select value={providerForm.categoryId} onValueChange={v => setProviderForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger><SelectValue placeholder={t("selectPh")} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t("noCategory")}</SelectItem>
                    {(categories as Category[]).map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{lang === "ar" ? `${c.nameAr} (${c.nameEn})` : `${c.nameEn} (${c.nameAr})`}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("gpsLabel")}</Label>
                <Button type="button" variant="outline" size="sm" onClick={tryGetLocation} className="gap-1 text-xs">
                  <MapPin className="w-3.5 h-3.5" /> {t("useMyLocation")}
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">{t("latitude")}</Label>
                  <Input dir="ltr" type="number" step="0.000001" value={providerForm.latitude} onChange={e => setProviderForm(f => ({ ...f, latitude: e.target.value }))} placeholder="24.6877" />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">{t("longitude")}</Label>
                  <Input dir="ltr" type="number" step="0.000001" value={providerForm.longitude} onChange={e => setProviderForm(f => ({ ...f, longitude: e.target.value }))} placeholder="46.7219" />
                </div>
              </div>
              {providerForm.latitude && providerForm.longitude && (
                <a href={`https://www.openstreetmap.org/?mlat=${providerForm.latitude}&mlon=${providerForm.longitude}&zoom=15`} target="_blank" rel="noreferrer" className="text-xs text-teal-600 hover:underline flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> {t("previewMap")}
                </a>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProviderModal(null)}>{tc("cancel")}</Button>
            <Button onClick={handleProviderSubmit} disabled={createProviderMutation.isPending || updateProviderMutation.isPending} className="bg-teal-600 hover:bg-teal-700">
              {(createProviderMutation.isPending || updateProviderMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin me-2" /> : null}
              {providerModal === "add" ? t("createProvider") : t("saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Confirmation */}
      <AlertDialog open={!!actionTarget} onOpenChange={o => !o && setActionTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("confirmAction")}</AlertDialogTitle>
            <AlertDialogDescription>
              {actionTarget?.action === "approve" ? t("confirmApproveAr")
                : actionTarget?.action === "reject" ? t("confirmRejectAr")
                : t("confirmSuspendAr")} <strong>{actionTarget?.name}</strong>{t("qmark")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tc("cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className={actionTarget?.action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : actionTarget?.action === "suspend" ? "bg-amber-600 hover:bg-amber-700" : "bg-red-600 hover:bg-red-700"}
              onClick={() => actionTarget && doAction.mutate({ id: actionTarget.id, action: actionTarget.action })}
            >
              {doAction.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {t("confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
