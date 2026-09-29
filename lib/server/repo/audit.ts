import "server-only";
import { db, mutate } from "../db";

/** Store-wide activity log for the dashboard: who changed what, and when. Order history lives on each order. */
export type AuditEntry = { at: string; by: string; action: string; subject?: string };

const KEY = "audit";
const MAX_ENTRIES = 500;

export async function recordAudit(by: string, action: string, subject?: string) {
  const entry: AuditEntry = { at: new Date().toISOString(), by, action, ...(subject ? { subject } : {}) };
  try {
    await mutate<{ entries: AuditEntry[] }>(db(), KEY, (cur) => ({ entries: [entry, ...(cur?.entries ?? [])].slice(0, MAX_ENTRIES) }));
  } catch (e) {
    // The log must never block the owner's actual change.
    console.error("[audit]", e);
  }
}

export async function recentAudit(limit = 50) {
  return ((await db().get<{ entries: AuditEntry[] }>(KEY))?.data.entries ?? []).slice(0, limit);
}
