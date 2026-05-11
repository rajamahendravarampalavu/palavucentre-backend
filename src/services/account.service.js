import { StatusCodes } from "http-status-codes";

import { prisma, withReadDbRetry } from "../config/prisma.js";
import { ApiError } from "../utils/ApiError.js";
import { serializeOrder, serializeUser, serializeUserAddress } from "../utils/serializers.js";

function buildFullAddress(payload) {
  return [
    payload.addressLine1,
    payload.addressLine2,
    payload.landmark,
    payload.city,
    payload.state,
    payload.postalCode,
  ]
    .filter(Boolean)
    .join(", ");
}

async function setDefaultAddress(tx, userId, addressId) {
  await tx.userAddress.updateMany({
    where: {
      userId,
      NOT: { id: addressId },
    },
    data: {
      isDefault: false,
    },
  });

  await tx.userAddress.update({
    where: { id: addressId },
    data: {
      isDefault: true,
    },
  });
}

async function requireOwnedAddress(userId, addressId) {
  const address = await withReadDbRetry(() =>
    prisma.userAddress.findFirst({
      where: {
        id: addressId,
        userId,
      },
    }),
  );

  if (!address) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Address not found");
  }

  return address;
}

export async function listUserOrders(userId, { email } = {}) {
  const orders = await withReadDbRetry(() =>
    prisma.order.findMany({
      where: {
        OR: [
          { userId },
          ...(email
            ? [
                {
                  AND: [{ userId: null }, { email }],
                },
              ]
            : []),
        ],
      },
      include: {
        user: true,
        address: true,
        promoCodeRef: true,
        items: true,
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
  );

  return orders.map(serializeOrder);
}

export async function listUserAddresses(userId) {
  const addresses = await withReadDbRetry(() =>
    prisma.userAddress.findMany({
      where: { userId },
      orderBy: [{ isDefault: "desc" }, { createdAt: "desc" }],
    }),
  );

  return addresses.map(serializeUserAddress);
}

export async function getAccountProfile(userId) {
  const [user, addresses] = await Promise.all([
    withReadDbRetry(() =>
      prisma.user.findUnique({
        where: { id: userId },
      }),
    ),
    listUserAddresses(userId),
  ]);

  if (!user || !user.isActive) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  const orders = await listUserOrders(userId, { email: user.email });

  return {
    user: serializeUser(user),
    addresses,
    orders,
  };
}

export async function createUserAddress(userId, payload) {
  const existingAddressCount = await withReadDbRetry(() =>
    prisma.userAddress.count({
      where: { userId },
    }),
  );

  const createdAddress = await prisma.$transaction(async (tx) => {
    const address = await tx.userAddress.create({
      data: {
        userId,
        label: payload.label,
        recipientName: payload.recipientName,
        phone: payload.phone,
        addressLine1: payload.addressLine1,
        addressLine2: payload.addressLine2,
        landmark: payload.landmark,
        city: payload.city,
        state: payload.state,
        postalCode: payload.postalCode,
        fullAddress: buildFullAddress(payload),
        isDefault: payload.isDefault ?? existingAddressCount === 0,
      },
    });

    if (payload.isDefault || existingAddressCount === 0) {
      await setDefaultAddress(tx, userId, address.id);
      return tx.userAddress.findUnique({ where: { id: address.id } });
    }

    return address;
  });

  return serializeUserAddress(createdAddress);
}

export async function updateUserAddress(userId, addressId, payload) {
  const existingAddress = await requireOwnedAddress(userId, addressId);

  const updatedAddress = await prisma.$transaction(async (tx) => {
    const address = await tx.userAddress.update({
      where: { id: addressId },
      data: {
        ...(Object.prototype.hasOwnProperty.call(payload, "label") ? { label: payload.label } : {}),
        ...(payload.recipientName ? { recipientName: payload.recipientName } : {}),
        ...(payload.phone ? { phone: payload.phone } : {}),
        ...(payload.addressLine1 ? { addressLine1: payload.addressLine1 } : {}),
        ...(Object.prototype.hasOwnProperty.call(payload, "addressLine2") ? { addressLine2: payload.addressLine2 } : {}),
        ...(Object.prototype.hasOwnProperty.call(payload, "landmark") ? { landmark: payload.landmark } : {}),
        ...(payload.city ? { city: payload.city } : {}),
        ...(Object.prototype.hasOwnProperty.call(payload, "state") ? { state: payload.state } : {}),
        ...(Object.prototype.hasOwnProperty.call(payload, "postalCode") ? { postalCode: payload.postalCode } : {}),
        ...(typeof payload.isDefault === "boolean" ? { isDefault: payload.isDefault } : {}),
        fullAddress: buildFullAddress({
          addressLine1: payload.addressLine1 ?? existingAddress.addressLine1,
          addressLine2:
            Object.prototype.hasOwnProperty.call(payload, "addressLine2")
              ? payload.addressLine2
              : existingAddress.addressLine2,
          landmark:
            Object.prototype.hasOwnProperty.call(payload, "landmark") ? payload.landmark : existingAddress.landmark,
          city: payload.city ?? existingAddress.city,
          state: Object.prototype.hasOwnProperty.call(payload, "state") ? payload.state : existingAddress.state,
          postalCode:
            Object.prototype.hasOwnProperty.call(payload, "postalCode")
              ? payload.postalCode
              : existingAddress.postalCode,
        }),
      },
    });

    if (payload.isDefault) {
      await setDefaultAddress(tx, userId, addressId);
      return tx.userAddress.findUnique({ where: { id: addressId } });
    }

    return address;
  });

  return serializeUserAddress(updatedAddress);
}

export async function deleteUserAddress(userId, addressId) {
  const existingAddress = await requireOwnedAddress(userId, addressId);

  await prisma.$transaction(async (tx) => {
    await tx.userAddress.delete({
      where: { id: addressId },
    });

    if (!existingAddress.isDefault) {
      return;
    }

    const nextAddress = await tx.userAddress.findFirst({
      where: { userId },
      orderBy: [{ createdAt: "asc" }],
    });

    if (nextAddress) {
      await tx.userAddress.update({
        where: { id: nextAddress.id },
        data: { isDefault: true },
      });
    }
  });
}
