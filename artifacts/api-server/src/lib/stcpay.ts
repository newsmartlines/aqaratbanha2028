/**
 * STC Pay gateway adapter.
 *
 * Reads credentials from environment variables:
 *   STCPAY_MERCHANT_ID  – merchant identifier issued by STC Pay
 *   STCPAY_API_KEY      – secret API key (Bearer token)
 *   STCPAY_BASE_URL     – API base URL (defaults to test sandbox host)
 *   STCPAY_TEST_MODE    – "true" (default) routes to internal simulator
 *   STCPAY_PUBLIC_BASE  – optional explicit override for the public-facing
 *                         base URL of this app (used so STC Pay can redirect
 *                         users back). When unset, the URL is derived from
 *                         the incoming request headers, which works
 *                         transparently in local dev, Replit dev preview,
 *                         and production deployments.
 *
 * When credentials are missing OR STCPAY_TEST_MODE !== "false", payment
 * sessions are routed through the internal simulator (`/api/stcpay/_simulator`)
 * which mimics STC Pay's redirect-and-callback flow end-to-end. This lets the
 * full integration be exercised without a live merchant account; flipping
 * STCPAY_TEST_MODE=false with real credentials switches to live STC Pay.
 */
import type { Request } from "express";

const DEFAULT_BASE_URL = "https://api.stcpay.com.sa/Direct/V4";

export interface CreateSessionInput {
  refId: string;
  amount: number;
  currency: string;
  description: string;
  returnUrl: string;
  callbackUrl: string;
  customerName?: string;
  customerPhone?: string;
  /**
   * Public-facing base URL of this app — used in test mode to build the
   * simulator redirect URL on the same origin the user is browsing from.
   * When omitted, falls back to the env-derived `getPublicBaseUrl()`.
   */
  publicBaseUrl?: string;
}

export interface CreateSessionResult {
  redirectUrl: string;
  gatewayRef: string;
  raw: unknown;
}

export interface StatusResult {
  status: "pending" | "paid" | "failed" | "cancelled";
  raw: unknown;
}

function isTestMode(): boolean {
  const flag = (process.env.STCPAY_TEST_MODE ?? "").toLowerCase();
  if (flag === "false") return false;
  if (flag === "true") return true;
  // No explicit flag: treat as test mode unless real credentials are present.
  return !(process.env.STCPAY_API_KEY && process.env.STCPAY_MERCHANT_ID);
}

export function getStcPayMode(): "test" | "live" {
  return isTestMode() ? "test" : "live";
}

/**
 * Resolve the public-facing base URL of this app, used to build redirect &
 * callback URLs that STC Pay (or our simulator) will hand the user back to.
 *
 * Resolution order:
 *  1. STCPAY_PUBLIC_BASE env var (explicit override).
 *  2. Headers on the inbound request (X-Forwarded-* set by the Vite proxy /
 *     deployment ingress, falling back to plain Host). This is what makes the
 *     redirect "just work" in local dev (any port), Replit dev preview, and
 *     production — the URL automatically matches whatever host the user's
 *     browser is currently using, so the session cookie continues to apply.
 *  3. REPLIT_DEV_DOMAIN as a last-resort static fallback.
 *  4. http://localhost:5000.
 */
export function getPublicBaseUrl(req?: Request): string {
  const explicit = process.env.STCPAY_PUBLIC_BASE?.trim();
  if (explicit) return explicit.replace(/\/$/, "");

  if (req) {
    const fwdHost = (req.headers["x-forwarded-host"] as string | undefined)
      ?.split(",")[0]
      ?.trim();
    const host = fwdHost || (req.headers.host as string | undefined)?.trim();
    if (host) {
      const fwdProto = (req.headers["x-forwarded-proto"] as string | undefined)
        ?.split(",")[0]
        ?.trim();
      // If the host already includes a port that suggests https (or proto
      // says so), use https; otherwise default to http for local dev.
      const proto =
        fwdProto ||
        (host.endsWith(":443") || host.includes(".replit.dev") || host.includes(".repl.co")
          ? "https"
          : "http");
      return `${proto}://${host}`;
    }
  }

  const replit = process.env.REPLIT_DEV_DOMAIN?.trim();
  if (replit) return `https://${replit}`;
  return "http://localhost:5000";
}

