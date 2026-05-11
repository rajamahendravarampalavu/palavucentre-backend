import { z } from "zod";

import {
  booleanishSchema,
  emailSchema,
  idParamSchema,
  optionalTrimmedString,
  phoneSchema,
} from "./common.js";

const passwordSchema = z.string().min(8).max(100);

export const signupSchema = {
  body: z
    .object({
      name: z.string().trim().min(2).max(80),
      email: emailSchema,
      password: passwordSchema,
      confirmPassword: z.string().min(1),
    })
    .refine((data) => data.password === data.confirmPassword, {
      path: ["confirmPassword"],
      message: "Passwords do not match",
    }),
};

export const loginSchema = {
  body: z.object({
    email: emailSchema,
    password: passwordSchema,
  }),
};

export const googleLoginSchema = {
  body: z.object({
    idToken: z.string().trim().min(10, "Google ID token is required"),
  }),
};

export const createUserAddressSchema = {
  body: z.object({
    label: optionalTrimmedString,
    recipientName: z.string().trim().min(2).max(80),
    phone: phoneSchema,
    addressLine1: z.string().trim().min(5).max(160),
    addressLine2: optionalTrimmedString,
    landmark: optionalTrimmedString,
    city: z.string().trim().min(2).max(80),
    state: optionalTrimmedString,
    postalCode: optionalTrimmedString,
    isDefault: booleanishSchema.optional(),
  }),
};

export const updateUserAddressSchema = {
  params: idParamSchema,
  body: z
    .object({
      label: optionalTrimmedString,
      recipientName: z.string().trim().min(2).max(80).optional(),
      phone: phoneSchema.optional(),
      addressLine1: z.string().trim().min(5).max(160).optional(),
      addressLine2: optionalTrimmedString,
      landmark: optionalTrimmedString,
      city: z.string().trim().min(2).max(80).optional(),
      state: optionalTrimmedString,
      postalCode: optionalTrimmedString,
      isDefault: booleanishSchema.optional(),
    })
    .refine((payload) => Object.keys(payload).length > 0, {
      message: "At least one address field is required",
    }),
};

export const userAddressIdParamSchema = {
  params: idParamSchema,
};
