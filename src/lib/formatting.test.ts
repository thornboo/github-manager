import { describe, it, expect } from "vitest";
import { formatNumber } from "@/lib/formatting";

describe("formatNumber", () => {
  it("should keep numbers < 1000 as-is", () => {
    expect(formatNumber(0)).toBe("0");
    expect(formatNumber(999)).toBe("999");
  });

  it("should format thousands as k", () => {
    expect(formatNumber(1000)).toBe("1k");
    expect(formatNumber(1500)).toBe("1.5k");
    expect(formatNumber(10_000)).toBe("10k");
    expect(formatNumber(999_999)).toBe("1000k");
  });

  it("should format millions as M", () => {
    expect(formatNumber(1_000_000)).toBe("1M");
    expect(formatNumber(2_500_000)).toBe("2.5M");
  });
});
