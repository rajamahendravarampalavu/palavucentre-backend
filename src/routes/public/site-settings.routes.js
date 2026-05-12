import { Router } from "express";

import { getPublicSettings } from "../../controllers/site-settings.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { publicCache } from "../../middleware/cache.middleware.js";

const router = Router();

router.get("/", publicCache(300), asyncHandler(getPublicSettings));
router.get("/public", publicCache(300), asyncHandler(getPublicSettings));

export { router as publicSiteSettingsRoutes };
