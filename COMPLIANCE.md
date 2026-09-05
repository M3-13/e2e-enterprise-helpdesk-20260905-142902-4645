VERDICT: CHANGES_REQUESTED

## 1. DSGVO

### 1.1 Fehlende Datenschutzerklärung, Rechtsgrundlage und Nutzungshinweise
**Schweregrad:** hoch  
**Befund:** Die Webanwendung verarbeitet personenbezogene Daten (E-Mail, Anzeigename, Passwort-Hash, Rollen, Ticket-/Kommentarinhalte, Audit-Einträge, IP-Adressen im Rate-Limiter), ohne dass die nach Art. 13/14 DSGVO erforderlichen Informationen bereitgestellt werden. Eine Rechtsgrundlage ist nicht dokumentiert; bei einem unternehmensinternen Helpdesk käme Art. 6 Abs. 1 lit. b DSGVO (Durchführung des Arbeitsverhältnisses) oder lit. f (berechtigtes Interesse) in Betracht, wird aber nirgends benannt.  
**Abhilfe:**
- Im Frontend eine Datenschutzseite anlegen, z. B. `frontend/src/pages/PrivacyPage.tsx`, und in `frontend/src/router.tsx` als Route `/privacy` ergänzen.
- In `frontend/src/components/Layout.tsx` einen Footer mit den Links „Datenschutz“ und „Impressum“ ergänzen; die Seiten müssen aus jeder Ansicht erreichbar sein.
- In `frontend/src/pages/RegisterPage.tsx` einen sichtbaren Hinweis auf die Datenschutzerklärung ergänzen, z. B. „Mit der Registrierung akzeptieren Sie die Datenschutzerklärung“ mit Link. Eine Checkbox ist zulässig, aber keine Einwilligung erforderlich; die Information nach Art. 13 DSGVO reicht.
- Rechtsgrundlage, Verantwortlicher, Zwecke, Kategorien, Empfänger, Speicherdauer und Betroffenenrechte in dieser Datenschutzerklärung aufführen.

### 1.2 Betroffenenrechte unvollständig umgesetzt
**Schweregrad:** hoch  
**Befund:** Selbstlöschung ist vorhanden, aber es gibt weder einen Endpunkt noch eine Oberfläche, um eigene Stammdaten (Anzeigename, E-Mail, Passwort) zu berichtigen (Art. 16 DSGVO), noch einen Export der eigenen personenbezogenen Daten (Art. 20 DSGVO – Recht auf Datenübertragbarkeit).  
**Abhilfe:**
- In `backend/app/api/routers/users.py` einen neuen Endpunkt `PATCH /api/users/me` ergänzen, der `email`, `display_name` und/oder `password` entgegennimmt und die Änderungen validiert und speichert. Beispielschema: `SelfUpdate` mit `email: EmailStr | None`, `display_name: str | None`, `password: str | None`.
- In `backend/app/api/routers/users.py` zusätzlich `GET /api/users/me/export` ergänzen, das die eigenen Benutzerdaten sowie die eigenen Tickets, Kommentare und Audit-Einträge als JSON liefert (Datenportabilität).
- In `frontend/src/pages/ProfilePage.tsx` ein Bearbeitungsformular und einen Export-Button ergänzen.

### 1.3 Keine Lösch- und Aufbewahrungsfristen
**Schweregrad:** mittel  
**Befund:** Tickets, Kommentare, Audit-Einträge und `RevokedToken`-Einträge werden unbegrenzt gespeichert. `RevokedToken` wächst mit jeder Abmeldung unbegrenzt an; es sind keine Löschfristen oder ein Aufbewahrungskonzept erkennbar (Art. 5 Abs. 1 lit. e DSGVO).  
**Abhilfe:**
- In `DESIGN.md` oder `README.md` einen Abschnitt „Aufbewahrung und Löschung“ ergänzen: z. B. Tickets 3 Jahre nach Abschluss löschen oder anonymisieren, Audit-Logs 3 Jahre, `RevokedToken`-Einträge 48 Stunden nach Ablauf entfernen.
- In `backend/app/core/security.py` bei `revoke_token` oder `is_revoked` abgelaufene `RevokedToken`-Einträge periodisch bereinigen, z. B. alle Einträge mit `revoked_at < utcnow() - timedelta(hours=48)` löschen.
- Eine Admin-/Wartungsfunktion für die Löschung alter abgeschlossener Tickets einplanen.

### 1.4 Ratenbegrenzung hinter Reverse-Proxy wirkungslos
**Schweregrad:** mittel  
**Befund:** `backend/app/api/routers/auth.py` ermittelt die Client-IP ausschließlich über `request.client.host`. Läuft die Anwendung hinter einem Reverse-Proxy (üblicher Produktivbetrieb), sieht das Backend nur die Proxy-IP (z. B. `127.0.0.1`). Damit wird die Ratenbegrenzung nach AC-16 faktisch ausgehebelt, und IP-Adressen werden ggf. fehlerhaft verarbeitet.  
**Abhilfe:**
- In `auth.py` eine sichere Auswertung von `X-Forwarded-For` implementieren, z. B. `request.headers.get("X-Forwarded-For", "").split(",")[0].strip()` – aber nur, wenn die Anwendung hinter einem vertrauenswürdigen Proxy läuft und `--proxy-headers` aktiviert ist; sonst bleibt `request.client.host`.
- In `backend/app/config.py` eine Einstellung `behind_proxy: bool` ergänzen und in `README.md` dokumentieren, wie der Proxy konfiguriert wird.
- Uvicorn/Gunicorn im Deployment mit `--proxy-headers` und `--forwarded-allow-ips` starten, niemals blind.

