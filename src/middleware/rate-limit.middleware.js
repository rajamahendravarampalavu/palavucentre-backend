import rateLimit from "express-rate-limit";
import { StatusCodes } from "http-status-codes";

function buildLimiter({ windowMs, max, message, skipSuccessfulRequests = false }) {
  return rateLimit({
    windowMs,
    max,
    skipSuccessfulRequests,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (_req, res) => {
      res.status(StatusCodes.TOO_MANY_REQUESTS).json({
        success: false,
        message,
      });
    },
  });
}

export const authRateLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  skipSuccessfulRequests: true,
  message: "Too many authentication attempts. Please try again later.",
});

export const adminAuthLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: "Too many admin login attempts. Try again in 15 minutes.",
});

export const globalApiLimiter = buildLimiter({
  windowMs: 60 * 1000,
  max: 120,
  message: "Too many requests. Please slow down.",
});

export const orderRateLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: "Too many order attempts. Please wait a moment before retrying.",
});

export const orderTrackingRateLimiter = buildLimiter({
  windowMs: 15 * 60 * 1000,
  max: 60,
  message: "Too many tracking attempts. Please wait a moment before retrying.",
});

export const publicFormRateLimiter = buildLimiter({
  windowMs: 60 * 60 * 1000,
  max: 20,
  message: "Too many form submissions from this IP. Please try again later.",
});

export const inquiryRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(StatusCodes.TOO_MANY_REQUESTS).json({
      success: false,
      message: "Too many inquiries. Please try again later.",
    });
  },
});
