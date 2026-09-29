import { z } from "zod";
import { adminConfigured } from "@/lib/server/env";
import { checkAdminPassword, sameOrigin, startAdminSession } from "@/lib/server/session";
import { clientIp, rateLimit } from "@/lib/server/rate-limit";
import { recordAudit } from "@/lib/server/repo/audit";
import { serverEnv } from "@/lib/server/env";
import { fail, json } from "@/lib/server/http";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("This request isn't allowed.", 403);
  if (!adminConfigured()) return fail("Sign-in isn't set up yet. Ask Ema to set ADMIN_PASSWORD (12+ characters) and SESSION_SECRET.", 503);
  if (!rateLimit(`login:${clientIp(request)}`, 8, 15 * 60_000)) return fail("Too many attempts. Please wait 15 minutes and try again.", 429);

  const parsed = z.object({ password: z.string().max(200) }).safeParse(await request.json().catch(() => null));
  if (!parsed.success || !checkAdminPassword(parsed.data.password)) {
    return fail("That password isn't right. Please try again.", 401);
  }
  await startAdminSession();
  await recordAudit(serverEnv.adminName, "Signed in");
  return json({ ok: true });
}
