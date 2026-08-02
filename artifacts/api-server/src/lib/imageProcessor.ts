/**
 * Image processing pipeline — converts uploads to WebP, generates responsive
 * variants, strips EXIF metadata, and compresses without noticeable quality loss.
 *
 * Variants produced for every upload:
 *   {hash}.webp          — full-size master (≤ 2048 px wide, q85)
 *   {hash}_lg.webp       — large  (≤ 1600 px wide, q85)
 *   {hash}_md.webp       — medium (≤  900 px wide, q82)
 *   {hash}_thumb.webp    — thumb  (≤  400 px wide, q80)
 *
 * All variants are WebP.
 *
 * Watermark support: pass an optional `WatermarkConfig` to `processImage`.
 * Text watermarks are rendered via SVG composite; image watermarks are composited
 * directly from a saved file with opacity applied via raw alpha-channel manipulation.
 */

import sharp from "sharp";
import type { OverlayOptions } from "sharp";
import path from "path";
import fs from "fs";

// ── Configuration ────────────────────────────────────────────────────────────

const VARIANTS = [
  { suffix: "",       width: 2048, quality: 85 },   // master / original
  { suffix: "_lg",   width: 1600, quality: 85 },
  { suffix: "_md",   width:  900, quality: 82 },
  { suffix: "_thumb",width:  400, quality: 80 },
] as const;

/** Magic-byte signatures we accept (GIF is intentionally allowed — converted to WebP). */
const SIGNATURES: Array<(b: Buffer) => boolean> = [
  // JPEG: FF D8 FF
  b => b.length >= 3 && b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF,
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  b => b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47
                     && b[4] === 0x0D && b[5] === 0x0A && b[6] === 0x1A && b[7] === 0x0A,
  // WebP: RIFF????WEBP
  b => b.length >= 12 && b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46
                      && b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50,
  // GIF: GIF87a / GIF89a
  b => b.length >= 4 && b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38,
  // AVIF / HEIF: ftyp box at offset 4 with "avif" or "heic"
  b => b.length >= 12 && (
    (b[4] === 0x66 && b[5] === 0x74 && b[6] === 0x79 && b[7] === 0x70) &&
    ((b[8] === 0x61 && b[9] === 0x76 && b[10] === 0x69 && b[11] === 0x66) ||
     (b[8] === 0x68 && b[9] === 0x65 && b[10] === 0x69 && b[11] === 0x63))
  ),
];

// ── Watermark types ──────────────────────────────────────────────────────────

export type WatermarkPosition =
  | "top-right" | "top-center" | "top-left"
  | "middle-right" | "center" | "middle-left"
  | "bottom-right" | "bottom-center" | "bottom-left";

