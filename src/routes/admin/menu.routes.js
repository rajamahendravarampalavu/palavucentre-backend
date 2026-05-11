import { Router } from "express";

import {
  createCategoryHandler,
  createMenuItemHandler,
  deleteCategoryHandler,
  deleteMenuItemHandler,
  listCategories,
  listItems,
  updateCategoryHandler,
  updateMenuItemHandler,
} from "../../controllers/menu.controller.js";
import { requireAdminAuth } from "../../middleware/auth.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createCategorySchema,
  createMenuItemSchema,
  listAdminMenuItemsQuerySchema,
  menuEntityIdParamSchema,
  updateCategorySchema,
  updateMenuItemSchema,
} from "../../validators/menu.validator.js";

const router = Router();

router.use(requireAdminAuth);

router.get("/categories", asyncHandler(listCategories));
router.post("/categories", validate(createCategorySchema), asyncHandler(createCategoryHandler));
router.patch("/categories/:id", validate(updateCategorySchema), asyncHandler(updateCategoryHandler));
router.delete("/categories/:id", validate(menuEntityIdParamSchema), asyncHandler(deleteCategoryHandler));

router.get("/items", validate(listAdminMenuItemsQuerySchema), asyncHandler(listItems));
router.post("/items", validate(createMenuItemSchema), asyncHandler(createMenuItemHandler));
router.patch("/items/:id", validate(updateMenuItemSchema), asyncHandler(updateMenuItemHandler));
router.delete("/items/:id", validate(menuEntityIdParamSchema), asyncHandler(deleteMenuItemHandler));

export { router as adminMenuRoutes };
