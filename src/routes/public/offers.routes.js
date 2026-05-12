import { Router } from "express";

import { listPublicOffers } from "../../controllers/offer.controller.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { publicOffersQuerySchema } from "../../validators/offer.validator.js";
import { publicCache } from "../../middleware/cache.middleware.js";

const router = Router();

router.get("/", publicCache(120), validate(publicOffersQuerySchema), asyncHandler(listPublicOffers));

export { router as publicOfferRoutes };
