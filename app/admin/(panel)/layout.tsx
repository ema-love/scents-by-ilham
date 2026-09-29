import { redirect } from "next/navigation";
import { AdminNav } from "@/components/admin/admin-nav";
import { needsPaymentReview } from "@/lib/domain/orders";
import { listOrderSummaries } from "@/lib/server/repo/orders";
import { getAdmin } from "@/lib/server/session";

export const dynamic = "force-dynamic";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  if (!(await getAdmin())) redirect("/admin/login");
  const orders = await listOrderSummaries();
  const reviewCount = orders.filter((o) => o.status !== "cancelled" && needsPaymentReview(o.paymentStatus)).length;

  return (
    <div className="min-h-dvh bg-background lg:flex">
      <AdminNav reviewCount={reviewCount} />
      <main id="main" className="min-w-0 flex-1 px-4 pt-5 pb-28 sm:px-6 lg:px-10 lg:pt-10 lg:pb-16">
        <div className="mx-auto max-w-5xl">{children}</div>
      </main>
    </div>
  );
}
