import { useState, useRef, useEffect } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight, Shield, CheckCircle2, Loader2, Upload, X,
  Copy, CheckCheck, Smartphone, CreditCard, Building2,
  Lock, Clock, Home, Zap,
} from "lucide-react";
import { api } from "@/lib/api";
import { useSiteSettings } from "@/App";
import toast from "react-hot-toast";

type Gateway = "vodafone_cash" | "instapay" | "bank_transfer" | "fawry";

interface GatewayDef {
  id: Gateway;
  label: string;
  icon: React.ReactNode;
  color: string;
  ring: string;
  bg: string;
  border: string;
  dot: string;
}

const ALL_GATEWAYS: GatewayDef[] = [
  {
    id: "vodafone_cash",
    label: "فودافون كاش",
    icon: <Smartphone className="w-5 h-5" />,
    color: "text-red-600",
    ring: "ring-red-400",
    bg: "bg-red-50",
    border: "border-red-200",
    dot: "bg-red-500",
  },
  {
    id: "instapay",
    label: "إنستاباي",
    icon: <Zap className="w-5 h-5" />,
    color: "text-purple-600",
    ring: "ring-purple-400",
    bg: "bg-purple-50",
    border: "border-purple-200",
    dot: "bg-purple-500",
  },
  {
    id: "bank_transfer",
    label: "تحويل بنكي",
    icon: <Building2 className="w-5 h-5" />,
    color: "text-emerald-600",
    ring: "ring-emerald-400",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: "bg-emerald-500",
  },
  {
    id: "fawry",
    label: "فوري",
    icon: <CreditCard className="w-5 h-5" />,
    color: "text-orange-600",
    ring: "ring-orange-400",
    bg: "bg-orange-50",
    border: "border-orange-200",
    dot: "bg-orange-500",
  },
];

function isEnabled(val: unknown) {
  return val === true || val === "true" || val === undefined || val === null;
}

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  if (!value) return null;
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="flex items-center justify-between gap-3 bg-white rounded-xl border border-gray-100 px-4 py-3 group hover:border-gray-200 transition-colors">
      <div className="min-w-0">
        <p className="text-[10px] font-medium text-gray-400 uppercase tracking-widest mb-0.5">{label}</p>
        <p className="text-sm font-semibold text-gray-800 font-mono truncate" dir="ltr">{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-all"
      >
        {copied ? <CheckCheck className="w-4 h-4 text-teal-500" /> : <Copy className="w-4 h-4" />}
      </button>
    </div>
  );
}

