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
 * All variants are WebP.  AVIF would be ideal but its encoding is significantly
 * slower and sharp's AVIF support requires libvips ≥ 8.11.  WebP achieves
 * 25-35 % smaller files vs JPEG at equivalent perceived quality and is
 * universally supported.
 */

import sharp from "sharp";
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
 * Returns true if the buffer starts with a known image signature.
 */
export function isValidImageBuffer(buffer: Buffer): boolean {
  return SIGNATURES.some(fn => fn(buffer));
}

/**
 * Process a raw image buffer into WebP variants saved to `destDir`.
 *
 * @param buffer     Raw uploaded file bytes (from multer memoryStorage).
 * @param destDir    Absolute path to the target uploads sub-directory.
 * @param urlPrefix  URL prefix for the generated paths, e.g. `/uploads/properties`.
 * @param baseName   Filename without extension (typically a 32-char hex string).
 */
export async function processImage(
  buffer:    Buffer,
  destDir:   string,
  urlPrefix: string,
  baseName:  string,
): Promise<ProcessedImage> {
  // Ensure destination directory exists
  fs.mkdirSync(destDir, { recursive: true });

  const originalBytes = buffer.length;

  // Decode once — sharp pipeline is lazy, so this is cheap
  // .rotate() with no args applies EXIF orientation and strips the tag (EXIF removal)
  const pipeline = sharp(buffer, { failOn: "truncated" })
    .rotate()                  // auto-orient & remove EXIF rotation tag
    .withMetadata({ exif: {} }); // strip all EXIF/IPTC/XMP metadata

  // Read dimensions from the auto-oriented image
  const meta = await pipeline.clone().metadata();
  const width  = meta.width  ?? 0;
  const height = meta.height ?? 0;

  // Generate all variants
  let webpBytes = 0;
  const urls: Record<string, string> = {};

  await Promise.all(
    VARIANTS.map(async ({ suffix, width: maxWidth, quality }) => {
      const filename = `${baseName}${suffix}.webp`;
      const destPath = path.join(destDir, filename);

      const clone = pipeline.clone();

      // Only resize if the image is wider than the target; never upscale
      if (width > maxWidth) {
        clone.resize({ width: maxWidth, withoutEnlargement: true });
      }

      const webpBuffer = await clone
        .webp({ quality, effort: 4, smartSubsample: true })
        .toBuffer();

      fs.writeFileSync(destPath, webpBuffer);

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