export interface WatermarkConfig {
  enabled:    boolean;
  type:       "text" | "image";
  text:       string;
  textColor:  string;  // hex, e.g. "#ffffff"
  fontSize:   number;  // px at 2048-wide reference
  imageUrl:   string;  // relative URL e.g. /uploads/watermarks/abc.webp
  position:   WatermarkPosition;
  opacity:    number;  // 0–100
  scale:      number;  // % of image width (image type)
  padding:    number;  // px at 2048-wide reference
  repeat:     boolean;
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function escapeXml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function getWmCoords(
  pos: WatermarkPosition,
  imgW: number, imgH: number,
  wmW: number,  wmH: number,
  pad: number,
): [number, number] {
  const map: Record<WatermarkPosition, [number, number]> = {
    "top-right":     [imgW - wmW - pad, pad],
    "top-center":    [Math.round((imgW - wmW) / 2), pad],
    "top-left":      [pad, pad],
    "middle-right":  [imgW - wmW - pad, Math.round((imgH - wmH) / 2)],
    "center":        [Math.round((imgW - wmW) / 2), Math.round((imgH - wmH) / 2)],
    "middle-left":   [pad, Math.round((imgH - wmH) / 2)],
    "bottom-right":  [imgW - wmW - pad, imgH - wmH - pad],
    "bottom-center": [Math.round((imgW - wmW) / 2), imgH - wmH - pad],
    "bottom-left":   [pad, imgH - wmH - pad],
  };
  const [x, y] = map[pos] ?? [pad, pad];
  return [
    Math.max(0, Math.min(x, Math.max(0, imgW - wmW))),
    Math.max(0, Math.min(y, Math.max(0, imgH - wmH))),
  ];
}

// ── Text watermark via SVG ───────────────────────────────────────────────────

function buildTextWatermarkSvg(
  wm: WatermarkConfig,
  imgW: number,
  imgH: number,
  scaleRatio: number,
): Buffer {
  const fontSize = Math.max(10, Math.round(wm.fontSize * scaleRatio));
  const padding  = Math.max(4,  Math.round(wm.padding  * scaleRatio));
  const opacity  = Math.min(1, Math.max(0, wm.opacity / 100));
  const bgPad    = Math.max(4, Math.round(8 * scaleRatio));

  // Parse hex color
  const hex = wm.textColor.replace("#", "");
  const cr  = parseInt(hex.slice(0, 2), 16) || 255;
  const cg  = parseInt(hex.slice(2, 4), 16) || 255;
  const cb  = parseInt(hex.slice(4, 6), 16) || 255;

  const escaped = escapeXml(wm.text.trim());

  // Generous width estimate for Arabic chars (~0.85× font size per char)
  const estCharW = fontSize * 0.85;
  const tw = Math.max(60, Math.round(wm.text.trim().length * estCharW));
  const th = Math.round(fontSize * 1.5);

  if (wm.repeat) {
    const gapX = tw + Math.round(80 * scaleRatio);
    const gapY = th + Math.round(60 * scaleRatio);
    let texts = "";
    for (let y = -gapY; y < imgH + gapY; y += gapY) {
      for (let x = -gapX; x < imgW + gapX; x += gapX) {
        const cx = x + tw / 2;
        const cy = y + th / 2;
        texts += `<text x="${cx}" y="${cy}" transform="rotate(-30 ${cx} ${cy})"
          font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="bold"
          fill="rgba(${cr},${cg},${cb},${opacity})" text-anchor="middle"
          dominant-baseline="middle" direction="rtl">${escaped}</text>`;
      }
    }
    return Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${imgW}" height="${imgH}">${texts}</svg>`,
    );
  }

