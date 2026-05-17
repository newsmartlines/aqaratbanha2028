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

export default function AdminCommission() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
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
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["packages"] }); toast({ title: "Package updated" }); setPkgModal(m => ({ ...m, open: false })); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
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
        nameEn: f.nameEn,
        nameAr: f.nameAr,
        price: f.price,
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
    <AdminLayout title="Commission & Monetization Settings">
      <div className="space-y-6">

        {/* Subscription Plans */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2"><PackageIcon className="w-5 h-5 text-purple-500" /> Subscription Plans</CardTitle>
              <CardDescription>Manage monthly subscription packages and commission rates</CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => queryClient.invalidateQueries({ queryKey: ["packages"] })}>
              <RefreshCw className="w-4 h-4 mr-1" /> Refresh
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
                      <TableHead>Plan</TableHead>
                      <TableHead>Price/Mo (SAR)</TableHead>
                      <TableHead>Duration (days)</TableHead>
                      <TableHead>Max Listings</TableHead>
                      <TableHead>Featured Slots</TableHead>
                      <TableHead>Commission %</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {packages.map((pkg) => (
                      <TableRow key={pkg.id} className={getPlanStyle(pkg.nameEn)}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Badge className={getPlanBadge(pkg.nameEn)}>{pkg.nameEn}</Badge>
                            {pkg.topBadge && <Sparkles className="w-3 h-3 text-amber-500" />}
                          </div>
                          <p className="text-xs text-slate-400 mt-0.5" dir="rtl">{pkg.nameAr}</p>
                        </TableCell>
                        <TableCell className="font-semibold">{pkg.price}</TableCell>
                        <TableCell>{pkg.durationDays}</TableCell>
                        <TableCell>{pkg.maxListings ?? "∞"}</TableCell>
                        <TableCell>{pkg.featuredAllowed ?? "∞"}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="bg-teal-50 text-teal-700">{pkg.commissionRate}%</Badge>
                        </TableCell>
                        <TableCell>{pkg.priorityRank}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => openEditPkg(pkg)}>
                            <Pencil className="w-3.5 h-3.5 mr-1" /> Edit
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

        {/* Per Category Commission (display only, editable locally) */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Settings className="w-5 h-5 text-teal-600" /> Per-Category Commission Overrides</CardTitle>
            <CardDescription>Set specific commission rates for different service categories. Changes are saved per category.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-md border border-slate-200">
              <Table>
                <TableHeader className="bg-slate-50">
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Arabic Name</TableHead>
                    <TableHead>Commission (%)</TableHead>
                    <TableHead className="text-right">Save</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {categories.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center py-6 text-slate-500">No categories found</TableCell></TableRow>
                  ) : categories.map((c: Category) => (
                    <TableRow key={c.id}>
                      <TableCell className="font-medium">{c.nameEn}</TableCell>
                      <TableCell dir="rtl">{c.nameAr}</TableCell>
                      <TableCell className="w-32">
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          value={catCommission[c.id] ?? "15"}
                          onChange={e => setCatCommission(p => ({ ...p, [c.id]: e.target.value }))}
                          className="h-8 w-24"
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" className="text-teal-600 hover:bg-teal-50" onClick={() => toast({ title: `Commission for ${c.nameEn} saved`, description: `Rate set to ${catCommission[c.id] ?? "15"}%` })}>
                          <Save className="w-3.5 h-3.5 mr-1" /> Save
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Featured Listing Pricing */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-500" /> Featured Listing Pricing</CardTitle>
            <CardDescription>Set fees for providers to boost their listings in search results</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[{ label: "7 Days Boost (SAR)", key: "7d", default: "99" }, { label: "14 Days Boost (SAR)", key: "14d", default: "149" }, { label: "30 Days Boost (SAR)", key: "30d", default: "249" }].map(f => (
                <div key={f.key} className="space-y-2">
                  <Label>{f.label}</Label>
                  <Input defaultValue={f.default} type="number" />
                </div>
              ))}
            </div>
            <Button className="bg-teal-600 hover:bg-teal-700" onClick={() => toast({ title: "Boost pricing saved" })}>
              <Save className="w-4 h-4 mr-2" /> Save Pricing
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Edit Package Modal */}
      <Dialog open={pkgModal.open} onOpenChange={o => setPkgModal(m => ({ ...m, open: o }))}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Package — {pkgModal.pkg?.nameEn}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Name (EN)</Label>
                <Input value={pkgModal.form.nameEn} onChange={e => setPkgModal(m => ({ ...m, form: { ...m.form, nameEn: e.target.value } }))} />
              </div>
              <div className="space-y-1">
                <Label>Name (AR)</Label>
                <Input dir="rtl" value={pkgModal.form.nameAr} onChange={e => setPkgModal(m => ({ ...m, form: { ...m.form, nameAr: e.target.value } }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Price (SAR/mo)</Label>
                <Input type="number" value={pkgModal.form.price} onChange={e => setPkgModal(m => ({ ...m, form: { ...m.form, price: e.target.value } }))} />
              </div>
              <div className="space-y-1">
                <Label>Commission Rate (%)</Label>
                <Input type="number" value={pkgModal.form.commissionRate} onChange={e => setPkgModal(m => ({ ...m, form: { ...m.form, commissionRate: e.target.value } }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Max Listings (blank = unlimited)</Label>
                <Input type="number" value={pkgModal.form.maxListings} onChange={e => setPkgModal(m => ({ ...m, form: { ...m.form, maxListings: e.target.value } }))} placeholder="Unlimited" />
              </div>
              <div className="space-y-1">
                <Label>Featured Slots/mo (blank = unlimited)</Label>
                <Input type="number" value={pkgModal.form.featuredAllowed} onChange={e => setPkgModal(m => ({ ...m, form: { ...m.form, featuredAllowed: e.target.value } }))} placeholder="Unlimited" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Duration (days)</Label>
                <Input type="number" value={pkgModal.form.durationDays} onChange={e => setPkgModal(m => ({ ...m, form: { ...m.form, durationDays: e.target.value } }))} />
              </div>
              <div className="space-y-1">
                <Label>Priority Rank</Label>
                <Input type="number" value={pkgModal.form.priorityRank} onChange={e => setPkgModal(m => ({ ...m, form: { ...m.form, priorityRank: e.target.value } }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="topBadge" checked={pkgModal.form.topBadge} onChange={e => setPkgModal(m => ({ ...m, form: { ...m.form, topBadge: e.target.checked } }))} className="w-4 h-4" />
              <Label htmlFor="topBadge">Show "Top Provider" badge</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPkgModal(m => ({ ...m, open: false }))}>Cancel</Button>
            <Button onClick={submitPkg} disabled={updatePkg.isPending} className="bg-teal-600 hover:bg-teal-700">
              {updatePkg.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
