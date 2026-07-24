import { Router, type Request } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { getSession } from "./auth";
import { processImage, isValidImageBuffer } from "../lib/imageProcessor";

const router = Router();

/* ── Upload directory root ────────────────────────────────────────────────── */
const UPLOADS_ROOT = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(process.cwd(), "uploads");

/* ── PDF / font magic-byte validators ────────────────────────────────────── */

function readHeader(filePath: string, byteCount = 12): Buffer {
  try {
    const fd  = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(byteCount);
    fs.readSync(fd, buf, 0, byteCount, 0);
    fs.closeSync(fd);
    return buf;
  } catch { return Buffer.alloc(0); }
}

function isValidPdf(filePath: string): boolean {
  const b = readHeader(filePath, 5);
  return b.length >= 4 && b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
}

function deleteFile(filePath: string): void {
  fs.unlink(filePath, () => { /* fire-and-forget */ });
}

/* ── In-memory multer (images) ────────────────────────────────────────────── */
// We use memoryStorage so sharp can process the buffer before writing to disk.
// This avoids writing a temp file only to immediately re-read and overwrite it.

const IMAGE_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "image/gif", "image/avif", "image/heic"];

function makeImageUploader(maxMb = 10) {
  return multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxMb * 1024 * 1024, files: 1 },
    fileFilter(_req, file, cb) {
      if (IMAGE_MIME_TYPES.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("نوع الملف غير مدعوم. يُسمح فقط بـ JPG, PNG, WebP, GIF, AVIF"));
      }
    },
  });
}

const avatarUploader        = makeImageUploader(10);
const bannerUploader        = makeImageUploader(10);
const logoUploader          = makeImageUploader(10);
const serviceUploader       = makeImageUploader(10);
const propertyImageUploader = makeImageUploader(10);

/* ── PDF uploader (disk storage — no processing needed) ──────────────────── */
const brochureDir = path.join(UPLOADS_ROOT, "brochures");
fs.mkdirSync(brochureDir, { recursive: true });

const brochureUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, brochureDir),
    filename:    (_req, _file, cb) => cb(null, crypto.randomBytes(16).toString("hex") + ".pdf"),
  }),
  limits:     { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") cb(null, true);
    else cb(new Error("يُسمح فقط بملفات PDF"));
  },
});

/* ── Font uploader (disk storage) ─────────────────────────────────────────── */
const fontDir = path.join(UPLOADS_ROOT, "fonts");
fs.mkdirSync(fontDir, { recursive: true });

const fontUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, fontDir),
    filename(_req, file, cb) {
      const ext = path.extname(file.originalname).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".ttf";
      cb(null, crypto.randomBytes(16).toString("hex") + ext);
    },
  }),
  limits: { fileSize: 5 * 1024 * 1024, files: 1 },
  fileFilter(_req, file, cb) {
    const allowed = [
      "font/ttf", "font/otf", "font/woff", "font/woff2",
      "application/font-woff", "application/font-woff2",
      "application/x-font-ttf", "application/x-font-otf",
      "application/octet-stream",
    ];
    const ext = path.extname(file.originalname).toLowerCase();
    const validExt = [".ttf", ".otf", ".woff", ".woff2"].includes(ext);
    if (allowed.includes(file.mimetype) || validExt) cb(null, true);
    else cb(new Error("يُسمح فقط بملفات الخطوط: TTF، OTF، WOFF، WOFF2"));
  },
});

/* ── Auth guard ───────────────────────────────────────────────────────────── */
async function requireAuth(req: Request): Promise<boolean> {
  const token =
    (req.cookies as Record<string, string>)?.session ??
    (req.headers.authorization as string | undefined)?.replace(/^Bearer\s+/i, "");
  return !!(token && (await getSession(token)));
}

/* ── Generic image upload handler ─────────────────────────────────────────── */
/**
 * Handles a single-file image upload:
 *  1. Auth check
 *  2. multer (memory storage) — MIME filter + size limit
 *  3. Magic-bytes validation on the raw buffer
 *  4. sharp pipeline → WebP master + 3 responsive variants (thumb / medium / large)
 *  5. Return { url, variants } JSON
 */
