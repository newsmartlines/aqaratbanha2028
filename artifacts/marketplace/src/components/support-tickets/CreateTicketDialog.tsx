import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { arTicketCategoryLabel } from "./ar-ui";
import type { TicketCategory } from "./types";

const CATEGORIES: TicketCategory[] = ["Technical", "Payment", "Account", "Other"];

export function CreateTicketDialog({
  open,
  onOpenChange,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  submitting: boolean;
  onSubmit: (payload: { subject: string; category: TicketCategory; message: string }) => Promise<void>;
}) {
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<TicketCategory>("Technical");
  const [message, setMessage] = useState("");

  const reset = () => {
    setSubject("");
    setCategory("Technical");
    setMessage("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim() || submitting) return;
    try {
      await onSubmit({ subject: subject.trim(), category, message: message.trim() });
      reset();
    } catch {
      /* parent mutation shows toast */
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!submitting) onOpenChange(v);
      }}
    >
      <DialogContent
        dir="rtl"
        className="max-w-lg rounded-2xl border-slate-200/80 bg-white/95 shadow-2xl backdrop-blur-md dark:border-slate-800 dark:bg-slate-950/95 sm:rounded-2xl"
      >
        <DialogHeader className="space-y-1 text-start">
          <DialogTitle className="text-xl font-bold tracking-tight">إنشاء تذكرة جديدة</DialogTitle>
          <DialogDescription className="text-sm text-slate-500 dark:text-slate-400">
            صِف المشكلة بإيجاز؛ يسعى فريقنا للرد خلال يوم عمل واحد في المعتاد.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          <div className="space-y-2">
            <Label htmlFor="ticket-subject" className="text-slate-700 dark:text-slate-300">
              الموضوع
            </Label>
            <Input
              id="ticket-subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="ملخص موجز للمشكلة"
              className="h-11 rounded-xl border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900"
              maxLength={200}
              required
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-700 dark:text-slate-300">التصنيف</Label>
            <Select value={category} onValueChange={(v) => setCategory(v as TicketCategory)}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent dir="rtl">
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {arTicketCategoryLabel[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ticket-message" className="text-slate-700 dark:text-slate-300">
              نص الرسالة
            </Label>
            <Textarea
              id="ticket-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="اذكر خطوات تكرار المشكلة والمعرّفات والمرفقات إن وُجدت."
              rows={5}
              required
              className="resize-none rounded-xl border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-900"
            />
          </div>
          <DialogFooter className="gap-2 pt-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl border-slate-200 dark:border-slate-700"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              إلغاء
            </Button>
            <Button
              type="submit"
              disabled={submitting || !subject.trim() || !message.trim()}
              className="rounded-xl bg-gradient-to-r from-sky-600 to-cyan-500 font-semibold text-white shadow-lg shadow-cyan-500/25 hover:from-sky-500 hover:to-cyan-400"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  جاري الإرسال…
                </>
              ) : (
                "إرسال التذكرة"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
