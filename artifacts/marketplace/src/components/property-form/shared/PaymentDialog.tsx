import { useState, useRef } from "react";
import {
  CreditCard, Loader2, CheckCircle2, Smartphone, Shield, Upload,
  X, Copy, CheckCheck, Banknote, Zap, Building2,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { BillingPlan } from "@/lib/api";
import toast from "react-hot-toast";

interface PaymentDialogProps {
  open:      boolean;
  plan:      BillingPlan | null;
  onClose:   () => void;
  onSuccess: () => void;
}

type Gateway = "vodafone_cash" | "fawry" | "instapay" | "bank_transfer";

const GATEWAY_META: Record<Gateway, { label: string; color: string; bg: string; border: string; icon: React.ReactNode }> = {
  vodafone_cash: {
    label: "فودافون كاش",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    icon: <Smartphone className="w-5 h-5 text-red-600" />,
  },
  fawry: {
    label: "فوري",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
    icon: <Zap className="w-5 h-5 text-orange-600" />,
  },
  instapay: {
    label: "انستاباي",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: <CreditCard className="w-5 h-5 text-blue-600" />,
  },
  bank_transfer: {
    label: "تحويل بنكي",
    color: "text-green-700",
    bg: "bg-green-50",
    border: "border-green-200",
    icon: <Building2 className="w-5 h-5 text-green-600" />,
  },
};

function CopyField({ label, value }: { label: string; value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <div className="flex items-center justify-between gap-2 bg-white rounded-xl border border-gray-200 px-4 py-3">
      <div>
        <p className="text-xs text-gray-400 mb-0.5">{label}</p>
        <p className="text-sm font-bold text-gray-800 font-mono" dir="ltr">{value}</p>
      </div>
      <button
        type="button"
        onClick={copy}
        className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-gray-100 transition-colors"
        title="نسخ"
      >
        {copied ? <CheckCheck className="w-4 h-4 text-teal-500" /> : <Copy className="w-4 h-4 text-gray-400" />}
      </button>
    </div>
  );
}

export function PaymentDialog({ open, plan, onClose, onSuccess }: PaymentDialogProps) {
  const [phase, setPhase] = useState<"instructions" | "uploading" | "done">("instructions");
  const [receipt, setReceipt] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: api.settings.list,
    staleTime: 5 * 60_000,
  });

  const gateway = (settings?.paymentGateway ?? "vodafone_cash") as Gateway;
  const meta = GATEWAY_META[gateway] ?? GATEWAY_META.vodafone_cash;

  const handleFileSelect = async (files: FileList | null) => {
    if (!files?.[0]) return;
    setUploading(true);
    try {
      const res = await api.upload.propertyImage(files[0]);
      setReceipt(res.url);
      toast.success("تم رفع إيصال الدفع");
    } catch {
      toast.error("فشل رفع الإيصال، حاول مرة أخرى");
    } finally {
      setUploading(false);
    }
  };

  const handleConfirm = async () => {
    setPhase("uploading");
    await new Promise(r => setTimeout(r, 600));
    setPhase("done");
    await new Promise(r => setTimeout(r, 900));
    onSuccess();
  };

  const handleClose = () => {
    if (phase === "uploading") return;
    setPhase("instructions");
    setReceipt(null);
    onClose();
  };

  if (!plan || parseFloat(plan.price) === 0) return null;

  const amount = parseFloat(plan.price).toLocaleString("ar-EG");
  const currency = plan.currency ?? "EGP";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-[460px] p-0 overflow-hidden" dir="rtl">

        {/* ── Processing ── */}
        {phase === "uploading" && (
          <div className="py-16 text-center space-y-4 px-6">
            <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center mx-auto">
              <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
            </div>
            <p className="text-lg font-bold">جارٍ تأكيد طلبك...</p>
            <p className="text-sm text-muted-foreground">يرجى الانتظار</p>
          </div>
        )}

        {/* ── Done ── */}
        {phase === "done" && (
          <div className="py-16 text-center space-y-4 px-6">
            <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-teal-600" />
            </div>
            <p className="text-lg font-bold text-teal-700">تم استلام طلبك!</p>
            <p className="text-sm text-muted-foreground">جارٍ مراجعة الدفع وتفعيل الباقة...</p>
          </div>
        )}

        {/* ── Main Instructions ── */}
        {phase === "instructions" && (
          <>
            {/* Header */}
            <div className="bg-gradient-to-l from-teal-600 to-teal-700 px-5 py-4 text-white">
              <DialogHeader>
                <DialogTitle className="text-white flex items-center gap-2 text-lg">
                  <Shield className="w-5 h-5 text-teal-200" />
                  إتمام الدفع الآمن
                </DialogTitle>
              </DialogHeader>
              <div className="flex items-center justify-between mt-3">
                <div>
                  <p className="text-teal-100 text-xs">{plan.nameAr ?? plan.name}</p>
                  <p className="text-teal-200 text-xs">{plan.durationDays} يوم</p>
                </div>
                <div className="text-left">
                  <p className="text-3xl font-black leading-none">{amount}</p>
                  <p className="text-teal-200 text-sm">{currency}</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Step 1: Transfer details */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0">1</div>
                  <p className="font-bold text-sm text-gray-800">حوّل المبلغ عبر {meta.label}</p>
                </div>

                <div className={`rounded-2xl border ${meta.border} ${meta.bg} p-4 space-y-3`}>
                  {/* Gateway badge */}
                  <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border ${meta.border} bg-white`}>
                    {meta.icon}
                    <span className={`text-sm font-bold ${meta.color}`}>{meta.label}</span>
                  </div>

                  {/* Vodafone Cash */}
                  {gateway === "vodafone_cash" && (
                    <>
                      <CopyField label="رقم المحفظة" value={settings?.vodafoneCashNumber ?? ""} />
                      <CopyField label="اسم صاحب المحفظة" value={settings?.vodafoneCashName ?? ""} />
                      <div className={`text-xs ${meta.color} mt-1`}>
                        افتح تطبيق فودافون كاش → تحويل → أدخل الرقم → أرسل {amount} {currency}
                      </div>
                    </>
                  )}

                  {/* Fawry */}
                  {gateway === "fawry" && (
                    <>
                      <CopyField label="كود فوري" value={settings?.fawryCode ?? ""} />
                      <CopyField label="اسم التاجر" value={settings?.fawryMerchantName ?? ""} />
                      <div className={`text-xs ${meta.color} mt-1`}>
                        توجه لأقرب نقطة فوري أو استخدم التطبيق → أدخل الكود → ادفع {amount} {currency}
                      </div>
                    </>
                  )}

                  {/* InstaPay */}
                  {gateway === "instapay" && (
                    <>
                      <CopyField label="معرّف InstaPay (IPA)" value={settings?.instaPayIPA ?? ""} />
                      <CopyField label="الاسم" value={settings?.instaPayName ?? ""} />
                      <div className={`text-xs ${meta.color} mt-1`}>
                        افتح تطبيق InstaPay أو بنكك → تحويل فوري → أدخل المعرّف → أرسل {amount} {currency}
                      </div>
                    </>
                  )}

                  {/* Bank Transfer */}
                  {gateway === "bank_transfer" && (
                    <>
                      <CopyField label="البنك" value={settings?.bankName ?? ""} />
                      <CopyField label="اسم الحساب" value={settings?.bankAccountName ?? ""} />
                      <CopyField label="رقم الحساب" value={settings?.bankAccountNumber ?? ""} />
                      {settings?.bankIBAN && <CopyField label="IBAN" value={settings.bankIBAN} />}
                      <div className={`text-xs ${meta.color} mt-1`}>
                        حوّل {amount} {currency} عبر الإنترنت البنكي أو فرع البنك
                      </div>
                    </>
                  )}

                  {settings?.paymentInstructions && (
                    <p className="text-xs text-gray-500 border-t border-gray-200 pt-2 mt-1">
                      {settings.paymentInstructions}
                    </p>
                  )}
                </div>
              </div>

              {/* Step 2: Upload receipt */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-6 h-6 rounded-full bg-teal-600 text-white text-xs font-bold flex items-center justify-center shrink-0">2</div>
                  <p className="font-bold text-sm text-gray-800">ارفع إيصال الدفع (اختياري)</p>
                </div>
                <input
                  ref={fileRef} type="file" accept="image/*,application/pdf" className="hidden"
                  onChange={e => handleFileSelect(e.target.files)}
                />
                {receipt ? (
                  <div className="flex items-center gap-3 bg-teal-50 border border-teal-200 rounded-xl p-3">
                    <CheckCircle2 className="w-5 h-5 text-teal-600 shrink-0" />
                    <p className="text-sm text-teal-700 font-medium flex-1">تم رفع الإيصال بنجاح</p>
                    <button type="button" onClick={() => setReceipt(null)} className="text-gray-400 hover:text-red-500">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => fileRef.current?.click()}
                    disabled={uploading}
                    className="w-full py-4 rounded-xl border-2 border-dashed border-gray-200 hover:border-teal-400 hover:bg-teal-50/30 transition-all flex items-center justify-center gap-2 text-gray-400 hover:text-teal-600"
                  >
                    {uploading ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /><span className="text-sm">جارٍ الرفع...</span></>
                    ) : (
                      <><Upload className="w-4 h-4" /><span className="text-sm font-medium">اضغط لرفع الإيصال (صورة أو PDF)</span></>
                    )}
                  </button>
                )}
              </div>

              {/* Security note */}
              <div className="flex items-center gap-2 text-xs text-gray-400 bg-gray-50 rounded-lg p-3">
                <Shield className="w-4 h-4 text-teal-500 shrink-0" />
                سيتم مراجعة الدفع وتفعيل الباقة خلال 24 ساعة من إرسال الطلب
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-1">
                <Button
                  onClick={handleConfirm}
                  className="flex-1 h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold gap-2"
                >
                  <Banknote className="w-4 h-4" />
                  أكدت التحويل — إرسال الطلب
                </Button>
                <Button variant="outline" onClick={handleClose} className="h-12 rounded-xl px-5 shrink-0">
                  إلغاء
                </Button>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
