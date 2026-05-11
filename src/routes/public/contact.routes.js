import { Router } from "express";

import { submitContactInquiry } from "../../controllers/inquiry.controller.js";
import { publicFormRateLimiter } from "../../middleware/rate-limit.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { contactInquirySchema } from "../../validators/inquiry.validator.js";

const router = Router();

router.post("/", publicFormRateLimiter, validate(contactInquirySchema), asyncHandler(submitContactInquiry));

export { router as publicContactRoutes };
