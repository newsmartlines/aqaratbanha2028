/**
 * AdBanner — Enterprise Ad Rendering Component
 *
 * Supports: banner | html | adsense | admanager | javascript | internal
 * Core Web Vitals optimised: lazy intersection observer, no layout shift,
 * single AdSense script load, GPT async.
 */
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState, memo } from "react";
import { ExternalLink, Megaphone } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────────── */
export interface AdSpot {
  id: number;
  name: string;
  position: string;
  isActive: boolean;
  contentType: string;   // banner|html|adsense|admanager|javascript|internal
  displayType: string;   // leaderboard|box|native
  // Banner / Internal
  title?: string | null;
  subtitle?: string | null;
  imageUrl?: string | null;
  linkUrl?: string | null;
  linkTarget?: string | null;
  bgColor?: string | null;
  textColor?: string | null;
  badgeText?: string | null;
  buttonText?: string | null;
  // HTML
  customHtml?: string | null;
  // JavaScript
  customJs?: string | null;
  // AdSense
  adsensePublisherId?: string | null;
  adsenseSlotId?: string | null;
  adsenseFormat?: string | null;
  adsenseResponsive?: boolean | null;
  // Ad Manager
  admNetworkId?: string | null;
  admUnitId?: string | null;
  admSizes?: string | null;
  // AB
  abTestGroupId?: string | null;
  abTestVariant?: string | null;
}

/* ── Fetch ──────────────────────────────────────────────────────────────── */
async function fetchAds(): Promise<AdSpot[]> {
  const lang = document.documentElement.lang || "ar";
  const r = await fetch(`/api/ads?lang=${lang}`, { credentials: "include" });
  const j = await r.json();
  return j.data ?? [];
}

/* ── Tracking ───────────────────────────────────────────────────────────── */
function track(id: number, type: "impression" | "click", abVariant?: string | null) {
  fetch(`/api/ads/${id}/${type}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ abVariant }),
  }).catch(() => {});
}

/* ── AdSense script loader — singleton, loads once per page ─────────────── */
let adsenseLoaded = false;
function loadAdSense(publisherId: string) {
  if (adsenseLoaded) return;
  adsenseLoaded = true;
  const s = document.createElement("script");
  s.async = true;
  s.crossOrigin = "anonymous";
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${publisherId}`;
  document.head.appendChild(s);
}

/* ── Google Ad Manager GPT script — singleton ───────────────────────────── */
let gptLoaded = false;
function loadGPT() {
  if (gptLoaded) return;
  gptLoaded = true;
  const s = document.createElement("script");
  s.async = true;
  s.src = "https://securepubads.g.doubleclick.net/tag/js/gpt.js";
  document.head.appendChild(s);
}

/* ── AdSense unit ───────────────────────────────────────────────────────── */
const AdSenseUnit = memo(({ ad }: { ad: AdSpot }) => {
  const ref = useRef<HTMLDivElement>(null);
  const pushed = useRef(false);

  useEffect(() => {
    if (!ad.adsensePublisherId || pushed.current) return;
    loadAdSense(ad.adsensePublisherId);
    pushed.current = true;
    // push after script loads (short delay)
    const t = setTimeout(() => {
      try { (window as any).adsbygoogle = (window as any).adsbygoogle || []; (window as any).adsbygoogle.push({}); }
      catch {}
    }, 300);
    return () => clearTimeout(t);
  }, [ad.adsensePublisherId]);

  return (
    <div ref={ref} className="w-full overflow-hidden" style={{ minHeight: 90, contain: "layout" }}>
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "100%", height: "auto" }}
        data-ad-client={ad.adsensePublisherId || ""}
        data-ad-slot={ad.adsenseSlotId || ""}
        data-ad-format={ad.adsenseFormat || "auto"}
        data-full-width-responsive={ad.adsenseResponsive ? "true" : "false"}
      />
    </div>
  );
});

/* ── Google Ad Manager unit ─────────────────────────────────────────────── */
const AdManagerUnit = memo(({ ad }: { ad: AdSpot }) => {
  const divId = `gam-${ad.id}-${ad.admUnitId?.replace(/\//g, "-")}`;
  const defined = useRef(false);

  useEffect(() => {
    if (defined.current || !ad.admNetworkId || !ad.admUnitId) return;
    defined.current = true;
    loadGPT();

    let sizes: [number, number][] = [[300, 250]];
    try { if (ad.admSizes) sizes = JSON.parse(ad.admSizes); } catch {}

    const win = window as any;
    win.googletag = win.googletag || { cmd: [] };
    win.googletag.cmd.push(() => {
      win.googletag.defineSlot(ad.admUnitId, sizes, divId)
        ?.addService(win.googletag.pubads());
      win.googletag.pubads().enableSingleRequest();
      win.googletag.enableServices();
      win.googletag.display(divId);
    });
  }, [ad.admUnitId, divId]);

  return (
    <div
      id={divId}
      className="w-full overflow-hidden"
      style={{ minHeight: 90, contain: "layout" }}
    />
  );
});

