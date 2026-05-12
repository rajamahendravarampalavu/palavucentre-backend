import { z } from "zod";

import {
  booleanishSchema,
  idParamSchema,
  optionalTrimmedString,
  paginationQuerySchema,
} from "./common.js";

const promoCodeValueSchema = z.string().trim().min(3).max(40);

const promoDateSchema = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? undefined : value),
  z.string().datetime().optional(),
);

const promoPayloadSchema = z.object({
  code: promoCodeValueSchema,
  title: optionalTrimmedString,
  description: optionalTrimmedString,
  discountType: z.enum(["percentage", "fixed"]),
  discountValue: z.coerce.number().positive(),
  minOrder: z.coerce.number().nonnegative().optional(),
  maxDiscount: z.coerce.number().positive().optional(),
  maxUses: z.coerce.number().int().positive().optional(),
  isActive: booleanishSchema.optional(),
  startDate: promoDateSchema,
  endDate: promoDateSchema,
}).strip();

export const applyPromoCodeSchema = {
  body: z.object({
    code: promoCodeValueSchema,
    subTotal: z.coerce.number().nonnegative(),
  }).strip(),
};

export const adminPromoCodesQuerySchema = {
  query: paginationQuerySchema.extend({
    isActive: booleanishSchema.optional(),
  }).strip(),
};

export const createPromoCodeSchema = {
  body: promoPayloadSchema,
};

export const updatePromoCodeSchema = {
  params: idParamSchema,
  body: promoPayloadSchema
    .partial()
    .strip()
    .refine((payload) => Object.keys(payload).length > 0, {
      message: "At least one promo code field is required",
    }),
};

export const promoCodeIdParamSchema = {
  params: idParamSchema,
};
