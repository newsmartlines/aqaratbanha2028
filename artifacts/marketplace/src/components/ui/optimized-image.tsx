/**
 * OptimizedImage — responsive, lazy-loaded <picture> component.
 *
 * When the src is a hashed WebP from our upload pipeline (e.g. /uploads/…/abc123.webp),
 * it auto-constructs a srcset from the three responsive variants (_thumb, _md, _lg)
 * for optimal bandwidth usage across device sizes.
 *
 * For legacy URLs or external images, it falls back to a plain <img>.
 *
 * Usage:
 *   <OptimizedImage src={mediaUrl(property.images[0])} alt="Property" className="w-full h-48 object-cover" />
 *   <OptimizedImage src={mediaUrl(user.avatar)} alt="Avatar" sizes="64px" priority />
 */

import { useState } from "react";

const DEFAULT_FALLBACK =
  "https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=800&q=80";

interface ImageVariants {
  thumb:  string;
  medium: string;
  large:  string;
}

/**
 * Derive WebP variant URLs from a master `/uploads/…/hash.webp` URL.
 * Returns null for external, legacy, or non-WebP URLs.
 */
function deriveVariants(src: string): ImageVariants | null {
  // Must be one of our hashed upload paths and end in .webp
  if (!src.match(/\/uploads\/[^/]+\/[a-f0-9]{32}\.webp$/)) return null;
  const base = src.replace(/\.webp$/, "");
  return {
    thumb:  `${base}_thumb.webp`,
    medium: `${base}_md.webp`,
    large:  `${base}_lg.webp`,
  };
}

export interface OptimizedImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, "src" | "loading"> {
  /** Resolved image URL (pass through mediaUrl() first). */
  src: string | null | undefined;
  alt: string;
  /**
   * Sizes attribute for the browser's layout-based source selection.
   * Defaults to a reasonable responsive heuristic.
   */
  sizes?: string;
  /**
   * When true, sets loading="eager" and fetchpriority="high".
   * Use for the first visible image (LCP candidate).
   */
  priority?: boolean;
  loading?: "lazy" | "eager";
  fallback?: string;
}

export function OptimizedImage({
  src,
  alt,
  sizes = "(max-width: 480px) 400px, (max-width: 1024px) 900px, 1600px",
  priority = false,
  loading = "lazy",
  fallback = DEFAULT_FALLBACK,
  className,
  onError,
  ...rest
}: OptimizedImageProps) {
  const [errored, setErrored] = useState(false);

  const resolvedSrc = src && !errored ? src : fallback;
  const variants    = !errored && src ? deriveVariants(resolvedSrc) : null;

  const handleError: React.ReactEventHandler<HTMLImageElement> = (e) => {
    setErrored(true);
    onError?.(e);
  };

  return (
    <picture>
      {variants && (
        <source
          type="image/webp"
          srcSet={`${variants.thumb} 400w, ${variants.medium} 900w, ${variants.large} 1600w`}
          sizes={sizes}
        />
      )}
      <img
        src={resolvedSrc}
        alt={alt}
        loading={priority ? "eager" : loading}
        decoding="async"
        fetchPriority={priority ? "high" : undefined}
        className={className}
        onError={handleError}
        {...rest}
      />
    </picture>
  );
}
