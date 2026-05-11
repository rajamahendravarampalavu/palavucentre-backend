import { z } from "zod";

import {
  emailSchema,
  idParamSchema,
  optionalEmailSchema,
  optionalTrimmedString,
  paginationQuerySchema,
  phoneSchema,
} from "./common.js";

export const contactInquirySchema = {
  body: z.object({
    name: z.string().trim().min(2).max(80),
    phone: phoneSchema,
    email: emailSchema,
    message: z.string().trim().min(5).max(2000),
  }),
};

export const franchiseInquirySchema = {
  body: z.object({
    name: z.string().trim().min(2).max(80),
    city: z.string().trim().min(2).max(80),
    phone: phoneSchema,
    email: emailSchema,
    budget: z.string().trim().min(1).max(60),
    message: optionalTrimmedString,
  }),
};

export const cateringInquirySchema = {
  body: z
    .object({
      name: z.string().trim().min(2).max(80),
      eventType: z.string().trim().min(2).max(80),
      eventDate: z.string().datetime().optional(),
      date: z.string().date().optional(),
      guestCount: z.coerce.number().int().positive().max(5000).optional(),
      guests: z.coerce.number().int().positive().max(5000).optional(),
      phone: phoneSchema,
      email: optionalEmailSchema,
      message: optionalTrimmedString,
    })
    .superRefine((data, ctx) => {
      if (!data.eventDate && !data.date) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["eventDate"],
          message: "Event date is required",
        });
      }

      if (!data.guestCount && !data.guests) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["guestCount"],
          message: "Guest count is required",
        });
      }
    }),
};

export const listInquiriesQuerySchema = {
  query: paginationQuerySchema.extend({
    type: z.enum(["contact", "franchise", "catering"]).optional(),
    status: z.enum(["new", "contacted", "closed"]).optional(),
  }),
};

export const inquiryIdParamSchema = {
  params: idParamSchema,
};

export const updateInquiryStatusSchema = {
  params: z.object({
    type: z.enum(["contact", "franchise", "catering"]),
    id: z.coerce.number().int().positive(),
  }),
  body: z.object({
    status: z.enum(["new", "contacted", "closed"]),
  }),
};
