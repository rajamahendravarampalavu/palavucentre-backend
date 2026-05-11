import { z } from "zod";

export const createRazorpayOrderSchema = {
  body: z.preprocess(
    (raw) => {
      if (!raw || typeof raw !== "object") {
        return raw;
      }

      const body = raw;
      return {
        ...body,
        orderNumber: body.orderNumber ?? body.order_number,
      };
    },
    z.object({
      orderNumber: z.string().trim().min(4).max(40),
    }),
  ),
};

export const verifyRazorpayPaymentSchema = {
  body: z.preprocess(
    (raw) => {
      if (!raw || typeof raw !== "object") {
        return raw;
      }

      const body = raw;
      return {
        ...body,
        orderId: body.orderId ?? body.order_id,
        razorpayOrderId: body.razorpayOrderId ?? body.razorpay_order_id ?? body.order_id,
        razorpayPaymentId: body.razorpayPaymentId ?? body.razorpay_payment_id ?? body.payment_id,
        razorpaySignature: body.razorpaySignature ?? body.razorpay_signature ?? body.signature,
      };
    },
    z.object({
      orderId: z.coerce.number().int().positive().optional(),
      razorpayOrderId: z.string().trim().min(5),
      razorpayPaymentId: z.string().trim().min(5),
      razorpaySignature: z.string().trim().min(10),
      payload: z.unknown().optional(),
    }),
  ),
};
