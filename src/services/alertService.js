import { exec } from "node:child_process";
import { promisify } from "node:util";

import { env } from "../config/env.js";
import { logger } from "../config/logger.js";

const execAsync = promisify(exec);
const ERROR_WINDOW_MS = 60_000;
const serverErrorCounters = new Map();

function getIstTimestamp() {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

function getAlertPrefix(label) {
  return `${label} | PRODUCTION | ${getIstTimestamp()}`;
}

export async function sendTelegramAlert(message) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) {
    return false;
  }

  const response = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: message,
    }),
  });

  if (!response.ok) {
    const body = await response.text().catch(() => "");
    logger.warn({ status: response.status, body }, "Telegram alert failed");
    return false;
  }

  return true;
}

export async function alertServerError(route, error, userId) {
  const now = Date.now();
  const key = String(route || "unknown");
  const current = serverErrorCounters.get(key);
  const nextCounter =
    current && current.expiresAt > now
      ? { count: current.count + 1, expiresAt: current.expiresAt }
      : { count: 1, expiresAt: now + ERROR_WINDOW_MS };

  serverErrorCounters.set(key, nextCounter);

  if (nextCounter.count !== 3) {
    return false;
  }

  return sendTelegramAlert(
    `${getAlertPrefix("🚨 SERVER ERROR")} | Route: ${key} | Error: ${error?.message || "Unknown error"} | User: ${
      userId || "guest"
    }`,
  );
}

export async function alertPaymentFailed(orderId, amount, reason) {
  return sendTelegramAlert(
    `${getAlertPrefix("💳 PAYMENT FAILED")} | Order: ${orderId} | Amount: ₹${Number(amount || 0).toLocaleString(
      "en-IN",
    )} | Reason: ${reason || "Unknown"}`,
  );
}

export async function alertLowDisk() {
  try {
    const { stdout } = await execAsync("df -h /");
    const lines = stdout.trim().split(/\r?\n/);
    const values = lines[1]?.trim().split(/\s+/) || [];
    const usedPercent = Number(String(values[4] || "").replace("%", ""));

    if (Number.isFinite(usedPercent) && usedPercent > 85) {
      return sendTelegramAlert(`${getAlertPrefix("💾 LOW DISK SPACE")} | Disk used: ${usedPercent}%`);
    }
  } catch (error) {
    logger.warn({ err: error }, "Could not check disk usage");
  }

  return false;
}

export async function alertHighMemory() {
  const memory = process.memoryUsage();
  const usedPercent = Math.round((memory.heapUsed / memory.heapTotal) * 100);

  if (usedPercent > 80) {
    return sendTelegramAlert(`${getAlertPrefix("🧠 HIGH MEMORY")} | Heap: ${usedPercent}%`);
  }

  return false;
}

export async function alertDatabaseSlow(queryMs, queryName) {
  if (queryMs <= 3000) {
    return false;
  }

  return sendTelegramAlert(`${getAlertPrefix("🐢 SLOW QUERY")} | Query: ${queryName} | Time: ${queryMs}ms`);
}
