# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
# Prisma necesita OpenSSL; ca-certificates para llamadas HTTPS salientes
RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

FROM base AS deps
COPY package.json package-lock.json ./
COPY prisma ./prisma
# postinstall corre `prisma generate` (no necesita conexión a la BD)
RUN npm ci

# Herramientas: `docker compose run --rm admin-migrate` aplica migraciones.
FROM deps AS migrator
COPY . .
CMD ["npx", "prisma", "migrate", "deploy"]

FROM deps AS builder
COPY . .
# Valor de relleno solo para compilar: Next importa las rutas al build y Prisma exige la variable.
# No se conecta a nada; en ejecución se usa la DATABASE_URL real del contenedor.
ENV DATABASE_URL=postgresql://build:build@localhost:5432/build
RUN npm run build

FROM base AS runner
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
RUN useradd -m -u 1001 app
COPY --from=builder --chown=app /app/.next/standalone ./
COPY --from=builder --chown=app /app/.next/static ./.next/static
COPY --from=builder --chown=app /app/public ./public
COPY --from=builder --chown=app /app/tessdata ./tessdata
USER app
EXPOSE 3000
CMD ["node", "server.js"]
