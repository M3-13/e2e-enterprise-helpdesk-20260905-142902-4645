// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { UserOut } from "../api/client";
import UserTable from "./UserTable";

afterEach(cleanup);

function makeProps(overrides: Partial<Parameters<typeof UserTable>[0]> = {}) {
  return {
    users: [] as UserOut[],
    currentUserId: null,
    onRoleChange: vi.fn(),
    onToggleActive: vi.fn(),
    onDelete: vi.fn(),
    ...overrides,
  };
}

describe("UserTable", () => {
  it("renders email, display name, role and status per row", () => {
    const users: UserOut[] = [
      { id: 1, email: "a@x.de", display_name: "Alice", role: "agent", is_active: true },
      { id: 2, email: "b@x.de", display_name: "Bob", role: "melder", is_active: false },
    ];
    render(<UserTable {...makeProps({ users, currentUserId: 99 })} />);

    expect(screen.getByText("a@x.de")).toBeTruthy();
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("b@x.de")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
    expect(screen.getByText("Aktiv")).toBeTruthy();
    expect(screen.getByText("Deaktiviert")).toBeTruthy();
    expect((screen.getByLabelText("Rolle von Alice") as HTMLSelectElement).value).toBe("agent");
    expect((screen.getByLabelText("Rolle von Bob") as HTMLSelectElement).value).toBe("melder");
  });

  it("shows an empty state when there are no users", () => {
    render(<UserTable {...makeProps()} />);
    expect(screen.getByText("Keine Benutzer vorhanden.")).toBeTruthy();
  });

  it("calls onRoleChange with the new role when the select changes", () => {
    const onRoleChange = vi.fn();
    const users: UserOut[] = [
      { id: 2, email: "b@x.de", display_name: "Bob", role: "melder", is_active: true },
    ];
    render(<UserTable {...makeProps({ users, currentUserId: 1, onRoleChange })} />);

    fireEvent.change(screen.getByLabelText("Rolle von Bob"), { target: { value: "admin" } });
    expect(onRoleChange).toHaveBeenCalledWith(2, "admin");
  });

  it("calls onToggleActive with the toggled state", () => {
    const onToggleActive = vi.fn();
    const users: UserOut[] = [
      { id: 2, email: "b@x.de", display_name: "Bob", role: "melder", is_active: false },
    ];
    render(<UserTable {...makeProps({ users, currentUserId: 1, onToggleActive })} />);

    fireEvent.click(screen.getByRole("button", { name: "Aktivieren" }));
    expect(onToggleActive).toHaveBeenCalledWith(2, true);
  });

  it("requires confirmation before deleting a user", () => {
    const onDelete = vi.fn();
    const users: UserOut[] = [
      { id: 2, email: "b@x.de", display_name: "Bob", role: "melder", is_active: true },
    ];
    render(<UserTable {...makeProps({ users, currentUserId: 1, onDelete })} />);

    fireEvent.click(screen.getByRole("button", { name: "Löschen" }));
    expect(onDelete).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Ja" }));
    expect(onDelete).toHaveBeenCalledWith(2);
  });

  it("cancels deletion without calling onDelete", () => {
    const onDelete = vi.fn();
    const users: UserOut[] = [
      { id: 2, email: "b@x.de", display_name: "Bob", role: "melder", is_active: true },
    ];
    render(<UserTable {...makeProps({ users, currentUserId: 1, onDelete })} />);

    fireEvent.click(screen.getByRole("button", { name: "Löschen" }));
    fireEvent.click(screen.getByRole("button", { name: "Nein" }));
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("disables self-modification for the current admin", () => {
    const users: UserOut[] = [
      { id: 1, email: "a@x.de", display_name: "Admin", role: "admin", is_active: true },
    ];
    render(<UserTable {...makeProps({ users, currentUserId: 1 })} />);

    expect((screen.getByLabelText("Rolle von Admin") as HTMLSelectElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Deaktivieren" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Löschen" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
