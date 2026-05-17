import { useState, useEffect } from "react";
import { Link } from "wouter";
import {
  Calendar,
  Clock,
  CheckCircle2,
  XCircle,
  Star,
  Loader2,
  MessageSquare,
  FileText,
  X,
  AlertTriangle,
} from "lucide-react";
import UserLayout from "@/components/UserLayout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { api, UserRequestItem } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

type StatusKey = "new" | "in_progress" | "completed" | "cancelled";

const STATUS_LABELS: Record<StatusKey, string> = {
  new: "جديد",
  in_progress: "قيد التنفيذ",
  completed: "مكتمل",
  cancelled: "ملغي",
};

function formatDate(iso: string) {
  try {
    return new Date(iso).toLocaleDateString("ar-SA", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case "new":
      return (
        <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-none">
          <Clock className="w-3 h-3 ml-1" /> جديد
        </Badge>
      );
    case "in_progress":
      return (
        <Badge className="bg-amber-100 text-amber-700 hover:bg-amber-100 border-none">
          <Clock className="w-3 h-3 ml-1" /> قيد التنفيذ
        </Badge>
      );
    case "completed":
      return (
        <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-none">
          <CheckCircle2 className="w-3 h-3 ml-1" /> مكتمل
        </Badge>
      );
    case "cancelled":
      return (
        <Badge className="bg-rose-100 text-rose-700 hover:bg-rose-100 border-none">
          <XCircle className="w-3 h-3 ml-1" /> ملغي
        </Badge>
      );
    default:
      return <Badge>{status}</Badge>;
  }
}

export default function UserRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<UserRequestItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");

  const [detailsReq, setDetailsReq] = useState<UserRequestItem | null>(null);
  const [invoiceReq, setInvoiceReq] = useState<UserRequestItem | null>(null);
  const [cancelReq, setCancelReq] = useState<UserRequestItem | null>(null);
  const [cancelNote, setCancelNote] = useState("");
  const [cancelling, setCancelling] = useState(false);

  const [ratingReq, setRatingReq] = useState<UserRequestItem | null>(null);
  const [rating, setRating] = useState(0);
  const [ratingText, setRatingText] = useState("");
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    api.requests
      .listByUser(user.id)
      .then(setRequests)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [user?.id]);

  const filteredRequests = requests.filter((req) => {
    if (filter === "all") return true;
    if (filter === "active") return req.status === "new" || req.status === "in_progress";
    if (filter === "completed") return req.status === "completed";
    if (filter === "cancelled") return req.status === "cancelled";
    return true;
  });

  const handleCancel = async () => {
    if (!cancelReq) return;
    setCancelling(true);
    try {
      await api.requests.cancel(cancelReq.id);
      setRequests((prev) =>
        prev.map((r) => (r.id === cancelReq.id ? { ...r, status: "cancelled" } : r))
      );
      setCancelReq(null);
      setCancelNote("");
    } catch {
    } finally {
      setCancelling(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!ratingReq || !rating || !ratingReq.providerId) return;
    setSubmittingRating(true);
    try {
      await api.reviews.create(ratingReq.providerId, {
        userId: user?.id,
        rating,
        text: ratingText || undefined,
      });
      setRatingReq(null);
      setRating(0);
      setRatingText("");
    } catch {
    } finally {
      setSubmittingRating(false);
    }
  };

  return (
    <UserLayout>
      <div className="p-6 max-w-5xl mx-auto space-y-6 animate-in fade-in duration-500">
        <div>
          <h1 className="text-2xl font-bold text-foreground">طلباتي</h1>
          <p className="text-muted-foreground mt-1">تتبع حالة طلباتك وتواصل مع المزودين</p>
        </div>

        <Tabs defaultValue="all" onValueChange={setFilter} className="w-full">
          <TabsList className="grid grid-cols-4 mb-6">
            <TabsTrigger value="all">الكل</TabsTrigger>
            <TabsTrigger value="active">نشط</TabsTrigger>
            <TabsTrigger value="completed">مكتمل</TabsTrigger>
            <TabsTrigger value="cancelled">ملغي</TabsTrigger>
          </TabsList>

          <div className="space-y-4">
            {loading ? (
              <div className="flex items-center justify-center py-24">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              </div>
            ) : filteredRequests.length === 0 ? (
              <div className="text-center py-16 bg-secondary/20 rounded-xl border border-border/50">
                <p className="text-muted-foreground">لا توجد طلبات تطابق الفلتر المحدد.</p>
                <Link href="/search">
                  <Button className="mt-4 bg-indigo-600 hover:bg-indigo-700 text-white">
                    استكشف الخدمات
                  </Button>
                </Link>
              </div>
            ) : (
              filteredRequests.map((request) => {
                const statusLabel = STATUS_LABELS[request.status as StatusKey] ?? request.status;
                const avatarSrc = request.providerAvatar
                  ? request.providerAvatar
                  : `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(request.providerName ?? "provider")}`;

                return (
                  <Card
                    key={request.id}
                    className="overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <CardContent className="p-0">
                      <div className="flex flex-col sm:flex-row sm:items-stretch">
                        <div className="p-5 flex-1 flex flex-col sm:flex-row gap-4 sm:items-center">
                          <div className="w-12 h-12 rounded-full bg-secondary shrink-0 overflow-hidden border border-border">
                            <img
                              src={avatarSrc}
                              alt={request.providerName ?? "مزود"}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="space-y-1 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-bold text-base">
                                {request.serviceTitle ?? "خدمة غير محددة"}
                              </h3>
                              <span className="text-xs font-mono bg-secondary px-2 py-0.5 rounded text-foreground">
                                #{request.id}
                              </span>
                            </div>
                            <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                              {request.providerName && (
                                <span className="flex items-center gap-1">
                                  <span>المزود:</span>
                                  <span className="font-medium text-foreground">
                                    {request.providerName}
                                  </span>
                                </span>
                              )}
                              <span className="flex items-center gap-1">
                                <Calendar className="w-3.5 h-3.5" />
                                {formatDate(request.createdAt)}
                              </span>
                            </div>
                            {request.message && (
                              <p className="text-xs text-muted-foreground line-clamp-1 mt-1">
                                {request.message}
                              </p>
                            )}
                          </div>
                          <div className="sm:text-left mt-2 sm:mt-0">
                            {getStatusBadge(request.status)}
                          </div>
                        </div>

                        <div className="bg-secondary/30 p-4 sm:w-52 flex sm:flex-col items-center justify-end sm:justify-center gap-2 border-t sm:border-t-0 sm:border-r border-border/50">
                          {request.status === "completed" ? (
                            <Button
                              size="sm"
                              className="w-full bg-amber-500 hover:bg-amber-600 text-white"
                              onClick={() => { setRatingReq(request); setRating(0); setRatingText(""); }}
                            >
                              <Star className="w-3.5 h-3.5 ml-1" />
                              كتابة تقييم
                            </Button>
                          ) : request.status === "new" || request.status === "in_progress" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full"
                              onClick={() => setDetailsReq(request)}
                            >
                              <FileText className="w-3.5 h-3.5 ml-1" />
                              عرض التفاصيل
                            </Button>
                          ) : (
                            <Link href="/search">
                              <Button size="sm" variant="outline" className="w-full">
                                إعادة الطلب
                              </Button>
                            </Link>
                          )}

                          <div className="flex gap-2 w-full">
                            {request.providerId && (
                              <Link href={`/provider/${request.providerId}`} className="flex-1">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="w-full text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                                >
                                  <MessageSquare className="w-3.5 h-3.5 ml-1" />
                                  مراسلة
                                </Button>
                              </Link>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="flex-1 text-xs text-slate-600 hover:bg-slate-50"
                              onClick={() => setInvoiceReq(request)}
                            >
                              <FileText className="w-3.5 h-3.5 ml-1" />
                              فاتورة
                            </Button>
                          </div>

                          {request.status === "new" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="w-full text-xs text-red-600 hover:bg-red-50 hover:text-red-700"
                              onClick={() => { setCancelReq(request); setCancelNote(""); }}
                            >
                              <X className="w-3.5 h-3.5 ml-1" />
                              إلغاء الطلب
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        </Tabs>
      </div>

      {/* Order Details Modal */}
      <Dialog open={!!detailsReq} onOpenChange={() => setDetailsReq(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تفاصيل الطلب #{detailsReq?.id}</DialogTitle>
            <DialogDescription>معلومات كاملة عن طلبك</DialogDescription>
          </DialogHeader>
          {detailsReq && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">الخدمة</p>
                  <p className="font-medium">{detailsReq.serviceTitle ?? "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">الحالة</p>
                  {getStatusBadge(detailsReq.status)}
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">المزود</p>
                  <p className="font-medium">{detailsReq.providerName ?? "—"}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground text-xs">تاريخ الطلب</p>
                  <p className="font-medium">{formatDate(detailsReq.createdAt)}</p>
                </div>
                {detailsReq.servicePrice && (
                  <div className="space-y-1">
                    <p className="text-muted-foreground text-xs">السعر</p>
                    <p className="font-bold text-teal-600">{detailsReq.servicePrice} ريال</p>
                  </div>
                )}
              </div>
              {detailsReq.message && (
                <div className="rounded-lg bg-secondary/50 p-3">
                  <p className="text-xs text-muted-foreground mb-1">رسالتك للمزود</p>
                  <p className="text-sm">{detailsReq.message}</p>
                </div>
              )}
              {detailsReq.notes && (
                <div className="rounded-lg bg-amber-50 dark:bg-amber-900/10 p-3 border border-amber-100">
                  <p className="text-xs text-amber-600 mb-1">ملاحظات المزود</p>
                  <p className="text-sm">{detailsReq.notes}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            {detailsReq?.providerId && (
              <Link href={`/provider/${detailsReq.providerId}`}>
                <Button variant="outline" className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  زيارة صفحة المزود
                </Button>
              </Link>
            )}
            <Button onClick={() => setDetailsReq(null)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invoice Modal */}
      <Dialog open={!!invoiceReq} onOpenChange={() => setInvoiceReq(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>فاتورة الطلب</DialogTitle>
            <DialogDescription>ملخص تفصيلي للطلب والتكلفة</DialogDescription>
          </DialogHeader>
          {invoiceReq && (
            <div className="py-2">
              <div className="border border-border rounded-xl overflow-hidden">
                <div className="bg-indigo-600 text-white px-5 py-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-indigo-200">سمارت لاينز للنظم المتطورة</p>
                      <p className="font-bold text-lg">فاتورة خدمة</p>
                    </div>
                    <div className="text-left">
                      <p className="text-xs text-indigo-200">رقم الطلب</p>
                      <p className="font-mono font-bold">#{invoiceReq.id}</p>
                    </div>
                  </div>
                </div>
                <div className="p-5 space-y-3 text-sm">
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">الخدمة</span>
                    <span className="font-medium">{invoiceReq.serviceTitle ?? "خدمة"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">المزود</span>
                    <span className="font-medium">{invoiceReq.providerName ?? "—"}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">التاريخ</span>
                    <span className="font-medium">{formatDate(invoiceReq.createdAt)}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-border/50">
                    <span className="text-muted-foreground">الحالة</span>
                    {getStatusBadge(invoiceReq.status)}
                  </div>
                  <div className="flex justify-between py-3 mt-1 bg-secondary/50 rounded-lg px-3">
                    <span className="font-bold">الإجمالي</span>
                    <span className="font-bold text-teal-600 text-base">
                      {invoiceReq.servicePrice ? `${invoiceReq.servicePrice} ريال` : "حسب الاتفاق"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setInvoiceReq(null)}>إغلاق</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Cancel Confirmation Modal */}
      <Dialog open={!!cancelReq} onOpenChange={() => setCancelReq(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="w-5 h-5" />
              إلغاء الطلب
            </DialogTitle>
            <DialogDescription>
              هل أنت متأكد من إلغاء طلب "{cancelReq?.serviceTitle ?? "هذا الطلب"}"؟ لا يمكن التراجع عن هذا الإجراء.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-foreground mb-2 block">
              سبب الإلغاء (اختياري)
            </label>
            <Textarea
              value={cancelNote}
              onChange={(e) => setCancelNote(e.target.value)}
              placeholder="اكتب سبب الإلغاء هنا..."
              className="min-h-[80px]"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCancelReq(null)} disabled={cancelling}>
              تراجع
            </Button>
            <Button
              variant="destructive"
              onClick={handleCancel}
              disabled={cancelling}
              className="gap-2"
            >
              {cancelling && <Loader2 className="w-4 h-4 animate-spin" />}
              تأكيد الإلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rating Modal */}
      <Dialog open={!!ratingReq} onOpenChange={() => setRatingReq(null)}>
        <DialogContent className="sm:max-w-md" dir="rtl">
          <DialogHeader>
            <DialogTitle>تقييم الخدمة</DialogTitle>
            <DialogDescription>
              كيف كانت تجربتك مع {ratingReq?.providerName} في خدمة {ratingReq?.serviceTitle}؟
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <div className="flex justify-center gap-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(star)}
                  className={`p-1 transition-colors ${star <= rating ? "text-amber-500" : "text-gray-300"}`}
                >
                  <Star className={`w-10 h-10 ${star <= rating ? "fill-amber-500" : ""}`} />
                </button>
              ))}
            </div>
            <Textarea
              value={ratingText}
              onChange={(e) => setRatingText(e.target.value)}
              placeholder="اكتب تعليقك هنا عن جودة الخدمة والمزود..."
              className="min-h-[100px]"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setRatingReq(null)}>
              إلغاء
            </Button>
            <Button
              type="button"
              disabled={!rating || submittingRating}
              onClick={handleSubmitRating}
              className="gap-2"
            >
              {submittingRating && <Loader2 className="w-4 h-4 animate-spin" />}
              إرسال التقييم
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </UserLayout>
  );
}
