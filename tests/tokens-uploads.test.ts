import { describe, expect, it } from "vitest";
import { passwordVersion, readAdminSession, signToken, verifyToken } from "@/lib/auth/token";
import { checkProductImage, checkReceiptFile, detectFileType, MAX_UPLOAD_BYTES } from "@/lib/uploads";
import { PDF, PNG } from "./helpers";

const secret = "test-secret-test-secret-test-secret-123";

describe("signed tokens", () => {
  it("round-trips and rejects tampering", async () => {
    const token = await signToken({ ids: ["a"] }, secret);
    expect(await verifyToken(token, secret)).toEqual({ ids: ["a"] });
    const [body, sig] = token.split(".");
    const forged = `${Buffer.from(JSON.stringify({ ids: ["b"] })).toString("base64url")}.${sig}`;
    expect(await verifyToken(forged, secret)).toBeNull();
    expect(await verifyToken(`${body}.${sig}`, "another-secret-another-secret-12345")).toBeNull();
    expect(await verifyToken("garbage", secret)).toBeNull();
  });

  it("expires admin sessions and ends them when the password changes", async () => {
    const pv = await passwordVersion("correct horse battery");
    const token = await signToken({ name: "Ilham", exp: Date.now() + 60_000, pv }, secret);
    expect(await readAdminSession(token, secret, "correct horse battery")).toMatchObject({ name: "Ilham" });
    expect(await readAdminSession(token, secret, "a brand new password")).toBeNull();
    expect(await readAdminSession(token, secret, "correct horse battery", Date.now() + 120_000)).toBeNull();
    expect(await readAdminSession(token, secret, undefined)).toBeNull();
  });
});

describe("upload checks", () => {
  it("identifies files by content, not name", () => {
    expect(detectFileType(PNG)?.mime).toBe("image/png");
    expect(detectFileType(PDF)?.mime).toBe("application/pdf");
    expect(detectFileType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0]))?.mime).toBe("image/jpeg");
    expect(detectFileType(new TextEncoder().encode("<html>"))).toBeNull();
  });
  it("accepts receipts as images or PDF, photos as images only", () => {
    expect(checkReceiptFile(PDF).ok).toBe(true);
    expect(checkReceiptFile(PNG).ok).toBe(true);
    expect(checkProductImage(PDF).ok).toBe(false);
    expect(checkReceiptFile(new Uint8Array()).ok).toBe(false);
    const big = new Uint8Array(MAX_UPLOAD_BYTES + 1);
    big.set(PNG);
    expect(checkReceiptFile(big).ok).toBe(false);
  });
});
