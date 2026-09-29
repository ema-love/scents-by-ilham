import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Lower-case, hyphenated, ASCII-only. "Upgraded Black Homura" → "upgraded-black-homura". */
export function slugify(input: string) {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/** Dates are shown in Lagos time, whatever the server's timezone. */
export function formatDate(iso: string, opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" }) {
  return new Intl.DateTimeFormat("en-NG", { timeZone: "Africa/Lagos", ...opts }).format(new Date(iso));
}
