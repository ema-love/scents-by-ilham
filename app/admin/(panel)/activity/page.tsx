import type { Metadata } from "next";
import { recentAudit } from "@/lib/server/repo/audit";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Activity" };

/** Who changed what in the store. Order-by-order history is on each order. */
export default async function ActivityPage() {
  const entries = await recentAudit(200);
  return (
    <div>
      <h1 className="display text-[clamp(2rem,7vw,2.5rem)]">Activity</h1>
      <p className="mt-2 text-muted-foreground">Changes to products and store settings. Each order keeps its own history too.</p>
      {entries.length ? (
        <ul className="mt-6 divide-y rounded-2xl bg-card ring-1 ring-border">
          {entries.map((a, i) => (
            <li key={i} className="px-4 py-3 text-[14.5px]">
              <p>
                {a.action}
                {a.subject && <span className="font-medium"> — {a.subject}</span>}
              </p>
              <p className="text-[13px] text-muted-foreground">
                {a.by} · {formatDate(a.at)}
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-2xl bg-card p-6 text-center text-muted-foreground ring-1 ring-border">Nothing yet.</p>
      )}
    </div>
  );
}
