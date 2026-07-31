import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  ArrowRight, ArrowLeft, Loader2, Star, MapPin, Phone, Mail, Globe,
  Building2, CalendarCheck, Pencil, CheckCircle2, XCircle, Ban, Crown,
  User, MessageSquare,
} from "lucide-react";
import { api, type ProviderDetail } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/lib/i18n";
import { useState } from "react";

type StatusAction = "approve" | "reject" | "suspend";

function providerStatusKey(p: ProviderDetail) {
  if (p.suspended) return "suspended";
  if (p.approved) return "approved";
  return "pending";
}

const STATUS_STYLE: Record<string, { cls: string; label: string }> = {
  approved: { cls: "bg-emerald-100 text-emerald-700 border-emerald-200", label: "معتمد" },
  pending:  { cls: "bg-amber-100  text-amber-700  border-amber-200",  label: "قيد المراجعة" },
  rejected: { cls: "bg-red-100    text-red-700    border-red-200",    label: "مرفوض" },
  suspended:{ cls: "bg-slate-100  text-slate-600  border-slate-300",  label: "موقوف" },
};

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1,2,3,4,5].map(i => (
        <Star key={i} className={`w-4 h-4 ${i <= Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-300"}`} />
      ))}
    </div>
  );
}

export default function AdminProviderDetail() {
  const { id } = useParams<{ id: string }>();
  const providerId = parseInt(id!);
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { lang, formatDate } = useLanguage();
  const BackIcon = lang === "ar" ? ArrowRight : ArrowLeft;

  const [actionTarget, setActionTarget] = useState<{ action: StatusAction } | null>(null);

  const { data: provider, isLoading, error } = useQuery({
    queryKey: ["provider-detail", providerId],
    queryFn: () => api.providers.get(providerId),
    enabled: !isNaN(providerId),
  });

  const doAction = useMutation({
    mutationFn: ({ action }: { action: StatusAction }) => {
      if (action === "approve") return api.admin.providers.approve(providerId);
      if (action === "reject")  return api.admin.providers.reject(providerId);
      return api.admin.providers.suspend(providerId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-detail", providerId] });
      queryClient.invalidateQueries({ queryKey: ["admin-providers"] });
      setActionTarget(null);
      toast({ title: "تم تحديث الحالة بنجاح" });
    },
    onError: (e: Error) => toast({ title: "خطأ", description: e.message, variant: "destructive" }),
  });

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
        </div>
      </AdminLayout>
    );
  }

  if (error || !provider) {
    return (
      <AdminLayout>
        <div className="flex flex-col items-center justify-center h-64 gap-4">
          <p className="text-slate-500">تعذّر تحميل بيانات الشركة.</p>
          <Button variant="outline" onClick={() => setLocation("/admin/providers")}>العودة للقائمة</Button>
        </div>
      </AdminLayout>
    );
  }

  const statusKey = providerStatusKey(provider);
  const status = STATUS_STYLE[statusKey] ?? STATUS_STYLE.pending;
  const rating = parseFloat(provider.rating) || 0;

  const ACTION_LABELS: Record<StatusAction, string> = {
    approve: "اعتماد",
    reject:  "رفض",
    suspend: "إيقاف",
  };
  const ACTION_CONFIRM: Record<StatusAction, string> = {
    approve: "هل أنت متأكد من اعتماد هذه الشركة؟",
    reject:  "هل أنت متأكد من رفض هذه الشركة؟",
    suspend: "هل أنت متأكد من إيقاف هذه الشركة؟",
  };

  return (
    <AdminLayout>
      <div className="max-w-4xl mx-auto space-y-6 pb-10" dir="rtl">

        {/* Top Bar */}
        <div className="flex items-center justify-between gap-4 pt-1">
          <Button variant="outline" size="sm" onClick={() => setLocation("/admin/providers")} className="gap-1.5 shrink-0">
            <BackIcon className="w-4 h-4" />
            الشركات العقارية
          </Button>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {statusKey !== "approved" && (
              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700 gap-1.5" onClick={() => setActionTarget({ action: "approve" })}>
                <CheckCircle2 className="w-4 h-4" /> اعتماد
              </Button>
            )}
            {!provider.suspended && (
              <Button size="sm" variant="outline" className="text-amber-600 border-amber-300 hover:bg-amber-50 gap-1.5" onClick={() => setActionTarget({ action: "suspend" })}>
                <Ban className="w-4 h-4" /> إيقاف
              </Button>
            )}
            {!provider.suspended && (
              <Button size="sm" variant="outline" className="text-red-600 border-red-300 hover:bg-red-50 gap-1.5" onClick={() => setActionTarget({ action: "reject" })}>
                <XCircle className="w-4 h-4" /> رفض
              </Button>
            )}
            <Button size="sm" onClick={() => setLocation(`/admin/providers/${providerId}/edit`)} className="bg-teal-600 hover:bg-teal-700 gap-1.5">
              <Pencil className="w-4 h-4" /> تعديل
            </Button>
          </div>
        </div>

        {/* Hero Card */}
        <Card className="overflow-hidden border-slate-200 shadow-sm">
          {/* Banner */}
          <div className="relative h-36 bg-gradient-to-br from-teal-500 to-teal-700 overflow-hidden">
            {provider.banner && (
              <img src={provider.banner} alt="banner" className="w-full h-full object-cover opacity-80" onError={e => { e.currentTarget.style.display = "none"; }} />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          </div>

          <CardContent className="pt-0 pb-6 px-6">
            {/* Avatar overlapping banner */}
            <div className="flex items-end gap-4 -mt-10 mb-4">
              <div className="w-20 h-20 rounded-2xl border-4 border-white bg-white shadow-md overflow-hidden shrink-0">
                {provider.avatar ? (
                  <img src={provider.avatar} alt={provider.userName} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center">
                    <User className="w-9 h-9 text-teal-600" />
                  </div>
                )}
              </div>
              <div className="pb-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h1 className="text-xl font-bold text-slate-800 truncate">{provider.userName}</h1>
                  <Badge variant="outline" className={`text-xs ${status.cls}`}>{status.label}</Badge>
                  {provider.verified && (
                    <Badge className="bg-blue-100 text-blue-700 border-blue-200 text-xs">✓ موثّق</Badge>
                  )}
                  {provider.featured && (
                    <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">
                      <Crown className="w-3 h-3 me-1 inline" />مميز
                    </Badge>
                  )}
                </div>
                {provider.userEmail && (
                  <p className="text-sm text-slate-500 mt-0.5">{provider.userEmail}</p>
                )}
              </div>
            </div>

            {/* Rating + stats row */}
            <div className="flex flex-wrap items-center gap-5 mt-2">
              <div className="flex items-center gap-2">
                <StarRow rating={rating} />
                <span className="text-sm font-semibold text-slate-700">{rating.toFixed(1)}</span>
                <span className="text-sm text-slate-400">({provider.reviewsCount} تقييم)</span>
              </div>
              {provider.categoryNameAr && (
                <span className="flex items-center gap-1.5 text-sm text-slate-600">
                  <Building2 className="w-4 h-4 text-slate-400" />
                  {provider.categoryNameAr}
                </span>
              )}
              {provider.city && (
                <span className="flex items-center gap-1.5 text-sm text-slate-600">
                  <MapPin className="w-4 h-4 text-slate-400" />
                  {provider.city}
                  {provider.district ? `، ${provider.district}` : ""}
                </span>
              )}
            </div>

            {/* Bio */}
            {provider.bio && (
              <p className="mt-4 text-sm text-slate-600 leading-relaxed border-t border-slate-100 pt-4">
                {provider.bio}
              </p>
            )}
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Contact Info */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Phone className="w-4 h-4 text-teal-600" />
                معلومات التواصل
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {provider.userEmail && (
                <div className="flex items-center gap-3 text-sm">
                  <Mail className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-700" dir="ltr">{provider.userEmail}</span>
                </div>
              )}
              {provider.phone && (
                <div className="flex items-center gap-3 text-sm">
                  <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-700" dir="ltr">{provider.phone}</span>
                </div>
              )}
              {provider.whatsapp && (
                <div className="flex items-center gap-3 text-sm">
                  <Globe className="w-4 h-4 text-slate-400 shrink-0" />
                  <span className="text-slate-700" dir="ltr">{provider.whatsapp}</span>
                  <span className="text-xs text-slate-400">(واتساب)</span>
                </div>
              )}
              {!provider.userEmail && !provider.phone && !provider.whatsapp && (
                <p className="text-sm text-slate-400">لا توجد معلومات تواصل</p>
              )}
            </CardContent>
          </Card>

          {/* Subscription */}
          <Card className={`border shadow-sm ${provider.subscription ? "border-teal-200 bg-teal-50/40" : "border-slate-200"}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Crown className="w-4 h-4 text-teal-600" />
                الاشتراك
              </CardTitle>
            </CardHeader>
            <CardContent>
              {provider.subscription ? (
                <div className="space-y-2">
                  <p className="font-bold text-teal-800 text-base">{provider.subscription.packageName ?? provider.subscription.packageNameAr ?? "—"}</p>
                  {provider.subscription.packagePrice && (
                    <p className="text-teal-700 text-sm font-semibold">{provider.subscription.packagePrice} ج.م / شهر</p>
                  )}
                  <div className="flex items-center gap-2 text-xs text-slate-500 pt-1 border-t border-teal-100">
                    <CalendarCheck className="w-3.5 h-3.5" />
                    {formatDate(provider.subscription.startDate)} ← {formatDate(provider.subscription.endDate)}
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-slate-400">
                  <Crown className="w-8 h-8 mx-auto mb-2 opacity-20" />
                  <p className="text-sm">لا يوجد اشتراك نشط</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Reviews */}
        {provider.reviews && provider.reviews.length > 0 && (
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-teal-600" />
                التقييمات ({provider.reviews.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {provider.reviews.slice(0, 5).map(review => (
                <div key={review.id} className="p-3 rounded-xl border border-slate-100 bg-slate-50 space-y-1.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center text-xs font-bold text-teal-700">
                        {review.userName ? review.userName[0] : "?"}
                      </div>
                      <span className="text-sm font-medium text-slate-700">{review.userName ?? "مستخدم"}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      {[1,2,3,4,5].map(i => (
                        <Star key={i} className={`w-3.5 h-3.5 ${i <= review.rating ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
                      ))}
                    </div>
                  </div>
                  {review.text && <p className="text-sm text-slate-600">{review.text}</p>}
                  {review.reply && (
                    <div className="ms-4 ps-3 border-s-2 border-teal-300 text-xs text-teal-700 italic">
                      رد الشركة: {review.reply}
                    </div>
                  )}
                  <p className="text-xs text-slate-400">{formatDate(review.createdAt)}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Empty reviews */}
        {(!provider.reviews || provider.reviews.length === 0) && (
          <Card className="border-slate-200 shadow-sm border-dashed">
            <CardContent className="py-10 text-center text-slate-400">
              <Star className="w-8 h-8 mx-auto mb-2 opacity-20" />
              <p className="text-sm">لا توجد تقييمات بعد</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Confirm Action Dialog */}
      <AlertDialog open={!!actionTarget} onOpenChange={o => !o && setActionTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle>
              {actionTarget ? ACTION_LABELS[actionTarget.action] : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {actionTarget ? ACTION_CONFIRM[actionTarget.action] : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>إلغاء</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => actionTarget && doAction.mutate({ action: actionTarget.action })}
              className="bg-teal-600 hover:bg-teal-700"
            >
              {doAction.isPending ? <Loader2 className="w-4 h-4 animate-spin me-1" /> : null}
              تأكيد
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AdminLayout>
  );
}
