export function rupeesToPaise(value) {
  return Math.round(Number(value) * 100);
}

export function paiseToRupees(value) {
  return Number((Number(value) / 100).toFixed(2));
}

export function calculateTotals({ subtotalPaise, taxPercent, deliveryFeePaise = 0, freeDeliveryThresholdPaise = 0 }) {
  const normalizedSubtotalPaise = Math.max(Number(subtotalPaise) || 0, 0);
  const normalizedTaxPercent = Number(taxPercent);
  const normalizedDeliveryFeePaise = Math.max(Number(deliveryFeePaise) || 0, 0);
  const normalizedFreeDeliveryThresholdPaise = Math.max(Number(freeDeliveryThresholdPaise) || 0, 0);
  const appliedDeliveryFeePaise =
    normalizedDeliveryFeePaise > 0 && normalizedSubtotalPaise < normalizedFreeDeliveryThresholdPaise
      ? normalizedDeliveryFeePaise
      : 0;
  const taxableAmountPaise = normalizedSubtotalPaise + appliedDeliveryFeePaise;
  const taxPaise = Math.round((taxableAmountPaise * normalizedTaxPercent) / 100);
  const grandTotalPaise = taxableAmountPaise + taxPaise;

  return {
    subtotalPaise: normalizedSubtotalPaise,
    deliveryFeePaise: appliedDeliveryFeePaise,
    freeDeliveryThresholdPaise: normalizedFreeDeliveryThresholdPaise,
    taxPercent: normalizedTaxPercent,
    taxPaise,
    grandTotalPaise,
  };
}
