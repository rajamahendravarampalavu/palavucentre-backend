import { Router } from "express";

import { getDashboard } from "../../controllers/dashboard.controller.js";
import { requireAdminAuth } from "../../middleware/auth.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";

const router = Router();

router.use(requireAdminAuth);
router.get("/", asyncHandler(getDashboard));

export { router as adminDashboardRoutes };
