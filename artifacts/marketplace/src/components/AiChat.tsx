import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  MessageCircle, X, Bot, User, BedDouble, Bath, Maximize2, MapPin,
  Sparkles, RefreshCw, Phone, Send, Loader2, Home, Building2, Trees,
  Star, TrendingUp, Zap, Search, ChevronRight,
} from "lucide-react";
import { api, type SiteSettings } from "@/lib/api";

type Property = {
  id: number; title: string; price: string; priceNum: number;
  image: string; location: string; beds: number; baths: number;
  area: number; type: string; kind: string; featured: boolean;
};

type ChatMessage = {
  id: string; role: "bot" | "user";
  text: string; followUp?: string;
  properties?: Property[]; time: Date;
  isWizard?: boolean;
  intent?: any;
  suggestions?: string[];
};

type WizardStep = "type" | "category" | "location" | "budget" | "rooms" | "area" | "done";

const FALLBACK_IMG = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80";
const TYPE_LABELS: Record<string, string> = { sale: "للبيع", rent: "للإيجار" };
const DEFAULT_BOT_NAME = "مساعد عقارات بنها";
const DEFAULT_WELCOME = "أهلاً! أنا مساعدك الذكي 🏠\nأخبرني إيه اللي بتدور عليه.";
const DEFAULT_QUICK_REPLIES = ["شقة للبيع في بنها", "أرض للبيع", "شقة للإيجار", "فيلا للبيع"];

function getSessionId(): string {
  const key = "chat_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) { id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`; sessionStorage.setItem(key, id); }
  return id;
}

function saveSession(sessionId: string, messages: ChatMessage[], meta: object) {
  fetch("/api/chat-sessions", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, messages: messages.map(m => ({ role: m.role, text: m.text, time: m.time, propertyCount: m.properties?.length ?? 0 })), metadata: meta }),
  }).catch(() => {});
}

async function submitLead(data: { sessionId: string; name?: string; phone?: string; whatsapp?: string; propertyId?: number; propertyTitle?: string; }) {
  try { await fetch("/api/chat-leads", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) }); } catch {}
}

