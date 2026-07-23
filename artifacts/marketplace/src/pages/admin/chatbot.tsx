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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { api, type SiteSettings } from "@/lib/api";
import toast from "react-hot-toast";
import { useSearch } from "wouter";
import {
  Bot, Save, Plus, Trash2, Loader2, MessageCircle, Sparkles,
  Eye, EyeOff, ToggleLeft, ToggleRight, Zap, Settings2,
  BedDouble, Maximize2, X, BarChart3, Users, TrendingUp,
  Phone, MessageSquare, CheckCircle2, Clock, AlertCircle,
  ChevronDown, ChevronUp, RefreshCw, Inbox, Star, Search,
  Hash, Flame, Key, Globe, Cpu, Lock, ChevronRight,
} from "lucide-react";

const DEFAULT_BOT_NAME = "مساعد عقارات بنها";
const DEFAULT_WELCOME = "أهلاً! أنا مساعدك الذكي لعقارات بنها 🏠\nأخبرني إيه اللي بتدور عليه — أو استخدم الأسئلة السريعة أدناه.";
const DEFAULT_QUICK_REPLIES = ["شقة للبيع في بنها", "أرض للبيع", "شقة للإيجار", "فيلا للبيع"];

const DEFAULT_SYSTEM_PROMPT = `أنت مساعد ذكي متخصص في العقارات في منطقة بنها وقليوبية، مصر.
مهمتك مساعدة المستخدمين في إيجاد العقار المناسب من خلال البيانات المتاحة.

القواعد:
- رد دائماً بالعربية المصرية بأسلوب ودود ومختصر
- عند ذكر عقار: اذكر اسمه وسعره وموقعه ومساحته
- لو سُئلت عن موضوع خارج نطاق العقارات: أعد توجيه المحادثة بلطف
- لا تخترع أسعاراً أو بيانات غير موجودة في القائمة أدناه

العقارات المتاحة حالياً:
{{PROPERTIES}}`;

type AiProvider = { id: string; name: string; desc: string; flag: string; models: string[]; defaultModel: string; baseUrl?: string };
const AI_PROVIDERS: AiProvider[] = [
  { id: "openai",     name: "OpenAI",         flag: "🟢", desc: "GPT-4o / GPT-4 / GPT-3.5",     models: ["gpt-4o-mini", "gpt-4o", "gpt-4-turbo", "gpt-3.5-turbo"],                                defaultModel: "gpt-4o-mini" },
  { id: "anthropic",  name: "Anthropic",       flag: "🟠", desc: "Claude 3.5 Sonnet / Haiku",     models: ["claude-3-5-sonnet-20241022", "claude-3-5-haiku-20241022", "claude-3-haiku-20240307"],    defaultModel: "claude-3-5-haiku-20241022" },
  { id: "gemini",     name: "Google Gemini",   flag: "🔵", desc: "Gemini 2.0 / 1.5 Pro / Flash",  models: ["gemini-2.0-flash", "gemini-1.5-flash", "gemini-1.5-pro"],                               defaultModel: "gemini-2.0-flash" },
  { id: "groq",       name: "Groq",            flag: "⚡", desc: "Llama 3 / Mixtral (سريع جداً)", models: ["llama-3.3-70b-versatile", "llama3-8b-8192", "mixtral-8x7b-32768"],                       defaultModel: "llama-3.3-70b-versatile", baseUrl: "https://api.groq.com/openai/v1" },
  { id: "openrouter", name: "OpenRouter",      flag: "🌐", desc: "مئات النماذج بـ API واحد",       models: ["openai/gpt-4o-mini", "anthropic/claude-3.5-sonnet", "google/gemini-flash-1.5", "meta-llama/llama-3.3-70b-instruct"], defaultModel: "openai/gpt-4o-mini", baseUrl: "https://openrouter.ai/api/v1" },
  { id: "custom",     name: "Custom API",      flag: "⚙️", desc: "أي endpoint متوافق مع OpenAI",   models: [],                                                                                        defaultModel: "" },
];

