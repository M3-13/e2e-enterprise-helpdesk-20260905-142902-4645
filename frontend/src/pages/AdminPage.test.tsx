// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { UserOut } from "../api/client";
import AdminPage from "./AdminPage";

afterEach(cleanup);

const { mockNavigate, mockUseAuth, mockUseFeedback, mockApi } = vi.hoisted(() => ({
  mockNavigate: vi.fn(),
  mockUseAuth: vi.fn(),
  mockUseFeedback: vi.fn(),
  mockApi: {
    listUsers: vi.fn(),
    createUser: vi.fn(),
    updateUser: vi.fn(),
    deleteUser: vi.fn(),
  },
}));

vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

vi.mock("../api/client", () => ({
  api: mockApi,
}));

vi.mock("../context/AuthContext", () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock("../components/Feedback", () => ({
  useFeedback: () => mockUseFeedback(),
}));

const adminUser = {
  id: 1,
  email: "admin@x.de",
  display_name: "Admin",
  role: "admin" as const,
  is_active: true,
};

function setupAuth(user: UserOut | null) {
  mockUseAuth.mockReturnValue({ user, loading: false });
}

beforeEach(() => {
  mockNavigate.mockReset();
  mockUseAuth.mockReset();
  mockUseFeedback.mockReset();
  mockApi.listUsers.mockReset();
  mockApi.createUser.mockReset();
  mockApi.updateUser.mockReset();
  mockApi.deleteUser.mockReset();

  mockUseFeedback.mockReturnValue({ showSuccess: vi.fn(), showError: vi.fn() });
  mockApi.listUsers.mockResolvedValue([]);
});

describe("AdminPage", () => {
  it("shows a loading state while auth is resolving", () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true });
    render(<AdminPage />);
    expect(screen.getByText("Laden…")).toBeTruthy();
  });

  it("redirects an unauthenticated visitor to /login", () => {
    setupAuth(null);
    render(<AdminPage />);
    expect(mockNavigate).toHaveBeenCalledWith("/login");
  });

  it("redirects a non-admin user away and shows no admin content", () => {
    setupAuth({ ...adminUser, role: "melder", email: "m@x.de" });
    render(<AdminPage />);
    expect(mockNavigate).toHaveBeenCalledWith("/tickets");
    expect(screen.getByText("Kein Zugriff")).toBeTruthy();
  });

  it("renders the user list for an admin", async () => {
    setupAuth(adminUser);
    mockApi.listUsers.mockResolvedValue([
      { id: 2, email: "a@x.de", display_name: "Alice", role: "agent", is_active: true },
    ]);
    render(<AdminPage />);
    await waitFor(() => expect(screen.getByText("a@x.de")).toBeTruthy());
  });

  it("creates a user with the chosen role and shows success feedback", async () => {
    const showSuccess = vi.fn();
    setupAuth(adminUser);
    mockUseFeedback.mockReturnValue({ showSuccess, showError: vi.fn() });
    mockApi.createUser.mockResolvedValue({ id: 2 });

    render(<AdminPage />);

    fireEvent.change(screen.getByLabelText("E-Mail"), { target: { value: "new@x.de" } });
    fireEvent.change(screen.getByLabelText("Anzeigename"), { target: { value: "Neu" } });
    fireEvent.change(screen.getByLabelText("Passwort"), { target: { value: "secret" } });
    fireEvent.change(screen.getByLabelText("Rolle"), { target: { value: "agent" } });
    fireEvent.click(screen.getByRole("button", { name: "Anlegen" }));

    await waitFor(() =>
      expect(mockApi.createUser).toHaveBeenCalledWith({
        email: "new@x.de",
        display_name: "Neu",
        password: "secret",
        role: "agent",
      }),
    );
    await waitFor(() => expect(showSuccess).toHaveBeenCalled());
  });

  it("shows an error message when the list request fails", async () => {
    setupAuth(adminUser);
    mockApi.listUsers.mockRejectedValue(new Error("kaputt"));
    render(<AdminPage />);
    await waitFor(() => expect(screen.getByText("kaputt")).toBeTruthy());
  });

  it("updates a role and reloads the list", async () => {
    const showSuccess = vi.fn();
    setupAuth(adminUser);
    mockUseFeedback.mockReturnValue({ showSuccess, showError: vi.fn() });
    mockApi.listUsers
      .mockResolvedValueOnce([
        { id: 2, email: "a@x.de", display_name: "Alice", role: "melder", is_active: true },
      ])
      .mockResolvedValue([
        { id: 2, email: "a@x.de", display_name: "Alice", role: "agent", is_active: true },
      ]);
    mockApi.updateUser.mockResolvedValue({});

    render(<AdminPage />);
    await waitFor(() => expect(screen.getByLabelText("Rolle von Alice")).toBeTruthy());

    fireEvent.change(screen.getByLabelText("Rolle von Alice"), { target: { value: "agent" } });

    await waitFor(() =>
      expect(mockApi.updateUser).toHaveBeenCalledWith(2, { role: "agent" }),
    );
    await waitFor(() => expect(showSuccess).toHaveBeenCalled());
  });
});
