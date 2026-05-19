import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { AdminLayout } from "@/components/admin/AdminLayout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { api, type SiteSettings } from "@/lib/api";
import toast from "react-hot-toast";
import {
  Bot, Save, Plus, Trash2, Loader2, MessageCircle, Sparkles,
  Eye, EyeOff, ToggleLeft, ToggleRight, Zap, Settings2,
  BedDouble, Bath, Maximize2, MapPin, X,
} from "lucide-react";

// ── Default values ──────────────────────────────────────────────────────────
const DEFAULT_BOT_NAME = "مساعد عقارات بنها";
const DEFAULT_WELCOME =
  "أهلاً! أنا مساعدك الذكي لعقارات بنها 🏠\nأخبرني إيه اللي بتدور عليه — نوع العقار، المنطقة، السعر، أو عدد الغرف — وأنا هجيبلك أفضل الخيارات من قاعدة البيانات!";
const DEFAULT_QUICK_REPLIES = [
  "شقة للبيع في بنها",
  "أرض للبيع",
  "شقة للإيجار",
  "فيلا للبيع",
];

// ── Mini chat preview ────────────────────────────────────────────────────────
function ChatPreview({
  botName,
  welcome,
  quickReplies,
  enabled,
}: {
  botName: string;
  welcome: string;
  quickReplies: string[];
  enabled: boolean;
}) {
  return (
    <div className="flex flex-col h-full" dir="rtl">
      {/* header */}
      <div className="bg-primary px-4 py-3 rounded-t-2xl flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">{botName || DEFAULT_BOT_NAME}</p>
          <p className="text-[11px] text-white/70 flex items-center gap-1">
            <span className={`w-1.5 h-1.5 rounded-full inline-block ${enabled ? "bg-green-300" : "bg-red-400"}`} />
            {enabled ? "متاح دائماً" : "معطّل"}
          </p>
        </div>
        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${enabled ? "bg-green-500/20 text-green-200" : "bg-red-500/20 text-red-300"}`}>
          {enabled ? "مفعّل" : "موقف"}
        </div>
      </div>

      {/* messages */}
      <div className="flex-1 bg-[#f5f7fa] px-3 pt-3 pb-2 space-y-3 overflow-y-auto min-h-0">
        {/* bot welcome */}
        <div className="flex items-end gap-2">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2.5 shadow-sm border border-gray-100 text-sm text-gray-800 leading-relaxed whitespace-pre-line max-w-[85%]">
            {welcome || DEFAULT_WELCOME}
          </div>
        </div>

        {/* quick replies */}
        {quickReplies.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pr-9">
            {quickReplies.slice(0, 4).map((qr, i) => (
              <span key={i} className="text-[11px] bg-white border border-primary/20 text-primary font-semibold rounded-full px-2.5 py-1">
                {qr}
              </span>
            ))}
          </div>
        )}

        {/* sample user message */}
        <div className="flex items-end justify-start gap-2 flex-row-reverse">
          <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0 text-[11px] font-bold text-gray-500">أ</div>
          <div className="bg-primary text-white rounded-2xl rounded-br-sm px-3 py-2 text-sm">
            شقة ٣ غرف في بنها
          </div>
        </div>

        {/* sample bot reply */}
        <div className="flex items-end gap-2">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2.5 shadow-sm border border-gray-100 text-sm text-gray-800 max-w-[85%]">
            وجدت ٤ شقق للبيع في بنها:
            <div className="mt-2 grid grid-cols-2 gap-1.5">
              {[
                { title: "شقة في حي الإسكان", price: "٨٥٠,٠٠٠ ج.م", beds: 3, area: 120 },
                { title: "شقة بالقرب من الجامعة", price: "٦٥٠,٠٠٠ ج.م", beds: 3, area: 100 },
              ].map((p, i) => (
                <div key={i} className="bg-gray-50 rounded-xl p-2 border border-gray-100">
                  <p className="text-[11px] font-bold text-gray-900 line-clamp-1 mb-0.5">{p.title}</p>
                  <p className="text-[11px] font-bold text-primary mb-1">{p.price}</p>
                  <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                    <span className="flex items-center gap-0.5"><BedDouble className="w-2.5 h-2.5" />{p.beds}</span>
                    <span className="flex items-center gap-0.5"><Maximize2 className="w-2.5 h-2.5" />{p.area}م²</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* input area */}
      <div className="bg-white px-3 py-2 rounded-b-2xl border-t border-gray-100">
        <div className="flex items-center gap-2 bg-[#f5f7fa] rounded-xl px-3 py-1.5">
          <span className="flex-1 text-sm text-gray-400">اكتب طلبك...</span>
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center">
            <MessageCircle className="w-3.5 h-3.5 text-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function AdminChatbot() {
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery<SiteSettings>({
    queryKey: ["site-settings"],
    queryFn: api.settings.list,
    staleTime: 10_000,
  });

  const [enabled, setEnabled] = useState(true);
  const [botName, setBotName] = useState("");
  const [welcome, setWelcome] = useState("");
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [newReply, setNewReply] = useState("");
  const [previewOpen, setPreviewOpen] = useState(true);

  useEffect(() => {
    if (!settings) return;
    const s = settings as any;
    setEnabled(s.chatbotEnabled !== "false");
    setBotName(s.chatbotBotName ?? "");
    setWelcome(s.chatbotWelcomeMessage ?? "");
    try {
      const parsed = JSON.parse(s.chatbotQuickReplies ?? "[]");
      setQuickReplies(Array.isArray(parsed) ? parsed : DEFAULT_QUICK_REPLIES);
    } catch {
      setQuickReplies(DEFAULT_QUICK_REPLIES);
    }
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: () =>
      api.settings.save({
        chatbotEnabled: enabled ? "true" : "false",
        chatbotBotName: botName || DEFAULT_BOT_NAME,
        chatbotWelcomeMessage: welcome || DEFAULT_WELCOME,
        chatbotQuickReplies: JSON.stringify(quickReplies),
      }),
    onSuccess: () => {
      toast.success("تم حفظ إعدادات المساعد الذكي ✓");
      qc.invalidateQueries({ queryKey: ["site-settings"] });
    },
    onError: () => toast.error("فشل الحفظ، حاول مرة أخرى"),
  });

  const addQuickReply = () => {
    const v = newReply.trim();
    if (!v || quickReplies.includes(v)) return;
    if (quickReplies.length >= 8) { toast.error("الحد الأقصى ٨ أزرار سريعة"); return; }
    setQuickReplies(prev => [...prev, v]);
    setNewReply("");
  };

  const removeQuickReply = (i: number) => {
    setQuickReplies(prev => prev.filter((_, idx) => idx !== i));
  };

  if (isLoading) {
    return (
      <AdminLayout title="إدارة المساعد الذكي">
        <div className="flex items-center justify-center min-h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout title="إدارة المساعد الذكي">
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
              <Bot className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">المساعد الذكي (AI Chatbot)</h1>
              <p className="text-sm text-gray-500">تحكم كامل في المساعد الذي يظهر للزوار</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPreviewOpen(o => !o)}
              className="gap-1.5"
            >
              {previewOpen ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              {previewOpen ? "إخفاء المعاينة" : "إظهار المعاينة"}
            </Button>
            <Button
              onClick={() => saveMut.mutate()}
              disabled={saveMut.isPending}
              className="gap-2 bg-primary hover:bg-primary/90"
            >
              {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              حفظ الإعدادات
            </Button>
          </div>
        </div>

        <div className={`grid gap-6 ${previewOpen ? "grid-cols-1 xl:grid-cols-5" : "grid-cols-1 max-w-3xl"}`}>
          {/* ── Settings column ── */}
          <div className="xl:col-span-3 space-y-5">

            {/* Enable / Disable card */}
            <Card className="border-2 border-dashed border-gray-200">
              <CardContent className="pt-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${enabled ? "bg-green-100" : "bg-red-100"}`}>
                      {enabled ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5 text-red-500" />}
                    </div>
                    <div>
                      <p className="font-bold text-gray-900">تشغيل / إيقاف المساعد</p>
                      <p className="text-sm text-gray-500">
                        {enabled
                          ? "المساعد ظاهر للزوار على كل صفحات الموقع"
                          : "المساعد مخفي ولن يظهر للزوار"}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={enabled ? "default" : "secondary"} className={enabled ? "bg-green-500 text-white" : ""}>
                      {enabled ? "مفعّل" : "معطّل"}
                    </Badge>
                    <Switch
                      checked={enabled}
                      onCheckedChange={setEnabled}
                      className="data-[state=checked]:bg-green-500"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bot identity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-primary" />
                  هوية المساعد
                </CardTitle>
                <CardDescription>الاسم والمظهر الذي يراه الزائر</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-semibold text-gray-700 mb-1.5 block">
                    اسم المساعد
                  </Label>
                  <Input
                    value={botName}
                    onChange={e => setBotName(e.target.value)}
                    placeholder={DEFAULT_BOT_NAME}
                    dir="rtl"
                    className="text-sm"
                  />
                  <p className="text-xs text-gray-400 mt-1">يظهر في رأس نافذة الشات</p>
                </div>
              </CardContent>
            </Card>

            {/* Welcome message */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageCircle className="w-4 h-4 text-primary" />
                  رسالة الترحيب
                </CardTitle>
                <CardDescription>أول رسالة يراها الزائر عند فتح الشات</CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={welcome}
                  onChange={e => setWelcome(e.target.value)}
                  placeholder={DEFAULT_WELCOME}
                  dir="rtl"
                  rows={5}
                  className="text-sm leading-relaxed resize-none"
                />
                <p className="text-xs text-gray-400 mt-1.5">
                  يمكن استخدام سطر جديد لتنسيق الرسالة • {welcome.length} حرف
                </p>
              </CardContent>
            </Card>

            {/* Quick replies */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2">
                  <Zap className="w-4 h-4 text-primary" />
                  الأزرار السريعة
                </CardTitle>
                <CardDescription>
                  تظهر للزائر عند فتح الشات كاقتراحات جاهزة للضغط — الحد الأقصى ٨ أزرار
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* current buttons */}
                <div className="flex flex-wrap gap-2">
                  {quickReplies.map((qr, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 bg-primary/8 border border-primary/20 text-primary rounded-full px-3 py-1.5 text-sm font-semibold"
                    >
                      <span>{qr}</span>
                      <button
                        onClick={() => removeQuickReply(i)}
                        className="text-primary/50 hover:text-red-500 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {quickReplies.length === 0 && (
                    <p className="text-sm text-gray-400 italic">لا توجد أزرار سريعة — أضف بعضها أدناه</p>
                  )}
                </div>

                {/* add new */}
                {quickReplies.length < 8 && (
                  <div className="flex items-center gap-2 pt-1">
                    <Input
                      value={newReply}
                      onChange={e => setNewReply(e.target.value)}
                      onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addQuickReply(); } }}
                      placeholder='مثال: "شقة ٣ غرف للإيجار"'
                      dir="rtl"
                      className="flex-1 text-sm"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={addQuickReply}
                      disabled={!newReply.trim()}
                      className="gap-1.5 shrink-0"
                    >
                      <Plus className="w-4 h-4" />
                      إضافة
                    </Button>
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2 text-xs text-amber-700">
                  💡 <strong>نصيحة:</strong> استخدم أزرار تعكس أكثر ما يبحث عنه زوار موقعك لزيادة تفاعلهم مع المساعد.
                </div>
              </CardContent>
            </Card>

            {/* Save button (bottom) */}
            <div className="flex justify-end">
              <Button
                onClick={() => saveMut.mutate()}
                disabled={saveMut.isPending}
                size="lg"
                className="gap-2 bg-primary hover:bg-primary/90 px-8"
              >
                {saveMut.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                حفظ كل الإعدادات
              </Button>
            </div>
          </div>

          {/* ── Preview column ── */}
          {previewOpen && (
            <div className="xl:col-span-2">
              <div className="sticky top-20">
                <Card className="overflow-hidden shadow-lg">
                  <CardHeader className="pb-2 border-b">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Eye className="w-4 h-4 text-primary" />
                      معاينة مباشرة
                    </CardTitle>
                    <CardDescription className="text-xs">كما يبدو للزائر</CardDescription>
                  </CardHeader>
                  <CardContent className="p-0 h-[520px]">
                    <ChatPreview
                      botName={botName}
                      welcome={welcome}
                      quickReplies={quickReplies}
                      enabled={enabled}
                    />
                  </CardContent>
                </Card>

                {/* Stats */}
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {[
                    { label: "أزرار سريعة", value: quickReplies.length, max: 8 },
                    { label: "طول الرسالة", value: (welcome || DEFAULT_WELCOME).length, max: 400 },
                    { label: "الحالة", value: enabled ? "✓" : "✗", max: null },
                  ].map(stat => (
                    <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-2.5 text-center">
                      <p className="text-lg font-bold text-gray-900">{stat.value}{stat.max ? `/${stat.max}` : ""}</p>
                      <p className="text-[10px] text-gray-400">{stat.label}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
