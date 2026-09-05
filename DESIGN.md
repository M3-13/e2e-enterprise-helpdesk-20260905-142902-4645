# Design — Project Identity

> This document is project-long-lived. Tokens are not changed without
> the Architect's approval. Developers MUST use these tokens
> instead of improvising their own colors/spacings.

## Style Direction

Helle, aufgeräumte Enterprise-Oberfläche mit neutralen Slate-Flächen, kräftigem Blau als Primärakzent und eindeutig codierten Status-/Prioritätsfarben — professionell wie Linear/Stripe, optimiert für dichte Tabellen und klare SLA-Kennzeichnung.

## Colors

- `--color-bg`: **#F8FAFC**
- `--color-surface`: **#FFFFFF**
- `--color-surface_muted`: **#F1F5F9**
- `--color-fg`: **#0F172A**
- `--color-muted`: **#64748B**
- `--color-border`: **#E2E8F0**
- `--color-accent`: **#2563EB**
- `--color-accent_hover`: **#1D4ED8**
- `--color-accent_active`: **#1E40AF**
- `--color-danger`: **#DC2626**
- `--color-warning`: **#D97706**
- `--color-success`: **#059669**
- `--color-info`: **#0EA5E9**
- `--color-overdue_bg`: **#FEF2F2**
- `--color-overdue_border`: **#FECACA**

## Typography

- `font_family`: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif
- `heading_weight`: 600
- `body_weight`: 400
- `size_scale`: 12px, 14px, 16px, 18px, 24px, 32px

## Spacing Scale

- `--space-0`: 4px
- `--space-1`: 8px
- `--space-2`: 12px
- `--space-3`: 16px
- `--space-4`: 24px
- `--space-5`: 32px
- `--space-6`: 48px

## Border-Radii

- `--radius-sm`: 4px
- `--radius-md`: 8px
- `--radius-lg`: 12px
- `--radius-pill`: 999px

## Components

### Button

MindesthÃ¶he 44px (Touch-Target), padding 12px 20px, radius md, font-size 14px, font-weight 600. Primary: bg=accent, fg=#FFFFFF, border 1px transparent; hover=accent_hover; active=accent_active; focus sichtbarer Ring 2px #BFDBFE auÃŸen; disabled opacity 0.5 und kein Pointer-Event. Secondary: bg=surface, fg=fg, border 1px border; hover=surface_muted. Danger: bg=danger, fg=#FFFFFF; hover=#B91C1C. Ghost: bg transparent, fg=accent; hover=surface_muted.

### Card

bg=surface, border 1px border, radius lg, padding 24px, box-shadow 0 1px 2px rgba(15,23,42,0.06). Abstand zwischen Karten 16px. Optionaler Header mit 16px padding-bottom und 1px Trennlinie border.

### Input

HÃ¶he 44px, padding 10px 12px, bg=surface, border 1px border, radius md, font-size 14px, fg=fg, placeholder=muted. Focus: border=accent, Ring 3px rgba(37,99,235,0.15). Fehlerzustand: border=danger, Ring rgba(220,38,38,0.15). Disabled: bg=surface_muted, opacity 0.7.

### Label

font-size 13px, font-weight 500, fg=fg, margin-bottom 6px. Pflichtfeld-Kennzeichnung als danger-Stern direkt am Label.

### FormField

Wrapper mit margin-bottom 16px. Fehlermeldung darunter: font-size 12px, fg=danger, margin-top 4px. Hilfetext: font-size 12px, fg=muted.

### Badge

Inline-Pill, padding 2px 10px, radius pill, font-size 12px, font-weight 600, border 1px passend zum Farbton, Hintergrund als abgetÃ¶nte 10%-FlÃ¤che. Status: Offen=accent, In Bearbeitung=warning, GelÃ¶st=success, Geschlossen=muted. PrioritÃ¤t: Niedrig=muted, Mittel=accent, Hoch=warning, Kritisch=danger.

