import { useEffect, useState, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useLocation } from "wouter";

interface Popup {
  id: number;
  name: string;
  title?: string | null;
  description?: string | null;
  imageUrl?: string | null;
  ctaText?: string | null;
  ctaLink?: string | null;
  bgColor?: string | null;
  overlayOpacity?: number | null;
  textColor?: string | null;
  btnColor?: string | null;
  btnTextColor?: string | null;
  borderRadius?: number | null;
  size?: string | null;
  position?: string | null;
  triggerType?: string | null;
  triggerDelay?: number | null;
  triggerScrollPct?: number | null;
  pages?: string | null;
  showCloseBtn?: boolean | null;
  cookieDuration?: number | null;
}

const SIZE_MAP: Record<string, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-lg",
  xl: "max-w-2xl",
  full: "max-w-4xl",
};

const POSITION_MAP: Record<string, string> = {
  center: "items-center justify-center",
  top: "items-start justify-center pt-16",
  bottom: "items-end justify-center pb-16",
  "bottom-right": "items-end justify-end p-6",
  "bottom-left": "items-end justify-start p-6",
  "top-right": "items-start justify-end p-6 pt-20",
  "top-left": "items-start justify-start p-6 pt-20",
};

function cookieKey(id: number) { return `popup_dismissed_${id}`; }

function isDismissed(id: number): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(cookieKey(id));
}

function dismiss(id: number, days: number) {
  const exp = new Date(Date.now() + days * 86400000).toISOString();
  localStorage.setItem(cookieKey(id), exp);
}

function parsePages(pages: string | null | undefined): string[] {
  if (!pages) return ["all"];
  try { return JSON.parse(pages); } catch { return ["all"]; }
}

function matchesPage(pages: string[], pathname: string): boolean {
  if (pages.includes("all")) return true;
  if (pages.includes("home") && (pathname === "/" || pathname === "")) return true;
  if (pages.includes("properties") && pathname.startsWith("/properties")) return true;
  if (pages.includes("property") && pathname.startsWith("/property/")) return true;
  return false;
}

function SinglePopup({ popup, onClose }: { popup: Popup; onClose: () => void }) {
  const pos = popup.position ?? "center";
  const posClass = POSITION_MAP[pos] ?? POSITION_MAP.center;
  const sizeClass = SIZE_MAP[popup.size ?? "md"] ?? SIZE_MAP.md;
  const radius = popup.borderRadius ?? 12;
  const bg = popup.bgColor ?? "#ffffff";
  const textColor = popup.textColor ?? "#111827";
  const btnColor = popup.btnColor ?? "#0d9488";
  const btnTextColor = popup.btnTextColor ?? "#ffffff";
  const overlayOpacity = (popup.overlayOpacity ?? 50) / 100;
  const isCorner = pos.includes("right") || pos.includes("left");

  return (
    <div
      className={`fixed inset-0 z-[9999] flex ${posClass} ${isCorner ? "" : "p-4"}`}
      style={{ background: isCorner ? "transparent" : `rgba(0,0,0,${overlayOpacity})` }}
      onClick={isCorner ? undefined : onClose}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.85, y: pos === "bottom" || pos.includes("bottom") ? 40 : -20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.85, y: pos === "bottom" || pos.includes("bottom") ? 40 : -20 }}
        transition={{ type: "spring", stiffness: 300, damping: 28 }}
        className={`relative w-full ${sizeClass} shadow-2xl overflow-hidden`}
        style={{ borderRadius: radius, background: bg, color: textColor }}
        dir="rtl"
        onClick={e => e.stopPropagation()}
      >
        {/* Close */}
        {popup.showCloseBtn !== false && (
          <button
            onClick={onClose}
            className="absolute top-3 left-3 z-10 w-7 h-7 rounded-full bg-black/10 hover:bg-black/20 flex items-center justify-center transition-all"
            style={{ color: textColor }}
          >
            <X className="w-4 h-4" />
          </button>
        )}

        {/* Image */}
        {popup.imageUrl && (
          <div className="w-full">
            <img src={popup.imageUrl} alt={popup.title ?? ""} className="w-full object-cover max-h-64" />
          </div>
        )}

        {/* Body */}
        {(popup.title || popup.description || popup.ctaText) && (
          <div className="p-6">
            {popup.title && (
              <h2 className="text-xl font-extrabold mb-2 leading-snug" style={{ color: textColor }}>
                {popup.title}
              </h2>
            )}
            {popup.description && (
              <p className="text-sm leading-relaxed mb-4 opacity-80" style={{ color: textColor }}>
                {popup.description}
              </p>
            )}
            {popup.ctaText && popup.ctaLink && (
              <a
                href={popup.ctaLink}
                target={popup.ctaLink.startsWith("http") ? "_blank" : "_self"}
                rel="noopener noreferrer"
                onClick={onClose}
                className="inline-flex items-center justify-center w-full px-6 py-3 rounded-xl font-bold text-sm transition-all hover:opacity-90 active:scale-95"
                style={{ background: btnColor, color: btnTextColor, borderRadius: radius * 0.6 }}
              >
                {popup.ctaText}
              </a>
            )}
          </div>
        )}
      </motion.div>
    </div>
  );
}

