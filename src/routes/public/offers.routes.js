import { Router } from "express";

import { listPublicOffers } from "../../controllers/offer.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { publicOffersQuerySchema } from "../../validators/offer.validator.js";

const router = Router();

router.get("/", validate(publicOffersQuerySchema), asyncHandler(listPublicOffers));

export { router as publicOfferRoutes };
