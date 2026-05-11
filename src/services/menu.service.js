import { StatusCodes } from "http-status-codes";

import { prisma } from "../config/prisma.js";
import { DEFAULT_MENU_CATEGORY_ICON } from "../constants/menu-icons.js";
import { ApiError } from "../utils/ApiError.js";
import { rupeesToPaise } from "../utils/amounts.js";
import { getPagination } from "../utils/pagination.js";
import { serializeMenuCategory, serializeMenuItem } from "../utils/serializers.js";
import { slugify } from "../utils/slug.js";
import { createKeyedTtlCache } from "../utils/ttl-cache.js";
import { deleteManagedAsset } from "./media.service.js";

const publicMenuCache = createKeyedTtlCache({
  ttlMs: 60_000,
  serializeKey: (key) => String(Boolean(key?.includeUnavailable)),
});

async function buildUniqueCategorySlug(nameOrSlug, excludeId) {
  const base = slugify(nameOrSlug || "category");
  let candidate = base;
  let counter = 2;

  while (
    await prisma.menuCategory.findFirst({
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

async function buildUniqueItemSlug(nameOrSlug, excludeId) {
  const base = slugify(nameOrSlug || "item");
  let candidate = base;
  let counter = 2;

  while (
    await prisma.menuItem.findFirst({
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

async function loadPublicMenu({ includeUnavailable = false } = {}) {
  const categories = await prisma.menuCategory.findMany({
    where: {
      isActive: true,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      slug: true,
      description: true,
      icon: true,
      sortOrder: true,
      isActive: true,
      items: {
        where: includeUnavailable ? undefined : { isAvailable: true },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          slug: true,
          shortDescription: true,
          description: true,
          imageUrl: true,
          pricePaise: true,
          isVeg: true,
          isBestseller: true,
          isAvailable: true,
          sortOrder: true,
          createdAt: true,
          updatedAt: true,
        },
      },
    },
  });

  const serializedCategories = categories.map((category) => {
    const categoryMeta = {
      id: category.id,
      slug: category.slug,
      name: category.name,
      icon: category.icon,
    };

    return {
      id: category.id,
      name: category.name,
      slug: category.slug,
      description: category.description,
      icon: category.icon,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      items: (category.items || []).map((item) =>
        serializeMenuItem({
          ...item,
          category: categoryMeta,
        }),
      ),
    };
  });
  const categoryMap = Object.fromEntries(serializedCategories.map((category) => [category.slug, category.name]));
  const groupedItems = serializedCategories.reduce(
    (accumulator, category) => {
      accumulator[category.slug] = category.items || [];
      return accumulator;
    },
    { all: serializedCategories.flatMap((category) => category.items || []) },
  );

  return {
    categories: serializedCategories,
    categoryMap: {
      all: "All",
      ...categoryMap,
    },
    groupedItems,
    items: groupedItems.all,
  };
}

export async function getPublicMenu({ includeUnavailable = false } = {}) {
  return publicMenuCache.get({ includeUnavailable }, () => loadPublicMenu({ includeUnavailable }));
}

export async function listAdminCategories() {
  const categories = await prisma.menuCategory.findMany({
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: { items: true },
      },
    },
  });

  return categories.map((category) => ({
    ...serializeMenuCategory(category),
    itemCount: category._count.items,
  }));
}

export async function createCategory(payload) {
  const slug = await buildUniqueCategorySlug(payload.slug || payload.name);
  const category = await prisma.menuCategory.create({
    data: {
      name: payload.name,
      slug,
      description: payload.description,
      icon: payload.icon || DEFAULT_MENU_CATEGORY_ICON,
      sortOrder: payload.sortOrder ?? 0,
      isActive: payload.isActive ?? true,
    },
  });

  publicMenuCache.clear();
  return serializeMenuCategory(category);
}

export async function updateCategory(id, payload) {
  const existing = await prisma.menuCategory.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Menu category not found");
  }

  const slug =
    payload.slug || payload.name
      ? await buildUniqueCategorySlug(payload.slug || payload.name || existing.slug, id)
      : existing.slug;

  const category = await prisma.menuCategory.update({
    where: { id },
    data: {
      ...payload,
      ...(payload.slug || payload.name ? { slug } : {}),
    },
  });

  publicMenuCache.clear();
  return serializeMenuCategory(category);
}

export async function deleteCategory(id) {
  const category = await prisma.menuCategory.findUnique({
    where: { id },
    include: {
      _count: {
        select: { items: true },
      },
    },
  });

  if (!category) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Menu category not found");
  }

  if (category._count.items > 0) {
    throw new ApiError(StatusCodes.CONFLICT, "Delete or move category items before removing the category");
  }

  await prisma.menuCategory.delete({
    where: { id },
  });

  publicMenuCache.clear();
}

export async function listAdminItems({ categoryId, isAvailable, search, page, limit } = {}) {
  const { page: currentPage, limit: pageSize, skip } = getPagination({ page, limit });
  const where = {
    ...(categoryId ? { categoryId } : {}),
    ...(typeof isAvailable === "boolean" ? { isAvailable } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [items, total] = await Promise.all([
    prisma.menuItem.findMany({
      where,
      include: { category: true },
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      skip,
      take: pageSize,
    }),
    prisma.menuItem.count({ where }),
  ]);

  return {
    items: items.map(serializeMenuItem),
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
}

export async function createMenuItem(payload) {
  const category = await prisma.menuCategory.findUnique({
    where: { id: payload.categoryId },
  });

  if (!category) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Menu category not found");
  }

  const slug = await buildUniqueItemSlug(payload.slug || payload.name);

  const item = await prisma.menuItem.create({
    data: {
      categoryId: payload.categoryId,
      name: payload.name,
      slug,
      shortDescription: payload.shortDescription,
      description: payload.description || payload.shortDescription,
      imageUrl: payload.imageUrl,
      imagePublicId: payload.imagePublicId,
      pricePaise: rupeesToPaise(payload.price),
      isVeg: payload.isVeg ?? false,
      isBestseller: payload.isBestseller ?? false,
      isAvailable: payload.isAvailable ?? true,
      sortOrder: payload.sortOrder ?? 0,
    },
    include: {
      category: true,
    },
  });

  publicMenuCache.clear();
  return serializeMenuItem(item);
}

export async function updateMenuItem(id, payload) {
  const existing = await prisma.menuItem.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Menu item not found");
  }

  if (payload.categoryId) {
    const category = await prisma.menuCategory.findUnique({
      where: { id: payload.categoryId },
    });

    if (!category) {
      throw new ApiError(StatusCodes.NOT_FOUND, "Target category not found");
    }
  }

  const slug =
    payload.slug || payload.name
      ? await buildUniqueItemSlug(payload.slug || payload.name || existing.slug, id)
      : existing.slug;
  const hasImageUrlUpdate = typeof payload.imageUrl === "string" || payload.imageUrl === null;
  const nextImageUrl = hasImageUrlUpdate ? payload.imageUrl : existing.imageUrl;
  const nextImagePublicId =
    typeof payload.imagePublicId === "string"
      ? payload.imagePublicId
      : hasImageUrlUpdate && payload.imageUrl !== existing.imageUrl
        ? null
        : existing.imagePublicId;

  const item = await prisma.menuItem.update({
    where: { id },
    data: {
      ...(payload.categoryId ? { categoryId: payload.categoryId } : {}),
      ...(payload.name ? { name: payload.name } : {}),
      ...(typeof payload.shortDescription === "string" ? { shortDescription: payload.shortDescription } : {}),
      ...(typeof payload.description === "string" ? { description: payload.description } : {}),
      ...(hasImageUrlUpdate ? { imageUrl: payload.imageUrl } : {}),
      ...(hasImageUrlUpdate || typeof payload.imagePublicId === "string" ? { imagePublicId: nextImagePublicId } : {}),
      ...(payload.price ? { pricePaise: rupeesToPaise(payload.price) } : {}),
      ...(typeof payload.isVeg === "boolean" ? { isVeg: payload.isVeg } : {}),
      ...(typeof payload.isBestseller === "boolean" ? { isBestseller: payload.isBestseller } : {}),
      ...(typeof payload.isAvailable === "boolean" ? { isAvailable: payload.isAvailable } : {}),
      ...(typeof payload.sortOrder === "number" ? { sortOrder: payload.sortOrder } : {}),
      ...(payload.slug || payload.name ? { slug } : {}),
    },
    include: {
      category: true,
    },
  });

  if ((hasImageUrlUpdate || typeof payload.imagePublicId === "string") && existing.imageUrl !== nextImageUrl) {
    await deleteManagedAsset({
      publicId: existing.imagePublicId,
      url: existing.imageUrl,
    });
  }

  publicMenuCache.clear();
  return serializeMenuItem(item);
}

export async function deleteMenuItem(id) {
  const item = await prisma.menuItem.findUnique({
    where: { id },
  });

  if (!item) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Menu item not found");
  }

  await prisma.menuItem.delete({
    where: { id },
  });

  await deleteManagedAsset({
    publicId: item.imagePublicId,
    url: item.imageUrl,
  });

  publicMenuCache.clear();
}
