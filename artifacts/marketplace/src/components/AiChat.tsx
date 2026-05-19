import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  MessageCircle, X, Bot, User, BedDouble, Bath, Maximize2, MapPin,
  Sparkles, RefreshCw, Phone, Send, Loader2, Home, Building2, Trees,
  Star, TrendingUp, Zap, Search, ChevronRight, ArrowLeft, BarChart2,
  Clock, CheckCircle2, Layers,
} from "lucide-react";
import { api, type SiteSettings } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
type Property = {
  id: number; title: string; price: string; priceNum: number;
  image: string; gallery?: string[]; location: string;
  beds: number; baths: number; area: number;
  type: string; kind: string; featured: boolean;
  finishing?: string; floor?: number | null;
};

type ChatMessage = {
  id: string; role: "bot" | "user";
  text: string; properties?: Property[];
  time: Date; isWizard?: boolean; intent?: any;
  suggestions?: string[]; pendingQuestion?: string;
  showLead?: boolean; searchUrl?: string;
};

type WizardStep = "type" | "category" | "location" | "budget" | "rooms" | "done";

const FALLBACK_IMG = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80";
const TYPE_LABELS: Record<string, string> = { sale: "للبيع", rent: "للإيجار" };
const DEFAULT_BOT_NAME = "مساعد عقارات بنها";
const DEFAULT_WELCOME = "أهلاً! أنا مساعدك الذكي 🏠\nأخبرني إيه اللي بتدور عليه.";
const DEFAULT_QUICK = ["شقة للبيع في بنها", "أرض للبيع", "شقة للإيجار", "أحدث العقارات"];

// ── Session ───────────────────────────────────────────────────────────────────
function getSessionId(): string {
  const key = "chat_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) { id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; sessionStorage.setItem(key, id); }
  return id;
}

function saveSession(sessionId: string, messages: ChatMessage[]) {
  fetch("/api/chat-sessions", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, messages: messages.map(m => ({ role: m.role, text: m.text, time: m.time, propertyCount: m.properties?.length ?? 0 })), metadata: {} }),
  }).catch(() => {});
}

