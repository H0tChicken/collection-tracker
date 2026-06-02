# Self-hosting

## One-command run

```bash
cp .env.example .env
docker compose up -d
```

- App: `http://localhost:3000`
- On container start (`entrypoint.sh`), database migrations run (`prisma migrate
  deploy`) and the bundled catalog is synced into the database
  (`prisma/sync-catalog.mjs`). The sync is idempotent — unchanged sets are
  skipped via a content hash, so it is a fast no-op on most boots.
- Set `CATALOG_SYNC=false` to skip the catalog sync (e.g. for debugging).

## Using the prebuilt image (GHCR)

GitHub Actions publishes a **multi-arch** image (`linux/amd64` + `linux/arm64`)
to `ghcr.io/h0tchicken/collection-tracker`, so the same tag runs on both an
Apple Silicon Mac and an x86_64 server — Docker pulls the right architecture
automatically.

To pull the prebuilt image instead of building locally, remove the `build: .`
line from the `app` service in `docker-compose.yml`, then:

```bash
docker compose pull && docker compose up -d
```

The package inherits the repo's visibility. While the repo is **public** the
image pulls with no authentication. (If you make the repo private again, either
flip the package back to public in the repo's *Packages* settings, or
`docker login ghcr.io` with a token that has the `read:packages` scope.)

## Persistence & backup

Two named volumes hold all state:

- `pgdata` — PostgreSQL data
- `uploads` — uploaded card images (`/data/uploads`)

**Logical backup (recommended):**

```bash
# Database
docker compose exec -T db pg_dump -U cardtracker cardtracker > backup.sql
# Images
docker run --rm -v collection-tracker_uploads:/u -v "$PWD":/b alpine \
  tar czf /b/uploads.tgz -C /u .
# App-level JSON export (catalog + collection)
curl -o collection-export.json http://localhost:3000/api/export
```

**Restore:**

```bash
cat backup.sql | docker compose exec -T db psql -U cardtracker cardtracker
docker run --rm -v collection-tracker_uploads:/u -v "$PWD":/b alpine \
  sh -c "tar xzf /b/uploads.tgz -C /u"
```

## Behind Traefik + Authentik

This app ships **no auth in v1** — protect it with your existing forward-auth.
Uncomment the `labels:` block in `docker-compose.yml` (adjust host, certresolver,
and middleware names) so the `app` service is routed by Traefik and gated by your
Authentik middleware. Put the app on Traefik's network and do **not** publish
port 3000 publicly.

When you later want the app to read the authenticated identity, set
`AUTH_TRUST_PROXY_HEADERS=true` and `AUTH_PROXY_USER_HEADER` (default
`X-authentik-username`) — the app can then attribute data per user.
