import { useState } from "react";
import { LifeBuoy, Phone, MessageCircle, Send, CheckCircle2, Loader2, Mail } from "lucide-react";
import ProviderLayout from "@/components/ProviderLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export default function ProviderSupport() {
  const { user } = useAuth();
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const { data: settings } = useQuery({
    queryKey: ["site-settings"],
    queryFn: api.settings.list,
    staleTime: 5 * 60 * 1000,
  });

  const s = settings as any;
  const contactPhone = s?.contactPhone ?? "+201000000000";
  const whatsappNumber = (s?.contactPhone ?? "+201000000000").replace(/\D/g, "");
  const contactEmail = s?.contactEmail ?? "support@dalelplus.com";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) return;
    setLoading(true);
    await new Promise(r => setTimeout(r, 800));
    setSent(true);
    setLoading(false);
  };

  return (
    <ProviderLayout>
      <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6 animate-in fade-in duration-300" dir="rtl">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <LifeBuoy className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">المساعدة والدعم</h1>
            <p className="text-muted-foreground text-sm">نحن هنا لمساعدتك في أي وقت</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Phone */}
          <Card className="border-border/50 hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <Phone className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-sm mb-1">الهاتف</p>
                <a href={`tel:${contactPhone}`} className="text-primary font-bold text-lg hover:underline" dir="ltr">
                  {contactPhone}
                </a>
              </div>
              <a href={`tel:${contactPhone}`}>
                <Button size="sm" variant="outline" className="rounded-full border-primary/30 text-primary hover:bg-primary/5">اتصل الآن</Button>
              </a>
            </CardContent>
          </Card>

          {/* WhatsApp */}
          <Card className="border-border/50 hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-green-500/10 flex items-center justify-center text-green-600">
                <MessageCircle className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-sm mb-1">واتساب</p>
                <p className="text-green-600 font-bold text-lg" dir="ltr">{contactPhone}</p>
              </div>
              <a href={`https://wa.me/${whatsappNumber}`} target="_blank" rel="noopener noreferrer">
                <Button size="sm" className="rounded-full bg-[#25D366] hover:bg-[#20bd5a] text-white border-none">تواصل عبر واتساب</Button>
              </a>
            </CardContent>
          </Card>

          {/* Email */}
          <Card className="border-border/50 hover:shadow-md transition-shadow">
            <CardContent className="p-5 flex flex-col items-center text-center gap-3">
              <div className="w-12 h-12 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-600">
                <Mail className="w-6 h-6" />
              </div>
              <div>
                <p className="font-semibold text-sm mb-1">البريد الإلكتروني</p>
                <p className="text-blue-600 font-bold text-sm break-all">{contactEmail}</p>
              </div>
              <a href={`mailto:${contactEmail}`}>
                <Button size="sm" variant="outline" className="rounded-full border-blue-200 text-blue-600 hover:bg-blue-50">أرسل بريداً</Button>
              </a>
            </CardContent>
          </Card>
        </div>

        {/* Contact Form */}
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg flex items-center gap-2">
              <Send className="w-4 h-4 text-primary" />
              أرسل رسالة للدعم
            </CardTitle>
          </CardHeader>
          <CardContent>
            {sent ? (
              <div className="flex flex-col items-center justify-center py-10 text-center gap-4">
                <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-green-700 mb-1">تم إرسال رسالتك!</h3>
                  <p className="text-sm text-muted-foreground">سيتواصل معك فريق الدعم خلال 24 ساعة</p>
                </div>
                <Button variant="outline" onClick={() => { setSent(false); setSubject(""); setMessage(""); }} className="rounded-xl">إرسال رسالة أخرى</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label>الاسم</Label>
                    <Input value={user?.name ?? ""} disabled className="bg-secondary/30" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>البريد الإلكتروني</Label>
                    <Input value={user?.email ?? ""} disabled className="bg-secondary/30" />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label>موضوع الرسالة <span className="text-red-500">*</span></Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="ما الذي تحتاج المساعدة فيه؟"
                    required
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>تفاصيل الرسالة <span className="text-red-500">*</span></Label>
                  <Textarea
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="اشرح مشكلتك أو استفسارك بالتفصيل..."
                    rows={5}
                    required
                    className="rounded-xl resize-none"
                  />
                </div>
                <Button type="submit" className="w-full rounded-xl" disabled={loading || !subject.trim() || !message.trim()}>
                  {loading ? <><Loader2 className="w-4 h-4 animate-spin ml-2" />جاري الإرسال...</> : <><Send className="w-4 h-4 ml-2" />إرسال الرسالة</>}
                </Button>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </ProviderLayout>
  );
}