async function submitLead(data: { sessionId: string; name?: string; phone?: string; whatsapp?: string; propertyId?: number; propertyTitle?: string }) {
  try { await fetch("/api/chat-leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); } catch {}
}

// ── Markdown renderer ─────────────────────────────────────────────────────────
function parseBold(text: string, keyPrefix: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /\*\*([^*]+)\*\*/g;
  let last = 0, m: RegExpExecArray | null;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index));
    parts.push(<strong key={`${keyPrefix}-b${m.index}`} className="font-bold text-gray-900">{m[1]}</strong>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

function renderMarkdown(text: string): React.ReactNode {
  const lines = text.split("\n");
  return (
    <span className="block space-y-0.5">
      {lines.map((line, li) => {
        const trimmed = line.trim();
        // Italic note lines like _(text)_
        if (trimmed.startsWith("_(") && trimmed.endsWith(")_")) {
          const inner = trimmed.slice(2, -2);
          return (
            <span key={li} className="block text-[11px] text-gray-400 mt-1 italic">
              {inner}
            </span>
          );
        }
        // Bullet point lines starting with •
        if (trimmed.startsWith("•")) {
          const content = trimmed.slice(1).trim();
          return (
            <span key={li} className="flex items-start gap-1.5 text-sm leading-snug">
              <span className="text-primary mt-0.5 shrink-0 text-xs">•</span>
              <span>{parseBold(content, `${li}`)}</span>
            </span>
          );
        }
        // Empty line → small spacer
        if (!trimmed) {
          return <span key={li} className="block h-1" />;
        }
        // Normal line
        return (
          <span key={li} className="block leading-relaxed">
            {parseBold(line, `${li}`)}
          </span>
        );
      })}
    </span>
  );
}

// ── Property Card ─────────────────────────────────────────────────────────────
function PropertyCard({ p, onContact }: { p: Property; onContact: (p: Property) => void }) {
  const [, setLocation] = useLocation();
  const img = p.image ? (p.image.startsWith("http") ? p.image : `/api-server${p.image}`) : FALLBACK_IMG;
  const typeLabel = TYPE_LABELS[p.type] ?? p.type;
  const typeColor = p.type === "sale" || typeLabel === "للبيع" ? "bg-emerald-500" : "bg-blue-500";

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:border-primary/20 transition-all group w-[200px] shrink-0"
    >
      {/* Image */}
      <div className="relative h-[110px] cursor-pointer overflow-hidden" onClick={() => setLocation(`/property/${p.id}`)}>
        <img src={img} alt={p.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          onError={e => { e.currentTarget.src = FALLBACK_IMG; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
        {/* Badges */}
        <div className="absolute top-2 right-2 flex gap-1">
          {p.featured && <span className="text-[9px] font-bold bg-amber-400 text-amber-900 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-amber-900" />مميز</span>}
          {typeLabel && <span className={`text-[9px] font-bold ${typeColor} text-white px-1.5 py-0.5 rounded-full`}>{typeLabel}</span>}
        </div>
        {p.kind && <div className="absolute bottom-2 right-2 text-[10px] font-semibold text-white/90 drop-shadow">{p.kind}</div>}
      </div>

      {/* Body */}
      <div className="p-2.5">
        <p className="text-xs font-bold text-gray-900 line-clamp-1 mb-0.5 cursor-pointer hover:text-primary transition-colors leading-tight" onClick={() => setLocation(`/property/${p.id}`)}>{p.title}</p>
        <p className="text-sm font-extrabold text-gray-900 mb-1.5 leading-none">{p.price}</p>

        {/* Stats row */}
        <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-2 flex-wrap">
          {p.beds > 0 && <span className="flex items-center gap-0.5"><BedDouble className="w-3 h-3" />{p.beds}</span>}
          {p.baths > 0 && <span className="flex items-center gap-0.5"><Bath className="w-3 h-3" />{p.baths}</span>}
          {p.area > 0 && <span className="flex items-center gap-0.5"><Maximize2 className="w-3 h-3" />{p.area}م²</span>}
        </div>
        {p.location && (
          <div className="flex items-center gap-0.5 text-[10px] text-gray-400 mb-2 truncate">
            <MapPin className="w-3 h-3 shrink-0 text-primary/60" /><span className="truncate">{p.location}</span>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-1.5">
          <button onClick={() => setLocation(`/property/${p.id}`)}
            className="flex-1 text-[10px] font-bold bg-primary/10 text-primary rounded-xl py-1.5 hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-0.5">
            <ChevronRight className="w-3 h-3" />تفاصيل
          </button>
          <button onClick={() => onContact(p)}
            className="px-2 text-[10px] font-bold bg-emerald-500/10 text-emerald-600 rounded-xl py-1.5 hover:bg-emerald-500 hover:text-white transition-all">
            تواصل
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ── Suggested property (compact row) ─────────────────────────────────────────
function MiniPropertyCard({ p }: { p: Property }) {
  const [, setLocation] = useLocation();
  const img = p.image ? (p.image.startsWith("http") ? p.image : `/api-server${p.image}`) : FALLBACK_IMG;
  return (
    <button onClick={() => setLocation(`/property/${p.id}`)}
      className="flex items-center gap-2.5 bg-white hover:bg-primary/5 border border-gray-100 hover:border-primary/20 rounded-2xl p-2 transition-all text-right w-full group">
      <img src={img} alt={p.title} className="w-11 h-11 rounded-xl object-cover shrink-0 group-hover:scale-105 transition-transform" onError={e => { e.currentTarget.src = FALLBACK_IMG; }} />
      <div className="flex-1 min-w-0 text-right">
        <p className="text-xs font-bold text-gray-900 line-clamp-1 group-hover:text-primary transition-colors">{p.title}</p>
        <p className="text-[11px] font-extrabold text-gray-900">{p.price}</p>
        {p.location && <p className="text-[10px] text-gray-400 truncate">{p.location}</p>}
      </div>
      <ArrowLeft className="w-3.5 h-3.5 text-gray-300 group-hover:text-primary transition-colors shrink-0" />
    </button>
  );
}

// ── Typing dots ───────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center shrink-0 shadow-sm">
        <Bot className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="w-1.5 h-1.5 bg-primary/60 rounded-full"
              animate={{ y: ["0%", "-60%", "0%"] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.16, ease: "easeInOut" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Lead Form ─────────────────────────────────────────────────────────────────
function LeadForm({ property, sessionId, onClose, onSuccess }: { property?: Property; sessionId: string; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    await submitLead({ sessionId, name: name.trim(), phone: phone.trim(), whatsapp: phone.trim(), propertyId: property?.id, propertyTitle: property?.title });
    setLoading(false);
    onSuccess();
  };

  return (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
      className="bg-gradient-to-br from-primary/5 to-teal-50 rounded-2xl rounded-bl-sm p-3.5 shadow-sm border border-primary/15 space-y-2.5">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0"><Phone className="w-4 h-4 text-primary" /></div>
        <div>
          <p className="text-xs font-bold text-gray-900">{property ? `مهتم بـ: ${property.title}` : "اترك بياناتك — هنتواصل معاك! 📞"}</p>
          <p className="text-[10px] text-gray-500">فريقنا سيتواصل معك خلال ساعات قليلة</p>
        </div>
      </div>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="اسمك (اختياري)"
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white transition-all" dir="rtl" />
      <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="رقم التليفون / واتساب *"
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 bg-white transition-all"
        dir="rtl" type="tel" onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }} />
      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={!phone.trim() || loading}
          className="flex-1 bg-primary text-white rounded-xl py-2 text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 hover:bg-primary/90 transition-all shadow-sm">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}إرسال طلبي
        </button>
        <button onClick={onClose} className="px-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all">إلغاء</button>
      </div>
    </motion.div>
  );
}

// ── Wizard buttons ────────────────────────────────────────────────────────────
function WizardButtons({ options, onSelect }: { options: { label: string; value: string; icon?: React.ReactNode }[]; onSelect: (v: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {options.map((o, i) => (
        <motion.button key={o.value} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.04 }} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={() => onSelect(o.value)}
          className="flex items-center gap-1.5 bg-white border border-primary/25 text-primary text-xs font-bold rounded-full px-3 py-1.5 hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm">
          {o.icon}{o.label}
        </motion.button>
      ))}
    </div>
  );
}

// ── Autocomplete dropdown ─────────────────────────────────────────────────────
function AutocompleteDropdown({ suggestions, onSelect }: { suggestions: string[]; onSelect: (s: string) => void }) {
  if (!suggestions.length) return null;
  return (
    <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 4 }}
      className="absolute bottom-full mb-1 right-0 left-0 bg-white border border-gray-200 rounded-2xl shadow-lg overflow-hidden z-10">
      {suggestions.map((s, i) => (
        <button key={i} onClick={() => onSelect(s)}
          className="w-full text-right px-3.5 py-2.5 text-sm text-gray-700 hover:bg-primary/8 hover:text-primary transition-colors flex items-center gap-2 border-b border-gray-50 last:border-0">
          <Search className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          <span className="flex-1 truncate">{s}</span>
        </button>
      ))}
    </motion.div>
  );
}

// ── Trending panel ────────────────────────────────────────────────────────────
function TrendingPanel({ onQuery, trending }: { onQuery: (q: string) => void; trending: { popularQueries: string[]; featuredProperties: Property[] } }) {
  return (
    <div className="space-y-3">
      {/* Quick category buttons */}
      <div>
        <p className="text-[11px] font-bold text-gray-500 mb-2 flex items-center gap-1">
          <Zap className="w-3 h-3 text-primary" />ابحث بسرعة:
        </p>
        <div className="grid grid-cols-2 gap-1.5">
          {[
            { label: "شقق للبيع", q: "شقة للبيع في بنها", icon: <Home className="w-3.5 h-3.5" /> },
            { label: "شقق للإيجار", q: "شقة للإيجار", icon: <Building2 className="w-3.5 h-3.5" /> },
            { label: "أراضي", q: "أرض للبيع", icon: <Trees className="w-3.5 h-3.5" /> },
            { label: "أحدث العقارات", q: "أحدث العقارات", icon: <Clock className="w-3.5 h-3.5" /> },
            { label: "إحصائيات", q: "إحصائيات السوق", icon: <BarChart2 className="w-3.5 h-3.5" /> },
            { label: "الأرخص", q: "أرخص العقارات", icon: <Star className="w-3.5 h-3.5" /> },
          ].map(({ label, q, icon }) => (
            <button key={label} onClick={() => onQuery(q)}
              className="flex items-center gap-1.5 bg-white border border-gray-100 hover:border-primary/30 hover:bg-primary/5 text-gray-700 hover:text-primary text-[11px] font-semibold rounded-xl px-2.5 py-2 transition-all">
              <span className="text-primary/70">{icon}</span>{label}
            </button>
          ))}
        </div>
      </div>

      {/* Popular queries */}
      {trending.popularQueries.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5"><TrendingUp className="w-3.5 h-3.5 text-primary" /><span className="text-[11px] font-bold text-gray-700">الأكثر بحثاً</span></div>
          <div className="flex flex-wrap gap-1.5">
            {trending.popularQueries.slice(0, 5).map((q, i) => (
              <button key={i} onClick={() => onQuery(q)}
                className="text-[11px] bg-primary/8 text-primary border border-primary/15 rounded-full px-2.5 py-1 font-semibold hover:bg-primary hover:text-white transition-all">{q}</button>
            ))}
          </div>
        </div>
      )}

      {/* Featured properties */}
      {trending.featuredProperties.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-1.5"><Star className="w-3.5 h-3.5 text-amber-500" /><span className="text-[11px] font-bold text-gray-700">عقارات مميزة</span></div>
          <div className="space-y-1.5">
            {trending.featuredProperties.map(p => <MiniPropertyCard key={p.id} p={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main AiChat component ─────────────────────────────────────────────────────
export default function AiChat() {
  const { data: settings } = useQuery<SiteSettings>({ queryKey: ["site-settings"], queryFn: api.settings.list, staleTime: 60_000 });
  const { data: trending } = useQuery<{ popularQueries: string[]; featuredProperties: Property[] }>({
    queryKey: ["chatbot-trending"],
    queryFn: () => fetch("/api/chatbot-trending").then(r => r.json()),
    staleTime: 120_000,
  });

  const s = settings as any;
  const chatEnabled = s?.chatbotEnabled !== "false";
  const botName = s?.chatbotBotName || DEFAULT_BOT_NAME;
  const welcomeText = s?.chatbotWelcomeMessage || DEFAULT_WELCOME;
  const quickReplies: string[] = (() => {
    try { const p = JSON.parse(s?.chatbotQuickReplies ?? "[]"); return Array.isArray(p) && p.length > 0 ? p : DEFAULT_QUICK; }
    catch { return DEFAULT_QUICK; }
  })();

  const sessionId = useRef(getSessionId()).current;
  const welcomeMsg: ChatMessage = { id: "welcome", role: "bot", text: welcomeText, time: new Date(), suggestions: quickReplies };

  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([welcomeMsg]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const [leadProperty, setLeadProperty] = useState<Property | undefined>();
  const [showLead, setShowLead] = useState(false);
  const [leadDone, setLeadDone] = useState(false);
  const [wizardStep, setWizardStep] = useState<WizardStep | null>(null);
  const [wizardData, setWizardData] = useState<Record<string, string>>({});
  const [autocomplete, setAutocomplete] = useState<string[]>([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [hasBounced, setHasBounced] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const acTimer = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => { const t = setTimeout(() => setHasBounced(true), 3500); return () => clearTimeout(t); }, []);
  useEffect(() => { setMessages(prev => prev.length === 1 && prev[0].id === "welcome" ? [{ ...prev[0], text: welcomeText, suggestions: quickReplies }] : prev); }, [welcomeText]);
  useEffect(() => { if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 300); } }, [open]);
  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  }, [messages, open, showLead, loading]);

  const addBotMsg = useCallback((text: string, extra?: Partial<ChatMessage>) => {
    const msg: ChatMessage = { id: Date.now().toString(), role: "bot", text, time: new Date(), ...extra };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, []);

  const fetchAutocomplete = useCallback((q: string) => {
    if (acTimer.current) clearTimeout(acTimer.current);
    if (!q || q.length < 2) { setAutocomplete([]); setShowAutocomplete(false); return; }
    acTimer.current = setTimeout(async () => {
      try {
        const data = await fetch(`/api/ai-autocomplete?q=${encodeURIComponent(q)}`).then(r => r.json());
        if (Array.isArray(data) && data.length > 0) { setAutocomplete(data); setShowAutocomplete(true); }
        else setShowAutocomplete(false);
      } catch { setShowAutocomplete(false); }
    }, 250);
  }, []);

  const startWizard = () => {
    setWizardStep("type"); setWizardData({});
    addBotMsg("هساعدك تلاقي العقار المناسب! 🧭\n\nبتدور على عقار للشراء أم للإيجار؟", { isWizard: true });
  };

  const handleWizardSelect = async (value: string) => {
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", text: value, time: new Date() }]);
    const newData = { ...wizardData, [wizardStep!]: value };
    setWizardData(newData);
    const nextMap: Record<WizardStep, WizardStep | null> = { type: "category", category: "location", location: "budget", budget: "rooms", rooms: "done", done: null };
    const prompts: Partial<Record<WizardStep, string>> = {
      category: "ممتاز! في أي منطقة تبحث؟ 📍", location: "ما هي ميزانيتك التقريبية؟ 💰",
      budget: "كم عدد الغرف المطلوبة؟ 🛏️", rooms: "جاري البحث عن أفضل الخيارات...",
    };
    const next = nextMap[wizardStep!];
    if (!next || next === "done") {
      setWizardStep(null);
      const typeLabel = newData.type === "sale" ? "للبيع" : "للإيجار";
      const parts = [typeLabel, newData.category, newData.location !== "أي منطقة" ? `في ${newData.location}` : "", newData.budget !== "أي ميزانية" ? newData.budget : "", newData.rooms !== "أي عدد" ? newData.rooms : ""].filter(Boolean).join(" ");
      await doSearch(parts, newData);
    } else {
      setWizardStep(next);
      setTimeout(() => addBotMsg(prompts[next] ?? "تمام!", { isWizard: true }), 350);
    }
  };

  const doSearch = async (text: string, meta?: Record<string, string>) => {
    setLoading(true); setWizardStep(null); setShowAutocomplete(false);
    try {
      const historyForApi = messages.slice(-8).map(m => ({ role: m.role, text: m.text, intent: m.intent, pendingQuestion: m.pendingQuestion }));
      const data = await fetch("/api/ai-chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: historyForApi }),
      }).then(r => r.json());

      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(), role: "bot",
        text: data.reply || "جرّب بطريقة مختلفة.",
        properties: data.properties ?? [],
        time: new Date(), intent: data.intent,
        suggestions: data.suggestions ?? [],
        pendingQuestion: data.pendingQuestion,
        showLead: data.showLead,
        searchUrl: data.searchUrl,
      };
      setMessages(prev => [...prev, botMsg]);
      if (!open) setUnread(n => n + 1);
      saveSession(sessionId, [...messages, botMsg]);

      // Auto show lead form if requested
      if (data.showLead) { setLeadProperty(undefined); setShowLead(true); }

    } catch { addBotMsg("معنديش اتصال. جرب بعد ثانية. 😅"); }
    finally { setLoading(false); }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", text: text.trim(), time: new Date() }]);
    setInput(""); setShowAutocomplete(false);
    await doSearch(text.trim());
  };

  const reset = () => {
    setMessages([{ ...welcomeMsg, text: welcomeText, suggestions: quickReplies }]);
    setInput(""); setWizardStep(null); setWizardData({});
    setShowLead(false); setLeadDone(false); setShowAutocomplete(false);
  };

  const openWhatsApp = (property?: Property) => {
    const msg = property
      ? `مرحباً، أنا مهتم بعقار: ${property.title} — ${property.price}. رابط: ${window.location.origin}/property/${property.id}`
      : `مرحباً، أريد الاستفسار عن عقارات في بنها.`;
    const wa = (s?.chatbotWhatsapp || s?.contactWhatsapp || s?.contactPhone || "").replace(/\D/g, "");
    window.open(`https://wa.me/${wa || "201000000000"}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const wizardOptions: Record<WizardStep, { label: string; value: string; icon?: React.ReactNode }[]> = {
    type: [{ label: "شراء 🏠", value: "sale" }, { label: "إيجار 🔑", value: "rent" }],
    category: [
      { label: "شقة", value: "شقة", icon: <Building2 className="w-3.5 h-3.5" /> },
      { label: "فيلا", value: "فيلا", icon: <Home className="w-3.5 h-3.5" /> },
      { label: "أرض", value: "أرض", icon: <Trees className="w-3.5 h-3.5" /> },
      { label: "دوبلكس", value: "دوبلكس" }, { label: "روف", value: "روف" },
      { label: "محل تجاري", value: "محل" }, { label: "مكتب", value: "مكتب" },
    ],
    location: [
      { label: "بنها", value: "بنها" }, { label: "القناطر", value: "القناطر الخيرية" },
      { label: "الخانكة", value: "الخانكة" }, { label: "قليوب", value: "قليوب" },
      { label: "طوخ", value: "طوخ" }, { label: "العبور", value: "العبور" },
      { label: "أي منطقة", value: "أي منطقة" },
    ],
    budget: [
      { label: "أقل من ٥٠٠ ألف", value: "أقل من 500000" },
      { label: "٥٠٠ ألف – مليون", value: "من 500000 الى 1000000" },
      { label: "١ – ٢ مليون", value: "من 1000000 الى 2000000" },
      { label: "أكثر من ٢ مليون", value: "أكثر من 2000000" },
      { label: "أي ميزانية", value: "أي ميزانية" },
    ],
    rooms: [
      { label: "١ غرفة", value: "1 غرف" }, { label: "٢ غرفة", value: "2 غرف" },
      { label: "٣ غرف", value: "3 غرف" }, { label: "٤+ غرف", value: "4 غرف" },
      { label: "أي عدد", value: "أي عدد" },
    ],
    done: [],
  };

  const isInitial = messages.length <= 1;
  const hasTrending = trending && (trending.popularQueries?.length > 0 || trending.featuredProperties?.length > 0);

  if (settings !== undefined && !chatEnabled) return null;

  return (
    <>
      {/* ── FAB ── */}
      <motion.div className="fixed z-50 bottom-6 left-6"
        animate={hasBounced && !open ? { y: [0, -10, 0, -6, 0], transition: { duration: 1.2, repeat: 2, repeatDelay: 12 } } : {}}>
        <motion.button
          className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary to-teal-600 text-white shadow-2xl flex items-center justify-center overflow-visible"
          style={{ boxShadow: "0 8px 32px rgba(13,148,136,0.5)" }}
          whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.92 }}
          onClick={() => setOpen(o => !o)} aria-label="مساعد ذكي">
          {!open && (
            <motion.span className="absolute inset-0 rounded-full bg-primary/30"
              animate={{ scale: [1, 1.8], opacity: [0.5, 0] }}
              transition={{ duration: 2.5, repeat: Infinity, ease: "easeOut" }} />
          )}
          <AnimatePresence mode="wait">
            {open ? (
              <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
                <X className="w-6 h-6" />
              </motion.div>
            ) : (
              <motion.div key="chat" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="relative">
                <MessageCircle className="w-6 h-6" />
                {unread > 0 && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                    className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-sm">
                    {unread}
                  </motion.span>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>

      {/* ── Chat Window ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 32, scale: 0.9 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 32, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed z-50 bottom-24 left-4 w-[400px] max-w-[calc(100vw-2rem)] bg-[#f4f6f9] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/60"
            style={{ maxHeight: "calc(100vh - 130px)", height: "640px", boxShadow: "0 24px 80px rgba(0,0,0,0.22)" }}
            dir="rtl">

            {/* Header */}
            <div className="bg-gradient-to-l from-primary via-teal-600 to-primary/90 px-4 py-3.5 flex items-center gap-3 shrink-0">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/25 shadow-sm">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <motion.span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white shadow"
                  animate={{ scale: [1, 1.25, 1] }} transition={{ duration: 2.5, repeat: Infinity }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-white leading-tight truncate">{botName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <p className="text-[10px] text-white/75">مساعد ذكي • متاح 24/7</p>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button onClick={reset} className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-colors" title="محادثة جديدة">
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => openWhatsApp()} className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-colors" title="واتساب">
                  <Phone className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setOpen(false)} className="p-2 rounded-xl bg-white/10 hover:bg-white/25 text-white transition-colors">
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scroll-smooth">
              {messages.map((msg, idx) => (
                <div key={msg.id}>
                  {msg.role === "bot" ? (
                    /* ── Bot message ── */
                    <div className="flex items-end gap-2 mb-3">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center shrink-0 shadow-sm">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        {/* Text bubble */}
                        <div className="bg-white rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm border border-gray-100/80 text-sm text-gray-800 leading-relaxed">
                          {renderMarkdown(msg.text)}
                        </div>

                        {/* Wizard buttons */}
                        {msg.isWizard && wizardStep && wizardStep !== "done" && idx === messages.length - 1 && (
                          <WizardButtons options={wizardOptions[wizardStep]} onSelect={handleWizardSelect} />
                        )}

                        {/* Pending question highlight */}
                        {msg.pendingQuestion && (
                          <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                            className="mt-2 bg-primary/8 border border-primary/20 rounded-2xl rounded-bl-sm px-3 py-2 text-xs text-primary font-semibold flex items-start gap-1.5">
                            <span className="shrink-0">💬</span>
                            <div>{renderMarkdown(msg.pendingQuestion)}</div>
                          </motion.div>
                        )}

                        {/* Properties — horizontal scroll */}
                        {msg.properties && msg.properties.length > 0 && (
                          <div className="mt-2">
                            <div className="flex items-center justify-between mb-1.5">
                              <div className="flex items-center gap-1.5">
                                <Layers className="w-3 h-3 text-primary/70" />
                                <span className="text-[10px] font-bold text-gray-500">{msg.properties.length} عقار متاح</span>
                              </div>
                              {msg.searchUrl && (
                                <button
                                  onClick={() => { setOpen(false); setLocation(msg.searchUrl!); }}
                                  className="text-[10px] text-primary font-bold flex items-center gap-0.5 hover:underline"
                                >
                                  عرض الكل
                                  <ArrowLeft className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                            <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                              {msg.properties.map(p => (
                                <PropertyCard key={p.id} p={p} onContact={prop => { setLeadProperty(prop); setShowLead(true); }} />
                              ))}
                            </div>
                            {/* CTAs */}
                            <div className="flex gap-2 mt-2">
                              {msg.searchUrl && (
                                <button
                                  onClick={() => { setOpen(false); setLocation(msg.searchUrl!); }}
                                  className="flex-1 flex items-center justify-center gap-1.5 bg-primary/10 text-primary text-xs font-bold rounded-2xl py-2 hover:bg-primary/20 transition-all"
                                >
                                  <Layers className="w-3 h-3" />عرض جميع النتائج
                                </button>
                              )}
                              <button onClick={() => openWhatsApp()}
                                className="flex-1 flex items-center justify-center gap-1.5 bg-green-500 text-white text-xs font-bold rounded-2xl py-2 hover:bg-green-600 transition-all shadow-sm">
                                <Phone className="w-3.5 h-3.5" />واتساب
                              </button>
                            </div>
                          </div>
                        )}

                        {/* Suggestions */}
                        {msg.suggestions && msg.suggestions.length > 0 && idx === messages.length - 1 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {msg.suggestions.map((sg, si) => (
                              <motion.button key={si} initial={{ opacity: 0, scale: 0.88 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: si * 0.05 }}
                                onClick={() => sendMessage(sg)}
                                className="text-[11px] bg-white text-primary border border-primary/20 rounded-full px-2.5 py-1 font-semibold hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm">
                                {sg}
                              </motion.button>
                            ))}
                          </div>
                        )}

                        <p className="text-[10px] text-gray-400 mt-1 mr-1">
                          {msg.time.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ) : (
                    /* ── User message ── */
                    <div className="flex items-end justify-start gap-2 mb-3 flex-row-reverse">
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                        <User className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="max-w-[78%]">
                        <div className="bg-gradient-to-br from-primary to-teal-600 text-white rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm leading-relaxed shadow-sm">
                          {msg.text}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1 text-left ml-1">
                          {msg.time.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {loading && <TypingDots />}

              {/* Lead form */}
              {showLead && !leadDone && (
                <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="mt-2">
                  <LeadForm property={leadProperty} sessionId={sessionId} onClose={() => setShowLead(false)}
                    onSuccess={() => {
                      setShowLead(false); setLeadDone(true);
                      addBotMsg("تم إرسال طلبك بنجاح! ✅\nسيتواصل معك فريقنا قريباً. شكراً لثقتك بنا 🙏");
                    }} />
                </motion.div>
              )}

              {leadDone && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-2xl px-3 py-2 text-xs text-green-700 font-semibold mt-1">
                  <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />تم إرسال طلبك بنجاح!
                </motion.div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* Initial quick actions */}
            {isInitial && hasTrending && (
              <div className="px-3 pb-2 space-y-2 shrink-0 border-t border-gray-100/80 pt-2 bg-[#f4f6f9] max-h-52 overflow-y-auto">
                {/* Wizard CTA */}
                <button onClick={startWizard}
                  className="w-full text-xs bg-gradient-to-l from-primary to-teal-600 text-white font-bold rounded-2xl px-3 py-2.5 hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm">
                  <Zap className="w-3.5 h-3.5" />ابدأ البحث الموجّه خطوة بخطوة
                </button>
                <TrendingPanel trending={trending!} onQuery={sendMessage} />
              </div>
            )}

            {isInitial && !hasTrending && (
              <div className="px-3 pb-2 border-t border-gray-100/80 pt-2 bg-[#f4f6f9]">
                <button onClick={startWizard}
                  className="w-full text-xs bg-gradient-to-l from-primary to-teal-600 text-white font-bold rounded-2xl px-3 py-2.5 hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm mb-2">
                  <Zap className="w-3.5 h-3.5" />ابدأ البحث الموجّه خطوة بخطوة
                </button>
                <div className="flex flex-wrap gap-1.5">
                  {quickReplies.map((q, i) => (
                    <button key={i} onClick={() => sendMessage(q)}
                      className="text-[11px] bg-white border border-gray-200 text-gray-700 rounded-full px-2.5 py-1 font-semibold hover:bg-primary hover:text-white hover:border-primary transition-all">
                      {q}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input area */}
            <div className="px-3 pb-3 pt-2 border-t border-gray-100 bg-white/80 shrink-0">
              <div className="relative">
                <AnimatePresence>
                  {showAutocomplete && <AutocompleteDropdown suggestions={autocomplete} onSelect={v => { setInput(v); setShowAutocomplete(false); sendMessage(v); }} />}
                </AnimatePresence>
                <div className="flex items-center gap-2 bg-white rounded-2xl border border-gray-200 focus-within:border-primary/50 focus-within:shadow-sm transition-all pr-3 pl-1.5 py-1.5">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={e => { setInput(e.target.value); fetchAutocomplete(e.target.value); }}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } if (e.key === "Escape") setShowAutocomplete(false); }}
                    onFocus={() => { if (input.length >= 2) setShowAutocomplete(autocomplete.length > 0); }}
                    onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
                    placeholder="اكتب سؤالك... مثلاً: شقة 3 غرف في بنها"
                    className="flex-1 text-sm outline-none bg-transparent text-gray-800 placeholder-gray-400 text-right"
                    dir="rtl"
                    disabled={loading}
                  />
                  <motion.button
                    onClick={() => sendMessage(input)}
                    disabled={!input.trim() || loading}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.92 }}
                    className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-teal-600 text-white flex items-center justify-center disabled:opacity-40 disabled:cursor-not-allowed shadow-sm transition-all"
                  >
                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" style={{ transform: "scaleX(-1)" }} />}
                  </motion.button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
