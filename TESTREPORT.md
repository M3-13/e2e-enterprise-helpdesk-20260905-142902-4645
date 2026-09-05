VERDICT: BUGS_FOUND

- **Title:** Backend-Testlauf schlägt fehl — JWT_SECRET in test_tickets.py nicht konfiguriert
- **Symptom:** 18 Tests in `backend/tests/test_tickets.py` brechen beim Erzeugen eines JWT mit `RuntimeError` ab; der Pytest-Lauf ist rot. Die Anwendung selbst startet laut Backend-Smoke gesund, aber die Test-Suite als Teil des Produkts/CI ist nicht grün.
- **Repro:** Pytest-Gesamtlauf über das Backend ausführen, z. B. `pytest backend/tests/test_tickets.py`. Jeder Test, der `create_access_token` aufruft (Ticket erstellen, Suche, Filter, Sortierung, Pagination, Überfällig-Kennzeichnung usw.), schlägt fehl.
- **Evidence:**
  - `RuntimeError: JWT_SECRET is not configured. Set it via RUN.json (class 'generate') or the environment before issuing tokens.`
  - `FAILED tests/test_tickets.py::test_create_ticket_returns_201_open_with_due_at - RuntimeError: JWT_SECRET is not configured. Set it via RUN.json (class 'generate') or the environment before issuing tokens.`
  - `FAILED tests/test_tickets.py::test_invalid_category_422 - RuntimeError: JWT_SECRET is not configured…`
  - `================== 18 failed, 73 passed, 1 warning in 13.36s ==================`
- **Suspected file(s):** `backend/tests/conftest.py` setzt `JWT_SECRET` per `os.environ.setdefault(…)`; greift aber nicht, wenn die Umgebungsvariable bereits als leerer String vorhanden ist. `backend/tests/test_tickets.py` verlässt sich auf dieses Setup, ohne selbst ein Secret zu setzen oder `_secret` zu patchen, und ruft direkt `create_access_token` auf.
- **Severity:** high

Hinweis: Der Fehler beim Playwright-Browser-Download sowie der daraus folgende Smoke-/E2E-Abbruch ist ein Umgebungs-/Netzwerkproblem des Testrunners (Browser-Download-Timeout, fehlendes Browser-Executable) und wird nicht als Produktfehler gewertet.