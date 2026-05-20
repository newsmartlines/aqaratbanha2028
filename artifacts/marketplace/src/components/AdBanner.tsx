import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { ExternalLink, Megaphone } from "lucide-react";

export interface AdSpot {
  id: number;
  name: string;
  position: string;
  isActive: boolean;
  adType: string;
  title?: string | null;
  subtitle?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  linkTarget?: string | null;
  bgColor?: string | null;
  textColor?: string | null;
  badgeText?: string | null;
  buttonText?: string | null;
  customHtml?: string | null;
}

/* ── Global ad cache (shared across all instances) ─────────────── */
let adsCache: AdSpot[] | null = null;
let adsPromise: Promise<AdSpot[]> | null = null;

async function fetchAds(): Promise<AdSpot[]> {
  if (adsCache) return adsCache;
  if (!adsPromise) {
    adsPromise = fetch("/api/ads", { credentials: "include" })
      .then(r => r.json())
      .then(j => { adsCache = j.data ?? []; return adsCache!; })
      .catch(() => { adsCache = []; return []; });
  }
  return adsPromise;
}

/* ── Track impression / click ───────────────────────────────────── */
function trackImpression(id: number) {
  fetch(`/api/ads/${id}/impression`, { method: "POST", credentials: "include" }).catch(() => {});
}
function trackClick(id: number) {
  fetch(`/api/ads/${id}/click`, { method: "POST", credentials: "include" }).catch(() => {});
}

/* ── AdBanner component ─────────────────────────────────────────── */
interface AdBannerProps {
  position: string;
  className?: string;
}

