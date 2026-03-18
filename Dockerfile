# ─── Stage 1: Build Angular UI ───────────────────────────────────────────────
FROM node:22-alpine AS ui-build

WORKDIR /build/apps/ui
COPY apps/ui/package*.json ./
RUN npm ci

COPY apps/ui/ ./
# Output lands at /build/apps/api/public/ (outputPath: "../api/public" in angular.json)
RUN npm run build:prod


# ─── Stage 2: Build NestJS API ───────────────────────────────────────────────
FROM node:22-alpine AS api-build

# Native build tools for better-sqlite3 and bcrypt
RUN apk add --no-cache python3 make g++

WORKDIR /build/apps/api
COPY apps/api/package*.json ./
RUN npm ci

COPY apps/api/ ./
# Bring in Angular output from Stage 1
COPY --from=ui-build /build/apps/api/public ./public

RUN npm run build


# ─── Stage 3: Production runner ──────────────────────────────────────────────
FROM node:22-alpine AS runner

RUN apk add --no-cache tini

WORKDIR /app

# Compiled NestJS
COPY --from=api-build /build/apps/api/dist ./dist
# Angular static files
COPY --from=api-build /build/apps/api/public ./public
# node_modules from api-build stage (includes pre-compiled native binaries for alpine)
COPY --from=api-build /build/apps/api/node_modules ./node_modules
# Raw JS scrapers (not compiled by tsc, live outside apps/api)
COPY src/scrapers ./scrapers

ENV NODE_ENV=production
ENV PORT=3000
ENV SCRAPERS_PATH=/app/scrapers
# DB_PATH must be set at runtime to a mounted volume path, e.g. /data/db/jobhunt.db

EXPOSE 3000

ENTRYPOINT ["/sbin/tini", "--"]
CMD ["node", "dist/main"]
