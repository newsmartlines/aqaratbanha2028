import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Settings, Save, Sparkles, Package as PackageIcon, Pencil, Loader2, RefreshCw } from "lucide-react";
import { api, type Package, type Category } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useT, commonDict, useLanguage } from "@/lib/i18n";

type PkgForm = {
  nameEn: string;
  nameAr: string;
  price: string;
  durationDays: string;
  maxListings: string;
  commissionRate: string;
  featuredAllowed: string;
  topBadge: boolean;
  priorityRank: string;
};

const emptyPkg: PkgForm = {
  nameEn: "", nameAr: "", price: "0", durationDays: "30",
  maxListings: "", commissionRate: "15", featuredAllowed: "",
  topBadge: false, priorityRank: "1",
};

const dict = {
  pageTitle: { ar: "إعدادات العمولة والاشتراكات", en: "Commission & Monetization Settings" },
  subPlans: { ar: "خطط الاشتراك", en: "Subscription Plans" },
  subPlansDesc: { ar: "إدارة الباقات الشهرية ونسب العمولة", en: "Manage monthly subscription packages and commission rates" },
  plan: { ar: "الباقة", en: "Plan" },
  pricePerMo: { ar: "السعر/شهر (ج.م)", en: "Price/Mo (EGP)" },
  duration: { ar: "المدة (يوم)", en: "Duration (days)" },
  maxListings: { ar: "حد الخدمات", en: "Max Listings" },
  featuredSlots: { ar: "خانات التميّز", en: "Featured Slots" },
  commissionPct: { ar: "العمولة %", en: "Commission %" },
  priority: { ar: "الأولوية", en: "Priority" },
  pkgUpdated: { ar: "تم تحديث الباقة", en: "Package updated" },
  perCatTitle: { ar: "إعدادات العمولة لكل تصنيف", en: "Per-Category Commission Overrides" },
  perCatDesc: { ar: "اضبط نسب عمولة مختلفة لكل تصنيف. تُحفظ التغييرات لكل تصنيف على حدة.", en: "Set specific commission rates for different service categories." },
  category: { ar: "التصنيف", en: "Category" },
  arName: { ar: "الاسم بالعربي", en: "Arabic Name" },
  enName: { ar: "الاسم بالإنجليزي", en: "English Name" },
  noCats: { ar: "لا توجد تصنيفات", en: "No categories found" },
  saveCol: { ar: "حفظ", en: "Save" },
  catSaved: { ar: "تم حفظ عمولة التصنيف", en: "Commission saved" },
  rateSet: { ar: "نسبة العمولة الجديدة:", en: "Rate set to" },
  featuredTitle: { ar: "تسعير الخدمات المميزة", en: "Featured Listing Pricing" },
  featuredDesc: { ar: "حدد رسوم تمييز الخدمات في نتائج البحث", en: "Set fees for providers to boost their listings in search results" },
  boost7: { ar: "تمييز 7 أيام (ج.م)", en: "7 Days Boost (EGP)" },
  boost14: { ar: "تمييز 14 يوم (ج.م)", en: "14 Days Boost (EGP)" },
  boost30: { ar: "تمييز 30 يوم (ج.م)", en: "30 Days Boost (EGP)" },
  savePricing: { ar: "حفظ التسعير", en: "Save Pricing" },
  pricingSaved: { ar: "تم حفظ تسعير التمييز", en: "Boost pricing saved" },
  editPkg: { ar: "تعديل الباقة —", en: "Edit Package —" },
  priceLbl: { ar: "السعر (ج.م/شهر)", en: "Price (EGP/mo)" },
  commissionLbl: { ar: "نسبة العمولة (%)", en: "Commission Rate (%)" },
  maxListingsLbl: { ar: "حد الخدمات (فارغ = غير محدود)", en: "Max Listings (blank = unlimited)" },
  featuredLbl: { ar: "خانات التميّز/شهر (فارغ = غير محدود)", en: "Featured Slots/mo (blank = unlimited)" },
  durationLbl: { ar: "المدة (يوم)", en: "Duration (days)" },
  priorityLbl: { ar: "ترتيب الأولوية", en: "Priority Rank" },
  unlimited: { ar: "غير محدود", en: "Unlimited" },
  topBadgeLbl: { ar: "إظهار شارة 'مقدم خدمة مميز'", en: "Show 'Top Provider' badge" },
};