function PropertyCard({ p, onContact }: { p: Property; onContact: (p: Property) => void }) {
  const [, setLocation] = useLocation();
  const img = p.image ? (p.image.startsWith("http") ? p.image : `/api-server${p.image}`) : FALLBACK_IMG;
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md transition-all group">
      <div className="relative cursor-pointer" onClick={() => setLocation(`/property/${p.id}`)}>
        <img src={img} alt={p.title} className="w-full h-28 object-cover group-hover:scale-105 transition-transform duration-300"
          onError={e => { e.currentTarget.src = FALLBACK_IMG; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
        <div className="absolute top-2 right-2 flex gap-1">
          {p.featured && <span className="text-[9px] font-bold bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full flex items-center gap-0.5"><Star className="w-2.5 h-2.5" />مميز</span>}
          {p.type && <span className="text-[9px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full">{TYPE_LABELS[p.type] ?? p.type}</span>}
        </div>
        {p.kind && <div className="absolute bottom-2 right-2 text-[10px] font-bold text-white/90 drop-shadow">{p.kind}</div>}
      </div>
      <div className="p-2.5">
        <p className="text-xs font-bold text-gray-900 line-clamp-1 mb-0.5 cursor-pointer hover:text-primary transition-colors" onClick={() => setLocation(`/property/${p.id}`)}>{p.title}</p>
        <p className="text-sm font-extrabold text-primary mb-1.5">{p.price}</p>
        <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-2.5 flex-wrap">
          {p.beds > 0 && <span className="flex items-center gap-0.5"><BedDouble className="w-3 h-3" />{p.beds}</span>}
          {p.baths > 0 && <span className="flex items-center gap-0.5"><Bath className="w-3 h-3" />{p.baths}</span>}
          {p.area > 0 && <span className="flex items-center gap-0.5"><Maximize2 className="w-3 h-3" />{p.area}م²</span>}
          {p.location && <span className="flex items-center gap-0.5 mr-auto truncate max-w-[70px]"><MapPin className="w-3 h-3 shrink-0 text-primary/60" />{p.location}</span>}
        </div>
        <div className="flex gap-1.5">
          <button onClick={() => setLocation(`/property/${p.id}`)}
            className="flex-1 text-[10px] font-bold bg-primary/8 text-primary rounded-xl py-1.5 hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-1">
            <ChevronRight className="w-3 h-3" />عرض التفاصيل
          </button>
          <button onClick={() => onContact(p)}
            className="px-2.5 text-[10px] font-bold bg-green-500/10 text-green-600 rounded-xl py-1.5 hover:bg-green-500 hover:text-white transition-all">
            تواصل
          </button>
        </div>
      </div>
    </motion.div>
  );
}

function SuggestedPropertyCard({ p }: { p: Property }) {
  const [, setLocation] = useLocation();
  const img = p.image ? (p.image.startsWith("http") ? p.image : `/api-server${p.image}`) : FALLBACK_IMG;
  return (
    <button onClick={() => setLocation(`/property/${p.id}`)}
      className="flex items-center gap-2.5 bg-white hover:bg-primary/5 border border-gray-100 hover:border-primary/20 rounded-2xl p-2 transition-all text-right w-full">
      <img src={img} alt={p.title} className="w-11 h-11 rounded-xl object-cover shrink-0" onError={e => { e.currentTarget.src = FALLBACK_IMG; }} />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold text-gray-900 line-clamp-1">{p.title}</p>
        <p className="text-[11px] font-extrabold text-primary">{p.price}</p>
        {p.location && <p className="text-[10px] text-gray-400 truncate">{p.location}</p>}
      </div>
    </button>
  );
}

function TypingDots() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center shrink-0 shadow-sm">
        <Bot className="w-3.5 h-3.5 text-white" />
      </div>
      <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="w-1.5 h-1.5 bg-primary rounded-full"
              animate={{ y: ["0%", "-60%", "0%"] }}
              transition={{ duration: 0.7, repeat: Infinity, delay: i * 0.14, ease: "easeInOut" }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function LeadForm({ property, sessionId, onClose, onSuccess }: { property?: Property; sessionId: string; onClose: () => void; onSuccess: () => void; }) {
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
      className="bg-gradient-to-br from-primary/5 to-teal-50 rounded-2xl rounded-bl-sm p-3.5 shadow-sm border border-primary/15 space-y-3">
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center"><Phone className="w-4 h-4 text-primary" /></div>
        <div>
          <p className="text-xs font-bold text-gray-900">{property ? `مهتم بـ: ${property.title}` : "اترك بياناتك وهنتواصل معاك!"}</p>
          <p className="text-[10px] text-gray-500">فريقنا سيتواصل معك خلال ساعات</p>
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

function WizardButtons({ options, onSelect }: { options: { label: string; value: string; icon?: React.ReactNode }[]; onSelect: (v: string) => void; }) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {options.map((o, i) => (
        <motion.button key={o.value} initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: i * 0.04 }} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
          onClick={() => onSelect(o.value)}
          className="flex items-center gap-1.5 bg-white border border-primary/20 text-primary text-xs font-bold rounded-full px-3 py-1.5 hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm">
          {o.icon}{o.label}
        </motion.button>
      ))}
    </div>
  );
}

