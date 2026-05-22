import { useState } from "react";
import { CreditCard, Loader2, CheckCircle2, Smartphone, Shield } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { BillingPlan } from "@/lib/api";

interface PaymentDialogProps {
  open:      boolean;
  plan:      BillingPlan | null;
  onClose:   () => void;
  onSuccess: () => void;
}

export function PaymentDialog({ open, plan, onClose, onSuccess }: PaymentDialogProps) {
  const [phase, setPhase]   = useState<"form" | "processing" | "done">("form");
  const [mobile, setMobile] = useState("");

  const handlePay = async () => {
    if (!mobile.match(/^05\d{8}$/)) return;
    setPhase("processing");
    await new Promise((r) => setTimeout(r, 2800));
    setPhase("done");
    await new Promise((r) => setTimeout(r, 800));
    onSuccess();
  };

  const handleClose = () => {
    if (phase === "processing") return;
    setPhase("form");
    setMobile("");
    onClose();
  };

  if (!plan || parseFloat(plan.price) === 0) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleClose(); }}>
      <DialogContent className="sm:max-w-[420px]" dir="rtl">
        {phase === "form" && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-xl">
                <CreditCard className="w-5 h-5 text-teal-600" />
                الدفع الآمن
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-5 pt-2">
              <div className="flex items-center justify-between bg-teal-50 rounded-xl px-4 py-3 border border-teal-200">
                <div>
                  <p className="text-sm font-bold text-teal-800">{plan.nameAr ?? plan.name}</p>
                  <p className="text-xs text-teal-600">{plan.durationDays} يوم — اشتراك شهري</p>
                </div>
                <p className="text-2xl font-black text-teal-700">
                  {plan.price}
                  <span className="text-sm font-semibold mr-1">{plan.currency}</span>
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-bold flex items-center gap-2">
                  <Smartphone className="w-4 h-4 text-primary" />
                  رقم جوال STC Pay
                </Label>
                <Input
                  placeholder="05XXXXXXXX"
                  value={mobile}
                  onChange={(e) => setMobile(e.target.value)}
                  maxLength={10}
                  dir="ltr"
                  className="h-12 rounded-xl text-center tracking-widest text-lg font-bold"
                />
                <p className="text-xs text-muted-foreground text-center">
                  أدخل رقم الجوال المرتبط بمحفظة STC Pay
                </p>
              </div>

              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded-lg p-3">
                <Shield className="w-4 h-4 text-teal-600 shrink-0" />
                جميع المعاملات مشفرة وآمنة بالكامل
              </div>

              <div className="flex gap-3">
                <Button
                  onClick={handlePay}
                  disabled={!mobile.match(/^05\d{8}$/)}
                  className="flex-1 h-12 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold"
                >
                  <CreditCard className="w-4 h-4 ml-2" />
                  ادفع {plan.price} {plan.currency}
                </Button>
                <Button variant="outline" onClick={handleClose} className="h-12 rounded-xl px-5">
                  إلغاء
                </Button>
              </div>
            </div>
          </>
        )}

        {phase === "processing" && (
          <div className="py-14 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center mx-auto">
              <Loader2 className="w-10 h-10 animate-spin text-teal-600" />
            </div>
            <p className="text-lg font-bold">جارٍ معالجة الدفع</p>
            <p className="text-sm text-muted-foreground">الرجاء الانتظار...</p>
          </div>
        )}

        {phase === "done" && (
          <div className="py-14 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center mx-auto">
              <CheckCircle2 className="w-10 h-10 text-teal-600" />
            </div>
            <p className="text-lg font-bold text-teal-700">تم الدفع بنجاح!</p>
            <p className="text-sm text-muted-foreground">جارٍ نشر إعلانك...</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
