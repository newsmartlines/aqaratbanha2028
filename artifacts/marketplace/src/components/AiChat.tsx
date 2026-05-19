import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocation } from "wouter";
import {
  MessageCircle, X, Send, Bot, User, BedDouble, Bath,
  Maximize2, MapPin, ChevronRight, Sparkles, RefreshCw,
} from "lucide-react";

type Property = {
  id: number;
  title: string;
  price: string;
  priceNum: number;
  image: string;
  location: string;
  beds: number;
  baths: number;
  area: number;
  type: string;
  kind: string;
  featured: boolean;
};

type Message = {
  id: string;
  role: "bot" | "user";
  text: string;
  followUp?: string;
  properties?: Property[];
  time: Date;
};

const QUICK_REPLIES = [
  "شقة للبيع في بنها",
  "أرض للبيع",
  "شقة للإيجار",
  "فيلا للبيع",
];

const FALLBACK_IMG = "https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=400&q=80";

const TYPE_LABELS: Record<string, string> = { sale: "للبيع", rent: "للإيجار" };
const KIND_LABELS: Record<string, string> = {
  residential: "سكني", commercial: "تجاري", land: "أراضي",
};

function PropertyCard({ p }: { p: Property }) {
  const [, setLocation] = useLocation();
  const img = p.image
    ? p.image.startsWith("http") ? p.image : `/api-server${p.image}`
    : FALLBACK_IMG;

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden shadow-sm border border-gray-100 cursor-pointer hover:shadow-md transition-shadow"
      onClick={() => setLocation(`/property/${p.id}`)}
    >
      <div className="relative">
        <img
          src={img}
          alt={p.title}
          className="w-full h-28 object-cover"
          onError={e => { e.currentTarget.src = FALLBACK_IMG; }}
        />
        <div className="absolute top-2 right-2 flex gap-1">
          {p.featured && (
            <span className="text-[10px] font-bold bg-yellow-400 text-yellow-900 px-1.5 py-0.5 rounded-full">
              مميز
            </span>
          )}
          {p.type && (
            <span className="text-[10px] font-bold bg-primary text-white px-1.5 py-0.5 rounded-full">
              {TYPE_LABELS[p.type] ?? p.type}
            </span>
          )}
        </div>
      </div>
      <div className="p-2.5">
        <p className="text-xs font-bold text-gray-900 line-clamp-1 mb-1">{p.title}</p>
        <p className="text-xs font-bold text-primary mb-1.5">{p.price}</p>
        <div className="flex items-center gap-2 text-[10px] text-gray-500">
          {p.beds > 0 && (
            <span className="flex items-center gap-0.5">
              <BedDouble className="w-3 h-3" />{p.beds}
            </span>
          )}
          {p.baths > 0 && (
            <span className="flex items-center gap-0.5">
              <Bath className="w-3 h-3" />{p.baths}
            </span>
          )}
          {p.area > 0 && (
            <span className="flex items-center gap-0.5">
              <Maximize2 className="w-3 h-3" />{p.area}م²
            </span>
          )}
          {p.location && (
            <span className="flex items-center gap-0.5 mr-auto">
              <MapPin className="w-3 h-3" />{p.location}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 mb-3">
      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="bg-white rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm border border-gray-100">
        <div className="flex items-center gap-1">
          {[0, 1, 2].map(i => (
            <motion.div
              key={i}
              className="w-1.5 h-1.5 bg-primary rounded-full"
              animate={{ y: ["0%", "-50%", "0%"] }}
              transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.15 }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

const WELCOME_MSG: Message = {
  id: "welcome",
  role: "bot",
  text: "أهلاً! أنا مساعدك الذكي لعقارات بنها 🏠\nأخبرني إيه اللي بتدور عليه — نوع العقار، المنطقة، السعر، أو عدد الغرف — وأنا هجيبلك أفضل الخيارات من قاعدة البيانات!",
  time: new Date(),
};

export default function AiChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MSG]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [unread, setUnread] = useState(0);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [open]);

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      role: "user",
      text: text.trim(),
      time: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/ai-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text.trim() }),
      });
      const data = await res.json();

      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "bot",
        text: data.reply ?? "جرّب تسألني بطريقة مختلفة.",
        followUp: data.followUp,
        properties: data.properties ?? [],
        time: new Date(),
      };
      setMessages(prev => [...prev, botMsg]);
      if (!open) setUnread(n => n + 1);
    } catch {
      setMessages(prev => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "bot",
        text: "معنديش اتصال دلوقتي. جرب بعد ثانية.",
        time: new Date(),
      }]);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setMessages([WELCOME_MSG]);
    setInput("");
  };

  return (
    <>
      {/* ── Floating button ── */}
      <motion.button
        className="fixed z-50 bottom-6 left-6 w-14 h-14 rounded-full bg-primary text-white shadow-lg flex items-center justify-center"
        style={{ boxShadow: "0 4px 24px rgba(0,130,120,0.4)" }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(o => !o)}
        aria-label="مساعد ذكي"
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
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed z-50 bottom-24 left-4 w-[360px] max-w-[calc(100vw-2rem)] bg-[#f5f7fa] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            style={{ maxHeight: "calc(100vh - 120px)", height: "560px" }}
            dir="rtl"
          >
            {/* Header */}
            <div className="bg-primary px-4 py-3 flex items-center gap-3 shrink-0">
              <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-bold text-white">مساعد عقارات بنها</p>
                <p className="text-[11px] text-white/70 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 bg-green-300 rounded-full inline-block" />
                  متاح دائماً
                </p>
              </div>
              <button onClick={reset} className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors" title="محادثة جديدة">
                <RefreshCw className="w-4 h-4" />
              </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-1 scroll-smooth">
              {messages.map(msg => (
                <div key={msg.id}>
                  {msg.role === "bot" ? (
                    <div className="flex items-end gap-2 mb-3">
                      <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Bot className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 max-w-[85%]">
                        <div className="bg-white rounded-2xl rounded-bl-sm px-3.5 py-2.5 shadow-sm border border-gray-100 text-sm text-gray-800 leading-relaxed whitespace-pre-line">
                          {msg.text}
                        </div>
                        {msg.followUp && (
                          <div className="mt-1.5 bg-primary/8 border border-primary/20 rounded-2xl rounded-bl-sm px-3.5 py-2 text-xs text-primary font-semibold">
                            💬 {msg.followUp}
                          </div>
                        )}
                        {msg.properties && msg.properties.length > 0 && (
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            {msg.properties.map(p => (
                              <PropertyCard key={p.id} p={p} />
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
              {loading && <TypingIndicator />}
              <div ref={bottomRef} />
            </div>

            {/* Quick replies (show only after welcome) */}
            {messages.length <= 1 && (
              <div className="px-3 pb-2 flex flex-wrap gap-1.5 shrink-0">
                {QUICK_REPLIES.map(qr => (
                  <button
                    key={qr}
                    onClick={() => sendMessage(qr)}
                    className="text-xs bg-white border border-primary/20 text-primary font-semibold rounded-full px-3 py-1.5 hover:bg-primary hover:text-white transition-all"
                  >
                    {qr}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="px-3 pb-3 pt-2 bg-white border-t border-gray-100 shrink-0">
              <div className="flex items-center gap-2 bg-[#f5f7fa] rounded-2xl px-3 py-1.5">
                <input
                  ref={inputRef}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(input); } }}
                  placeholder="اكتب طلبك... مثلاً: شقة 3 غرف في بنها"
                  className="flex-1 bg-transparent text-sm text-gray-800 placeholder:text-gray-400 outline-none"
                  dir="rtl"
                  disabled={loading}
                />
                <button
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || loading}
                  className="w-8 h-8 bg-primary rounded-xl flex items-center justify-center text-white disabled:opacity-40 transition-all hover:bg-primary/90 shrink-0"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
