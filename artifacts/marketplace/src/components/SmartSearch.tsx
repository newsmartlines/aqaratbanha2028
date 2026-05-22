import { useState, useEffect, useLayoutEffect, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import {
  Search, Clock, TrendingUp, MapPin, Building2, Tag, X, Loader2,
} from "lucide-react";
import { api } from "@/lib/api";

// ── Types ──────────────────────────────────────────────────────────────────
type TrendingItem = { type: "trending"; text: string };
type RecentItem   = { type: "recent";   text: string };
type CityItem     = { type: "city";     id: number; nameAr: string };
type AreaItem     = { type: "area";     id: number; nameAr: string };
type CategoryItem = { type: "category"; id: number; nameAr: string; slug: string; categoryType?: string };
type PropertyItem = { type: "property"; id: number; title: string; listingType: string; mainCategory: string };
type SuggestionItem = TrendingItem | RecentItem | CityItem | AreaItem | CategoryItem | PropertyItem;

// ── localStorage helpers ───────────────────────────────────────────────────
const RECENT_KEY = "smart-search-recent";
const MAX_RECENT = 5;
function getRecent(): string[] {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY) ?? "[]"); } catch { return []; }
}
function addRecent(text: string) {
  const list = getRecent().filter(t => t !== text);
  localStorage.setItem(RECENT_KEY, JSON.stringify([text, ...list].slice(0, MAX_RECENT)));
}
function removeRecentItem(text: string) {
  localStorage.setItem(RECENT_KEY, JSON.stringify(getRecent().filter(t => t !== text)));
}

// ── Highlight matched text ─────────────────────────────────────────────────
function Highlight({ text, query }: { text: string; query: string }) {
  if (!query) return <>{text}</>;
  const lower = text.toLowerCase();
  const idx = lower.indexOf(query.toLowerCase());
  if (idx < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-primary/20 text-primary font-bold not-italic rounded-sm px-0.5">
        {text.slice(idx, idx + query.length)}
      </mark>
      {text.slice(idx + query.length)}
    </>
  );
}

// ── Section header ────────────────────────────────────────────────────────
function SectionHeader({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest bg-gray-50 border-b border-gray-100/80">
      {icon}
      {label}
    </div>
  );
}

