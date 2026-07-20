import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowRight, CheckCircle2, XCircle, Star, ExternalLink, Trash2,
  MapPin, Phone, Eye, PhoneCall, Calendar, Building2, Loader2,
  AlertCircle, Check, ChevronLeft, ChevronRight, BarChart2,
  MessageCircle, Home, Pencil, ZoomIn,
} from "lucide-react";
import { api, mediaUrl } from "@/lib/api";
import { AdminLayout } from "@/components/admin/AdminLayout";
import toast from "react-hot-toast";

/* ── helpers ─────────────────────────────────────────────────────────────── */

const REJECT_CHIPS = [
  { id: "photos",  label: "📷 الصور غير واضحة أو منخفضة الجودة" },
  { id: "price",   label: "💰 السعر مبالغ فيه أو غير واقعي" },
  { id: "info",    label: "⚠️ معلومات مضللة أو غير دقيقة" },
  { id: "addr",    label: "📍 العنوان غير صحيح أو غير محدد" },
  { id: "dup",     label: "🔄 الإعلان مكرر أو موجود مسبقاً" },
  { id: "contact", label: "📞 بيانات التواصل مفقودة أو خاطئة" },
  { id: "policy",  label: "🚫 المحتوى ينتهك سياسة المنصة" },
];

const STATUS_STYLE: Record<string, string> = {
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  active:   "bg-emerald-100 text-emerald-800 border-emerald-200",
  pending:  "bg-amber-100 text-amber-800 border-amber-200",
  updated_after_rejection: "bg-violet-100 text-violet-800 border-violet-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  expired:  "bg-gray-100 text-gray-700 border-gray-200",
};
const STATUS_LABEL: Record<string, string> = {
  approved: "منشور", active: "منشور",
  pending: "قيد المراجعة",
  updated_after_rejection: "✏️ أُعيد إرساله بعد الرفض",
  rejected: "مرفوض", expired: "منتهية الصلاحية",
};
const LISTING_LABELS: Record<string, string> = { sale: "للبيع", rent: "للإيجار" };
const FINISHING_LABELS: Record<string, string> = {
  super_lux: "سوبر لوكس", lux: "لوكس",
  semi_finished: "نصف تشطيب", unfinished: "بدون تشطيب",
  fully_finished: "تشطيب كامل", core_shell: "هيكل عظمي",
};
const FURNISHED_LABELS: Record<string, string> = {
  furnished: "مفروشة", semi_furnished: "نصف مفروشة", unfurnished: "غير مفروشة",
};

function parseImages(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p.filter(Boolean) : [];
  } catch { return []; }
}

function fmtPrice(price: string | null | undefined): string | null {
  if (!price) return null;
  const n = parseFloat(price);
  if (isNaN(n)) return null;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)} مليون ج.م`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(0)} ألف ج.م`;
  return `${n.toLocaleString("ar-EG")} ج.م`;
}

function fmtDate(d: string | undefined | null): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
}

/* ── component ───────────────────────────────────────────────────────────── */

