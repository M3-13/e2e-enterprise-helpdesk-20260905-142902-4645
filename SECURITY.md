VERDICT: CHANGES_REQUESTED

## Sicherheitsbericht

### Zusammenfassung
Das Produkt ist insgesamt solide aufgebaut: JWT-Auth, bcrypt mit 12 Runden, Rollenprüfung über Dependencies, Pydantic-Validierung und CORS ohne Wildcard sind vorhanden. Es wurden keine kritischen oder hohen Schwachstellen gefunden. Zwei mittlere Befunde erfordern Nacharbeit: eine fehlende Rollenprüfung beim Schließen von Tickets und eine CSV-Formel-Injektion im Export. Zusätzlich gibt es einen niedrigschwelligen Härtungshinweis zum In-Memory-Rate-Limiter.

### Befunde

#### 1. Fehlende Rollenprüfung beim Schließen von Tickets (Mittel)
**Betroffene Stelle:** `backend/app/api/routers/ticket_detail.py`, Funktion `close_ticket`

**Beschreibung:**  
`close_ticket` verwendet die Dependency `CurrentUser`, prüft also nur, ob der Benutzer eingeloggt ist und greift über `_ensure_own_or_staff` nur auf eigene Tickets zu. Ein Melder kann dadurch jedes **eigene** Ticket schließen – auch wenn es den Status `in_progress` oder `resolved` hat. Das Frontend verhindert dies bewusst (`canCloseTicket("melder", "open")` liefert `false`), aber die API setzt keine entsprechende Rollenbeschränkung durch. Damit ist der Rollenschutz serverseitig unvollständig und umgehbar.

**Risiko:**  
Ein Melder kann den Ticket-Lebenszyklus entgegen dem vorgesehenen Rollenmodell manipulieren. Es handelt sich nicht um einen Fremdzugriff, aber um eine Autorisierungslücke.

**Konkrete Behebung:**  
`close_ticket` auf die vorhandene `AgentOrAdmin`-Dependency umstellen:

```python
@router.post("/{id}/close", response_model=TicketOut)
def close_ticket(id: int, db: Db, current_user: AgentOrAdmin) -> TicketOut:
    ...
```

Damit erhalten Melder automatisch `403`.

---

#### 2. CSV-Formel-Injektion im Export (Mittel)
**Betroffene Stelle:** `backend/app/api/routers/export.py`, Funktion `_csv_row`

**Beschreibung:**  
Der CSV-Export schreibt `ticket.title` und `ticket.assignee_name` unverändert in die Datei. Ein Angreifer mit Melder-Rolle kann als Ticket-Titel oder Anzeigename Werte setzen, die mit `=`, `+`, `-` oder `@` beginnen. Beim Öffnen der CSV in Microsoft Excel oder ähnlichen Tabellenkalkulationen werden solche Zellen als Formel interpretiert und ausgeführt (CSV-Injection).

**Risiko:**  
Ein präparierter Titel wie `=HYPERLINK("https://bösartig.example", "Klick")` oder `=cmd|' /C calc'!A0` kann beim Export durch einen Agent/Admin ausgeführt werden. Dadurch sind nachgelagerte Angriffe wie Phishing oder Kommandosimulation möglich.

**Konkrete Behebung:**  
Eine Sanierungsfunktion für alle aus Nutzereingaben stammenden CSV-Zellen ergänzen und auf `title` sowie `assignee_name` anwenden:

```python
def _sanitize_csv_cell(value: str) -> str:
    if value and value[0] in ("=", "+", "-", "@"):
        return "'" + value
    return value
```

In `_csv_row`:

```python
return [
    _sanitize_csv_cell(ticket.title),
    ticket.category.value,
    ticket.priority.value,
    ticket.status.value,
    _sanitize_csv_cell(ticket.assignee_name or ""),
    ticket.created_at.isoformat(),
    ticket.due_at.isoformat() if ticket.due_at else "",
    "Ja" if ticket.is_overdue else "Nein",
]
```

---

#### 3. Rate-Limiter nur im Prozessspeicher (Niedrig)
**Betroffene Stelle:** `backend/app/api/routers/auth.py`, Klasse `RateLimiter`

**Beschreibung:**  
Der Rate-Limiter arbeitet als In-Memory-Dictionary mit `threading.Lock`. Der Zustand geht bei einem Neustart verloren und wird bei mehreren Uvicorn-Workern/Instanzen nicht geteilt. Das kann AC-16 bei horizontaler Skalierung oder nach einem Neustart umgehen.

**Risiko:**  
Begrenzung von Brute-Force/Aufzählungsangriffen ist dann nicht zuverlässig pro Client/IP durchgesetzt.

**Konkrete Behebung:**  
Für eine mehrinstanzenfähige Lösung den Limiter auf Redis oder einen anderen geteilten Speicher umstellen; alternativ ist eine Begrenzung auf Reverse-Proxy-Ebene (z. B. nginx `limit_req`) empfehlenswert. Für die aktuelle Single-Instance-Entwicklung ist der Befund nur niedrig.

---

### Hinweis zu Scanner-Ergebnissen
`bandit` und `semgrep` wurden im Scanner-Lauf übersprungen (`[skipped]`) und `pip-audit`/`npm audit` sind nicht enthalten. Aus diesem Fehlen allein kann keine Schwachstelle abgeleitet werden; die Abhängigkeiten sollten jedoch in der CI weiterhin geprüft werden.

---

### Ergebnis der Prüfbereiche

| Bereich | Bewertung |
|---|---|
| Secrets / hartkodierte Zugangsdaten | Keine kritischen Funde |
| Injection & Eingaben | CSV-Injection (mittel) gefunden |
| AuthN/AuthZ | Fehlende Rollenprüfung beim Schließen (mittel) gefunden |
| Dependencies | Keine Scanner-Ergebnisse vorhanden, daher nicht bewertbar |
| Konfiguration & Transport | CORS, JWT-Lebensdauer, bcrypt-Runden unauffällig; Rate-Limiter-Härtung niedrig |