function AutocompleteDropdown({ suggestions, onSelect }: { suggestions: string[]; onSelect: (s: string) => void; }) {
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

function TrendingPanel({ onQuery, trending }: { onQuery: (q: string) => void; trending: { popularQueries: string[]; featuredProperties: Property[] }; }) {
  return (
    <div className="space-y-3">
      {trending.popularQueries.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2"><TrendingUp className="w-3.5 h-3.5 text-primary" /><span className="text-[11px] font-bold text-gray-700">الأكثر بحثاً</span></div>
          <div className="flex flex-wrap gap-1.5">
            {trending.popularQueries.slice(0, 5).map((q, i) => (
              <button key={i} onClick={() => onQuery(q)}
                className="text-[11px] bg-primary/8 text-primary border border-primary/15 rounded-full px-2.5 py-1 font-semibold hover:bg-primary hover:text-white transition-all">{q}</button>
            ))}
          </div>
        </div>
      )}
      {trending.featuredProperties.length > 0 && (
        <div>
          <div className="flex items-center gap-1.5 mb-2"><Star className="w-3.5 h-3.5 text-yellow-500" /><span className="text-[11px] font-bold text-gray-700">عقارات مميزة</span></div>
          <div className="space-y-1.5">
            {trending.featuredProperties.map(p => <SuggestedPropertyCard key={p.id} p={p} />)}
          </div>
        </div>
      )}
    </div>
  );
}

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
    try { const p = JSON.parse(s?.chatbotQuickReplies ?? "[]"); return Array.isArray(p) && p.length > 0 ? p : DEFAULT_QUICK_REPLIES; }
    catch { return DEFAULT_QUICK_REPLIES; }
  })();

  const sessionId = useRef(getSessionId()).current;
  const welcomeMsg: ChatMessage = { id: "welcome", role: "bot", text: welcomeText, time: new Date() };

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
  useEffect(() => { setMessages(prev => prev.length === 1 && prev[0].id === "welcome" ? [{ ...prev[0], text: welcomeText }] : prev); }, [welcomeText]);
  useEffect(() => { if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 300); } }, [open]);
  useEffect(() => { if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, open, showLead]);

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
    const newData = { ...wizardData };
    const stepKey: Record<string, string> = { type: "type", category: "category", location: "location", budget: "budget", rooms: "rooms", area: "area" };
    const nextStepMap: Record<string, WizardStep> = { type: "category", category: "location", location: "budget", budget: "rooms", rooms: "area", area: "done" };
    const prompts: Record<string, string> = { category: "ممتاز! ما نوع العقار المطلوب؟", location: "في أي منطقة؟", budget: "ما هي ميزانيتك التقريبية؟", rooms: "كم عدد الغرف المطلوبة؟", area: "ما المساحة التقريبية؟" };

    newData[stepKey[wizardStep!]] = value;
    setWizardData(newData);
    const next = nextStepMap[wizardStep!];

    if (next === "done") {
      setWizardStep("done");
      const parts = [
        newData.type === "sale" ? "للبيع" : "للإيجار",
        newData.category,
        `في ${newData.location}`,
        newData.budget !== "أي ميزانية" ? newData.budget : "",
        newData.rooms !== "أي عدد" ? newData.rooms + " غرف" : "",
        newData.area !== "أي مساحة" ? newData.area : "",
      ].filter(Boolean).join(" ");
      await doSearch(parts, newData);
    } else {
      setWizardStep(next);
      setTimeout(() => addBotMsg(prompts[next], { isWizard: true }), 400);
    }
  };

  const doSearch = async (text: string, meta?: Record<string, string>) => {
    setLoading(true); setWizardStep(null); setShowAutocomplete(false);
    try {
      // Build history for multi-turn context (last 6 turns)
      const historyForApi = messages.slice(-6).map(m => ({
        role: m.role,
        text: m.text,
        intent: m.intent,
      }));
      const data = await fetch("/api/ai-chat", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, history: historyForApi }),
      }).then(r => r.json());
      const reply = data.reply || "جرّب بطريقة مختلفة.";
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(), role: "bot",
        text: reply, followUp: data.followUp,
        properties: data.properties ?? [], time: new Date(),
        intent: data.intent,
        suggestions: data.suggestions ?? [],
      };
      setMessages(prev => [...prev, botMsg]);
      if (!open) setUnread(n => n + 1);
      saveSession(sessionId, [...messages, botMsg], { lastIntent: data.intent, wizardData: meta });
    } catch { addBotMsg("معنديش اتصال. جرب بعد ثانية."); }
    finally { setLoading(false); }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setMessages(prev => [...prev, { id: Date.now().toString(), role: "user", text: text.trim(), time: new Date() }]);
    setInput(""); setShowAutocomplete(false);
    await doSearch(text.trim());
  };

  const reset = () => {
    setMessages([{ ...welcomeMsg, text: welcomeText }]);
    setInput(""); setWizardStep(null); setWizardData({});
    setShowLead(false); setLeadDone(false); setShowAutocomplete(false);
  };

  const openWhatsApp = (property?: Property) => {
    const msg = property ? `مرحباً، أنا مهتم بعقار: ${property.title} — ${property.price}. رابط: ${window.location.origin}/property/${property.id}` : `مرحباً، أريد الاستفسار عن عقارات في بنها.`;
    const wa = (s?.contactWhatsapp || s?.contactPhone || "").replace(/\D/g, "");
    window.open(`https://wa.me/${wa || "201000000000"}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  const wizardOptions: Record<WizardStep, { label: string; value: string; icon?: React.ReactNode }[]> = {
    type: [{ label: "شراء", value: "sale", icon: <Home className="w-3.5 h-3.5" /> }, { label: "إيجار", value: "rent", icon: <Building2 className="w-3.5 h-3.5" /> }],
    category: [
      { label: "شقة", value: "شقة", icon: <Building2 className="w-3.5 h-3.5" /> }, { label: "فيلا", value: "فيلا" },
      { label: "أرض", value: "أرض", icon: <Trees className="w-3.5 h-3.5" /> }, { label: "محل تجاري", value: "محل" },
      { label: "مكتب", value: "مكتب" }, { label: "دوبلكس", value: "دوبلكس" }, { label: "روف", value: "روف" },
    ],
    location: [
      { label: "بنها", value: "بنها" }, { label: "القناطر", value: "القناطر الخيرية" }, { label: "الخانكة", value: "الخانكة" },
      { label: "قليوب", value: "قليوب" }, { label: "طوخ", value: "طوخ" }, { label: "العبور", value: "العبور" }, { label: "أي منطقة", value: "أي منطقة" },
    ],
    budget: [
      { label: "أقل من ٥٠٠ ألف", value: "أقل من 500000" }, { label: "٥٠٠ ألف - مليون", value: "من 500000 الى 1000000" },
      { label: "١ - ٢ مليون", value: "من 1000000 الى 2000000" }, { label: "أكثر من ٢ مليون", value: "أكثر من 2000000" }, { label: "أي ميزانية", value: "أي ميزانية" },
    ],
    rooms: [{ label: "١ غرفة", value: "1 غرف" }, { label: "٢ غرفة", value: "2 غرف" }, { label: "٣ غرف", value: "3 غرف" }, { label: "٤+ غرف", value: "4 غرف" }, { label: "أي عدد", value: "أي عدد" }],
    area: [{ label: "أقل من ٨٠م²", value: "أقل من 80 متر" }, { label: "٨٠-١٢٠م²", value: "من 80 الى 120 متر" }, { label: "١٢٠-٢٠٠م²", value: "من 120 الى 200 متر" }, { label: "أكثر من ٢٠٠م²", value: "أكثر من 200 متر" }, { label: "أي مساحة", value: "أي مساحة" }],
    done: [],
  };

  const hasTrending = trending && ((trending.popularQueries?.length > 0) || (trending.featuredProperties?.length > 0));
  const isInitial = messages.length <= 1 && !wizardStep;

  if (settings !== undefined && !chatEnabled) return null;

  return (
    <>
      {/* FAB */}
      <motion.div className="fixed z-50 bottom-6 left-6"
        animate={hasBounced && !open ? { y: [0, -10, 0, -5, 0], transition: { duration: 1.2, repeat: 2, repeatDelay: 10 } } : {}}>
        <motion.button
          className="relative w-14 h-14 rounded-full bg-gradient-to-br from-primary to-teal-600 text-white shadow-xl flex items-center justify-center overflow-visible"
          style={{ boxShadow: "0 8px 32px rgba(13,148,136,0.5)" }}
          whileHover={{ scale: 1.12 }} whileTap={{ scale: 0.92 }}
          onClick={() => setOpen(o => !o)} aria-label="مساعد ذكي">
          {!open && <motion.span className="absolute inset-0 rounded-full bg-primary/35"
            animate={{ scale: [1, 1.7], opacity: [0.6, 0] }} transition={{ duration: 2.2, repeat: Infinity, ease: "easeOut" }} />}
          <AnimatePresence mode="wait">
            {open ? (
              <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><X className="w-6 h-6" /></motion.div>
            ) : (
              <motion.div key="chat" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="relative">
                <MessageCircle className="w-6 h-6" />
                {unread > 0 && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }}
                  className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow">{unread}</motion.span>}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.button>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 28, scale: 0.91 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 28, scale: 0.91 }}
            transition={{ type: "spring", stiffness: 340, damping: 28 }}
            className="fixed z-50 bottom-24 left-4 w-[390px] max-w-[calc(100vw-2rem)] bg-[#f4f6f9] rounded-3xl shadow-2xl flex flex-col overflow-hidden border border-white/60"
            style={{ maxHeight: "calc(100vh - 130px)", height: "620px", boxShadow: "0 24px 64px rgba(0,0,0,0.20)" }}
            dir="rtl">

            {/* Header */}
            <div className="bg-gradient-to-l from-primary via-teal-600 to-primary/90 px-4 py-3.5 flex items-center gap-3 shrink-0">
              <div className="relative">
                <div className="w-11 h-11 rounded-2xl bg-white/15 backdrop-blur-sm flex items-center justify-center border border-white/20 shadow-sm">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <motion.span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-400 rounded-full border-2 border-white shadow"
                  animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 2, repeat: Infinity }} />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white leading-tight">{botName}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <p className="text-[10px] text-white/75">متاح الآن • مساعد ذكي 24/7</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={reset} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors" title="محادثة جديدة"><RefreshCw className="w-3.5 h-3.5" /></button>
                <button onClick={() => openWhatsApp()} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors" title="واتساب"><Phone className="w-3.5 h-3.5" /></button>
                <button onClick={() => setOpen(false)} className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"><X className="w-3.5 h-3.5" /></button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scroll-smooth">
              {messages.map((msg, idx) => (
                <div key={msg.id}>
                  {msg.role === "bot" ? (
                    <div className="flex items-end gap-2 mb-3">
                      <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-teal-600 flex items-center justify-center shrink-0 shadow-sm">
                        <Bot className="w-3.5 h-3.5 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="bg-white rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm border border-gray-100/80 text-sm text-gray-800 leading-relaxed whitespace-pre-line">{msg.text}</div>
                        {msg.isWizard && wizardStep && wizardStep !== "done" && idx === messages.length - 1 && (
                          <WizardButtons options={wizardOptions[wizardStep]} onSelect={handleWizardSelect} />
                        )}
                        {msg.followUp && <div className="mt-1.5 bg-primary/8 border border-primary/20 rounded-2xl rounded-bl-sm px-3 py-2 text-xs text-primary font-semibold">💬 {msg.followUp}</div>}
                        {msg.properties && msg.properties.length > 0 && (
                          <>
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              {msg.properties.map(p => <PropertyCard key={p.id} p={p} onContact={prop => { setLeadProperty(prop); setShowLead(true); }} />)}
                            </div>
                            <button onClick={() => openWhatsApp()}
                              className="mt-2 w-full flex items-center justify-center gap-1.5 bg-green-500 text-white text-xs font-bold rounded-2xl py-2 hover:bg-green-600 transition-all shadow-sm">
                              <Phone className="w-3.5 h-3.5" />تحدث مع مستشار عبر واتساب
                            </button>
                          </>
                        )}
                        {msg.suggestions && msg.suggestions.length > 0 && idx === messages.length - 1 && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            <p className="w-full text-[10px] text-gray-400 mb-0.5">اقتراحات للتضييق:</p>
                            {msg.suggestions.map((s, si) => (
                              <button key={si} onClick={() => sendMessage(s)}
                                className="text-[11px] bg-primary/8 text-primary border border-primary/20 rounded-full px-2.5 py-1 font-semibold hover:bg-primary hover:text-white transition-all">
                                {s}
                              </button>
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1 mr-1">{msg.time.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-end justify-start gap-2 mb-3 flex-row-reverse">
                      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0"><User className="w-3.5 h-3.5 text-primary" /></div>
                      <div className="max-w-[78%]">
                        <div className="bg-gradient-to-br from-primary to-teal-600 text-white rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm leading-relaxed shadow-sm">{msg.text}</div>
                        <p className="text-[10px] text-gray-400 mt-1 text-left ml-1">{msg.time.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {loading && <TypingDots />}
              {showLead && !leadDone && (
                <div className="mt-2">
                  <LeadForm property={leadProperty} sessionId={sessionId} onClose={() => setShowLead(false)}
                    onSuccess={() => { setShowLead(false); setLeadDone(true); addBotMsg("تم إرسال طلبك بنجاح! ✅\nسيتواصل معك فريقنا قريباً. شكراً 🙏"); }} />
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Initial Quick Actions + Trending */}
            {isInitial && (
              <div className="px-3 pb-2 space-y-2 shrink-0 border-t border-gray-100/80 pt-2 bg-[#f4f6f9]">
                <button onClick={startWizard}
                  className="w-full text-xs bg-gradient-to-l from-primary to-teal-600 text-white font-bold rounded-2xl px-3 py-2.5 hover:opacity-90 transition-all flex items-center justify-center gap-2 shadow-sm">
                  <Zap className="w-3.5 h-3.5" />ابدأ البحث الموجّه خطوة بخطوة
                </button>
                {hasTrending && (
                  <div className="bg-white rounded-2xl p-2.5 border border-gray-100 max-h-44 overflow-y-auto">
                    <TrendingPanel onQuery={q => sendMessage(q)} trending={trending!} />
                  </div>
                )}
                <div className="flex flex-wrap gap-1.5">
                  {quickReplies.map(qr => (
                    <button key={qr} onClick={() => sendMessage(qr)}
                      className="text-[11px] bg-white border border-primary/20 text-primary font-semibold rounded-full px-3 py-1 hover:bg-primary hover:text-white transition-all shadow-sm">{qr}</button>
                  ))}
                </div>
              </div>
            )}

            {/* Input */}
            <div className="px-3 pb-3 pt-2 bg-white border-t border-gray-100/80 shrink-0">
              <div className="relative">
                <AnimatePresence>
                  {showAutocomplete && (
                    <AutocompleteDropdown suggestions={autocomplete} onSelect={s => { setInput(s); setShowAutocomplete(false); inputRef.current?.focus(); }} />
                  )}
                </AnimatePresence>
                <div className="flex items-center gap-2 bg-[#f4f6f9] rounded-2xl px-3 py-2 border border-gray-200/60 focus-within:border-primary/40 focus-within:ring-2 focus-within:ring-primary/10 transition-all">
                  <input ref={inputRef} value={input}
                    onChange={e => { setInput(e.target.value); fetchAutocomplete(e.target.value); }}
                    onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } if (e.key === "Escape") setShowAutocomplete(false); }}
                    onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
                    onFocus={() => input.length >= 2 && fetchAutocomplete(input)}
                    placeholder="اكتب طلبك... مثلاً: شقة 3 غرف في بنها"
                    className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
                    dir="rtl" disabled={loading || !!wizardStep} />
                  <button onClick={() => sendMessage(input)} disabled={!input.trim() || loading || !!wizardStep}
                    className="w-8 h-8 bg-gradient-to-br from-primary to-teal-600 rounded-xl flex items-center justify-center text-white disabled:opacity-40 hover:opacity-90 shrink-0 transition-all shadow-sm">
                    {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-1.5 flex items-center justify-center gap-1">
                <Sparkles className="w-3 h-3" />مدعوم بذكاء اصطناعي • نتائج حقيقية من قاعدة البيانات
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
