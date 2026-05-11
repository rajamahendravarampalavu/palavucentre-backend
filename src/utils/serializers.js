import { uploadsPublicPath } from "../config/paths.js";
import { paiseToRupees } from "./amounts.js";

function toDateString(value) {
  if (!value) {
    return null;
  }

  return new Date(value).toISOString().split("T")[0];
}

function normalizeManagedAssetUrl(value) {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  if (!trimmed) {
    return trimmed;
  }

  if (trimmed.startsWith(`${uploadsPublicPath}/`)) {
    return trimmed;
  }

  try {
    const parsedUrl = new URL(trimmed);
    if (parsedUrl.pathname.startsWith(`${uploadsPublicPath}/`)) {
      return `${parsedUrl.pathname}${parsedUrl.search}`;
    }
  } catch {
    return trimmed;
  }

  return trimmed;
}

export function serializeMenuItem(item) {
  return {
    id: item.id,
    name: item.name,
    desc: item.shortDescription || item.description || "",
    description: item.description || item.shortDescription || "",
    price: paiseToRupees(item.pricePaise),
    img: normalizeManagedAssetUrl(item.imageUrl),
    veg: item.isVeg,
    bestseller: item.isBestseller,
    available: item.isAvailable,
    slug: item.slug,
    sortOrder: item.sortOrder,
    category: item.category
      ? {
          id: item.category.id,
          slug: item.category.slug,
          name: item.category.name,
          icon: item.category.icon,
        }
      : undefined,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function serializeMenuCategory(category) {
  return {
    id: category.id,
    name: category.name,
    slug: category.slug,
    description: category.description,
    icon: category.icon,
    sortOrder: category.sortOrder,
    isActive: category.isActive,
    items: category.items ? category.items.map(serializeMenuItem) : undefined,
  };
}

export function serializeGalleryItem(item) {
  return {
    id: item.id,
    title: item.title,
    altText: item.altText,
    url: normalizeManagedAssetUrl(item.url),
    publicId: item.publicId,
    mediaType: item.mediaType,
    category: item.category,
    visible: item.isVisible,
    sortOrder: item.sortOrder,
    createdAt: item.createdAt,
    updatedAt: item.updatedAt,
  };
}

export function serializeReview(review) {
  return {
    id: review.id,
    name: review.name,
    rating: review.rating,
    text: review.text,
    date: toDateString(review.reviewDate),
    visible: review.isVisible,
    source: review.source,
    googleReviewUrl: review.googleReviewUrl,
    sortOrder: review.sortOrder,
    createdAt: review.createdAt,
    updatedAt: review.updatedAt,
  };
}

export function serializeOffer(offer) {
  return {
    id: offer.id,
    slug: offer.slug,
    title: offer.title,
    description: offer.description,
    imageUrl: normalizeManagedAssetUrl(offer.imageUrl),
    ctaLabel: offer.ctaLabel,
    ctaHref: offer.ctaHref,
    status: offer.status,
    isFeatured: offer.isFeatured,
    startDate: offer.startDate,
    endDate: offer.endDate,
    sortOrder: offer.sortOrder,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
  };
}

export function serializePayment(payment) {
  return {
    id: payment.id,
    provider: payment.provider,
    status: payment.status,
    amount: paiseToRupees(payment.amountPaise),
    amountPaise: payment.amountPaise,
    currency: payment.currency,
    providerOrderId: payment.providerOrderId,
    providerPaymentId: payment.providerPaymentId,
    failureReason: payment.failureReason,
    paidAt: payment.paidAt,
    createdAt: payment.createdAt,
    updatedAt: payment.updatedAt,
  };
}

export function serializeOrder(order) {
  const discountPaise = Number(order.discountPaise || 0);
  const discountedSubtotalPaise = Math.max(Number(order.subtotalPaise || 0) - discountPaise, 0);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    account: order.user
      ? {
          id: order.user.id,
          name: order.user.name,
          email: order.user.email,
        }
      : null,
    customer: {
      name: order.customerName,
      phone: order.phone,
      whatsapp: order.whatsapp,
      email: order.email,
      address: order.fullAddress,
      addressId: order.userAddressId,
      addressLine1: order.addressLine1,
      addressLine2: order.addressLine2,
      landmark: order.landmark,
      city: order.city,
      state: order.state,
      postalCode: order.postalCode,
    },
    items: (order.items || []).map((item) => ({
      id: item.id,
      menuItemId: item.menuItemId,
      name: item.itemName,
      description: item.itemDescription,
      img: normalizeManagedAssetUrl(item.itemImageUrl),
      price: paiseToRupees(item.unitPricePaise),
      unitPrice: paiseToRupees(item.unitPricePaise),
      quantity: item.quantity,
      total: paiseToRupees(item.lineTotalPaise),
      veg: item.isVeg,
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
          id: order.promoCodeRef?.id,
          code: order.promoCode || order.promoCodeRef?.code,
          title: order.promoCodeRef?.title || null,
        }
      : null,
    paymentMethod: order.paymentMethod,
    paymentStatus: order.paymentStatus,
    orderStatus: order.orderStatus,
    storeLocation: order.storeLocation,
    source: order.source,
    notes: order.notes,
    isOtpVerified: order.isOtpVerified,
    payments: order.payments ? order.payments.map(serializePayment) : undefined,
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
    acceptedAt: order.acceptedAt,
    deliveredAt: order.deliveredAt,
    cancelledAt: order.cancelledAt,
  };
}

export function serializeUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
  };
}

export function serializeUserAddress(address) {
  return {
    id: address.id,
    userId: address.userId,
    label: address.label,
    recipientName: address.recipientName,
    phone: address.phone,
    addressLine1: address.addressLine1,
    addressLine2: address.addressLine2,
    landmark: address.landmark,
    city: address.city,
    state: address.state,
    postalCode: address.postalCode,
    fullAddress: address.fullAddress,
    isDefault: address.isDefault,
    createdAt: address.createdAt,
    updatedAt: address.updatedAt,
  };
}

export function serializeSocialLink(link) {
  return {
    id: link.id,
    platform: link.platform,
    label: link.label,
    url: link.url,
    isActive: link.isActive,
    sortOrder: link.sortOrder,
  };
}

export function serializePromoCode(promoCode) {
  return {
    id: promoCode.id,
    code: promoCode.code,
    title: promoCode.title,
    description: promoCode.description,
    discountType: promoCode.discountType,
    discountValue: Number(promoCode.discountValue),
    minOrder: paiseToRupees(promoCode.minOrderPaise || 0),
    minOrderPaise: promoCode.minOrderPaise || 0,
    maxDiscount: promoCode.maxDiscountPaise ? paiseToRupees(promoCode.maxDiscountPaise) : null,
    maxDiscountPaise: promoCode.maxDiscountPaise,
    maxUses: promoCode.maxUses,
    usedCount: promoCode.usedCount,
    isActive: promoCode.isActive,
    startDate: promoCode.startDate,
    endDate: promoCode.endDate,
    createdAt: promoCode.createdAt,
    updatedAt: promoCode.updatedAt,
  };
}

export function serializeSiteSettings(settings) {
  return {
    restaurantName: settings.restaurantName,
    tagline: settings.tagline,
    restaurantDescription: settings.restaurantDescription,
    logoUrl: normalizeManagedAssetUrl(settings.logoUrl),
    heroMedia: (settings.heroMedia || []).map((item) => ({
      ...item,
      url: normalizeManagedAssetUrl(item?.url),
    })),
    cta: {
      primary: {
        label: settings.primaryCtaLabel,
        href: settings.primaryCtaHref,
      },
      secondary: {
        label: settings.secondaryCtaLabel,
        href: settings.secondaryCtaHref,
      },
    },
    contact: {
      address: settings.addressText,
      mapEmbedUrl: settings.mapEmbedUrl,
      mapLink: settings.mapLink,
      phone: settings.phone,
      email: settings.email,
      hours: settings.hoursText,
      whatsappNumber: settings.whatsappNumber,
      floatingWhatsappEnabled: settings.floatingWhatsappEnabled,
    },
    seo: {
      cuisineType: settings.cuisineType,
      city: settings.city,
      areaKeywords: settings.areaKeywords,
      metaTitle: settings.metaTitle,
      metaDescription: settings.metaDescription,
      metaKeywords: settings.metaKeywords,
      googleReviewUrl: settings.googleReviewUrl,
    },
    ordering: {
      deliveryFee: 0,
      freeDeliveryThreshold: 0,
      deliveryFeePaise: 0,
      freeDeliveryThresholdPaise: 0,
      taxPercent: Number(settings.orderTaxPercent),
      currency: settings.currency,
    },
    socialLinks: (settings.socialLinks || []).map(serializeSocialLink),
    createdAt: settings.createdAt,
    updatedAt: settings.updatedAt,
  };
}
