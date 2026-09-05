import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useFeedback } from "../components/Feedback";

const fieldStyle: React.CSSProperties = { width: "100%" };

export default function RegisterPage() {
  const { register } = useAuth();
  const { showError, showSuccess } = useFeedback();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await register({ email, display_name: displayName, password });
      showSuccess("Konto erstellt. Bitte melden Sie sich an.");
      navigate("/login");
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        showError("Diese E-Mail-Adresse ist bereits registriert.");
      } else {
        showError(err instanceof Error ? err.message : "Registrierung fehlgeschlagen.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page">
      <div className="card" style={{ maxWidth: 480, margin: "0 auto" }}>
        <h1 className="page__title">Registrieren</h1>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
        >
          <div>
            <label className="label" htmlFor="register-email">
              E-Mail
            </label>
            <input
              id="register-email"
              className="input"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              style={fieldStyle}
            />
          </div>
          <div>
            <label className="label" htmlFor="register-name">
              Anzeigename
            </label>
            <input
              id="register-name"
              className="input"
              type="text"
              required
              autoComplete="name"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              style={fieldStyle}
            />
          </div>
          <div>
            <label className="label" htmlFor="register-password">
              Passwort
            </label>
            <input
              id="register-password"
              className="input"
              type="password"
              required
              autoComplete="new-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={fieldStyle}
            />
          </div>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? "Registrieren…" : "Registrieren"}
          </button>
          <p className="page__text">
            Bereits registriert? <Link to="/login">Anmelden</Link>
          </p>
        </form>
      </div>
    </section>
  );
}
