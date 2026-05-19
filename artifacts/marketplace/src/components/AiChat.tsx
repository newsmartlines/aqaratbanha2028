import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  MessageCircle, X, Bot, User, BedDouble, Bath,
  Maximize2, MapPin, Sparkles, RefreshCw, ChevronRight,
  Phone, Send, ThumbsUp, ExternalLink, Loader2,
  Home, Building2, Trees, ArrowLeft,
} from "lucide-react";
import { api, type SiteSettings } from "@/lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────
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
};

type WizardStep = "type" | "category" | "location" | "budget" | "rooms" | "done";

// ── Constants ─────────────────────────────────────────────────────────────────
const FALLBACK_IMG = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80";
const TYPE_LABELS: Record<string, string> = { sale: "للبيع", rent: "للإيجار" };
const DEFAULT_BOT_NAME = "مساعد عقارات بنها";
const DEFAULT_WELCOME = "أهلاً! أنا مساعدك الذكي لعقارات بنها 🏠\nأخبرني إيه اللي بتدور عليه — أو استخدم الأسئلة السريعة أدناه.";
const DEFAULT_QUICK_REPLIES = ["شقة للبيع في بنها", "أرض للبيع", "شقة للإيجار", "فيلا للبيع"];

// ── Session ID (persistent per browser tab) ──────────────────────────────────
function getSessionId(): string {
  const key = "chat_session_id";
  let id = sessionStorage.getItem(key);
  if (!id) {
    id = `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStorage.setItem(key, id);
  }
  return id;
}

// ── Save session to backend (fire-and-forget) ────────────────────────────────
function saveSession(sessionId: string, messages: ChatMessage[], meta: object) {
  fetch("/api/chat-sessions", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, messages: messages.map(m => ({
      role: m.role, text: m.text, time: m.time,
      propertyCount: m.properties?.length ?? 0,
    })), metadata: meta }),
  }).catch(() => {});
}

// ── Lead submit ───────────────────────────────────────────────────────────────
async function submitLead(data: {
  sessionId: string; name?: string; phone?: string; whatsapp?: string;
  propertyId?: number; propertyTitle?: string; intent?: object;
}) {
  try {
    await fetch("/api/chat-leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
  } catch {}
}

// ── Property Card ─────────────────────────────────────────────────────────────
function PropertyCard({ p, onContact }: { p: Property; onContact: (p: Property) => void }) {
  const [, setLocation] = useLocation();
  const img = p.image ? (p.image.startsWith("http") ? p.image : `/api-server${p.image}`) : FALLBACK_IMG;
  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow border border-gray-100 hover:shadow-md transition-all">
      <div className="relative cursor-pointer" onClick={() => setLocation(`/property/${p.id}`)}>
        <img src={img} alt={p.title} className="w-full h-28 object-cover"
          onError={e => { e.currentTarget.src = FALLBACK_IMG; }} />
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
        <div className="absolute top-2 right-2 flex gap-1">
          {p.featured && <span className="text-[10px] font-bold bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full">مميز</span>}
          {p.type && <span className="text-[10px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full">{TYPE_LABELS[p.type] ?? p.type}</span>}
        </div>
      </div>
      <div className="p-2.5">
        <p className="text-xs font-bold text-gray-900 line-clamp-1 mb-0.5 cursor-pointer hover:text-primary"
          onClick={() => setLocation(`/property/${p.id}`)}>{p.title}</p>
        <p className="text-xs font-bold text-primary mb-1.5">{p.price}</p>
        <div className="flex items-center gap-2 text-[10px] text-gray-400 mb-2">
          {p.beds > 0 && <span className="flex items-center gap-0.5"><BedDouble className="w-3 h-3" />{p.beds}</span>}
          {p.baths > 0 && <span className="flex items-center gap-0.5"><Bath className="w-3 h-3" />{p.baths}</span>}
          {p.area > 0 && <span className="flex items-center gap-0.5"><Maximize2 className="w-3 h-3" />{p.area}م²</span>}
          {p.location && <span className="flex items-center gap-0.5 mr-auto truncate max-w-[60px]"><MapPin className="w-3 h-3 shrink-0" />{p.location}</span>}
        </div>
        <div className="flex gap-1">
          <button onClick={() => setLocation(`/property/${p.id}`)}
            className="flex-1 text-[10px] font-bold bg-primary/10 text-primary rounded-lg py-1 hover:bg-primary hover:text-white transition-all">
            عرض التفاصيل
          </button>
          <button onClick={() => onContact(p)}
            className="px-2 text-[10px] font-bold bg-green-500/10 text-green-600 rounded-lg py-1 hover:bg-green-500 hover:text-white transition-all">
            تواصل
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Typing Indicator ──────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map(i => (
            <motion.div key={i} className="w-1.5 h-1.5 bg-primary rounded-full"
              animate={{ y: ["0%", "-50%", "0%"] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Lead Form ─────────────────────────────────────────────────────────────────
function LeadForm({
  property, sessionId, onClose, onSuccess,
}: { property?: Property; sessionId: string; onClose: () => void; onSuccess: () => void }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!phone.trim()) return;
    setLoading(true);
    await submitLead({
      sessionId, name: name.trim(), phone: phone.trim(), whatsapp: phone.trim(),
      propertyId: property?.id, propertyTitle: property?.title,
    });
    setLoading(false);
    onSuccess();
  };

  return (
    <div className="bg-white rounded-2xl rounded-bl-sm p-3 shadow-sm border border-primary/20 text-sm text-gray-800 space-y-3">
      <p className="font-bold text-gray-900">
        {property ? `🏠 مهتم بـ: ${property.title}` : "اترك بياناتك وهنتواصل معاك!"}
      </p>
      <input value={name} onChange={e => setName(e.target.value)}
        placeholder="اسمك (اختياري)"
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary"
        dir="rtl" />
      <input value={phone} onChange={e => setPhone(e.target.value)}
        placeholder="رقم التليفون / واتساب *"
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm outline-none focus:border-primary"
        dir="rtl" type="tel" />
      <div className="flex gap-2">
        <button onClick={handleSubmit} disabled={!phone.trim() || loading}
          className="flex-1 bg-primary text-white rounded-xl py-2 text-sm font-bold flex items-center justify-center gap-1.5 disabled:opacity-50 hover:bg-primary/90 transition-all">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Phone className="w-4 h-4" />}
          إرسال طلبي
        </button>
        <button onClick={onClose}
          className="px-3 bg-gray-100 text-gray-600 rounded-xl text-sm font-medium hover:bg-gray-200 transition-all">
          إلغاء
        </button>
      </div>
    </div>
  );
}

// ── Wizard Step Buttons ───────────────────────────────────────────────────────
function WizardButtons({ options, onSelect }: {
  options: { label: string; value: string; icon?: React.ReactNode }[];
  onSelect: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {options.map(o => (
        <button key={o.value} onClick={() => onSelect(o.value)}
          className="flex items-center gap-1.5 bg-white border border-primary/20 text-primary text-xs font-bold rounded-full px-3 py-1.5 hover:bg-primary hover:text-white hover:border-primary transition-all shadow-sm">
          {o.icon}
          {o.label}
        </button>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function AiChat() {
  const { data: settings } = useQuery<SiteSettings>({
    queryKey: ["site-settings"],
    queryFn: api.settings.list,
    staleTime: 60_000,
  });

  const s = settings as any;
  const chatEnabled = s?.chatbotEnabled !== "false";
  const botName = s?.chatbotBotName || DEFAULT_BOT_NAME;
  const welcomeText = s?.chatbotWelcomeMessage || DEFAULT_WELCOME;
  const quickReplies: string[] = (() => {
    try {
      const p = JSON.parse(s?.chatbotQuickReplies ?? "[]");
      return Array.isArray(p) && p.length > 0 ? p : DEFAULT_QUICK_REPLIES;
    } catch { return DEFAULT_QUICK_REPLIES; }
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
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update welcome message when settings load
  useEffect(() => {
    setMessages(prev => {
      if (prev.length === 1 && prev[0].id === "welcome") return [{ ...prev[0], text: welcomeText }];
      return prev;
    });
  }, [welcomeText]);

  useEffect(() => {
    if (open) { setUnread(0); setTimeout(() => inputRef.current?.focus(), 300); }
  }, [open]);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, showLead]);

  const addBotMsg = useCallback((text: string, extra?: Partial<ChatMessage>) => {
    const msg: ChatMessage = { id: Date.now().toString(), role: "bot", text, time: new Date(), ...extra };
    setMessages(prev => [...prev, msg]);
    return msg;
  }, []);

  // ── Wizard flow ─────────────────────────────────────────────────────────────
  const startWizard = () => {
    setWizardStep("type");
    setWizardData({});
    addBotMsg("هساعدك تلاقي العقار المناسب! دعنا نبدأ 🧭\n\nبتدور على إيه؟", { isWizard: true });
  };

  const handleWizardSelect = async (value: string) => {
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", text: value, time: new Date() };
    setMessages(prev => [...prev, userMsg]);

    const newData = { ...wizardData };

    if (wizardStep === "type") {
      newData.type = value;
      setWizardData(newData);
      setWizardStep("category");
      setTimeout(() => addBotMsg("ممتاز! ما نوع العقار؟", { isWizard: true }), 400);
    } else if (wizardStep === "category") {
      newData.category = value;
      setWizardData(newData);
      setWizardStep("location");
      setTimeout(() => addBotMsg("في أي منطقة بتدور؟", { isWizard: true }), 400);
    } else if (wizardStep === "location") {
      newData.location = value;
      setWizardData(newData);
      setWizardStep("budget");
      setTimeout(() => addBotMsg("ما هي ميزانيتك التقريبية؟", { isWizard: true }), 400);
    } else if (wizardStep === "budget") {
      newData.budget = value;
      setWizardData(newData);
      setWizardStep("rooms");
      setTimeout(() => addBotMsg("كم عدد الغرف المطلوبة؟", { isWizard: true }), 400);
    } else if (wizardStep === "rooms") {
      newData.rooms = value;
      setWizardData(newData);
      setWizardStep("done");

      // Build natural language query from wizard data
      const query = `${newData.type === "sale" ? "للبيع" : "للإيجار"} ${newData.category} في ${newData.location} ${newData.budget} ${newData.rooms !== "أي عدد" ? newData.rooms + " غرف" : ""}`;
      await doSearch(query, newData);
    }
  };

  // ── Core search ─────────────────────────────────────────────────────────────
  const doSearch = async (text: string, meta?: Record<string, string>) => {
    setLoading(true);
    setWizardStep(null);
    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text }),
      });
      const data = await res.json();
      const botMsg: ChatMessage = {
        id: (Date.now() + 1).toString(), role: "bot",
        text: data.reply ?? "جرّب تسألني بطريقة مختلفة.",
        followUp: data.followUp,
        properties: data.properties ?? [],
        time: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
      if (!open) setUnread(n => n + 1);

      // Save session
      saveSession(sessionId, [...messages], { lastIntent: data.intent, wizardData: meta });
    } catch {
      addBotMsg("معنديش اتصال دلوقتي. جرب بعد ثانية.");
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: ChatMessage = { id: Date.now().toString(), role: "user", text: text.trim(), time: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    await doSearch(text.trim());
  };

  const reset = () => {
    setMessages([{ ...welcomeMsg, text: welcomeText }]);
    setInput("");
    setWizardStep(null);
    setWizardData({});
    setShowLead(false);
    setLeadDone(false);
  };

  const openWhatsApp = (property?: Property) => {
    const msg = property
      ? `مرحباً، أنا مهتم بعقار: ${property.title} - ${property.price}. رابط: ${window.location.origin}/property/${property.id}`
      : `مرحباً، أريد الاستفسار عن عقارات في بنها.`;
    const wa = (s?.contactWhatsapp || s?.contactPhone || "").replace(/\D/g, "");
    window.open(`https://wa.me/${wa || "201000000000"}?text=${encodeURIComponent(msg)}`, "_blank");
  };

  // ── Wizard option sets ───────────────────────────────────────────────────────
  const wizardOptions: Record<WizardStep, { label: string; value: string; icon?: React.ReactNode }[]> = {
    type: [
      { label: "شراء", value: "sale", icon: <Home className="w-3.5 h-3.5" /> },
      { label: "إيجار", value: "rent", icon: <Building2 className="w-3.5 h-3.5" /> },
    ],
    category: [
      { label: "شقة", value: "شقة", icon: <Building2 className="w-3.5 h-3.5" /> },
      { label: "فيلا", value: "فيلا" },
      { label: "أرض", value: "أرض", icon: <Trees className="w-3.5 h-3.5" /> },
      { label: "محل تجاري", value: "محل" },
      { label: "مكتب", value: "مكتب" },
      { label: "دوبلكس", value: "دوبلكس" },
    ],
    location: [
      { label: "بنها", value: "بنها" },
      { label: "القناطر", value: "القناطر الخيرية" },
      { label: "الخانكة", value: "الخانكة" },
      { label: "قليوب", value: "قليوب" },
      { label: "طوخ", value: "طوخ" },
      { label: "العبور", value: "العبور" },
    ],
    budget: [
      { label: "أقل من ٥٠٠ ألف", value: "أقل من 500000" },
      { label: "٥٠٠ ألف - مليون", value: "من 500000 الى 1000000" },
      { label: "١ - ٢ مليون", value: "من 1000000 الى 2000000" },
      { label: "أكثر من ٢ مليون", value: "أكثر من 2000000" },
      { label: "أي ميزانية", value: "أي ميزانية" },
    ],
    rooms: [
      { label: "١ غرفة", value: "1 غرف" },
      { label: "٢ غرفة", value: "2 غرف" },
      { label: "٣ غرف", value: "3 غرف" },
      { label: "٤ غرف أو أكثر", value: "4 غرف" },
      { label: "أي عدد", value: "أي عدد" },
    ],
    done: [],
  };

  if (settings !== undefined && !chatEnabled) return null;

  return (
    <>
      {/* ── Floating Button ── */}
      <motion.button
        className="fixed z-50 bottom-6 left-6 w-14 h-14 rounded-full bg-primary text-white shadow-xl flex items-center justify-center"
        style={{ boxShadow: "0 6px 28px rgba(0,130,120,0.45)" }}
        whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.93 }}
        onClick={() => setOpen(o => !o)} aria-label="مساعد ذكي"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}>
              <X className="w-6 h-6" />
            </motion.div>
          ) : (
            <motion.div key="chat" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="relative">
              <MessageCircle className="w-6 h-6" />
              {unread > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unread}
                </span>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── Chat Window ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.93 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            className="fixed z-50 bottom-24 left-4 w-[380px] max-w-[calc(100vw-2rem)] bg-[#f5f7fa] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: "calc(100vh - 130px)", height: "600px", boxShadow: "0 20px 60px rgba(0,0,0,0.18)" }}
            dir="rtl"
          >
            {/* ── Header ── */}
            <div className="bg-gradient-to-l from-primary to-teal-600 px-4 py-3 flex items-center gap-3 shrink-0">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-white/20 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">{botName}</p>
                <p className="text-[11px] text-white/70">يرد فوراً • مساعد ذكي</p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={reset} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors" title="محادثة جديدة">
                  <RefreshCw className="w-4 h-4" />
                </button>
                <button onClick={() => openWhatsApp()} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors" title="واتساب">
                  <Phone className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* ── Messages ── */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scroll-smooth">
              {messages.map((msg, idx) => (
                <div key={msg.id}>
                  {msg.role === "bot" ? (
                    <div className="flex items-end gap-2 mb-3">
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="bg-white rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm border border-gray-100/80 text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                          {msg.text}
                        </div>
                        {/* Wizard buttons */}
                        {msg.isWizard && wizardStep && wizardStep !== "done" && idx === messages.length - 1 && (
                          <WizardButtons
                            options={wizardOptions[wizardStep]}
                            onSelect={handleWizardSelect}
                          />
                        )}
                        {msg.followUp && (
                          <div className="mt-1.5 bg-primary/8 border border-primary/20 rounded-2xl rounded-bl-sm px-3 py-2 text-xs text-primary font-semibold">
                            💬 {msg.followUp}
                          </div>
                        )}
                        {msg.properties && msg.properties.length > 0 && (
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {msg.properties.map(p => (
                              <PropertyCard key={p.id} p={p} onContact={prop => { setLeadProperty(prop); setShowLead(true); }} />
                            ))}
                          </div>
                        )}
                        <p className="text-[10px] text-gray-400 mt-1 mr-1">
                          {msg.time.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-end justify-start gap-2 mb-3 flex-row-reverse">
                      <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center shrink-0">
                        <User className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="max-w-[75%]">
                        <div className="bg-primary text-white rounded-2xl rounded-br-sm px-3.5 py-2.5 text-sm leading-relaxed">
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

              {/* Lead form overlay */}
              {showLead && !leadDone && (
                <div className="mt-2">
                  <LeadForm
                    property={leadProperty}
                    sessionId={sessionId}
                    onClose={() => setShowLead(false)}
                    onSuccess={() => {
                      setShowLead(false);
                      setLeadDone(true);
                      addBotMsg("تم إرسال طلبك بنجاح! ✅ سيتواصل معك فريقنا في أقرب وقت. شكراً لاهتمامك 🙏");
                    }}
                  />
                </div>
              )}

              <div ref={bottomRef} />
            </div>

            {/* ── Quick Replies / Wizard Start (first message only) ── */}
            {messages.length <= 1 && !wizardStep && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
                <button onClick={startWizard}
                  className="w-full text-xs bg-primary/10 border border-primary/20 text-primary font-bold rounded-xl px-3 py-2 hover:bg-primary hover:text-white transition-all flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" />
                  🧭 ابدأ البحث الموجّه خطوة بخطوة
                </button>
                {quickReplies.map(qr => (
                  <button key={qr} onClick={() => sendMessage(qr)}
                    className="text-xs bg-white border border-primary/20 text-primary font-semibold rounded-full px-3 py-1.5 hover:bg-primary hover:text-white transition-all shadow-sm">
                    {qr}
                  </button>
                ))}
              </div>
            )}

            {/* ── Input ── */}
            <div className="px-3 pb-3 pt-2 bg-white border-t border-gray-100/80 shrink-0">
              <div className="flex items-center gap-2 bg-[#f5f7fa] rounded-2xl px-3 py-2 border border-gray-200/50">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                  placeholder="اكتب طلبك... مثلاً: شقة 3 غرف في بنها"
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
                  dir="rtl" disabled={loading || !!wizardStep}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading || !!wizardStep}
                  className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-white disabled:opacity-40 hover:bg-primary/90 shrink-0 transition-all"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                </button>
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-1.5">
                مدعوم بذكاء اصطناعي • نتائج من قاعدة البيانات الحقيقية
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