export function PopupRenderer() {
  const [location] = useLocation();
  const [visibleIds, setVisibleIds] = useState<Set<number>>(new Set());
  const triggeredRef = useRef<Set<number>>(new Set());

  const { data } = useQuery<{ success: boolean; data: Popup[] }>({
    queryKey: ["popups-active"],
    queryFn: () => fetch("/api/popups").then(r => r.json()),
    staleTime: 60_000,
  });

  const popups: Popup[] = data?.data ?? [];

  useEffect(() => {
    if (!popups.length) return;
    const pathname = location;

    // Clean up timers on unmount / page change
    const timers: ReturnType<typeof setTimeout>[] = [];
    const handlers: Array<[string, EventListener]> = [];

    for (const popup of popups) {
      if (triggeredRef.current.has(popup.id)) continue;
      if (isDismissed(popup.id)) continue;
      if (!matchesPage(parsePages(popup.pages), pathname)) continue;

      const show = () => {
        if (!isDismissed(popup.id)) {
          triggeredRef.current.add(popup.id);
          setVisibleIds(prev => new Set([...prev, popup.id]));
        }
      };

      const trigger = popup.triggerType ?? "immediate";

      if (trigger === "immediate") {
        timers.push(setTimeout(show, 300));
      } else if (trigger === "delay") {
        timers.push(setTimeout(show, (popup.triggerDelay ?? 3) * 1000));
      } else if (trigger === "scroll") {
        const threshold = popup.triggerScrollPct ?? 50;
        const onScroll = () => {
          const pct = (window.scrollY / (document.body.scrollHeight - window.innerHeight)) * 100;
          if (pct >= threshold) show();
        };
        window.addEventListener("scroll", onScroll, { passive: true });
        handlers.push(["scroll", onScroll as EventListener]);
      } else if (trigger === "exit") {
        const onMouseLeave = (e: MouseEvent) => {
          if (e.clientY <= 0) show();
        };
        document.addEventListener("mouseleave", onMouseLeave);
        handlers.push(["mouseleave_doc", onMouseLeave as EventListener]);
      }
    }

    return () => {
      timers.forEach(clearTimeout);
      handlers.forEach(([type, fn]) => {
        if (type === "scroll") window.removeEventListener("scroll", fn);
        else if (type === "mouseleave_doc") document.removeEventListener("mouseleave", fn);
      });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [popups, location]);

  const handleClose = (popup: Popup) => {
    setVisibleIds(prev => {
      const n = new Set(prev);
      n.delete(popup.id);
      return n;
    });
    dismiss(popup.id, popup.cookieDuration ?? 1);
  };

  const visiblePopups = popups.filter(p => visibleIds.has(p.id));

  return (
    <AnimatePresence>
      {visiblePopups.map(popup => (
        <SinglePopup key={popup.id} popup={popup} onClose={() => handleClose(popup)} />
      ))}
    </AnimatePresence>
  );
}