### 1.5 JWT im localStorage ohne schützende Security-Header
**Schweregrad:** mittel  
**Befund:** Der JWT wird in `localStorage` gespeichert (`frontend/src/api/client.ts`). Ohne Content Security Policy (CSP) und andere Header erhöht sich das Risiko, dass injizierte Skripte den Token auslesen können.  
**Abhilfe:**
- In `backend/app/main.py` eine Middleware für Security-Header ergänzen, z. B.:
  - `Content-Security-Policy: default-src 'self'; connect-src 'self' http://localhost:8000; style-src 'self' 'unsafe-inline'; script-src 'self'; img-src 'self' data:; font-src 'self'`
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: no-referrer`
- Wichtig: `style-src 'unsafe-inline'` ist wegen der in den React-Komponenten eingebetteten `<style>`-Blöcke erforderlich; sonst bricht die Darstellung. `connect-src` muss die konfigurierte Backend-URL enthalten, damit die API-Aufrufe weiterhin funktionieren.
- Optional und robuster: JWT in einem `HttpOnly`-Cookie ablegen; in diesem Fall muss zusätzlich CSRF-Schutz implementiert werden.

### 1.6 Unvollständige Eingabevalidierung und Datenminimierung
**Schweregrad:** niedrig  
**Befund:** `frontend/src/api/client.ts` sendet unbegrenzt lange Passwörter/Ticketbeschreibungen; im Backend ist `LoginRequest.password` ohne `max_length`, `TicketCreate.description` nur mit `min_length=1`. Dies ermöglicht unnötig große Datenmengen (DoS-/Datenminimierungsrisiko).  
**Abhilfe:**
- In `backend/app/schemas.py` ergänzen: `LoginRequest.password: str = Field(..., min_length=1, max_length=128)` und `TicketCreate.description: str = Field(..., min_length=1, max_length=10000)`.
- Gleiche Limits in den Frontend-Formularen als Validierung/UX-Hinweise verwenden.

## 2. EU Cyber Resilience Act (CRA)

### 2.1 Kein SBOM und kein reproduzierbares Abhängigkeitsmanagement
**Schweregrad:** hoch  
**Befund:** `backend/requirements.txt` und `frontend/package.json` sind nicht als gepinnte, geprüfte Abhängigkeiten sichtbar; es fehlt ein SBOM (Software Bill of Materials) und ein dokumentierter Prozess zur Schwachstellenprüfung.  
**Abhilfe:**
- `backend/requirements.txt` mit exakten Versionsnummern (`==`) versehen; `frontend/package.json` auf exakte Versionen ohne `^`/`~` umstellen.
- CI um `pip-audit`, `npm audit` und eine SBOM-Erzeugung (z. B. `syft`, `cyclonedx`) ergänzen.
- In `README.md` dokumentieren, wie das SBOM erzeugt wird und wie Updates eingespielt werden.

### 2.2 Fehlende dokumentierte Sicherheitseigenschaften und Update-/Patch-Fähigkeit
**Schweregrad:** mittel  
**Befund:** Es gibt keine sichtbare Datei (z. B. `SECURITY.md`), die Sicherheitseigenschaften, den Umgang mit Schwachstellen und den Patch-/Update-Prozess beschreibt.  
**Abhilfe:**
- `SECURITY.md` im Repository anlegen und in `README.md` verlinken.
- In `DESIGN.md` einen Abschnitt „Security Properties“ ergänzen: Authentifizierung (JWT, bcrypt), Autorisierung (Rollen), Auditierung, Datenhaltung, Update-Mechanismus.

### 2.3 CSV-Injection im Ticket-Export
**Schweregrad:** hoch  
**Befund:** `backend/app/api/routers/export.py` schreibt `ticket.title` unverändert in die CSV-Datei. Beginnt ein Titel mit `=`, `+`, `-` oder `@`, kann Tabellenkalkulationssoftware den Wert als Formel interpretieren. Da der Titel von Benutzern kontrolliert wird, ist dies ein Sicherheitsrisiko.  
**Abhilfe:**
- In `export.py` eine Funktion `_safe_csv(value: str) -> str` ergänzen, die bei Werten, die mit `=`, `+`, `-` oder `@` beginnen, ein einfaches Apostroph (`'`) voranstellt.
- Diese Funktion für alle benutzergesteuerten Felder (`title`, ggf. `assignee_name`) anwenden.

