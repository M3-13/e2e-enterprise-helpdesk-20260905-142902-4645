import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, type Role, type UserOut } from "../api/client";
import { useFeedback } from "../components/Feedback";
import { useAuth } from "../context/AuthContext";
import UserTable from "../components/UserTable";
import { ROLES, ROLE_LABELS } from "../roles";
import "../styles/admin.css";

export default function AdminPage() {
  const { user, loading } = useAuth();
  const { showSuccess, showError } = useFeedback();
  const navigate = useNavigate();

  const [users, setUsers] = useState<UserOut[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("melder");
  const [submitting, setSubmitting] = useState(false);

  const isAdmin = user?.role === "admin";

  const loadUsers = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      setUsers(await api.listUsers());
    } catch (err) {
      setLoadError(
        err instanceof Error ? err.message : "Benutzerliste konnte nicht geladen werden.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAdmin) {
      void loadUsers();
    }
  }, [isAdmin, loadUsers]);

  useEffect(() => {
    if (loading) return;
    if (!user) {
      navigate("/login");
    } else if (user.role !== "admin") {
      navigate("/tickets");
    }
  }, [loading, user, navigate]);

  const handleCreate = async (e: FormEvent) => {
    e.preventDefault();
    if (!email || !displayName || !password) {
      showError("Bitte alle Felder ausfüllen.");
      return;
    }
    setSubmitting(true);
    try {
      await api.createUser({ email, display_name: displayName, password, role });
      showSuccess("Benutzer angelegt.");
      setEmail("");
      setDisplayName("");
      setPassword("");
      setRole("melder");
      await loadUsers();
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Benutzer konnte nicht angelegt werden.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleRoleChange = async (id: number, newRole: Role) => {
    try {
      await api.updateUser(id, { role: newRole });
      showSuccess("Rolle geändert.");
      await loadUsers();
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Rolle konnte nicht geändert werden.",
      );
    }
  };

  const handleToggleActive = async (id: number, isActive: boolean) => {
    try {
      await api.updateUser(id, { is_active: isActive });
      showSuccess(isActive ? "Benutzer aktiviert." : "Benutzer deaktiviert.");
      await loadUsers();
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Status konnte nicht geändert werden.",
      );
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await api.deleteUser(id);
      showSuccess("Benutzer gelöscht.");
      await loadUsers();
    } catch (err) {
      showError(
        err instanceof Error ? err.message : "Benutzer konnte nicht gelöscht werden.",
      );
    }
  };

  if (loading) {
    return (
      <section className="page">
        <p className="page__text">Laden…</p>
      </section>
    );
  }

  if (!user) {
    return null;
  }

  if (!isAdmin) {
    return (
      <section className="page">
        <h1 className="page__title">Kein Zugriff</h1>
        <p className="page__text">
          Diese Seite ist nur für Administratoren zugänglich.
        </p>
      </section>
    );
  }

  return (
    <section className="page">
      <h1 className="page__title">Benutzerverwaltung</h1>

      <div className="card admin-create">
        <h2 className="admin-create__title">Neuen Benutzer anlegen</h2>
        <form className="admin-create__form" onSubmit={handleCreate}>
          <div className="form-field">
            <label className="label" htmlFor="admin-email">
              E-Mail
            </label>
            <input
              id="admin-email"
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label className="label" htmlFor="admin-name">
              Anzeigename
            </label>
            <input
              id="admin-name"
              className="input"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label className="label" htmlFor="admin-password">
              Passwort
            </label>
            <input
              id="admin-password"
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <div className="form-field">
            <label className="label" htmlFor="admin-role">
              Rolle
            </label>
            <select
              id="admin-role"
              className="select"
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r]}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? "Wird angelegt…" : "Anlegen"}
          </button>
        </form>
      </div>

      <h2 className="admin-section-title">Benutzer</h2>
      {isLoading && users.length === 0 ? (
        <p className="page__text">Laden…</p>
      ) : loadError ? (
        <p className="page__text">{loadError}</p>
      ) : (
        <UserTable
          users={users}
          currentUserId={user.id}
          onRoleChange={handleRoleChange}
          onToggleActive={handleToggleActive}
          onDelete={handleDelete}
        />
      )}
    </section>
  );
}
