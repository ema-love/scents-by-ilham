import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { getStore } from "@netlify/blobs";
import { serverEnv } from "./env";

/**
 * Binary uploads, in two separate buckets:
 *
 *   media     product photos — public, served at /media/<key>
 *   receipts  payment receipts — private, streamed only to a signed-in admin
 *
 * Neither lives in /public or in git. Receipts are never addressable by a public URL.
 */
export type Bucket = "media" | "receipts";
export type StoredFile = { data: Uint8Array; contentType: string; size: number };

export interface FileStore {
  put(bucket: Bucket, key: string, data: Uint8Array, contentType: string): Promise<void>;
  get(bucket: Bucket, key: string): Promise<StoredFile | null>;
  delete(bucket: Bucket, key: string): Promise<void>;
}

/** Keys are relative paths like "products/abc.webp". Anything that could escape is rejected. */
export const isSafeKey = (key: string) =>
  /^[a-z0-9][a-z0-9/_.-]{0,200}$/i.test(key) && !key.split("/").some((part) => part === ".." || part === "." || part === "");

export class MemoryFileStore implements FileStore {
  readonly files = new Map<string, StoredFile>();
  async put(bucket: Bucket, key: string, data: Uint8Array, contentType: string) {
    if (!isSafeKey(key)) throw new Error("Unsafe key");
    this.files.set(`${bucket}:${key}`, { data, contentType, size: data.byteLength });
  }
  async get(bucket: Bucket, key: string) {
    return this.files.get(`${bucket}:${key}`) ?? null;
  }
  async delete(bucket: Bucket, key: string) {
    this.files.delete(`${bucket}:${key}`);
  }
}

class LocalFileStore implements FileStore {
  constructor(private readonly dir: string) {}
  private resolve(bucket: Bucket, key: string) {
    if (!isSafeKey(key)) return null;
    const base = path.resolve(this.dir, bucket);
    const full = path.resolve(base, key);
    return full.startsWith(base + path.sep) ? full : null;
  }
  async put(bucket: Bucket, key: string, data: Uint8Array, contentType: string) {
    const full = this.resolve(bucket, key);
    if (!full) throw new Error("Unsafe key");
    await fs.mkdir(/*turbopackIgnore: true*/ path.dirname(full), { recursive: true });
    await fs.writeFile(/*turbopackIgnore: true*/ full, data, { mode: 0o600 });
    await fs.writeFile(/*turbopackIgnore: true*/ `${full}.meta`, JSON.stringify({ contentType }), { mode: 0o600 });
  }
  async get(bucket: Bucket, key: string) {
    const full = this.resolve(bucket, key);
    if (!full) return null;
    try {
      const data = new Uint8Array(await fs.readFile(/*turbopackIgnore: true*/ full));
      const meta = JSON.parse(await fs.readFile(/*turbopackIgnore: true*/ `${full}.meta`, "utf8")) as { contentType: string };
      return { data, contentType: meta.contentType, size: data.byteLength };
    } catch {
      return null;
    }
  }
  async delete(bucket: Bucket, key: string) {
    const full = this.resolve(bucket, key);
    if (!full) return;
    await fs.rm(/*turbopackIgnore: true*/ full, { force: true });
    await fs.rm(/*turbopackIgnore: true*/ `${full}.meta`, { force: true });
  }
}

class BlobFileStore implements FileStore {
  private stores = new Map<Bucket, ReturnType<typeof getStore>>();
  private store(bucket: Bucket) {
    let s = this.stores.get(bucket);
    if (!s) {
      s = getStore({ name: `scents-${bucket}`, consistency: "strong" });
      this.stores.set(bucket, s);
    }
    return s;
  }
  async put(bucket: Bucket, key: string, data: Uint8Array, contentType: string) {
    if (!isSafeKey(key)) throw new Error("Unsafe key");
    const buf = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
    await this.store(bucket).set(key, buf, { metadata: { contentType, size: data.byteLength } });
  }
  async get(bucket: Bucket, key: string) {
    if (!isSafeKey(key)) return null;
    const found = await this.store(bucket).getWithMetadata(key, { type: "arrayBuffer" });
    if (!found) return null;
    const meta = found.metadata as { contentType?: string };
    const data = new Uint8Array(found.data);
    return { data, contentType: meta.contentType ?? "application/octet-stream", size: data.byteLength };
  }
  async delete(bucket: Bucket, key: string) {
    if (!isSafeKey(key)) return;
    await this.store(bucket).delete(key);
  }
}

let instance: FileStore | undefined;

export const files = (): FileStore =>
  (instance ??= serverEnv.storage === "netlify-blobs" ? new BlobFileStore() : new LocalFileStore(path.join(serverEnv.dataDir, "files")));

/** Test hook. */
export const setFiles = (store: FileStore | undefined) => {
  instance = store;
};
