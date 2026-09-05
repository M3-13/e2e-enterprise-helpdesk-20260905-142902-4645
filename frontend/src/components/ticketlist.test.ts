import { describe, expect, it } from "vitest";
import {
  CATEGORY_LABELS,
  formatDate,
  toggleSort,
} from "./TicketTable";
import { PRIORITY_LABELS, STATUS_LABELS } from "./TicketFilters";
import type { TicketSort } from "../hooks/useTickets";

describe("toggleSort", () => {
  const current: TicketSort = { sort: "title", order: "asc" };

  it("toggles order when the same column is clicked again", () => {
    expect(toggleSort(current, "title")).toEqual({ sort: "title", order: "desc" });
  });

  it("starts ascending when a new column is clicked", () => {
    expect(toggleSort(current, "priority")).toEqual({ sort: "priority", order: "asc" });
  });

  it("flips back to ascending after descending", () => {
    const desc: TicketSort = { sort: "status", order: "desc" };
    expect(toggleSort(desc, "status")).toEqual({ sort: "status", order: "asc" });
  });
});

describe("formatDate", () => {
  it("formats an ISO date to German locale", () => {
    const result = formatDate("2026-09-05T10:00:00Z");
    expect(result).toMatch(/^\d{2}\.\d{2}\.\d{4}$/);
  });

  it("returns the input unchanged when it is not a valid date", () => {
    expect(formatDate("not-a-date")).toBe("not-a-date");
  });
});

describe("label maps", () => {
  it("covers every status and priority with a German label", () => {
    expect(STATUS_LABELS.open).toBe("Offen");
    expect(STATUS_LABELS.closed).toBe("Geschlossen");
    expect(PRIORITY_LABELS.low).toBe("Niedrig");
    expect(PRIORITY_LABELS.critical).toBe("Kritisch");
    expect(CATEGORY_LABELS.hardware).toBe("Hardware");
    expect(CATEGORY_LABELS.other).toBe("Sonstiges");
  });
});
