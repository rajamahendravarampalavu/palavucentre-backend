import { Router } from "express";

import { getAdminSettings, updateSettings } from "../../controllers/site-settings.controller.js";
import { requireAdminAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { updateSiteSettingsSchema } from "../../validators/settings.validator.js";

const router = Router();

router.use(requireAdminAuth);

router.get("/", asyncHandler(getAdminSettings));
router.patch("/", validate(updateSiteSettingsSchema), asyncHandler(updateSettings));

export { router as adminSettingsRoutes };
