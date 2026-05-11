import "dotenv/config";

import { z } from "zod";

const emptyToUndefined = (value) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim() === "" ? undefined : value.trim();
};

const toNumber = (value) => {
  if (typeof value === "string" && value.trim() !== "") {
    return Number(value);
  }

  return value;
};

const toBoolean = (value) => {
  if (typeof value === "string") {
    if (["true", "1", "yes"].includes(value.toLowerCase())) {
      return true;
    }

    if (["false", "0", "no"].includes(value.toLowerCase())) {
      return false;
    }
  }

  return value;
};

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    PORT: z.preprocess(toNumber, z.number().int().positive().default(4000)),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    CORS_ORIGIN: z.string().default("http://localhost:5173"),
    COOKIE_DOMAIN: z.preprocess(emptyToUndefined, z.string().optional()),
    COOKIE_SAME_SITE: z.enum(["lax", "strict", "none"]).default("lax"),
    COOKIE_NAME: z.string().default("palavu_admin_token"),
    USER_COOKIE_NAME: z.string().default("palavu_user_token"),
    JWT_SECRET: z.string().min(16).default("development-only-change-this-secret"),
    JWT_EXPIRES_IN: z.string().default("7d"),
    CSRF_SECRET: z.string().min(16).default("development-only-change-this-csrf-secret"),
    ORDER_TAX_PERCENT: z.preprocess(toNumber, z.number().min(0).max(100).default(5)),
    CURRENCY: z.string().default("INR"),
    RAZORPAY_KEY_ID: z.preprocess(emptyToUndefined, z.string().optional()),
    RAZORPAY_KEY_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
    RAZORPAY_WEBHOOK_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
    DEFAULT_HERO_MEDIA_URL: z.preprocess(emptyToUndefined, z.string().optional()),
    DEFAULT_LOGO_URL: z.preprocess(emptyToUndefined, z.string().optional()),
    MEDIA_DELETE_ON_REMOVE: z.preprocess(toBoolean, z.boolean().default(true)),
    MAX_UPLOAD_IMAGES: z.preprocess(toNumber, z.number().int().min(1).max(500).default(50)),
    MAX_UPLOAD_FILE_SIZE_MB: z.preprocess(toNumber, z.number().int().min(1).max(25).default(5)),
    MAX_UPLOAD_SOURCE_FILE_SIZE_MB: z.preprocess(toNumber, z.number().int().min(1).max(50).default(20)),
    GOOGLE_CLIENT_ID: z.preprocess(emptyToUndefined, z.string().optional()),
    GOOGLE_CLIENT_SECRET: z.preprocess(emptyToUndefined, z.string().optional()),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production" && data.JWT_SECRET === "development-only-change-this-secret") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["JWT_SECRET"],
        message: "JWT_SECRET must be overridden in production",
      });
    }

    if (data.NODE_ENV === "production" && data.CSRF_SECRET === "development-only-change-this-csrf-secret") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["CSRF_SECRET"],
        message: "CSRF_SECRET must be overridden in production",
      });
    }

    const hasRazorpayPartial = Boolean(data.RAZORPAY_KEY_ID) !== Boolean(data.RAZORPAY_KEY_SECRET);
    if (hasRazorpayPartial) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["RAZORPAY_KEY_ID"],
        message: "Both Razorpay credentials must be provided together",
      });
    }

    if (data.COOKIE_SAME_SITE === "none" && data.NODE_ENV !== "production") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["COOKIE_SAME_SITE"],
        message: "COOKIE_SAME_SITE=none should be used only with HTTPS production deployments",
      });
    }
  });

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  const issues = parsedEnv.error.issues
    .map((issue) => `${issue.path.join(".") || "env"}: ${issue.message}`)
    .join("\n");

  throw new Error(`Environment validation failed:\n${issues}`);
}

export const env = {
  ...parsedEnv.data,
  corsOrigins: parsedEnv.data.CORS_ORIGIN.split(",").map((origin) => origin.trim()).filter(Boolean),
  isProduction: parsedEnv.data.NODE_ENV === "production",
};
