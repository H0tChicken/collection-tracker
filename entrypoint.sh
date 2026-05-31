#!/bin/sh
set -e

echo "→ Applying database migrations…"
node node_modules/prisma/build/index.js migrate deploy

# Optional one-time seed: set SEED_ON_START=true to load the sample data.
# Runs the plain-JS seed directly (no tsx needed in the runtime image).
if [ "${SEED_ON_START}" = "true" ]; then
  echo "→ Seeding database…"
  node prisma/seed.mjs || echo "Seed skipped/failed (continuing)."
fi

echo "→ Starting server on port ${PORT:-3000}…"
exec node server.js
