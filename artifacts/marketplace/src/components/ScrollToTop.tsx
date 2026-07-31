import { useState, useEffect } from "react";
import { useLocation } from "wouter";

export function ScrollRestorer() {
  const [location] = useLocation();
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [location]);
  return null;
}

export function ScrollToTopButton() {
  const [visible, setVisible] = useState(false);
  const [pct, setPct] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const scrolled = window.scrollY;
      const total = document.documentElement.scrollHeight - window.innerHeight;
      const p = total > 0 ? Math.round((scrolled / total) * 100) : 0;
      setPct(p);
      setVisible(scrolled > 150);
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const radius = 20;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (pct / 100) * circumference;

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="العودة للأعلى"
      className="fixed z-50 w-14 h-14 rounded-full bg-white shadow-xl border border-gray-200 flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
      style={{ direction: "ltr", bottom: "24px", right: "24px" }}
    >
      <svg width="56" height="56" viewBox="0 0 56 56" className="absolute inset-0 -rotate-90">
        <circle cx="28" cy="28" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="3.5" />
        <circle
          cx="28" cy="28" r={radius}
          fill="none"
          stroke="hsl(var(--primary))"
          strokeWidth="3.5"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.2s ease" }}
        />
      </svg>
      <span className="relative z-10 flex flex-col items-center leading-none">
        <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-primary mb-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 15l-6-6-6 6" />
        </svg>
        <span className="text-[9px] font-bold text-primary tabular-nums">{pct}%</span>
      </span>
    </button>
  );
}
