import { StatusCodes } from "http-status-codes";

import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { getPagination } from "../utils/pagination.js";
import { serializeReview } from "../utils/serializers.js";
import { createTtlCache } from "../utils/ttl-cache.js";

const publicReviewsCache = createTtlCache({ ttlMs: 60_000 });

function resolveVisibility(payload) {
  if (typeof payload.visible === "boolean") {
    return payload.visible;
  }

  if (typeof payload.isVisible === "boolean") {
    return payload.isVisible;
  }

  return undefined;
}

export async function getPublicReviews({ visible } = {}) {
  return publicReviewsCache.get(async () => {
    const reviews = await prisma.review.findMany({
      where: {
        isDeleted: false,
        isVisible: true,
      },
      orderBy: [{ sortOrder: "asc" }, { reviewDate: "desc" }],
    });

    return reviews.map(serializeReview);
  });
}

export async function listAdminReviews({ visible, source, search, page, limit } = {}) {
  const { page: currentPage, limit: pageSize, skip } = getPagination({ page, limit });
  const where = {
    isDeleted: false,
    ...(typeof visible === "boolean" ? { isVisible: visible } : {}),
    ...(source ? { source } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { text: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [reviews, total] = await Promise.all([
    prisma.review.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { reviewDate: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.review.count({ where }),
  ]);

  return {
    items: reviews.map(serializeReview),
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
}

export async function createReview(payload) {
  const review = await prisma.review.create({
    data: {
      name: payload.name,
      rating: payload.rating,
      text: payload.text,
      reviewDate: payload.date ? new Date(payload.date) : new Date(),
      source: payload.source ?? "manual",
      googleReviewUrl: payload.googleReviewUrl,
      isVisible: resolveVisibility(payload) ?? true,
      sortOrder: payload.sortOrder ?? 0,
    },
  });

  publicReviewsCache.clear();
  return serializeReview(review);
}

export async function updateReview(id, payload) {
  const existing = await prisma.review.findUnique({
    where: { id },
  });

  if (!existing || existing.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Review not found");
  }

  const review = await prisma.review.update({
    where: { id },
    data: {
      ...(typeof payload.name === "string" ? { name: payload.name } : {}),
      ...(typeof payload.rating === "number" ? { rating: payload.rating } : {}),
      ...(typeof payload.text === "string" ? { text: payload.text } : {}),
      ...(payload.date ? { reviewDate: new Date(payload.date) } : {}),
      ...(typeof payload.source === "string" ? { source: payload.source } : {}),
      ...(typeof payload.googleReviewUrl === "string" ? { googleReviewUrl: payload.googleReviewUrl } : {}),
      ...(typeof payload.sortOrder === "number" ? { sortOrder: payload.sortOrder } : {}),
      ...(typeof resolveVisibility(payload) === "boolean" ? { isVisible: resolveVisibility(payload) } : {}),
    },
  });

  publicReviewsCache.clear();
  return serializeReview(review);
}

export async function deleteReview(id) {
  const existing = await prisma.review.findUnique({
    where: { id },
  });

  if (!existing || existing.isDeleted) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Review not found");
  }

  await prisma.review.update({
    where: { id },
    data: {
      isDeleted: true,
      isVisible: false,
    },
  });

  publicReviewsCache.clear();
}
