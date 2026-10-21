# fall-2026-final-project-group-6
Group 6 Final Project using Typescript
Project Overview

Campus Lost and Found is a mobile-friendly website designed to help UNC Charlotte students find lost belongings and return items they have found on campus.

Students often lose personal items such as keys, wallets, water bottles, and electronics. Currently, students may rely on social media, group chats, or word of mouth to locate their belongings.

Our goal is to create one centralized website where students can post lost or found items, search existing listings, and communicate privately to arrange the return of belongings.

This project is a student-built prototype and is not an official UNC Charlotte service.
## Local development

Requirements: Node.js 22.12 or newer and Docker Compose. Run commands from the repository root.

```bash
npm install
cp backend/.env.example backend/.env
docker compose up -d
npm run dev:backend
```

In a second terminal:

```bash
npm run dev:frontend
```

Open the URL printed by Vite (normally http://localhost:5173) and click **Check connection**. The backend runs on port 3000. Postgres uses host port 5433 to avoid conflicting with earlier class databases. These database credentials are for local development only.

The Vite development proxy forwards `/api` requests to Express. Production hosting will need its own API routing configuration.

## Checks

```bash
npm run typecheck
npm run build
```

Health endpoints: `/api/health` checks Express; `/api/health/database` checks Postgres. Database tables and migrations are a separate backlog task.

Stop the database with `docker compose stop`. This preserves local data. Keep `.env` private; commit only `.env.example`.

## UI Mockups

- [UI mockup PDF](docs/ui/Campus_Lost_and_Found_UI_Mockups.pdf)
- [Editable Figma mockups](https://www.figma.com/design/j8zK1GFZyarZG81fkDPPL4)

Uses “Campus Lost and Found” as the working product name.
