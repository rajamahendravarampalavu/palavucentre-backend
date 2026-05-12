import { env } from "./env.js";

const productionCorsOrigins = ["https://rjmpalavucentre.com", "https://admin.rjmpalavucentre.com"];

export const activeCorsOrigins = env.isProduction
  ? productionCorsOrigins
  : [...productionCorsOrigins, "http://localhost:5173"];

export const corsOptions = {
  origin(origin, callback) {
    if (!origin || activeCorsOrigins.includes(origin)) {
      callback(null, true);
      return;
    }

    callback(null, false);
  },
  credentials: true,
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"],
};
