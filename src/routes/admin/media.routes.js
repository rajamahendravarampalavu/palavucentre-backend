import { Router } from "express";

import { uploadImageHandler } from "../../controllers/media.controller.js";
import { requireAdminAuth } from "../../middleware/auth.middleware.js";
import { uploadSingleImage } from "../../middleware/upload.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { uploadImageSchema } from "../../validators/media.validator.js";

const router = Router();

router.use(requireAdminAuth);

router.post("/", uploadSingleImage, validate(uploadImageSchema), asyncHandler(uploadImageHandler));
router.post("/upload", uploadSingleImage, validate(uploadImageSchema), asyncHandler(uploadImageHandler));

export { router as adminMediaRoutes };
