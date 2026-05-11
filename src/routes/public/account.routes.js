import { Router } from "express";

import {
  createAddress,
  deleteAddress,
  getAddresses,
  googleLogin,
  getOrders,
  getProfile,
  login,
  logout,
  me,
  signup,
  updateAddress,
} from "../../controllers/account.controller.js";
import { requireUserAuth } from "../../middleware/user-auth.middleware.js";
import { authRateLimiter } from "../../middleware/rate-limit.middleware.js";
import { validate } from "../../middleware/validate.middleware.js";
import { asyncHandler } from "../../utils/asyncHandler.js";
import {
  createUserAddressSchema,
  googleLoginSchema,
  loginSchema,
  signupSchema,
  updateUserAddressSchema,
  userAddressIdParamSchema,
} from "../../validators/account.validator.js";

const router = Router();

router.post("/signup", authRateLimiter, validate(signupSchema), asyncHandler(signup));
router.post("/login", authRateLimiter, validate(loginSchema), asyncHandler(login));
router.post("/google-login", authRateLimiter, validate(googleLoginSchema), asyncHandler(googleLogin));
router.post("/logout", asyncHandler(logout));
router.get("/me", requireUserAuth, asyncHandler(me));
router.get("/profile", requireUserAuth, asyncHandler(getProfile));
router.get("/orders", requireUserAuth, asyncHandler(getOrders));
router.get("/addresses", requireUserAuth, asyncHandler(getAddresses));
router.post("/addresses", requireUserAuth, validate(createUserAddressSchema), asyncHandler(createAddress));
router.patch("/addresses/:id", requireUserAuth, validate(updateUserAddressSchema), asyncHandler(updateAddress));
router.delete("/addresses/:id", requireUserAuth, validate(userAddressIdParamSchema), asyncHandler(deleteAddress));

export { router as publicAccountRoutes };
