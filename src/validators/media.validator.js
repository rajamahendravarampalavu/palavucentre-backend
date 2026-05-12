import { z } from "zod";

export const uploadImageSchema = {
  body: z.object({
    folder: z.enum(["general", "menu", "gallery", "offers", "settings"]).default("general").optional(),
  }).strip(),
};
