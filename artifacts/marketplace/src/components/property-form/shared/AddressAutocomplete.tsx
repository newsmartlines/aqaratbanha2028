import { useState, useRef, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { MapPin, Loader2, X } from "lucide-react";

interface Suggestion {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    road?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    state?: string;
  };
}

interface AddressAutocompleteProps {
  id?: string;
  placeholder?: string;
  value: string;
  onChange: (val: string) => void;
  onSelect: (lat: number, lng: number, displayName: string) => void;
  className?: string;
}

function formatDisplay(s: Suggestion): string {
  const parts = s.display_name.split(",");
  return parts.slice(0, 4).join("،").trim();
}

export function AddressAutocomplete({
  id,
  placeholder = "ابحث عن عنوان...",
  value,
  onChange,
  onSelect,
  className = "",
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const search = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    try {
      const params = new URLSearchParams({
        q: `${q} بنها القليوبية مصر`,
        format: "json",
        limit: "6",
        countrycodes: "eg",
        "accept-language": "ar",
        addressdetails: "1",
      });
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?${params}`,
        { headers: { "Accept-Language": "ar" } }
      );
      if (!res.ok) throw new Error("fetch failed");
      const data: Suggestion[] = await res.json();
      setSuggestions(data);
      setOpen(data.length > 0);
      setActiveIdx(-1);
    } catch {
      setSuggestions([]);
      setOpen(false);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    onChange(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 400);
  };

  const handleSelect = (s: Suggestion) => {
    const label = formatDisplay(s);
    onChange(label);
    onSelect(parseFloat(s.lat), parseFloat(s.lon), label);
    setSuggestions([]);
    setOpen(false);
    setActiveIdx(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && activeIdx >= 0) {
      e.preventDefault();
      handleSelect(suggestions[activeIdx]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const clearValue = () => {
    onChange("");
    setSuggestions([]);
    setOpen(false);
    inputRef.current?.focus();
  };

  return (
    <div ref={containerRef} className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onFocus={() => suggestions.length > 0 && setOpen(true)}
          placeholder={placeholder}
          className={`h-11 rounded-xl ps-10 pe-9 ${className}`}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={open}
        />
        <MapPin className="absolute end-3 top-1/2 -translate-y-1/2 w-4 h-4 text-teal-500 pointer-events-none" />
        {loading && (
          <Loader2 className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground animate-spin" />
        )}
        {!loading && value && (
          <button
            type="button"
            onClick={clearValue}
            className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
            tabIndex={-1}
          >
            <X className="w-4 h-4" />
          </button>
        )}
        {!loading && !value && (
          <span className="absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none">
            <MapPin className="w-4 h-4 text-muted-foreground" />
          </span>
        )}
      </div>

      {open && suggestions.length > 0 && (
        <ul
          role="listbox"
          className="absolute z-[9999] mt-1 w-full bg-background border border-border rounded-xl shadow-lg overflow-hidden max-h-64 overflow-y-auto"
        >
          {suggestions.map((s, i) => (
            <li
              key={s.place_id}
              role="option"
              aria-selected={i === activeIdx}
              onMouseDown={() => handleSelect(s)}
              onMouseEnter={() => setActiveIdx(i)}
              className={`flex items-start gap-2.5 px-3 py-2.5 cursor-pointer text-sm transition-colors ${
                i === activeIdx
                  ? "bg-teal-50 text-teal-800"
                  : "hover:bg-secondary/60 text-foreground"
              }`}
            >
              <MapPin className="w-4 h-4 mt-0.5 shrink-0 text-teal-500" />
              <span className="leading-snug" dir="auto">
                {formatDisplay(s)}
              </span>
            </li>
          ))}
          <li className="px-3 py-1.5 text-[10px] text-muted-foreground border-t border-border/50 text-center">
            © OpenStreetMap contributors
          </li>
        </ul>
      )}
    </div>
  );
}
