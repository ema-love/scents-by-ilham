import "server-only";
import { cache } from "react";
import { defaultSettings, type SettingsInput, type StoreSettings } from "@/lib/domain/settings";
import { db, mutate } from "../db";
import { recordAudit } from "./audit";

const KEY = "settings";

/** Store settings, with defaults filled in for anything not saved yet. Cached per request. */
export const getSettings = cache(async (): Promise<StoreSettings> => {
  const saved = (await db().get<Partial<StoreSettings>>(KEY))?.data;
  return { ...defaultSettings, ...saved };
});

export async function saveSettings(input: SettingsInput, by: string) {
  const next = await mutate<StoreSettings>(db(), KEY, (cur) => ({ ...defaultSettings, ...cur, ...input, updatedAt: new Date().toISOString() }));
  await recordAudit(by, "Updated store settings");
  return next;
}
