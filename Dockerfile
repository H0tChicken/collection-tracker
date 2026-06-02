# syntax=docker/dockerfile:1

# ---- deps: install all dependencies ----
FROM node:22-alpine AS deps
RUN apk add --no-cache libc6-compat openssl
WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci

# ---- builder: generate client + build Next (standalone) ----
FROM node:22-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
RUN npx prisma generate
# Compile the bundled catalog (sources -> catalog/dist/*.json) and build Next.
RUN npm run catalog:build
RUN npm run build

# ---- runner: runtime image ----
FROM node:22-alpine AS runner
RUN apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
ENV PORT=3000
ENV UPLOAD_DIR=/data/uploads

# Non-root user
RUN addgroup -g 1001 nodejs && adduser -u 1001 -G nodejs -S nextjs

# Next standalone server + static assets
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

# Prisma schema + migrations + the boot-time catalog sync.
COPY --from=builder /app/prisma ./prisma
# Compiled, bundled catalog the sync loads on startup.
COPY --from=builder /app/catalog/dist ./catalog/dist

# Full node_modules so the Prisma CLI (and its transitive deps like
# @prisma/config -> effect) work at runtime for `prisma migrate deploy`, and so
# sync-catalog.mjs can import @prisma/client.
# This overlays the minimal set Next traced into the standalone output.
COPY --from=builder /app/node_modules ./node_modules

COPY entrypoint.sh ./entrypoint.sh
RUN chmod +x ./entrypoint.sh && mkdir -p /data/uploads && chown -R nextjs:nodejs /data /app

USER nextjs
EXPOSE 3000
ENTRYPOINT ["./entrypoint.sh"]