/* ── Custom JS unit ─────────────────────────────────────────────────────── */
const CustomJsUnit = memo(({ ad }: { ad: AdSpot }) => {
  const ref = useRef<HTMLDivElement>(null);
  const executed = useRef(false);

  useEffect(() => {
    if (!ref.current || !ad.customJs || executed.current) return;
    executed.current = true;
    try {
      const fn = new Function(ad.customJs);
      fn.call(ref.current);
    } catch (e) {
      console.warn("[AdBanner] Custom JS error:", e);
    }
  }, [ad.customJs]);

  return <div ref={ref} className="w-full overflow-hidden" style={{ minHeight: 50 }} />;
});

/* ── Visual: Native card ────────────────────────────────────────────────── */
function NativeCard({ ad, onClickAd }: { ad: AdSpot; onClickAd: () => void }) {
  const bg = ad.bgColor || "#0d9488";
  const fg = ad.textColor || "#ffffff";
  return (
    <div
      className="relative w-full overflow-hidden rounded-xl border cursor-pointer group transition-colors duration-150 bg-white"
      style={{ borderColor: bg + "50", contain: "layout" }}
      onClick={onClickAd}
      dir="rtl"
    >
      <div className="absolute inset-y-0 right-0 w-1 rounded-l-full" style={{ background: bg }} />
      <span className="absolute top-3 left-3 text-[10px] font-bold px-2 py-0.5 rounded-full z-10"
        style={{ background: bg, color: fg }}>
        {ad.badgeText || "إعلان مميز"}
      </span>
      <div className="flex items-center gap-4 p-4 pr-5">
        {ad.imageUrl ? (
          <img src={ad.imageUrl} alt="" loading="lazy" decoding="async"
            className="w-14 h-14 rounded-xl object-cover shrink-0" width={56} height={56} />
        ) : (
          <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: bg + "15" }}>
            <Megaphone className="w-6 h-6" style={{ color: bg }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {ad.title && <p className="font-bold text-slate-800 text-sm line-clamp-1">{ad.title}</p>}
          {ad.subtitle && <p className="text-slate-500 text-xs line-clamp-2 mt-0.5">{ad.subtitle}</p>}
        </div>
        {ad.buttonText && (
          <span className="shrink-0 text-xs font-bold px-4 py-2 rounded-lg"
            style={{ background: bg + "15", color: bg }}>{ad.buttonText}</span>
        )}
      </div>
    </div>
  );
}

/* ── Visual: Box card ───────────────────────────────────────────────────── */
function BoxCard({ ad, onClickAd }: { ad: AdSpot; onClickAd: () => void }) {
  const bg = ad.bgColor || "#0d9488";
  const fg = ad.textColor || "#ffffff";
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl cursor-pointer group transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
      style={{ background: bg, contain: "layout" }}
      onClick={onClickAd}
      dir="rtl"
    >
      <span className="absolute top-3 right-3 text-[10px] font-bold px-2 py-0.5 rounded-full"
        style={{ background: "rgba(0,0,0,0.25)", color: fg }}>
        {ad.badgeText || "إعلان مدفوع"}
      </span>
      {ad.imageUrl ? (
        <img src={ad.imageUrl} alt="" loading="lazy" decoding="async"
          className="w-full h-40 object-cover" width={300} height={160} />
      ) : (
        <div className="w-full h-32 flex items-center justify-center opacity-20">
          <Megaphone className="w-20 h-20" style={{ color: fg }} />
        </div>
      )}
      <div className="p-4 pb-5">
        {ad.title && <p className="font-extrabold text-lg leading-tight mb-1" style={{ color: fg }}>{ad.title}</p>}
        {ad.subtitle && <p className="text-sm opacity-80 mb-3 line-clamp-2" style={{ color: fg }}>{ad.subtitle}</p>}
        {ad.buttonText && (
          <span className="inline-flex items-center gap-1.5 text-sm font-bold px-4 py-2 rounded-xl"
            style={{ background: "rgba(255,255,255,0.2)", color: fg, backdropFilter: "blur(4px)" }}>
            {ad.buttonText} <ExternalLink className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Visual: Leaderboard ────────────────────────────────────────────────── */
function LeaderboardCard({ ad, onClickAd }: { ad: AdSpot; onClickAd: () => void }) {
  const bg = ad.bgColor || "#0d9488";
  const fg = ad.textColor || "#ffffff";
  return (
    <div
      className="relative w-full overflow-hidden rounded-2xl cursor-pointer group transition-all duration-300 hover:shadow-xl hover:scale-[1.005]"
      style={{ background: bg, contain: "layout" }}
      onClick={onClickAd}
      dir="rtl"
    >
      <div className="absolute -left-10 -top-10 w-48 h-48 rounded-full opacity-10" style={{ background: fg }} />
      <div className="absolute -right-6 -bottom-6 w-32 h-32 rounded-full opacity-10" style={{ background: fg }} />
      <span className="absolute top-3 left-3 text-[10px] font-bold px-2.5 py-0.5 rounded-full z-10"
        style={{ background: "rgba(0,0,0,0.2)", color: fg }}>
        {ad.badgeText || "إعلان مدفوع"}
      </span>
      <div className="relative z-10 flex items-center gap-5 px-6 py-5">
        {ad.imageUrl ? (
          <div className="hidden sm:block shrink-0">
            <img src={ad.imageUrl} alt="" loading="lazy" decoding="async"
              className="h-16 w-16 rounded-xl object-cover shadow-md" width={64} height={64} />
          </div>
        ) : (
          <div className="hidden sm:flex shrink-0 w-12 h-12 rounded-xl items-center justify-center"
            style={{ background: "rgba(255,255,255,0.15)" }}>
            <Megaphone className="w-6 h-6" style={{ color: fg }} />
          </div>
        )}
        <div className="flex-1 min-w-0">
          {ad.title && <p className="font-extrabold text-xl leading-tight" style={{ color: fg }}>{ad.title}</p>}
          {ad.subtitle && <p className="text-sm opacity-80 mt-0.5 line-clamp-1" style={{ color: fg }}>{ad.subtitle}</p>}
        </div>
        {ad.buttonText && (
          <span className="shrink-0 hidden sm:inline-flex items-center gap-2 text-sm font-bold px-5 py-2.5 rounded-xl"
            style={{ background: "rgba(255,255,255,0.2)", color: fg, backdropFilter: "blur(4px)", border: "1px solid rgba(255,255,255,0.3)" }}>
            {ad.buttonText} <ExternalLink className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </div>
  );
}

/* ── Main AdBanner component ────────────────────────────────────────────── */
interface AdBannerProps {
  position: string;
  className?: string;
  listingType?: string;
  categorySlug?: string;
}

export function AdBanner({ position, className = "", listingType, categorySlug }: AdBannerProps) {
  const tracked = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  const { data: ads = [] } = useQuery<AdSpot[]>({
    queryKey: ["ads-public"],
    queryFn: fetchAds,
    staleTime: 5 * 60_000,
    gcTime: 10 * 60_000,
  });

  const ad = ads.find(a => a.position === position);

  // Intersection Observer — only render/track when visible
  useEffect(() => {
    if (!ad) return;
    const el = containerRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); obs.disconnect(); } },
      { threshold: 0.1 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [ad?.id]);

  // Track impression once visible
  useEffect(() => {
    if (visible && ad && !tracked.current) {
      tracked.current = true;
      track(ad.id, "impression", ad.abTestVariant);
    }
  }, [visible, ad]);

  const handleClick = () => {
    if (!ad) return;
    track(ad.id, "click", ad.abTestVariant);
    if (ad.linkUrl && ad.linkUrl !== "#")
      window.open(ad.linkUrl, ad.linkTarget || "_blank", "noopener,noreferrer");
  };

  // Placeholder to reserve layout space even before data loads
  if (!ad) {
    return <div ref={containerRef} className={`w-full ${className}`} style={{ minHeight: 2 }} />;
  }

  const renderContent = () => {
    if (!visible) return null;

    const type = ad.contentType || "banner";

    // ── Google AdSense ──
    if (type === "adsense") {
      return <AdSenseUnit ad={ad} />;
    }

    // ── Google Ad Manager ──
    if (type === "admanager") {
      return <AdManagerUnit ad={ad} />;
    }

    // ── Custom HTML ──
    if (type === "html" && ad.customHtml) {
      return (
        <div
          className="w-full overflow-hidden rounded-2xl"
          dangerouslySetInnerHTML={{ __html: ad.customHtml }}
        />
      );
    }

    // ── Custom JavaScript ──
    if (type === "javascript") {
      return <CustomJsUnit ad={ad} />;
    }

    // ── Banner / Internal (visual types) ──
    const display = ad.displayType || "leaderboard";
    if (display === "native") return <NativeCard ad={ad} onClickAd={handleClick} />;
    if (display === "box") return <BoxCard ad={ad} onClickAd={handleClick} />;
    return <LeaderboardCard ad={ad} onClickAd={handleClick} />;
  };

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden ${className}`}
      style={{ contain: "layout" }}
      aria-label="إعلان"
    >
      {renderContent()}
    </div>
  );
}
