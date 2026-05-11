import { STORE_LOCATIONS } from "../constants/store-locations.js";
import { paiseToRupees } from "../utils/amounts.js";

function getPickupLocation(storeLocation) {
  const location = STORE_LOCATIONS.find((currentLocation) => currentLocation.id === storeLocation);

  if (!location) {
    return null;
  }

  return {
    id: location.id,
    name: location.name,
    address: location.address,
  };
}

export function serializePublicOrder(order) {
  const discountPaise = Number(order.discountPaise || 0);
  const discountedSubtotalPaise = Math.max(Number(order.subtotalPaise || 0) - discountPaise, 0);

  return {
    orderNumber: order.orderNumber,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    storeLocation: order.storeLocation,
    pickupLocation: getPickupLocation(order.storeLocation),
    items: (order.items || []).map((item) => ({
      name: item.itemName,
      unitPrice: paiseToRupees(item.unitPricePaise),
      quantity: item.quantity,
      total: paiseToRupees(item.lineTotalPaise),
    })),
    pricing: {
      subTotal: paiseToRupees(order.subtotalPaise),
      discountAmount: paiseToRupees(discountPaise),
      discountedSubTotal: paiseToRupees(discountedSubtotalPaise),
      deliveryFee: paiseToRupees(order.deliveryFeePaise || 0),
      taxPercent: Number(order.taxPercent),
      taxAmount: paiseToRupees(order.taxPaise),
      grandTotal: paiseToRupees(order.grandTotalPaise),
      currency: order.currency,
      subtotalPaise: order.subtotalPaise,
      discountPaise,
      discountedSubtotalPaise,
      deliveryFeePaise: order.deliveryFeePaise || 0,
      taxPaise: order.taxPaise,
      grandTotalPaise: order.grandTotalPaise,
    },
    promo: order.promoCode || order.promoCodeRef
      ? {
          code: order.promoCode || order.promoCodeRef?.code,
          title: order.promoCodeRef?.title || null,
        }
      : null,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    acceptedAt: order.acceptedAt,
    deliveredAt: order.deliveredAt,
    cancelledAt: order.cancelledAt,
  };
}
