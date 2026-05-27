/**
 * use-sse.ts — Frontend SSE hook
 * Subscribes to /api/sse/stream and invalidates React Query caches
 * on relevant server events. Falls back gracefully if SSE unavailable.
 */

import { useEffect, useRef, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";

type SseEventHandler = (data: unknown) => void;

const RECONNECT_DELAY_MS = 5_000;
const MAX_RECONNECT_ATTEMPTS = 10;

export function useSse(enabled = true) {
  const qc = useQueryClient();
  const esRef = useRef<EventSource | null>(null);
  const reconnectCount = useRef(0);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Event handlers — each invalidates the right query keys ────────────────

  const handlers: Record<string, SseEventHandler> = {
    "listings.updated": (data: any) => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["user-properties"] });
      qc.invalidateQueries({ queryKey: ["admin-properties"] });
      qc.invalidateQueries({ queryKey: ["property", data?.propertyId] });
      qc.invalidateQueries({ queryKey: ["featured-properties"] });
    },

    "property.submitted": () => {
      qc.invalidateQueries({ queryKey: ["admin-properties"] });
      qc.invalidateQueries({ queryKey: ["admin-sidebar-counts"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
    },

    "property.approved": (data: any) => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["user-properties"] });
      qc.invalidateQueries({ queryKey: ["property", data?.id] });
    },

    "property.rejected": (data: any) => {
      qc.invalidateQueries({ queryKey: ["user-properties"] });
      qc.invalidateQueries({ queryKey: ["property", data?.id] });
    },

    "property.deleted": (data: any) => {
      qc.invalidateQueries({ queryKey: ["properties"] });
      qc.invalidateQueries({ queryKey: ["user-properties"] });
      qc.invalidateQueries({ queryKey: ["property", data?.id] });
    },

    "property.edited": () => {
      qc.invalidateQueries({ queryKey: ["admin-properties"] });
      qc.invalidateQueries({ queryKey: ["admin-sidebar-counts"] });
    },

    "notification.new": () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },

    "user.registered": () => {
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      qc.invalidateQueries({ queryKey: ["admin-stats"] });
      qc.invalidateQueries({ queryKey: ["admin-sidebar-counts"] });
    },

    "message.new": () => {
      qc.invalidateQueries({ queryKey: ["messages"] });
      qc.invalidateQueries({ queryKey: ["messages-unread-count"] });
    },

    "package.activated": () => {
      qc.invalidateQueries({ queryKey: ["subscription"] });
      qc.invalidateQueries({ queryKey: ["billing"] });
    },

    "admin.sidebar_update": () => {
      qc.invalidateQueries({ queryKey: ["admin-sidebar-counts"] });
    },
  };

  const connect = useCallback(() => {
    if (!enabled) return;
    if (typeof window === "undefined") return;
    if (!window.EventSource) return; // SSE not supported

    // Close existing connection
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }

    const es = new EventSource("/api/sse/stream", { withCredentials: true });
    esRef.current = es;

    // Register all event listeners
    for (const [eventName, handler] of Object.entries(handlers)) {
      es.addEventListener(eventName, (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          handler(data);
        } catch {
          handler(e.data);
        }
      });
    }

    es.addEventListener("connected", () => {
      reconnectCount.current = 0; // Reset on successful connection
    });

    es.onerror = () => {
      es.close();
      esRef.current = null;

      if (reconnectCount.current < MAX_RECONNECT_ATTEMPTS) {
        reconnectCount.current++;
        const delay = Math.min(RECONNECT_DELAY_MS * reconnectCount.current, 60_000);
        reconnectTimer.current = setTimeout(connect, delay);
      }
    };
  }, [enabled]);

  useEffect(() => {
    connect();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      if (esRef.current) { esRef.current.close(); esRef.current = null; }
    };
  }, [connect]);
}
