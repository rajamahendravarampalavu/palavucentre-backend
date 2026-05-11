import { StatusCodes } from "http-status-codes";

import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { getPagination } from "../utils/pagination.js";
import { serializeOffer } from "../utils/serializers.js";
import { slugify } from "../utils/slug.js";
import { createKeyedTtlCache } from "../utils/ttl-cache.js";
import { deleteManagedAsset } from "./media.service.js";

const publicOffersCache = createKeyedTtlCache({
  ttlMs: 60_000,
  serializeKey: (key) => String(Boolean(key?.active)),
});

async function buildUniqueOfferSlug(nameOrSlug, excludeId) {
  const base = slugify(nameOrSlug || "offer");
  let candidate = base;
  let counter = 2;

  while (
    await prisma.offer.findFirst({
      where: {
        slug: candidate,
        ...(excludeId ? { NOT: { id: excludeId } } : {}),
      },
      select: { id: true },
    })
  ) {
    candidate = `${base}-${counter++}`;
  }

  return candidate;
}

export async function getPublicOffers({ active = true } = {}) {
  return publicOffersCache.get({ active }, async () => {
    const now = new Date();
    const offers = await prisma.offer.findMany({
      where: active
        ? {
            status: "active",
            OR: [{ startDate: null }, { startDate: { lte: now } }],
            AND: [{ OR: [{ endDate: null }, { endDate: { gte: now } }] }],
          }
        : undefined,
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    });

    return offers.map(serializeOffer);
  });
}

export async function listAdminOffers({ status, search, page, limit } = {}) {
  const { page: currentPage, limit: pageSize, skip } = getPagination({ page, limit });
  const where = {
    ...(status ? { status } : {}),
    ...(search
      ? {
          OR: [
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [offers, total] = await Promise.all([
    prisma.offer.findMany({
      where,
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.offer.count({ where }),
  ]);

  return {
    items: offers.map(serializeOffer),
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
}

export async function createOffer(payload) {
  const slug = await buildUniqueOfferSlug(payload.slug || payload.title);
  const offer = await prisma.offer.create({
    data: {
      title: payload.title,
      slug,
      description: payload.description,
      imageUrl: payload.imageUrl,
      imagePublicId: payload.imagePublicId,
      ctaLabel: payload.ctaLabel,
      ctaHref: payload.ctaHref,
      startDate: payload.startDate ? new Date(payload.startDate) : null,
      endDate: payload.endDate ? new Date(payload.endDate) : null,
      status: payload.status ?? "draft",
      isFeatured: payload.isFeatured ?? false,
      sortOrder: payload.sortOrder ?? 0,
    },
  });

  publicOffersCache.clear();
  return serializeOffer(offer);
}

export async function updateOffer(id, payload) {
  const existing = await prisma.offer.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Offer not found");
  }

  const slug =
    payload.slug || payload.title
      ? await buildUniqueOfferSlug(payload.slug || payload.title || existing.slug, id)
      : existing.slug;
  const hasImageUrlUpdate = typeof payload.imageUrl === "string" || payload.imageUrl === null;
  const nextImageUrl = hasImageUrlUpdate ? payload.imageUrl : existing.imageUrl;
  const nextImagePublicId =
    typeof payload.imagePublicId === "string"
      ? payload.imagePublicId
      : hasImageUrlUpdate && payload.imageUrl !== existing.imageUrl
        ? null
        : existing.imagePublicId;

  const offer = await prisma.offer.update({
    where: { id },
    data: {
      ...(typeof payload.title === "string" ? { title: payload.title } : {}),
      ...(typeof payload.description === "string" ? { description: payload.description } : {}),
      ...(hasImageUrlUpdate ? { imageUrl: payload.imageUrl } : {}),
      ...(hasImageUrlUpdate || typeof payload.imagePublicId === "string"
        ? { imagePublicId: nextImagePublicId }
        : {}),
      ...(typeof payload.ctaLabel === "string" || payload.ctaLabel === null ? { ctaLabel: payload.ctaLabel } : {}),
      ...(typeof payload.ctaHref === "string" || payload.ctaHref === null ? { ctaHref: payload.ctaHref } : {}),
      ...(typeof payload.status === "string" ? { status: payload.status } : {}),
      ...(typeof payload.isFeatured === "boolean" ? { isFeatured: payload.isFeatured } : {}),
      ...(typeof payload.sortOrder === "number" ? { sortOrder: payload.sortOrder } : {}),
      ...(payload.slug || payload.title ? { slug } : {}),
      ...(Object.prototype.hasOwnProperty.call(payload, "startDate")
        ? { startDate: payload.startDate ? new Date(payload.startDate) : null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(payload, "endDate")
        ? { endDate: payload.endDate ? new Date(payload.endDate) : null }
        : {}),
    },
  });

  if ((hasImageUrlUpdate || typeof payload.imagePublicId === "string") && existing.imageUrl !== nextImageUrl) {
    await deleteManagedAsset({
      publicId: existing.imagePublicId,
      url: existing.imageUrl,
    });
  }

  publicOffersCache.clear();
  return serializeOffer(offer);
}

export async function deleteOffer(id) {
  const existing = await prisma.offer.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Offer not found");
  }

  await prisma.offer.delete({
    where: { id },
  });

  await deleteManagedAsset({
    publicId: existing.imagePublicId,
    url: existing.imageUrl,
  });

  publicOffersCache.clear();
}
