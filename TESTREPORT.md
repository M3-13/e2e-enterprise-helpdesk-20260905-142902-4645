VERDICT: BUGS_FOUND

**Bug-Liste**

- **Titel:** Backend-Testsuite schlägt fehl: JWT_SECRET in `test_tickets.py` nicht gesetzt  
- **Symptom:** 18 von 91 Backend-Tests brechen beim Erzeugen eines Access-Tokens mit `RuntimeError: JWT_SECRET is not configured` ab. Die komplette Python-Testsuite ist dadurch rot (pytest exit 1), obwohl das Backend selbst startet und `/api/health` mit HTTP 200 antwortet.  
- **Repro:** `pytest` im Verzeichnis `backend/` ausführen. Jeder Test in `backend/tests/test_tickets.py`, der `_auth(user.id)` aufruft, wirft den Fehler.  
- **Evidence:**  
  ```
  FAILED tests/test_tickets.py::test_create_ticket_returns_201_open_with_due_at - RuntimeError: JWT_SECRET is not configured. Set it via RUN.json (class 'generate') or the environment before issuing tokens.
  FAILED tests/test_tickets.py::test_create_ticket_sets_creator - RuntimeError: JWT_SECRET is not configured. Set it via RUN.json (class 'generate') or the environment before issuing tokens.
  ...
  ================== 18 failed, 73 passed, 1 warning in 13.32s ==================
  ```
- **Suspected file(s):** `backend/tests/test_tickets.py` — die dortigen Fixtures erstellen zwar eine eigene Test-Datenbank, setzen aber im Gegensatz zu `backend/tests/conftest.py` oder anderen Testmodulen kein Test-JWT-Secret. Dadurch ruft `create_access_token()` die produktive `_secret()`-Logik auf und scheitert an der leeren `settings.jwt_secret`.  
- **Severity:** high

Hinweis zur Einordnung: Der gescheiterte Browser-Smoke (`playwright install chromium` Download-Timeout, `Executable doesn't exist`) sowie das daraus resultierende `[skipped] behavioral E2E` sind Umgebungs-/Harness-Probleme (fehlender Browser-Download) und werden daher nicht als Produktfehler gewertet. Der Backend-Prozess selbst startet aus `RUN.json` erfolgreich und beantwortet `/api/health` mit 200. Der einzige beobachtete Produkt-/Repository-Mangel ist die rot schaltende Backend-Testsuite.