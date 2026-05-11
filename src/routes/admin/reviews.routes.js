import { Router } from "express";

import {
  createReviewHandler,
  deleteReviewHandler,
  listReviews,
  updateReviewHandler,
} from "../../controllers/review.controller.js";
import { requireAdminAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  adminReviewsQuerySchema,
  createReviewSchema,
  reviewIdParamSchema,
  updateReviewSchema,
} from "../../validators/review.validator.js";

const router = Router();

router.use(requireAdminAuth);

router.get("/", validate(adminReviewsQuerySchema), asyncHandler(listReviews));
router.post("/", validate(createReviewSchema), asyncHandler(createReviewHandler));
router.patch("/:id", validate(updateReviewSchema), asyncHandler(updateReviewHandler));
router.delete("/:id", validate(reviewIdParamSchema), asyncHandler(deleteReviewHandler));

export { router as adminReviewRoutes };
