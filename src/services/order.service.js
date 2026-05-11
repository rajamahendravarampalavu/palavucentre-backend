import { StatusCodes } from "http-status-codes";

import { prisma, withReadDbRetry } from "../config/prisma.js";
import { isRazorpayConfigured } from "../config/razorpay.js";
import { ApiError } from "../utils/ApiError.js";
import { calculateTotals } from "../utils/amounts.js";
import { generateOrderNumber } from "../utils/order-number.js";
import { getPagination } from "../utils/pagination.js";
import { serializeOrder } from "../utils/serializers.js";
import { serializePublicOrder } from "../serializers/order.public.serializer.js";
import { serializePublicRazorpayOrder } from "../serializers/payment.public.serializer.js";
import { assertRazorpayPaymentAmount, createRazorpayOrderForPayment } from "./payment.service.js";
import { resolvePromoCodeForOrder } from "./promocode.service.js";
import { getOrderConfig } from "./site-settings.service.js";
import { STORE_LOCATIONS } from "../constants/store-locations.js";

const orderIncludes = {
  user: true,
  address: true,
  promoCodeRef: true,
  items: true,
  payments: {
    orderBy: { createdAt: "desc" },
  },
};

async function createUniqueOrderNumber() {
  let orderNumber = generateOrderNumber();

  while (await withReadDbRetry(() => prisma.order.findUnique({ where: { orderNumber }, select: { id: true } }))) {
    orderNumber = generateOrderNumber();
  }

  return orderNumber;
}

function buildPickupAddress(storeLocation) {
  const location = STORE_LOCATIONS.find((currentLocation) => currentLocation.id === storeLocation);
  const pickupLabel = location ? `Pickup: ${location.name}` : "Pickup from selected store";

  return {
    addressLine1: pickupLabel,
    addressLine2: undefined,
    landmark: undefined,
    city: undefined,
    state: undefined,
    postalCode: undefined,
    fullAddress: location?.address || pickupLabel,
  };
}

