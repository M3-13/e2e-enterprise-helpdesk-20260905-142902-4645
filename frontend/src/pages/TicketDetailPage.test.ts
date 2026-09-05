import { describe, expect, it } from "vitest";
import {
  STATUS_LABELS,
  canAssignTicket,
  canCloseTicket,
  canEditTicket,
  canReopenTicket,
  selectAssignableAgents,
} from "./TicketDetailPage";
import type { UserOut } from "../api/client";
import {
  CATEGORIES,
  CATEGORY_LABELS,
  PRIORITIES,
  PRIORITY_LABELS,
} from "../components/TicketForm";

function makeUser(overrides: Partial<UserOut> = {}): UserOut {
  return {
    id: 1,
    email: "a@b.c",
    display_name: "Agent",
    role: "agent",
    is_active: true,
    ...overrides,
  };
}

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

describe("selectAssignableAgents", () => {
  it("filtert auf aktive Agenten und Admins", () => {
    const users = [
      makeUser({ id: 1, role: "agent", is_active: true }),
      makeUser({ id: 2, role: "admin", is_active: true }),
      makeUser({ id: 3, role: "melder", is_active: true }),
      makeUser({ id: 4, role: "agent", is_active: false }),
    ];
    expect(selectAssignableAgents(users, null).map((u) => u.id)).toEqual([1, 2]);
  });

  it("fällt ohne Liste auf den aktuellen Agenten/Admin zurück", () => {
    expect(selectAssignableAgents(null, makeUser({ role: "agent" })).map((u) => u.id)).toEqual([1]);
    expect(selectAssignableAgents(null, makeUser({ role: "admin" })).map((u) => u.id)).toEqual([1]);
  });

  it("liefert leer für Melder oder ohne aktuellen Benutzer", () => {
    expect(selectAssignableAgents(null, makeUser({ role: "melder" }))).toEqual([]);
    expect(selectAssignableAgents(null, null)).toEqual([]);
  });
});
