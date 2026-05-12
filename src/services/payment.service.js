import { createHmac, timingSafeEqual } from "node:crypto";

import { StatusCodes } from "http-status-codes";

import { isRazorpayConfigured, isRazorpayWebhookConfigured, razorpayClient } from "../config/razorpay.js";
import { env } from "../config/env.js";
import { prisma } from "../config/prisma.js";
import { serializePublicOrder } from "../serializers/order.public.serializer.js";
import { serializePublicRazorpayOrder } from "../serializers/payment.public.serializer.js";
import { ApiError } from "../utils/ApiError.js";
import { paiseToRupees } from "../utils/amounts.js";
import { serializePayment } from "../utils/serializers.js";
import { alertPaymentFailed } from "./alertService.js";

const paymentOrderIncludes = {
  user: true,
  address: true,
  promoCodeRef: true,
  items: true,
  payments: {
    orderBy: { createdAt: "desc" },
  },
};

export const MIN_RAZORPAY_AMOUNT_PAISE = 100;
const RAZORPAY_PAYMENT_CAPTURED_EVENTS = new Set(["payment.captured"]);
const RAZORPAY_PAYMENT_FAILED_EVENTS = new Set(["payment.failed"]);

function assertRazorpayConfigured() {
  if (!isRazorpayConfigured || !razorpayClient) {
    throw new ApiError(StatusCodes.SERVICE_UNAVAILABLE, "Razorpay is not configured");
  }
}

export function assertRazorpayPaymentAmount(amountPaise) {
  const normalizedAmountPaise = Number(amountPaise) || 0;

  if (normalizedAmountPaise < MIN_RAZORPAY_AMOUNT_PAISE) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      "Online payment requires at least INR 1 payable. Choose cash at pickup for this order.",
    );
  }
}

function buildRazorpayErrorDetails(error) {
  return {
    provider: "razorpay",
    statusCode: error?.statusCode || error?.status_code || error?.response?.statusCode || null,
    code: error?.error?.code || error?.code || null,
    description: error?.error?.description || error?.description || null,
    reason: error?.error?.reason || error?.reason || null,
  };
}

function toRazorpayGatewayError(error) {
  if (error instanceof ApiError) {
    return error;
  }

  return new ApiError(
    StatusCodes.BAD_GATEWAY,
    "Could not start Razorpay payment. Please retry or choose cash at pickup.",
    buildRazorpayErrorDetails(error),
  );
}

function compareSignatures(expected, actual) {
  const expectedBuffer = Buffer.from(expected);
  const actualBuffer = Buffer.from(actual);

  if (expectedBuffer.length !== actualBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, actualBuffer);
}

function assertRazorpayWebhookConfigured() {
  if (!isRazorpayWebhookConfigured) {
    throw new ApiError(StatusCodes.SERVICE_UNAVAILABLE, "Razorpay webhook is not configured");
  }
}

function getWebhookBodyBuffer(rawBody) {
  if (Buffer.isBuffer(rawBody)) {
    return rawBody;
  }

  if (typeof rawBody === "string") {
    return Buffer.from(rawBody);
  }

  throw new ApiError(StatusCodes.BAD_REQUEST, "Webhook raw body is required");
}

function verifyRazorpayWebhookSignature({ rawBody, signature }) {
  assertRazorpayWebhookConfigured();

  if (!signature) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Missing Razorpay webhook signature");
  }

  const bodyBuffer = getWebhookBodyBuffer(rawBody);
  const expectedSignature = createHmac("sha256", env.RAZORPAY_WEBHOOK_SECRET)
    .update(bodyBuffer)
    .digest("hex");

  if (!compareSignatures(expectedSignature, signature)) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "Invalid Razorpay webhook signature");
  }
}

function getWebhookPaymentEntity(body) {
  return body?.payload?.payment?.entity || null;
}

function getWebhookProviderOrderId(body, paymentEntity) {
  return paymentEntity?.order_id || body?.payload?.order?.entity?.id || null;
}

