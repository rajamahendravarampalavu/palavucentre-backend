import { Router } from "express";

import {
  createPublicReviewHandler,
  createReviewHandler,
  deleteReviewHandler,
  listPublicReviews,
  updateReviewHandler,
} from "../../controllers/review.controller.js";
import { requireAdminAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createPublicReviewSchema,
  createReviewSchema,
  publicReviewsQuerySchema,
  reviewIdParamSchema,
  updateReviewSchema,
} from "../../validators/review.validator.js";

const router = Router();

router.get("/", validate(publicReviewsQuerySchema), asyncHandler(listPublicReviews));
router.post("/submit", validate(createPublicReviewSchema), asyncHandler(createPublicReviewHandler));
router.post("/", requireAdminAuth, validate(createReviewSchema), asyncHandler(createReviewHandler));
router.patch("/:id", requireAdminAuth, validate(updateReviewSchema), asyncHandler(updateReviewHandler));
router.delete("/:id", requireAdminAuth, validate(reviewIdParamSchema), asyncHandler(deleteReviewHandler));

export { router as publicReviewRoutes };