// ── Lead status colors ────────────────────────────────────────────────────────
const LEAD_STATUS: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  new:       { label: "جديد",      color: "bg-blue-100 text-blue-700",    icon: <Inbox className="w-3 h-3" /> },
  contacted: { label: "تم التواصل", color: "bg-amber-100 text-amber-700", icon: <Phone className="w-3 h-3" /> },
  qualified: { label: "مؤهّل",      color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="w-3 h-3" /> },
  closed:    { label: "مُغلق",      color: "bg-gray-100 text-gray-600",   icon: <X className="w-3 h-3" /> },
};

// ── Analytics tab ─────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["chat-analytics"],
    queryFn: () => fetch("/api/chat-analytics").then(r => r.json()),
    staleTime: 30_000,
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  const stats = [
    { label: "إجمالي العملاء المهتمين", value: data?.totalLeads ?? 0, icon: <Users className="w-5 h-5" />, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "عملاء جدد", value: data?.newLeads ?? 0, icon: <Star className="w-5 h-5" />, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "تم التواصل", value: data?.contacted ?? 0, icon: <Phone className="w-5 h-5" />, color: "text-green-600", bg: "bg-green-50" },
    { label: "معدل التحويل", value: `${data?.conversionRate ?? 0}%`, icon: <TrendingUp className="w-5 h-5" />, color: "text-purple-600", bg: "bg-purple-50" },
  ];

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">إحصائيات المساعد الذكي</h2>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="w-4 h-4" /> تحديث
        </Button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s => (
          <Card key={s.label} className="border-0 shadow-sm">
            <CardContent className="pt-5 pb-4">
              <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3 ${s.color}`}>
                {s.icon}
              </div>
              <p className="text-2xl font-bold text-gray-900">{s.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Top requested properties */}
      {data?.topProperties?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-primary" />
              العقارات الأكثر طلباً
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.topProperties.map((p: any, i: number) => (
                <div key={i} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="text-sm text-gray-800">{p.title ?? "غير محدد"}</span>
                  </div>
                  <Badge variant="secondary" className="text-xs">{p.total} طلب</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent leads */}
      {data?.recentLeads?.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary" />
              آخر العملاء المهتمين
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.recentLeads.slice(0, 5).map((l: any) => (
                <div key={l.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{l.name || "زائر مجهول"}</p>
                    <p className="text-xs text-gray-400">{l.phone || l.whatsapp || "—"} • {l.propertyTitle || "عقار عام"}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    {LEAD_STATUS[l.status] && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${LEAD_STATUS[l.status].color}`}>
                        {LEAD_STATUS[l.status].icon}
                        {LEAD_STATUS[l.status].label}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {(!data?.totalLeads || data.totalLeads === 0) && (
        <div className="text-center py-16 text-gray-400">
          <BarChart3 className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">لا توجد إحصائيات بعد — ستظهر هنا بمجرد تفاعل الزوار مع المساعد</p>
        </div>
      )}
    </div>
  );
}

