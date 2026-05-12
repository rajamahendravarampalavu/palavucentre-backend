import { z } from "zod";

import { emailSchema, idParamSchema, optionalTrimmedString, paginationQuerySchema, phoneSchema } from "./common.js";

const orderItemSchema = z
  .object({
    id: z.coerce.number().int().positive().optional(),
    menuItemId: z.coerce.number().int().positive().optional(),
    name: optionalTrimmedString,
    price: z.coerce.number().positive().optional(),
    quantity: z.coerce.number().int().positive().max(20),
  })
  .strip()
  .superRefine((item, ctx) => {
    if (!item.id && !item.menuItemId) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["menuItemId"],
        message: "Each order item must include id or menuItemId",
      });
    }
  });

export const createOrderSchema = {
  body: z.preprocess(
    (raw) => {
      if (!raw || typeof raw !== "object") {
        return raw;
      }

      const body = raw;
      const normalizedCustomer = body.customer || {
        name: body.customer_name,
        phone: body.customer_phone,
        email: body.customer_email,
        address: body.customer_address,
      };

      return {
        ...body,
        customer: normalizedCustomer,
        paymentMethod: body.paymentMethod ?? body.payment_method,
        promoCode: body.promoCode ?? body.promo_code,
        userAddressId: body.userAddressId ?? body.user_address_id,
        storeLocation: body.storeLocation ?? body.store_location,
        items: Array.isArray(body.items)
          ? body.items.map((item) => ({
              ...item,
              menuItemId: item.menuItemId ?? item.menu_item_id ?? item.id,
            }))
          : body.items,
      };
    },
    z.object({
      customer: z
        .object({
          name: z.string().trim().min(2).max(80),
          phone: phoneSchema,
          whatsapp: phoneSchema.optional(),
          email: emailSchema.optional(),
          address: optionalTrimmedString,
          addressLine1: optionalTrimmedString,
          addressLine2: optionalTrimmedString,
          landmark: optionalTrimmedString,
          city: optionalTrimmedString,
          state: optionalTrimmedString,
          postalCode: optionalTrimmedString,
        }).strip(),
      items: z.array(orderItemSchema).min(1),
      pricing: z
        .object({
          subTotal: z.coerce.number().nonnegative().optional(),
          taxPercent: z.coerce.number().min(0).max(100).optional(),
          grandTotal: z.coerce.number().nonnegative().optional(),
        })
        .strip()
        .optional(),
      paymentMethod: z.preprocess(
        (value) => (typeof value === "string" ? value.toLowerCase() : value),
        z.enum(["cod", "online"]),
      ),
      source: z.string().trim().default("web").optional(),
      notes: optionalTrimmedString,
      promoCode: optionalTrimmedString,
      userAddressId: z.coerce.number().int().positive().optional(),
      storeLocation: z.enum(["kukatpally", "bachupally"]),
    }).strip(),
  ),
};

export const adminOrdersQuerySchema = {
  query: paginationQuerySchema.extend({
    orderStatus: z.enum(["pending", "accepted", "preparing", "ready", "delivered", "cancelled"]).optional(),
    paymentStatus: z.enum(["unpaid", "pending", "paid", "failed", "refunded"]).optional(),
    datePreset: z.enum(["today", "yesterday", "last7", "last30", "thisMonth", "lastMonth"]).optional(),
    dateFrom: z.string().datetime({ offset: true }).optional(),
    dateTo: z.string().datetime({ offset: true }).optional(),
  }).strip(),
};

export const orderIdParamSchema = {
  params: idParamSchema,
};

export const updateOrderSchema = {
  params: idParamSchema,
  body: z.object({
    orderStatus: z.enum(["pending", "accepted", "preparing", "ready", "delivered", "cancelled"]).optional(),
    paymentStatus: z.enum(["unpaid", "pending", "paid", "failed", "refunded"]).optional(),
    notes: optionalTrimmedString,
  }).strip(),
};
