VERDICT: BUGS_FOUND

**Testergebnis:** Die Python-Testsuite läuft rot (`exit 1`): 90 Tests bestanden, 1 Test fehlgeschlagen. Backend-Smoke und Frontend-Build sind erfolgreich. Der Browser-Smoke konnte wegen eines Download-Timeouts des Playwright-Browsers nicht ausgeführt werden – das ist ein Umgebungsproblem, kein Produktfehler.

---

### Bug-Liste

- **Titel:** Security-Test `test_create_access_token_requires_a_secret` schlägt fehl – erwarteter `RuntimeError` wird nicht ausgelöst
- **Symptom:** Die Test-Suite bricht mit `exit 1` ab. Der Test soll sicherstellen, dass `create_access_token` bei leerem JWT-Secret einen `RuntimeError` wirft (Absicherung von AC-18: kein Token ohne konfigurierten Signaturschlüssel). Tatsächlich wird keine Exception ausgelöst, weil das autouse Fixture `jwt_secret` in `backend/tests/conftest.py` die Funktion `app.core.security._secret` global durch einen Lambda ersetzt, der immer einen Test-Secret zurückgibt. Dadurch wird der eigentliche Sicherheitspfad nie geprüft und der Test schlägt fehl.
- **Repro:** `pytest backend/tests/test_security.py::test_create_access_token_requires_a_secret` (oder gesamte Suite). Der Test setzt `settings.jwt_secret = ""` und erwartet `pytest.raises(RuntimeError)`, bekommt aber keinen Fehler.
- **Evidence:**
  ```
  tests/test_security.py::test_create_access_token_requires_a_secret FAILED [ 48%]
  ...
  E       Failed: DID NOT RAISE RuntimeError
  tests\test_security.py:119: Failed
  ================== 1 failed, 90 passed, 1 warning in 13.68s ===================
  ```
- **Suspected files:** `backend/tests/conftest.py` (autouse Fixture `jwt_secret` überschreibt `app.core.security._secret`) und `backend/tests/test_security.py` (Test isoliert nicht gegen diesen Patch).
- **Severity:** medium

---

*Hinweis:* Der fehlgeschlagene Browser-Download (`playwright install chromium`, Timeout) und der daraus resultierende Smoke-Abbruch sind reine Umgebungsprobleme (fehlende Host-Werkzeuge/Netzwerk-Timeouts) und werden nicht als Produktfehler gewertet. Der Abschnitt `behavioral E2E` ist als `[skipped]` markiert und liefert daher keine Produktbewertung.