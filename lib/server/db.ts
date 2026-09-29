import "server-only";
import { createHash } from "node:crypto";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getStore } from "@netlify/blobs";
import { serverEnv } from "./env";

/**
 * The database: a small JSON document store with compare-and-swap writes.
 *
 * - Netlify Blobs in production (strongly consistent reads, ETag-conditional writes)
 * - a folder of JSON files locally
 * - memory in tests
 *
 * Every write that depends on what was read uses `mutate()`, which retries on conflict, so
 * two requests can never silently overwrite each other (e.g. two orders taking the same number).
 * Swapping in a SQL database later means another implementation of this interface.
 */
export type Doc<T> = { data: T; etag: string };
export type WriteOptions = { onlyIfNew?: boolean; onlyIfMatch?: string };

export interface DocStore {
  get<T>(key: string): Promise<Doc<T> | null>;
  /** Returns false (and writes nothing) when a condition fails. */
  set<T>(key: string, data: T, options?: WriteOptions): Promise<boolean>;
  delete(key: string): Promise<void>;
  list(prefix: string): Promise<string[]>;
}

export class ConflictError extends Error {}

/**
 * Read-modify-write with optimistic concurrency. `fn` receives the current value (or null)
 * and returns the next one; it may run more than once, so it must not have side effects.
 */
export async function mutate<T>(db: DocStore, key: string, fn: (current: T | null) => T, attempts = 8): Promise<T> {
  for (let i = 0; i < attempts; i++) {
    const current = await db.get<T>(key);
    const next = fn(current ? current.data : null);
    const ok = current ? await db.set(key, next, { onlyIfMatch: current.etag }) : await db.set(key, next, { onlyIfNew: true });
    if (ok) return next;
    await new Promise((r) => setTimeout(r, 15 * (i + 1) + Math.random() * 20));
  }
  throw new ConflictError(`Too many concurrent changes to ${key}`);
}

const etagOf = (json: string) => createHash("sha1").update(json).digest("hex");

/** In-memory store. Used by tests. */
export class MemoryDocStore implements DocStore {
  readonly docs = new Map<string, string>();
  async get<T>(key: string) {
    const json = this.docs.get(key);
    return json === undefined ? null : { data: JSON.parse(json) as T, etag: etagOf(json) };
  }
  async set<T>(key: string, data: T, options: WriteOptions = {}) {
    const existing = this.docs.get(key);
    if (options.onlyIfNew && existing !== undefined) return false;
    if (options.onlyIfMatch && (existing === undefined || etagOf(existing) !== options.onlyIfMatch)) return false;
    this.docs.set(key, JSON.stringify(data));
    return true;
  }
  async delete(key: string) {
    this.docs.delete(key);
  }
  async list(prefix: string) {
    return [...this.docs.keys()].filter((k) => k.startsWith(prefix)).sort();
  }
}

/**
 * One JSON file per document under <dataDir>/db. Writes are serialised in-process and atomic
 * (temp file + rename). Fine for local development and a single Node server.
 */
export class FileDocStore implements DocStore {
  private queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly dir: string) {}

  private file(key: string) {
    return path.join(this.dir, `${encodeURIComponent(key)}.json`);
  }
  private serial<R>(fn: () => Promise<R>): Promise<R> {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => undefined);
    return run;
  }
  private async read(key: string) {
    try {
      return await fs.readFile(/*turbopackIgnore: true*/ this.file(key), "utf8");
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  }

  async get<T>(key: string) {
    const json = await this.read(key);
    return json === null ? null : { data: JSON.parse(json) as T, etag: etagOf(json) };
  }

  set<T>(key: string, data: T, options: WriteOptions = {}) {
    return this.serial(async () => {
      const existing = await this.read(key);
      if (options.onlyIfNew && existing !== null) return false;
      if (options.onlyIfMatch && (existing === null || etagOf(existing) !== options.onlyIfMatch)) return false;
      await fs.mkdir(/*turbopackIgnore: true*/ this.dir, { recursive: true });
      const target = this.file(key);
      const tmp = `${target}.${process.pid}.${Date.now()}.tmp`;
      await fs.writeFile(/*turbopackIgnore: true*/ tmp, JSON.stringify(data), { mode: 0o600 });
      await fs.rename(/*turbopackIgnore: true*/ tmp, target);
      return true;
    });
  }

  delete(key: string) {
    return this.serial(() => fs.rm(/*turbopackIgnore: true*/ this.file(key), { force: true }));
  }

  async list(prefix: string) {
    const names = await fs.readdir(/*turbopackIgnore: true*/ this.dir).catch(() => [] as string[]);
    return names
      .filter((n) => n.endsWith(".json"))
      .map((n) => decodeURIComponent(n.slice(0, -5)))
      .filter((k) => k.startsWith(prefix))
      .sort();
  }
}

/** The subset of a Netlify Blobs store this module needs. */
type BlobsLike = ReturnType<typeof getStore>;

export class BlobDocStore implements DocStore {
  constructor(private readonly store: BlobsLike) {}
  async get<T>(key: string) {
    const found = await this.store.getWithMetadata(key, { type: "json", consistency: "strong" });
    if (!found) return null;
    return { data: found.data as T, etag: found.etag ?? "" };
  }
  async set<T>(key: string, data: T, options: WriteOptions = {}) {
    const result = options.onlyIfNew
      ? await this.store.setJSON(key, data, { onlyIfNew: true })
      : options.onlyIfMatch
        ? await this.store.setJSON(key, data, { onlyIfMatch: options.onlyIfMatch })
        : await this.store.setJSON(key, data);
    return result.modified;
  }
  async delete(key: string) {
    await this.store.delete(key);
  }
  async list(prefix: string) {
    const { blobs } = await this.store.list({ prefix });
    return blobs.map((b) => b.key).sort();
  }
}

let instance: DocStore | undefined;

export const db = (): DocStore =>
  (instance ??=
    serverEnv.storage === "netlify-blobs"
      ? new BlobDocStore(getStore({ name: "scents-db", consistency: "strong" }))
      : new FileDocStore(path.join(serverEnv.dataDir, "db")));

/** Test hook. */
export const setDb = (store: DocStore | undefined) => {
  instance = store;
};
