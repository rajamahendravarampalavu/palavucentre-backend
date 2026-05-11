import { Router } from "express";

import { login, logout, me } from "../../controllers/admin-auth.controller.js";
import { requireAdminAuth } from "../../middleware/auth.middleware.js";
import { adminAuthLimiter } from "../../middleware/rate-limit.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { adminLoginSchema } from "../../validators/admin-auth.validator.js";

const router = Router();

router.post("/login", adminAuthLimiter, validate(adminLoginSchema), asyncHandler(login));
router.post("/logout", asyncHandler(logout));
router.get("/me", requireAdminAuth, asyncHandler(me));

export { router as adminAuthRoutes };
