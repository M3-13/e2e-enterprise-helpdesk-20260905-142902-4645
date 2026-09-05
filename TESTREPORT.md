VERDICT: BUGS_FOUND

**Titel:** Backend-Testsuite schlägt fehl – JWT_SECRET in `tests/test_tickets.py` nicht konfiguriert

**Symptom:**  
Die pytest-Testsuite bricht mit 18 Fehlern ab, alle in `backend/tests/test_tickets.py`. Jeder Versuch, ein Ticket zu erstellen, zu suchen, zu filtern oder zu paginieren, schlägt bereits bei der Erzeugung des Autorisierungs-Headers fehl, weil der JWT-Signaturschlüssel leer ist. Dadurch ist die CI-Pipeline rot und die Ticket-Funktionalität (AC-04 bis AC-09, AC-12) nicht durch automatisierte Tests abgesichert. Das Produkt selbst startet laut Backend-Smoke zwar korrekt, aber die Qualitätssicherung ist blockiert.

**Repro:**  
`pytest backend/tests/test_tickets.py` (oder `pytest` im Verzeichnis `backend`) ausführen. Die Fehler treten in 18 Tests auf, z. B. `test_create_ticket_returns_201_open_with_due_at`, `test_search_matches_title_and_description`, `test_pagination`.

**Evidence:**
```
E           RuntimeError: JWT_SECRET is not configured. Set it via RUN.json (class 'generate') or the environment before issuing tokens.
app\core\security.py:29: RuntimeError
```
Aus dem Stacktrace:
```
tests\test_tickets.py:73: in _auth
    return {"Authorization": f"Bearer {create_access_token(str(user_id))}"}
app\core\security.py:46: in create_access_token
    return jwt.encode(payload, _secret(), algorithm=ALGORITHM)
```

**Suspected file(s):**  
- `backend/tests/test_tickets.py` – hier fehlt ein eigener Mechanismus (z. B. `monkeypatch` auf `app.core.security._secret` oder direktes Setzen von `settings.jwt_secret`), wie ihn andere Testdateien (`test_dashboard.py`, `test_ticket_detail.py`, `test_export.py`, `test_users.py`) bereits verwenden.  
- `backend/tests/conftest.py` – das globale `os.environ["JWT_SECRET"] = ...` greift offenbar nicht rechtzeitig vor dem Import von `app.core.security` in diesem Testmodul, sodass `settings.jwt_secret` leer bleibt.

**Severity:** high

---

Hinweise zu den weiteren Abschnitten des Berichts:

- **`playwright install chromium` (exit 1)** und der darauf folgende **`playwright smoke` (exit 1)** sind auf einen Browser-Download-Timeout zurückzuführen (`Executable doesn't exist …`). Das ist ein Fehler der Testumgebung, nicht des Produkts; der Frontend-Build selbst war erfolgreich.  
- **`behavioral E2E`** ist explizit mit `[skipped]` markiert; diese Überspringung ist kein Produktfehler.  
- **Backend-Smoke** aus `RUN.json` war erfolgreich – das Produkt startet und `/api/health` antwortet mit HTTP 200. Der gemeldete Bug betrifft ausschließlich die Testkonfiguration, nicht den laufenden Server.