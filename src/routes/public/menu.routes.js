import { Router } from "express";

import { listPublicMenu } from "../../controllers/menu.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { publicMenuQuerySchema } from "../../validators/menu.validator.js";
import { validate } from "../../middleware/validate.middleware.js";
import { publicCache } from "../../middleware/cache.middleware.js";

const router = Router();

router.get("/", publicCache(30), validate(publicMenuQuerySchema), asyncHandler(listPublicMenu));

export { router as publicMenuRoutes };
