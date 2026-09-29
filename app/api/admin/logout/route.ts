import { endAdminSession, sameOrigin } from "@/lib/server/session";
import { fail, json } from "@/lib/server/http";

export async function POST(request: Request) {
  if (!sameOrigin(request)) return fail("This request isn't allowed.", 403);
  await endAdminSession();
  return json({ ok: true });
}
