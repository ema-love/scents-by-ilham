import { productInputSchema, productQuickPatchSchema } from "@/lib/domain/products";
import { deleteProduct, updateProduct } from "@/lib/server/repo/products";
import { fail, handleError, json, requireAdmin, zodMessage } from "@/lib/server/http";

/** Full edit (from the product form) or a quick change (stock / visibility toggles). */
export async function PATCH(request: Request, ctx: RouteContext<"/api/admin/products/[id]">) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { quick?: unknown } | null;
  const parsed = body?.quick ? productQuickPatchSchema.safeParse(body.quick) : productInputSchema.safeParse(body);
  if (!parsed.success) return fail(zodMessage(parsed.error));
  try {
    return json({ product: await updateProduct(id, parsed.data, auth.admin.name) });
  } catch (e) {
    return handleError("admin:products:update", e);
  }
}

/** Permanent deletion: archived products only, and the form asks for confirmation first. */
export async function DELETE(request: Request, ctx: RouteContext<"/api/admin/products/[id]">) {
  const auth = await requireAdmin(request);
  if ("response" in auth) return auth.response;
  const { id } = await ctx.params;
  const body = (await request.json().catch(() => null)) as { confirm?: unknown } | null;
  if (body?.confirm !== "DELETE") return fail("Type DELETE to confirm.");
  try {
    await deleteProduct(id, auth.admin.name);
    return json({ ok: true });
  } catch (e) {
    return handleError("admin:products:delete", e);
  }
}
