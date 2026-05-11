import { Router } from "express";

import { applyPromoCode } from "../../controllers/promocode.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { applyPromoCodeSchema } from "../../validators/promocode.validator.js";

const router = Router();

router.post("/apply", validate(applyPromoCodeSchema), asyncHandler(applyPromoCode));

export { router as publicPromoCodeRoutes };
