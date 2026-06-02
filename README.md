# ⚽ Collection Tracker

A self-hostable web app to track a sport card collection against a curated,
**bundled catalog of sets**. Browse your collection by **player** (split into
**club** and **country** kits), by **team**, and by **set** with completion
tracking. Built soccer-first with a schema that extends to other sports.

## Features

- **Bundled, authoritative catalog** — sets ship with the app and load
  automatically on startup. No per-user import; everyone gets the same checklists.
- **Views** — by player (club vs country kit), by team, by set with per-subset
  and per-parallel completion %, plus a dashboard.
- **Collection management** — owned / wishlist / duplicate states, condition &
  grading (PSA/BGS/SGC), serial numbering (e.g. `/99`), purchase & value info,
  autograph/relic/rookie flags, and **storage locations** (labelled bins).
- **Images** — upload your own photos (stored on a volume) or reference a URL.
- **Backup** — full JSON export at `/api/export`.
- **Self-hosted** — one `docker compose up -d`; Postgres + app with persistent
  volumes; designed to sit behind **Traefik + Authentik**.

## Tech stack

Next.js (App Router, TypeScript) · Prisma · PostgreSQL · Tailwind CSS.

## Architecture: catalog vs. collection

The app cleanly separates two kinds of data:

| | **Catalog** (sets, cards, players, teams, parallels) | **Collection** (your owned/wanted items, images) |
|---|---|---|
| Scope | Shared, authoritative | Per-user (the database) |
| Source of truth | The git repo (`catalog/`) | The database |
| Lifecycle | Bundled in the image; **synced on every boot** | Created in-app by you |

- **Source of truth is the repo.** Raw checklists live in `catalog/sources/`;
  a build step (`npm run catalog:build`) compiles them with the Panini/Donruss
  parser into normalized, hashed JSON in `catalog/dist/` (committed).
- **On container start**, `prisma/sync-catalog.mjs` runs after migrations and
  reconciles `catalog/dist/*.json` into the database. It is **idempotent**:
  a set whose content hash is unchanged is skipped, cards are upserted by their
  natural key `(set, subset, cardNumber)` — never deleted and recreated — and a
  card that disappears from an updated checklist is **soft-retired**, so your
  ownership records are never orphaned.

### Adding a set to the bundled catalog

1. Drop the source file in `catalog/sources/` (Panini/Donruss CSV export).
2. Add an entry to [`catalog/manifest.ts`](catalog/manifest.ts) with a **stable**
   `externalId` and the `kitType` (e.g. `COUNTRY` for a World Cup product).
3. `npm run catalog:build` → commit the new `catalog/dist/*.json`.
4. Ship a new image; the set appears on every instance after a restart.

## Quick start (Docker)

```bash
cp .env.example .env          # adjust POSTGRES_PASSWORD if you like
docker compose up -d          # app on http://localhost:3000
```

On first boot the schema is migrated and the bundled catalog is synced
automatically. Data persists in two named volumes: `pgdata` (database) and
`uploads` (images).

## Local development

```bash
npm install
cp .env.example .env          # point DATABASE_URL at a local Postgres
npx prisma migrate dev        # create the schema
npm run catalog:build         # compile catalog/sources -> catalog/dist
npm run catalog:sync          # load the catalog into the DB
npm run dev                   # http://localhost:3000
```

See [`docs/self-hosting.md`](docs/self-hosting.md) for Traefik/Authentik, backup,
and restore.

## Tests

```bash
npm run test        # completion calc + catalog parser
```
