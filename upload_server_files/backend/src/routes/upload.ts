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

// ── Auth guard helper ──
function requireAuth(req: Request): boolean {
  const token = (req.cookies as Record<string, string>)?.session
    ?? (req.headers.authorization as string | undefined)?.replace("Bearer ", "");
  return !!(token && getSession(token));
}

// POST /api/upload/avatar
router.post("/upload/avatar", (req: Request, res) => {
  if (!requireAuth(req)) {
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
router.post("/upload/banner", (req: Request, res) => {
  if (!requireAuth(req)) {
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
router.post("/upload/service", (req: Request, res) => {
  if (!requireAuth(req)) {
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

export default router;
