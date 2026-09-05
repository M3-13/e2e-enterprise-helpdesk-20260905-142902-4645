import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type FeedbackKind = "success" | "error";

export interface FeedbackMessage {
  id: number;
  kind: FeedbackKind;
  text: string;
}

interface FeedbackContextValue {
  showSuccess: (text: string) => void;
  showError: (text: string) => void;
}

const FeedbackContext = createContext<FeedbackContextValue | undefined>(undefined);

let nextId = 1;

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<FeedbackMessage[]>([]);

  const dismiss = useCallback((id: number) => {
    setMessages((prev) => prev.filter((m) => m.id !== id));
  }, []);

  const push = useCallback(
    (kind: FeedbackKind, text: string) => {
      const id = nextId++;
      setMessages((prev) => [...prev, { id, kind, text }]);
      window.setTimeout(() => dismiss(id), 5000);
    },
    [dismiss],
  );

  const showSuccess = useCallback((text: string) => push("success", text), [push]);
  const showError = useCallback((text: string) => push("error", text), [push]);

  const value = useMemo(() => ({ showSuccess, showError }), [showSuccess, showError]);

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <div className="toast-container" role="status" aria-live="polite">
        {messages.map((m) => (
          <div key={m.id} className={`toast toast--${m.kind}`}>
            <span className="toast__icon" aria-hidden="true">
              {m.kind === "success" ? "\u2713" : "\u2715"}
            </span>
            <span className="toast__text">{m.text}</span>
            <button
              type="button"
              className="toast__close"
              aria-label="Schließen"
              onClick={() => dismiss(m.id)}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </FeedbackContext.Provider>
  );
}

export function useFeedback(): FeedbackContextValue {
  const ctx = useContext(FeedbackContext);
  if (!ctx) {
    throw new Error("useFeedback must be used within a FeedbackProvider");
  }
  return ctx;
}
