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
import { api, type AdminProvider, type ProviderDetail, type Category } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface ProviderForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  bio: string;
  avatar: string;
  banner: string;
  city: string;
  district: string;
  whatsapp: string;
  categoryId: string;
  latitude: string;
  longitude: string;
}

const emptyProviderForm = (): ProviderForm => ({
  name: "", email: "", phone: "", password: "", bio: "",
  avatar: "", banner: "", city: "", district: "", whatsapp: "",
  categoryId: "", latitude: "", longitude: "",
});

type StatusAction = "approve" | "reject" | "suspend";

function providerStatus(p: AdminProvider) {
  if (p.suspended) return "Suspended";
  if (p.approved) return "Approved";
  return "Pending";
}

const STATUS_STYLE: Record<string, string> = {
  Approved: "bg-emerald-100 text-emerald-700",
  Pending: "bg-amber-100 text-amber-700",
  Rejected: "bg-red-100 text-red-700",
  Suspended: "bg-slate-100 text-slate-600",
};

export default function AdminProviders() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [detail, setDetail] = useState<ProviderDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [actionTarget, setActionTarget] = useState<{ id: number; action: StatusAction; name: string } | null>(null);
  const [providerModal, setProviderModal] = useState<"add" | "edit" | null>(null);
  const [editingProvider, setEditingProvider] = useState<AdminProvider | null>(null);
  const [providerForm, setProviderForm] = useState<ProviderForm>(emptyProviderForm());

  const { data: providers = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-providers"],
    queryFn: () => api.admin.providers.list(),
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
      toast({ title: "Provider Created", description: "New provider added successfully." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
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
      toast({ title: "Provider Updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
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
        return toast({ title: "Missing fields", description: "Name and email are required.", variant: "destructive" });
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
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
      toast({ title: `Provider ${action}d` });
      setActionTarget(null);
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openDetail = async (id: number) => {
    setDetailLoading(true);
    try {
      const d = await api.providers.get(id);
      setDetail(d);
    } catch {
      toast({ title: "Failed to load provider", variant: "destructive" });
    } finally {
      setDetailLoading(false);
    }
  };

  const filtered = providers.filter(p => {
    const status = providerStatus(p);
    const matchFilter = filter === "all" || status.toLowerCase() === filter;
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
    <AdminLayout title="Service Providers">
      <div className="grid grid-cols-4 gap-4 mb-6">
        {[
          { key: "all", label: "Total" },
          { key: "approved", label: "Approved" },
          { key: "pending", label: "Pending" },
          { key: "suspended", label: "Suspended" },
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
                  <TabsTrigger value="all">All ({counts.all})</TabsTrigger>
                  <TabsTrigger value="approved">Approved</TabsTrigger>
                  <TabsTrigger value="pending">Pending</TabsTrigger>
                  <TabsTrigger value="suspended">Suspended</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <div className="flex gap-2">
              <div className="relative w-full md:w-64">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-500" />
                <Input placeholder="Search providers..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
              </div>
              <Button variant="outline" size="icon" onClick={() => refetch()}><RefreshCw className="w-4 h-4" /></Button>
              <Button onClick={openAdd} className="bg-teal-600 hover:bg-teal-700 text-white gap-2 whitespace-nowrap">
                <Plus className="w-4 h-4" /> Add Provider
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
                    <TableHead className="font-semibold text-slate-700">Name</TableHead>
                    <TableHead className="font-semibold text-slate-700">Email</TableHead>
                    <TableHead className="font-semibold text-slate-700">Phone</TableHead>
                    <TableHead className="font-semibold text-slate-700">Category</TableHead>
                    <TableHead className="font-semibold text-slate-700">Rating</TableHead>
                    <TableHead className="font-semibold text-slate-700">Status</TableHead>
                    <TableHead className="font-semibold text-slate-700">Joined</TableHead>
                    <TableHead className="text-right font-semibold text-slate-700">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow><TableCell colSpan={9} className="text-center py-8 text-slate-500">No providers found</TableCell></TableRow>
                  ) : filtered.map((p) => {
                    const status = providerStatus(p);
                    return (
                      <TableRow key={p.id}>
                        <TableCell className="text-slate-400 text-sm">{p.id}</TableCell>
                        <TableCell className="font-medium">{p.userName}</TableCell>
                        <TableCell className="text-slate-500 text-sm">{p.userEmail}</TableCell>
                        <TableCell className="text-slate-500 text-sm">{p.phone ?? "—"}</TableCell>
                        <TableCell>{p.categoryNameAr ?? "—"}</TableCell>
                        <TableCell>
                          <span className="flex items-center gap-1 text-sm">
                            <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                            {p.rating} ({p.reviewsCount})
                          </span>
                        </TableCell>
                        <TableCell>
                          <Badge variant="default" className={STATUS_STYLE[status] ?? ""}>{status}</Badge>
                        </TableCell>
                        <TableCell className="text-slate-500 text-sm">
                          {new Date(p.createdAt).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => openDetail(p.id)}>
                                <Eye className="mr-2 h-4 w-4" /> View Profile
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openEdit(p)}>
                                <Pencil className="mr-2 h-4 w-4" /> Edit Provider
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              {!p.approved && !p.suspended && (
                                <DropdownMenuItem className="text-emerald-600" onClick={() => setActionTarget({ id: p.id, action: "approve", name: p.userName })}>
                                  <CheckCircle2 className="mr-2 h-4 w-4" /> Approve
                                </DropdownMenuItem>
                              )}
                              {(p.approved || !p.suspended) && !p.suspended && (
                                <DropdownMenuItem className="text-red-600" onClick={() => setActionTarget({ id: p.id, action: "reject", name: p.userName })}>
                                  <XCircle className="mr-2 h-4 w-4" /> Reject
                                </DropdownMenuItem>
                              )}
                              {!p.suspended && (
                                <DropdownMenuItem className="text-amber-600" onClick={() => setActionTarget({ id: p.id, action: "suspend", name: p.userName })}>
                                  <Ban className="mr-2 h-4 w-4" /> Suspend
                                </DropdownMenuItem>
                              )}
                              {p.suspended && (
                                <DropdownMenuItem className="text-emerald-600" onClick={() => setActionTarget({ id: p.id, action: "approve", name: p.userName })}>
                                  <CheckCircle2 className="mr-2 h-4 w-4" /> Restore
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
            <SheetTitle>Provider Profile</SheetTitle>
          </SheetHeader>
          {detailLoading && <div className="flex items-center justify-center h-32"><Loader2 className="w-6 h-6 animate-spin text-teal-600" /></div>}
          {detail && !detailLoading && (
            <div className="space-y-5 mt-4">
              <div className="flex items-center gap-4">
                {detail.avatar ? (
                  <img src={detail.avatar} alt={detail.userName} className="w-16 h-16 rounded-full object-cover border" />
                ) : (
                  <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-2xl font-bold text-slate-500">
                    ?
                  </div>
                )}                <div>
                  <h3 className="font-bold text-lg">{detail.userName}</h3>
                  <p className="text-sm text-slate-500">{detail.userEmail}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className={STATUS_STYLE[providerStatus(detail as unknown as AdminProvider)] ?? ""}>
                      {providerStatus(detail as unknown as AdminProvider)}
                    </Badge>
                    {detail.verified && <Badge className="bg-blue-100 text-blue-700">Verified</Badge>}
                  </div>
                </div>
              </div>

              {detail.bio && (
                <div className="bg-slate-50 rounded-lg p-3">
                  <p className="text-xs text-slate-500 uppercase tracking-wide font-medium mb-1">Bio</p>
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
                  <Star className="w-4 h-4 text-amber-400 fill-amber-400" /> {detail.rating} ({detail.reviewsCount} reviews)
                </div>
                {detail.categoryNameAr && (
                  <div className="text-sm text-slate-600">Category: {detail.categoryNameAr}</div>
                )}
              </div>

              {detail.subscription && (
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-3">
                  <p className="text-xs text-teal-600 uppercase tracking-wide font-medium mb-1">Subscription</p>
                  <p className="font-medium text-teal-800">{detail.subscription.packageName}</p>
                  <p className="text-sm text-teal-600">{detail.subscription.packagePrice} SAR/mo</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {new Date(detail.subscription.startDate).toLocaleDateString()} — {new Date(detail.subscription.endDate).toLocaleDateString()}
                  </p>
                </div>
              )}

              <div>
                <p className="text-sm font-semibold mb-2">Services ({detail.services?.length || 0})</p>
                {(detail.services && detail.services.length > 0) ? (
                  <div className="space-y-2">
                    {detail.services.map(s => (
                      <div key={s.id} className="flex justify-between items-center bg-slate-50 rounded p-2">
                        <span className="text-sm font-medium" dir="rtl">{s.title}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm text-teal-600">{s.price} SAR</span>
                          <Badge variant="outline" className={s.status === "active" ? "text-emerald-600" : "text-slate-500"}>{s.status}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-500">No services yet</p>
                )}
              </div>

              <div className="border-t pt-4 flex gap-2">
                <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 flex-1" onClick={() => {
                  setActionTarget({ id: detail.id, action: "approve", name: detail.userName });
                  setDetail(null);
                }}>
                  <CheckCircle2 className="w-4 h-4 mr-1" /> Approve
                </Button>
                <Button size="sm" variant="outline" className="text-amber-600 border-amber-300 hover:bg-amber-50 flex-1" onClick={() => {
                  setActionTarget({ id: detail.id, action: "suspend", name: detail.userName });
                  setDetail(null);
                }}>
                  <Ban className="w-4 h-4 mr-1" /> Suspend
                </Button>
                <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 flex-1" onClick={() => {
                  setActionTarget({ id: detail.id, action: "reject", name: detail.userName });
                  setDetail(null);
                }}>
                  <XCircle className="w-4 h-4 mr-1" /> Reject
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
            <DialogTitle>{providerModal === "add" ? "Add New Provider" : "Edit Provider"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {providerModal === "add" && (
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Full Name *</Label>
                  <Input value={providerForm.name} onChange={e => setProviderForm(f => ({ ...f, name: e.target.value }))} placeholder="Provider name" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email *</Label>
                  <Input type="email" value={providerForm.email} onChange={e => setProviderForm(f => ({ ...f, email: e.target.value }))} placeholder="provider@example.com" />
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Phone</Label>
                <Input value={providerForm.phone} onChange={e => setProviderForm(f => ({ ...f, phone: e.target.value }))} placeholder="+966..." />
              </div>
              <div className="space-y-1.5">
                <Label>WhatsApp</Label>
                <Input value={providerForm.whatsapp} onChange={e => setProviderForm(f => ({ ...f, whatsapp: e.target.value }))} placeholder="+966..." />
              </div>
            </div>
            {providerModal === "add" && (
              <div className="space-y-1.5">
                <Label>Password (default: provider123)</Label>
                <Input type="password" value={providerForm.password} onChange={e => setProviderForm(f => ({ ...f, password: e.target.value }))} placeholder="Leave blank for default" />
              </div>
            )}
            <div className="space-y-1.5">
              <Label>Bio / Description</Label>
              <Textarea value={providerForm.bio} onChange={e => setProviderForm(f => ({ ...f, bio: e.target.value }))} placeholder="Provider description..." rows={3} dir="rtl" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Profile Image URL</Label>
                <Input value={providerForm.avatar} onChange={e => setProviderForm(f => ({ ...f, avatar: e.target.value }))} placeholder="https://..." />
                {providerForm.avatar && <img src={providerForm.avatar} alt="avatar" className="h-12 rounded-lg mt-1 border" onError={e => { e.currentTarget.style.display="none"; }} />}
              </div>
              <div className="space-y-1.5">
                <Label>Cover / Banner URL</Label>
                <Input value={providerForm.banner} onChange={e => setProviderForm(f => ({ ...f, banner: e.target.value }))} placeholder="https://..." />
                {providerForm.banner && <img src={providerForm.banner} alt="banner" className="h-12 rounded-lg mt-1 border object-cover w-full" onError={e => { e.currentTarget.style.display="none"; }} />}
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label>City</Label>
                <Input value={providerForm.city} onChange={e => setProviderForm(f => ({ ...f, city: e.target.value }))} placeholder="Riyadh" />
              </div>
              <div className="space-y-1.5">
                <Label>District</Label>
                <Input value={providerForm.district} onChange={e => setProviderForm(f => ({ ...f, district: e.target.value }))} placeholder="Al Olaya" />
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={providerForm.categoryId} onValueChange={v => setProviderForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {(categories as Category[]).map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.nameAr} ({c.nameEn})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Location (GPS Coordinates)</Label>
                <Button type="button" variant="outline" size="sm" onClick={tryGetLocation} className="gap-1 text-xs">
                  <MapPin className="w-3.5 h-3.5" /> Use My Location
                </Button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Latitude</Label>
                  <Input
                    type="number" step="0.000001"
                    value={providerForm.latitude}
                    onChange={e => setProviderForm(f => ({ ...f, latitude: e.target.value }))}
                    placeholder="24.6877"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs text-slate-500">Longitude</Label>
                  <Input
                    type="number" step="0.000001"
                    value={providerForm.longitude}
                    onChange={e => setProviderForm(f => ({ ...f, longitude: e.target.value }))}
                    placeholder="46.7219"
                  />
                </div>
              </div>
              {providerForm.latitude && providerForm.longitude && (
                <a
                  href={`https://www.openstreetmap.org/?mlat=${providerForm.latitude}&mlon=${providerForm.longitude}&zoom=15`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-teal-600 hover:underline flex items-center gap-1"
                >
                  <MapPin className="w-3 h-3" /> Preview on map →
                </a>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setProviderModal(null)}>Cancel</Button>
            <Button
              onClick={handleProviderSubmit}
              disabled={createProviderMutation.isPending || updateProviderMutation.isPending}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {(createProviderMutation.isPending || updateProviderMutation.isPending)
                ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
                : null
              }
              {providerModal === "add" ? "Create Provider" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Action Confirmation */}
      <AlertDialog open={!!actionTarget} onOpenChange={o => !o && setActionTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirm Action</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to <strong>{actionTarget?.action}</strong> provider <strong>{actionTarget?.name}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={actionTarget?.action === "approve" ? "bg-emerald-600 hover:bg-emerald-700" : actionTarget?.action === "suspend" ? "bg-amber-600 hover:bg-amber-700" : "bg-red-600 hover:bg-red-700"}
              onClick={() => actionTarget && doAction.mutate({ id: actionTarget.id, action: actionTarget.action })}
            >
              {doAction.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
