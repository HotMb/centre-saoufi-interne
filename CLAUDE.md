# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Centre Saoufi** — Internal management platform for a Moroccan physiotherapy center. No billing/invoicing. Core features: appointment scheduling, patient records, clinical session tracking, and CNIL-compliant audit logging.

**Stack**: React 18 + TypeScript + Vite (frontend) · Express 4 + TypeScript + Prisma (backend) · PostgreSQL · Playwright (e2e)

All code, comments, and UI text are in **French**.

---

## Commands

### Backend (`centre saoufi/backend/`)

```bash
npm run dev              # Start dev server (ts-node, port 3000)
npm run build            # Compile TypeScript → dist/
npm start                # Run compiled production build
npm test                 # Run Jest tests (tests/**/*.test.ts)

npx prisma migrate dev   # Apply pending migrations (creates migration file)
npx prisma generate      # Regenerate Prisma client after schema changes
npx prisma studio        # Visual DB browser at localhost:5555
```

### Frontend (`centre saoufi/frontend/`)

```bash
npm run dev              # Vite dev server at http://localhost:5173
npm run build            # tsc + vite build → dist/
npm test                 # Vitest (run once, no watch)
```

### E2E Tests (`centre saoufi/e2e-tests/`)

```bash
npx playwright test                    # Run all tests (Chromium)
npx playwright test tests/login.spec   # Run single spec
npx playwright show-report             # Open HTML report
```

> E2E tests require both servers running (`npm run dev` in both backend and frontend).

---

## Architecture

### Frontend — `App.tsx` shell + lazy-loaded tabs

`frontend/src/App.tsx` is a thin shell (~110 lines): handles session bootstrap (`GET /api/auth/me`), login/logout, dark mode, and renders one tab based on `activeTab` state. Each page lives in its own file under `frontend/src/tabs/`, lazy-loaded via `React.lazy`/`Suspense`:

```
tabs/DashboardTab.tsx       tabs/PatientsTab.tsx      tabs/AppointmentsTab.tsx
tabs/SessionsTab.tsx        tabs/DevisTab.tsx          tabs/PatientPortalTab.tsx
tabs/AdminSettingsTab.tsx
```

`PATIENT` role users only ever see `PatientPortalTab` (read-only view of their own appointments/sessions). `DevisTab` and `AdminSettingsTab` are gated to `ADMIN`/`SECRETAIRE` and `ADMIN` respectively at the render level in `App.tsx`.

Shared building blocks: `components/` (Alert, ConfirmModal, PatientForm), `layout/Sidebar.tsx`, `pages/LoginPage.tsx`, `utils/devisGenerator.ts` (PDF quote generation), `utils/numberToFrenchWords.ts`, `utils/helpers.ts`.

`frontend/src/api/client.ts` — thin fetch wrapper (`api.get`, `api.post`, etc.) that sends credentials via cookies. The Vite dev proxy (`/api` → `http://127.0.0.1:3000`) means all API calls use relative paths like `/api/appointments`.

### Backend — Layered Express

```
routes/        → Express router (URL + HTTP method → controller)
controllers/   → Business logic, Prisma queries, response formatting
middleware/    → requireAuth (session check), rbac (role check)
services/      → reminder.service.ts (node-cron job for J-1 emails)
config/        → env.ts (all env vars with defaults), prisma.ts (singleton client)
```

Patient clinical notes (`PatientNote` model) are handled by `controllers/note.controller.ts` but mounted as sub-routes of patients (`patient.routes.ts`: `GET/POST /:id/notes`, `DELETE /:id/notes/:noteId`) — there is no standalone `note.routes.ts`.

Route registration order in `app.ts`:
```
/api/auth       /api/admin      /api/patients
/api/appointments  /api/sessions  /api/users
```

In production (`NODE_ENV=production`), `app.ts` also serves the built frontend (`frontend/dist`) via `express.static` plus an SPA catch-all — single-service deployment, no separate frontend host needed.

### Authentication & RBAC

- Session-based: `express-session` with httpOnly cookies (`connect.sid`)
- Session store: PostgreSQL-backed (`connect-pg-simple`) in production, default in-memory store in development — see `app.ts`
- `requireAuth` middleware attaches `req.user` from session; controllers read `(req as any).user`
- `requireRoles(...roles)` factory in `middleware/rbac.ts` — placed after `requireAuth` in route chains
- Four roles: `ADMIN`, `SECRETAIRE`, `PRATICIEN`, `PATIENT`

### Database (Prisma + PostgreSQL)

Key schema relationships:
- `Appointment` → optional `Patient` (registered) or `patientName` string (walk-in)
- `Appointment` → `User` (practitioner, role=PRATICIEN)
- `Session` → `Patient` + `User` (practitioner) — required both
- `PatientNote` → `Patient` + `User` (author) — clinical notes, required both
- `ActivityLog` → optional `User` — audit trail for CNIL compliance

`Appointment.status` enum: `PLANIFIE | ANNULE | REPORTE | REALISE`

---

## Environment Variables

Backend reads from `backend/.env`:

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | Backend port |
| `DATABASE_URL` | *(required)* | PostgreSQL connection string — also used as the session store DSN in production |
| `SESSION_SECRET` | `centresaoufi_default_secret_key_987` | Session signing |
| `NODE_ENV` | `development` | Toggles secure cookies, static frontend serving, and the PG session store |
| `REMINDER_EMAILS` | *(optional)* | Comma-separated recipients for J-1 reminder emails |
| `SMTP_HOST/PORT/USER/PASS` | *(optional)* | SMTP config for reminder emails |

---

## Key Constraints

- `devisGenerator.ts` and `numberToFrenchWords.ts` back the quote (devis) PDF generation used by `DevisTab` — exposed in the UI for `ADMIN`/`SECRETAIRE` roles.
- Reminder emails are sent daily at 19h00 (Africa/Casablanca) via `node-cron` in `services/reminder.service.ts`. SMTP must be configured in `.env`.
- Logic lives in `controllers/`, not in a service layer — there is no `services/auth.service.ts` or `services/user.service.ts`; `services/` only holds `reminder.service.ts`.