### 2.4 Fehlende TLS-/HSTS-Konfiguration
**Schweregrad:** mittel  
**Befund:** Im Code ist kein Hinweis auf TLS oder `Strict-Transport-Security` erkennbar. Im Produktivbetrieb muss die Übertragung personenbezogener Daten verschlüsselt sein.  
**Abhilfe:**
- Deployment hinter TLS-terminierendem Reverse-Proxy dokumentieren.
- In der Security-Header-Middleware aus Abschnitt 1.5 zusätzlich `Strict-Transport-Security: max-age=31536000; includeSubDomains` setzen, sobald die Anwendung ausschließlich über HTTPS erreichbar ist.

## 3. EU AI Act

**Befund:** Es sind keine KI-Funktionen oder KI-Modelle im Code sichtbar. Der EU AI Act ist daher nicht einschlägig. Es sind keine Maßnahmen erforderlich.

## 4. Pflichttexte & UI

### 4.1 Fehlendes Impressum und fehlende Nutzungsbedingungen
**Schweregrad:** hoch  
**Befund:** Es gibt keine Rechtsseiten (`Impressum`, `Datenschutz`, `Nutzungsbedingungen`). Auch wenn die Anwendung intern genutzt wird, ist in Deutschland je nach Einsatzszenario ein Impressum erforderlich; Datenschutzhinweise sind immer erforderlich.  
**Abhilfe:**
- Im Frontend die Seiten `privacy`, `legal` und ggf. `terms` ergänzen und im Footer/Layout verlinken.
- Falls die Anwendung ausschließlich unternehmensintern und ohne öffentlichen Zugang betrieben wird, sollte dies in der Dokumentation klar festgehalten werden; die Datenschutzhinweise bleiben trotzdem verpflichtend.

### 4.2 Kein Cookie-Consent-Banner erforderlich, aber Dokumentation
**Schweregrad:** niedrig  
**Befund:** Es werden keine Cookies gesetzt; der JWT wird in `localStorage` abgelegt. Ein Consent-Banner ist daher nicht nötig.  
**Abhilfe:**
- In der Datenschutzerklärung erwähnen, dass technisch notwendige Daten im `localStorage` gespeichert werden und keine Tracking-Cookies verwendet werden.

## 5. Barrierefreiheit (WCAG/BITV/EAA)

### 5.1 Fehlende sichtbare Fokusindikatoren
**Schweregrad:** mittel  
**Befund:** In `frontend/src/styles/global.css` sind Focus-Styles für Eingabefelder vorhanden, aber nicht für Buttons, Links und andere interaktive Elemente. Tastaturnutzer können den Fokus nicht zuverlässig erkennen.  
**Abhilfe:**
- In `global.css` ergänzen:
  ```css
  :focus-visible {
    outline: 2px solid var(--color-accent);
    outline-offset: 2px;
  }
  ```
- Sicherstellen, dass alle interaktiven Elemente diese Regel erben.

### 5.2 Fehlermeldungen nicht ausreichend als Alert gekennzeichnet
**Schweregrad:** niedrig  
**Befund:** Der Toast-Container in `frontend/src/components/Feedback.tsx` hat `role="status"` und `aria-live="polite"`, aber Fehler-Toasts werden nicht als `role="alert"` markiert. Für wichtige Fehler ist eine assertive Auszeichnung erforderlich.  
**Abhilfe:**
- In `Feedback.tsx` bei Fehlermeldungen zusätzlich `role="alert"` auf den Toast setzen oder den Container differenzieren.

### 5.3 Diagramm nicht ausreichend für Screenreader aufbereitet
**Schweregrad:** niedrig  
**Befund:** `frontend/src/components/PriorityChart.tsx` stellt die Prioritätsverteilung nur visuell als Balken dar. Screenreader erfahren nur isolierte Zahlen, aber keinen klaren Zusammenhang.  
**Abhilfe:**
- Eine unsichtbare Tabelle oder `aria-label` mit Textzusammenfassung ergänzen, z. B. „Prioritätsverteilung: Kritisch 4, Hoch 3, Mittel 2, Niedrig 1“.

## 6. Anmerkungen und Abstimmung der Maßnahmen

- Die vorgeschlagene CSP muss `style-src 'unsafe-inline'` enthalten, weil die React-Komponenten Inline-`<style>`-Blöcke verwenden. Ohne diese Ausnahme brechen Layout und Komponenten-Styles.
- Die Ratenbegrenzung darf nicht pauschal auf `X-Forwarded-For` umgestellt werden, wenn kein vertrauenswürdiger Proxy existiert; sonst können Clients die IP fälschen. Die Proxy-Konfiguration muss in der Deployment-Dokumentation beschrieben werden.
- Beim Einführen von Löschfristen dürfen laufende Ticketprozesse nicht beeinträchtigt werden. Die Fristen müssen konfigurierbar sein und dürfen offene bzw. noch benötigte Tickets nicht vorzeitig entfernen.
- Testdateien enthalten JWT-Test-Secrets (z. B. `backend/tests/test_export.py`). Sofern die Auslegung von AC-18 sehr strikt ist, sollten diese Test-Secrets aus Umgebungsvariablen bezogen und nicht als Literale eingecheckt werden (Schweregrad: niedrig).