export default function ListingPayPage() {
  const [, navigate] = useLocation();
  const settings = useSiteSettings();

  const params = new URLSearchParams(window.location.search);
  const planName  = params.get("planName")  ?? "باقة النشر";
  const price     = params.get("price")     ?? "0";
  const duration  = params.get("duration")  ?? "30";
  const currency  = params.get("currency")  ?? "EGP";
  const returnTo  = params.get("returnTo")  ?? "/user/my-properties";

  const enabledGateways = ALL_GATEWAYS.filter(g => {
    const keyMap: Record<Gateway, string> = {
      vodafone_cash: "vodafoneCashEnabled",
      instapay:      "instaPayEnabled",
      bank_transfer: "bankTransferEnabled",
      fawry:         "fawryEnabled",
    };
    return isEnabled(settings?.[keyMap[g.id]]);
  });

  const [selected, setSelected] = useState<Gateway | null>(null);
  const [phase, setPhase] = useState<"pay" | "sending" | "done">("pay");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!selected && enabledGateways.length > 0) {
      setSelected(enabledGateways[0].id);
    }
  }, [enabledGateways.length]);

  const gw = ALL_GATEWAYS.find(g => g.id === selected);
  const amount = parseFloat(price).toLocaleString("ar-EG");

  const handleUpload = async (files: FileList | null) => {
    if (!files?.[0]) return;
    setUploading(true);
    try {
      const res = await api.upload.propertyImage(files[0]);
      setReceipt(res.url);
      toast.success("تم رفع الإيصال بنجاح");
    } catch {
      toast.error("فشل رفع الإيصال");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!receipt && parseFloat(price) > 0) {
      toast.error("يرجى رفع إيصال الدفع أولاً");
      return;
    }
    setPhase("sending");
    await new Promise(r => setTimeout(r, 1400));
    setPhase("done");
  };

  if (phase === "sending") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white" dir="rtl">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto">
            <Loader2 className="w-8 h-8 animate-spin text-teal-600" />
          </div>
          <p className="text-lg font-semibold text-gray-800">جارٍ إرسال طلبك…</p>
          <p className="text-sm text-gray-400">ثانية واحدة فقط</p>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white" dir="rtl">
        <div className="text-center space-y-6 max-w-sm px-6">
          <div className="w-20 h-20 rounded-full bg-teal-600 flex items-center justify-center mx-auto shadow-lg shadow-teal-200">
            <CheckCircle2 className="w-10 h-10 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">تم استلام طلبك!</h2>
            <p className="text-gray-500 text-sm leading-relaxed">
              سيراجع فريقنا الدفع ويفعّل إعلانك
              <strong className="text-teal-700"> {planName} </strong>
              خلال 24 ساعة.
            </p>
          </div>
          <div className="bg-gray-50 rounded-2xl p-4 text-sm text-right space-y-2.5">
            <div className="flex justify-between">
              <span className="text-gray-500">الباقة</span>
              <span className="font-semibold text-gray-800">{planName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">المبلغ</span>
              <span className="font-semibold text-teal-700">{amount} {currency}</span>
            </div>
            {gw && (
              <div className="flex justify-between">
                <span className="text-gray-500">طريقة الدفع</span>
                <span className="font-semibold">{gw.label}</span>
              </div>
            )}
          </div>
          <button
            onClick={() => navigate(returnTo)}
            className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-semibold rounded-xl transition-colors"
          >
            الانتقال لعقاراتي
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]" dir="rtl">

      {/* ── Navbar ── */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => navigate(returnTo)}
            className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة</span>
          </button>
          <div className="flex items-center gap-1.5 text-teal-700">
            <Lock className="w-3.5 h-3.5" />
            <span className="text-xs font-semibold">دفع آمن ومشفّر</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-7">
          <h1 className="text-2xl font-bold text-gray-900">إتمام الدفع</h1>
          <p className="text-gray-500 text-sm mt-1">اختر طريقة الدفع وأرسل إيصالاً لتفعيل إعلانك</p>
        </div>

        <div className="grid lg:grid-cols-5 gap-6 items-start">

          {/* ── Right: Order Summary ── */}
          <div className="lg:col-span-2 space-y-4 lg:sticky lg:top-20">

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gradient-to-br from-teal-600 to-teal-700 px-6 py-5">
                <p className="text-teal-200 text-xs font-medium mb-1">ملخص الطلب</p>
                <h2 className="text-white text-xl font-bold">{planName}</h2>
                <div className="flex items-baseline gap-1.5 mt-3">
                  <span className="text-4xl font-black text-white">{amount}</span>
                  <span className="text-teal-300 text-sm">{currency}</span>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-teal-200 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  <span>مدة النشر: {duration} يوم</span>
                </div>
              </div>
              <div className="px-6 py-4 space-y-3 text-sm">
                <div className="flex justify-between text-gray-600">
                  <span>نوع الإعلان</span>
                  <span className="font-medium text-gray-800">{planName}</span>
                </div>
                <div className="flex justify-between text-gray-600">
                  <span>المدة</span>
                  <span className="font-medium text-gray-800">{duration} يوم</span>
                </div>
                <div className="border-t pt-3 flex justify-between">
                  <span className="font-semibold text-gray-700">الإجمالي</span>
                  <span className="font-bold text-teal-700">{amount} {currency}</span>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              {[
                { icon: <Shield className="w-4 h-4 text-teal-500" />, text: "بيانات دفعك محمية بالكامل" },
                { icon: <CheckCircle2 className="w-4 h-4 text-green-500" />, text: "تفعيل الإعلان خلال 24 ساعة" },
                { icon: <Home className="w-4 h-4 text-blue-500" />, text: "إعلانك يظهر لآلاف الباحثين" },
              ].map((b, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-gray-600">
                  {b.icon}
                  <span>{b.text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* ── Left: Payment ── */}
          <div className="lg:col-span-3 space-y-4">

            {/* Method selector */}
            {enabledGateways.length === 0 ? (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-10 text-center">
                <CreditCard className="w-10 h-10 text-gray-200 mx-auto mb-3" />
                <p className="text-gray-400 text-sm">لا توجد طرق دفع مفعّلة. يرجى التواصل مع الإدارة.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {enabledGateways.map(g => {
                  const active = selected === g.id;
                  return (
                    <div
                      key={g.id}
                      className={`bg-white rounded-2xl border shadow-sm overflow-hidden transition-all duration-200 cursor-pointer ${
                        active
                          ? `border-teal-400 ring-2 ring-teal-100`
                          : "border-gray-100 hover:border-gray-200"
                      }`}
                      onClick={() => setSelected(g.id)}
                    >
                      {/* Method header */}
                      <div className="flex items-center gap-4 px-5 py-4">
                        <div className={`w-10 h-10 rounded-xl ${g.bg} flex items-center justify-center ${g.color} flex-shrink-0`}>
                          {g.icon}
                        </div>
                        <div className="flex-1">
                          <p className="font-semibold text-gray-800">{g.label}</p>
                          {!active && <p className="text-xs text-gray-400 mt-0.5">اضغط للاختيار</p>}
                          {active && <p className={`text-xs font-medium mt-0.5 ${g.color}`}>طريقة الدفع المحددة</p>}
                        </div>
                        <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${
                          active ? "border-teal-500 bg-teal-500" : "border-gray-300"
                        }`}>
                          {active && <div className="w-2 h-2 bg-white rounded-full" />}
                        </div>
                      </div>

                      {/* Method details (expanded) */}
                      {active && (
                        <div className={`border-t ${g.border} ${g.bg} px-5 py-4 space-y-3`}>
                          {/* Amount highlight */}
                          <div className="bg-white rounded-xl px-4 py-3 flex items-center justify-between border border-white shadow-sm">
                            <span className="text-xs text-gray-500 font-medium">المبلغ المطلوب</span>
                            <span className={`text-xl font-black ${g.color}`}>{amount} <span className="text-sm font-semibold">{currency}</span></span>
                          </div>

                          {/* Vodafone Cash */}
                          {selected === "vodafone_cash" && settings && (
                            <div className="space-y-2">
                              <CopyField label="رقم المحفظة" value={settings.vodafoneCashNumber ?? ""} />
                              <CopyField label="اسم المحفظة" value={settings.vodafoneCashName ?? ""} />
                              <p className={`text-xs ${g.color} px-1 flex items-center gap-1.5`}>
                                <Smartphone className="w-3.5 h-3.5 shrink-0" />
                                افتح فودافون كاش ← تحويل ← أدخل الرقم ← أرسل المبلغ
                              </p>
                            </div>
                          )}

                          {/* InstaPay */}
                          {selected === "instapay" && settings && (
                            <div className="space-y-2">
                              <CopyField label="معرّف InstaPay (IPA)" value={settings.instaPayIPA ?? ""} />
                              <CopyField label="اسم الحساب" value={settings.instaPayName ?? ""} />
                              <p className={`text-xs ${g.color} px-1 flex items-center gap-1.5`}>
                                <Zap className="w-3.5 h-3.5 shrink-0" />
                                افتح تطبيق InstaPay أو بنكك ← تحويل فوري ← أدخل المعرّف
                              </p>
                            </div>
                          )}

                          {/* Bank Transfer */}
                          {selected === "bank_transfer" && settings && (
                            <div className="space-y-2">
                              <CopyField label="البنك" value={settings.bankName ?? ""} />
                              <CopyField label="اسم الحساب" value={settings.bankAccountName ?? ""} />
                              <CopyField label="رقم الحساب" value={settings.bankAccountNumber ?? ""} />
                              {settings.bankIBAN && <CopyField label="IBAN" value={settings.bankIBAN} />}
                              <p className={`text-xs ${g.color} px-1 flex items-center gap-1.5`}>
                                <Building2 className="w-3.5 h-3.5 shrink-0" />
                                حوّل عبر الإنترنت البنكي أو من فرع البنك مباشرة
                              </p>
                            </div>
                          )}

                          {/* Fawry */}
                          {selected === "fawry" && settings && (
                            <div className="space-y-2">
                              <CopyField label="كود فوري" value={(settings as any).fawryCode ?? ""} />
                              <CopyField label="اسم التاجر" value={(settings as any).fawryMerchantName ?? ""} />
                              <p className={`text-xs ${g.color} px-1 flex items-center gap-1.5`}>
                                <CreditCard className="w-3.5 h-3.5 shrink-0" />
                                توجه لأقرب نقطة فوري أو استخدم التطبيق ← أدخل الكود
                              </p>
                            </div>
                          )}

                          {settings?.paymentInstructions && (
                            <p className="text-xs text-gray-500 border-t border-gray-200/60 pt-2 px-1">
                              {settings.paymentInstructions}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Upload receipt */}
            {enabledGateways.length > 0 && (
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-gray-800 text-sm">رفع إيصال الدفع</p>
                  <span className="text-xs bg-red-50 text-red-600 font-medium px-2.5 py-1 rounded-full border border-red-100">مطلوب</span>
                </div>

                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*,application/pdf"
                  className="hidden"
                  onChange={e => handleUpload(e.target.files)}
                />

                {receipt ? (
                  <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-xl px-4 py-3">
                    <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-teal-800">تم رفع الإيصال</p>
                      <p className="text-xs text-teal-600 truncate">{receipt.split("/").pop()}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setReceipt(null)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="w-full py-5 rounded-xl border-2 border-dashed border-gray-200 hover:border-teal-300 hover:bg-teal-50/30 transition-all flex flex-col items-center gap-2 text-gray-400 hover:text-teal-600 disabled:opacity-50 disabled:cursor-wait"
                  >
                    {uploading
                      ? <><Loader2 className="w-5 h-5 animate-spin" /><span className="text-sm">جارٍ الرفع…</span></>
                      : <><Upload className="w-5 h-5" /><span className="text-sm font-medium">صورة الإيصال أو PDF</span><span className="text-xs text-gray-300">حتى 10 ميجابايت</span></>
                    }
                  </button>
                )}

                <p className="text-xs text-gray-400 flex items-center gap-1.5 pt-1">
                  <Shield className="w-3.5 h-3.5 text-teal-400 shrink-0" />
                  سيتم مراجعة الدفع وتفعيل إعلانك خلال 24 ساعة
                </p>
              </div>
            )}

            {/* CTA */}
            {enabledGateways.length > 0 && (
              <button
                onClick={handleConfirm}
                disabled={!selected}
                className="w-full h-13 py-3.5 bg-teal-600 hover:bg-teal-700 disabled:opacity-40 text-white font-bold rounded-xl transition-colors text-base shadow-md shadow-teal-100 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-5 h-5" />
                أكدّت التحويل — إرسال الطلب
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
