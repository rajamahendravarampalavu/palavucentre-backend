import { z } from "zod";

import {
  assetUrlSchema,
  booleanishSchema,
  idParamSchema,
  optionalAssetUrlSchema,
  optionalTrimmedString,
  paginationQuerySchema,
} from "./common.js";

export const publicGalleryQuerySchema = {
  query: z.object({
    category: optionalTrimmedString,
    visible: booleanishSchema.optional(),
  }).strip(),
};

export const adminGalleryQuerySchema = {
  query: paginationQuerySchema.extend({
    category: optionalTrimmedString,
    visible: booleanishSchema.optional(),
  }).strip(),
};

export const createGalleryItemSchema = {
  body: z.object({
    title: optionalTrimmedString,
    altText: optionalTrimmedString,
    url: assetUrlSchema,
    publicId: optionalTrimmedString,
    mediaType: z.enum(["image", "video"]).default("image").optional(),
    category: z.string().trim().min(2).max(40).default("food").optional(),
    sortOrder: z.coerce.number().int().min(0).default(0).optional(),
    visible: z.boolean().optional(),
    isVisible: z.boolean().optional(),
  }).strip(),
};

export const updateGalleryItemSchema = {
  params: idParamSchema,
  body: z.object({
    title: optionalTrimmedString,
    altText: optionalTrimmedString,
    url: optionalAssetUrlSchema,
    publicId: optionalTrimmedString,
    mediaType: z.enum(["image", "video"]).optional(),
    category: z.string().trim().min(2).max(40).optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
    visible: z.boolean().optional(),
    isVisible: z.boolean().optional(),
  }).strip(),
};

export const galleryItemIdParamSchema = {
  params: idParamSchema,
};
