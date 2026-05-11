import { StatusCodes } from "http-status-codes";

import { prisma } from "../config/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { calculateTotals, paiseToRupees, rupeesToPaise } from "../utils/amounts.js";
import { getPagination } from "../utils/pagination.js";
import { serializePromoCode } from "../utils/serializers.js";
import { getOrderConfig } from "./site-settings.service.js";

function normalizePromoCode(code) {
  return String(code || "").trim().toUpperCase();
}

function buildPromoWhere(code) {
  return {
    code: normalizePromoCode(code),
  };
}

function assertPromoCodeIsActive(promoCode, now = new Date()) {
  if (!promoCode || !promoCode.isActive) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Promo code is not available");
  }

  if (promoCode.startDate && promoCode.startDate > now) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Promo code is not active yet");
  }

  if (promoCode.endDate && promoCode.endDate < now) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Promo code has expired");
  }

  if (promoCode.maxUses !== null && promoCode.maxUses !== undefined && promoCode.usedCount >= promoCode.maxUses) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Promo code usage limit has been reached");
  }
}

function calculatePromoDiscount(promoCode, subtotalPaise) {
  let discountPaise =
    promoCode.discountType === "percentage"
      ? Math.round((subtotalPaise * Number(promoCode.discountValue)) / 100)
      : rupeesToPaise(Number(promoCode.discountValue));

  if (promoCode.maxDiscountPaise) {
    discountPaise = Math.min(discountPaise, promoCode.maxDiscountPaise);
  }

  return Math.max(0, Math.min(discountPaise, subtotalPaise));
}

async function resolvePromoCodeOrThrow(code, subtotalPaise) {
  const promoCode = await prisma.promoCode.findUnique({
    where: buildPromoWhere(code),
  });

  assertPromoCodeIsActive(promoCode);

  if (subtotalPaise < promoCode.minOrderPaise) {
    throw new ApiError(
      StatusCodes.BAD_REQUEST,
      `Promo code requires a minimum order of ${paiseToRupees(promoCode.minOrderPaise)}`,
    );
  }

  const discountPaise = calculatePromoDiscount(promoCode, subtotalPaise);

  if (discountPaise <= 0) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Promo code could not be applied to this order");
  }

  return {
    promoCode,
    discountPaise,
  };
}

export async function applyPromoCodePreview({ code, subTotal }) {
  const subtotalPaise = rupeesToPaise(subTotal);
  const orderConfig = await getOrderConfig();
  const { promoCode, discountPaise } = await resolvePromoCodeOrThrow(code, subtotalPaise);
  const discountedSubtotalPaise = Math.max(subtotalPaise - discountPaise, 0);
  const totals = calculateTotals({
    subtotalPaise: discountedSubtotalPaise,
    taxPercent: orderConfig.taxPercent,
    deliveryFeePaise: 0,
    freeDeliveryThresholdPaise: 0,
  });

  return {
    promoCode: serializePromoCode(promoCode),
    pricing: {
      subTotal: paiseToRupees(subtotalPaise),
      subTotalPaise: subtotalPaise,
      discountAmount: paiseToRupees(discountPaise),
      discountPaise,
      discountedSubTotal: paiseToRupees(discountedSubtotalPaise),
      discountedSubtotalPaise,
      deliveryFee: paiseToRupees(totals.deliveryFeePaise),
      deliveryFeePaise: totals.deliveryFeePaise,
      taxPercent: Number(totals.taxPercent),
      taxAmount: paiseToRupees(totals.taxPaise),
      taxPaise: totals.taxPaise,
      grandTotal: paiseToRupees(totals.grandTotalPaise),
      grandTotalPaise: totals.grandTotalPaise,
      currency: orderConfig.currency,
    },
  };
}

export async function resolvePromoCodeForOrder(code, subtotalPaise) {
  if (!code) {
    return null;
  }

  return resolvePromoCodeOrThrow(code, subtotalPaise);
}

