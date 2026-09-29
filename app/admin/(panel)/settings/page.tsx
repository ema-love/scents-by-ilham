import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";
import { getSettings } from "@/lib/server/repo/settings";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Store settings" };

export default async function SettingsPage() {
  const { updatedAt: _updatedAt, ...settings } = await getSettings();
  return (
    <div className="max-w-2xl">
      <h1 className="display text-[clamp(2rem,7vw,2.5rem)]">Store settings</h1>
      <p className="mt-2 text-muted-foreground">Contact details, payment account, pickup and delivery. Changes show on the site straight away.</p>
      <div className="mt-6">
        <SettingsForm settings={settings} />
      </div>
    </div>
  );
}
