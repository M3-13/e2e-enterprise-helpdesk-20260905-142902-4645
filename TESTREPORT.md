VERDICT: BUGS_FOUND

**Gefundener Fehler**

- **Titel** Backend-Testsuite schlägt fehl: 18 Tests in `backend/tests/test_tickets.py` wegen nicht gesetztem `JWT_SECRET`
- **Symptom** Beim Ausführen von `pytest` im Backend-Verzeichnis schlagen 18 Tests fehl, die Zugriffstokens erstellen wollen. Die Tests scheitern mit dem Fehler `RuntimeError: JWT_SECRET is not configured. Set it via RUN.json (class 'generate') or the environment before issuing tokens.` Dadurch werden Ticket-Erstellung, Suche, Filter, Sortierung, Pagination und Überfälligkeitsmarkierung nicht getestet.
- **Repro** `pytest` (oder `pytest backend/tests/test_tickets.py`) im Projekt ausführen.
- **Evidence**
  ```
  E           RuntimeError: JWT_SECRET is not configured. Set it via RUN.json (class 'generate') or the environment before issuing tokens.
  app\core\security.py:29: RuntimeError
  ```
  sowie
  ```
  FAILED tests/test_tickets.py::test_create_ticket_returns_201_open_with_due_at - RuntimeError: JWT_SECRET is not configured...
  ...
  ================== 18 failed, 73 passed, 1 warning in 13.20s ==================
  ```
- **Suspected file(s)** `backend/tests/test_auth.py` (das `_jwt_secret`-Fixture speichert den ursprünglich leeren Wert und setzt ihn nach jedem Test zurück, wodurch das in `backend/tests/test_tickets.py` global gesetzte `settings.jwt_secret` überschrieben wird) sowie `backend/tests/test_tickets.py` (modulebene Zuweisung nicht robust). Der gemeinsame Fehlerpunkt ist `backend/app/core/security.py::_secret`, das bei leerem `settings.jwt_secret` eine Exception wirft.
- **Severity** high

**Hinweis** Der Browser-Smoke-Teil (Playwright) konnte wegen eines Download-Timeouts der Browser-Binärdatei nicht ausgeführt werden. Dies ist ein Umgebungsproblem des Test-Runners, kein Produktfehler.