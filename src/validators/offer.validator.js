import { z } from "zod";

import { booleanishSchema, idParamSchema, optionalAssetUrlSchema, optionalTrimmedString, paginationQuerySchema } from "./common.js";

export const publicOffersQuerySchema = {
  query: z.object({
    active: booleanishSchema.optional(),
  }),
};

export const adminOffersQuerySchema = {
  query: paginationQuerySchema.extend({
    status: z.enum(["draft", "scheduled", "active", "expired"]).optional(),
  }),
};

export const createOfferSchema = {
  body: z.object({
    title: z.string().trim().min(2).max(120),
    slug: optionalTrimmedString,
    description: z.string().trim().min(5).max(2000),
    imageUrl: optionalAssetUrlSchema,
    imagePublicId: optionalTrimmedString,
    ctaLabel: optionalTrimmedString,
    ctaHref: optionalTrimmedString,
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    status: z.enum(["draft", "scheduled", "active", "expired"]).default("draft").optional(),
    isFeatured: z.boolean().default(false).optional(),
    sortOrder: z.coerce.number().int().min(0).default(0).optional(),
  }),
};

export const updateOfferSchema = {
  params: idParamSchema,
  body: z.object({
    title: z.string().trim().min(2).max(120).optional(),
    slug: optionalTrimmedString,
    description: z.string().trim().min(5).max(2000).optional(),
    imageUrl: optionalAssetUrlSchema,
    imagePublicId: optionalTrimmedString,
    ctaLabel: optionalTrimmedString,
    ctaHref: optionalTrimmedString,
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    status: z.enum(["draft", "scheduled", "active", "expired"]).optional(),
    isFeatured: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
  }),
};

export const offerIdParamSchema = {
  params: idParamSchema,
};
