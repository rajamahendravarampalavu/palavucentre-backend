import { Router } from "express";

import {
  createGalleryItemHandler,
  deleteGalleryItemHandler,
  listPublicGallery,
  updateGalleryItemHandler,
} from "../../controllers/gallery.controller.js";
import { requireAdminAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createGalleryItemSchema,
  galleryItemIdParamSchema,
  publicGalleryQuerySchema,
  updateGalleryItemSchema,
} from "../../validators/gallery.validator.js";

const router = Router();

router.get("/", validate(publicGalleryQuerySchema), asyncHandler(listPublicGallery));
router.post("/", requireAdminAuth, validate(createGalleryItemSchema), asyncHandler(createGalleryItemHandler));
router.patch("/:id", requireAdminAuth, validate(updateGalleryItemSchema), asyncHandler(updateGalleryItemHandler));
router.delete("/:id", requireAdminAuth, validate(galleryItemIdParamSchema), asyncHandler(deleteGalleryItemHandler));

export { router as publicGalleryRoutes };
