import { useState, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ApiError } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { useFeedback } from "../components/Feedback";

const fieldStyle: React.CSSProperties = { width: "100%" };

export default function LoginPage() {
  const { login } = useAuth();
  const { showError, showSuccess } = useFeedback();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    try {
      await login({ email, password });
      showSuccess("Erfolgreich angemeldet.");
      navigate("/tickets");
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        showError("E-Mail oder Passwort ist falsch.");
      } else {
        showError(err instanceof Error ? err.message : "Anmeldung fehlgeschlagen.");
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section className="page">
      <div className="card" style={{ maxWidth: 480, margin: "0 auto" }}>
        <h1 className="page__title">Anmelden</h1>
        <form
          onSubmit={handleSubmit}
          style={{ display: "flex", flexDirection: "column", gap: "var(--space-3)" }}
        >
          <div>
            <label className="label" htmlFor="login-email">
              E-Mail
            </label>
            <input
              id="login-email"
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
            <label className="label" htmlFor="login-password">
              Passwort
            </label>
            <input
              id="login-password"
              className="input"
              type="password"
              required
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              style={fieldStyle}
            />
          </div>
          <button type="submit" className="btn btn--primary" disabled={submitting}>
            {submitting ? "Anmelden…" : "Anmelden"}
          </button>
          <p className="page__text">
            Noch kein Konto? <Link to="/register">Registrieren</Link>
          </p>
        </form>
      </div>
    </section>
  );
}