async function findPaymentForWebhook({ providerOrderId, providerPaymentId }) {
  const orConditions = [];

  if (providerPaymentId) {
    orConditions.push({ providerPaymentId });
  }

  if (providerOrderId) {
    orConditions.push({ providerOrderId });
  }

  if (orConditions.length === 0) {
    return null;
  }

  return prisma.payment.findFirst({
    where: {
      provider: "razorpay",
      OR: orConditions,
    },
    include: {
      order: true,
    },
  });
}

function getWebhookFailureReason(paymentEntity) {
  return (
    paymentEntity?.error_description ||
    paymentEntity?.error_reason ||
    paymentEntity?.error_code ||
    "Razorpay payment failed"
  );
}

function assertWebhookPaymentMatchesRecord(payment, paymentEntity) {
  if (!paymentEntity) {
    return;
  }

  if (Number(paymentEntity.amount) !== Number(payment.amountPaise)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Webhook payment amount does not match the order payment");
  }

  if (
    paymentEntity.currency &&
    String(paymentEntity.currency).toUpperCase() !== String(payment.currency).toUpperCase()
  ) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Webhook payment currency does not match the order payment");
  }
}

export async function createRazorpayOrderForPayment(paymentId) {
  assertRazorpayConfigured();

  const payment = await prisma.payment.findUnique({
    where: { id: paymentId },
    include: {
      order: true,
    },
  });

  if (!payment) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Payment record not found");
  }

  assertRazorpayPaymentAmount(payment.amountPaise);

  let razorpayOrder;

  try {
    razorpayOrder = await razorpayClient.orders.create({
      amount: payment.amountPaise,
      currency: payment.currency,
      receipt: payment.order.orderNumber,
      notes: {
        orderId: String(payment.orderId),
        orderNumber: payment.order.orderNumber,
        paymentId: String(payment.id),
      },
    });
  } catch (error) {
    throw toRazorpayGatewayError(error);
  }

  const updatedPayment = await prisma.payment.update({
    where: { id: payment.id },
    data: {
      providerOrderId: razorpayOrder.id,
      gatewayResponse: razorpayOrder,
    },
  });

  return {
    payment: serializePayment(updatedPayment),
    razorpay: {
      keyId: env.RAZORPAY_KEY_ID,
      orderId: razorpayOrder.id,
      amount: paiseToRupees(payment.amountPaise),
      amountPaise: payment.amountPaise,
      currency: payment.currency,
      receipt: payment.order.orderNumber,
    },
  };
}

export async function createRazorpayOrderForVerifiedOrder({ orderNumber }, { user } = {}) {
  if (!user?.id) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "User authentication is required to create a payment");
  }

  const order = await prisma.order.findFirst({
    where: {
      orderNumber,
      userId: user.id,
    },
    include: paymentOrderIncludes,
  });

  if (!order) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Order not found for this account");
  }

  if (order.paymentStatus === "paid") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "This order is already paid");
  }

  if (order.paymentMethod !== "online") {
    throw new ApiError(StatusCodes.BAD_REQUEST, "This order is not configured for online payment");
  }

  assertRazorpayPaymentAmount(order.grandTotalPaise);

  const reusablePayment = order.payments.find((payment) => payment.status === "pending" && !payment.providerOrderId);

  // Re-sync payment amount in case order total changed (e.g. admin edit)
  let payment;
  if (reusablePayment && reusablePayment.amountPaise !== order.grandTotalPaise) {
    payment = await prisma.payment.update({
      where: { id: reusablePayment.id },
      data: { amountPaise: order.grandTotalPaise },
    });
  } else {
    payment =
      reusablePayment ||
      (await prisma.payment.create({
        data: {
          orderId: order.id,
          provider: "razorpay",
          status: "pending",
          amountPaise: order.grandTotalPaise,
          currency: order.currency,
        },
      }));
  }

  const gatewayOrder = await createRazorpayOrderForPayment(payment.id);

  return serializePublicRazorpayOrder({
    ...gatewayOrder.razorpay,
    orderNumber: order.orderNumber,
  });
}

