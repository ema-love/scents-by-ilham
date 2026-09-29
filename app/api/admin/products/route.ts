import { productInputSchema } from "@/lib/domain/products";
import { createProduct } from "@/lib/server/repo/products";
import { fail, handleError, json, requireAdmin, zodMessage } from "@/lib/server/http";

export async function POST(request: Request) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  const parsed = productInputSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return fail(zodMessage(parsed.error));
  try {
    const product = await createProduct(parsed.data, auth.admin.name);
    return json({ product }, 201);
  } catch (e) {
    return handleError("admin:products:create", e);
  }
}