// ── Row item ───────────────────────────────────────────────────────────────
function Row({
  icon, text, query, badge, active, onClick,
}: {
  icon: React.ReactNode;
  text: string;
  query?: string;
  badge?: { label: string; className: string };
  active: boolean;
  onClick: () => void;
}) {
  return (
    <div
      onMouseDown={e => { e.preventDefault(); onClick(); }}
      className={`flex items-center gap-3 px-4 py-2.5 cursor-pointer transition-colors duration-100
        ${active ? "bg-primary/5" : "hover:bg-gray-50"}`}
    >
      <span className="shrink-0 text-gray-300">{icon}</span>
      <span className="flex-1 text-sm text-gray-800 truncate">
        {query ? <Highlight text={text} query={query} /> : text}
      </span>
      {badge && (
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${badge.className}`}>
          {badge.label}
        </span>
      )}
    </div>
  );
}

// ── Props ──────────────────────────────────────────────────────────────────
export interface SmartSearchProps {
  value: string;
  onChange: (v: string) => void;
  onSearch?: (q: string) => void;
  placeholder?: string;
  variant?: "hero" | "bar";
}

// ── Component ──────────────────────────────────────────────────────────────
export function SmartSearch({
  value,
  onChange,
  onSearch,
  placeholder = "ابحث عن منطقة أو نوع عقار أو مشروع...",
  variant = "bar",
}: SmartSearchProps) {
  const [, setLocation] = useLocation();
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [debouncedQ, setDebouncedQ] = useState("");

  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef  = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLInputElement>(null);
  const [dropdownRect, setDropdownRect] = useState<DOMRect | null>(null);

  useEffect(() => { if (open) setRecentSearches(getRecent()); }, [open]);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(value), 280);
    return () => clearTimeout(id);
  }, [value]);

  useEffect(() => { setActiveIdx(-1); }, [debouncedQ]);

  // Track container position for the portal dropdown
  useLayoutEffect(() => {
    if (!open) return;
    const update = () => {
      if (containerRef.current) setDropdownRect(containerRef.current.getBoundingClientRect());
    };
    update();
    window.addEventListener("scroll", update, true);
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update, true);
      window.removeEventListener("resize", update);
    };
  }, [open]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node;
      const inContainer = containerRef.current?.contains(target);
      const inDropdown  = dropdownRef.current?.contains(target);
      if (!inContainer && !inDropdown) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ["search-suggestions", debouncedQ],
    queryFn: () => api.search.suggestions(debouncedQ),
    enabled: open,
    staleTime: 30_000,
    gcTime: 60_000,
  });

  const isTyping = debouncedQ.length >= 1;

  const flatItems: SuggestionItem[] = [];
  if (!isTyping) {
    recentSearches.forEach(t => flatItems.push({ type: "recent", text: t }));
    (data?.trending ?? []).forEach(t => flatItems.push({ type: "trending", text: t.text }));
    (data?.cities ?? []).forEach(c => flatItems.push({ type: "city", id: c.id, nameAr: c.nameAr }));
    (data?.areas ?? []).forEach(a => flatItems.push({ type: "area", id: a.id, nameAr: a.nameAr }));
  } else {
    (data?.trending ?? []).forEach(t => flatItems.push({ type: "trending", text: t.text }));
    (data?.cities ?? []).forEach(c => flatItems.push({ type: "city", id: c.id, nameAr: c.nameAr }));
    (data?.areas ?? []).forEach(a => flatItems.push({ type: "area", id: a.id, nameAr: a.nameAr }));
    (data?.categories ?? []).forEach(c => flatItems.push({
      type: "category", id: c.id, nameAr: c.nameAr, slug: c.slug, categoryType: c.categoryType,
    }));
    (data?.properties ?? []).forEach(p => flatItems.push({
      type: "property", id: p.id, title: p.title, listingType: p.listingType, mainCategory: p.mainCategory,
    }));
  }

  const handleSelect = useCallback((item: SuggestionItem) => {
    const text =
      item.type === "recent" || item.type === "trending" ? item.text
      : item.type === "property" ? item.title
      : item.nameAr;

    addRecent(text);
    onChange(text);
    setOpen(false);
    setRecentSearches(getRecent());

    switch (item.type) {
      case "property":
        setLocation(`/property/${item.id}`);
        break;
      case "city":
        setLocation(`/properties?city=${encodeURIComponent(item.nameAr)}`);
        break;
      case "area":
        setLocation(`/properties?district=${encodeURIComponent(item.nameAr)}`);
        break;
      case "category":
        setLocation(`/properties?mainCategory=${item.slug}`);
        break;
      case "trending":
      case "recent":
        if (onSearch) onSearch(item.text);
        else setLocation(`/properties?q=${encodeURIComponent(item.text)}`);
        break;
    }
  }, [onChange, onSearch, setLocation]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "ArrowDown") { setOpen(true); return; }
      if (e.key === "Enter") { onSearch?.(value); return; }
      return;
    }
    switch (e.key) {
      case "Escape":
        setOpen(false); setActiveIdx(-1); break;
      case "ArrowDown":
        e.preventDefault();
        setActiveIdx(i => Math.min(flatItems.length - 1, i + 1)); break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIdx(i => Math.max(-1, i - 1)); break;
      case "Enter":
        e.preventDefault();
        if (activeIdx >= 0 && flatItems[activeIdx]) {
          handleSelect(flatItems[activeIdx]);
        } else {
          onSearch?.(value);
          setOpen(false);
        }
        break;
    }
  };

  const isEmpty = open && !isLoading && isTyping && flatItems.length === 0;
  const showDropdown = open && (isLoading || flatItems.length > 0 || isEmpty);

  const isHero = variant === "hero";

  return (
    <div ref={containerRef} className={isHero ? "flex-1 relative" : "relative flex-1 min-w-52"}>
      {/* Search icon */}
      <Search className={`absolute top-1/2 -translate-y-1/2 pointer-events-none z-10 text-gray-400
        ${isHero ? "right-4 w-4 h-4 text-muted-foreground" : "right-3.5 w-4 h-4"}`} />

      {/* Input */}
      <input
        ref={inputRef}
        type="text"
        value={value}
        dir="rtl"
        autoComplete="off"
        spellCheck={false}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={e => { onChange(e.target.value); setOpen(true); }}
        onKeyDown={handleKeyDown}
        className={
          isHero
            ? "w-full pr-10 h-12 bg-transparent border-none text-sm focus:outline-none shadow-none text-right placeholder:text-muted-foreground"
            : "w-full pr-10 h-10 rounded-xl border border-gray-200 bg-gray-50 text-sm focus:outline-none focus:bg-white focus:border-primary/40 transition-colors text-right"
        }
      />

      {/* Clear button */}
      {value && (
        <button
          onMouseDown={e => { e.preventDefault(); onChange(""); inputRef.current?.focus(); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-gray-500 transition-colors z-10"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Dropdown — rendered via Portal so it escapes any overflow-hidden ancestor */}
      {showDropdown && dropdownRect && createPortal(
        <div
          ref={dropdownRef}
          className="bg-white border border-gray-200 rounded-2xl shadow-[0_8px_40px_rgba(0,0,0,0.18)] overflow-hidden"
          style={{
            position: "fixed",
            top: dropdownRect.bottom + 6,
            left: dropdownRect.left,
            width: dropdownRect.width,
            maxHeight: 460,
            zIndex: 99999,
            overflowY: "auto",
          }}
        >
          {/* Loading */}
          {isLoading && !data && (
            <div className="flex items-center gap-2 px-4 py-4 text-sm text-gray-400">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              جارٍ البحث...
            </div>
          )}

          {/* Empty */}
          {isEmpty && (
            <div className="flex flex-col items-center gap-3 py-10 text-center">
              <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
                <Search className="w-5 h-5 text-gray-300" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-500">لا توجد نتائج</p>
                <p className="text-xs text-gray-400 mt-1">جرّب كلمة مختلفة أو تصفّح الكل</p>
              </div>
            </div>
          )}

          {/* Results */}
          {!isLoading && !isEmpty && flatItems.length > 0 && (
            <div>

              {/* ── No query: recent + trending chips + popular locations ── */}
              {!isTyping && (
                <>
                  {/* Recent searches */}
                  {recentSearches.length > 0 && (
                    <>
                      <div className="flex items-center justify-between px-4 pt-3 pb-2">
                        <span className="flex items-center gap-1.5 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                          <Clock className="w-3 h-3" />
                          آخر عمليات البحث
                        </span>
                        <button
                          onMouseDown={e => { e.preventDefault(); localStorage.removeItem(RECENT_KEY); setRecentSearches([]); }}
                          className="text-[10px] text-gray-400 hover:text-red-400 transition-colors"
                        >
                          مسح الكل
                        </button>
                      </div>
                      {recentSearches.map((text) => {
                        const idx = flatItems.findIndex(f => f.type === "recent" && f.text === text);
                        return (
                          <div
                            key={text}
                            onMouseDown={e => { e.preventDefault(); handleSelect({ type: "recent", text }); }}
                            className={`flex items-center justify-between gap-2 px-4 py-2.5 cursor-pointer transition-colors
                              ${activeIdx === idx ? "bg-primary/5" : "hover:bg-gray-50"}`}
                          >
                            <div className="flex items-center gap-2.5">
                              <Clock className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                              <span className="text-sm text-gray-700">{text}</span>
                            </div>
                            <button
                              onMouseDown={e => {
                                e.stopPropagation(); e.preventDefault();
                                removeRecentItem(text); setRecentSearches(getRecent());
                              }}
                              className="text-gray-300 hover:text-gray-500 p-0.5 shrink-0"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </div>
                        );
                      })}
                      <div className="my-1 border-t border-gray-100" />
                    </>
                  )}

                  {/* Trending chips */}
                  {(data?.trending ?? []).length > 0 && (
                    <>
                      <SectionHeader icon={<TrendingUp className="w-3 h-3" />} label="الأكثر بحثاً" />
                      <div className="flex flex-wrap gap-2 px-4 py-3">
                        {(data?.trending ?? []).map(t => (
                          <button
                            key={t.text}
                            onMouseDown={e => { e.preventDefault(); handleSelect({ type: "trending", text: t.text }); }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-orange-50 hover:bg-orange-100 text-orange-700 rounded-full text-xs font-semibold transition-all"
                          >
                            <TrendingUp className="w-2.5 h-2.5" />
                            {t.text}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Popular cities */}
                  {(data?.cities ?? []).length > 0 && (
                    <>
                      <SectionHeader icon={<MapPin className="w-3 h-3" />} label="المدن الشائعة" />
                      <div className="flex flex-wrap gap-2 px-4 py-3">
                        {(data?.cities ?? []).map(c => (
                          <button
                            key={c.id}
                            onMouseDown={e => { e.preventDefault(); handleSelect({ type: "city", id: c.id, nameAr: c.nameAr }); }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-full text-xs font-semibold transition-all"
                          >
                            <MapPin className="w-2.5 h-2.5" />
                            {c.nameAr}
                          </button>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Popular areas */}
                  {(data?.areas ?? []).length > 0 && (
                    <>
                      <SectionHeader icon={<MapPin className="w-3 h-3" />} label="الأحياء الشائعة" />
                      <div className="flex flex-wrap gap-2 px-4 py-3 pb-4">
                        {(data?.areas ?? []).map(a => (
                          <button
                            key={a.id}
                            onMouseDown={e => { e.preventDefault(); handleSelect({ type: "area", id: a.id, nameAr: a.nameAr }); }}
                            className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-full text-xs font-semibold transition-all"
                          >
                            {a.nameAr}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </>
              )}

              {/* ── Typing: live grouped results ── */}
              {isTyping && (
                <>
                  {/* Trending suggestions */}
                  {(data?.trending ?? []).length > 0 && (
                    <>
                      <SectionHeader icon={<TrendingUp className="w-3 h-3" />} label="اقتراحات" />
                      {(data!.trending).map(t => {
                        const idx = flatItems.findIndex(f => f.type === "trending" && f.text === t.text);
                        return (
                          <Row
                            key={t.text}
                            icon={<TrendingUp className="w-3.5 h-3.5 text-orange-400" />}
                            text={t.text}
                            query={debouncedQ}
                            active={activeIdx === idx}
                            onClick={() => handleSelect({ type: "trending", text: t.text })}
                          />
                        );
                      })}
                    </>
                  )}

                  {/* Cities */}
                  {(data?.cities ?? []).length > 0 && (
                    <>
                      <SectionHeader icon={<MapPin className="w-3 h-3" />} label="المدن" />
                      {(data!.cities).map(c => {
                        const idx = flatItems.findIndex(f => f.type === "city" && f.id === c.id);
                        return (
                          <Row
                            key={c.id}
                            icon={<MapPin className="w-3.5 h-3.5 text-blue-400" />}
                            text={c.nameAr}
                            query={debouncedQ}
                            badge={{ label: "مدينة", className: "bg-blue-100 text-blue-600" }}
                            active={activeIdx === idx}
                            onClick={() => handleSelect({ type: "city", id: c.id, nameAr: c.nameAr })}
                          />
                        );
                      })}
                    </>
                  )}

                  {/* Areas */}
                  {(data?.areas ?? []).length > 0 && (
                    <>
                      <SectionHeader icon={<MapPin className="w-3 h-3" />} label="الأحياء والمناطق" />
                      {(data!.areas).map(a => {
                        const idx = flatItems.findIndex(f => f.type === "area" && f.id === a.id);
                        return (
                          <Row
                            key={a.id}
                            icon={<MapPin className="w-3.5 h-3.5 text-emerald-400" />}
                            text={a.nameAr}
                            query={debouncedQ}
                            badge={{ label: "حي", className: "bg-emerald-100 text-emerald-600" }}
                            active={activeIdx === idx}
                            onClick={() => handleSelect({ type: "area", id: a.id, nameAr: a.nameAr })}
                          />
                        );
                      })}
                    </>
                  )}

                  {/* Categories */}
                  {(data?.categories ?? []).length > 0 && (
                    <>
                      <SectionHeader icon={<Tag className="w-3 h-3" />} label="أنواع العقارات" />
                      {(data!.categories).map(c => {
                        const idx = flatItems.findIndex(f => f.type === "category" && f.id === c.id);
                        return (
                          <Row
                            key={c.id}
                            icon={<Tag className="w-3.5 h-3.5 text-purple-400" />}
                            text={c.nameAr}
                            query={debouncedQ}
                            badge={{ label: "تصنيف", className: "bg-purple-100 text-purple-600" }}
                            active={activeIdx === idx}
                            onClick={() => handleSelect({ type: "category", id: c.id, nameAr: c.nameAr, slug: c.slug, categoryType: c.categoryType })}
                          />
                        );
                      })}
                    </>
                  )}

                  {/* Properties */}
                  {(data?.properties ?? []).length > 0 && (
                    <>
                      <SectionHeader icon={<Building2 className="w-3 h-3" />} label="العقارات" />
                      {(data!.properties).map(p => {
                        const idx = flatItems.findIndex(f => f.type === "property" && f.id === p.id);
                        const badge = p.listingType === "sale"
                          ? { label: "للبيع", className: "bg-emerald-100 text-emerald-700" }
                          : { label: "للإيجار", className: "bg-blue-100 text-blue-700" };
                        return (
                          <Row
                            key={p.id}
                            icon={<Building2 className="w-3.5 h-3.5 text-primary" />}
                            text={p.title}
                            query={debouncedQ}
                            badge={badge}
                            active={activeIdx === idx}
                            onClick={() => handleSelect({ type: "property", id: p.id, title: p.title, listingType: p.listingType, mainCategory: p.mainCategory })}
                          />
                        );
                      })}
                    </>
                  )}
                </>
              )}
            </div>
          )}

          {/* Footer hint */}
          <div className="flex items-center justify-between px-4 py-1.5 border-t border-gray-100 bg-gray-50/80">
            <span className="text-[10px] text-gray-300">↑↓ تنقل · Enter اختيار · Esc إغلاق</span>
            <span className="text-[10px] text-gray-300 flex items-center gap-1">
              <Search className="w-2.5 h-2.5" />
              البحث الذكي
            </span>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
