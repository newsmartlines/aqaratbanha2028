import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "path";

const rawPort = process.env.VITE_PORT ?? process.env.PORT ?? "5000";
const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid port value: "${rawPort}"`);
}

const basePath = process.env.BASE_PATH ?? "/";

const API_SERVER = process.env.API_SERVER_URL ?? "http://localhost:8080";

export default defineConfig({
  base: basePath,
  plugins: [
    react(),
    tailwindcss(),
    ...(process.env.NODE_ENV !== "production" && process.env.REPL_ID !== undefined
      ? [
          await import("@replit/vite-plugin-runtime-error-modal").then((m) =>
            m.default({
              filter: (err: { stack?: string; message?: string }) => {
                const blob = `${err?.message ?? ""} ${err?.stack ?? ""}`;
                return !/postUserData|workspace_iframe/i.test(blob);
              },
            } as any),
          ),
          await import("@replit/vite-plugin-cartographer").then((m) =>
            m.cartographer({
              root: path.resolve(import.meta.dirname, ".."),
            }),
          ),
          await import("@replit/vite-plugin-dev-banner").then((m) =>
            m.devBanner(),
          ),
        ]
      : []),
  ],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
      "@assets": path.resolve(import.meta.dirname, "..", "..", "attached_assets"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist/public"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
    hmr: false,
    fs: {
      strict: true,
      deny: ["**/.*"],
    },
    proxy: {
      "/api/sse": {
        target: API_SERVER,
        changeOrigin: true,
        proxyTimeout: 0,
        timeout: 0,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            proxyReq.setHeader("Cache-Control", "no-cache");
            proxyReq.setHeader("Accept", "text/event-stream");
            const incomingHost = req.headers["x-forwarded-host"] || req.headers.host;
            if (incomingHost) proxyReq.setHeader("X-Forwarded-Host", String(incomingHost));
          });
          proxy.on("error", (_err, _req, _res) => { /* SSE reconnects automatically */ });
        },
      },
      "/api": {
        target: API_SERVER,
        changeOrigin: true,
        proxyTimeout: 60000,
        timeout: 60000,
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq, req) => {
            proxyReq.setHeader("Cache-Control", "no-cache");
            const incomingHost = req.headers["x-forwarded-host"] || req.headers.host;
            if (incomingHost) {
              proxyReq.setHeader("X-Forwarded-Host", String(incomingHost));
            }
            const incomingProto =
              req.headers["x-forwarded-proto"] ||
              ((req.socket as { encrypted?: boolean }).encrypted ? "https" : "http");
            proxyReq.setHeader("X-Forwarded-Proto", String(incomingProto));
          });
          proxy.on("error", (_err, _req, res) => {
            if (res && "writeHead" in res) {
              (res as import("http").ServerResponse).writeHead(504, { "Content-Type": "application/json" });
              (res as import("http").ServerResponse).end(JSON.stringify({ success: false, error: "انتهت مهلة الاتصال بالخادم، يرجى المحاولة مجدداً" }));
            }
          });
        },
      },
      "/uploads": {
        target: API_SERVER,
        changeOrigin: true,
        proxyTimeout: 30000,
        timeout: 30000,
      },
    },
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
