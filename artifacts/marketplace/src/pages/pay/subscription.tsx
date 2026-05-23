import { useState, useRef } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowRight, Shield, CheckCircle2, Loader2, Upload, X,
  Copy, CheckCheck, Smartphone, Zap, CreditCard, Building2,
  Lock, Clock, Star, Crown, Package,
} from "lucide-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSiteSettings } from "@/App";
import toast from "react-hot-toast";

type Gateway = "vodafone_cash" | "fawry" | "instapay" | "bank_transfer";

interface GatewayMeta {
  id: Gateway;
  label: string;
  shortLabel: string;
  color: string;
  bg: string;
  border: string;
  gradientFrom: string;
  gradientTo: string;
  textLight: string;
  icon: React.ReactNode;
  tabIcon: React.ReactNode;
}

const GATEWAYS: GatewayMeta[] = [
  {
    id: "vodafone_cash",
    label: "فودافون كاش",
    shortLabel: "V.Cash",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    gradientFrom: "from-red-600",
    gradientTo: "to-red-700",
    textLight: "text-red-100",
    icon: <Smartphone className="w-5 h-5" />,
    tabIcon: <Smartphone className="w-4 h-4" />,
  },
  {
    id: "fawry",
    label: "فوري",
    shortLabel: "فوري",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
    gradientFrom: "from-orange-500",
    gradientTo: "to-orange-600",
    textLight: "text-orange-100",
    icon: <Zap className="w-5 h-5" />,
    tabIcon: <Zap className="w-4 h-4" />,
  },
  {
    id: "instapay",
    label: "انستاباي",
    shortLabel: "InstaPay",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    gradientFrom: "from-blue-600",
    gradientTo: "to-blue-700",
    textLight: "text-blue-100",
    icon: <CreditCard className="w-5 h-5" />,
    tabIcon: <CreditCard className="w-4 h-4" />,
  },
  {
    id: "bank_transfer",
    label: "تحويل بنكي",
    shortLabel: "بنك",
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
    gradientFrom: "from-green-600",
    gradientTo: "to-green-700",
    textLight: "text-green-100",
    icon: <Building2 className="w-5 h-5" />,
    tabIcon: <Building2 className="w-4 h-4" />,
  },
];

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  if (!value) return null;
  return (
    <div className="flex items-center justify-between gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3.5 group">
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider mb-0.5">{label}</p>
        <p className="text-sm font-bold text-gray-800 font-mono truncate" dir="ltr">{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gray-50 hover:bg-gray-100 border border-gray-100 transition-all"
        title="نسخ"
      >
        {copied
          ? <CheckCheck className="w-4 h-4 text-teal-500" />
          : <Copy className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />}
      </button>
    </div>
  );
}