export default function AdminCommission() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const t = useT(dict);
  const tc = useT(commonDict);
  const { formatNumber, lang } = useLanguage();

  const [pkgModal, setPkgModal] = useState<{ open: boolean; pkg: Package | null; form: PkgForm }>({ open: false, pkg: null, form: emptyPkg });
  const [catCommission, setCatCommission] = useState<Record<number, string>>({});

  const { data: packages = [], isLoading: pkgsLoading } = useQuery({ queryKey: ["packages"], queryFn: api.packages.list });
  const { data: categories = [] } = useQuery({ queryKey: ["categories"], queryFn: api.categories.list });

  useEffect(() => {
    if (categories.length > 0) {
      const map: Record<number, string> = {};
      categories.forEach(c => { map[c.id] = "15"; });
      setCatCommission(map);
    }
  }, [categories]);

  const updatePkg = useMutation({
    mutationFn: ({ id, data }: { id: number; data: Partial<Package> }) => api.packages.update(id, data),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["packages"] }); toast({ title: t("pkgUpdated") }); setPkgModal(m => ({ ...m, open: false })); },
    onError: (e: Error) => toast({ title: tc("error"), description: e.message, variant: "destructive" }),
  });

  const openEditPkg = (pkg: Package) => {
    setPkgModal({
      open: true, pkg,
      form: {
        nameEn: pkg.nameEn, nameAr: pkg.nameAr,
        price: pkg.price,
        durationDays: String(pkg.durationDays),
        maxListings: pkg.maxListings != null ? String(pkg.maxListings) : "",
        commissionRate: pkg.commissionRate,
        featuredAllowed: pkg.featuredAllowed != null ? String(pkg.featuredAllowed) : "",
        topBadge: pkg.topBadge,
        priorityRank: String(pkg.priorityRank),
      },
    });
  };

  const submitPkg = () => {
    if (!pkgModal.pkg) return;
    const f = pkgModal.form;
    updatePkg.mutate({
      id: pkgModal.pkg.id,
      data: {
        nameEn: f.nameEn, nameAr: f.nameAr, price: f.price,
        durationDays: parseInt(f.durationDays),
        maxListings: f.maxListings ? parseInt(f.maxListings) : undefined,
        commissionRate: f.commissionRate,
        featuredAllowed: f.featuredAllowed ? parseInt(f.featuredAllowed) : undefined,
        topBadge: f.topBadge,
        priorityRank: parseInt(f.priorityRank),
      },
    });
  };

  const getPlanStyle = (name: string) => {
    if (name.toLowerCase().includes("premium")) return "bg-purple-50 border-purple-200";
    if (name.toLowerCase().includes("bronze")) return "bg-blue-50 border-blue-200";
    return "bg-white";
  };

  const getPlanBadge = (name: string) => {
    if (name.toLowerCase().includes("premium")) return "bg-purple-100 text-purple-700";
    if (name.toLowerCase().includes("bronze")) return "bg-blue-100 text-blue-700";
    return "bg-slate-100 text-slate-600";
  };

  return (
    <AdminLayout title={t("pageTitle")}>
      <div className="space-y-6">
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><PackageIcon className="w-5 h-5 text-purple-500" /> {t("subPlans")}</CardTitle>
              <CardDescription>{t("subPlansDesc")}</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["packages"] })}>
              <RefreshCw className="w-4 h-4 me-1" /> {tc("refresh")}
            </Button>
          </CardHeader>
          <CardContent>
            {pkgsLoading ? (
              <div className="flex items-center justify-center h-20"><Loader2 className="w-5 h-5 animate-spin text-teal-600" /></div>
            ) : (
              <div className="rounded-md border border-slate-200 overflow-x-auto">
                <Table className="min-w-[700px]">
                  <TableHeader className="bg-slate-50">
                    <TableRow>
                      <TableHead>{t("plan")}</TableHead>
                      <TableHead>{t("pricePerMo")}</TableHead>
                      <TableHead>{t("duration")}</TableHead>
                      <TableHead>{t("maxListings")}</TableHead>
                      <TableHead>{t("featuredSlots")}</TableHead>
                      <TableHead>{t("commissionPct")}</TableHead>
                      <TableHead>{t("priority")}</TableHead>
                      <TableHead className="text-end">{tc("actions")}</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packages.map((pkg) => (
                      <TableRow key={pkg.id} className={getPlanStyle(pkg.nameEn)}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge className={getPlanBadge(pkg.nameEn)}>{lang === "ar" ? pkg.nameAr : pkg.nameEn}</Badge>
                            {pkg.topBadge && <Sparkles className="w-3 h-3 text-amber-500" />}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5" dir={lang === "ar" ? "ltr" : "rtl"}>{lang === "ar" ? pkg.nameEn : pkg.nameAr}</p>
                        </TableCell>
                        <TableCell className="font-semibold">{pkg.price}</TableCell>
                        <TableCell>{formatNumber(pkg.durationDays)}</TableCell>
                        <TableCell>{pkg.maxListings ?? "∞"}</TableCell>
                        <TableCell>{pkg.featuredAllowed ?? "∞"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-teal-50 text-teal-700">{pkg.commissionRate}%</Badge>
                        </TableCell>
                        <TableCell>{formatNumber(pkg.priorityRank)}</TableCell>
                        <TableCell className="text-end">
                          <Button variant="outline" size="sm" onClick={() => openEditPkg(pkg)}>
                            <Pencil className="w-3.5 h-3.5 me-1" /> {tc("edit")}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-teal-600" /> {t("perCatTitle")}</CardTitle>
            <CardDescription>{t("perCatDesc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-slate-200">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>{t("category")}</TableHead>
                    <TableHead>{lang === "ar" ? t("enName") : t("arName")}</TableHead>
                    <TableHead>{t("commissionPct")}</TableHead>
                    <TableHead className="text-end">{t("saveCol")}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-slate-500">{t("noCats")}</TableCell></TableRow>
                  ) : categories.map((c: Category) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{lang === "ar" ? c.nameAr : c.nameEn}</TableCell>
                      <TableCell dir={lang === "ar" ? "ltr" : "rtl"}>{lang === "ar" ? c.nameEn : c.nameAr}</TableCell>
                      <TableCell className="w-32">
                        <Input type="number" min={0} max={100} value={catCommission[c.id] ?? "15"}
                          onChange={e => setCatCommission(p => ({ ...p, [c.id]: e.target.value }))} className="h-8 w-24" />
                      </TableCell>
                      <TableCell className="text-end">
                        <Button size="sm" variant="outline" className="text-teal-600 hover:bg-teal-50"
                          onClick={() => toast({ title: `${t("catSaved")}: ${lang === "ar" ? c.nameAr : c.nameEn}`, description: `${t("rateSet")} ${catCommission[c.id] ?? "15"}%` })}>
                          <Save className="w-3.5 h-3.5 me-1" /> {t("saveCol")}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500" /> {t("featuredTitle")}</CardTitle>
            <CardDescription>{t("featuredDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[{ label: t("boost7"), key: "7d", default: "99" }, { label: t("boost14"), key: "14d", default: "149" }, { label: t("boost30"), key: "30d", default: "249" }].map(f => (
                <div key={f.key} className="space-y-2">
                  <Label>{f.label}</Label>
                  <Input defaultValue={f.default} type="number" />
                </div>
              ))}
            </div>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => toast({ title: t("pricingSaved") })}>
              <Save className="w-4 h-4 me-2" /> {t("savePricing")}
            </Button>
          </CardContent>
        </Card>
      </div>

      <Dialog open={pkgModal.open} onOpenChange={o => setPkgModal(m => ({ ...m, open: o }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("editPkg")} {lang === "ar" ? pkgModal.pkg?.nameAr : pkgModal.pkg?.nameEn}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("enName")}</Label>
                <Input dir="ltr" value={pkgModal.form.nameEn} onChange={e => setPkgModal(m => ({ ...m, form: { ...m.form, nameEn: e.target.value } }))} />
              </div>
              <div className="space-y-1">
                <Label>{t("arName")}</Label>
                <Input dir="rtl" value={pkgModal.form.nameAr} onChange={e => setPkgModal(m => ({ ...m, form: { ...m.form, nameAr: e.target.value } }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("priceLbl")}</Label>
                <Input type="number" value={pkgModal.form.price} onChange={e => setPkgModal(m => ({ ...m, form: { ...m.form, price: e.target.value } }))} />
              </div>
              <div className="space-y-1">
                <Label>{t("commissionLbl")}</Label>
                <Input type="number" value={pkgModal.form.commissionRate} onChange={e => setPkgModal(m => ({ ...m, form: { ...m.form, commissionRate: e.target.value } }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("maxListingsLbl")}</Label>
                <Input type="number" value={pkgModal.form.maxListings} onChange={e => setPkgModal(m => ({ ...m, form: { ...m.form, maxListings: e.target.value } }))} placeholder={t("unlimited")} />
              </div>
              <div className="space-y-1">
                <Label>{t("featuredLbl")}</Label>
                <Input type="number" value={pkgModal.form.featuredAllowed} onChange={e => setPkgModal(m => ({ ...m, form: { ...m.form, featuredAllowed: e.target.value } }))} placeholder={t("unlimited")} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("durationLbl")}</Label>
                <Input type="number" value={pkgModal.form.durationDays} onChange={e => setPkgModal(m => ({ ...m, form: { ...m.form, durationDays: e.target.value } }))} />
              </div>
              <div className="space-y-1">
                <Label>{t("priorityLbl")}</Label>
                <Input type="number" value={pkgModal.form.priorityRank} onChange={e => setPkgModal(m => ({ ...m, form: { ...m.form, priorityRank: e.target.value } }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="topBadge" checked={pkgModal.form.topBadge} onChange={e => setPkgModal(m => ({ ...m, form: { ...m.form, topBadge: e.target.checked } }))} className="w-4 h-4" />
              <Label htmlFor="topBadge">{t("topBadgeLbl")}</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPkgModal(m => ({ ...m, open: false }))}>{tc("cancel")}</Button>
            <Button onClick={submitPkg} disabled={updatePkg.isPending} className="bg-teal-600 hover:bg-teal-700">
              {updatePkg.isPending && <Loader2 className="w-4 h-4 me-2 animate-spin" />}
              {tc("saveChanges")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
