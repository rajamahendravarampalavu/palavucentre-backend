import { randomUUID } from "node:crypto";

import { doubleCsrf } from "csrf-csrf";

import { env } from "../config/env.js";

const CSRF_SESSION_COOKIE_NAME = "palavu_csrf_session";
const CSRF_EXEMPT_PATHS = new Set(["/api/payments/razorpay/webhook"]);

function getBaseCookieOptions() {
  const cookieOptions = {
    sameSite: env.COOKIE_SAME_SITE || "lax",
    secure: env.isProduction || env.COOKIE_SAME_SITE === "none",
    path: "/",
    httpOnly: true,
  };

  if (env.COOKIE_DOMAIN) {
    cookieOptions.domain = env.COOKIE_DOMAIN;
  }

  return cookieOptions;
}

function ensureCsrfSessionCookie(req, res) {
  const existingSessionId = req.cookies?.[CSRF_SESSION_COOKIE_NAME];

  if (existingSessionId) {
    return existingSessionId;
  }

  const sessionId = randomUUID();
  const cookieOptions = {
    ...getBaseCookieOptions(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  };

  req.cookies = {
    ...(req.cookies || {}),
    [CSRF_SESSION_COOKIE_NAME]: sessionId,
  };

  res.cookie(CSRF_SESSION_COOKIE_NAME, sessionId, cookieOptions);

  return sessionId;
}

const {
  generateCsrfToken,
  doubleCsrfProtection: enforceDoubleCsrfProtection,
} = doubleCsrf({
  getSecret: () => env.CSRF_SECRET,
  getSessionIdentifier: (req) =>
    req.cookies?.[env.USER_COOKIE_NAME] ||
    req.cookies?.[env.COOKIE_NAME] ||
    req.cookies?.[CSRF_SESSION_COOKIE_NAME] ||
    "guest",
  cookieName: "palavu_csrf_token",
  cookieOptions: getBaseCookieOptions(),
  getCsrfTokenFromRequest: (req) => req.headers["x-csrf-token"],
});

export function generateToken(req, res, options) {
  ensureCsrfSessionCookie(req, res);
  return generateCsrfToken(req, res, options);
}

export function doubleCsrfProtection(req, res, next) {
  if (CSRF_EXEMPT_PATHS.has(req.path)) {
    next();
    return;
  }

  enforceDoubleCsrfProtection(req, res, next);
}
