import { useState, useEffect, useCallback, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  ArrowRight, Save, Loader2, Star, MapPin, Phone, Mail, Image, Plus, Pencil, Trash2,
  CheckCircle2, User, Building2, Navigation, Globe, AlertCircle
} from "lucide-react";
import { api, type ProviderDetail, type Service, type Category, type Region, type ServiceArea } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet";
import L from "leaflet";

// Fix default marker icon for Vite/webpack
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const DEFAULT_CENTER: [number, number] = [24.7136, 46.6753]; // Riyadh

function DraggableMarker({ position, onMove }: { position: [number, number]; onMove: (lat: number, lng: number) => void }) {
  const [pos, setPos] = useState(position);

  useEffect(() => setPos(position), [position[0], position[1]]);

  const marker = {
    eventHandlers: {
      dragend(e: any) {
        const latlng = e.target.getLatLng();
        setPos([latlng.lat, latlng.lng]);
        onMove(latlng.lat, latlng.lng);
      },
    },
  };

  useMapEvents({
    click(e) {
      setPos([e.latlng.lat, e.latlng.lng]);
      onMove(e.latlng.lat, e.latlng.lng);
    },
  });

  return <Marker position={pos} draggable eventHandlers={marker.eventHandlers} />;
}

interface ServiceForm {
  title: string;
  description: string;
  price: string;
  categoryId: string;
  subcategory: string;
  img: string;
  status: string;
}

const emptyServiceForm = (): ServiceForm => ({
  title: "", description: "", price: "", categoryId: "none", subcategory: "", img: "", status: "active",
});

function serviceToForm(s: Service): ServiceForm {
  return {
    title: s.title,
    description: s.description ?? "",
    price: s.price ?? "",
    categoryId: s.categoryId ? String(s.categoryId) : "none",
    subcategory: s.subcategory ?? "",
    img: s.img ?? "",
    status: s.status,
  };
}

