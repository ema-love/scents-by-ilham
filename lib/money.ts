/**
 * Prices are whole naira (integers). ₦2,500 is stored as 2500.
 * A future card provider that wants kobo converts at its own boundary (× 100).
 */
export function formatNaira(amount: number) {
  const whole = Math.round(amount);
  const sign = whole < 0 ? "-" : "";
  // Grouped by hand so server and browser always render identical text (no hydration drift).
  const digits = String(Math.abs(whole)).replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return `${sign}₦${digits}`;
}

/** Accepts "2500", "2,500", "₦2,500", " 2500 " → 2500. Returns NaN for anything else. */
export function parseNaira(input: string | number) {
  if (typeof input === "number") return input;
  const cleaned = input.replace(/[₦,\s]/g, "").replace(/^NGN/i, "");
  return /^\d+(\.\d{1,2})?$/.test(cleaned) ? Math.round(Number(cleaned)) : NaN;
}
