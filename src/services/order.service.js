import { StatusCodes } from "http-status-codes";

import { prisma, withReadDbRetry } from "../config/prisma.js";
import { isRazorpayConfigured } from "../config/razorpay.js";
import { ApiError } from "../utils/ApiError.js";
import { calculateTotals, paiseToRupees } from "../utils/amounts.js";
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

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

function startOfIstDay(date = new Date()) {
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(istDate.getUTCFullYear(), istDate.getUTCMonth(), istDate.getUTCDate()) - IST_OFFSET_MS);
}

function startOfIstMonth(date = new Date()) {
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  return new Date(Date.UTC(istDate.getUTCFullYear(), istDate.getUTCMonth(), 1) - IST_OFFSET_MS);
}

function resolveOrderDateRange({ datePreset, dateFrom, dateTo } = {}) {
  if (datePreset) {
    const now = new Date();
    const todayStart = startOfIstDay(now);

    if (datePreset === "today") {
      return { dateFrom: todayStart, dateTo: now };
    }

    if (datePreset === "yesterday") {
      const yesterdayStart = new Date(todayStart.getTime() - DAY_MS);
      return { dateFrom: yesterdayStart, dateTo: new Date(todayStart.getTime() - 1) };
    }

    if (datePreset === "last7") {
      return { dateFrom: new Date(now.getTime() - 7 * DAY_MS), dateTo: now };
    }

    if (datePreset === "last30") {
      return { dateFrom: new Date(now.getTime() - 30 * DAY_MS), dateTo: now };
    }

    if (datePreset === "thisMonth") {
      return { dateFrom: startOfIstMonth(now), dateTo: now };
    }

    if (datePreset === "lastMonth") {
      const currentMonthStart = startOfIstMonth(now);
      const previousMonthDate = new Date(currentMonthStart.getTime() - DAY_MS);
      return {
        dateFrom: startOfIstMonth(previousMonthDate),
        dateTo: new Date(currentMonthStart.getTime() - 1),
      };
    }
  }

  return {
    dateFrom: dateFrom ? new Date(dateFrom) : null,
    dateTo: dateTo ? new Date(dateTo) : null,
  };
}

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

export async function listOrders({ orderStatus, paymentStatus, search, page, limit, datePreset, dateFrom, dateTo } = {}) {
  const { page: currentPage, limit: pageSize, skip } = getPagination({ page, limit });
  const dateRange = resolveOrderDateRange({ datePreset, dateFrom, dateTo });

  if (dateRange.dateFrom && dateRange.dateTo && dateRange.dateFrom > dateRange.dateTo) {
    throw new ApiError(StatusCodes.UNPROCESSABLE_ENTITY, "dateFrom must be before dateTo", {
      dateFrom: "dateFrom must be before dateTo",
    });
  }

  const createdAt = {
    ...(dateRange.dateFrom ? { gte: dateRange.dateFrom } : {}),
    ...(dateRange.dateTo ? { lte: dateRange.dateTo } : {}),
  };
  const where = {
    ...(orderStatus ? { orderStatus } : {}),
    ...(paymentStatus ? { paymentStatus } : {}),
    ...(Object.keys(createdAt).length > 0 ? { createdAt } : {}),
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

  const [orders, total, revenueAggregate] = await Promise.all([
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
    withReadDbRetry(() =>
      prisma.order.aggregate({
        where,
        _sum: {
          grandTotalPaise: true,
        },
      }),
    ),
  ]);
  const filteredRevenuePaise = Number(revenueAggregate._sum.grandTotalPaise || 0);

  return {
    items: orders.map(serializeOrder),
    filteredCount: total,
    filteredRevenue: paiseToRupees(filteredRevenuePaise),
    filteredRevenuePaise,
    dateFrom: dateRange.dateFrom ? dateRange.dateFrom.toISOString() : null,
    dateTo: dateRange.dateTo ? dateRange.dateTo.toISOString() : null,
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
