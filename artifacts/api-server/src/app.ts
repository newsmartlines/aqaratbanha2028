import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import compression from "compression";
import path from "path";
import fs from "fs";
import httpProxy from "http-proxy";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import router from "./routes";
import { logger } from "./lib/logger";
import { permissionGate } from "./middleware/permissionGate";
import { adminAuditMiddleware } from "./middleware/adminAudit";

const app: Express = express();

// ── Trust proxy (Replit edge / Cloudflare / nginx) ───────────────────────────
app.set("trust proxy", true);

// ── Structured request logging ────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) { return { id: req.id, method: req.method, url: req.url?.split("?")[0] }; },
      res(res) { return { statusCode: res.statusCode }; },
    },
  }),
);

// ── HTTP Security Headers (Helmet) ────────────────────────────────────────────
// OWASP: prevents XSS, clickjacking, sniffing, MIME confusion, etc.
const isProd = process.env.NODE_ENV === "production";

const cspDirectives: Record<string, string[] | null> = {
  "default-src":               ["'self'"],
  "script-src":                ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
  "style-src":                 ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
  "img-src":                   ["'self'", "data:", "blob:", "https:"],
  "font-src":                  ["'self'", "data:", "https://fonts.gstatic.com"],
  "connect-src":               ["'self'", "wss:", "ws:", "https:"],
  "frame-src":                 ["'none'"],
  "frame-ancestors":           ["'none'"],
  "object-src":                ["'none'"],
  "base-uri":                  ["'self'"],
  "form-action":               ["'self'"],
  "upgrade-insecure-requests": isProd ? [] : null,
};

// Remove null directives (upgrade-insecure-requests skipped in dev)
const filteredDirectives = Object.fromEntries(
  Object.entries(cspDirectives).filter(([, v]) => v !== null),
) as Record<string, string[]>;

app.use(
  helmet({
    contentSecurityPolicy:    { directives: filteredDirectives },
    crossOriginEmbedderPolicy: false,        // allows external images
    referrerPolicy:            { policy: "strict-origin-when-cross-origin" },
    hsts: isProd
      ? { maxAge: 31_536_000, includeSubDomains: true, preload: true }
      : false,
    frameguard:              { action: "deny" },
    noSniff:                 true,
    xssFilter:               true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
  }),
);

// ── Compression ───────────────────────────────────────────────────────────────
app.use(compression());

// ── CORS ─────────────────────────────────────────────────────────────────────
const rawCorsOrigin = process.env.CORS_ORIGIN;
let corsOrigin: string | string[] | boolean = true;
if (rawCorsOrigin) {
  const origins = rawCorsOrigin.split(",").map((s) => s.trim()).filter(Boolean);
  corsOrigin = origins.length === 1 ? origins[0] : origins;
}
app.use(cors({ origin: corsOrigin, credentials: true }));

// ── Cookie & Body parsers (with size limits) ──────────────────────────────────
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ── Global API rate limiter ───────────────────────────────────────────────────
// 500 requests per 15 min per IP for all /api routes
const globalApiLimiter = rateLimit({
  windowMs:       15 * 60 * 1_000,
  max:            500,
  standardHeaders: true,
  legacyHeaders:  false,
  message:        { success: false, error: "طلبات كثيرة، يرجى المحاولة لاحقاً" },
});

// Admin-specific rate limiter: 150 requests per 15 min per IP
const adminApiLimiter = rateLimit({
  windowMs:        15 * 60 * 1_000,
  max:             150,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { success: false, error: "طلبات كثيرة على لوحة الإدارة، يرجى الانتظار" },
});

// Upload rate limiter: 60 uploads per hour per IP (prevents storage abuse)
const uploadLimiter = rateLimit({
  windowMs:        60 * 60 * 1_000,
  max:             60,
  standardHeaders: true,
  legacyHeaders:   false,
  message:         { success: false, error: "حدّ الرفع الساعي تجاوز، حاول لاحقاً" },
});

// ── Static uploads (before rate limiters) ────────────────────────────────────
const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(process.cwd(), "uploads");

// Serve uploads with no-cache headers (private content)
app.use("/uploads", express.static(uploadsDir, {
  setHeaders(res) {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Cache-Control", "private, max-age=3600");
  },
}));

// ── Apply rate limiters ───────────────────────────────────────────────────────
app.use("/api", globalApiLimiter);
app.use("/api/admin", adminApiLimiter);
app.use("/api/upload", uploadLimiter);

// ── Admin audit trail ─────────────────────────────────────────────────────────
// Logs every admin mutation with IP, user, method, path, status, duration
app.use("/api", adminAuditMiddleware);

// ── Permission gate + API routes ──────────────────────────────────────────────
app.use("/api", permissionGate);
app.use("/api", router);

// ── Dev: proxy to Vite dev server ─────────────────────────────────────────────
if (!isProd) {
  const VITE_PORT = process.env.VITE_PORT ? Number(process.env.VITE_PORT) : 5000;
  const proxy = httpProxy.createProxyServer({
    target:       `http://localhost:${VITE_PORT}`,
    ws:           true,
    changeOrigin: false,
  });

  proxy.on("error", (err, _req, res) => {
    logger.warn({ err: err.message }, "Vite proxy error");
    if (res && "writeHead" in res && typeof (res as Response).writeHead === "function") {
      (res as Response).writeHead(502, { "Content-Type": "text/plain" });
      (res as Response).end("Vite dev server unavailable");
    }
  });

  app.use((req: Request, res: Response) => { proxy.web(req, res); });
}

// ── Production: serve built frontend ─────────────────────────────────────────
if (isProd) {
  const candidates = [
    process.env.FRONTEND_DIST,
    path.resolve(process.cwd(), "artifacts/marketplace/dist/public"),
    path.resolve(process.cwd(), "dist/public"),
    path.resolve(__dirname, "../../marketplace/dist/public"),
  ].filter(Boolean) as string[];

  const frontendDist = candidates.find((p) => {
    try { return fs.existsSync(path.join(p, "index.html")); } catch { return false; }
  });

  if (frontendDist) {
    logger.info({ frontendDist }, "Serving frontend static assets");
    app.use(express.static(frontendDist, { index: false, maxAge: "1h" }));
    app.get(/^(?!\/api\/|\/uploads\/).*/, (req: Request, res: Response, next: NextFunction) => {
      if (req.method !== "GET") return next();
      res.sendFile(path.join(frontendDist, "index.html"));
    });
  } else {
    logger.warn({ tried: candidates }, "Frontend dist not found — build first.");
  }
}

export default app;
