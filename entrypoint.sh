#!/bin/sh
set -e

echo "→ Applying database migrations…"
node node_modules/prisma/build/index.js migrate deploy

# Sync the bundled, authoritative catalog into the database. Idempotent:
# unchanged sets are skipped via content hash, so this is a fast no-op on most
# boots. Set CATALOG_SYNC=false to skip (e.g. for debugging).
if [ "${CATALOG_SYNC:-true}" = "true" ]; then
  echo "→ Syncing bundled catalog…"
  node prisma/sync-catalog.mjs
fi

echo "→ Starting server on port ${PORT:-3000}…"
exec node server.js
