# Centre Saoufi

Plateforme web de gestion interne pour un centre de rééducation fonctionnelle (kinésithérapie) au Maroc : planning des rendez-vous, dossiers patients, suivi des séances cliniques, génération de devis et portail patient — avec journal d'activité conforme CNIL.

**Stack** : React 18 + TypeScript + Vite (frontend) · Express 4 + TypeScript + Prisma (backend) · PostgreSQL · Playwright (e2e)

Toute l'interface, les commentaires de code et les messages sont en français.

---

## Fonctionnalités

- **Authentification par session** avec 4 rôles : `ADMIN`, `SECRETAIRE`, `PRATICIEN`, `PATIENT`
- **Tableau de bord** — vue d'ensemble de l'activité (ADMIN / SECRETAIRE)
- **Patients** — dossiers, coordonnées, pathologie, médecin traitant, notes cliniques
- **Rendez-vous** — planification, statuts (`PLANIFIE`, `ANNULE`, `REPORTE`, `REALISE`), patients inscrits ou de passage
- **Séances** — historique des soins réalisés par patient et par praticien
- **Devis** — génération de devis PDF (tarifs, séances, montant en lettres)
- **Portail patient** — un patient connecté consulte ses propres rendez-vous et séances
- **Rappels automatiques** — email J-1 envoyé chaque jour à 19h00 (Africa/Casablanca) pour les rendez-vous du lendemain
- **Journal d'activité** (`ActivityLog`) — traçabilité des actions sensibles, conformité CNIL

## Structure du projet

```
centre saoufi/
├── backend/             API Express + Prisma
│   ├── src/
│   │   ├── routes/      Définition des routes par ressource
│   │   ├── controllers/ Logique métier + requêtes Prisma
│   │   ├── middleware/  requireAuth (session), rbac (rôles)
│   │   ├── services/    reminder.service.ts (cron email J-1)
│   │   ├── config/      env.ts, prisma.ts
│   │   └── utils/       dbRetry.ts
│   └── prisma/
│       └── schema.prisma
├── frontend/             SPA React
│   └── src/
│       ├── tabs/         Une page par onglet (Dashboard, Patients, RDV, Séances, Devis, Portail, Admin)
│       ├── components/   Composants réutilisables (Alert, ConfirmModal, PatientForm)
│       ├── layout/        Sidebar
│       ├── pages/        LoginPage
│       ├── api/          Client fetch (client.ts)
│       └── utils/        devisGenerator.ts (PDF), numberToFrenchWords.ts, helpers.ts
├── e2e-tests/            Tests Playwright bout-en-bout
├── railway.json          Configuration de déploiement Railway
└── CLAUDE.md             Guide d'architecture détaillé (pour Claude Code / contributeurs)
```

## Prérequis

- Node.js ≥ 18
- PostgreSQL ≥ 14 (local ou distant)

## Installation

```bash
# Backend
cd backend
npm install
cp .env.exemple .env   # puis renseigner DATABASE_URL, SESSION_SECRET, etc.
npx prisma migrate dev
npm run dev             # http://localhost:3000

# Frontend (autre terminal)
cd frontend
npm install
npm run dev              # http://localhost:5173
```

Le serveur de développement Vite proxy les appels `/api/*` vers `http://127.0.0.1:3000`.

### Tests end-to-end (optionnel)

```bash
cd e2e-tests
npm install
npx playwright install   # première fois uniquement
npx playwright test       # les deux serveurs (backend + frontend) doivent tourner
```

## Variables d'environnement

Voir `backend/.env.exemple` pour le détail. Principales variables :

| Variable | Obligatoire | Description |
|---|---|---|
| `DATABASE_URL` | oui | Chaîne de connexion PostgreSQL |
| `SESSION_SECRET` | oui (prod) | Clé de signature des sessions |
| `NODE_ENV` | non | `development` ou `production` |
| `PORT` | non | Port du serveur backend (def. `3000`) |
| `REMINDER_EMAILS` | non | Destinataires des rappels J-1 (séparés par virgule) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` | non | Configuration SMTP pour l'envoi d'emails |

## Scripts disponibles

**Backend** (`backend/`)

| Commande | Description |
|---|---|
| `npm run dev` | Démarre le serveur en mode développement (ts-node) |
| `npm run build` | Compile TypeScript → `dist/` |
| `npm start` | Lance le build de production |
| `npm test` | Tests Jest |
| `npx prisma migrate dev` | Applique les migrations en développement |
| `npx prisma studio` | Interface graphique de la base de données |

**Frontend** (`frontend/`)

| Commande | Description |
|---|---|
| `npm run dev` | Serveur de développement Vite |
| `npm run build` | Build de production (`tsc` + `vite build`) |
| `npm test` | Tests Vitest |

## Déploiement

Le projet est conçu pour un déploiement **mono-service** : le backend Express sert à la fois l'API et le build statique du frontend (voir `backend/src/app.ts`), ce qui évite les problèmes de CORS et simplifie l'hébergement. Configuration prête pour [Railway](https://railway.app) via `railway.json` (build du frontend + backend, migrations Prisma automatiques au démarrage).

Voir `CLAUDE.md` pour le détail de l'architecture backend/frontend et des conventions du projet.
