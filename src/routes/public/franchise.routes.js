import { Router } from "express";

import { submitFranchiseInquiry } from "../../controllers/inquiry.controller.js";
import { publicFormRateLimiter } from "../../middleware/rate-limit.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { franchiseInquirySchema } from "../../validators/inquiry.validator.js";

const router = Router();

router.post("/", publicFormRateLimiter, validate(franchiseInquirySchema), asyncHandler(submitFranchiseInquiry));

export { router as publicFranchiseRoutes };
