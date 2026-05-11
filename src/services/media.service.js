import { randomUUID } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";

import { StatusCodes } from "http-status-codes";
import sharp from "sharp";

import { env } from "../config/env.js";
import { uploadsPublicPath, uploadsRootDir } from "../config/paths.js";
import { ApiError } from "../utils/ApiError.js";

const allowedUploadFolders = new Set(["general", "menu", "gallery", "offers", "settings"]);
const uploadsRootResolved = path.resolve(uploadsRootDir);
const targetUploadSizeBytes = env.MAX_UPLOAD_FILE_SIZE_MB * 1024 * 1024;
const passthroughMimeTypes = new Set(["image/gif"]);

const mimeExtensionMap = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
  "image/avif": ".avif",
};

const optimizationProfiles = [
  { format: "webp", quality: 84, width: 2600 },
  { format: "webp", quality: 80, width: 2400 },
  { format: "webp", quality: 76, width: 2200 },
  { format: "webp", quality: 72, width: 2000 },
  { format: "jpeg", quality: 82, width: 2200 },
  { format: "jpeg", quality: 76, width: 1900 },
  { format: "jpeg", quality: 70, width: 1700 },
];

async function ensureDirectory(targetPath) {
  await fs.mkdir(targetPath, { recursive: true });
}

async function countStoredFiles(targetPath) {
  try {
    const entries = await fs.readdir(targetPath, { withFileTypes: true });
    let total = 0;

    for (const entry of entries) {
      const entryPath = path.join(targetPath, entry.name);
      if (entry.isDirectory()) {
        total += await countStoredFiles(entryPath);
      } else if (entry.isFile()) {
        total += 1;
      }
    }

    return total;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return 0;
    }

    throw error;
  }
}

function normalizeUploadFolder(folder) {
  const normalized = String(folder || "general")
    .trim()
    .toLowerCase();

  return allowedUploadFolders.has(normalized) ? normalized : "general";
}

function getFileExtension(file) {
  const mimeExtension = mimeExtensionMap[file?.mimetype];
  if (mimeExtension) {
    return mimeExtension;
  }

  const originalExtension = path.extname(file?.originalname || "").toLowerCase();
  if ([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"].includes(originalExtension)) {
    return originalExtension;
  }

  return ".jpg";
}

function buildUploadUrl(publicId) {
  return `${uploadsPublicPath}/${publicId}`;
}

async function optimizeImageBuffer(file) {
  if (!file?.buffer?.length) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Image file is required");
  }

  if (file.mimetype === "image/svg+xml") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "SVG uploads are not supported");
  }

  if (file.size <= targetUploadSizeBytes) {
    return {
      buffer: file.buffer,
      mimeType: file.mimetype,
      extension: getFileExtension(file),
      optimized: false,
      size: file.size,
      originalSize: file.size,
    };
  }

  if (passthroughMimeTypes.has(file.mimetype)) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `This image type cannot be auto-optimized above ${env.MAX_UPLOAD_FILE_SIZE_MB}MB. Please resize it and upload again`,
    );
  }

  let metadata;
  try {
    metadata = await sharp(file.buffer, { failOn: "none" }).metadata();
  } catch {
    throw new ApiError(StatusCodes.BAD_REQUEST, "The uploaded image could not be processed");
  }

  for (const profile of optimizationProfiles) {
    const transformer = sharp(file.buffer, { failOn: "none" }).rotate().resize({
      width: profile.width,
      height: profile.width,
      fit: "inside",
      withoutEnlargement: true,
    });

    const outputBuffer =
      profile.format === "webp"
        ? await transformer.webp({ quality: profile.quality, effort: 4 }).toBuffer()
        : await transformer.jpeg({ quality: profile.quality, mozjpeg: true }).toBuffer();

    if (outputBuffer.length <= targetUploadSizeBytes) {
      return {
        buffer: outputBuffer,
        mimeType: profile.format === "webp" ? "image/webp" : "image/jpeg",
        extension: profile.format === "webp" ? ".webp" : ".jpg",
        optimized: true,
        size: outputBuffer.length,
        originalSize: file.size,
        width: metadata.width,
        height: metadata.height,
      };
    }
  }

  throw new ApiError(
    StatusCodes.BAD_REQUEST,
    `Image is too large to optimize under ${env.MAX_UPLOAD_FILE_SIZE_MB}MB. Please resize it before uploading`,
  );
}

