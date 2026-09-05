import { describe, expect, it } from "vitest";
import {
  STATUS_LABELS,
  canAssignTicket,
  canCloseTicket,
  canEditTicket,
  canReopenTicket,
} from "./TicketDetailPage";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
} from "../components/TicketForm";

describe("Ticket-Detail Berechtigungen", () => {
  it("Agent und Admin dürfen bearbeiten", () => {
    expect(canEditTicket("agent", "closed")).toBe(true);
    expect(canEditTicket("admin", "closed")).toBe(true);
  });

  it("Melder darf nur offene Tickets bearbeiten", () => {
    expect(canEditTicket("melder", "open")).toBe(true);
    expect(canEditTicket("melder", "closed")).toBe(false);
    expect(canEditTicket("melder", "in_progress")).toBe(false);
  });

  it("ohne Rolle kein Bearbeiten", () => {
    expect(canEditTicket(null, "open")).toBe(false);
  });

  it("Schließen nur für Agent/Admin bei offenem Ticket", () => {
    expect(canCloseTicket("agent", "open")).toBe(true);
    expect(canCloseTicket("agent", "in_progress")).toBe(true);
    expect(canCloseTicket("agent", "closed")).toBe(false);
    expect(canCloseTicket("melder", "open")).toBe(false);
  });

  it("Wiederöffnen nur für Agent/Admin bei geschlossenem Ticket", () => {
    expect(canReopenTicket("admin", "closed")).toBe(true);
    expect(canReopenTicket("admin", "resolved")).toBe(true);
    expect(canReopenTicket("admin", "open")).toBe(false);
    expect(canReopenTicket("melder", "closed")).toBe(false);
  });

  it("Zuweisen nur für Agent/Admin", () => {
    expect(canAssignTicket("agent")).toBe(true);
    expect(canAssignTicket("admin")).toBe(true);
    expect(canAssignTicket("melder")).toBe(false);
    expect(canAssignTicket(null)).toBe(false);
  });

  it("liefert für jeden Status und jede Kategorie/Priorität ein Label", () => {
    expect(Object.keys(STATUS_LABELS).sort()).toEqual([
      "closed",
      "in_progress",
      "open",
      "resolved",
    ]);
    for (const c of CATEGORIES) {
      expect(CATEGORY_LABELS[c]).toBeTruthy();
    }
    for (const p of PRIORITIES) {
      expect(PRIORITY_LABELS[p]).toBeTruthy();
    }
  });
});