export async function handleRazorpayWebhook({ body, rawBody, signature }) {
  verifyRazorpayWebhookSignature({ rawBody, signature });

  const eventName = body?.event;
  const paymentEntity = getWebhookPaymentEntity(body);
  const providerPaymentId = paymentEntity?.id || null;
  const providerOrderId = getWebhookProviderOrderId(body, paymentEntity);

  if (!RAZORPAY_PAYMENT_CAPTURED_EVENTS.has(eventName) && !RAZORPAY_PAYMENT_FAILED_EVENTS.has(eventName)) {
    return {
      event: eventName || "unknown",
      processed: false,
      reason: "unsupported_event",
    };
  }

  const payment = await findPaymentForWebhook({ providerOrderId, providerPaymentId });

  if (!payment) {
    return {
      event: eventName,
      processed: false,
      reason: "payment_not_found",
    };
  }

  if (RAZORPAY_PAYMENT_CAPTURED_EVENTS.has(eventName)) {
    assertWebhookPaymentMatchesRecord(payment, paymentEntity);

    if (payment.status === "paid" && (!providerPaymentId || payment.providerPaymentId === providerPaymentId)) {
      return {
        event: eventName,
        processed: false,
        reason: "already_paid",
        orderId: payment.orderId,
      };
    }

    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: "paid",
          providerPaymentId,
          providerSignature: signature,
          gatewayResponse: body,
          paidAt: payment.paidAt || new Date(),
          failureReason: null,
        },
      });

      await tx.order.update({
        where: { id: payment.orderId },
        data: {
          paymentStatus: "paid",
          orderStatus: payment.order.orderStatus === "cancelled" ? "cancelled" : "pending",
        },
      });
    });

    return {
      event: eventName,
      processed: true,
      status: "paid",
      orderId: payment.orderId,
    };
  }

  if (payment.status === "paid") {
    return {
      event: eventName,
      processed: false,
      reason: "already_paid",
      orderId: payment.orderId,
    };
  }

  const failureReason = getWebhookFailureReason(paymentEntity);

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "failed",
        providerPaymentId,
        gatewayResponse: body,
        failureReason,
      },
    });

    await tx.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: "failed",
      },
    });
  });

  alertPaymentFailed(payment.order?.orderNumber || String(payment.orderId), paiseToRupees(payment.amountPaise), failureReason).catch(
    () => null,
  );

  return {
    event: eventName,
    processed: true,
    status: "failed",
    orderId: payment.orderId,
  };
}

export async function verifyRazorpayPayment(
  { orderId, razorpayOrderId, razorpayPaymentId, razorpaySignature, payload },
  { user } = {},
) {
  if (!user?.id) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "User authentication is required to verify a payment");
  }

  assertRazorpayConfigured();

  const payment = await prisma.payment.findFirst({
    where: {
      providerOrderId: razorpayOrderId,
    },
    include: {
      order: true,
    },
  });

  if (!payment) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid payment verification payload");
  }

  if (orderId && payment.orderId !== Number(orderId)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid payment verification payload");
  }

  if (payment.order.userId !== user.id) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Order not found for this account");
  }

  const expectedSignature = createHmac("sha256", env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest("hex");

  if (!compareSignatures(expectedSignature, razorpaySignature)) {
    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        status: "failed",
        providerPaymentId: razorpayPaymentId,
        failureReason: "Signature verification failed",
        gatewayResponse: payload ?? { razorpayOrderId, razorpayPaymentId },
      },
    });

    throw new ApiError(StatusCodes.BAD_REQUEST, "Razorpay signature verification failed");
  }

  const updatedOrder = await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: { id: payment.id },
      data: {
        status: "paid",
        providerPaymentId: razorpayPaymentId,
        providerSignature: razorpaySignature,
        gatewayResponse: payload ?? { razorpayOrderId, razorpayPaymentId, razorpaySignature },
        paidAt: new Date(),
        failureReason: null,
      },
    });

    await tx.order.update({
      where: { id: payment.orderId },
      data: {
        paymentStatus: "paid",
        orderStatus: payment.order.orderStatus === "cancelled" ? "cancelled" : "pending",
      },
    });

    return tx.order.findUnique({
      where: { id: payment.orderId },
      include: paymentOrderIncludes,
    });
  });

  return serializePublicOrder(updatedOrder);
}