export default function AdminPropertyReview() {
  const { id } = useParams<{ id: string }>();
  const [, setLocation] = useLocation();
  const qc = useQueryClient();
  const propertyId = parseInt(id ?? "");

  const [imgIdx, setImgIdx] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectChips, setRejectChips] = useState<string[]>([]);
  const [rejectNote, setRejectNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(false);

  const { data: raw, isLoading, error } = useQuery({
    queryKey: ["admin-property-review", propertyId],
    queryFn: () => api.properties.get(propertyId),
    enabled: !isNaN(propertyId),
    staleTime: 30_000,
  });

  const prop = raw?.data as Record<string, any> ?? raw as Record<string, any>;

  if (isLoading) {
    return (
      <AdminLayout title="مراجعة العقار">
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
        </div>
      </AdminLayout>
    );
  }
  if (error || !prop?.id) {
    return (
      <AdminLayout title="مراجعة العقار">
        <div className="text-center py-24 text-slate-400">
          <Building2 className="w-14 h-14 mx-auto mb-4 opacity-30" />
          <p className="font-bold text-slate-600 text-lg">لم يُعثر على العقار</p>
          <button onClick={() => setLocation("/admin/properties")}
            className="mt-4 text-sm text-teal-600 hover:underline">
            ← العودة للقائمة
          </button>
        </div>
      </AdminLayout>
    );
  }

  const images  = parseImages(prop.images as string);
  const mainImg = images[imgIdx] ?? null;
  const statusCls = STATUS_STYLE[prop.status as string] ?? "bg-gray-100 text-gray-700 border-gray-200";
  const statusLbl = STATUS_LABEL[prop.status as string] ?? prop.status;
  const locationText = [prop.district, prop.city, prop.address].filter(Boolean).join("، ");
  const hasCoords = prop.latitude && prop.longitude;
  const isPending = prop.status === "pending" || prop.status === "updated_after_rejection";

  const invalidate = () => qc.invalidateQueries({ queryKey: ["admin-property-review", propertyId] });

  const handleApprove = async () => {
    setLoading(true);
    try {
      await api.properties.patchStatus(prop.id, "approved");
      toast.success(`✅ تمت الموافقة على: ${prop.title}`);
      invalidate();
      setLocation("/admin/properties");
    } catch { toast.error("فشل اعتماد العقار"); }
    finally { setLoading(false); }
  };

  const handleRejectConfirm = async () => {
    setLoading(true);
    try {
      const labels = rejectChips.map(cid => REJECT_CHIPS.find(c => c.id === cid)?.label ?? "").filter(Boolean);
      const parts  = [...labels];
      if (rejectNote.trim()) parts.push(rejectNote.trim());
      const reason = parts.join("\n") || "لا يتوافق مع شروط النشر";
      await api.properties.patchStatus(prop.id, "rejected", reason);
      toast.success("❌ تم رفض الإعلان وإشعار المعلن");
      invalidate();
      setLocation("/admin/properties");
    } catch { toast.error("فشل رفض العقار"); }
    finally { setLoading(false); }
  };

  const handleToggleFeatured = async () => {
    setLoading(true);
    try {
      await api.properties.update(prop.id, { featured: !prop.featured });
      toast.success(prop.featured ? "تم إلغاء التمييز" : "تم تمييز العقار ⭐");
      invalidate();
    } catch { toast.error("فشل تحديث التمييز"); }
    finally { setLoading(false); }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) {
      setDeleteConfirm(true);
      setTimeout(() => setDeleteConfirm(false), 4000);
      return;
    }
    setLoading(true);
    try {
      await api.properties.delete(prop.id);
      toast.success("تم حذف الإعلان");
      setLocation("/admin/properties");
    } catch { toast.error("فشل الحذف"); }
    finally { setLoading(false); }
  };

  return (
    <AdminLayout title={`مراجعة: ${prop.title}`}>
      <div dir="rtl" className="max-w-5xl mx-auto pb-12">

        {/* ── Top bar ── */}
        <div className="flex items-center gap-3 mb-6 flex-wrap">
          <button
            onClick={() => setLocation("/admin/properties")}
            className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors font-medium"
          >
            <ArrowRight className="w-4 h-4" />
            إدارة العقارات
          </button>
          <span className="text-slate-300">/</span>
          <span className="text-sm text-slate-700 font-semibold truncate max-w-[240px]">{prop.title}</span>

          <div className="flex items-center gap-2 ms-auto flex-wrap">
            <span className={`text-xs font-bold px-3 py-1 rounded-full border ${statusCls}`}>
              {statusLbl}
            </span>
            {prop.featured && (
              <span className="text-xs font-bold px-3 py-1 rounded-full bg-amber-100 text-amber-700 border border-amber-200">⭐ مميز</span>
            )}
          </div>
        </div>

        {/* ── Pending notice ── */}
        {isPending && (
          <div className={`flex items-start gap-3 rounded-xl p-4 mb-6 border ${prop.status === "updated_after_rejection" ? "bg-violet-50 border-violet-200" : "bg-amber-50 border-amber-200"}`}>
            <AlertCircle className={`w-5 h-5 shrink-0 mt-0.5 ${prop.status === "updated_after_rejection" ? "text-violet-600" : "text-amber-600"}`} />
            <div>
              <p className={`font-bold text-sm ${prop.status === "updated_after_rejection" ? "text-violet-800" : "text-amber-800"}`}>
                {prop.status === "updated_after_rejection"
                  ? "هذا الإعلان أُعيد إرساله بعد رفضه — يحتاج مراجعة التعديلات"
                  : "هذا الإعلان ينتظر موافقتك قبل النشر"}
              </p>
              {prop.rejectionReason && (
                <p className="text-xs text-violet-600 mt-1 whitespace-pre-line">سبب الرفض السابق: {prop.rejectionReason}</p>
              )}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

          {/* ── Left column: images + details ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Image gallery */}
            <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 shadow-sm">
              {images.length > 0 ? (
                <>
                  {/* Main image */}
                  <div className="relative aspect-[16/9] bg-slate-200 overflow-hidden group">
                    <img
                      src={mediaUrl(mainImg ?? "")}
                      alt={prop.title as string}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={e => { e.currentTarget.style.opacity = "0.3"; }}
                    />
                    {/* Lightbox trigger */}
                    <button
                      onClick={() => setLightbox(true)}
                      className="absolute top-3 left-3 bg-black/50 hover:bg-black/70 text-white rounded-xl px-3 py-1.5 text-xs font-semibold flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <ZoomIn className="w-3.5 h-3.5" />
                      تكبير
                    </button>
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
                          className="absolute top-1/2 right-3 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                        >
                          <ChevronRight className="w-5 h-5" />
                        </button>
                        <button
                          onClick={() => setImgIdx(i => (i + 1) % images.length)}
                          className="absolute top-1/2 left-3 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white transition-colors"
                        >
                          <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="absolute bottom-3 right-3 text-xs font-bold text-white bg-black/60 px-3 py-1 rounded-full">
                          {imgIdx + 1} / {images.length}
                        </span>
                      </>
                    )}
                  </div>

                  {/* Thumbnails */}
                  {images.length > 1 && (
                    <div className="flex gap-2 p-3 overflow-x-auto bg-slate-50 border-t border-slate-200">
                      {images.map((img, i) => (
                        <button
                          key={i}
                          onClick={() => setImgIdx(i)}
                          className={`relative w-20 h-14 rounded-xl overflow-hidden border-2 shrink-0 transition-all ${
                            i === imgIdx ? "border-teal-500 shadow-md scale-105" : "border-transparent opacity-60 hover:opacity-90 hover:scale-105"
                          }`}
                        >
                          <img src={mediaUrl(img)} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="aspect-[16/9] flex flex-col items-center justify-center text-slate-300 gap-3">
                  <Building2 className="w-16 h-16 opacity-40" />
                  <p className="text-sm font-medium text-slate-400">لا توجد صور</p>
                </div>
              )}
            </div>

            {/* Description */}
            {prop.description && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">وصف العقار</h3>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{prop.description as string}</p>
              </div>
            )}

            {/* Location */}
            {(locationText || hasCoords) && (
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">الموقع</h3>
                <div className="flex items-start gap-2 text-sm text-slate-700">
                  <MapPin className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                  <span>{locationText || "—"}</span>
                </div>
                {hasCoords && (
                  <a
                    href={`https://maps.google.com/?q=${prop.latitude},${prop.longitude}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2.5 text-xs text-teal-600 hover:underline font-semibold"
                  >
                    <ExternalLink className="w-3 h-3" />
                    عرض على خريطة جوجل
                  </a>
                )}
                {/* Embedded map preview */}
                {hasCoords && (
                  <div className="mt-3 rounded-xl overflow-hidden border border-slate-200 h-48">
                    <iframe
                      title="map"
                      className="w-full h-full border-0"
                      src={`https://maps.google.com/maps?q=${prop.latitude},${prop.longitude}&z=15&output=embed`}
                      loading="lazy"
                    />
                  </div>
                )}
              </div>
            )}

            {/* Stats */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">إحصائيات الإعلان</h3>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { icon: Eye,       color: "text-blue-500 bg-blue-50",   label: "مشاهدة",  value: prop.viewCount ?? 0 },
                  { icon: PhoneCall, color: "text-green-500 bg-green-50", label: "اتصال",   value: prop.phoneClickCount ?? 0 },
                  { icon: BarChart2, color: "text-purple-500 bg-purple-50", label: "واتساب", value: prop.whatsappClickCount ?? 0 },
                ].map(({ icon: Icon, color, label, value }) => (
                  <div key={label} className={`rounded-2xl p-4 text-center ${color.split(" ")[1]}`}>
                    <Icon className={`w-5 h-5 mx-auto mb-1 ${color.split(" ")[0]}`} />
                    <p className="text-2xl font-extrabold text-slate-800 leading-none">{Number(value).toLocaleString("ar-EG")}</p>
                    <p className="text-xs text-slate-500 mt-1">{label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right column: specs + actions ── */}
          <div className="space-y-5">

            {/* Specs card */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">تفاصيل العقار</h3>

              {/* Type badges */}
              <div className="flex flex-wrap gap-2">
                {prop.listingType && (
                  <span className={`text-xs font-bold px-3 py-1.5 rounded-full border ${
                    prop.listingType === "sale" ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-blue-50 text-blue-700 border-blue-200"
                  }`}>
                    {LISTING_LABELS[prop.listingType as string] ?? prop.listingType}
                  </span>
                )}
                {prop.mainCategory && (
                  <span className="text-xs font-semibold px-3 py-1.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                    {prop.mainCategory as string}
                  </span>
                )}
              </div>

              {/* Key numbers */}
              <div className="grid grid-cols-2 gap-2.5">
                {fmtPrice(prop.price as string) && (
                  <div className="col-span-2 bg-teal-50 rounded-xl p-3 text-center border border-teal-100">
                    <p className="text-[10px] font-semibold text-teal-600 uppercase mb-1">السعر</p>
                    <p className="text-xl font-extrabold text-teal-800">{fmtPrice(prop.price as string)}</p>
                  </div>
                )}
                {prop.area && (
                  <div className="bg-blue-50 rounded-xl p-3 text-center border border-blue-100">
                    <p className="text-[10px] font-semibold text-blue-600 uppercase mb-1">المساحة</p>
                    <p className="text-lg font-extrabold text-blue-800">{prop.area as string} <span className="text-xs font-normal">م²</span></p>
                  </div>
                )}
                {prop.rooms != null && Number(prop.rooms) > 0 && (
                  <div className="bg-purple-50 rounded-xl p-3 text-center border border-purple-100">
                    <p className="text-[10px] font-semibold text-purple-600 uppercase mb-1">الغرف</p>
                    <p className="text-lg font-extrabold text-purple-800">{prop.rooms as number}</p>
                  </div>
                )}
                {prop.bathrooms != null && Number(prop.bathrooms) > 0 && (
                  <div className="bg-orange-50 rounded-xl p-3 text-center border border-orange-100">
                    <p className="text-[10px] font-semibold text-orange-600 uppercase mb-1">الحمامات</p>
                    <p className="text-lg font-extrabold text-orange-800">{prop.bathrooms as number}</p>
                  </div>
                )}
                {prop.floor != null && (
                  <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">الدور</p>
                    <p className="text-lg font-extrabold text-slate-700">{prop.floor as number}</p>
                  </div>
                )}
                {prop.totalFloors != null && (
                  <div className="bg-slate-50 rounded-xl p-3 text-center border border-slate-200">
                    <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">الأدوار</p>
                    <p className="text-lg font-extrabold text-slate-700">{prop.totalFloors as number}</p>
                  </div>
                )}
              </div>

              {/* Extra tags */}
              {(prop.finishing || prop.furnished || prop.buildYear) && (
                <div className="flex flex-wrap gap-2 pt-1 border-t border-slate-100">
                  {prop.finishing && (
                    <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full font-medium">
                      {FINISHING_LABELS[prop.finishing as string] ?? prop.finishing}
                    </span>
                  )}
                  {prop.furnished && (
                    <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full font-medium">
                      {FURNISHED_LABELS[prop.furnished as string] ?? prop.furnished}
                    </span>
                  )}
                  {prop.buildYear && (
                    <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full font-medium">
                      سنة البناء: {prop.buildYear as number}
                    </span>
                  )}
                </div>
              )}

              {/* Contact */}
              {(prop.phone || prop.whatsapp) && (
                <div className="pt-1 border-t border-slate-100 space-y-2">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">التواصل</p>
                  <div className="flex flex-wrap gap-2">
                    {prop.phone && (
                      <a href={`tel:${prop.phone}`} className="flex items-center gap-2 text-xs bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-2 rounded-xl text-green-800 font-medium transition-colors">
                        <Phone className="w-3 h-3" />
                        {prop.phone as string}
                      </a>
                    )}
                    {prop.whatsapp && (
                      <a href={`https://wa.me/${prop.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-xs bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-2 rounded-xl text-emerald-800 font-medium transition-colors">
                        <MessageCircle className="w-3 h-3" />
                        واتساب
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="pt-1 border-t border-slate-100 space-y-1.5">
                {prop.createdAt && (
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    تاريخ الإضافة: {fmtDate(prop.createdAt as string)}
                  </p>
                )}
                {prop.approvedAt && (
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    تاريخ الاعتماد: {fmtDate(prop.approvedAt as string)}
                  </p>
                )}
                {prop.ownerUserId && (
                  <p className="flex items-center gap-2 text-xs text-slate-500">
                    <Home className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    معرف المالك: #{prop.ownerUserId as number}
                  </p>
                )}
              </div>
            </div>

            {/* Rejection reason (if any) */}
            {prop.rejectionReason && prop.status === "rejected" && (
              <div className="rounded-2xl border border-red-200 bg-red-50 p-4">
                <p className="text-xs font-bold text-red-700 mb-2">سبب الرفض:</p>
                <p className="text-xs text-red-600 leading-relaxed whitespace-pre-line">{prop.rejectionReason as string}</p>
              </div>
            )}

            {/* ── Action card ── */}
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest">الإجراءات</h3>

              {/* Approve */}
              {prop.status !== "approved" && prop.status !== "active" && !rejectMode && (
                <button
                  onClick={handleApprove}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl py-3 transition-colors disabled:opacity-50 shadow-sm shadow-emerald-200"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                  اعتماد ونشر الإعلان
                </button>
              )}

              {(prop.status === "approved" || prop.status === "active") && !rejectMode && (
                <div className="flex items-center justify-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl py-3 font-semibold">
                  <CheckCircle2 className="w-4 h-4" />
                  معتمد ومنشور
                </div>
              )}

              {/* Reject button / picker */}
              {!rejectMode && prop.status !== "rejected" && (
                <button
                  onClick={() => setRejectMode(true)}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 text-sm font-bold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded-xl py-3 transition-colors"
                >
                  <XCircle className="w-4 h-4" />
                  رفض الإعلان
                </button>
              )}

              {rejectMode && (
                <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-3">
                  <p className="text-sm font-bold text-rose-800 flex items-center gap-2">
                    <AlertCircle className="w-4 h-4" /> اختر سبب الرفض
                    <span className="text-xs font-normal text-rose-600">(اختياري)</span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {REJECT_CHIPS.map(chip => {
                      const sel = rejectChips.includes(chip.id);
                      return (
                        <button
                          key={chip.id}
                          type="button"
                          onClick={() => setRejectChips(prev => sel ? prev.filter(x => x !== chip.id) : [...prev, chip.id])}
                          className={`relative text-xs px-3 py-1.5 rounded-xl border-2 transition-all font-medium ${sel ? "border-rose-500 bg-rose-100 text-rose-800" : "border-slate-200 bg-white text-slate-600 hover:border-rose-300"}`}
                        >
                          {sel && (
                            <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-rose-500 rounded-full flex items-center justify-center">
                              <Check className="w-2.5 h-2.5 text-white" />
                            </span>
                          )}
                          {chip.label}
                        </button>
                      );
                    })}
                  </div>
                  <textarea
                    value={rejectNote}
                    onChange={e => setRejectNote(e.target.value)}
                    placeholder="ملاحظة إضافية للمعلن (اختياري)..."
                    className="w-full text-sm border border-rose-200 rounded-xl px-3 py-2.5 resize-none focus:outline-none focus:border-rose-400 bg-white"
                    rows={2}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleRejectConfirm}
                      disabled={loading}
                      className="flex-1 flex items-center justify-center gap-2 bg-rose-600 hover:bg-rose-700 text-white text-sm font-bold py-2.5 rounded-xl transition-colors disabled:opacity-50"
                    >
                      {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                      تأكيد الرفض
                    </button>
                    <button
                      onClick={() => { setRejectMode(false); setRejectChips([]); setRejectNote(""); }}
                      className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 font-medium"
                    >
                      إلغاء
                    </button>
                  </div>
                </div>
              )}

              <div className="border-t border-slate-100 pt-3 flex flex-wrap gap-2">
                {/* View public page */}
                <a
                  href={`/property/${prop.id}`}
                  target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-teal-700 border border-slate-200 hover:border-teal-300 bg-white hover:bg-teal-50 rounded-xl py-2 px-3 transition-colors"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  عرض الصفحة العامة
                </a>

                {/* Edit */}
                <button
                  onClick={() => setLocation(`/admin/properties/${prop.id}/edit`)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-teal-700 border border-teal-200 bg-teal-50 hover:bg-teal-100 rounded-xl py-2 px-3 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                  تعديل
                </button>

                {/* Featured toggle */}
                <button
                  onClick={handleToggleFeatured}
                  disabled={loading}
                  className={`flex items-center gap-1.5 text-xs font-semibold rounded-xl py-2 px-3 transition-colors border ${prop.featured ? "bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200" : "bg-white text-slate-600 hover:bg-amber-50 hover:text-amber-700 border-slate-200"}`}
                >
                  <Star className={`w-3.5 h-3.5 ${prop.featured ? "fill-amber-500" : ""}`} />
                  {prop.featured ? "إلغاء التمييز" : "تمييز"}
                </button>

                {/* Delete */}
                <button
                  onClick={handleDelete}
                  disabled={loading}
                  className={`flex items-center gap-1.5 text-xs font-semibold rounded-xl py-2 px-3 transition-colors border ${deleteConfirm ? "bg-red-600 text-white border-red-600 hover:bg-red-700" : "text-red-500 border-slate-200 hover:border-red-200 hover:bg-red-50"}`}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  {deleteConfirm ? "اضغط مجدداً للتأكيد" : "حذف"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Lightbox ── */}
      {lightbox && mainImg && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center p-4"
          onClick={() => setLightbox(false)}
        >
          <img
            src={mediaUrl(mainImg)}
            alt=""
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={e => e.stopPropagation()}
          />
          <button
            onClick={() => setLightbox(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 hover:bg-white/40 flex items-center justify-center text-white text-xl font-bold transition-colors"
          >
            ✕
          </button>
          {images.length > 1 && (
            <>
              <button
                onClick={e => { e.stopPropagation(); setImgIdx(i => (i - 1 + images.length) % images.length); }}
                className="absolute top-1/2 right-4 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              <button
                onClick={e => { e.stopPropagation(); setImgIdx(i => (i + 1) % images.length); }}
                className="absolute top-1/2 left-4 -translate-y-1/2 w-12 h-12 bg-white/20 hover:bg-white/40 rounded-full flex items-center justify-center text-white transition-colors"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            </>
          )}
        </div>
      )}
    </AdminLayout>
  );
}
