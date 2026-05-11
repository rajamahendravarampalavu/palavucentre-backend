import { StatusCodes } from "http-status-codes";

import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { getPagination } from "../utils/pagination.js";
import { serializeGalleryItem } from "../utils/serializers.js";
import { deleteManagedAsset } from "./media.service.js";

function resolveVisibility(payload) {
  if (typeof payload.visible === "boolean") {
    return payload.visible;
  }

  if (typeof payload.isVisible === "boolean") {
    return payload.isVisible;
  }

  return undefined;
}

export async function getPublicGallery({ category, visible } = {}) {
  const items = await prisma.galleryItem.findMany({
    where: {
      ...(category ? { category } : {}),
      isVisible: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
  });

  return items.map(serializeGalleryItem);
}

export async function listAdminGallery({ category, visible, search, page, limit } = {}) {
  const { page: currentPage, limit: pageSize, skip } = getPagination({ page, limit });
  const where = {
    ...(category ? { category } : {}),
    ...(typeof visible === "boolean" ? { isVisible: visible } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { altText: { contains: search, mode: "insensitive" } },
            { category: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.galleryItem.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.galleryItem.count({ where }),
  ]);

  return {
    items: items.map(serializeGalleryItem),
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
}

export async function createGalleryItem(payload) {
  const item = await prisma.galleryItem.create({
    data: {
      title: payload.title,
      altText: payload.altText,
      url: payload.url,
      publicId: payload.publicId,
      mediaType: payload.mediaType ?? "image",
      category: payload.category ?? "food",
      sortOrder: payload.sortOrder ?? 0,
      isVisible: resolveVisibility(payload) ?? true,
    },
  });

  return serializeGalleryItem(item);
}

export async function updateGalleryItem(id, payload) {
  const existing = await prisma.galleryItem.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Gallery item not found");
  }

  const hasUrlUpdate = typeof payload.url === "string";
  const nextUrl = hasUrlUpdate ? payload.url : existing.url;
  const nextPublicId =
    typeof payload.publicId === "string"
      ? payload.publicId
      : hasUrlUpdate && payload.url !== existing.url
        ? null
        : existing.publicId;

  const item = await prisma.galleryItem.update({
    where: { id },
    data: {
      ...(typeof payload.title === "string" ? { title: payload.title } : {}),
      ...(typeof payload.altText === "string" ? { altText: payload.altText } : {}),
      ...(hasUrlUpdate ? { url: payload.url } : {}),
      ...(hasUrlUpdate || typeof payload.publicId === "string" ? { publicId: nextPublicId } : {}),
      ...(typeof payload.mediaType === "string" ? { mediaType: payload.mediaType } : {}),
      ...(typeof payload.category === "string" ? { category: payload.category } : {}),
      ...(typeof payload.sortOrder === "number" ? { sortOrder: payload.sortOrder } : {}),
      ...(typeof resolveVisibility(payload) === "boolean" ? { isVisible: resolveVisibility(payload) } : {}),
    },
  });

  if ((hasUrlUpdate || typeof payload.publicId === "string") && existing.url !== nextUrl) {
    await deleteManagedAsset({
      publicId: existing.publicId,
      url: existing.url,
    });
  }

  return serializeGalleryItem(item);
}

export async function deleteGalleryItem(id) {
  const existing = await prisma.galleryItem.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Gallery item not found");
  }

  await prisma.galleryItem.delete({
    where: { id },
  });

  await deleteManagedAsset({
    publicId: existing.publicId,
    url: existing.url,
  });
}