// ── Leads tab ─────────────────────────────────────────────────────────────────
function LeadsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("all");

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["chat-leads"],
    queryFn: () => fetch("/api/chat-leads").then(r => r.json()),
    staleTime: 15_000,
  });

  const updateLead = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) =>
      fetch(`/api/chat-leads/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["chat-leads"] }); toast.success("تم التحديث"); },
  });

  const filtered = filter === "all" ? leads : leads.filter((l: any) => l.status === filter);

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">العملاء المهتمين ({leads.length})</h2>
        <div className="flex items-center gap-2">
          {["all", "new", "contacted", "qualified", "closed"].map(s => (
            <button key={s} onClick={() => setFilter(s)}
              className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all ${filter === s ? "bg-primary text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {s === "all" ? "الكل" : LEAD_STATUS[s]?.label ?? s}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">لا توجد عملاء في هذا القسم</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((lead: any) => (
            <Card key={lead.id} className="border border-gray-200 shadow-sm hover:shadow transition-shadow">
              <CardContent className="pt-4 pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-bold text-gray-900">{lead.name || "زائر مجهول"}</p>
                      {LEAD_STATUS[lead.status] && (
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${LEAD_STATUS[lead.status].color}`}>
                          {LEAD_STATUS[lead.status].icon}
                          {LEAD_STATUS[lead.status].label}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-500">
                      {(lead.phone || lead.whatsapp) && (
                        <a href={`tel:${lead.phone || lead.whatsapp}`}
                          className="flex items-center gap-1 text-primary hover:underline font-medium">
                          <Phone className="w-3 h-3" />
                          {lead.phone || lead.whatsapp}
                        </a>
                      )}
                      {lead.email && <span>{lead.email}</span>}
                    </div>
                    {lead.propertyTitle && (
                      <p className="text-xs text-gray-600 mt-1 flex items-center gap-1">
                        🏠 <span className="truncate">{lead.propertyTitle}</span>
                      </p>
                    )}
                    <p className="text-[10px] text-gray-400 mt-1">
                      {new Date(lead.createdAt).toLocaleString("ar-EG")}
                    </p>
                  </div>
                  <div className="flex flex-col gap-1 shrink-0">
                    {["new", "contacted", "qualified", "closed"].map(s => s !== lead.status && (
                      <button key={s} onClick={() => updateLead.mutate({ id: lead.id, status: s })}
                        className="text-[10px] font-bold px-2 py-1 rounded-lg bg-gray-100 hover:bg-primary hover:text-white transition-all text-gray-600">
                        → {LEAD_STATUS[s]?.label}
                      </button>
                    ))}
                  </div>
                </div>
                {lead.whatsapp && (
                  <a href={`https://wa.me/${lead.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`مرحباً ${lead.name || ""}، تواصلنا معك بخصوص: ${lead.propertyTitle || "العقار الذي استفسرت عنه"}`)}`}
                    target="_blank" rel="noreferrer"
                    className="mt-2 w-full flex items-center justify-center gap-1.5 bg-green-500 text-white text-xs font-bold rounded-lg py-1.5 hover:bg-green-600 transition-all">
                    <Phone className="w-3.5 h-3.5" />
                    تواصل عبر واتساب
                  </a>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Conversations tab ─────────────────────────────────────────────────────────
function ConversationsTab() {
  const [expanded, setExpanded] = useState<number | null>(null);
  const qc = useQueryClient();

  const { data: sessions = [], isLoading } = useQuery({
    queryKey: ["chat-sessions"],
    queryFn: () => fetch("/api/chat-sessions").then(r => r.json()),
    staleTime: 20_000,
  });

  const deleteSession = useMutation({
    mutationFn: (id: number) => fetch(`/api/chat-sessions/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["chat-sessions"] }); toast.success("تم الحذف"); },
  });

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  if (sessions.length === 0) {
    return (
      <div className="text-center py-16 text-gray-400">
        <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-30" />
        <p className="text-sm">لا توجد محادثات محفوظة بعد</p>
        <p className="text-xs mt-1">تظهر هنا بعد تفاعل الزوار مع المساعد</p>
      </div>
    );
  }

  return (
    <div className="space-y-3" dir="rtl">
      <div className="flex items-center justify-between">
        <h2 className="font-bold text-gray-900">المحادثات المحفوظة ({sessions.length})</h2>
      </div>
      {sessions.map((session: any) => {
        let messages: any[] = [];
        try { messages = JSON.parse(session.messages ?? "[]"); } catch {}
        let meta: any = {};
        try { meta = JSON.parse(session.metadata ?? "{}"); } catch {}
        const isOpen = expanded === session.id;

        return (
          <Card key={session.id} className="border border-gray-200 shadow-sm">
            <CardContent className="pt-3 pb-3">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpanded(isOpen ? null : session.id)}>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-bold text-gray-800 truncate">جلسة: {session.sessionId.slice(-8)}</p>
                    <Badge variant="secondary" className="text-[10px]">{messages.length} رسالة</Badge>
                    {meta?.lastIntent?.location && (
                      <Badge variant="outline" className="text-[10px]">{meta.lastIntent.location}</Badge>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {new Date(session.updatedAt).toLocaleString("ar-EG")}
                  </p>
                  {messages.length > 0 && !isOpen && (
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      {messages[messages.length - 1]?.text?.slice(0, 80)}...
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={() => setExpanded(isOpen ? null : session.id)}
                    className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
                    {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                  <button onClick={() => deleteSession.mutate(session.id)}
                    className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {isOpen && messages.length > 0 && (
                <div className="mt-3 space-y-2 max-h-64 overflow-y-auto border-t pt-3">
                  {messages.map((m: any, i: number) => (
                    <div key={i} className={`flex items-start gap-2 ${m.role === "user" ? "flex-row-reverse" : ""}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 text-white text-[10px] font-bold ${m.role === "bot" ? "bg-primary" : "bg-gray-400"}`}>
                        {m.role === "bot" ? "🤖" : "👤"}
                      </div>
                      <div className={`text-xs px-2.5 py-1.5 rounded-xl max-w-[80%] ${m.role === "bot" ? "bg-white border border-gray-100 text-gray-800" : "bg-primary text-white"}`}>
                        {m.text?.slice(0, 120)}{m.text?.length > 120 ? "..." : ""}
                        {m.propertyCount > 0 && (
                          <span className="block text-[10px] mt-0.5 opacity-70">🏠 عرض {m.propertyCount} عقار</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

// ── Settings tab (preview component) ────────────────────────────────────────
function ChatPreview({ botName, welcome, quickReplies, enabled }: { botName: string; welcome: string; quickReplies: string[]; enabled: boolean }) {
  return (
    <div className="flex flex-col h-full" dir="rtl">
      <div className="bg-gradient-to-l from-primary to-teal-600 px-4 py-3 rounded-t-2xl flex items-center gap-3">
        <div className="relative">
          <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-white ${enabled ? "bg-green-400" : "bg-red-400"}`} />
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">{botName || DEFAULT_BOT_NAME}</p>
          <p className="text-[11px] text-white/70">{enabled ? "يرد فوراً • مساعد ذكي" : "معطّل حالياً"}</p>
        </div>
        <div className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${enabled ? "bg-green-500/20 text-green-200" : "bg-red-500/20 text-red-300"}`}>
          {enabled ? "مفعّل" : "موقف"}
        </div>
      </div>
      <div className="flex-1 bg-[#f5f7fa] px-3 pt-3 pb-2 space-y-3 overflow-y-auto min-h-0">
        <div className="flex items-end gap-2">
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0"><Bot className="w-4 h-4 text-white" /></div>
          <div className="bg-white rounded-2xl rounded-bl-sm px-3 py-2.5 shadow-sm border border-gray-100 text-sm text-gray-800 leading-relaxed whitespace-pre-line max-w-[85%]">
            {welcome || DEFAULT_WELCOME}
          </div>
        </div>
        <button className="w-full text-xs bg-primary/10 border border-primary/20 text-primary font-bold rounded-xl px-3 py-2 flex items-center justify-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> 🧭 ابدأ البحث الموجّه
        </button>
        {quickReplies.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {quickReplies.slice(0, 4).map((qr, i) => (
              <span key={i} className="text-[11px] bg-white border border-primary/20 text-primary font-semibold rounded-full px-2.5 py-1">{qr}</span>
            ))}
          </div>
        )}
      </div>
      <div className="bg-white px-3 py-2 rounded-b-2xl border-t border-gray-100">
        <div className="flex items-center gap-2 bg-[#f5f7fa] rounded-xl px-3 py-1.5">
          <span className="flex-1 text-sm text-gray-400">اكتب طلبك...</span>
          <div className="w-7 h-7 bg-primary rounded-lg flex items-center justify-center"><MessageCircle className="w-3.5 h-3.5 text-white" /></div>
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
// ── Queries Management Tab ─────────────────────────────────────────────────
function QueriesTab() {
  const qc = useQueryClient();

  const { data: queries = [], isLoading, refetch } = useQuery<any[]>({
    queryKey: ["chatbot-queries"],
    queryFn: () => fetch("/api/chatbot-queries").then(r => r.json()),
    staleTime: 10_000,
  });

  const deleteMut = useMutation({
    mutationFn: (id: number) => fetch(`/api/chatbot-queries/${id}`, { method: "DELETE" }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["chatbot-queries"] }); toast.success("تم الحذف"); },
  });

  const [search, setSearch] = useState("");
  const filtered = search
    ? queries.filter((q: any) => q.query?.includes(search))
    : queries;

  if (isLoading) return <div className="flex justify-center py-20"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-4" dir="rtl">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-bold text-gray-900">استفسارات المستخدمين ({queries.length})</h2>
          <p className="text-xs text-gray-500">الاستفسارات التي يكتبها الزوار في المساعد الذكي</p>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} className="gap-1.5">
          <RefreshCw className="w-4 h-4" />تحديث
        </Button>
      </div>

      <div className="relative">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="بحث في الاستفسارات..." dir="rtl"
          className="w-full border border-gray-200 rounded-xl pr-9 pl-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
      </div>

      {/* Top 3 highlight */}
      {!search && queries.length >= 3 && (
        <div className="grid grid-cols-3 gap-3">
          {queries.slice(0, 3).map((q: any, i: number) => (
            <Card key={q.id} className={`border-2 ${i === 0 ? "border-yellow-300 bg-yellow-50" : i === 1 ? "border-gray-200 bg-gray-50" : "border-orange-200 bg-orange-50"}`}>
              <CardContent className="pt-4 pb-3 text-center">
                <div className={`text-2xl font-black mb-1 ${i === 0 ? "text-yellow-600" : i === 1 ? "text-gray-500" : "text-orange-500"}`}>
                  #{i + 1}
                </div>
                <p className="text-xs font-bold text-gray-800 truncate">{q.query}</p>
                <p className="text-lg font-black text-primary mt-1">{q.count} <span className="text-[10px] font-normal text-gray-500">مرة</span></p>
                <p className="text-[10px] text-gray-400">{q.resultCount ?? 0} نتيجة</p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Hash className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">لا توجد استفسارات بعد</p>
          <p className="text-xs mt-1">تظهر هنا عند تفاعل الزوار مع المساعد</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((q: any, i: number) => (
            <div key={q.id} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3 hover:border-primary/20 transition-colors group">
              <span className="text-sm font-black text-gray-300 w-6 text-center shrink-0">{i + 1}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-800 truncate">{q.query}</p>
                <div className="flex items-center gap-3 text-[11px] text-gray-400 mt-0.5">
                  <span className="flex items-center gap-1"><Flame className="w-3 h-3 text-orange-400" />{q.count} بحث</span>
                  <span>{q.resultCount ?? 0} نتيجة</span>
                  {q.updatedAt && <span>{new Date(q.updatedAt).toLocaleDateString("ar-EG")}</span>}
                </div>
              </div>
              <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="h-2 w-20 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-2 bg-primary rounded-full transition-all"
                    style={{ width: `${Math.min(100, (q.count / (queries[0]?.count || 1)) * 100)}%` }} />
                </div>
                <button onClick={() => deleteMut.mutate(q.id)}
                  className="p-1.5 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function AdminChatbot() {
  const qc = useQueryClient();
  const search = useSearch();
  const defaultTab = new URLSearchParams(search).get("tab") ?? "settings";

  const { data: settings, isLoading } = useQuery<SiteSettings>({
    queryKey: ["admin-site-settings"],
    queryFn: api.settings.adminList,
    staleTime: 10_000,
  });

  const [enabled, setEnabled] = useState(true);
  const [botName, setBotName] = useState("");
  const [welcome, setWelcome] = useState("");
  const [quickReplies, setQuickReplies] = useState<string[]>([]);
  const [newReply, setNewReply] = useState("");
  const [previewOpen, setPreviewOpen] = useState(true);
  const [whatsapp, setWhatsapp] = useState("");
  const [fallbackMsg, setFallbackMsg] = useState("");
  const [workingHours, setWorkingHours] = useState("");

  // ── AI model state ──────────────────────────────────────────────────────────
  const [aiEnabled, setAiEnabled] = useState(false);
  const [aiProvider, setAiProvider] = useState("openai");
  const [aiApiKey, setAiApiKey] = useState("");
  const [aiModel, setAiModel] = useState("gpt-4o-mini");
  const [aiBaseUrl, setAiBaseUrl] = useState("");
  const [aiSystemPrompt, setAiSystemPrompt] = useState("");
  const [aiTemperature, setAiTemperature] = useState("0.7");
  const [showApiKey, setShowApiKey] = useState(false);
  const [showSysPrompt, setShowSysPrompt] = useState(false);

  useEffect(() => {
    if (!settings) return;
    const s = settings as any;
    setEnabled(s.chatbotEnabled !== "false");
    setBotName(s.chatbotBotName ?? "");
    setWelcome(s.chatbotWelcomeMessage ?? "");
    setWhatsapp(s.chatbotWhatsapp ?? "");
    setFallbackMsg(s.chatbotFallbackMsg ?? "");
    setWorkingHours(s.chatbotWorkingHours ?? "");
    setAiEnabled(s.chatbotAiEnabled === "true");
    setAiProvider(s.chatbotAiProvider || "openai");
    setAiApiKey(s.chatbotAiApiKey || "");
    setAiModel(s.chatbotAiModel || "gpt-4o-mini");
    setAiBaseUrl(s.chatbotAiBaseUrl || "");
    setAiSystemPrompt(s.chatbotAiSystemPrompt || "");
    setAiTemperature(s.chatbotAiTemperature || "0.7");
    try {
      const parsed = JSON.parse(s.chatbotQuickReplies ?? "[]");
      setQuickReplies(Array.isArray(parsed) ? parsed : DEFAULT_QUICK_REPLIES);
    } catch { setQuickReplies(DEFAULT_QUICK_REPLIES); }
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: () => api.settings.save({
      chatbotEnabled: enabled ? "true" : "false",
      chatbotBotName: botName || DEFAULT_BOT_NAME,
      chatbotWelcomeMessage: welcome || DEFAULT_WELCOME,
      chatbotQuickReplies: JSON.stringify(quickReplies),
      chatbotWhatsapp: whatsapp.trim(),
      chatbotFallbackMsg: fallbackMsg.trim(),
      chatbotWorkingHours: workingHours.trim(),
      chatbotAiEnabled: aiEnabled ? "true" : "false",
      chatbotAiProvider: aiProvider,
      chatbotAiApiKey: aiApiKey.trim(),
      chatbotAiModel: aiModel.trim(),
      chatbotAiBaseUrl: aiBaseUrl.trim(),
      chatbotAiSystemPrompt: aiSystemPrompt.trim(),
      chatbotAiTemperature: aiTemperature,
    }),
    onSuccess: () => { toast.success("تم حفظ إعدادات المساعد الذكي ✓"); qc.invalidateQueries({ queryKey: ["admin-site-settings"] }); qc.invalidateQueries({ queryKey: ["site-settings"] }); },
    onError: () => toast.error("فشل الحفظ، حاول مرة أخرى"),
  });

  const addQuickReply = () => {
    const v = newReply.trim();
    if (!v || quickReplies.includes(v)) return;
    if (quickReplies.length >= 8) { toast.error("الحد الأقصى ٨ أزرار سريعة"); return; }
    setQuickReplies(prev => [...prev, v]);
    setNewReply("");
  };

  if (isLoading) return (
    <AdminLayout title="إدارة المساعد الذكي">
      <div className="flex items-center justify-center min-h-64"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>
    </AdminLayout>
  );

  return (
    <AdminLayout title="إدارة المساعد الذكي">
      <div className="space-y-6" dir="rtl">
        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-primary/10 rounded-2xl flex items-center justify-center">
            <Bot className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">المساعد الذكي (AI Chatbot)</h1>
            <p className="text-sm text-gray-500">تحكم كامل في المساعد، متابعة العملاء، وتحليل الأداء</p>
          </div>
        </div>

        <Tabs defaultValue={defaultTab}>
          <TabsList className="grid grid-cols-5 w-full max-w-2xl">
            <TabsTrigger value="settings" className="text-xs gap-1"><Settings2 className="w-3.5 h-3.5" />الإعدادات</TabsTrigger>
            <TabsTrigger value="analytics" className="text-xs gap-1"><BarChart3 className="w-3.5 h-3.5" />الإحصائيات</TabsTrigger>
            <TabsTrigger value="leads" className="text-xs gap-1"><Users className="w-3.5 h-3.5" />العملاء</TabsTrigger>
            <TabsTrigger value="conversations" className="text-xs gap-1"><MessageSquare className="w-3.5 h-3.5" />المحادثات</TabsTrigger>
            <TabsTrigger value="queries" className="text-xs gap-1"><Flame className="w-3.5 h-3.5" />الاستفسارات</TabsTrigger>
          </TabsList>

          {/* ── SETTINGS TAB ── */}
          <TabsContent value="settings" className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <div />
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setPreviewOpen(o => !o)} className="gap-1.5">
                  {previewOpen ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {previewOpen ? "إخفاء المعاينة" : "معاينة"}
                </Button>
                <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} className="gap-2">
                  {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  حفظ الإعدادات
                </Button>
              </div>
            </div>
            <div className={`grid gap-6 ${previewOpen ? "grid-cols-1 xl:grid-cols-5" : "grid-cols-1 max-w-3xl"}`}>
              <div className="xl:col-span-3 space-y-5">
                {/* Enable toggle */}
                <Card className="border-2 border-dashed border-gray-200">
                  <CardContent className="pt-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${enabled ? "bg-green-100" : "bg-red-100"}`}>
                          {enabled ? <ToggleRight className="w-5 h-5 text-green-600" /> : <ToggleLeft className="w-5 h-5 text-red-500" />}
                        </div>
                        <div>
                          <p className="font-bold text-gray-900">تشغيل / إيقاف المساعد</p>
                          <p className="text-sm text-gray-500">{enabled ? "ظاهر للزوار على كل صفحات الموقع" : "مخفي ولن يظهر للزوار"}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={enabled ? "default" : "secondary"} className={enabled ? "bg-green-500 text-white" : ""}>{enabled ? "مفعّل" : "معطّل"}</Badge>
                        <Switch checked={enabled} onCheckedChange={setEnabled} className="data-[state=checked]:bg-green-500" />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Bot name */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2"><Settings2 className="w-4 h-4 text-primary" />هوية المساعد</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Label className="text-sm font-semibold text-gray-700 mb-1.5 block">اسم المساعد</Label>
                    <Input value={botName} onChange={e => setBotName(e.target.value)} placeholder={DEFAULT_BOT_NAME} dir="rtl" className="text-sm" />
                  </CardContent>
                </Card>

                {/* Welcome message */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2"><MessageCircle className="w-4 h-4 text-primary" />رسالة الترحيب</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Textarea value={welcome} onChange={e => setWelcome(e.target.value)} placeholder={DEFAULT_WELCOME} dir="rtl" rows={4} className="text-sm resize-none" />
                    <p className="text-xs text-gray-400 mt-1">{welcome.length} حرف</p>
                  </CardContent>
                </Card>

                {/* Quick replies */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2"><Zap className="w-4 h-4 text-primary" />الأزرار السريعة</CardTitle>
                    <CardDescription>الحد الأقصى ٨ أزرار</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex flex-wrap gap-2">
                      {quickReplies.map((qr, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-primary/8 border border-primary/20 text-primary rounded-full px-3 py-1.5 text-sm font-semibold">
                          <span>{qr}</span>
                          <button onClick={() => setQuickReplies(prev => prev.filter((_, idx) => idx !== i))} className="text-primary/50 hover:text-red-500"><X className="w-3.5 h-3.5" /></button>
                        </div>
                      ))}
                      {quickReplies.length === 0 && <p className="text-sm text-gray-400 italic">أضف أزرار سريعة أدناه</p>}
                    </div>
                    {quickReplies.length < 8 && (
                      <div className="flex items-center gap-2">
                        <Input value={newReply} onChange={e => setNewReply(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); addQuickReply(); } }}
                          placeholder='مثال: "شقة ٣ غرف للإيجار"' dir="rtl" className="flex-1 text-sm" />
                        <Button variant="outline" size="sm" onClick={addQuickReply} disabled={!newReply.trim()} className="gap-1.5 shrink-0">
                          <Plus className="w-4 h-4" />إضافة
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* WhatsApp */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2"><Phone className="w-4 h-4 text-green-600" />رقم واتساب للتواصل</CardTitle>
                    <CardDescription>يُستخدم في زر "تحدث مع مستشار" داخل المساعد الذكي</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Input value={whatsapp} onChange={e => setWhatsapp(e.target.value)}
                      placeholder="مثال: 201012345678" dir="ltr" className="text-sm text-left" />
                    <p className="text-xs text-gray-400 mt-1">أدخل الرقم بصيغة دولية بدون + (مثال: 201012345678)</p>
                  </CardContent>
                </Card>

                {/* Fallback Message */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2"><MessageCircle className="w-4 h-4 text-orange-500" />رسالة عدم العثور على نتائج</CardTitle>
                    <CardDescription>تظهر عندما لا يجد المساعد عقارات مطابقة</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Textarea value={fallbackMsg} onChange={e => setFallbackMsg(e.target.value)}
                      placeholder="معنديش نتائج مطابقة تماماً، بس هحاول أعرضلك أقرب الخيارات." dir="rtl" rows={2} className="text-sm resize-none" />
                  </CardContent>
                </Card>

                {/* Working Hours */}
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4 text-blue-500" />نص ساعات العمل</CardTitle>
                    <CardDescription>يظهر في ترويسة المساعد تحت اسمه</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Input value={workingHours} onChange={e => setWorkingHours(e.target.value)}
                      placeholder="مثال: متاح الآن • مساعد ذكي 24/7" dir="rtl" className="text-sm" />
                  </CardContent>
                </Card>

                <div className="flex justify-end">
                  <Button onClick={() => saveMut.mutate()} disabled={saveMut.isPending} size="lg" className="gap-2 px-8">
                    {saveMut.isPending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                    حفظ كل الإعدادات
                  </Button>
                </div>
              </div>

              {/* Preview */}
              {previewOpen && (
                <div className="xl:col-span-2">
                  <div className="sticky top-20">
                    <Card className="overflow-hidden shadow-lg">
                      <CardHeader className="pb-2 border-b">
                        <CardTitle className="text-sm flex items-center gap-2"><Eye className="w-4 h-4 text-primary" />معاينة مباشرة</CardTitle>
                      </CardHeader>
                      <CardContent className="p-0 h-[500px]">
                        <ChatPreview botName={botName} welcome={welcome} quickReplies={quickReplies} enabled={enabled} />
                      </CardContent>
                    </Card>
                    <div className="mt-4 grid grid-cols-3 gap-2">
                      {[
                        { label: "أزرار سريعة", value: `${quickReplies.length}/8` },
                        { label: "طول الرسالة", value: (welcome || DEFAULT_WELCOME).length },
                        { label: "الحالة", value: enabled ? "✓ مفعّل" : "✗ موقف" },
                      ].map(s => (
                        <div key={s.label} className="bg-white rounded-xl border p-2.5 text-center">
                          <p className="text-base font-bold text-gray-900">{s.value}</p>
                          <p className="text-[10px] text-gray-400">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* ── ANALYTICS TAB ── */}
          <TabsContent value="analytics" className="mt-6">
            <AnalyticsTab />
          </TabsContent>

          {/* ── LEADS TAB ── */}
          <TabsContent value="leads" className="mt-6">
            <LeadsTab />
          </TabsContent>

          {/* ── CONVERSATIONS TAB ── */}
          <TabsContent value="conversations" className="mt-6">
            <ConversationsTab />
          </TabsContent>

          {/* ── QUERIES TAB ── */}
          <TabsContent value="queries" className="mt-6">
            <QueriesTab />
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
}
