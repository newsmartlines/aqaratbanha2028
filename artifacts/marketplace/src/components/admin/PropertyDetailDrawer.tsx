import { useState } from "react";
import {
  X, CheckCircle2, XCircle, Star, ExternalLink, Trash2,
  MapPin, Phone, Eye, PhoneCall, Calendar, Building2,
  AlertCircle, Check, Loader2, ChevronLeft, ChevronRight,
  BarChart2, MessageCircle,
} from "lucide-react";
import { api, mediaUrl } from "@/lib/api";
import toast from "react-hot-toast";

export interface ExtendedProperty {
  id: number;
  title: string;
  description?: string | null;
  mainCategory?: string;
  listingType?: string;
  price?: string | null;
  area?: string | null;
  rooms?: number | null;
  bathrooms?: number | null;
  floor?: number | null;
  totalFloors?: number | null;
  buildYear?: number | null;
  finishing?: string | null;
  furnished?: string | null;
  status: string;
  rejectionReason?: string | null;
  featured?: boolean;
  address?: string | null;
  district?: string | null;
  city?: string | null;
  images?: string | null;
  phone?: string | null;
  whatsapp?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  viewCount?: number;
  phoneClickCount?: number;
  whatsappClickCount?: number;
  ownerUserId?: number | null;
  providerId?: number | null;
  createdAt?: string;
  approvedAt?: string | null;
}

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
  rejected: "bg-red-100 text-red-800 border-red-200",
  inactive: "bg-gray-100 text-gray-700 border-gray-200",
};
const STATUS_LABEL: Record<string, string> = {
  approved: "منشور", active: "منشور", pending: "قيد المراجعة",
  rejected: "مرفوض", inactive: "غير نشط",
};
const LISTING_LABELS: Record<string, string> = { sale: "للبيع", rent: "للإيجار" };
const FINISHING_LABELS: Record<string, string> = {
  fully_finished: "تشطيب كامل", semi_finished: "نصف تشطيب", core_shell: "هيكل عظمي",
};
const FURNISHED_LABELS: Record<string, string> = {
  furnished: "مفروشة", semi_furnished: "نصف مفروشة", unfurnished: "غير مفروشة",
};

interface Props {
  property: ExtendedProperty | null;
  onClose: () => void;
  onStatusChange?: (id: number, newStatus: string) => void;
  onToggleFeatured?: (id: number, featured: boolean) => void;
  onDelete?: (id: number) => void;
}

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
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)} م ج.م`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)} ألف ج.م`;
  return `${n.toLocaleString("en-US")} ج.م`;
}

function fmtDate(d: string | undefined): string {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });
}

