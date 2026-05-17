import { Router, type Request } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import crypto from "crypto";
import { getSession } from "./auth";

const router = Router();

// ── Helper: build multer uploader for a given subfolder ──
function makeUploader(subfolder: string) {
  const dir = path.join(process.cwd(), "uploads", subfolder);
  fs.mkdirSync(dir, { recursive: true });

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, dir),
    filename: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase() || ".jpg";
      const name = crypto.randomBytes(16).toString("hex") + ext;
      cb(null, name);
    },
  });

  return multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
      const allowed = ["image/jpeg", "image/png", "image/webp", "image/gif"];
      if (allowed.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error("نوع الملف غير مدعوم. يُسمح فقط بـ JPG, PNG, WEBP"));
      }
    },
  });
}

const avatarUpload = makeUploader("avatars");
const bannerUpload = makeUploader("banners");
const serviceUpload = makeUploader("services");
const propertyImageUpload = makeUploader("properties");

// PDF uploader (up to 10 MB)
const brochureDir = path.join(process.cwd(), "uploads", "brochures");
fs.mkdirSync(brochureDir, { recursive: true });
const pdfStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, brochureDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase() || ".pdf";
    const name = crypto.randomBytes(16).toString("hex") + ext;
    cb(null, name);
  },
});
const brochureUpload = multer({
  storage: pdfStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") {
      cb(null, true);
    } else {
      cb(new Error("يُسمح فقط بملفات PDF"));
    }
  },
});

// ── Auth guard helper (async) ──
async function requireAuth(req: Request): Promise<boolean> {
  const token = (req.cookies as Record<string, string>)?.session
    ?? (req.headers.authorization as string | undefined)?.replace("Bearer ", "");
  return !!(token && await getSession(token));
}

// POST /api/upload/avatar
router.post("/upload/avatar", async (req: Request, res) => {
  if (!(await requireAuth(req))) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }
  avatarUpload.single("avatar")(req as any, res as any, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, error: `خطأ في الرفع: ${err.message}` });
    }
    if (err) return res.status(400).json({ success: false, error: err.message });
    const file = (req as any).file;
    if (!file) return res.status(400).json({ success: false, error: "لم يتم إرسال أي ملف" });
    res.json({ success: true, data: { url: `/uploads/avatars/${file.filename}` } });
  });
});

// POST /api/upload/banner
router.post("/upload/banner", async (req: Request, res) => {
  if (!(await requireAuth(req))) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }
  bannerUpload.single("banner")(req as any, res as any, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, error: `خطأ في الرفع: ${err.message}` });
    }
    if (err) return res.status(400).json({ success: false, error: err.message });
    const file = (req as any).file;
    if (!file) return res.status(400).json({ success: false, error: "لم يتم إرسال أي ملف" });
    res.json({ success: true, data: { url: `/uploads/banners/${file.filename}` } });
  });
});

// POST /api/upload/service
router.post("/upload/service", async (req: Request, res) => {
  if (!(await requireAuth(req))) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }
  serviceUpload.single("image")(req as any, res as any, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, error: `خطأ في الرفع: ${err.message}` });
    }
    if (err) return res.status(400).json({ success: false, error: err.message });
    const file = (req as any).file;
    if (!file) return res.status(400).json({ success: false, error: "لم يتم إرسال أي ملف" });
    res.json({ success: true, data: { url: `/uploads/services/${file.filename}` } });
  });
});

// POST /api/upload/property-image
router.post("/upload/property-image", async (req: Request, res) => {
  if (!(await requireAuth(req))) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }
  propertyImageUpload.single("image")(req as any, res as any, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, error: `خطأ في الرفع: ${err.message}` });
    }
    if (err) return res.status(400).json({ success: false, error: err.message });
    const file = (req as any).file;
    if (!file) return res.status(400).json({ success: false, error: "لم يتم إرسال أي ملف" });
    res.json({ success: true, data: { url: `/uploads/properties/${file.filename}` } });
  });
});

// POST /api/upload/brochure  (PDF)
router.post("/upload/brochure", async (req: Request, res) => {
  if (!(await requireAuth(req))) {
    return res.status(401).json({ success: false, error: "Not authenticated" });
  }
  brochureUpload.single("brochure")(req as any, res as any, (err) => {
    if (err instanceof multer.MulterError) {
      return res.status(400).json({ success: false, error: `خطأ في الرفع: ${err.message}` });
    }
    if (err) return res.status(400).json({ success: false, error: err.message });
    const file = (req as any).file;
    if (!file) return res.status(400).json({ success: false, error: "لم يتم إرسال أي ملف" });
    res.json({ success: true, data: { url: `/uploads/brochures/${file.filename}` } });
  });
});

export default router;
