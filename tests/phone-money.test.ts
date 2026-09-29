import { describe, expect, it } from "vitest";
import { formatPhone, phoneKey, telHref, whatsappHref } from "@/lib/phone";
import { formatNaira, parseNaira } from "@/lib/money";
import { normaliseOrderNumber } from "@/lib/domain/orders";

describe("phone numbers", () => {
  it("reduces every common Nigerian format to one key", () => {
    for (const input of ["08089497031", "0808 949 7031", "8089497031", "2348089497031", "+234 808 949 7031", "+234-808-949-7031"]) {
      expect(phoneKey(input)).toBe("2348089497031");
    }
  });
  it("rejects things that aren't phone numbers", () => {
    for (const input of ["", "123", "0808949703", "080894970311", "hello", "06089497031"]) expect(phoneKey(input)).toBeNull();
  });
  it("accepts international numbers written with +", () => {
    expect(phoneKey("+44 7700 900123")).toBe("447700900123");
  });
  it("formats for display and links", () => {
    expect(formatPhone("2348089497031")).toBe("0808 949 7031");
    expect(telHref("08089497031")).toBe("tel:+2348089497031");
    expect(whatsappHref("08089497031")).toBe("https://wa.me/2348089497031");
  });
});

describe("money", () => {
  it("formats whole naira with grouping", () => {
    expect(formatNaira(2500)).toBe("₦2,500");
    expect(formatNaira(1000)).toBe("₦1,000");
    expect(formatNaira(1234567)).toBe("₦1,234,567");
    expect(formatNaira(0)).toBe("₦0");
  });
  it("parses what people type", () => {
    expect(parseNaira("₦2,500")).toBe(2500);
    expect(parseNaira(" 3000 ")).toBe(3000);
    expect(parseNaira("abc")).toBeNaN();
  });
});

describe("order numbers", () => {
  it("normalises what customers type", () => {
    expect(normaliseOrderNumber("sc-1024")).toBe("SC-1024");
    expect(normaliseOrderNumber("SC 1024")).toBe("SC-1024");
    expect(normaliseOrderNumber("1024")).toBe("SC-1024");
    expect(normaliseOrderNumber("SC-12a")).toBeNull();
  });
});
