import { Router } from "express";

import {
  createOfferHandler,
  deleteOfferHandler,
  listOffers,
  updateOfferHandler,
} from "../../controllers/offer.controller.js";
import { requireAdminAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  adminOffersQuerySchema,
  createOfferSchema,
  offerIdParamSchema,
  updateOfferSchema,
} from "../../validators/offer.validator.js";

const router = Router();

router.use(requireAdminAuth);

router.get("/", validate(adminOffersQuerySchema), asyncHandler(listOffers));
router.post("/", validate(createOfferSchema), asyncHandler(createOfferHandler));
router.patch("/:id", validate(updateOfferSchema), asyncHandler(updateOfferHandler));
router.delete("/:id", validate(offerIdParamSchema), asyncHandler(deleteOfferHandler));

export { router as adminOfferRoutes };
