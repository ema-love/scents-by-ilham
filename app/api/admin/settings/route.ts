import { settingsSchema } from "@/lib/domain/settings";
import { isValidPhone } from "@/lib/phone";
import { saveSettings } from "@/lib/server/repo/settings";
import { fail, handleError, json, requireAdmin, zodMessage } from "@/lib/server/http";

export async function PUT(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(zodMessage(parsed.error));
  if (!isValidPhone(parsed.data.phone)) return fail("Enter a valid business phone number.");
  if (parsed.data.whatsappNumber && !isValidPhone(parsed.data.whatsappNumber)) return fail("Enter a valid WhatsApp number, or leave it empty to use the business phone.");
  try {
    await saveSettings(parsed.data, auth.admin.name);
    return json({ ok: true });
  } catch (e) {
    return handleError("admin:settings", e);
  }
}
