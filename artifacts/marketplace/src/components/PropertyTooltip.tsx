import {
  useState,
  useRef,
  useEffect,
  useCallback,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { MapPin, Star, BedDouble, Bath, Maximize2, ArrowLeft, Tag } from "lucide-react";
import { useLocation } from "wouter";
import { formatPrice } from "@/lib/format";

export interface TooltipProperty {
  id: number;
  title: string;
  description?: string | null;
  price?: string | number | null;
  listingType?: string | null;
  rentDuration?: string | null;
  district?: string | null;
  address?: string | null;
  mainCategory?: string | null;
  rooms?: number | null;
  bathrooms?: number | null;
  area?: string | number | null;
  rating?: number | null;
  reviewCount?: number | null;
  images?: string | null;
}

interface PropertyTooltipProps {
  property: TooltipProperty;
  children: ReactNode;
  disabled?: boolean;
}

const TOOLTIP_W = 310;
const TOOLTIP_H = 300;
const GAP = 14;

function getImage(images?: string | null): string | null {
  if (!images) return null;
  try {
    const arr: string[] = JSON.parse(images);
    return arr[0] ?? null;
  } catch {
    return null;
  }
}

function Stars({ rating }: { rating: number }) {
  const full = Math.round(rating);
  return (
    <span className="flex items-center gap-0.5" aria-label={`تقييم ${rating} من 5`}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`w-3 h-3 ${i <= full ? "text-amber-400 fill-amber-400" : "text-gray-200 fill-gray-200"}`}
        />
      ))}
      <span className="text-[11px] text-gray-500 mr-0.5">{rating.toFixed(1)}</span>
    </span>
  );
}

