import { describe, expect, it } from "vitest";
import {
  DEFAULT_FILTERS,
  DEFAULT_SORT,
  buildQueryFilters,
  type TicketListFilters,
} from "./useTickets";

describe("buildQueryFilters", () => {
  it("omits empty optional filters", () => {
    const result = buildQueryFilters(DEFAULT_FILTERS, DEFAULT_SORT, 1, 10);
    expect(result.search).toBeUndefined();
    expect(result.status).toBeUndefined();
    expect(result.priority).toBeUndefined();
    expect(result.assignee).toBeUndefined();
  });

  it("always carries sort, order, page and page_size", () => {
    const result = buildQueryFilters(DEFAULT_FILTERS, DEFAULT_SORT, 2, 20);
    expect(result.sort).toBe("created_at");
    expect(result.order).toBe("desc");
    expect(result.page).toBe(2);
    expect(result.page_size).toBe(20);
  });

  it("trims whitespace from free-text fields", () => {
    const filters: TicketListFilters = {
      search: "  drucker  ",
      status: "",
      priority: "",
      assignee: "  Max  ",
    };
    const result = buildQueryFilters(filters, DEFAULT_SORT, 1, 10);
    expect(result.search).toBe("drucker");
    expect(result.assignee).toBe("Max");
  });

  it("passes through enum filters", () => {
    const filters: TicketListFilters = {
      search: "",
      status: "open",
      priority: "critical",
      assignee: "",
    };
    const result = buildQueryFilters(filters, DEFAULT_SORT, 1, 10);
    expect(result.status).toBe("open");
    expect(result.priority).toBe("critical");
  });

  it("treats whitespace-only free-text as empty", () => {
    const filters: TicketListFilters = {
      search: "   ",
      status: "",
      priority: "",
      assignee: " ",
    };
    const result = buildQueryFilters(filters, DEFAULT_SORT, 1, 10);
    expect(result.search).toBeUndefined();
    expect(result.assignee).toBeUndefined();
  });
});
