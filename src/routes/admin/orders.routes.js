import { Router } from "express";

import {
  getOrderHandler,
  listOrdersHandler,
  updateOrderHandler,
} from "../../controllers/order.controller.js";
import { requireAdminAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import { adminOrdersQuerySchema, orderIdParamSchema, updateOrderSchema } from "../../validators/order.validator.js";

const router = Router();

router.use(requireAdminAuth);

router.get("/", validate(adminOrdersQuerySchema), asyncHandler(listOrdersHandler));
router.get("/:id", validate(orderIdParamSchema), asyncHandler(getOrderHandler));
router.patch("/:id", validate(updateOrderSchema), asyncHandler(updateOrderHandler));

export { router as adminOrderRoutes };
