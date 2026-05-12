import cron from "node-cron";

import { activeCorsOrigins } from "./config/cors.js";
import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { shutdownPrisma } from "./config/prisma.js";
import { createApp } from "./app.js";
import { alertHighMemory, alertLowDisk } from "./services/alertService.js";

const app = createApp();

function registerMonitoringJobs() {
  cron.schedule("0 * * * *", () => {
    alertLowDisk().catch((error) => logger.warn({ err: error }, "Low disk alert job failed"));
  });

  cron.schedule("*/30 * * * *", () => {
    alertHighMemory().catch((error) => logger.warn({ err: error }, "High memory alert job failed"));
  });
}

registerMonitoringJobs();

const server = app.listen(env.PORT, () => {
  logger.info(`Backend listening on port ${env.PORT}`);
  logger.info({ corsOrigins: activeCorsOrigins }, "Active CORS origins");
});

async function gracefulShutdown(signal) {
  logger.info({ signal }, "Shutting down server");

  server.close(async () => {
    await shutdownPrisma();
    process.exit(0);
  });
}

process.on("SIGINT", () => gracefulShutdown("SIGINT"));
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
