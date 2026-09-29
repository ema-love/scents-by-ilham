/**
 * Small signed tokens: base64url(JSON payload) + "." + base64url(HMAC-SHA256).
 * Web Crypto only, so the same code runs in proxy.ts and in route handlers.
 * Payloads are signed, not encrypted — never put secrets in them.
 */
const enc = new TextEncoder();

function b64url(bytes: Uint8Array) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromB64url(s: string) {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmac(secret: string, data: string) {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return new Uint8Array(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

/** Constant-time comparison. */
function equal(a: Uint8Array, b: Uint8Array) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function signToken(payload: object, secret: string) {
  const body = b64url(enc.encode(JSON.stringify(payload)));
  return `${body}.${b64url(await hmac(secret, body))}`;
}

export async function verifyToken<T>(token: string | undefined, secret: string): Promise<T | null> {
  if (!token || token.length > 4096) return null;
  const [body, sig] = token.split(".");
  if (!body || !sig) return null;
  try {
    if (!equal(fromB64url(sig), await hmac(secret, body))) return null;
    return JSON.parse(new TextDecoder().decode(fromB64url(body))) as T;
  } catch {
    return null;
  }
}

export async function sha256Hex(input: string) {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(input)));
  return [...digest].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// ------------------------------------------------------------------
// Admin session
// ------------------------------------------------------------------

export const ADMIN_COOKIE = "sbi_admin";
export const ADMIN_SESSION_DAYS = 30;

export type AdminSession = {
  /** Admin's display name, recorded on every action. */
  name: string;
  /** Expiry, ms since epoch. */
  exp: number;
  /** Fingerprint of the password at sign-in: changing ADMIN_PASSWORD signs everyone out. */
  pv: string;
};

export const passwordVersion = async (password: string) => (await sha256Hex(`sbi:${password}`)).slice(0, 16);

export async function readAdminSession(token: string | undefined, secret: string, password: string | undefined, now = Date.now()) {
  if (!password) return null;
  const session = await verifyToken<AdminSession>(token, secret);
  if (!session || typeof session.exp !== "number" || session.exp < now) return null;
  if (session.pv !== (await passwordVersion(password))) return null;
  return session;
}

// ------------------------------------------------------------------
// Customer order access (no accounts: a signed cookie lists orders this browser may view)
// ------------------------------------------------------------------

export const ORDER_ACCESS_COOKIE = "sbi_orders";
export const MAX_REMEMBERED_ORDERS = 12;
export type OrderAccess = { ids: string[] };
