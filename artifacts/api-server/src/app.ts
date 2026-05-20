import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import pinoHttp from "pino-http";
import compression from "compression";
import path from "path";
import fs from "fs";
import httpProxy from "http-proxy";
import router from "./routes";
import { logger } from "./lib/logger";
import { permissionGate } from "./middleware/permissionGate";

const app: Express = express();

// Trust the upstream proxy (Replit's edge) so that req.protocol, req.ip and
// X-Forwarded-* headers reflect the original browser-facing request.
app.set("trust proxy", true);

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);
app.use(compression());
app.use(cors({ origin: true, credentials: true }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files as static assets
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// API routes
app.use("/api", permissionGate);
app.use("/api", router);

// ─── Dev: proxy everything else to Vite on port 5001 ───────────────────────
if (process.env.NODE_ENV !== "production") {
  const VITE_PORT = process.env.VITE_PORT ? Number(process.env.VITE_PORT) : 5001;
  const proxy = httpProxy.createProxyServer({
    target: `http://localhost:${VITE_PORT}`,
    ws: true,
    changeOrigin: false,
  });

  proxy.on("error", (err, _req, res) => {
    logger.warn({ err: err.message }, "Vite proxy error");
    if (res && "writeHead" in res && typeof (res as Response).writeHead === "function") {
      (res as Response).writeHead(502, { "Content-Type": "text/plain" });
      (res as Response).end("Vite dev server unavailable");
    }
  });

  // Proxy all non-API, non-uploads requests to Vite
  app.use((req: Request, res: Response) => {
    proxy.web(req, res);
  });
}

// ─── Production: serve built frontend ──────────────────────────────────────
if (process.env.NODE_ENV === "production") {
  const candidates = [
    process.env.FRONTEND_DIST,
    path.resolve(process.cwd(), "artifacts/marketplace/dist/public"),
    path.resolve(__dirname, "../../marketplace/dist/public"),
  ].filter(Boolean) as string[];

  const frontendDist = candidates.find((p) => {
    try {
      return fs.existsSync(path.join(p, "index.html"));
    } catch {
      return false;
    }
  });

  if (frontendDist) {
    logger.info({ frontendDist }, "Serving frontend static assets");
    app.use(express.static(frontendDist, { index: false, maxAge: "1h" }));
    app.get(/^(?!\/api\/|\/uploads\/).*/, (req: Request, res: Response, next: NextFunction) => {
      if (req.method !== "GET") return next();
      res.sendFile(path.join(frontendDist, "index.html"));
    });
  } else {
    logger.warn(
      { tried: candidates },
      "Frontend dist not found — run `pnpm --filter @workspace/marketplace build` first.",
    );
  }
}

export default app;