export async function listAdminPromoCodes({ isActive, search, page, limit } = {}) {
  const { page: currentPage, limit: pageSize, skip } = getPagination({ page, limit });
  const where = {
    ...(typeof isActive === "boolean" ? { isActive } : {}),
    ...(search
      ? {
          OR: [
            { code: { contains: search.toUpperCase() } },
            { title: { contains: search, mode: "insensitive" } },
            { description: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [promoCodes, total] = await Promise.all([
    prisma.promoCode.findMany({
      where,
      orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
      skip,
      take: pageSize,
    }),
    prisma.promoCode.count({ where }),
  ]);

  return {
    items: promoCodes.map(serializePromoCode),
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize) || 1,
    },
  };
}

export async function createPromoCode(payload) {
  const code = normalizePromoCode(payload.code);

  const existing = await prisma.promoCode.findUnique({
    where: { code },
    select: { id: true },
  });

  if (existing) {
    throw new ApiError(StatusCodes.CONFLICT, "A promo code with this code already exists");
  }

  const promoCode = await prisma.promoCode.create({
    data: {
      code,
      title: payload.title,
      description: payload.description,
      discountType: payload.discountType,
      discountValue: payload.discountValue,
      minOrderPaise: rupeesToPaise(payload.minOrder || 0),
      maxDiscountPaise: payload.maxDiscount ? rupeesToPaise(payload.maxDiscount) : null,
      maxUses: payload.maxUses,
      isActive: payload.isActive ?? true,
      startDate: payload.startDate ? new Date(payload.startDate) : null,
      endDate: payload.endDate ? new Date(payload.endDate) : null,
    },
  });

  return serializePromoCode(promoCode);
}

export async function updatePromoCode(id, payload) {
  const existing = await prisma.promoCode.findUnique({
    where: { id },
  });

  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Promo code not found");
  }

  const nextCode = payload.code ? normalizePromoCode(payload.code) : existing.code;

  if (nextCode !== existing.code) {
    const duplicate = await prisma.promoCode.findUnique({
      where: { code: nextCode },
      select: { id: true },
    });

    if (duplicate) {
      throw new ApiError(StatusCodes.CONFLICT, "A promo code with this code already exists");
    }
  }

  const promoCode = await prisma.promoCode.update({
    where: { id },
    data: {
      ...(payload.code ? { code: nextCode } : {}),
      ...(Object.prototype.hasOwnProperty.call(payload, "title") ? { title: payload.title } : {}),
      ...(Object.prototype.hasOwnProperty.call(payload, "description") ? { description: payload.description } : {}),
      ...(payload.discountType ? { discountType: payload.discountType } : {}),
      ...(typeof payload.discountValue === "number" ? { discountValue: payload.discountValue } : {}),
      ...(Object.prototype.hasOwnProperty.call(payload, "minOrder")
        ? { minOrderPaise: rupeesToPaise(payload.minOrder || 0) }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(payload, "maxDiscount")
        ? { maxDiscountPaise: payload.maxDiscount ? rupeesToPaise(payload.maxDiscount) : null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(payload, "maxUses") ? { maxUses: payload.maxUses ?? null } : {}),
      ...(typeof payload.isActive === "boolean" ? { isActive: payload.isActive } : {}),
      ...(Object.prototype.hasOwnProperty.call(payload, "startDate")
        ? { startDate: payload.startDate ? new Date(payload.startDate) : null }
        : {}),
      ...(Object.prototype.hasOwnProperty.call(payload, "endDate")
        ? { endDate: payload.endDate ? new Date(payload.endDate) : null }
        : {}),
    },
  });

  return serializePromoCode(promoCode);
}

export async function deletePromoCode(id) {
  const existing = await prisma.promoCode.findUnique({
    where: { id },
    select: { id: true },
  });

  if (!existing) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Promo code not found");
  }

  await prisma.promoCode.delete({
    where: { id },
  });
}
