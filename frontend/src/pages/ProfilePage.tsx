import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { api, type Role } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useFeedback } from "../components/Feedback";

const roleLabels: Record<Role, string> = {
  melder: "Melder",
  agent: "Agent",
  admin: "Administrator",
};

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const { showError, showSuccess } = useFeedback();
  const navigate = useNavigate();
  const [deleting, setDeleting] = useState(false);

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  async function handleLogout() {
    await logout();
    navigate("/login");
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      "Möchten Sie Ihr Konto wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.",
    );
    if (!confirmed) {
      return;
    }
    setDeleting(true);
    try {
      await api.deleteMe();
      showSuccess("Konto wurde gelöscht.");
      await logout();
      navigate("/login");
    } catch (err) {
      showError(err instanceof Error ? err.message : "Konto konnte nicht gelöscht werden.");
      setDeleting(false);
    }
  }

  return (
    <section className="page">
      <h1 className="page__title">Profil</h1>
      <div className="card" style={{ maxWidth: 640 }}>
        <dl style={{ display: "grid", gap: "var(--space-3)", margin: 0 }}>
          <div>
            <dt className="label" style={{ marginBottom: "var(--space-0)" }}>
              Anzeigename
            </dt>
            <dd style={{ margin: 0 }}>{user.display_name}</dd>
          </div>
          <div>
            <dt className="label" style={{ marginBottom: "var(--space-0)" }}>
              E-Mail
            </dt>
            <dd style={{ margin: 0 }}>{user.email}</dd>
          </div>
          <div>
            <dt className="label" style={{ marginBottom: "var(--space-0)" }}>
              Rolle
            </dt>
            <dd style={{ margin: 0 }}>{roleLabels[user.role] ?? user.role}</dd>
          </div>
        </dl>
        <div
          style={{
            display: "flex",
            gap: "var(--space-3)",
            marginTop: "var(--space-4)",
          }}
        >
          <button type="button" className="btn btn--secondary" onClick={handleLogout}>
            Abmelden
          </button>
          <button
            type="button"
            className="btn btn--danger"
            onClick={handleDelete}
            disabled={deleting}
          >
            {deleting ? "Wird gelöscht…" : "Konto löschen"}
          </button>
        </div>
      </div>
    </section>
  );
}
