import { z } from "zod";

import { emailSchema } from "./common.js";

export const adminLoginSchema = {
  body: z.object({
    email: emailSchema,
    password: z.string().min(8, "Password must be at least 8 characters"),
    remember: z.boolean().optional(),
  }),
};
