export function serializePublicRazorpayOrder(razorpayOrder) {
  const razorpayOrderId = razorpayOrder.orderId || razorpayOrder.razorpayOrderId;

  return {
    keyId: razorpayOrder.keyId,
    orderId: razorpayOrderId,
    razorpayOrderId,
    amount: razorpayOrder.amount,
    amountPaise: razorpayOrder.amountPaise,
    currency: razorpayOrder.currency,
    orderNumber: razorpayOrder.receipt || razorpayOrder.orderNumber,
  };
}
