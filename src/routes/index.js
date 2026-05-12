import { Router } from "express";

import { getCsrfToken } from "../controllers/security.controller.js";
import { adminAuthRoutes } from "./admin/auth.routes.js";
import { adminDashboardRoutes } from "./admin/dashboard.routes.js";
import { adminGalleryRoutes } from "./admin/gallery.routes.js";
import { adminInquiryRoutes } from "./admin/inquiries.routes.js";
import { adminMediaRoutes } from "./admin/media.routes.js";
import { adminMenuRoutes } from "./admin/menu.routes.js";
import { adminOfferRoutes } from "./admin/offers.routes.js";
import { adminOrderRoutes } from "./admin/orders.routes.js";
import { adminPromoCodeRoutes } from "./admin/promocodes.routes.js";
import { adminReviewRoutes } from "./admin/reviews.routes.js";
import { adminSettingsRoutes } from "./admin/settings.routes.js";
import { publicAccountRoutes } from "./public/account.routes.js";
import { publicCateringRoutes } from "./public/catering.routes.js";
import { publicContactRoutes } from "./public/contact.routes.js";
import { publicFranchiseRoutes } from "./public/franchise.routes.js";
import { publicGalleryRoutes } from "./public/gallery.routes.js";
import { publicInquiryRoutes } from "./public/inquiries.routes.js";
import { publicMenuRoutes } from "./public/menu.routes.js";
import { publicOfferRoutes } from "./public/offers.routes.js";
import { publicOrderRoutes } from "./public/orders.routes.js";
import { publicPaymentRoutes } from "./public/payments.routes.js";
import { publicPromoCodeRoutes } from "./public/promocodes.routes.js";
import { publicReviewRoutes } from "./public/reviews.routes.js";
import { publicSiteSettingsRoutes } from "./public/site-settings.routes.js";

import { globalApiLimiter } from "../middleware/rate-limit.middleware.js";

const router = Router();

router.use("/inquiries", publicInquiryRoutes);

// Global rate limit: 120 requests/minute per IP
router.use(globalApiLimiter);

router.get("/csrf-token", getCsrfToken);

router.use("/menu", publicMenuRoutes);
router.use("/orders", publicOrderRoutes);
router.use("/account", publicAccountRoutes);
router.use("/contact", publicContactRoutes);
router.use("/franchise", publicFranchiseRoutes);
router.use("/catering", publicCateringRoutes);
router.use("/reviews", publicReviewRoutes);
router.use("/gallery", publicGalleryRoutes);
router.use("/offers", publicOfferRoutes);
router.use("/promocodes", publicPromoCodeRoutes);
router.use("/site-settings", publicSiteSettingsRoutes);
router.use("/payments", publicPaymentRoutes);

router.use("/admin", adminAuthRoutes);
router.use("/admin/dashboard", adminDashboardRoutes);
router.use("/admin/menu", adminMenuRoutes);
router.use("/admin/gallery", adminGalleryRoutes);
router.use("/admin/reviews", adminReviewRoutes);
router.use("/admin/offers", adminOfferRoutes);
router.use("/admin/promocodes", adminPromoCodeRoutes);
router.use("/admin/orders", adminOrderRoutes);
router.use("/admin/settings", adminSettingsRoutes);
router.use("/admin/inquiries", adminInquiryRoutes);
router.use("/admin/media", adminMediaRoutes);

export { router as apiRouter };
