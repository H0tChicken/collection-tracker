# ⚽ Collection Tracker

A self-hostable web app to track a sport card collection **against any set**.
Browse your collection by **player** (split into **club** and **country** kits),
by **team**, and by **set** with completion tracking. Built soccer-first with a
schema that extends to other sports.

## Features

- **Track against any set** — import checklists from **JSON templates, CSV,
  Excel (.xlsx), or PDF**, with a dry-run preview before committing.
- **Views** — by player (club vs country kit), by team, by set with per-parallel
  completion %, plus a dashboard.
- **Collection management** — owned / wishlist / duplicate states, condition &
  grading (PSA/BGS/SGC), serial numbering (e.g. `/99`), purchase & value info,
  autograph/relic/rookie flags, and **storage locations** (labelled bins).
- **Images** — upload your own photos (stored on a volume) or reference a URL.
- **Backup** — full JSON export at `/api/export`.
- **Self-hosted** — one `docker compose up -d`; Postgres + app with persistent
  volumes; designed to sit behind **Traefik + Authentik**.

## Tech stack

Next.js (App Router, TypeScript) · Prisma · PostgreSQL · Tailwind CSS.

## Quick start (Docker)

```bash
cp .env.example .env          # adjust POSTGRES_PASSWORD if you like
docker compose up -d          # app on http://localhost:3000
```

To load the sample data on first run, set `SEED_ON_START=true` in your `.env`
before the first `up` (it must be a real file — `cp .env.example .env`, then edit).

Data persists in two named volumes: `pgdata` (database) and `uploads` (images).

## Local development

```bash
npm install
cp .env.example .env          # point DATABASE_URL at a local Postgres
npx prisma migrate dev        # create the schema
npm run db:seed               # optional sample data
npm run dev                   # http://localhost:3000
```

## Importing a set

1. Go to **Import**.
2. **JSON template** creates the set and its checklist in one step — see
   [`set-templates/README.md`](set-templates/README.md) for the format and a
   sample. CSV / Excel / PDF import *into an existing set* you select.
3. **Preview** to dry-run, then **Import** to commit.

See [`docs/csv-format.md`](docs/csv-format.md) for accepted spreadsheet columns
and [`docs/self-hosting.md`](docs/self-hosting.md) for Traefik/Authentik, backup,
and restore.

## Tests

```bash
npm run test        # completion calc + import parsers
```
