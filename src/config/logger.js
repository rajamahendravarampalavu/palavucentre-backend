import { mkdirSync } from "node:fs";
import { join } from "node:path";
import pino from "pino";

import { env } from "./env.js";

const logDir = join(process.cwd(), "logs");
if (env.isProduction) {
  mkdirSync(logDir, { recursive: true });
}

function getTransport() {
  if (!env.isProduction) {
    return {
      target: "pino-pretty",
      options: {
        colorize: true,
        translateTime: "SYS:standard",
        ignore: "pid,hostname",
      },
    };
  }

  return {
    targets: [
      { target: "pino/file", options: { destination: join(logDir, "app.log"), mkdir: true } },
      { target: "pino/file", options: { destination: 1 } },
    ],
  };
}

export const logger = pino({
  level: env.isProduction ? "info" : "debug",
  transport: getTransport(),
  redact: {
    paths: [
      "req.headers.authorization",
      "req.headers.cookie",
      "req.headers['x-razorpay-signature']",
      "res.headers['set-cookie']",
      "body.password",
      "body.code",
      "body.razorpaySignature",
    ],
    censor: "[Redacted]",
  },
});
