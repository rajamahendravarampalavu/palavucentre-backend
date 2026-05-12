import { PrismaClient } from "@prisma/client";

import { env } from "./env.js";
import { alertDatabaseSlow } from "../services/alertService.js";

const globalForPrisma = globalThis;

function createPrismaClient() {
  const baseClient = new PrismaClient({
    log: ["error"],
  });

  return baseClient.$extends({
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          const startedAt = Date.now();

          try {
            return await query(args);
          } finally {
            const queryMs = Date.now() - startedAt;
            alertDatabaseSlow(queryMs, `${model}.${operation}`).catch(() => null);
          }
        },
      },
    },
  });
}

export const prisma =
  globalForPrisma.prisma ||
  createPrismaClient();

if (!env.isProduction) {
  globalForPrisma.prisma = prisma;
}

export async function shutdownPrisma() {
  await prisma.$disconnect();
}

let reconnectInFlight = null;

async function reconnectPrisma() {
  if (reconnectInFlight) {
    return reconnectInFlight;
  }

  reconnectInFlight = (async () => {
    await prisma.$disconnect().catch(() => null);
    await prisma.$connect();
  })();

  try {
    await reconnectInFlight;
  } finally {
    reconnectInFlight = null;
  }
}

function isClosedConnectionError(error) {
  if (!error) {
    return false;
  }

  const message = String(error.message || "");
  const code = String(error.code || "");

  return (
    code === "P1017" ||
    message.includes("Error in PostgreSQL connection: Error { kind: Closed") ||
    message.includes("Server has closed the connection") ||
    message.includes("Connection terminated unexpectedly")
  );
}

export async function withReadDbRetry(operation, retries = 1) {
  let remainingRetries = retries;

  while (true) {
    try {
      return await operation();
    } catch (error) {
      if (remainingRetries <= 0 || !isClosedConnectionError(error)) {
        throw error;
      }

      remainingRetries -= 1;
      await reconnectPrisma();
    }
  }
}
