# Enterprise Helpdesk

Unternehmensinterne Helpdesk-Webanwendung mit Rollen- und Rechteverwaltung,
vollständigem Ticket-Lebenszyklus (anlegen, bearbeiten, zuweisen, kommentieren,
schließen), SLA-Fälligkeiten, Suche/Filter/Export, Dashboard und
Benutzerverwaltung — als React-Frontend mit FastAPI-Backend und persistenter
Datenbank.

## Tech Stack

- **Backend**: Python 3.12+, FastAPI, SQLAlchemy 2 (SQLite), Pydantic v2
- **Auth**: JWT (PyJWT) + Passwort-Hashing (bcrypt via Passlib)
- **Frontend**: React + TypeScript + Vite, React Router, TanStack Query

## Installation und Start

### Backend

```bash
cd backend
pip install -r requirements.txt
```

`JWT_SECRET` ist Pflicht (Signaturschlüssel für JWTs). Einmalig generieren und in
die Umgebung exportieren — niemals committen (siehe auch `backend/.env.example`):

```bash
# PowerShell:
$env:JWT_SECRET = (py -c "import secrets; print(secrets.token_hex(32))")
# Bash:
# export JWT_SECRET=$(python3 -c "import secrets; print(secrets.token_hex(32))")
```

```bash
uvicorn app.main:app --port 8000
```

Beim Start wird die SQLite-Datei `helpdesk.db` automatisch angelegt (Schema via
`Base.metadata.create_all`). Der Health-Endpunkt ist unter
`http://localhost:8000/api/health` erreichbar.

### Frontend

```bash
cd frontend
npm install
npm run dev -- --port 5173
```

## Env-Variablen

| Variable                 | Bedeutung                                  | Default                     |
| ------------------------ | ------------------------------------------ | --------------------------- |
| `JWT_SECRET`             | Signaturschlüssel für JWTs (Pflicht)       | – (aus RUN.json `generate`) |
| `DATABASE_URL`           | SQLAlchemy-Datenbank-URL                   | `sqlite:///./helpdesk.db`   |
| `ACCESS_TOKEN_EXPIRE_HOURS` | Gültigkeit der Access-Tokens in Stunden | `24`                        |
| `FRONTEND_ORIGIN`        | Erlaubter CORS-Origin des Frontends        | `http://localhost:5173`     |
| `VITE_API_BASE_URL`      | (Frontend) Basis-URL der API               | `http://localhost:8000`     |

## API-Übersicht

Basis-Pfad `/api`, Auth per Bearer-JWT. Ohne/abgelaufenes Token → `401`,
unzureichende Rolle → `403`. Fehler einheitlich `{"detail":"..."}`;
Validierungsfehler `422` als FastAPI-Liste (`loc`, `msg`, `type`).

| Methode | Pfad                         | Beschreibung                              | Auth  |
| ------- | ---------------------------- | ----------------------------------------- | ----- |
| POST    | `/api/auth/register`         | Registrierung `{email,display_name,password}` | –  |
| POST    | `/api/auth/login`            | Anmeldung `{email,password}` → Token      | –     |
| POST    | `/api/auth/logout`           | Abmeldung (Token widerrufen)              | JWT   |
| GET     | `/api/auth/me`               | Eigenes Profil                            | JWT   |
| GET     | `/api/users`                 | Benutzerliste                             | admin |
| POST    | `/api/users`                 | Benutzer anlegen                          | admin |
| PATCH   | `/api/users/{id}`            | Rolle/Status ändern                       | admin |
| DELETE  | `/api/users/{id}`            | Benutzer löschen                          | admin |
| DELETE  | `/api/users/me`              | Eigenes Konto löschen                     | JWT   |
| POST    | `/api/tickets`               | Ticket anlegen `{title,description,category,priority}` | JWT |
| GET     | `/api/tickets`               | Ticketliste (Suche/Filter/Sortierung/Seiten) | JWT |
| GET     | `/api/tickets/{id}`          | Ticket-Detail mit Kommentaren und Audit   | JWT   |
| PATCH   | `/api/tickets/{id}`          | Ticket bearbeiten                         | JWT   |
| POST    | `/api/tickets/{id}/close`    | Ticket schließen                          | JWT   |
| POST    | `/api/tickets/{id}/reopen`   | Ticket wieder öffnen                      | JWT   |
| POST    | `/api/tickets/{id}/assign`   | Ticket zuweisen `{agent_id}`              | JWT   |
| POST    | `/api/tickets/{id}/comments` | Kommentar anlegen `{body}`                | JWT   |
| GET     | `/api/dashboard`             | Kennzahlen (offen, überfällig, …)         | JWT   |
| GET     | `/api/export/tickets`        | CSV-Export der gefilterten Liste          | JWT   |
| GET     | `/api/health`                | Health-Check → `{"status":"ok"}`          | –     |

## Features

- Rollen- und Rechteverwaltung (Melder, Agent, Admin)
- Vollständiger Ticket-Lebenszyklus mit SLA-Fälligkeiten und Audit-Log
- Suche, Filter, Sortierung, Seitenblätterung und CSV-Export
- Dashboard mit Kennzahlen und Prioritätsverteilung
- Benutzerverwaltung und Kontolöschung (Datenschutz)
