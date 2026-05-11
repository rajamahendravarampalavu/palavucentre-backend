import { env } from "./env.js";

function isLocalDevelopmentOrigin(origin) {
  if (env.isProduction || !origin) {
    return false;
  }

  try {
    const url = new URL(origin);
    return ["localhost", "127.0.0.1", "::1"].includes(url.hostname);
  } catch {
    return false;
  }
}

export const corsOptions = {
  origin(origin, callback) {
    if (!origin || env.corsOrigins.includes(origin) || isLocalDevelopmentOrigin(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
};
