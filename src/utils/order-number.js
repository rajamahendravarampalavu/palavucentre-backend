import { randomBytes } from "node:crypto";

export function generateOrderNumber(prefix = "PLC") {
  const date = new Date().toISOString().slice(0, 10).replaceAll("-", "");
  const suffix = randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${date}-${suffix}`;
}