function handleImageUpload(
  uploader:  ReturnType<typeof makeImageUploader>,
  fieldName: string,
  subfolder: string,
) {
  const destDir   = path.join(UPLOADS_ROOT, subfolder);
  const urlPrefix = `/uploads/${subfolder}`;

  return async (req: Request, res: any) => {
    if (!(await requireAuth(req))) {
      return res.status(401).json({ success: false, error: "يجب تسجيل الدخول أولاً" });
    }

    uploader.single(fieldName)(req as any, res as any, async (err: any) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, error: `خطأ في الرفع: ${err.message}` });
      }
      if (err) return res.status(400).json({ success: false, error: String(err.message) });

      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ success: false, error: "لم يتم إرسال أي ملف" });

      // ── Magic-bytes validation (on the in-memory buffer) ─────────────────
      if (!isValidImageBuffer(file.buffer)) {
        return res.status(400).json({
          success: false,
          error: "الملف تالف أو نوعه غير مدعوم — يرجى التحقق من نوع الملف الحقيقي",
        });
      }

      // ── Image processing pipeline ─────────────────────────────────────────
      try {
        const baseName = crypto.randomBytes(16).toString("hex");
        const result   = await processImage(file.buffer, destDir, urlPrefix, baseName);

        return res.json({
          success: true,
          data: {
            url:      result.url,
            variants: result.variants,
            meta: {
              width:         result.dimensions.width,
              height:        result.dimensions.height,
              originalBytes: result.originalBytes,
              webpBytes:     result.webpBytes,
              savings:       `${Math.round((1 - result.webpBytes / result.originalBytes) * 100)}%`,
            },
          },
        });
      } catch (processingErr: any) {
        return res.status(422).json({
          success: false,
          error: "تعذّر معالجة الصورة — يرجى المحاولة بملف آخر",
        });
      }
    });
  };
}

/* ── Routes ───────────────────────────────────────────────────────────────── */

router.post("/upload/avatar",
  handleImageUpload(avatarUploader, "avatar", "avatars"));

router.post("/upload/banner",
  handleImageUpload(bannerUploader, "banner", "banners"));

router.post("/upload/logo",
  handleImageUpload(logoUploader, "logo", "logos"));

router.post("/upload/service",
  handleImageUpload(serviceUploader, "image", "services"));

router.post("/upload/property-image",
  handleImageUpload(propertyImageUploader, "image", "properties"));

/* ── PDF brochure ─────────────────────────────────────────────────────────── */
router.post("/upload/brochure", async (req: Request, res: any) => {
  if (!(await requireAuth(req))) {
    return res.status(401).json({ success: false, error: "يجب تسجيل الدخول أولاً" });
  }
  brochureUpload.single("brochure")(req as any, res as any, (err: any) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, error: `خطأ في الرفع: ${err.message}` });
    }
    if (err) return res.status(400).json({ success: false, error: String(err.message) });

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ success: false, error: "لم يتم إرسال أي ملف" });

    if (!isValidPdf(file.path)) {
      deleteFile(file.path);
      return res.status(400).json({
        success: false,
        error: "الملف ليس PDF حقيقياً — يرجى التحقق من نوع الملف",
      });
    }

    res.json({ success: true, data: { url: `/uploads/brochures/${file.filename}` } });
  });
});

/* ── Font ─────────────────────────────────────────────────────────────────── */
router.post("/upload/font", async (req: Request, res: any) => {
  if (!(await requireAuth(req))) {
    return res.status(401).json({ success: false, error: "يجب تسجيل الدخول أولاً" });
  }
  fontUpload.single("font")(req as any, res as any, (err: any) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, error: `خطأ في الرفع: ${err.message}` });
    }
    if (err) return res.status(400).json({ success: false, error: String(err.message) });

    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) return res.status(400).json({ success: false, error: "لم يتم إرسال أي ملف" });

    res.json({
      success: true,
      data: { url: `/uploads/fonts/${file.filename}`, originalName: file.originalname },
    });
  });
});

export default router;
