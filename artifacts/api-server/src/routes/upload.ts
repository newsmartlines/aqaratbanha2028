import { Router, type Request } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { getSession } from "./auth";

const router = Router();

/* ── Magic-bytes validators ───────────────────────────────────────────────── */

/**
 * Read the first N bytes of a file without loading the whole thing.
 * Returns an empty Buffer on any error.
 */
function readHeader(filePath: string, byteCount = 12): Buffer {
  try {
    const fd  = fs.openSync(filePath, "r");
    const buf = Buffer.alloc(byteCount);
    fs.readSync(fd, buf, 0, byteCount, 0);
    fs.closeSync(fd);
    return buf;
  } catch {
    return Buffer.alloc(0);
  }
}

/**
 * Verify a saved file really contains image data (JPEG / PNG / WebP / GIF).
 * Returns false if the file header does not match any known signature.
 */
function isValidImage(filePath: string): boolean {
  const b = readHeader(filePath, 12);
  if (b.length < 4) return false;

  // JPEG: FF D8 FF
  if (b[0] === 0xFF && b[1] === 0xD8 && b[2] === 0xFF) return true;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (b.length >= 8 &&
      b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47 &&
      b[4] === 0x0D && b[5] === 0x0A && b[6] === 0x1A && b[7] === 0x0A) return true;

  // WebP: RIFF????WEBP
  if (b.length >= 12 &&
      b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return true;

  // GIF: GIF87a or GIF89a
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x38) return true;

  return false;
}

/**
 * Verify a saved file really starts with the PDF magic bytes "%PDF".
 */
function isValidPdf(filePath: string): boolean {
  const b = readHeader(filePath, 5);
  return b.length >= 4 &&
    b[0] === 0x25 && b[1] === 0x50 && b[2] === 0x44 && b[3] === 0x46;
}

/** Delete a file silently (cleanup after validation failure). */
function deleteFile(filePath: string): void {
  fs.unlink(filePath, () => { /* fire-and-forget */ });
}

/* ── Multer factory ───────────────────────────────────────────────────────── */
function makeUploader(subfolder: string) {
  const dir = path.join(process.cwd(), "uploads", subfolder);
  fs.mkdirSync(dir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename(_req, file, cb) {
      // Always use a random name — never trust the original filename
      const ext  = path.extname(file.originalname).toLowerCase().replace(/[^.a-z]/g, "") || ".jpg";
      const safe = ext.length > 5 ? ".jpg" : ext;  // cap extension length
      cb(null, crypto.randomBytes(16).toString("hex") + safe);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter(_req, file, cb) {
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("نوع الملف غير مدعوم. يُسمح فقط بـ JPG, PNG, WEBP, GIF"));
      }
    },
  });
}

const avatarUpload        = makeUploader("avatars");
const bannerUpload        = makeUploader("banners");
const logoUpload          = makeUploader("logos");
const serviceUpload       = makeUploader("services");
const propertyImageUpload = makeUploader("properties");

// PDF uploader (up to 10 MB)
const brochureDir = path.join(process.cwd(), "uploads", "brochures");
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

/* ── Auth guard ───────────────────────────────────────────────────────────── */
async function requireAuth(req: Request): Promise<boolean> {
  const token =
    (req.cookies as Record<string, string>)?.session ??
    (req.headers.authorization as string | undefined)?.replace(/^Bearer\s+/i, "");
  return !!(token && (await getSession(token)));
}

/* ── Generic upload handler factory ──────────────────────────────────────── */
function handleUpload(
  uploader:  ReturnType<typeof makeUploader>,
  fieldName: string,
  urlPrefix: string,
  validator: (p: string) => boolean,
) {
  return async (req: Request, res: any) => {
    if (!(await requireAuth(req))) {
      return res.status(401).json({ success: false, error: "يجب تسجيل الدخول أولاً" });
    }
    uploader.single(fieldName)(req as any, res as any, (err: any) => {
      if (err instanceof multer.MulterError) {
        return res.status(400).json({ success: false, error: `خطأ في الرفع: ${err.message}` });
      }
      if (err) return res.status(400).json({ success: false, error: String(err.message) });

      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ success: false, error: "لم يتم إرسال أي ملف" });

      // ── Magic-bytes validation ─────────────────────────────────────────────
      if (!validator(file.path)) {
        deleteFile(file.path);
        return res.status(400).json({
          success: false,
          error: "الملف تالف أو نوعه غير مدعوم — يرجى التحقق من نوع الملف الحقيقي",
        });
      }

      res.json({ success: true, data: { url: `${urlPrefix}/${file.filename}` } });
    });
  };
}

/* ── Routes ───────────────────────────────────────────────────────────────── */
router.post("/upload/avatar",         handleUpload(avatarUpload,        "avatar",  "/uploads/avatars",    isValidImage));
router.post("/upload/banner",         handleUpload(bannerUpload,        "banner",  "/uploads/banners",    isValidImage));
router.post("/upload/logo",           handleUpload(logoUpload,          "logo",    "/uploads/logos",      isValidImage));
router.post("/upload/service",        handleUpload(serviceUpload,       "image",   "/uploads/services",   isValidImage));
router.post("/upload/property-image", handleUpload(propertyImageUpload, "image",   "/uploads/properties", isValidImage));

// PDF brochure (separate handler — different validator)
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

export default router;
