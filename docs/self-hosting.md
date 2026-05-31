# Self-hosting

## One-command run

```bash
cp .env.example .env
docker compose up -d
```

- App: `http://localhost:3000`
- Database migrations run automatically on container start (`prisma migrate
  deploy` in `entrypoint.sh`).
- Set `SEED_ON_START=true` once to load the sample data.

## Using the prebuilt image (GHCR)

GitHub Actions publishes a multi-arch image to
`ghcr.io/h0tchicken/collection-tracker`. To pull the prebuilt image instead of
building locally, remove the `build: .` line from the `app` service in
`docker-compose.yml`.

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