export function AdBanner({ position, className = "" }: AdBannerProps) {
  const tracked = useRef(false);

  const { data: ads = [] } = useQuery<AdSpot[]>({
    queryKey: ["ads-public"],
    queryFn: fetchAds,
    staleTime: 5 * 60_000,
  });

  const ad = ads.find(a => a.position === position && a.isActive);

  useEffect(() => {
    if (ad && !tracked.current) {
      tracked.current = true;
      trackImpression(ad.id);
    }
  }, [ad]);

  if (!ad) return null;

  /* Custom HTML ad */
  if (ad.customHtml) {
    return (
      <div
        className={`w-full overflow-hidden rounded-2xl ${className}`}
        dangerouslySetInnerHTML={{ __html: ad.customHtml }}
      />
    );
  }

  const bg = ad.bgColor || "#0d9488";
  const fg = ad.textColor || "#ffffff";
  const isBox = ad.adType === "box";
  const isNative = ad.adType === "native";

  /* Native (inline card) */
  if (isNative) {
    return (
      <div
        className={`relative w-full overflow-hidden rounded-2xl border border-dashed cursor-pointer group transition-all duration-300 hover:shadow-lg ${className}`}
        style={{ borderColor: bg + "60", background: bg + "08" }}
        onClick={() => {
          trackClick(ad.id);
          if (ad.linkUrl && ad.linkUrl !== "#") window.open(ad.linkUrl, ad.linkTarget || "_blank");
        }}
        dir="rtl"
      >
        {/* Sponsored badge */}
        <span
          className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full z-10"
          style={{ background: bg, color: fg }}
        >
          {ad.badgeText || "إعلان"}
        </span>

        <div className="flex items-center gap-4 p-4">
          {/* Icon or image */}
          {ad.imageUrl ? (
            <img src={ad.imageUrl} alt="" className="w-16 h-16 rounded-xl object-cover shrink-0 shadow-sm" />
          ) : (
            <div className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: bg }}>
              <Megaphone className="w-7 h-7" style={{ color: fg }} />
            </div>
          )}
          <div className="flex-1 min-w-0">
            {ad.title && <p className="font-bold text-slate-800 text-sm line-clamp-1">{ad.title}</p>}
            {ad.subtitle && <p className="text-slate-500 text-xs line-clamp-2 mt-0.5">{ad.subtitle}</p>}
          </div>
          {ad.buttonText && (
            <span
              className="shrink-0 text-xs font-bold px-4 py-2 rounded-xl transition-opacity group-hover:opacity-90"
              style={{ background: bg, color: fg }}
            >
              {ad.buttonText}
            </span>
          )}
        </div>
      </div>
    );
  }

  /* Box (300×250 style) */
  if (isBox) {
    return (
      <div
        className={`relative w-full overflow-hidden rounded-2xl cursor-pointer group transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5 ${className}`}
        style={{ background: bg }}
        onClick={() => {
          trackClick(ad.id);
          if (ad.linkUrl && ad.linkUrl !== "#") window.open(ad.linkUrl, ad.linkTarget || "_blank");
        }}
        dir="rtl"
      >
        {/* Sponsored badge */}
        <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: "rgba(0,0,0,0.25)", color: fg }}>
          {ad.badgeText || "إعلان مدفوع"}
        </span>

        {ad.imageUrl ? (
          <img src={ad.imageUrl} alt="" className="w-full h-40 object-cover" />
        ) : (
          <div className="w-full h-32 flex items-center justify-center opacity-20">
            <Megaphone className="w-20 h-20" style={{ color: fg }} />
          </div>
        )}

        <div className="p-4 pb-5">
          {ad.title && (
            <p className="font-extrabold text-lg leading-tight mb-1" style={{ color: fg }}>{ad.title}</p>
          )}
          {ad.subtitle && (
            <p className="text-sm opacity-80 mb-3 line-clamp-2" style={{ color: fg }}>{ad.subtitle}</p>
          )}
          {ad.buttonText && (
            <span
              className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl transition-all group-hover:scale-105"
              style={{ background: "rgba(255,255,255,0.2)", color: fg, backdropFilter: "blur(4px)" }}
            >
              {ad.buttonText} <ExternalLink className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>
    );
  }

  /* Leaderboard / Banner (full width) */
  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl cursor-pointer group transition-all duration-300 hover:shadow-xl hover:scale-[1.005] ${className}`}
      style={{ background: bg }}
      onClick={() => {
        trackClick(ad.id);
        if (ad.linkUrl && ad.linkUrl !== "#") window.open(ad.linkUrl, ad.linkTarget || "_blank");
      }}
      dir="rtl"
    >
      {/* Decorative circles */}
      <div className="absolute -left-10 -top-10 w-48 h-48 rounded-full opacity-10" style={{ background: fg }} />
      <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full opacity-10" style={{ background: fg }} />

      {/* Sponsored badge */}
      <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-0.5 rounded-full z-10"
        style={{ background: "rgba(0,0,0,0.2)", color: fg }}>
        {ad.badgeText || "إعلان مدفوع"}
      </span>

      <div className="relative z-10 flex items-center gap-5 px-6 py-5">
        {/* Image */}
        {ad.imageUrl && (
          <div className="hidden sm:block shrink-0">
            <img src={ad.imageUrl} alt="" className="h-16 w-16 rounded-xl object-cover shadow-md" />
          </div>
        )}
        {!ad.imageUrl && (
          <div className="hidden sm:flex shrink-0 w-12 h-12 rounded-xl items-center justify-center"
            style={{ background: "rgba(255,255,255,0.15)" }}>
            <Megaphone className="w-6 h-6" style={{ color: fg }} />
          </div>
        )}

        {/* Text */}
        <div className="flex-1 min-w-0">
          {ad.title && (
            <p className="font-extrabold text-xl leading-tight" style={{ color: fg }}>{ad.title}</p>
          )}
          {ad.subtitle && (
            <p className="text-sm opacity-80 mt-0.5 line-clamp-1" style={{ color: fg }}>{ad.subtitle}</p>
          )}
        </div>

        {/* CTA button */}
        {ad.buttonText && (
          <span
            className="shrink-0 hidden sm:inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl transition-all group-hover:scale-105"
            style={{ background: "rgba(255,255,255,0.2)", color: fg, backdropFilter: "blur(4px)", border: `1px solid rgba(255,255,255,0.3)` }}
          >
            {ad.buttonText}
            <ExternalLink className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}
