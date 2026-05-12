import { z } from "zod";

import { DEFAULT_MENU_CATEGORY_ICON, MENU_CATEGORY_ICON_KEYS } from "../constants/menu-icons.js";
import { booleanishSchema, idParamSchema, optionalAssetUrlSchema, optionalTrimmedString, paginationQuerySchema } from "./common.js";

export const publicMenuQuerySchema = {
  query: z.object({
    includeUnavailable: booleanishSchema.optional(),
  }).strip(),
};

export const createCategorySchema = {
  body: z.object({
    name: z.string().trim().min(2).max(80),
    slug: optionalTrimmedString,
    description: optionalTrimmedString,
    icon: z.enum(MENU_CATEGORY_ICON_KEYS).default(DEFAULT_MENU_CATEGORY_ICON),
    sortOrder: z.coerce.number().int().min(0).default(0).optional(),
    isActive: z.boolean().default(true).optional(),
  }).strip(),
};

export const updateCategorySchema = {
  params: idParamSchema,
  body: z.object({
    name: z.string().trim().min(2).max(80).optional(),
    slug: optionalTrimmedString,
    description: optionalTrimmedString,
    icon: z.enum(MENU_CATEGORY_ICON_KEYS).optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
    isActive: z.boolean().optional(),
  }).strip(),
};

export const listAdminMenuItemsQuerySchema = {
  query: paginationQuerySchema.extend({
    categoryId: z.coerce.number().int().positive().optional(),
    isAvailable: booleanishSchema.optional(),
  }).strip(),
};

export const createMenuItemSchema = {
  body: z.object({
    categoryId: z.coerce.number().int().positive(),
    name: z.string().trim().min(2).max(120),
    slug: optionalTrimmedString,
    shortDescription: optionalTrimmedString,
    description: optionalTrimmedString,
    imageUrl: optionalAssetUrlSchema,
    imagePublicId: optionalTrimmedString,
    price: z.coerce.number().positive(),
    isVeg: z.boolean().default(false).optional(),
    isBestseller: z.boolean().default(false).optional(),
    isAvailable: z.boolean().default(true).optional(),
    sortOrder: z.coerce.number().int().min(0).default(0).optional(),
  }).strip(),
};

export const updateMenuItemSchema = {
  params: idParamSchema,
  body: z.object({
    categoryId: z.coerce.number().int().positive().optional(),
    name: z.string().trim().min(2).max(120).optional(),
    slug: optionalTrimmedString,
    shortDescription: optionalTrimmedString,
    description: optionalTrimmedString,
    imageUrl: optionalAssetUrlSchema,
    imagePublicId: optionalTrimmedString,
    price: z.coerce.number().positive().optional(),
    isVeg: z.boolean().optional(),
    isBestseller: z.boolean().optional(),
    isAvailable: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
  }).strip(),
};

export const menuEntityIdParamSchema = {
  params: idParamSchema,
};
