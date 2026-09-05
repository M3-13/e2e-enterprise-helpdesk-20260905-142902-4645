import { describe, expect, it } from "vitest";
import { formatDateTime } from "./format";

describe("formatDateTime", () => {
  it("returns the raw value for an invalid date", () => {
    expect(formatDateTime("not-a-date")).toBe("not-a-date");
    expect(formatDateTime("")).toBe("");
  });

  it("formats a valid ISO date into a human-readable string", () => {
    const result = formatDateTime("2026-09-05T12:00:00Z");
    expect(typeof result).toBe("string");
    expect(result).not.toBe("");
    expect(result).not.toBe("2026-09-05T12:00:00Z");
  });
});
