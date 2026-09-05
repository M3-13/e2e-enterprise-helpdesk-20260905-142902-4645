import { NavLink, useNavigate } from "react-router-dom";
import { api, type Role } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useFeedback } from "./Feedback";

interface NavItem {
  to: string;
  label: string;
}

interface NavAction {
  label: string;
  onClick: () => void;
}

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

export default function Navbar() {
  const { user, logout } = useAuth();
  const { showError, showSuccess } = useFeedback();
  const navigate = useNavigate();

  const role: Role | null = user?.role ?? null;

  const items: NavItem[] = [
    { to: "/tickets", label: "Tickets" },
    { to: "/dashboard", label: "Dashboard" },
  ];

  const actions: NavAction[] = [];

  if (role === "agent" || role === "admin") {
    actions.push({ label: "Export", onClick: handleExport });
  }
  if (role === "admin") {
    items.push({ to: "/admin", label: "Admin" });
  }

  async function handleExport() {
    try {
      const csv = await api.exportTickets();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "tickets.csv";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showSuccess("Export heruntergeladen.");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Export fehlgeschlagen.");
    }
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  return (
    <header className="navbar">
      <NavLink to="/tickets" className="navbar__brand">
        Helpdesk
      </NavLink>
      <nav className="navbar__nav" aria-label="Hauptnavigation">
        {items.map((item) => (
          <NavLink
            key={item.to + item.label}
            to={item.to}
            className={({ isActive }) =>
              `navbar__link${isActive ? " navbar__link--active" : ""}`
            }
          >
            {item.label}
          </NavLink>
        ))}
        {actions.map((action) => (
          <button
            key={action.label}
            type="button"
            className="navbar__link navbar__link--button"
            onClick={action.onClick}
          >
            {action.label}
          </button>
        ))}
      </nav>
      <div className="navbar__right">
        {user ? (
          <>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `navbar__user${isActive ? " navbar__user--active" : ""}`
              }
            >
              <span className="navbar__avatar" aria-hidden="true">
                {initials(user.display_name)}
              </span>
              <span className="navbar__name">{user.display_name}</span>
            </NavLink>
            <button type="button" className="btn btn--ghost" onClick={handleLogout}>
              Abmelden
            </button>
          </>
        ) : (
          <NavLink to="/login" className="btn btn--primary">
            Anmelden
          </NavLink>
        )}
      </div>
    </header>
  );
}
