import { StatusCodes } from "http-status-codes";

import {
  createRazorpayOrderForVerifiedOrder,
  handleRazorpayWebhook,
  verifyRazorpayPayment,
} from "../services/payment.service.js";

export async function createRazorpayOrderHandler(req, res) {
  const data = await createRazorpayOrderForVerifiedOrder(req.body, { user: req.user });

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Razorpay order created",
    data,
  });
}

export async function verifyRazorpayPaymentHandler(req, res) {
  const data = await verifyRazorpayPayment(req.body, { user: req.user });

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Payment verified successfully",
    data,
  });
}

export async function razorpayWebhookHandler(req, res) {
  const data = await handleRazorpayWebhook({
    body: req.body,
    rawBody: req.rawBody,
    signature: req.get("x-razorpay-signature"),
  });

  res.status(StatusCodes.OK).json({
    success: true,
    message: "Razorpay webhook processed",
    data,
  });
}