  // Single watermark with dark background rect for contrast
  const boxW = tw + bgPad * 2;
  const boxH = th + bgPad * 2;
  const rx   = Math.max(2, Math.round(5 * scaleRatio));
  const [px, py] = getWmCoords(wm.position, imgW, imgH, boxW, boxH, padding);

  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${imgW}" height="${imgH}">
      <rect x="${px}" y="${py}" width="${boxW}" height="${boxH}" rx="${rx}" fill="rgba(0,0,0,0.5)"/>
      <text x="${px + boxW / 2}" y="${py + boxH / 2}"
        font-family="Arial,sans-serif" font-size="${fontSize}" font-weight="bold"
        fill="rgba(${cr},${cg},${cb},${opacity})" text-anchor="middle"
        dominant-baseline="middle" direction="rtl">${escaped}</text>
    </svg>`,
  );
}

// ── Image watermark ──────────────────────────────────────────────────────────

async function buildImageWatermarkOverlay(
  wm: WatermarkConfig,
  imgW: number,
  imgH: number,
  scaleRatio: number,
): Promise<OverlayOptions | null> {
  if (!wm.imageUrl) return null;

  const uploadsRoot = process.env.UPLOADS_DIR
    ? path.resolve(process.env.UPLOADS_DIR)
    : path.join(process.cwd(), "uploads");

  // /uploads/watermarks/abc.webp → watermarks/abc.webp
  const relPath  = wm.imageUrl.replace(/^\/uploads\//, "").replace(/^\//, "");
  const filePath = path.join(uploadsRoot, relPath);

  if (!fs.existsSync(filePath)) return null;

  try {
    const padding = Math.max(4, Math.round(wm.padding * scaleRatio));
    const wmWidth = Math.max(10, Math.round(imgW * wm.scale / 100));

    const meta    = await sharp(filePath).metadata();
    const origW   = meta.width  || 100;
    const origH   = meta.height || 100;
    const wmHeight = Math.round(wmWidth * origH / origW);

    // Resize + ensure alpha channel then get raw pixels to apply opacity
    const { data, info } = await sharp(filePath)
      .resize(wmWidth, wmHeight, {
        fit: "contain",
        background: { r: 0, g: 0, b: 0, alpha: 0 },
      })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Scale alpha channel by opacity factor
    const factor = Math.min(1, Math.max(0, wm.opacity / 100));
    const channels = info.channels as number;
    for (let i = 3; i < data.length; i += channels) {
      data[i] = Math.round(data[i] * factor);
    }

    const wmBuf = await sharp(data, {
      raw: { width: info.width, height: info.height, channels: channels as 1 | 2 | 3 | 4 },
    })
      .png()
      .toBuffer();

    const [left, top] = wm.repeat
      ? [0, 0] // repeat not supported for image type — fall back to single position
      : getWmCoords(wm.position, imgW, imgH, wmWidth, wmHeight, padding);

    return {
      input: wmBuf,
      left:  Math.max(0, left),
      top:   Math.max(0, top),
      blend: "over",
    };
  } catch {
    return null;
  }
}

// ── Unified overlay builder ──────────────────────────────────────────────────

async function buildWatermarkOverlay(
  wm: WatermarkConfig,
  imgW: number,
  imgH: number,
  scaleRatio: number,
): Promise<OverlayOptions | null> {
  if (wm.type === "text" && wm.text.trim()) {
    return { input: buildTextWatermarkSvg(wm, imgW, imgH, scaleRatio) };
  }
  if (wm.type === "image" && wm.imageUrl) {
    return buildImageWatermarkOverlay(wm, imgW, imgH, scaleRatio);
  }
  return null;
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface ProcessedImage {
  /** Relative URL of the master WebP (stored in DB). */
  url: string;
  /** Responsive variant URLs (serve in <picture> srcset). */
  variants: {
    large:  string;
    medium: string;
    thumb:  string;
  };
  /** Width × height of the original (after EXIF rotation). */
  dimensions: { width: number; height: number };
  /** Original file size in bytes. */
  originalBytes: number;
  /** Master WebP file size in bytes. */
  webpBytes: number;
}

/**
 * Validate that `buffer` contains real image data (magic-bytes check).
 */
export function isValidImageBuffer(buffer: Buffer): boolean {
  return SIGNATURES.some(fn => fn(buffer));
}

/**
 * Process a raw image buffer into WebP variants saved to `destDir`.
 * If a `watermark` config is supplied and enabled, the watermark is
 * composited onto every variant ≥ 200 px wide before WebP encoding.
 */
export async function processImage(
  buffer:    Buffer,
  destDir:   string,
  urlPrefix: string,
  baseName:  string,
  watermark?: WatermarkConfig,
): Promise<ProcessedImage> {
  fs.mkdirSync(destDir, { recursive: true });

  const originalBytes = buffer.length;

  const pipeline = sharp(buffer, { failOn: "truncated" })
    .rotate()
    .withMetadata({ exif: {} });

  const meta   = await pipeline.clone().metadata();
  const width  = meta.width  ?? 0;
  const height = meta.height ?? 0;

  let webpBytes = 0;
  const urls: Record<string, string> = {};

  await Promise.all(
    VARIANTS.map(async ({ suffix, width: maxWidth, quality }) => {
      const clone = pipeline.clone();

      const needsResize = width > maxWidth;
      if (needsResize) {
        clone.resize({ width: maxWidth, withoutEnlargement: true });
      }

      // Actual dimensions of this variant (for watermark sizing)
      const varW = needsResize ? maxWidth : width;
      const varH = needsResize ? Math.round(height * maxWidth / width) : height;
      const scaleRatio = varW / Math.max(width, 1);

      // Apply watermark (only on variants wide enough to be legible)
      if (watermark?.enabled && varW >= 200) {
        try {
          const overlay = await buildWatermarkOverlay(watermark, varW, varH, scaleRatio);
          if (overlay) {
            clone.composite([overlay]);
          }
        } catch {
          // Watermark failure must never block the upload
        }
      }

      const webpBuffer = await clone
        .webp({ quality, effort: 4, smartSubsample: true })
        .toBuffer();

      const filename = `${baseName}${suffix}.webp`;
      fs.writeFileSync(path.join(destDir, filename), webpBuffer);

      urls[suffix] = `${urlPrefix}/${filename}`;
      if (suffix === "") webpBytes = webpBuffer.length;
    }),
  );

  return {
    url:        urls[""],
    variants:   { large: urls["_lg"], medium: urls["_md"], thumb: urls["_thumb"] },
    dimensions: { width, height },
    originalBytes,
    webpBytes,
  };
}
