import { Router } from "express";

import {
  createGalleryItemHandler,
  deleteGalleryItemHandler,
  listGallery,
  updateGalleryItemHandler,
} from "../../controllers/gallery.controller.js";
import { requireAdminAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  adminGalleryQuerySchema,
  createGalleryItemSchema,
  galleryItemIdParamSchema,
  updateGalleryItemSchema,
} from "../../validators/gallery.validator.js";

const router = Router();

router.use(requireAdminAuth);

router.get("/", validate(adminGalleryQuerySchema), asyncHandler(listGallery));
router.post("/", validate(createGalleryItemSchema), asyncHandler(createGalleryItemHandler));
router.patch("/:id", validate(updateGalleryItemSchema), asyncHandler(updateGalleryItemHandler));
router.delete("/:id", validate(galleryItemIdParamSchema), asyncHandler(deleteGalleryItemHandler));

export { router as adminGalleryRoutes };
