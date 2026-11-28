export function invoiceLineNetCents(quantity: number, unitPriceCents: number): number {
  if (
    !Number.isFinite(quantity) ||
    quantity <= 0 ||
    !Number.isSafeInteger(unitPriceCents) ||
    unitPriceCents < 0
  ) {
    return 0;
  }
  if (Number.isInteger(quantity)) {
    return quantity * unitPriceCents;
  }

  // Round the decimal quantity times integer cents to the nearest cent, with ties rounded up.
  const [significand, exponent = "0"] = quantity.toString().split("e");
  const [integer, fraction = ""] = significand.split(".");
  const scale = fraction.length - Number(exponent);
  const divisor = 10n ** BigInt(scale);
  const cents = BigInt(integer + fraction) * BigInt(unitPriceCents);
  return Number((cents + divisor / 2n) / divisor);
}
