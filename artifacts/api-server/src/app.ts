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

// ── Production secret validation (fail-fast before any routes are registered) ─
// Called here so the process exits with a clear message instead of silently
// serving requests with a weak or missing secret.
const isProd = process.env.NODE_ENV === "production";

function validateSecrets(): void {
  const secret = process.env.SESSION_SECRET ?? "";
  const MIN_LENGTH = 64;

  if (isProd) {
    if (!secret) {
      console.error(
        "[FATAL] SESSION_SECRET is not set. " +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\" " +
        "and set it as a secret before starting in production.",
      );
      process.exit(1);
    }
    if (secret.length < MIN_LENGTH) {
      console.error(
        `[FATAL] SESSION_SECRET is too short (${secret.length} chars). ` +
        `Production requires at least ${MIN_LENGTH} characters. ` +
        "Generate one with: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\"",
      );
      process.exit(1);
    }
    // Reject well-known placeholder values
    const WEAK = new Set([
      "change-this-to-a-long-random-secret-string",
      "secret",
      "password",
      "changeme",
      "your-secret",
      "SESSION_SECRET",
    ]);
    if (WEAK.has(secret.toLowerCase())) {
      console.error("[FATAL] SESSION_SECRET appears to be a placeholder. Set a real secret before deploying.");
      process.exit(1);
    }
  } else if (!secret) {
    console.warn(
      "[WARN] SESSION_SECRET is not set. This is fine locally but MUST be set before deploying to production.",
    );
  }
}

validateSecrets();

// ── Trust proxy (Replit edge / Cloudflare / nginx) ───────────────────────────
// Use hop count of 1 (not `true`) to satisfy express-rate-limit's proxy validation
app.set("trust proxy", 1);

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
//
// Resolution order:
//   1. CORS_ORIGIN env var (comma-separated list of exact origins) — always wins.
//      Set this in production to your real domain(s), e.g.:
//      CORS_ORIGIN=https://aqaratbanha.com,https://www.aqaratbanha.com
//   2. Development: allow localhost:* and *.replit.dev automatically.
//   3. Production without CORS_ORIGIN: same-origin only (most restrictive).
//
// "*" is never forwarded to the browser — it is treated as "not set".

const rawCorsOrigin = process.env.CORS_ORIGIN;

// A pattern that matches Replit preview/dev domains and localhost for development.
const DEV_ORIGIN_RE = /^(https?:\/\/localhost(:\d+)?|https:\/\/[a-z0-9-]+-\d+-[a-z0-9]+(-\d+)?\.spock\.replit\.dev|https?:\/\/[^/]+\.replit\.dev)$/i;

function buildCorsOrigin(): string | string[] | RegExp | ((origin: string | undefined, cb: (err: Error | null, allow?: boolean) => void) => void) | false {
  // Explicit allowlist always takes priority (strip "*" — wildcard is never safe with credentials)
  if (rawCorsOrigin && rawCorsOrigin.trim() !== "*") {
    const explicit = rawCorsOrigin.split(",").map((s) => s.trim()).filter(Boolean);
    if (explicit.length > 0) {
      const explicitSet = new Set(explicit);
      // In development also admit Replit dev domains alongside the explicit list
      if (!isProd) {
        return (origin, cb) => {
          if (!origin || explicitSet.has(origin) || DEV_ORIGIN_RE.test(origin)) return cb(null, true);
          cb(null, false);
        };
      }
      // Production: exact allowlist only
      return (origin, cb) => {
        // Same-origin (no Origin header) is always permitted
        if (!origin || explicitSet.has(origin)) return cb(null, true);
        cb(new Error(`CORS: origin '${origin}' not allowed`));
      };
    }
  }

  if (!isProd) {
    // Development: allow all origins (localhost, Replit previews, etc.)
    console.warn("[CORS] Development mode — all origins allowed. Set CORS_ORIGIN before going to production.");
    return true;
  }

  // Production without explicit CORS_ORIGIN: same-origin only (no cross-origin at all)
  console.warn(
    "[CORS] Production mode — CORS_ORIGIN is not set. Cross-origin requests will be blocked. " +
    "Set CORS_ORIGIN=https://yourdomain.com if your frontend is on a different origin.",
  );
  return false;
}

const corsOrigin = buildCorsOrigin();
app.use(cors({ origin: corsOrigin as any, credentials: true }));

// ── Cookie & Body parsers (with size limits) ──────────────────────────────────
app.use(cookieParser());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

// ── Global API rate limiter ───────────────────────────────────────────────────
// In dev (Replit), all traffic shares one IP — disable limits to avoid false 429s.
// In production, apply strict per-IP limits.
const skipInDev = (_req: Request) => !isProd;

const globalApiLimiter = rateLimit({
  windowMs:        15 * 60 * 1_000,
  max:             1_000,
  standardHeaders: true,
  legacyHeaders:   false,
  skip:            skipInDev,
  message:         { success: false, error: "طلبات كثيرة، يرجى المحاولة لاحقاً" },
});

// Admin-specific rate limiter: 300 requests per 15 min per IP
const adminApiLimiter = rateLimit({
  windowMs:        15 * 60 * 1_000,
  max:             300,
  standardHeaders: true,
  legacyHeaders:   false,
  skip:            skipInDev,
  message:         { success: false, error: "طلبات كثيرة على لوحة الإدارة، يرجى الانتظار" },
});

// Upload rate limiter: 120 uploads per hour per IP (prevents storage abuse)
const uploadLimiter = rateLimit({
  windowMs:        60 * 60 * 1_000,
  max:             120,
  standardHeaders: true,
  legacyHeaders:   false,
  skip:            skipInDev,
  message:         { success: false, error: "حدّ الرفع الساعي تجاوز، حاول لاحقاً" },
});

// ── Static uploads (before rate limiters) ────────────────────────────────────
const uploadsDir = process.env.UPLOADS_DIR
  ? path.resolve(process.env.UPLOADS_DIR)
  : path.join(process.cwd(), "uploads");

// Serve uploads with long-lived immutable cache headers.
// Filenames are random 32-char hex hashes so they are content-addressed —
// the content never changes once written, making immutable caching safe.
// WebP images and other public assets get a 1-year cache; private/sensitive
// files (brochures, fonts) remain short-lived.
app.use("/uploads", express.static(uploadsDir, {
  setHeaders(res, filePath) {
    res.setHeader("X-Content-Type-Options", "nosniff");

    const isWebp = filePath.endsWith(".webp");
    const isPdf  = filePath.endsWith(".pdf");

    if (isWebp) {
      // Hashed filenames → content-addressed → safe for 1-year immutable cache
      res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
      res.setHeader("Content-Type", "image/webp");
    } else if (isPdf) {
      // Brochures: short-lived, not indexed
      res.setHeader("Cache-Control", "private, max-age=3600");
    } else {
      // Legacy uploads (pre-WebP) and fonts
      res.setHeader("Cache-Control", "public, max-age=86400");
    }
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