export default function SubscriptionPayPage() {
  const [, navigate] = useLocation();
  const settings = useSiteSettings();

  const params = new URLSearchParams(window.location.search);
  const planName = params.get("planName") ?? "الباقة";
  const price = params.get("price") ?? "0";
  const duration = params.get("duration") ?? "30";
  const currency = params.get("currency") ?? "EGP";

  const enabledGateways = GATEWAYS.filter(g => {
    const key = g.id === "bank_transfer" ? "bankTransferEnabled" : g.id === "vodafone_cash" ? "vodafoneCashEnabled" : g.id === "instapay" ? "instaPayEnabled" : `${g.id}Enabled`;
    return settings?.[key] === "true" || settings?.[key] === undefined;
  });

  const [activeGateway, setActiveGateway] = useState<Gateway | null>(
    enabledGateways[0]?.id ?? null
  );
  const [phase, setPhase] = useState<"payment" | "uploading" | "done">("payment");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const gw = GATEWAYS.find(g => g.id === activeGateway);
  const amount = parseFloat(price).toLocaleString("ar-EG");
  const isPaid = parseFloat(price) > 0;

  const handleFileSelect = async (files: FileList | null) => {
    if (!files?.[0]) return;
    setUploading(true);
    try {
      const res = await api.upload.propertyImage(files[0]);
      setReceipt(res.url);
      toast.success("تم رفع إيصال الدفع بنجاح");
    } catch {
      toast.error("فشل رفع الإيصال، حاول مرة أخرى");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    if (!receipt && isPaid) {
      toast.error("يرجى رفع إيصال الدفع أولاً");
      return;
    }
    setPhase("uploading");
    await new Promise(r => setTimeout(r, 1200));
    setPhase("done");
  };

  if (phase === "uploading") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-teal-100" dir="rtl">
        <div className="text-center space-y-5 p-8">
          <div className="w-24 h-24 rounded-full bg-white shadow-lg flex items-center justify-center mx-auto">
            <Loader2 className="w-12 h-12 animate-spin text-teal-600" />
          </div>
          <p className="text-xl font-bold text-gray-800">جارٍ إرسال طلبك...</p>
          <p className="text-sm text-gray-500">يرجى الانتظار</p>
        </div>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-teal-50 to-teal-100" dir="rtl">
        <div className="text-center space-y-6 p-8 max-w-md">
          <div className="w-24 h-24 rounded-full bg-teal-600 shadow-xl flex items-center justify-center mx-auto animate-in zoom-in duration-500">
            <CheckCircle2 className="w-12 h-12 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900">تم استلام طلبك! 🎉</h2>
            <p className="text-gray-500 mt-2 leading-relaxed">
              سيقوم فريقنا بمراجعة الدفع وتفعيل باقة
              <strong className="text-teal-700"> {planName} </strong>
              خلال 24 ساعة
            </p>
          </div>
          <div className="bg-white rounded-2xl border border-teal-100 shadow-sm p-5 space-y-2 text-sm text-right">
            <div className="flex justify-between">
              <span className="text-gray-500">الباقة</span>
              <span className="font-bold text-gray-800">{planName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">المبلغ</span>
              <span className="font-bold text-teal-700">{amount} {currency}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">طريقة الدفع</span>
              <span className="font-bold">{gw?.label ?? "—"}</span>
            </div>
          </div>
          <Button
            onClick={() => navigate("/dashboard/subscription")}
            className="w-full h-12 bg-teal-600 hover:bg-teal-700 text-white font-bold rounded-2xl"
          >
            العودة للوحة التحكم
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50" dir="rtl">

      {/* ── Top Bar ── */}
      <div className="bg-white border-b border-gray-100 shadow-sm sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => navigate("/dashboard/subscription")}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-800 text-sm font-medium transition-colors"
          >
            <ArrowRight className="w-4 h-4" />
            العودة
          </button>
          <div className="flex items-center gap-2">
            <Lock className="w-3.5 h-3.5 text-teal-600" />
            <span className="text-xs font-semibold text-teal-700">دفع آمن ومحمي</span>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-5 gap-6">

          {/* ── Left: Plan Summary ── */}
          <div className="lg:col-span-2 space-y-4">

            {/* Plan Card */}
            <div className="bg-gradient-to-br from-teal-600 to-teal-800 rounded-3xl p-6 text-white shadow-xl">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-2xl bg-white/20 flex items-center justify-center">
                  {parseFloat(price) === 0
                    ? <Package className="w-5 h-5 text-white" />
                    : <Crown className="w-5 h-5 text-amber-300" />}
                </div>
                <Badge className="bg-white/20 text-white border-0 text-xs font-bold">باقة اشتراك</Badge>
              </div>
              <h2 className="text-2xl font-black mb-1">{planName}</h2>
              <div className="flex items-end gap-2 mt-3">
                <span className="text-5xl font-black">{amount}</span>
                <span className="text-teal-300 mb-1.5">{currency}</span>
              </div>
              <div className="flex items-center gap-1.5 mt-3 text-teal-200 text-sm">
                <Clock className="w-4 h-4" />
                <span>{duration} يوم</span>
              </div>
            </div>

            {/* Trust badges */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3">
              {[
                { icon: <Shield className="w-4 h-4 text-teal-600" />, text: "دفع مؤمّن وموثّق بالكامل" },
                { icon: <CheckCircle2 className="w-4 h-4 text-green-600" />, text: "تفعيل الباقة خلال 24 ساعة" },
                { icon: <Star className="w-4 h-4 text-amber-500" />, text: "دعم فني على مدار الساعة" },
              ].map((b, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-gray-600">
                  {b.icon}
                  <span>{b.text}</span>
                </div>
              ))}
            </div>

            {/* Summary */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-3 text-sm">
              <p className="font-bold text-gray-700 text-xs uppercase tracking-wide">ملخص الطلب</p>
              <div className="flex justify-between text-gray-600">
                <span>الباقة</span>
                <span className="font-semibold text-gray-800">{planName}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>المدة</span>
                <span className="font-semibold text-gray-800">{duration} يوم</span>
              </div>
              <div className="flex justify-between border-t pt-3 mt-1">
                <span className="font-bold text-gray-700">الإجمالي</span>
                <span className="font-black text-teal-700 text-base">{amount} {currency}</span>
              </div>
            </div>
          </div>

          {/* ── Right: Payment Methods ── */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-3xl border border-gray-100 shadow-sm overflow-hidden">

              {/* Header */}
              <div className="px-6 pt-6 pb-4 border-b border-gray-50">
                <h1 className="text-xl font-black text-gray-900">اختر طريقة الدفع</h1>
                <p className="text-sm text-gray-500 mt-1">اختر الطريقة الأنسب لك وأتمّ الدفع بسهولة</p>
              </div>

              {/* Gateway Tabs */}
              {enabledGateways.length === 0 ? (
                <div className="p-8 text-center text-gray-400">
                  <CreditCard className="w-10 h-10 mx-auto mb-3 opacity-30" />
                  <p>لا توجد طرق دفع مفعّلة حالياً. تواصل مع الإدارة.</p>
                </div>
              ) : (
                <>
                  {/* Tab Bar */}
                  <div className="flex border-b border-gray-100 overflow-x-auto scrollbar-none">
                    {enabledGateways.map(g => {
                      const active = activeGateway === g.id;
                      return (
                        <button
                          key={g.id}
                          onClick={() => setActiveGateway(g.id)}
                          className={`relative flex-1 min-w-[100px] flex flex-col items-center gap-1.5 py-4 px-3 text-xs font-bold transition-all border-b-2 ${
                            active
                              ? `border-b-[3px] ${
                                  g.id === "vodafone_cash" ? "border-red-500 text-red-600 bg-red-50/60"
                                  : g.id === "fawry" ? "border-orange-500 text-orange-600 bg-orange-50/60"
                                  : g.id === "instapay" ? "border-blue-500 text-blue-600 bg-blue-50/60"
                                  : "border-green-500 text-green-600 bg-green-50/60"
                                }`
                              : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                          }`}
                        >
                          <span className={active ? "" : "opacity-60"}>{g.tabIcon}</span>
                          <span>{g.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Gateway Content */}
                  {activeGateway && (() => {
                    const g = GATEWAYS.find(x => x.id === activeGateway)!;
                    return (
                      <div className="p-6 space-y-6 animate-in fade-in duration-200">

                        {/* Step 1: Transfer details */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${g.gradientFrom} ${g.gradientTo} text-white text-xs font-black flex items-center justify-center shadow-sm`}>1</div>
                            <p className="font-bold text-gray-800 text-sm">حوّل المبلغ إلى الحساب التالي</p>
                          </div>

                          <div className={`rounded-2xl border ${g.border} ${g.bg} p-4 space-y-3`}>
                            {/* Gateway identity badge */}
                            <div className={`inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-white shadow-sm border ${g.border} ${g.color} font-bold text-sm`}>
                              {g.icon}
                              {g.label}
                            </div>

                            {/* Amount highlight */}
                            <div className={`rounded-xl bg-white border ${g.border} px-4 py-3 flex items-center justify-between`}>
                              <span className="text-gray-500 text-sm">المبلغ المطلوب</span>
                              <span className={`text-2xl font-black ${g.color}`}>{amount} <span className="text-sm font-bold">{currency}</span></span>
                            </div>

                            {/* Vodafone Cash */}
                            {activeGateway === "vodafone_cash" && (
                              <div className="space-y-2">
                                <CopyField label="رقم المحفظة" value={settings?.vodafoneCashNumber ?? ""} />
                                <CopyField label="اسم المحفظة" value={settings?.vodafoneCashName ?? ""} />
                                <p className={`text-xs ${g.color} flex items-center gap-1.5 mt-1 px-1`}>
                                  <Smartphone className="w-3.5 h-3.5 shrink-0" />
                                  افتح تطبيق فودافون كاش ← تحويل ← أدخل الرقم ← أرسل المبلغ
                                </p>
                              </div>
                            )}

                            {/* Fawry */}
                            {activeGateway === "fawry" && (
                              <div className="space-y-2">
                                <CopyField label="كود فوري" value={settings?.fawryCode ?? ""} />
                                <CopyField label="اسم التاجر" value={settings?.fawryMerchantName ?? ""} />
                                <p className={`text-xs ${g.color} flex items-center gap-1.5 mt-1 px-1`}>
                                  <Zap className="w-3.5 h-3.5 shrink-0" />
                                  توجه لأقرب نقطة فوري أو استخدم تطبيق فوري ← أدخل الكود
                                </p>
                              </div>
                            )}

                            {/* InstaPay */}
                            {activeGateway === "instapay" && (
                              <div className="space-y-2">
                                <CopyField label="معرّف InstaPay (IPA)" value={settings?.instaPayIPA ?? ""} />
                                <CopyField label="الاسم" value={settings?.instaPayName ?? ""} />
                                <p className={`text-xs ${g.color} flex items-center gap-1.5 mt-1 px-1`}>
                                  <CreditCard className="w-3.5 h-3.5 shrink-0" />
                                  افتح تطبيق InstaPay أو بنكك ← تحويل فوري ← أدخل المعرّف
                                </p>
                              </div>
                            )}

                            {/* Bank Transfer */}
                            {activeGateway === "bank_transfer" && (
                              <div className="space-y-2">
                                <CopyField label="البنك" value={settings?.bankName ?? ""} />
                                <CopyField label="اسم الحساب" value={settings?.bankAccountName ?? ""} />
                                <CopyField label="رقم الحساب" value={settings?.bankAccountNumber ?? ""} />
                                {settings?.bankIBAN && <CopyField label="IBAN" value={settings.bankIBAN} />}
                                <p className={`text-xs ${g.color} flex items-center gap-1.5 mt-1 px-1`}>
                                  <Building2 className="w-3.5 h-3.5 shrink-0" />
                                  حوّل عبر الإنترنت البنكي أو من فرع البنك مباشرة
                                </p>
                              </div>
                            )}

                            {settings?.paymentInstructions && (
                              <p className="text-xs text-gray-500 border-t border-gray-200 pt-2 px-1">
                                {settings.paymentInstructions}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Step 2: Upload receipt */}
                        <div className="space-y-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${g.gradientFrom} ${g.gradientTo} text-white text-xs font-black flex items-center justify-center shadow-sm`}>2</div>
                            <p className="font-bold text-gray-800 text-sm">ارفع إيصال الدفع</p>
                            <span className="text-xs text-gray-400 bg-gray-100 rounded-full px-2 py-0.5">مطلوب</span>
                          </div>

                          <input
                            ref={fileRef}
                            type="file"
                            accept="image/*,application/pdf"
                            className="hidden"
                            onChange={e => handleFileSelect(e.target.files)}
                          />

                          {receipt ? (
                            <div className="flex items-center gap-3 bg-teal-50 border-2 border-teal-200 rounded-2xl p-4">
                              <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center">
                                <CheckCircle2 className="w-5 h-5 text-teal-600" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-bold text-teal-800">تم رفع الإيصال بنجاح</p>
                                <p className="text-xs text-teal-600 truncate">{receipt.split("/").pop()}</p>
                              </div>
                              <button
                                type="button"
                                onClick={() => setReceipt(null)}
                                className="w-8 h-8 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 flex items-center justify-center transition-colors"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => fileRef.current?.click()}
                              disabled={uploading}
                              className={`w-full py-6 rounded-2xl border-2 border-dashed transition-all flex flex-col items-center gap-2.5 ${
                                uploading
                                  ? "border-gray-200 bg-gray-50 text-gray-400 cursor-wait"
                                  : "border-gray-200 hover:border-teal-400 hover:bg-teal-50/40 text-gray-400 hover:text-teal-600 cursor-pointer"
                              }`}
                            >
                              {uploading ? (
                                <>
                                  <Loader2 className="w-6 h-6 animate-spin" />
                                  <span className="text-sm font-medium">جارٍ الرفع...</span>
                                </>
                              ) : (
                                <>
                                  <div className="w-12 h-12 rounded-2xl bg-gray-100 flex items-center justify-center">
                                    <Upload className="w-5 h-5" />
                                  </div>
                                  <div className="text-center">
                                    <p className="text-sm font-bold">اضغط لرفع الإيصال</p>
                                    <p className="text-xs text-gray-400 mt-0.5">صورة أو PDF — حتى 10 ميجابايت</p>
                                  </div>
                                </>
                              )}
                            </button>
                          )}
                        </div>

                        {/* Security note */}
                        <div className="flex items-center gap-3 bg-gray-50 rounded-2xl p-4 border border-gray-100">
                          <div className="w-9 h-9 rounded-xl bg-white border border-gray-100 flex items-center justify-center shrink-0">
                            <Shield className="w-4 h-4 text-teal-600" />
                          </div>
                          <p className="text-xs text-gray-500 leading-relaxed">
                            بياناتك محمية بالكامل. سيتم التحقق من الدفع وتفعيل الباقة خلال <strong className="text-gray-700">24 ساعة</strong> من إرسال الطلب.
                          </p>
                        </div>

                        {/* Confirm Button */}
                        <Button
                          onClick={handleConfirm}
                          disabled={uploading || (!receipt && isPaid)}
                          className={`w-full h-14 rounded-2xl text-white font-black text-base shadow-lg transition-all ${
                            !receipt && isPaid
                              ? "bg-gray-300 cursor-not-allowed shadow-none"
                              : `bg-gradient-to-l ${g.gradientFrom} ${g.gradientTo} hover:opacity-90 shadow-md`
                          }`}
                        >
                          {uploading ? (
                            <><Loader2 className="w-5 h-5 animate-spin ml-2" />جارٍ الرفع...</>
                          ) : (
                            <>أكدت التحويل — إرسال الطلب</>
                          )}
                        </Button>

                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
