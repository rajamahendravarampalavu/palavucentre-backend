import { Router } from "express";

import {
  listInquiryRecords,
  updateInquiryStatusHandler,
} from "../../controllers/inquiry.controller.js";
import { requireAdminAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  listInquiriesQuerySchema,
  updateInquiryStatusSchema,
} from "../../validators/inquiry.validator.js";

const router = Router();

router.use(requireAdminAuth);

router.get("/", validate(listInquiriesQuerySchema), asyncHandler(listInquiryRecords));
router.patch("/:type/:id", validate(updateInquiryStatusSchema), asyncHandler(updateInquiryStatusHandler));

export { router as adminInquiryRoutes };
