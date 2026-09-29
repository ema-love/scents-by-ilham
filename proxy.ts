import { NextResponse, type NextRequest } from "next/server";
import { ADMIN_COOKIE, readAdminSession } from "@/lib/auth/token";

/**
 * First line of defence for the owner's dashboard: /admin pages need a valid session.
 * (Each admin page and API route checks the session again itself — this is not the only lock.)
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/admin/login") return NextResponse.next();

  const password = process.env.ADMIN_PASSWORD?.trim();
  const secret = process.env.SESSION_SECRET?.trim() || (process.env.NODE_ENV !== "production" ? "dev-only-session-secret-change-me-0123456789" : "");
  const session =
    password && password.length >= 12 && secret.length >= 32
      ? await readAdminSession(request.cookies.get(ADMIN_COOKIE)?.value, secret, password)
      : null;

  if (!session) {
    const login = new URL("/admin/login", request.url);
    if (pathname !== "/admin") login.searchParams.set("next", pathname + search);
    return NextResponse.redirect(login);
  }
  const response = NextResponse.next();
  response.headers.set("X-Robots-Tag", "noindex, nofollow");
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}

export const config = { matcher: ["/admin", "/admin/:path*"] };