export async function createPaymentSession(input: CreateSessionInput): Promise<CreateSessionResult> {
  if (isTestMode()) {
    // Simulator: the redirect URL is our own internal page that lets the user
    // choose pay or cancel, then hits the same callback the real gateway would.
    const base = (input.publicBaseUrl ?? getPublicBaseUrl()).replace(/\/$/, "");
    const url = new URL(`${base}/api/stcpay/_simulator`);
    url.searchParams.set("refId", input.refId);
    url.searchParams.set("amount", String(input.amount));
    url.searchParams.set("currency", input.currency);
    url.searchParams.set("description", input.description);
    return {
      redirectUrl: url.toString(),
      gatewayRef: `STCSIM-${input.refId}`,
      raw: { simulator: true, refId: input.refId },
    };
  }

  const baseUrl = (process.env.STCPAY_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const merchantId = process.env.STCPAY_MERCHANT_ID!;
  const apiKey = process.env.STCPAY_API_KEY!;

  // STC Pay Direct API – CreatePaymentSession (per integration guide).
  // Field names follow STC Pay's documented snake_case payload.
  const body = {
    MerchantId: merchantId,
    BillNumber: input.refId,
    Amount: input.amount,
    Currency: input.currency,
    Description: input.description,
    SuccessUrl: `${input.returnUrl}&status=success`,
    FailUrl: `${input.returnUrl}&status=failed`,
    CancelUrl: `${input.returnUrl}&status=cancelled`,
    CallbackUrl: input.callbackUrl,
    CustomerName: input.customerName,
    CustomerMobile: input.customerPhone,
  };

  const res = await fetch(`${baseUrl}/CreatePaymentSession`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
    body: JSON.stringify(body),
  });

  const raw = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = (raw as { Message?: string; error?: string })?.Message ??
      (raw as { error?: string })?.error ?? `STC Pay error ${res.status}`;
    throw new Error(err);
  }

  const data = raw as { RedirectUrl?: string; PaymentUrl?: string; STCPayRefNum?: string; SessionId?: string };
  const redirectUrl = data.RedirectUrl ?? data.PaymentUrl;
  const gatewayRef = data.STCPayRefNum ?? data.SessionId ?? input.refId;
  if (!redirectUrl) throw new Error("STC Pay did not return a redirect URL");
  return { redirectUrl, gatewayRef, raw };
}

export async function getPaymentStatus(gatewayRef: string): Promise<StatusResult> {
  if (isTestMode()) {
    // Simulator stores its decision in the database; this function shouldn't
    // be the source of truth in test mode (the return handler is). Return
    // pending so live-mode logic doesn't accidentally override the DB.
    return { status: "pending", raw: { simulator: true } };
  }

  const baseUrl = (process.env.STCPAY_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/$/, "");
  const apiKey = process.env.STCPAY_API_KEY!;

  const res = await fetch(`${baseUrl}/GetPaymentStatus?STCPayRefNum=${encodeURIComponent(gatewayRef)}`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      Accept: "application/json",
    },
  });
  const raw = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`STC Pay status error ${res.status}`);

  const data = raw as { Status?: string; PaymentStatus?: string };
  const reported = (data.Status ?? data.PaymentStatus ?? "").toLowerCase();
  let status: StatusResult["status"] = "pending";
  if (["paid", "completed", "success", "successful"].includes(reported)) status = "paid";
  else if (["failed", "declined", "rejected"].includes(reported)) status = "failed";
  else if (["cancelled", "canceled", "voided"].includes(reported)) status = "cancelled";
  return { status, raw };
}
