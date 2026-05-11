import path from "node:path";
import { fileURLToPath } from "node:url";

const currentDir = path.dirname(fileURLToPath(import.meta.url));

export const backendRootDir = path.resolve(currentDir, "..", "..");
export const uploadsRootDir = path.join(backendRootDir, "uploads");
export const uploadsPublicPath = "/uploads";
