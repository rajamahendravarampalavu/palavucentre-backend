import { Router } from "express";

import { submitCateringInquiry } from "../../controllers/inquiry.controller.js";
import { publicFormRateLimiter } from "../../middleware/rate-limit.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { cateringInquirySchema } from "../../validators/inquiry.validator.js";

const router = Router();

router.post("/", publicFormRateLimiter, validate(cateringInquirySchema), asyncHandler(submitCateringInquiry));

export { router as publicCateringRoutes };
