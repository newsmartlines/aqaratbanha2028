import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

// Swallow noisy errors emitted by Replit's in-iframe telemetry script (postUserData).
// They originate from an injected <script> in the dev preview iframe and are not
// related to the application code, but they bubble up to the runtime-error overlay.
if (typeof window !== "undefined") {
  const isReplitTelemetryError = (msg: unknown, stack?: string) => {
    const text = `${typeof msg === "string" ? msg : ""} ${stack ?? ""}`;
    return /postUserData|workspace_iframe/.test(text);
  };
  window.addEventListener(
    "error",
    (e) => {
      if (isReplitTelemetryError(e.message, e.error?.stack)) {
        e.stopImmediatePropagation();
        e.preventDefault();
      }
    },
    true,
  );
  window.addEventListener("unhandledrejection", (e) => {
    const reason: any = e.reason;
    if (isReplitTelemetryError(reason?.message ?? String(reason ?? ""), reason?.stack)) {
      e.preventDefault();
    }
  });
}

createRoot(document.getElementById("root")!).render(<App />);
