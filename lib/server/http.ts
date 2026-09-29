import "server-only";
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { OrderError } from "./repo/orders";
import { ProductError } from "./repo/products";
import { getAdmin, sameOrigin } from "./session";

export const noStore = { "Cache-Control": "no-store" };

export const json = (data: unknown, status = 200) => NextResponse.json(data, { status, headers: noStore });
export const fail = (error: string, status = 400, extra: Record<string, unknown> = {}) => json({ error, ...extra }, status);

/** First validation message, in plain words. */
export const zodMessage = (e: ZodError) => e.issues[0]?.message ?? "Please check the form and try again.";

/** Turns known errors into friendly responses; everything else is logged and hidden. */
export function handleError(scope: string, e: unknown) {
  if (e instanceof OrderError) return fail(e.message, e.status, e.code ? { code: e.code } : {});
  if (e instanceof ProductError) return fail(e.message, 409);
  if (e instanceof ZodError) return fail(zodMessage(e), 400);
  console.error(`[${scope}]`, e);
  return fail("Something went wrong on our side. Please try again.", 500);
}

/**
 * Every admin API route starts with this: a valid session and a same-site request.
 * (proxy.ts also guards /admin pages, but routes never rely on it.)
 */
export async function requireAdmin(request: Request) {
  if (!sameOrigin(request)) return { response: fail("This request isn't allowed.", 403) } as const;
  const admin = await getAdmin();
  if (!admin) return { response: fail("Please sign in again.", 401, { code: "signed_out" }) } as const;
  return { admin } as const;
}