export function PropertyDetailDrawer({
  property: prop, onClose, onStatusChange, onToggleFeatured, onDelete,
}: Props) {
  const [imgIdx, setImgIdx]       = useState(0);
  const [rejectMode, setRejectMode] = useState(false);
  const [rejectChips, setRejectChips] = useState<string[]>([]);
  const [rejectNote, setRejectNote]   = useState("");
  const [loading, setLoading]         = useState(false);

  if (!prop) return null;

  const images  = parseImages(prop.images);
  const mainImg = images[imgIdx] ?? null;
  const statusCls = STATUS_STYLE[prop.status] ?? "bg-gray-100 text-gray-700 border-gray-200";
  const statusLbl = STATUS_LABEL[prop.status]  ?? prop.status;
  const locationText = [prop.district, prop.city, prop.address].filter(Boolean).join("، ");
  const hasCoords = prop.latitude && prop.longitude;

  const handleApprove = async () => {
    setLoading(true);
    try {
      await api.properties.patchStatus(prop.id, "approved");
      onStatusChange?.(prop.id, "approved");
      toast.success(`✅ تمت الموافقة على: ${prop.title}`);
      onClose();
    } catch { toast.error("فشل اعتماد العقار"); }
    finally { setLoading(false); }
  };

  const handleRejectConfirm = async () => {
    setLoading(true);
    try {
      const labels = rejectChips.map(id => REJECT_CHIPS.find(c => c.id === id)?.label ?? "").filter(Boolean);
      const parts  = [...labels];
      if (rejectNote.trim()) parts.push(rejectNote.trim());
      const reason = parts.join("\n") || "لا يتوافق مع شروط النشر";
      await api.properties.patchStatus(prop.id, "rejected", reason);
      onStatusChange?.(prop.id, "rejected");
      toast.success(`❌ تم رفض الإعلان وإشعار المعلن`);
      onClose();
    } catch { toast.error("فشل رفض العقار"); }
    finally { setLoading(false); }
  };

  const handleToggleFeaturedClick = async () => {
    setLoading(true);
    try {
      await api.properties.update(prop.id, { featured: !prop.featured });
      onToggleFeatured?.(prop.id, !prop.featured);
      toast.success(prop.featured ? "تم إلغاء التمييز" : "تم تمييز العقار ⭐");
    } catch { toast.error("فشل تحديث التمييز"); }
    finally { setLoading(false); }
  };

  const handleDeleteClick = async () => {
    if (!window.confirm(`هل أنت متأكد من حذف "${prop.title}"؟`)) return;
    setLoading(true);
    try {
      await api.properties.delete(prop.id);
      onDelete?.(prop.id);
      toast.success("تم حذف الإعلان");
      onClose();
    } catch { toast.error("فشل الحذف"); }
    finally { setLoading(false); }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Slide panel */}
      <div
        className="fixed top-0 right-0 h-full w-full max-w-[580px] bg-white z-50 shadow-2xl flex flex-col overflow-hidden"
        dir="rtl"
        style={{ animation: "pdSlideIn 0.22s ease-out" }}
      >
        {/* ── Header ── */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-slate-100 shrink-0 bg-white">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5 flex-wrap mb-1">
              <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${statusCls}`}>
                {statusLbl}
              </span>
              {prop.featured && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">⭐ مميز</span>
              )}
              {prop.listingType && (
                <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200">
                  {LISTING_LABELS[prop.listingType] ?? prop.listingType}
                </span>
              )}
              {prop.mainCategory && (
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {prop.mainCategory}
                </span>
              )}
            </div>
            <h2 className="text-base font-bold text-slate-900 leading-snug">{prop.title}</h2>
            {locationText && (
              <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-teal-500" />
                {locationText}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center shrink-0 transition-colors mt-0.5"
          >
            <X className="w-4 h-4 text-slate-600" />
          </button>
        </div>

        {/* ── Scrollable body ── */}
        <div className="flex-1 overflow-y-auto">

          {/* Image gallery */}
          {images.length > 0 ? (
            <div>
              <div className="relative aspect-[16/9] bg-slate-100 overflow-hidden">
                <img
                  src={mediaUrl(mainImg ?? "")}
                  alt={prop.title}
                  className="w-full h-full object-cover"
                  onError={e => { e.currentTarget.style.opacity = "0"; }}
                />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={() => setImgIdx(i => (i - 1 + images.length) % images.length)}
                      className="absolute top-1/2 right-3 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setImgIdx(i => (i + 1) % images.length)}
                      className="absolute top-1/2 left-3 -translate-y-1/2 w-9 h-9 bg-black/50 hover:bg-black/70 rounded-full flex items-center justify-center text-white"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <span className="absolute bottom-2.5 right-3 text-[11px] font-semibold text-white bg-black/50 px-2.5 py-1 rounded-full">
                      {imgIdx + 1} / {images.length}
                    </span>
                  </>
                )}
              </div>
              {images.length > 1 && (
                <div className="flex gap-1.5 px-4 py-2 overflow-x-auto bg-slate-50 border-b border-slate-100">
                  {images.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setImgIdx(i)}
                      className={`w-16 h-11 rounded-lg overflow-hidden border-2 shrink-0 transition-all ${i === imgIdx ? "border-teal-500" : "border-transparent opacity-50 hover:opacity-80"}`}
                    >
                      <img src={mediaUrl(img)} alt="" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="aspect-[16/9] bg-gradient-to-br from-slate-100 to-slate-200 flex flex-col items-center justify-center text-slate-300 gap-2">
              <Building2 className="w-16 h-16" />
              <span className="text-xs">لا توجد صور</span>
            </div>
          )}

          <div className="p-5 space-y-6">

            {/* Key specs */}
            <div className="grid grid-cols-3 gap-2.5">
              {fmtPrice(prop.price) && (
                <div className="bg-teal-50 rounded-2xl p-3.5 text-center col-span-3 sm:col-span-1">
                  <p className="text-[10px] font-semibold text-teal-600 uppercase mb-1">السعر</p>
                  <p className="text-base font-extrabold text-teal-800 leading-none">{fmtPrice(prop.price)}</p>
                </div>
              )}
              {prop.area && (
                <div className="bg-blue-50 rounded-2xl p-3.5 text-center">
                  <p className="text-[10px] font-semibold text-blue-600 uppercase mb-1">المساحة</p>
                  <p className="text-base font-extrabold text-blue-800 leading-none">{prop.area} <span className="text-xs font-normal">م²</span></p>
                </div>
              )}
              {prop.rooms != null && prop.rooms > 0 && (
                <div className="bg-purple-50 rounded-2xl p-3.5 text-center">
                  <p className="text-[10px] font-semibold text-purple-600 uppercase mb-1">الغرف</p>
                  <p className="text-base font-extrabold text-purple-800 leading-none">{prop.rooms}</p>
                </div>
              )}
              {prop.bathrooms != null && prop.bathrooms > 0 && (
                <div className="bg-orange-50 rounded-2xl p-3.5 text-center">
                  <p className="text-[10px] font-semibold text-orange-600 uppercase mb-1">الحمامات</p>
                  <p className="text-base font-extrabold text-orange-800 leading-none">{prop.bathrooms}</p>
                </div>
              )}
              {prop.floor != null && (
                <div className="bg-slate-50 rounded-2xl p-3.5 text-center">
                  <p className="text-[10px] font-semibold text-slate-500 uppercase mb-1">الدور</p>
                  <p className="text-base font-extrabold text-slate-700 leading-none">{prop.floor}</p>
                </div>
              )}
            </div>

            {/* Extra tags */}
            {(prop.finishing || prop.furnished || prop.buildYear || prop.totalFloors) && (
              <div className="flex flex-wrap gap-2">
                {prop.finishing && <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full font-medium">{FINISHING_LABELS[prop.finishing] ?? prop.finishing}</span>}
                {prop.furnished && <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full font-medium">{FURNISHED_LABELS[prop.furnished] ?? prop.furnished}</span>}
                {prop.buildYear  && <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full font-medium">سنة البناء: {prop.buildYear}</span>}
                {prop.totalFloors && <span className="text-xs bg-slate-100 text-slate-700 px-3 py-1.5 rounded-full font-medium">{prop.totalFloors} طابق</span>}
              </div>
            )}

            {/* Description */}
            {prop.description && (
              <div className="border border-slate-100 rounded-2xl p-4">
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">وصف العقار</h4>
                <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-line">{prop.description}</p>
              </div>
            )}

            {/* Location */}
            {(locationText || hasCoords) && (
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">الموقع</h4>
                <div className="flex items-start gap-2 text-sm text-slate-700">
                  <MapPin className="w-4 h-4 text-teal-500 shrink-0 mt-0.5" />
                  <span>{locationText || "—"}</span>
                </div>
                {hasCoords && (
                  <a
                    href={`https://maps.google.com/?q=${prop.latitude},${prop.longitude}`}
                    target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-teal-600 hover:underline mt-1.5"
                  >
                    <ExternalLink className="w-3 h-3" />
                    عرض على خريطة جوجل
                  </a>
                )}
              </div>
            )}

            {/* Contact */}
            {(prop.phone || prop.whatsapp) && (
              <div>
                <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">التواصل</h4>
                <div className="flex flex-wrap gap-2">
                  {prop.phone && (
                    <a href={`tel:${prop.phone}`} className="flex items-center gap-2 text-sm bg-green-50 hover:bg-green-100 border border-green-200 px-3 py-2 rounded-xl text-green-800 font-medium transition-colors">
                      <Phone className="w-3.5 h-3.5" />
                      {prop.phone}
                    </a>
                  )}
                  {prop.whatsapp && (
                    <a href={`https://wa.me/${prop.whatsapp}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-3 py-2 rounded-xl text-emerald-800 font-medium transition-colors">
                      <MessageCircle className="w-3.5 h-3.5" />
                      واتساب
                    </a>
                  )}
                </div>
              </div>
            )}

            {/* Stats */}
            <div>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wide mb-2">إحصائيات الإعلان</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-3 bg-blue-50 rounded-2xl">
                  <Eye className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                  <p className="text-lg font-extrabold text-slate-800 leading-none">{(prop.viewCount ?? 0).toLocaleString("ar-EG")}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">مشاهدة</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-2xl">
                  <PhoneCall className="w-4 h-4 text-green-500 mx-auto mb-1" />
                  <p className="text-lg font-extrabold text-slate-800 leading-none">{(prop.phoneClickCount ?? 0).toLocaleString("ar-EG")}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">اتصال</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded-2xl">
                  <BarChart2 className="w-4 h-4 text-purple-500 mx-auto mb-1" />
                  <p className="text-lg font-extrabold text-slate-800 leading-none">{(prop.whatsappClickCount ?? 0).toLocaleString("ar-EG")}</p>
                  <p className="text-[10px] text-slate-500 mt-0.5">واتساب</p>
                </div>
              </div>
            </div>

            {/* Dates */}
            <div className="flex flex-wrap gap-4 text-xs text-slate-500 border-t border-slate-100 pt-4">
              {prop.createdAt && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  تقديم: {fmtDate(prop.createdAt)}
                </span>
              )}
              {prop.approvedAt && (
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                  اعتماد: {fmtDate(prop.approvedAt)}
                </span>
              )}
              {prop.ownerUserId && (
                <span className="flex items-center gap-1.5">
                  معرف المالك: #{prop.ownerUserId}
                </span>
              )}
            </div>

            {/* Rejection reason display */}
            {prop.rejectionReason && (
              <div className={`rounded-2xl p-4 border ${prop.status === "rejected" ? "bg-red-50 border-red-200" : "bg-orange-50 border-orange-200"}`}>
                <p className={`text-xs font-bold mb-1 ${prop.status === "rejected" ? "text-red-700" : "text-orange-700"}`}>
                  {prop.status === "rejected" ? "سبب الرفض:" : "سبب رفض سابق:"}
                </p>
                <p className={`text-xs leading-relaxed whitespace-pre-line ${prop.status === "rejected" ? "text-red-600" : "text-orange-600"}`}>
                  {prop.rejectionReason}
                </p>
              </div>
            )}

            {/* Rejection picker */}
            {rejectMode && (
              <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 space-y-3">
                <h4 className="text-sm font-bold text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  اختر سبب الرفض
                  <span className="text-xs font-normal text-rose-600">(يمكن اختيار أكثر من سبب)</span>
                </h4>
                <div className="flex flex-wrap gap-2">
                  {REJECT_CHIPS.map(chip => {
                    const sel = rejectChips.includes(chip.id);
                    return (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => setRejectChips(prev => sel ? prev.filter(x => x !== chip.id) : [...prev, chip.id])}
                        className={`relative text-xs px-3 py-1.5 rounded-xl border-2 transition-all font-medium ${sel ? "border-rose-500 bg-rose-100 text-rose-800" : "border-slate-200 bg-white text-slate-600 hover:border-rose-300 hover:bg-rose-50"}`}
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
                    تأكيد الرفض وإشعار المعلن
                  </button>
                  <button
                    onClick={() => { setRejectMode(false); setRejectChips([]); setRejectNote(""); }}
                    className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm text-slate-600 hover:bg-slate-50 transition-colors font-medium"
                  >
                    إلغاء
                  </button>
                </div>
              </div>
            )}

            <div className="h-2" />
          </div>
        </div>

        {/* ── Action bar ── */}
        <div className="border-t border-slate-100 bg-white px-5 py-4 shrink-0">
          <div className="flex items-center gap-2 flex-wrap">

            {/* View live */}
            <a
              href={`/property/${prop.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-teal-700 border border-slate-200 hover:border-teal-300 bg-white hover:bg-teal-50 rounded-xl py-2 px-3.5 transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              عرض الإعلان
            </a>

            {/* Featured toggle */}
            <button
              onClick={handleToggleFeaturedClick}
              disabled={loading}
              className={`flex items-center gap-1.5 text-xs font-semibold rounded-xl py-2 px-3.5 transition-colors border ${prop.featured ? "bg-amber-100 text-amber-700 hover:bg-amber-200 border-amber-200" : "bg-white text-slate-600 hover:bg-amber-50 hover:text-amber-700 border-slate-200"}`}
            >
              <Star className={`w-3.5 h-3.5 ${prop.featured ? "fill-amber-500" : ""}`} />
              {prop.featured ? "إلغاء التمييز" : "تمييز"}
            </button>

            {/* Delete */}
            {onDelete && (
              <button
                onClick={handleDeleteClick}
                disabled={loading}
                className="flex items-center gap-1 text-xs font-semibold text-red-500 hover:text-red-700 border border-transparent hover:border-red-200 hover:bg-red-50 rounded-xl py-2 px-3 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                حذف
              </button>
            )}

            <div className="flex-1" />

            {/* Reject */}
            {prop.status !== "rejected" && !rejectMode && (
              <button
                onClick={() => setRejectMode(true)}
                disabled={loading}
                className="flex items-center gap-2 text-sm font-bold text-red-600 border border-red-200 bg-red-50 hover:bg-red-100 rounded-xl py-2.5 px-5 transition-colors"
              >
                <XCircle className="w-4 h-4" />
                رفض
              </button>
            )}

            {/* Approve */}
            {prop.status !== "approved" && prop.status !== "active" && (
              <button
                onClick={handleApprove}
                disabled={loading}
                className="flex items-center gap-2 text-sm font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl py-2.5 px-5 transition-colors disabled:opacity-50 shadow-sm"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                اعتماد ونشر
              </button>
            )}

            {/* Already approved */}
            {(prop.status === "approved" || prop.status === "active") && !rejectMode && (
              <span className="flex items-center gap-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl py-2.5 px-4">
                <CheckCircle2 className="w-3.5 h-3.5" />
                معتمد ومنشور
              </span>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pdSlideIn {
          from { transform: translateX(100%); opacity: 0.5; }
          to   { transform: translateX(0);    opacity: 1; }
        }
      `}</style>
    </>
  );
}
