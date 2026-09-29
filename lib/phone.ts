/**
 * Phone numbers are how customers identify themselves (no accounts, no email).
 *
 * Nigerian mobiles are accepted in any common form — 0803…, 803…, 234803…, +234 803 … —
 * and reduced to one canonical key (234XXXXXXXXXX) so tracking matches however it was typed.
 * Numbers from other countries are accepted with a leading "+".
 */
export function phoneKey(input: string): string | null {
  const raw = input.trim();
  const digits = raw.replace(/\D/g, "");
  if (/^0[789][01]\d{8}$/.test(digits)) return `234${digits.slice(1)}`;
  if (/^[789][01]\d{8}$/.test(digits)) return `234${digits}`;
  if (/^234[789][01]\d{8}$/.test(digits)) return digits;
  if (raw.startsWith("+") && !digits.startsWith("234") && digits.length >= 8 && digits.length <= 15) return digits;
  return null;
}

export const isValidPhone = (input: string) => phoneKey(input) !== null;

/** 2348089497031 → "0808 949 7031"; anything else is shown with a plus. */
export function formatPhone(input: string) {
  const key = phoneKey(input);
  if (!key) return input.trim();
  if (key.startsWith("234") && key.length === 13) {
    const local = `0${key.slice(3)}`;
    return `${local.slice(0, 4)} ${local.slice(4, 7)} ${local.slice(7)}`;
  }
  return `+${key}`;
}

/** For tel: links. */
export function telHref(input: string) {
  const key = phoneKey(input);
  return key ? `tel:+${key}` : `tel:${input.replace(/[^\d+]/g, "")}`;
}

/** For WhatsApp click-to-chat links (wa.me wants the international number without "+"). */
export function whatsappHref(input: string, text?: string) {
  const key = phoneKey(input);
  if (!key) return null;
  return `https://wa.me/${key}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
}
