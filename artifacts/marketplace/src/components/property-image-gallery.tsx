import { useState, useRef, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

const FALLBACK_IMG = "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80";

interface PropertyImageGalleryProps {
  images: string[];
  alt: string;
  fallback?: string;
  className?: string;
  children?: React.ReactNode;
}

export function PropertyImageGallery({
  images,
  alt,
  fallback = FALLBACK_IMG,
  className = "",
  children,
}: PropertyImageGalleryProps) {
  const imgs = images.length > 0 ? images : [fallback];
  const count = imgs.length;
  const single = count <= 1;

  const [idx, setIdx] = useState(0);
  const [hovered, setHovered] = useState(false);
  const touchStartX = useRef<number | null>(null);
  const touchStartY = useRef<number | null>(null);

  const prev = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx(i => Math.max(0, i - 1));
  }, []);

  const next = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    setIdx(i => Math.min(count - 1, i + 1));
  }, [count]);

  const goTo = useCallback((e: React.MouseEvent, i: number) => {
    e.stopPropagation();
    setIdx(i);
  }, []);

  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - (touchStartY.current ?? 0);
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0 && idx < count - 1) setIdx(i => i + 1);
      if (dx > 0 && idx > 0) setIdx(i => i - 1);
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const visibleDots = Math.min(count, 4);

  const dotToImgIdx = (dot: number): number => {
    if (count <= 4) return dot;
    const start = Math.min(Math.max(idx - 1, 0), count - 4);
    return dot === 3 ? count - 1 : start + dot;
  };

  const activeDot = (dot: number): boolean => dotToImgIdx(dot) === idx;

  const showPrev = !single && idx > 0;
  const showNext = !single && idx < count - 1;

  return (
    <div
      dir="ltr"
      className={`relative overflow-hidden bg-gray-100 select-none ${className}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {imgs.map((src, i) => (
        <div
          key={i}
          aria-hidden={i !== idx}
          className="absolute inset-0 transition-transform duration-500 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] will-change-transform"
          style={{ transform: `translateX(${(i - idx) * 100}%)` }}
        >
          <img
            src={src}
            alt={i === 0 ? alt : `${alt} — صورة ${i + 1}`}
            loading={i === 0 ? "eager" : "lazy"}
            decoding="async"
            className="w-full h-full object-cover"
            onError={e => { e.currentTarget.src = fallback; }}
          />
        </div>
      ))}

      {!single && (
        <>
          <button
            onClick={prev}
            aria-label="صورة سابقة"
            className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/92 backdrop-blur-sm shadow-lg flex items-center justify-center text-gray-800 transition-all duration-200
              ${showPrev && hovered ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"}`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={next}
            aria-label="صورة تالية"
            className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/92 backdrop-blur-sm shadow-lg flex items-center justify-center text-gray-800 transition-all duration-200
              ${showNext && hovered ? "opacity-100 scale-100" : "opacity-0 scale-75 pointer-events-none"}`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <div
            className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1"
          >
            {Array.from({ length: visibleDots }, (_, dot) => (
              <button
                key={dot}
                onClick={e => goTo(e, dotToImgIdx(dot))}
                className={`rounded-full transition-all duration-200 ${activeDot(dot) ? "w-4 h-1.5 bg-white shadow" : "w-1.5 h-1.5 bg-white/60 hover:bg-white/90"}`}
              />
            ))}
          </div>
        </>
      )}

      {children}
    </div>
  );
}
