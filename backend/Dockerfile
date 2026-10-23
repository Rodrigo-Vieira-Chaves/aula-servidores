FROM node:24.21.0-bookworm-slim

# openssl: o schema engine do Prisma (usado pelo migrate) depende dela.
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates openssl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app/backend

# Dependencias primeiro: o Docker reaproveita esta camada enquanto o package.json nao mudar.
# As devDependencies ficam porque o entrypoint usa o CLI do Prisma (migrate) e o tsx (seed).
COPY backend/package*.json ./
RUN npm ci && npm cache clean --force

COPY backend/ ./

# DATABASE_URL de mentira so para o prisma.config.ts carregar: o generate nao conecta no banco.
RUN DATABASE_URL="postgresql://build:build@localhost:5432/build" npx prisma generate \
    && npm run build

# O backend serve o frontend (dist/main.js procura em ../../frontend).
COPY frontend/ /app/frontend/

EXPOSE 3000

ENTRYPOINT ["sh", "entrypoint.sh"]
