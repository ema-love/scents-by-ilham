import "server-only";
import { cookies } from "next/headers";
import { createHash, timingSafeEqual } from "node:crypto";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_DAYS,
  MAX_REMEMBERED_ORDERS,
  ORDER_ACCESS_COOKIE,
  passwordVersion,
  readAdminSession,
  signToken,
  verifyToken,
  type AdminSession,
  type OrderAccess,
} from "@/lib/auth/token";
import { adminConfigured, serverEnv } from "./env";

const cookieBase = { httpOnly: true, sameSite: "lax" as const, secure: serverEnv.isProd, path: "/" };

/** Constant-time password check. Sign-in is off unless a 12+ character password is configured. */
export function checkAdminPassword(given: string) {
  const expected = serverEnv.adminPassword;
  if (!adminConfigured() || !expected || !given) return false;
  const digest = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(digest(given), digest(expected));
}

export async function startAdminSession() {
  const session: AdminSession = {
    name: serverEnv.adminName,
    exp: Date.now() + ADMIN_SESSION_DAYS * 86_400_000,
    pv: await passwordVersion(serverEnv.adminPassword!),
  };
  (await cookies()).set(ADMIN_COOKIE, await signToken(session, serverEnv.sessionSecret()), {
    ...cookieBase,
    maxAge: ADMIN_SESSION_DAYS * 86_400,
  });
}

export async function endAdminSession() {
  (await cookies()).set(ADMIN_COOKIE, "", { ...cookieBase, maxAge: 0 });
}

/** The signed-in admin, or null. Every admin page and API route checks this itself. */
export async function getAdmin() {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return readAdminSession(token, serverEnv.sessionSecret(), adminConfigured() ? serverEnv.adminPassword : undefined);
}

/** Orders this browser has placed or unlocked with order number + phone. */
export async function orderAccessIds(): Promise<string[]> {
  const token = (await cookies()).get(ORDER_ACCESS_COOKIE)?.value;
  const access = await verifyToken<OrderAccess>(token, serverEnv.sessionSecret());
  return Array.isArray(access?.ids) ? access.ids.filter((id) => typeof id === "string") : [];
}

export async function grantOrderAccess(orderId: string) {
  const ids = [orderId, ...(await orderAccessIds()).filter((id) => id !== orderId)].slice(0, MAX_REMEMBERED_ORDERS);
  (await cookies()).set(ORDER_ACCESS_COOKIE, await signToken({ ids } satisfies OrderAccess, serverEnv.sessionSecret()), {
    ...cookieBase,
    maxAge: 180 * 86_400,
  });
}

/**
 * Mutating requests must come from this site. SameSite cookies already block most cross-site
 * requests; this closes the rest.
 */
export function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return request.method === "GET" || request.method === "HEAD";
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}
