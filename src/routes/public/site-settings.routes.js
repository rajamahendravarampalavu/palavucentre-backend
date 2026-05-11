import { Router } from "express";

import { getPublicSettings } from "../../controllers/site-settings.controller.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.get("/", asyncHandler(getPublicSettings));
router.get("/public", asyncHandler(getPublicSettings));

export { router as publicSiteSettingsRoutes };