export function PropertyTooltip({
  property,
  children,
  disabled = false,
}: PropertyTooltipProps) {
  const [visible, setVisible] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const containerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [, setLoc] = useLocation();

  const calcPosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    let left = rect.right + GAP;
    let top = rect.top + rect.height / 2 - TOOLTIP_H / 2;

    if (left + TOOLTIP_W > vw - 12) {
      left = rect.left - TOOLTIP_W - GAP;
    }
    if (left < 12) {
      left = rect.left + rect.width / 2 - TOOLTIP_W / 2;
      top = rect.bottom + GAP;
      if (top + TOOLTIP_H > vh - 12) {
        top = rect.top - TOOLTIP_H - GAP;
      }
    }

    top = Math.max(12, Math.min(top, vh - TOOLTIP_H - 12));
    left = Math.max(12, Math.min(left, vw - TOOLTIP_W - 12));

    setCoords({ top, left });
  }, []);

  const handleMouseEnter = useCallback(() => {
    if (disabled) return;
    if (hideTimer.current) clearTimeout(hideTimer.current);
    showTimer.current = setTimeout(() => {
      calcPosition();
      setVisible(true);
    }, 130);
  }, [disabled, calcPosition]);

  const handleMouseLeave = useCallback(() => {
    if (showTimer.current) clearTimeout(showTimer.current);
    hideTimer.current = setTimeout(() => setVisible(false), 90);
  }, []);

  const handleTooltipEnter = useCallback(() => {
    if (hideTimer.current) clearTimeout(hideTimer.current);
  }, []);

  const handleTooltipLeave = useCallback(() => {
    hideTimer.current = setTimeout(() => setVisible(false), 90);
  }, []);

  useEffect(() => {
    return () => {
      if (showTimer.current) clearTimeout(showTimer.current);
      if (hideTimer.current) clearTimeout(hideTimer.current);
    };
  }, []);

  const listingLabel =
    property.listingType === "rent" ? "للإيجار" : property.listingType === "sale" ? "للبيع" : null;

  const rentSuffix =
    property.listingType === "rent"
      ? property.rentDuration === "monthly"
        ? "/شهر"
        : property.rentDuration === "yearly"
          ? "/سنة"
          : ""
      : "";

  const priceStr = formatPrice(property.price, rentSuffix);
  const thumb = getImage(property.images);
  const loc = [property.district, property.address].filter(Boolean).join("، ") || null;

  const tooltipNode = visible && (
    <div
      ref={tooltipRef}
      role="tooltip"
      aria-label={property.title}
      onMouseEnter={handleTooltipEnter}
      onMouseLeave={handleTooltipLeave}
      style={{
        position: "fixed",
        top: coords.top,
        left: coords.left,
        width: TOOLTIP_W,
        zIndex: 9999,
        pointerEvents: "auto",
      }}
    >
      <motion.div
        initial={{ opacity: 0, y: 8, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 6, scale: 0.97 }}
        transition={{ duration: 0.18, ease: [0.23, 1, 0.32, 1] }}
        style={{
          background: "rgba(255,255,255,0.97)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRadius: 16,
          border: "1px solid rgba(0,0,0,0.07)",
          boxShadow:
            "0 24px 64px rgba(0,0,0,0.14), 0 8px 24px rgba(0,0,0,0.08), 0 2px 6px rgba(0,0,0,0.05)",
          overflow: "hidden",
          direction: "rtl",
        }}
      >
        {thumb && (
          <div className="relative h-36 overflow-hidden">
            <img
              src={thumb}
              alt={property.title}
              className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-black/10 to-transparent" />
            {listingLabel && (
              <span
                className={`absolute top-2.5 right-2.5 text-[10px] font-bold px-2 py-0.5 rounded-full text-white ${
                  property.listingType === "rent" ? "bg-blue-500" : "bg-emerald-500"
                }`}
              >
                {listingLabel}
              </span>
            )}
            {priceStr !== "—" && (
              <span
                dir="ltr"
                className="absolute bottom-2.5 right-2.5 text-white font-black text-sm drop-shadow-md"
              >
                {priceStr}
              </span>
            )}
          </div>
        )}

        <div className="p-4">
          {!thumb && listingLabel && (
            <span
              className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full text-white mb-2 ${
                property.listingType === "rent" ? "bg-blue-500" : "bg-emerald-500"
              }`}
            >
              {listingLabel}
            </span>
          )}

          <h3 className="font-bold text-gray-900 text-sm leading-snug line-clamp-2 mb-2">
            {property.title}
          </h3>

          {!thumb && priceStr !== "—" && (
            <div className="mb-2.5">
              <span
                dir="ltr"
                className="text-xl font-black text-gray-900 leading-none"
              >
                {priceStr}
              </span>
            </div>
          )}

          {property.description && (
            <p className="text-xs text-gray-500 leading-relaxed line-clamp-2 mb-2.5">
              {property.description}
            </p>
          )}

          <div className="space-y-1.5 mb-3">
            {loc && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <MapPin className="w-3 h-3 text-teal-600 shrink-0" />
                <span className="truncate">{loc}</span>
              </div>
            )}
            {property.mainCategory && (
              <div className="flex items-center gap-1.5 text-xs text-gray-500">
                <Tag className="w-3 h-3 text-teal-600 shrink-0" />
                <span>{property.mainCategory}</span>
              </div>
            )}
          </div>

          {(property.rooms || property.bathrooms || property.area) && (
            <div className="flex items-center gap-3 text-xs text-gray-600 mb-3 flex-wrap">
              {(property.rooms ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <BedDouble className="w-3 h-3 text-gray-400" /> {property.rooms} غرف
                </span>
              )}
              {(property.bathrooms ?? 0) > 0 && (
                <span className="flex items-center gap-1">
                  <Bath className="w-3 h-3 text-gray-400" /> {property.bathrooms} حمام
                </span>
              )}
              {Number(property.area) > 0 && (
                <span className="flex items-center gap-1">
                  <Maximize2 className="w-3 h-3 text-gray-400" />
                  {Number(property.area).toLocaleString("en-US")} م²
                </span>
              )}
            </div>
          )}

          {property.rating != null && property.rating > 0 && (
            <div className="mb-3">
              <Stars rating={property.rating} />
              {property.reviewCount != null && property.reviewCount > 0 && (
                <span className="text-[11px] text-gray-400 mr-1">
                  ({property.reviewCount} تقييم)
                </span>
              )}
            </div>
          )}

          <button
            onClick={(e) => {
              e.stopPropagation();
              setVisible(false);
              setLoc(`/property/${property.id}`);
            }}
            className="w-full flex items-center justify-center gap-2 text-xs font-bold text-white rounded-xl py-2 px-4 transition-all active:scale-95"
            style={{
              background: "linear-gradient(135deg, #0D9488 0%, #0f766e 100%)",
              boxShadow: "0 4px 14px rgba(13,148,136,0.35)",
            }}
            aria-label={`عرض تفاصيل ${property.title}`}
          >
            عرض التفاصيل
            <ArrowLeft className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </div>
  );

  return (
    <div
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{ display: "contents" }}
      aria-describedby={visible ? `tooltip-${property.id}` : undefined}
    >
      {children}
      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>{tooltipNode}</AnimatePresence>,
          document.body,
        )}
    </div>
  );
}
