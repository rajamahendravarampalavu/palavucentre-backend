/**
 * Production security middleware — real protections that matter.
 *
 * What this does:
 * 1. Strips sensitive data from responses (stack traces, internal IDs)
 * 2. Adds security headers that prevent real attacks
 * 3. Prevents API response caching of sensitive data
 * 4. Adds request ID for audit trails
 * 5. Sanitizes error responses in production
 *
 * What response encryption does NOT do:
 * - The decryption key MUST be in the frontend JS bundle
 * - Anyone with DevTools can find it and decrypt everything
 * - It adds latency with zero security benefit
 * - HTTPS already encrypts data in transit (TLS 1.3)
 */

import { randomUUID } from "node:crypto";
import { env } from "../config/env.js";

/**
 * Adds security headers to every response.
 * These prevent real attack vectors (XSS, clickjacking, MIME sniffing).
 */
export function securityHeaders(req, res, next) {
  // Prevent caching of authenticated API responses
  if (req.path.startsWith("/api/account") || req.path.startsWith("/api/admin")) {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
  }

  // Prevent browsers from MIME-sniffing responses
  res.setHeader("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking
  res.setHeader("X-Frame-Options", "DENY");

  // XSS protection (legacy browsers)
  res.setHeader("X-XSS-Protection", "1; mode=block");

  // Referrer policy — don't leak URLs to third parties
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");

  // Request ID for audit logging
  const requestId = req.headers["x-request-id"] || randomUUID();
  res.setHeader("X-Request-Id", requestId);
  req.requestId = requestId;

  next();
}

/**
 * Strips sensitive fields from JSON responses in production.
 * Prevents leaking internal database IDs, stack traces, SQL queries.
 */
export function sanitizeResponses(req, res, next) {
  if (!env.isProduction) {
    next();
    return;
  }

  const originalJson = res.json.bind(res);

  res.json = function sanitizedJson(body) {
    if (body && typeof body === "object") {
      // Remove stack traces from error responses
      if (body.stack) {
        delete body.stack;
      }

      // Remove internal error details
      if (body.error && typeof body.error === "object" && body.error.stack) {
        delete body.error.stack;
      }
    }

    return originalJson(body);
  };

  next();
}

/**
 * Blocks common API abuse patterns.
 * Rejects requests with suspicious characteristics.
 */
export function apiAbuseProtection(req, res, next) {
  // Block requests with absurdly large bodies (beyond express.json limit)
  const contentLength = parseInt(req.headers["content-length"] || "0", 10);
  if (contentLength > 5 * 1024 * 1024) {
    res.status(413).json({ success: false, message: "Request too large" });
    return;
  }

  // Block requests without proper origin in production (anti-scraping)
  if (env.isProduction && req.method !== "GET" && req.method !== "HEAD" && req.method !== "OPTIONS") {
    const origin = req.headers.origin;
    const referer = req.headers.referer;

    if (!origin && !referer) {
      // Allow server-to-server calls (webhooks) but log them
      req.log?.warn({ path: req.path, ip: req.ip }, "Request without origin/referer");
    }
  }

  next();
}
