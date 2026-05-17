import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Pencil, Trash2, Image as ImageIcon, Loader2, AlertCircle, RefreshCw, Upload, X } from "lucide-react";
import ProviderLayout from "@/components/ProviderLayout";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth-context";
import { api, type Service, type Subcategory } from "@/lib/api";

interface FormData {
  title: string;
  description: string;
  price: string;
  subcategoryId: string;
  status: "active" | "pending";
}

const EMPTY_FORM: FormData = {
  title: "", description: "", price: "", subcategoryId: "", status: "pending",
};

export default function ProviderServices() {
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState<FormData>(EMPTY_FORM);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [uploading, setUploading] = useState(false);

  const providerId = user?.providerId;

  const { data: services = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["services", providerId],
    queryFn: () => api.services.list(providerId!),
    enabled: !!providerId,
  });

  const { data: providerDetail } = useQuery({
    queryKey: ["providerDetail", providerId],
    queryFn: () => api.providers.get(providerId!),
    enabled: !!providerId,
  });

  const providerCategoryId = providerDetail?.categoryId ?? null;
  const providerCategoryName = providerDetail?.categoryNameAr ?? null;

  const { data: subcategories = [] } = useQuery<Subcategory[]>({
    queryKey: ["subcategories", providerCategoryId],
    queryFn: () => api.subcategories.listByCategory(providerCategoryId!),
    enabled: !!providerCategoryId,
  });

  const invalidateServices = () => {
    queryClient.invalidateQueries({ queryKey: ["services", providerId] });
    queryClient.invalidateQueries({ queryKey: ["providerDetail", providerId] });
  };

  const createMutation = useMutation({
    mutationFn: (data: { form: FormData; imgUrl: string }) =>
      api.services.create(providerId!, {
        title: data.form.title,
        description: data.form.description || undefined,
        price: data.form.price || undefined,
        categoryId: providerCategoryId ?? undefined,
        subcategory: (data.form.subcategoryId && data.form.subcategoryId !== "_none") ? data.form.subcategoryId : undefined,
        img: data.imgUrl || undefined,
        status: "pending",
      }),
    onSuccess: () => {
      invalidateServices();
      setIsModalOpen(false);
      toast({ title: "تم إضافة الخدمة", description: "تم حفظ الخدمة وهي بانتظار المراجعة" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: { id: number; form: FormData; imgUrl: string }) =>
      api.services.update(providerId!, data.id, {
        title: data.form.title,
        description: data.form.description || undefined,
        price: data.form.price || undefined,
        categoryId: providerCategoryId ?? undefined,
        subcategory: (data.form.subcategoryId && data.form.subcategoryId !== "_none") ? data.form.subcategoryId : undefined,
        img: data.imgUrl || undefined,
      }),
    onSuccess: () => {
      invalidateServices();
      setIsModalOpen(false);
      toast({ title: "تم التعديل", description: "تم تحديث الخدمة بنجاح" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.services.delete(providerId!, id),
    onSuccess: () => {
      invalidateServices();
      setDeleteConfirmId(null);
      toast({ title: "تم الحذف", description: "تم حذف الخدمة بنجاح" });
    },
    onError: (err: Error) => {
      toast({ title: "خطأ", description: err.message, variant: "destructive" });
    },
  });

  const handleOpenModal = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        title: service.title,
        description: service.description ?? "",
        price: service.price ?? "",
        subcategoryId: service.subcategory ?? "",
        status: (service.status as "active" | "pending") ?? "pending",
      });
      setImagePreview(service.img ?? "");
    } else {
      setEditingService(null);
      setFormData(EMPTY_FORM);
      setImagePreview("");
    }
    setImageFile(null);
    setIsModalOpen(true);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleSave = async () => {
    if (!formData.title.trim()) {
      toast({ title: "مطلوب", description: "يرجى إدخال عنوان الخدمة", variant: "destructive" });
      return;
    }

    setUploading(true);
    let imgUrl = editingService?.img ?? "";

    try {
      if (imageFile) {
        const result = await api.upload.service(imageFile);
        imgUrl = result.url;
      }
    } catch (err: any) {
      toast({ title: "خطأ في رفع الصورة", description: err.message, variant: "destructive" });
      setUploading(false);
      return;
    }

    setUploading(false);

    if (editingService) {
      updateMutation.mutate({ id: editingService.id, form: formData, imgUrl });
    } else {
      createMutation.mutate({ form: formData, imgUrl });
    }
  };

  const handleDeleteClick = (id: number) => {
    if (deleteConfirmId === id) {
      deleteMutation.mutate(id);
    } else {
      setDeleteConfirmId(id);
      setTimeout(() => setDeleteConfirmId(null), 3000);
    }
  };

  const isSaving = uploading || createMutation.isPending || updateMutation.isPending;

  const totalServices = services.length;
  const activeServices = services.filter(s => s.status === "active").length;
  const pendingServices = services.filter(s => s.status !== "active").length;

  if (authLoading) {
    return (
      <ProviderLayout>
        <div className="p-6 flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </ProviderLayout>
    );
  }

  if (!user) {
    return (
      <ProviderLayout>
        <div className="p-6 text-center text-muted-foreground mt-20">
          <AlertCircle className="w-8 h-8 mx-auto mb-3 text-amber-500" />
          <p className="font-medium text-lg mb-2">يرجى تسجيل الدخول أولاً</p>
          <a href="/login" className="text-primary underline text-sm">انتقل إلى صفحة تسجيل الدخول</a>
        </div>
      </ProviderLayout>
    );
  }

  if (!providerId) {
    return (
      <ProviderLayout>
        <div className="p-6 text-center text-muted-foreground">
          <AlertCircle className="w-8 h-8 mx-auto mb-2 text-destructive" />
          <p>لم يتم العثور على ملف مزود الخدمة. يرجى إكمال الملف الشخصي.</p>
        </div>
      </ProviderLayout>
    );
  }

  return (
    <ProviderLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">خدماتي</h1>
            <p className="text-muted-foreground mt-1">
              إدارة خدماتك المعروضة على المنصة
              {providerCategoryName && (
                <span className="mr-2 text-primary font-medium">· {providerCategoryName}</span>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={() => refetch()} disabled={isLoading} className="rounded-xl">
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={() => handleOpenModal()} className="shrink-0 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl">
              <Plus className="w-5 h-5 ml-2" />
              إضافة خدمة جديدة
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">إجمالي الخدمات</p>
              <p className="text-3xl font-bold text-foreground mt-2">{totalServices}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">الخدمات النشطة</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{activeServices}</p>
            </CardContent>
          </Card>
          <Card className="border-border/50 shadow-sm">
            <CardContent className="p-6">
              <p className="text-sm font-medium text-muted-foreground">الخدمات المعلقة</p>
              <p className="text-3xl font-bold text-amber-600 mt-2">{pendingServices}</p>
            </CardContent>
          </Card>
        </div>

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {isError && (
          <div className="text-center py-12 text-destructive">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <p className="font-medium">فشل تحميل الخدمات</p>
            <Button variant="outline" size="sm" onClick={() => refetch()} className="mt-3">
              إعادة المحاولة
            </Button>
          </div>
        )}

        {!isLoading && !isError && services.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed border-border rounded-2xl">
            <p className="text-muted-foreground text-lg mb-4">لم تضف أي خدمات بعد</p>
            <Button onClick={() => handleOpenModal()} className="bg-primary text-primary-foreground rounded-xl">
              <Plus className="w-4 h-4 ml-2" /> أضف أول خدمة
            </Button>
          </div>
        )}

        {!isLoading && !isError && services.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
            {services.map(service => (
              <Card key={service.id} className="overflow-hidden flex flex-col border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <div className="relative h-44 bg-secondary">
                  {service.img ? (
                    <img src={service.img} alt={service.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      <ImageIcon className="w-10 h-10 opacity-20" />
                    </div>
                  )}
                  {providerCategoryName && (
                    <div className="absolute top-3 left-3">
                      <Badge className="bg-primary/90 text-white border-none shadow-sm backdrop-blur-sm">
                        {providerCategoryName}
                      </Badge>
                    </div>
                  )}
                  <div className="absolute top-3 right-3">
                    {service.status === "active" ? (
                      <Badge className="bg-green-500/90 text-white border-none shadow-sm">نشط</Badge>
                    ) : (
                      <Badge className="bg-amber-500/90 text-white border-none shadow-sm">معلق</Badge>
                    )}
                  </div>
                </div>
                <CardContent className="p-5 flex-1">
                  <h3 className="font-bold text-lg text-foreground line-clamp-1 mb-2">{service.title}</h3>
                  {service.subcategory && (
                    <p className="text-xs text-muted-foreground mb-2 bg-secondary/60 inline-block px-2 py-0.5 rounded-full">{service.subcategory}</p>
                  )}
                  <p className="text-muted-foreground text-sm line-clamp-2 mb-4">{service.description}</p>
                  {service.price && (
                    <div className="text-primary font-bold text-lg">{service.price} ر.س</div>
                  )}
                </CardContent>
                <CardFooter className="p-4 pt-0 flex gap-2">
                  <Button
                    variant="outline"
                    className="flex-1 rounded-xl text-muted-foreground hover:text-foreground"
                    onClick={() => handleOpenModal(service)}
                    disabled={deleteMutation.isPending}
                  >
                    <Pencil className="w-4 h-4 ml-2" /> تعديل
                  </Button>
                  <Button
                    variant={deleteConfirmId === service.id ? "destructive" : "outline"}
                    className={`flex-1 rounded-xl ${deleteConfirmId === service.id ? "" : "text-muted-foreground hover:text-destructive hover:border-destructive hover:bg-destructive/10"}`}
                    onClick={() => handleDeleteClick(service.id)}
                    disabled={deleteMutation.isPending && deleteMutation.variables === service.id}
                  >
                    {deleteMutation.isPending && deleteMutation.variables === service.id ? (
                      <Loader2 className="w-4 h-4 animate-spin ml-2" />
                    ) : (
                      <Trash2 className="w-4 h-4 ml-2" />
                    )}
                    {deleteConfirmId === service.id ? "تأكيد الحذف؟" : "حذف"}
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}

        {/* ── Add / Edit Dialog ── */}
        <Dialog open={isModalOpen} onOpenChange={open => { if (!isSaving) setIsModalOpen(open); }}>
          <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto" dir="rtl">
            <DialogHeader>
              <DialogTitle className="text-xl">{editingService ? "تعديل الخدمة" : "إضافة خدمة جديدة"}</DialogTitle>
            </DialogHeader>

            <div className="grid gap-5 py-2">
              {/* ── Service Image Upload ── */}
              <div className="grid gap-2">
                <Label>صورة الخدمة</Label>
                <div
                  className="relative rounded-xl overflow-hidden border-2 border-dashed border-border/60 bg-secondary/40 cursor-pointer hover:border-primary/50 hover:bg-primary/5 transition-all group"
                  style={{ height: imagePreview ? "auto" : "140px" }}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {imagePreview ? (
                    <div className="relative">
                      <img src={imagePreview} alt="preview" className="w-full max-h-56 object-cover rounded-xl" />
                      <button
                        type="button"
                        onClick={e => { e.stopPropagation(); handleRemoveImage(); }}
                        className="absolute top-2 left-2 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition"
                      >
                        <X className="w-4 h-4" />
                      </button>
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition flex items-center justify-center rounded-xl">
                        <Upload className="w-8 h-8 text-white" />
                      </div>
                    </div>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-muted-foreground p-4">
                      <Upload className="w-8 h-8 opacity-40" />
                      <p className="text-sm font-medium">انقر لرفع صورة الخدمة</p>
                      <p className="text-xs opacity-60">JPG / PNG / WEBP — حتى 5 ميجا</p>
                    </div>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </div>

              {/* ── Service Title ── */}
              <div className="grid gap-2">
                <Label htmlFor="title">عنوان الخدمة *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  placeholder="مثال: تصميم شعار احترافي"
                />
              </div>

              {/* ── Description ── */}
              <div className="grid gap-2">
                <Label htmlFor="description">وصف الخدمة</Label>
                <Textarea
                  id="description"
                  rows={3}
                  value={formData.description}
                  onChange={e => setFormData({ ...formData, description: e.target.value })}
                  placeholder="اشرح تفاصيل الخدمة وما ستقدمه للعميل..."
                />
              </div>

              {/* ── Provider Main Category (read-only) + Price ── */}
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label>القسم الرئيسي</Label>
                  <div className="h-10 px-3 flex items-center rounded-md border bg-muted/50 text-sm font-medium text-foreground">
                    {providerCategoryName ?? (
                      <span className="text-muted-foreground text-xs">لم يُحدَّد القسم</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground -mt-1">القسم ثابت ولا يمكن تغييره</p>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="price">السعر (ر.س)</Label>
                  <Input
                    id="price"
                    type="number"
                    value={formData.price}
                    onChange={e => setFormData({ ...formData, price: e.target.value })}
                    placeholder="150"
                  />
                </div>
              </div>

              {/* ── Subcategory (from provider's main category) ── */}
              {(subcategories as Subcategory[]).length > 0 && (
                <div className="grid gap-2">
                  <Label>القسم الفرعي <span className="text-muted-foreground text-xs">(اختياري)</span></Label>
                  <Select
                    value={formData.subcategoryId}
                    onValueChange={v => setFormData({ ...formData, subcategoryId: v })}
                  >
                    <SelectTrigger><SelectValue placeholder="اختر القسم الفرعي" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">بدون قسم فرعي</SelectItem>
                      {(subcategories as Subcategory[]).map((sub: Subcategory) => (
                        <SelectItem key={sub.id} value={sub.nameAr}>{sub.nameAr}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <DialogFooter className="gap-2 pt-2">
              <Button variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isSaving}>
                إلغاء
              </Button>
              <Button onClick={handleSave} className="bg-primary hover:bg-primary/90 text-primary-foreground" disabled={isSaving}>
                {isSaving
                  ? <><Loader2 className="w-4 h-4 animate-spin ml-2" />{uploading ? "جاري رفع الصورة..." : "جاري الحفظ..."}</>
                  : "حفظ الخدمة"
                }
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </ProviderLayout>
  );
}
