import { env } from "../config/env.js";

const baseCookieOptions = {
  httpOnly: true,
  sameSite: env.COOKIE_SAME_SITE,
  secure: env.isProduction,
  path: "/",
};

if (env.COOKIE_DOMAIN) {
  baseCookieOptions.domain = env.COOKIE_DOMAIN;
}

export function setAdminAuthCookie(res, token) {
  res.cookie(env.COOKIE_NAME, token, {
    ...baseCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearAdminAuthCookie(res) {
  res.clearCookie(env.COOKIE_NAME, baseCookieOptions);
}

export function setUserAuthCookie(res, token) {
  res.cookie(env.USER_COOKIE_NAME, token, {
    ...baseCookieOptions,
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
}

export function clearUserAuthCookie(res) {
  res.clearCookie(env.USER_COOKIE_NAME, baseCookieOptions);
}
