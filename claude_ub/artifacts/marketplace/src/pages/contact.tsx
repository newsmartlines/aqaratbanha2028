import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/Header";
import { api } from "@/lib/api";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Mail, Phone, MapPin, Send, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ContactPage() {
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [sending, setSending] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: api.settings.list,
  });

  const siteName = settings?.siteName ?? "دليل بلس";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    await new Promise(r => setTimeout(r, 1000));
    setSending(false);
    toast({ title: "تم الإرسال!", description: "شكراً لتواصلك معنا، سنرد عليك في أقرب وقت." });
    setForm({ name: "", email: "", subject: "", message: "" });
  };

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      <Header />

      {/* Hero */}
      <div className="bg-gradient-to-br from-primary to-primary/80 text-primary-foreground py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3">تواصل معنا</h1>
          <p className="text-primary-foreground/80 text-lg">نحن هنا للمساعدة — أرسل لنا رسالتك وسنرد في أسرع وقت</p>
        </div>
      </div>

      <div className="container mx-auto px-4 py-16 max-w-5xl">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          {/* Contact Info */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">معلومات التواصل</h2>
              <p className="text-muted-foreground">يسعدنا تلقي استفساراتك وملاحظاتك في أي وقت</p>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-4 p-4 rounded-2xl border border-border/40 bg-card shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Mail className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-muted-foreground mb-0.5">البريد الإلكتروني</p>
                  <p className="font-medium">{settings?.contactEmail ?? "info@dalel.sa"}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl border border-border/40 bg-card shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <Phone className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-muted-foreground mb-0.5">رقم الهاتف</p>
                  <p className="font-medium" dir="ltr">{settings?.contactPhone ?? "+966 500 000 000"}</p>
                </div>
              </div>

              <div className="flex items-start gap-4 p-4 rounded-2xl border border-border/40 bg-card shadow-sm">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                  <MapPin className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-muted-foreground mb-0.5">العنوان</p>
                  <p className="font-medium">{settings?.contactAddress ?? "الرياض، المملكة العربية السعودية"}</p>
                </div>
              </div>
            </div>

            <div className="bg-primary/5 border border-primary/20 rounded-2xl p-5">
              <p className="text-sm text-foreground/70 leading-relaxed">
                ساعات العمل: الأحد — الخميس<br />
                من الساعة 9 صباحاً حتى 6 مساءً
              </p>
            </div>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-3">
            <div className="bg-card border border-border/40 rounded-3xl p-6 md:p-8 shadow-sm">
              <h2 className="text-xl font-bold mb-6">أرسل رسالتك</h2>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>الاسم الكامل</Label>
                    <Input required value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="محمد أحمد" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>البريد الإلكتروني</Label>
                    <Input type="email" required value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="email@example.com" dir="ltr" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>الموضوع</Label>
                  <Input required value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} placeholder="موضوع رسالتك" />
                </div>
                <div className="space-y-1.5">
                  <Label>الرسالة</Label>
                  <Textarea required value={form.message} onChange={e => setForm(f => ({ ...f, message: e.target.value }))} placeholder="اكتب رسالتك هنا..." rows={5} />
                </div>
                <Button type="submit" disabled={sending} className="w-full h-12 bg-primary hover:bg-primary/90 text-primary-foreground font-bold rounded-xl text-base">
                  {sending ? <Loader2 className="w-5 h-5 animate-spin ml-2" /> : <Send className="w-5 h-5 ml-2" />}
                  إرسال الرسالة
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>

      <footer className="py-8 border-t border-border/30 bg-secondary/20">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>© 2026 {siteName} — جميع الحقوق محفوظة</p>
        </div>
      </footer>
    </div>
  );
}