export async function createOrder(payload, { user } = {}) {
  if (!user?.id) {
    throw new ApiError(StatusCodes.UNAUTHORIZED, "User authentication is required to place orders");
  }

  if (payload.paymentMethod === "online" && !isRazorpayConfigured) {
    throw new ApiError(StatusCodes.SERVICE_UNAVAILABLE, "Online payments are not configured");
  }

  if (payload.userAddressId) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Delivery addresses are disabled while pickup-only ordering is active");
  }

  const itemIds = [...new Set(payload.items.map((item) => item.menuItemId || item.id))];
  const menuItems = await prisma.menuItem.findMany({
    where: {
      id: { in: itemIds },
    },
  });

  if (menuItems.length !== itemIds.length) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "One or more selected menu items could not be found");
  }

  const itemMap = new Map(menuItems.map((item) => [item.id, item]));
  const orderItems = payload.items.map((requestedItem) => {
    const menuItem = itemMap.get(requestedItem.menuItemId || requestedItem.id);

    if (!menuItem?.isAvailable) {
      throw new ApiError(StatusCodes.BAD_REQUEST, `${menuItem?.name || "Selected item"} is not currently available`);
    }

    return {
      menuItemId: menuItem.id,
      itemName: menuItem.name,
      itemDescription: menuItem.description || menuItem.shortDescription,
      itemImageUrl: menuItem.imageUrl,
      unitPricePaise: menuItem.pricePaise,
      quantity: requestedItem.quantity,
      lineTotalPaise: menuItem.pricePaise * requestedItem.quantity,
      isVeg: menuItem.isVeg,
    };
  });

  const subtotalPaise = orderItems.reduce((total, item) => total + item.lineTotalPaise, 0);
  const promoResolution = await resolvePromoCodeForOrder(payload.promoCode, subtotalPaise);
  const discountPaise = promoResolution?.discountPaise || 0;
  const orderConfig = await getOrderConfig();
  const totals = calculateTotals({
    subtotalPaise: Math.max(subtotalPaise - discountPaise, 0),
    taxPercent: orderConfig.taxPercent,
    deliveryFeePaise: 0,
    freeDeliveryThresholdPaise: 0,
  });

  if (payload.paymentMethod === "online") {
    assertRazorpayPaymentAmount(totals.grandTotalPaise);
  }

  const orderNumber = await createUniqueOrderNumber();
  const address = buildPickupAddress(payload.storeLocation);

  const orderCreateOperation = prisma.order.create({
    data: {
      userId: user?.id,
      promoCodeId: promoResolution?.promoCode?.id,
      orderNumber,
      customerName: payload.customer.name,
      phone: payload.customer.phone,
      whatsapp: payload.customer.whatsapp,
      email: payload.customer.email || user?.email,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      landmark: address.landmark,
      city: address.city,
      state: address.state,
      postalCode: address.postalCode,
      fullAddress: address.fullAddress,
      notes: payload.notes,
      storeLocation: payload.storeLocation,
      source: payload.source ?? "web",
      paymentMethod: payload.paymentMethod,
      paymentStatus: payload.paymentMethod === "cod" ? "unpaid" : "pending",
      orderStatus: "pending",
      subtotalPaise,
      discountPaise,
      deliveryFeePaise: totals.deliveryFeePaise,
      promoCode: promoResolution?.promoCode?.code,
      taxPercent: totals.taxPercent,
      taxPaise: totals.taxPaise,
      grandTotalPaise: totals.grandTotalPaise,
      currency: orderConfig.currency,
      items: {
        create: orderItems,
      },
      payments: {
        create: {
          provider: payload.paymentMethod === "online" ? "razorpay" : "cod",
          status: payload.paymentMethod === "online" ? "pending" : "unpaid",
          amountPaise: totals.grandTotalPaise,
          currency: orderConfig.currency,
        },
      },
    },
    include: orderIncludes,
  });

  const orderOperations = promoResolution?.promoCode
    ? [
        prisma.promoCode.update({
          where: { id: promoResolution.promoCode.id },
          data: {
            usedCount: {
              increment: 1,
            },
          },
        }),
        orderCreateOperation,
      ]
    : [orderCreateOperation];

  const orderResults = await prisma.$transaction(orderOperations);
  const order = orderResults[orderResults.length - 1];

  if (payload.paymentMethod === "cod") {
    return {
      order: serializePublicOrder(order),
    };
  }

  const pendingPayment = order.payments.find((payment) => payment.provider === "razorpay" && payment.status === "pending");

  if (!pendingPayment) {
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, "Payment record was not created for this order");
  }

  let gatewayOrder;

  try {
    gatewayOrder = await createRazorpayOrderForPayment(pendingPayment.id);
  } catch (error) {
    if (error instanceof ApiError && error.statusCode < StatusCodes.INTERNAL_SERVER_ERROR) {
      throw error;
    }

    return {
      order: serializePublicOrder(order),
      paymentError: {
        message:
          error instanceof ApiError
            ? error.message
            : "Could not start Razorpay payment. Please retry or choose cash at pickup.",
        retryable: true,
      },
    };
  }

  return {
    order: serializePublicOrder(order),
    razorpay: serializePublicRazorpayOrder(gatewayOrder.razorpay),
  };
}

export async function listOrders({ orderStatus, paymentStatus, search, page, limit } = {}) {
  const { page: currentPage, limit: pageSize, skip } = getPagination({ page, limit });
  const where = {
    ...(orderStatus ? { orderStatus } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
    ...(search
      ? {
          OR: [
            { orderNumber: { contains: search, mode: "insensitive" } },
            { customerName: { contains: search, mode: "insensitive" } },
            { phone: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [orders, total] = await Promise.all([
    withReadDbRetry(() =>
      prisma.order.findMany({
        where,
        include: orderIncludes,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
      }),
    ),
    withReadDbRetry(() => prisma.order.count({ where })),
  ]);

  return {
    items: orders.map(serializeOrder),
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
}

export async function getOrderById(id) {
  const order = await withReadDbRetry(() =>
    prisma.order.findUnique({
      where: { id },
      include: orderIncludes,
    }),
  );

  if (!order) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Order not found");
  }

  return serializeOrder(order);
}

export async function updateOrder(id, payload) {
  const existing = await prisma.order.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Order not found");
  }

  const data = {
    ...(payload.orderStatus ? { orderStatus: payload.orderStatus } : {}),
    ...(payload.paymentStatus ? { paymentStatus: payload.paymentStatus } : {}),
    ...(typeof payload.notes === "string" ? { notes: payload.notes } : {}),
  };

  if (payload.orderStatus === "accepted" && !existing.acceptedAt) {
    data.acceptedAt = new Date();
  }

  if (payload.orderStatus === "delivered") {
    data.deliveredAt = new Date();
  }

  if (payload.orderStatus === "cancelled") {
    data.cancelledAt = new Date();
  }

  const order = await prisma.order.update({
    where: { id },
    data,
    include: orderIncludes,
  });

  return serializeOrder(order);
}
