/**
 * sse-manager.ts — Server-Sent Events client registry
 * Manages real-time connections for admin, providers, and users.
 * Lightweight — no external dependencies.
 */

import type { Response } from "express";

interface SseClient {
  userId: number | null;
  role: string;
  res: Response;
  connectedAt: number;
}

class SseManager {
  private clients: Map<string, SseClient> = new Map();
  private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Heartbeat every 25s to keep connections alive through proxies
    this.heartbeatInterval = setInterval(() => this.heartbeat(), 25_000);
  }

  /** Register a new SSE client */
  connect(clientId: string, userId: number | null, role: string, res: Response) {
    // Set SSE headers
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-store, no-transform");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no"); // nginx: disable buffering
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.flushHeaders();

    // Send initial connection event
    this.sendToRes(res, "connected", { clientId, timestamp: Date.now() });

    this.clients.set(clientId, { userId, role, res, connectedAt: Date.now() });

    // Cleanup on disconnect
    res.on("close", () => {
      this.clients.delete(clientId);
    });
    res.on("error", () => {
      this.clients.delete(clientId);
    });
  }

  /** Disconnect a client */
  disconnect(clientId: string) {
    const client = this.clients.get(clientId);
    if (client) {
      try { client.res.end(); } catch { /* ignore */ }
      this.clients.delete(clientId);
    }
  }

  /** Send event to a specific user (all their tabs) */
  sendToUser(userId: number, event: string, data: unknown) {
    for (const [, client] of this.clients) {
      if (client.userId === userId) {
        this.sendToRes(client.res, event, data);
      }
    }
  }

  /** Send event to all admins */
  sendToAdmins(event: string, data: unknown) {
    for (const [, client] of this.clients) {
      if (client.role === "admin" || client.role === "moderator") {
        this.sendToRes(client.res, event, data);
      }
    }
  }

  /** Send event to all connected clients */
  broadcast(event: string, data: unknown) {
    for (const [, client] of this.clients) {
      this.sendToRes(client.res, event, data);
    }
  }

  /** Send event to a specific role */
  sendToRole(role: string, event: string, data: unknown) {
    for (const [, client] of this.clients) {
      if (client.role === role) {
        this.sendToRes(client.res, event, data);
      }
    }
  }

  get clientCount() { return this.clients.size; }

  private sendToRes(res: Response, event: string, data: unknown) {
    try {
      const payload = typeof data === "string" ? data : JSON.stringify(data);
      res.write(`event: ${event}\ndata: ${payload}\n\n`);
      if (typeof (res as any).flush === "function") (res as any).flush();
    } catch { /* client disconnected */ }
  }

  private heartbeat() {
    const stale: string[] = [];
    for (const [id, client] of this.clients) {
      try {
        client.res.write(": ping\n\n");
        if (typeof (client.res as any).flush === "function") (client.res as any).flush();
      } catch {
        stale.push(id);
      }
    }
    stale.forEach(id => this.clients.delete(id));
  }
}

// Singleton
export const sseManager = new SseManager();
