import { z } from "zod";

import {
  emailSchema,
  idParamSchema,
  optionalEmailSchema,
  optionalTrimmedString,
  paginationQuerySchema,
  phoneSchema,
} from "./common.js";

const optionalPhoneSchema = z.preprocess((value) => {
  if (typeof value !== "string") {
    return value;
  }

  return value.trim() === "" ? undefined : value;
}, phoneSchema.optional());

export const contactInquirySchema = {
  body: z.object({
    name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name must be at most 100 characters"),
    phone: optionalPhoneSchema,
    email: emailSchema,
    subject: z.string().trim().min(3, "Subject must be at least 3 characters").max(200, "Subject must be at most 200 characters"),
    message: z
      .string()
      .trim()
      .min(10, "Message must be at least 10 characters")
      .max(2000, "Message must be at most 2000 characters"),
  }).strip(),
};

export const franchiseInquirySchema = {
  body: z.object({
    name: z.string().trim().min(2).max(80),
    city: z.string().trim().min(2).max(80),
    phone: phoneSchema,
    email: emailSchema,
    budget: z.string().trim().min(1).max(60),
    message: optionalTrimmedString,
  }).strip(),
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
    .strip()
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
  }).strip(),
};

export const inquiryIdParamSchema = {
  params: idParamSchema,
};

export const updateInquiryStatusSchema = {
  params: z.object({
    type: z.enum(["contact", "franchise", "catering"]),
    id: z.coerce.number().int().positive(),
  }).strip(),
  body: z.object({
    status: z.enum(["new", "contacted", "closed"]),
  }).strip(),
};

export const deleteInquirySchema = {
  params: z.object({
    id: z.string().trim().min(1),
  }).strip(),
};

export const bulkDeleteInquirySchema = {
  body: z.object({
    ids: z.array(z.string().trim().min(1)).min(1),
  }).strip(),
};