### OverdueBadge

Pill wie Badge, aber bg=overdue_bg, fg=danger, border=overdue_border, font-weight 700, Text 'ÃœberfÃ¤llig'. In Tabellenzeilen zusÃ¤tzlich linke 3px-Markierung in danger.

### Table

bg=surface, border 1px border, radius md, overflow hidden. Header: bg=surface_muted, fg=muted, font-size 12px, text-transform uppercase, letter-spacing 0.03em, sticky bei Scroll. Zellen: padding 12px 16px, border-bottom 1px border, font-size 14px. Hover-Zeile: bg=#F8FAFC. Sortierbare Spalten zeigen Pfeil in accent.

### Navbar

HÃ¶he 64px, bg=surface, border-bottom 1px border, padding 0 24px, sticky top. Links: Produktname font-weight 700, fg=fg. Navigation als horizontale Links, aktiver Zustand fg=accent mit 2px Unterstreichung. Rechts: Benutzer-MenÃ¼ mit Avatar (28px Kreis, Initialen, bg=accent, fg=#FFFFFF).

### Sidebar

Breite 240px, bg=surface, border-right 1px border, min-height calc(100vh - 64px). MenÃ¼punkte: padding 10px 16px, radius md, font-size 14px, fg=muted; hover=surface_muted; aktiv bg=#EFF6FF, fg=accent, font-weight 600. Abstand zwischen Punkten 4px.

### Modal

Overlay bg rgba(15,23,42,0.5). Dialog: bg=surface, radius lg, max-width 560px, padding 24px, box-shadow 0 20px 40px rgba(15,23,42,0.2). Header mit Titel (font-size 18px, weight 600), SchlieÃŸen-Button 36px Ghost. Footer rechtsbÃ¼ndig mit Abstand 16px zwischen Buttons.

### Toast

Fixed oben rechts, margin 16px, radius md, padding 12px 16px, font-size 14px, bg=surface, border 1px border, box-shadow. Erfolg: linke 4px Leiste success und Icon success. Fehler: linke 4px Leiste danger und Icon danger. Auto-Dismiss nach 5s.

### DashboardMetric

Statistik-Kachel als Card mit padding 20px. Wert: font-size 32px, weight 600, fg=fg. Label: font-size 13px, fg=muted, margin-top 4px. ÃœberfÃ¤llig-Kachel: Wert in danger. Grid: 1 Spalte mobil, 2 ab 768px, 4 ab 1024px.

### ChartCard

Card mit Titel (font-size 16px, weight 600, margin-bottom 16px) und Prioritätsverteilung als horizontale Balken. Jeder Balken 12px hoch, radius pill, Farbe der Priorität; Label links fg=muted, Wert rechts fg=fg, font-size 13px.

## Layout Principles

- Inhaltscontainer max-width 1280px, zentriert, seitlich padding 24px auf Desktop und 16px ab 768px.
- Breakpoints: 768px (Tablet, Navigation kollabiert) und 1024px (Desktop mit Sidebar).
- Desktop: Sidebar 240px links fixiert, Hauptbereich daneben mit flex 1; Tablet/Mobil: Sidebar als Overlay-Menü.
- Abstand zwischen größeren Sektionen 24px, zwischen Formularfeldern 16px, Karten-Grid-Gap 16px.
- Formulare max-width 640px; primäre Aktion linksbündig in Formular-Reihenfolge, destruktive Aktionen klar getrennt (rechts oder als Danger-Button).
- Tabellen nutzen die volle Containerbreite, Seitengrößen- und Pagination-Steuerung unterhalb rechtsbündig mit 12px Abstand.
- Dichte Layouts bevorzugen 14px Fließtext, 12px für Metadaten und Tabellenheader; Überschriften 18-24px.
- Farben allein tragen keine Bedeutung: Status-/Prioritätsangaben erhalten zusätzlich Textlabel oder Icon.
