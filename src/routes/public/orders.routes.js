import { Router } from "express";

import { createOrderHandler } from "../../controllers/order.controller.js";
import { orderRateLimiter } from "../../middleware/rate-limit.middleware.js";
import { requireUserAuth } from "../../middleware/user-auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { createOrderSchema } from "../../validators/order.validator.js";

const router = Router();

router.post("/", requireUserAuth, orderRateLimiter, validate(createOrderSchema), asyncHandler(createOrderHandler));

export { router as publicOrderRoutes };