function ServiceAreasCard({
  regions,
  selectedAreas,
  onChange,
}: {
  regions: Region[];
  selectedAreas: ServiceArea[];
  onChange: (areas: { regionId: number; cityId?: number | null }[]) => void;
}) {
  const [search, setSearch] = useState("");
  const [expanded, setExpanded] = useState<Set<number>>(new Set());

  const isRegionFullySelected = (regionId: number) =>
    selectedAreas.some(a => a.regionId === regionId && a.cityId == null);

  const isCitySelected = (regionId: number, cityId: number) =>
    isRegionFullySelected(regionId) ||
    selectedAreas.some(a => a.regionId === regionId && a.cityId === cityId);

  const toggleRegion = (regionId: number) => {
    if (isRegionFullySelected(regionId)) {
      onChange(selectedAreas.filter(a => a.regionId !== regionId));
    } else {
      const withoutRegion = selectedAreas.filter(a => a.regionId !== regionId);
      onChange([...withoutRegion, { regionId, cityId: null }]);
    }
  };

  const toggleCity = (regionId: number, cityId: number) => {
    if (isRegionFullySelected(regionId)) {
      const region = regions.find(r => r.id === regionId);
      const withoutRegion = selectedAreas.filter(a => a.regionId !== regionId);
      const citiesExcept = (region?.cities ?? [])
        .filter(c => c.id !== cityId)
        .map(c => ({ regionId, cityId: c.id, providerId: 0, id: 0 }));
      onChange([...withoutRegion, ...citiesExcept]);
    } else if (selectedAreas.some(a => a.regionId === regionId && a.cityId === cityId)) {
      onChange(selectedAreas.filter(a => !(a.regionId === regionId && a.cityId === cityId)));
    } else {
      const updated = [...selectedAreas, { regionId, cityId, providerId: 0, id: 0 }];
      const region = regions.find(r => r.id === regionId);
      const citiesSelected = updated.filter(a => a.regionId === regionId && a.cityId != null);
      if (region && citiesSelected.length === region.cities.length) {
        onChange([...updated.filter(a => a.regionId !== regionId), { regionId, cityId: null }]);
      } else {
        onChange(updated);
      }
    }
  };

  const toggleExpand = (regionId: number) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(regionId)) next.delete(regionId);
      else next.add(regionId);
      return next;
    });
  };

  const selectedChips = useMemo(() => {
    return selectedAreas.map(a => {
      const region = regions.find(r => r.id === a.regionId);
      if (a.cityId == null) return region?.nameAr ?? "";
      return region?.cities.find(c => c.id === a.cityId)?.nameAr ?? "";
    }).filter(Boolean);
  }, [selectedAreas, regions]);

  const filteredRegions = regions.filter(r =>
    !search ||
    r.nameAr.includes(search) ||
    r.cities.some(c => c.nameAr.includes(search))
  );

  return (
    <Card className="border-slate-200 shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Service Areas — مناطق الخدمة</CardTitle>
        <p className="text-xs text-slate-500">Select regions/cities where this provider operates</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {selectedChips.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-2 bg-teal-50 rounded-lg border border-teal-100">
            {selectedChips.map((label, i) => (
              <Badge key={i} className="bg-teal-100 text-teal-800 border-none text-xs">{label}</Badge>
            ))}
          </div>
        )}
        <input
          type="text"
          placeholder="ابحث عن منطقة أو مدينة..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          dir="rtl"
          className="w-full h-8 text-sm px-3 border border-slate-200 rounded-md outline-none focus:ring-2 focus:ring-teal-500"
        />
        <div className="max-h-72 overflow-y-auto space-y-0.5 border rounded-lg p-2">
          {filteredRegions.length === 0 && (
            <p className="text-center text-sm text-slate-400 py-4">No regions found</p>
          )}
          {filteredRegions.map(region => {
            const isExpanded = expanded.has(region.id);
            const isFullRegion = isRegionFullySelected(region.id);
            const selectedCitiesCount = selectedAreas.filter(a => a.regionId === region.id && a.cityId != null).length;
            return (
              <div key={region.id}>
                <div className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 rounded-md">
                  <input
                    type="checkbox"
                    checked={isFullRegion}
                    onChange={() => toggleRegion(region.id)}
                    className="w-4 h-4 accent-teal-600 cursor-pointer"
                    id={`region-${region.id}`}
                  />
                  <label htmlFor={`region-${region.id}`} className="flex-1 text-sm font-medium cursor-pointer" dir="rtl">
                    {region.nameAr}
                    {isFullRegion && <span className="mr-2 text-xs text-teal-600">(كامل المنطقة)</span>}
                    {!isFullRegion && selectedCitiesCount > 0 && (
                      <span className="mr-2 text-xs text-teal-600">({selectedCitiesCount}/{region.cities.length})</span>
                    )}
                  </label>
                  {region.cities.length > 0 && (
                    <button
                      type="button"
                      onClick={() => toggleExpand(region.id)}
                      className="text-xs text-slate-400 hover:text-slate-600 px-1"
                    >
                      {isExpanded ? "▲" : "▼"}
                    </button>
                  )}
                </div>
                {isExpanded && region.cities.length > 0 && (
                  <div className="ms-6 space-y-0.5 pb-1">
                    {region.cities
                      .filter(c => !search || c.nameAr.includes(search))
                      .map(city => (
                        <div key={city.id} className="flex items-center gap-2 px-2 py-1 hover:bg-slate-50 rounded-md">
                          <input
                            type="checkbox"
                            checked={isCitySelected(region.id, city.id)}
                            onChange={() => toggleCity(region.id, city.id)}
                            className="w-4 h-4 accent-teal-600 cursor-pointer"
                            id={`city-${city.id}`}
                          />
                          <label htmlFor={`city-${city.id}`} className="text-sm cursor-pointer" dir="rtl">
                            {city.nameAr}
                          </label>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {selectedAreas.length > 0 && (
          <button
            type="button"
            onClick={() => onChange([])}
            className="text-xs text-red-500 hover:text-red-700"
          >
            Clear all selections
          </button>
        )}
      </CardContent>
    </Card>
  );
}

export default function AdminProviderEdit() {
  const { id } = useParams<{ id: string }>();
  const providerId = parseInt(id!);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: provider, isLoading } = useQuery({
    queryKey: ["provider-detail", providerId],
    queryFn: () => api.providers.get(providerId),
    enabled: !isNaN(providerId),
  });

  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: api.categories.list,
  });

  const { data: regions = [] } = useQuery({
    queryKey: ["regions"],
    queryFn: api.regions.list,
  });

  const { data: fetchedAreas = [] } = useQuery({
    queryKey: ["service-areas", providerId],
    queryFn: () => api.serviceAreas.get(providerId),
    enabled: !isNaN(providerId),
  });

  const [selectedAreas, setSelectedAreas] = useState<ServiceArea[]>([]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [banner, setBanner] = useState("");
  const [city, setCity] = useState("");
  const [district, setDistrict] = useState("");
  const [categoryId, setCategoryId] = useState("none");
  const [verified, setVerified] = useState(false);
  const [featured, setFeatured] = useState(false);
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");

  const [serviceModal, setServiceModal] = useState<"add" | "edit" | null>(null);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [serviceForm, setServiceForm] = useState<ServiceForm>(emptyServiceForm());
  const [deleteTarget, setDeleteTarget] = useState<Service | null>(null);

  useEffect(() => {
    if (provider) {
      setName(provider.userName ?? "");
      setEmail(provider.userEmail ?? "");
      setPhone(provider.phone ?? "");
      setWhatsapp(provider.whatsapp ?? "");
      setBio(provider.bio ?? "");
      setAvatar(provider.avatar ?? "");
      setBanner(provider.banner ?? "");
      setCity(provider.city ?? "");
      setDistrict(provider.district ?? "");
      setCategoryId(provider.categoryId ? String(provider.categoryId) : "none");
      setVerified(provider.verified ?? false);
      setFeatured(provider.featured ?? false);
      setLat(provider.latitude ?? "");
      setLng(provider.longitude ?? "");
    }
  }, [provider]);

  useEffect(() => {
    if (fetchedAreas.length > 0) setSelectedAreas(fetchedAreas);
  }, [fetchedAreas]);

  const mapCenter: [number, number] =
    lat && lng ? [parseFloat(lat), parseFloat(lng)] : DEFAULT_CENTER;

  const saveProviderMut = useMutation({
    mutationFn: () => {
      const providerPromise = api.admin.providers.update(providerId, {
        bio: bio || undefined,
        avatar: avatar || undefined,
        banner: banner || undefined,
        city: city || undefined,
        district: district || undefined,
        phone: phone || undefined,
        whatsapp: whatsapp || undefined,
        categoryId: categoryId !== "none" ? parseInt(categoryId) : undefined,
        verified,
        featured,
        latitude: lat ? parseFloat(lat) : undefined,
        longitude: lng ? parseFloat(lng) : undefined,
      });
      const userPromise = api.users.update(provider!.userId, {
        name: name || undefined,
        email: email || undefined,
        phone: phone || undefined,
      });
      const areasPromise = api.serviceAreas.save(
        providerId,
        selectedAreas.map(a => ({ regionId: a.regionId, cityId: a.cityId }))
      );
      return Promise.all([providerPromise, userPromise, areasPromise]);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-detail", providerId] });
      queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      queryClient.invalidateQueries({ queryKey: ["service-areas", providerId] });
      toast({ title: "Saved", description: "Provider updated successfully." });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const createServiceMut = useMutation({
    mutationFn: (data: ServiceForm) =>
      api.services.create(providerId, {
        title: data.title,
        description: data.description || undefined,
        price: data.price || undefined,
        categoryId: data.categoryId !== "none" ? parseInt(data.categoryId) : undefined,
        subcategory: data.subcategory || undefined,
        img: data.img || undefined,
        status: data.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-detail", providerId] });
      setServiceModal(null);
      setServiceForm(emptyServiceForm());
      toast({ title: "Service Added" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const updateServiceMut = useMutation({
    mutationFn: ({ serviceId, data }: { serviceId: number; data: ServiceForm }) =>
      api.services.update(providerId, serviceId, {
        title: data.title,
        description: data.description || undefined,
        price: data.price || undefined,
        categoryId: data.categoryId !== "none" ? parseInt(data.categoryId) : undefined,
        subcategory: data.subcategory || undefined,
        img: data.img || undefined,
        status: data.status,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-detail", providerId] });
      setServiceModal(null);
      setEditingService(null);
      toast({ title: "Service Updated" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const deleteServiceMut = useMutation({
    mutationFn: (serviceId: number) => api.services.delete(providerId, serviceId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-detail", providerId] });
      setDeleteTarget(null);
      toast({ title: "Service Deleted" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const openAddService = () => {
    setEditingService(null);
    setServiceForm(emptyServiceForm());
    setServiceModal("add");
  };

  const openEditService = (s: Service) => {
    setEditingService(s);
    setServiceForm(serviceToForm(s));
    setServiceModal("edit");
  };

  const handleServiceSubmit = () => {
    if (!serviceForm.title.trim()) {
      return toast({ title: "Validation", description: "Service title is required.", variant: "destructive" });
    }
    if (serviceModal === "add") {
      createServiceMut.mutate(serviceForm);
    } else if (editingService) {
      updateServiceMut.mutate({ serviceId: editingService.id, data: serviceForm });
    }
  };

  const handleGetMyLocation = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(pos => {
      setLat(pos.coords.latitude.toFixed(6));
      setLng(pos.coords.longitude.toFixed(6));
    }, () => {
      toast({ title: "Location Error", description: "Could not get your location.", variant: "destructive" });
    });
  };

  if (isLoading || !provider) {
    return (
      <AdminLayout title="Edit Provider">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      </AdminLayout>
    );
  }

  const services = provider.services ?? [];

  return (
    <AdminLayout title={`Edit: ${provider.userName}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="sm" onClick={() => setLocation("/admin/providers")} className="gap-1">
            <ArrowRight className="w-4 h-4" />
            Back
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-800">{provider.userName}</h1>
            <p className="text-sm text-slate-500">{provider.userEmail}</p>
          </div>
          <div className="flex gap-2">
            {provider.verified && <Badge className="bg-blue-100 text-blue-700 border-none">Verified</Badge>}
            {provider.featured && <Badge className="bg-amber-100 text-amber-700 border-none">Featured</Badge>}
            <Badge className="bg-slate-100 text-slate-600 border-none flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              {parseFloat(provider.rating).toFixed(1)} ({provider.reviewsCount})
            </Badge>
          </div>
        </div>
        <Button
          onClick={() => saveProviderMut.mutate()}
          disabled={saveProviderMut.isPending}
          className="bg-teal-600 hover:bg-teal-700 gap-2"
        >
          {saveProviderMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save All Changes
        </Button>
      </div>

      <Tabs defaultValue="info" className="space-y-6">
        <TabsList className="bg-slate-100">
          <TabsTrigger value="info" className="gap-1.5"><User className="w-4 h-4" />Basic Info</TabsTrigger>
          <TabsTrigger value="images" className="gap-1.5"><Image className="w-4 h-4" />Images</TabsTrigger>
          <TabsTrigger value="location" className="gap-1.5"><MapPin className="w-4 h-4" />Location</TabsTrigger>
          <TabsTrigger value="services" className="gap-1.5"><Building2 className="w-4 h-4" />Services ({services.length})</TabsTrigger>
        </TabsList>

        {/* ── TAB 1: Basic Info ── */}
        <TabsContent value="info">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-5">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Identity</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>Full Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <Input className="pl-9" value={name} onChange={e => setName(e.target.value)} placeholder="Provider full name" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <Input className="pl-9" type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="email@example.com" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <Input className="pl-9" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+966..." />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label>WhatsApp</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                        <Input className="pl-9" value={whatsapp} onChange={e => setWhatsapp(e.target.value)} placeholder="+966..." />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Bio / Description</Label>
                    <Textarea
                      value={bio}
                      onChange={e => setBio(e.target.value)}
                      rows={4}
                      dir="rtl"
                      placeholder="Provider description in Arabic..."
                      className="resize-none"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Location</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>City</Label>
                      <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Riyadh" />
                    </div>
                    <div className="space-y-1.5">
                      <Label>District</Label>
                      <Input value={district} onChange={e => setDistrict(e.target.value)} placeholder="Al Olaya" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <ServiceAreasCard
                regions={regions as Region[]}
                selectedAreas={selectedAreas}
                onChange={(areas) => setSelectedAreas(areas as ServiceArea[])}
              />
            </div>

            <div className="space-y-5">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Category & Status</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Service Category</Label>
                    <Select value={categoryId} onValueChange={setCategoryId}>
                      <SelectTrigger><SelectValue placeholder="Select category..." /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No category</SelectItem>
                        {(categories as Category[]).map(c => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.nameAr} ({c.nameEn})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Separator />
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Verified</p>
                        <p className="text-xs text-slate-500">Show verified badge</p>
                      </div>
                      <Switch checked={verified} onCheckedChange={setVerified} />
                    </div>
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">Featured</p>
                        <p className="text-xs text-slate-500">Show in featured section</p>
                      </div>
                      <Switch checked={featured} onCheckedChange={setFeatured} />
                    </div>
                  </div>
                </CardContent>
              </Card>

              {provider.subscription && (
                <Card className="border-teal-200 bg-teal-50 shadow-sm">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base text-teal-800">Subscription</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-sm text-teal-700">
                    <p className="font-bold text-lg">{provider.subscription.packageName}</p>
                    <p>{provider.subscription.packagePrice} SAR / mo</p>
                    <p className="text-xs text-teal-500">
                      {new Date(provider.subscription.startDate).toLocaleDateString()} →{" "}
                      {new Date(provider.subscription.endDate).toLocaleDateString()}
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 2: Images ── */}
        <TabsContent value="images">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Profile Image</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center h-48 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden">
                  {avatar ? (
                    <img src={avatar} alt="avatar" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = "none"; }} />
                  ) : (
                    <div className="text-center text-slate-400">
                      <User className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No image set</p>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Image URL</Label>
                  <Input
                    value={avatar}
                    onChange={e => setAvatar(e.target.value)}
                    placeholder="https://example.com/photo.jpg"
                  />
                  <p className="text-xs text-slate-400">Paste a direct image URL (JPG, PNG, WebP). Recommended: square 400×400px.</p>
                </div>
                {avatar && (
                  <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50 w-full" onClick={() => setAvatar("")}>
                    Remove Image
                  </Button>
                )}
              </CardContent>
            </Card>

            <Card className="border-slate-200 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Cover / Banner Image</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-center h-48 rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 overflow-hidden">
                  {banner ? (
                    <img src={banner} alt="banner" className="w-full h-full object-cover" onError={e => { e.currentTarget.style.display = "none"; }} />
                  ) : (
                    <div className="text-center text-slate-400">
                      <Image className="w-12 h-12 mx-auto mb-2 opacity-30" />
                      <p className="text-sm">No banner set</p>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Banner URL</Label>
                  <Input
                    value={banner}
                    onChange={e => setBanner(e.target.value)}
                    placeholder="https://example.com/banner.jpg"
                  />
                  <p className="text-xs text-slate-400">Paste a direct image URL. Recommended: wide 1200×400px landscape.</p>
                </div>
                {banner && (
                  <Button variant="outline" size="sm" className="text-red-500 border-red-200 hover:bg-red-50 w-full" onClick={() => setBanner("")}>
                    Remove Banner
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ── TAB 3: Location / Map ── */}
        <TabsContent value="location">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">Map Location</CardTitle>
                    <Button variant="outline" size="sm" className="gap-1.5" onClick={handleGetMyLocation}>
                      <Navigation className="w-3.5 h-3.5" />
                      Use My Location
                    </Button>
                  </div>
                  <p className="text-xs text-slate-500 mt-1">Click anywhere on the map or drag the pin to set the provider's location.</p>
                </CardHeader>
                <CardContent className="p-0 rounded-b-xl overflow-hidden">
                  <div className="h-[420px] w-full">
                    <MapContainer
                      center={mapCenter}
                      zoom={13}
                      style={{ height: "100%", width: "100%" }}
                      key={`${mapCenter[0]}-${mapCenter[1]}`}
                    >
                      <TileLayer
                        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                      />
                      <DraggableMarker
                        position={mapCenter}
                        onMove={(newLat, newLng) => {
                          setLat(newLat.toFixed(6));
                          setLng(newLng.toFixed(6));
                        }}
                      />
                    </MapContainer>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="space-y-5">
              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">GPS Coordinates</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-1.5">
                    <Label>Latitude</Label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={lat}
                      onChange={e => setLat(e.target.value)}
                      placeholder="24.688700"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Longitude</Label>
                    <Input
                      type="number"
                      step="0.000001"
                      value={lng}
                      onChange={e => setLng(e.target.value)}
                      placeholder="46.721900"
                    />
                  </div>
                  {lat && lng && (
                    <a
                      href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}&zoom=15`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs text-teal-600 hover:underline flex items-center gap-1"
                    >
                      <Globe className="w-3.5 h-3.5" />
                      Open in OpenStreetMap
                    </a>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-slate-500"
                    onClick={() => { setLat(""); setLng(""); }}
                  >
                    Clear Location
                  </Button>
                </CardContent>
              </Card>

              <Card className="border-slate-200 shadow-sm">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Address</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1.5">
                    <Label>City</Label>
                    <Input value={city} onChange={e => setCity(e.target.value)} placeholder="Riyadh" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>District / Area</Label>
                    <Input value={district} onChange={e => setDistrict(e.target.value)} placeholder="Al Olaya" />
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 4: Services ── */}
        <TabsContent value="services">
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Services ({services.length})</CardTitle>
                <Button onClick={openAddService} className="bg-teal-600 hover:bg-teal-700 gap-2">
                  <Plus className="w-4 h-4" /> Add Service
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {services.length === 0 ? (
                <div className="text-center py-16 text-slate-400">
                  <Building2 className="w-12 h-12 mx-auto mb-3 opacity-20" />
                  <p className="font-medium">No services yet</p>
                  <p className="text-sm mt-1">Add the first service for this provider</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {services.map(service => (
                    <div
                      key={service.id}
                      className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white transition-colors"
                    >
                      {service.img ? (
                        <img
                          src={service.img}
                          alt={service.title}
                          className="w-20 h-16 rounded-lg object-cover border border-slate-200 shrink-0"
                          onError={e => { e.currentTarget.style.display = "none"; }}
                        />
                      ) : (
                        <div className="w-20 h-16 rounded-lg bg-slate-200 flex items-center justify-center shrink-0">
                          <Building2 className="w-6 h-6 text-slate-400" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-slate-800 truncate" dir="rtl">{service.title}</h3>
                          <Badge
                            variant="outline"
                            className={service.status === "active"
                              ? "text-emerald-600 border-emerald-200 bg-emerald-50 text-xs"
                              : "text-slate-500 border-slate-200 text-xs"
                            }
                          >
                            {service.status}
                          </Badge>
                        </div>
                        {service.description && (
                          <p className="text-sm text-slate-500 line-clamp-2 mb-2" dir="rtl">{service.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-sm">
                          {service.price && (
                            <span className="font-bold text-teal-600">{service.price} SAR</span>
                          )}
                          {service.subcategory && (
                            <span className="text-slate-400">#{service.subcategory}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-blue-50 hover:text-blue-600"
                          onClick={() => openEditService(service)}
                        >
                          <Pencil className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 hover:bg-red-50 hover:text-red-600"
                          onClick={() => setDeleteTarget(service)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Floating Save Bar */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => saveProviderMut.mutate()}
          disabled={saveProviderMut.isPending}
          size="lg"
          className="bg-teal-600 hover:bg-teal-700 shadow-xl rounded-full px-8 gap-2"
        >
          {saveProviderMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save All Changes
        </Button>
      </div>

      {/* Add/Edit Service Modal */}
      <Dialog open={!!serviceModal} onOpenChange={o => !o && setServiceModal(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{serviceModal === "add" ? "Add New Service" : "Edit Service"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Service Title *</Label>
              <Input
                value={serviceForm.title}
                onChange={e => setServiceForm(f => ({ ...f, title: e.target.value }))}
                placeholder="e.g. Wedding Cake, AC Repair..."
                dir="rtl"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Description</Label>
              <Textarea
                value={serviceForm.description}
                onChange={e => setServiceForm(f => ({ ...f, description: e.target.value }))}
                rows={3}
                dir="rtl"
                placeholder="Service description..."
                className="resize-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Price (SAR)</Label>
                <Input
                  type="number"
                  value={serviceForm.price}
                  onChange={e => setServiceForm(f => ({ ...f, price: e.target.value }))}
                  placeholder="150"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={serviceForm.status} onValueChange={v => setServiceForm(f => ({ ...f, status: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={serviceForm.categoryId} onValueChange={v => setServiceForm(f => ({ ...f, categoryId: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {(categories as Category[]).map(c => (
                      <SelectItem key={c.id} value={String(c.id)}>{c.nameAr}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Subcategory / Tag</Label>
                <Input
                  value={serviceForm.subcategory}
                  onChange={e => setServiceForm(f => ({ ...f, subcategory: e.target.value }))}
                  placeholder="e.g. كيك, صيانة"
                  dir="rtl"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Service Image URL</Label>
              <Input
                value={serviceForm.img}
                onChange={e => setServiceForm(f => ({ ...f, img: e.target.value }))}
                placeholder="https://example.com/service.jpg"
              />
              {serviceForm.img && (
                <img
                  src={serviceForm.img}
                  alt="preview"
                  className="mt-2 h-28 w-full rounded-lg object-cover border"
                  onError={e => { e.currentTarget.style.display = "none"; }}
                />
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setServiceModal(null)}>Cancel</Button>
            <Button
              onClick={handleServiceSubmit}
              disabled={createServiceMut.isPending || updateServiceMut.isPending}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {(createServiceMut.isPending || updateServiceMut.isPending) && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              {serviceModal === "add" ? "Add Service" : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Service Confirm */}
      <AlertDialog open={!!deleteTarget} onOpenChange={o => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>"{deleteTarget?.title}"</strong>? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() => deleteTarget && deleteServiceMut.mutate(deleteTarget.id)}
            >
              {deleteServiceMut.isPending && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
