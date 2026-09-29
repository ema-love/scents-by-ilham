import { beforeEach } from "vitest";
import { MemoryDocStore, setDb } from "@/lib/server/db";
import { MemoryFileStore, setFiles } from "@/lib/server/files";

/** Fresh in-memory database and file storage for every test. */
export function useMemoryStores() {
  const state = { db: new MemoryDocStore(), files: new MemoryFileStore() };
  beforeEach(() => {
    state.db = new MemoryDocStore();
    state.files = new MemoryFileStore();
    setDb(state.db);
    setFiles(state.files);
  });
  return state;
}

export const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
export const PDF = new TextEncoder().encode("%PDF-1.4 test");
