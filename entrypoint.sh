#!/bin/sh
set -e

echo "→ Applying database migrations…"
node node_modules/prisma/build/index.js migrate deploy

# Optional one-time seed: set SEED_ON_START=true to load the sample data.
if [ "${SEED_ON_START}" = "true" ]; then
  echo "→ Seeding database…"
  node node_modules/prisma/build/index.js db seed || echo "Seed skipped/failed (continuing)."
fi

echo "→ Starting server on port ${PORT:-3000}…"
exec node server.js
