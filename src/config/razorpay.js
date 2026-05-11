import Razorpay from "razorpay";

import { env } from "./env.js";

export const isRazorpayConfigured = Boolean(env.RAZORPAY_KEY_ID) && Boolean(env.RAZORPAY_KEY_SECRET);
export const isRazorpayWebhookConfigured = Boolean(env.RAZORPAY_WEBHOOK_SECRET);

export const razorpayClient = isRazorpayConfigured
  ? new Razorpay({
      key_id: env.RAZORPAY_KEY_ID,
      key_secret: env.RAZORPAY_KEY_SECRET,
    })
  : null;
