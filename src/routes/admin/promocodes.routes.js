import { Router } from "express";

import {
  createPromoCodeHandler,
  deletePromoCodeHandler,
  listPromoCodes,
  updatePromoCodeHandler,
} from "../../controllers/promocode.controller.js";
import { requireAdminAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  adminPromoCodesQuerySchema,
  createPromoCodeSchema,
  promoCodeIdParamSchema,
  updatePromoCodeSchema,
} from "../../validators/promocode.validator.js";

const router = Router();

router.use(requireAdminAuth);

router.get("/", validate(adminPromoCodesQuerySchema), asyncHandler(listPromoCodes));
router.post("/", validate(createPromoCodeSchema), asyncHandler(createPromoCodeHandler));
router.patch("/:id", validate(updatePromoCodeSchema), asyncHandler(updatePromoCodeHandler));
router.delete("/:id", validate(promoCodeIdParamSchema), asyncHandler(deletePromoCodeHandler));

export { router as adminPromoCodeRoutes };
