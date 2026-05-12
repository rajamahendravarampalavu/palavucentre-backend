import { z } from "zod";

import { booleanishSchema, idParamSchema, optionalTrimmedString, optionalUrlSchema, paginationQuerySchema } from "./common.js";

export const publicReviewsQuerySchema = {
  query: z.object({
    visible: booleanishSchema.optional(),
  }).strip(),
};

export const adminReviewsQuerySchema = {
  query: paginationQuerySchema.extend({
    visible: booleanishSchema.optional(),
    source: z.enum(["manual", "google", "internal"]).optional(),
  }).strip(),
};

export const createReviewSchema = {
  body: z.object({
    name: z.string().trim().min(2).max(80),
    rating: z.coerce.number().int().min(1).max(5),
    text: z.string().trim().min(5).max(2000),
    date: z.string().date().optional(),
    source: z.enum(["manual", "google", "internal"]).default("manual").optional(),
    googleReviewUrl: optionalUrlSchema,
    visible: z.boolean().optional(),
    isVisible: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).default(0).optional(),
  }).strip(),
};

export const createPublicReviewSchema = {
  body: z.object({
    name: z.string().trim().min(2).max(80),
    rating: z.coerce.number().int().min(1).max(5),
    text: z.string().trim().min(5).max(500),
  }).strip(),
};

export const updateReviewSchema = {
  params: idParamSchema,
  body: z.object({
    name: z.string().trim().min(2).max(80).optional(),
    rating: z.coerce.number().int().min(1).max(5).optional(),
    text: z.string().trim().min(5).max(2000).optional(),
    date: z.string().date().optional(),
    source: z.enum(["manual", "google", "internal"]).optional(),
    googleReviewUrl: optionalUrlSchema,
    visible: z.boolean().optional(),
    isVisible: z.boolean().optional(),
    sortOrder: z.coerce.number().int().min(0).optional(),
  }).strip(),
};

export const reviewIdParamSchema = {
  params: idParamSchema,
};
