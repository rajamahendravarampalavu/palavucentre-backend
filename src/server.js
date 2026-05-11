import { env } from "./config/env.js";
import { logger } from "./config/logger.js";
import { shutdownPrisma } from "./config/prisma.js";
import { createApp } from "./app.js";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info(`Backend listening on port ${env.PORT}`);
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