function extractManagedPublicId({ publicId, url }) {
  if (typeof publicId === "string" && publicId.trim()) {
    return publicId.trim().replace(/^\/+/, "").replace(/\\/g, "/");
  }

  if (typeof url !== "string" || !url.trim()) {
    return null;
  }

  const trimmedUrl = url.trim();
  const uploadsPrefix = `${uploadsPublicPath}/`;

  if (trimmedUrl.startsWith(uploadsPrefix)) {
    return trimmedUrl.slice(uploadsPrefix.length);
  }

  try {
    const parsedUrl = new URL(trimmedUrl);
    if (parsedUrl.pathname.startsWith(uploadsPrefix)) {
      return parsedUrl.pathname.slice(uploadsPrefix.length);
    }
  } catch {
    return null;
  }

  return null;
}

function resolveManagedFilePath(publicId) {
  if (!publicId) {
    return null;
  }

  const normalized = publicId.replace(/^\/+/, "").replace(/\\/g, "/");
  const resolvedPath = path.resolve(uploadsRootDir, normalized);
  const relativeToRoot = path.relative(uploadsRootResolved, resolvedPath);

  if (relativeToRoot.startsWith("..") || path.isAbsolute(relativeToRoot)) {
    return null;
  }

  return resolvedPath;
}

async function pruneEmptyDirectories(startPath) {
  let currentPath = startPath;

  while (currentPath.startsWith(uploadsRootResolved) && currentPath !== uploadsRootResolved) {
    const remainingEntries = await fs.readdir(currentPath);
    if (remainingEntries.length > 0) {
      return;
    }

    await fs.rmdir(currentPath);
    currentPath = path.dirname(currentPath);
  }
}

export async function uploadLocalImage({ file, folder }) {
  if (!file?.buffer?.length) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Image file is required");
  }

  await ensureDirectory(uploadsRootDir);

  const storedImageCount = await countStoredFiles(uploadsRootDir);
  if (storedImageCount >= env.MAX_UPLOAD_IMAGES) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Image limit reached. Delete an existing upload before storing more than ${env.MAX_UPLOAD_IMAGES} images`,
    );
  }

  const normalizedFolder = normalizeUploadFolder(folder);
  const targetDirectory = path.join(uploadsRootDir, normalizedFolder);
  await ensureDirectory(targetDirectory);

  const optimizedAsset = await optimizeImageBuffer(file);
  const extension = optimizedAsset.extension;
  const filename = `${Date.now()}-${randomUUID()}${extension}`;
  const publicId = `${normalizedFolder}/${filename}`.replace(/\\/g, "/");
  const outputPath = path.join(targetDirectory, filename);

  await fs.writeFile(outputPath, optimizedAsset.buffer);

  return {
    url: buildUploadUrl(publicId),
    publicId,
    folder: normalizedFolder,
    filename,
    mimeType: optimizedAsset.mimeType,
    size: optimizedAsset.size,
    originalSize: optimizedAsset.originalSize,
    optimized: optimizedAsset.optimized,
  };
}

export async function deleteManagedAsset({ publicId, url }) {
  if (!env.MEDIA_DELETE_ON_REMOVE) {
    return false;
  }

  const managedPublicId = extractManagedPublicId({ publicId, url });
  const targetPath = resolveManagedFilePath(managedPublicId);

  if (!targetPath) {
    return false;
  }

  try {
    await fs.unlink(targetPath);
    await pruneEmptyDirectories(path.dirname(targetPath));
    return true;
  } catch (error) {
    if (error?.code === "ENOENT") {
      return false;
    }

    throw error;
  }
}
