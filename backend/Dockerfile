FROM node:24.21.0-bookworm-slim

WORKDIR /app/backend

# Dependencias primeiro: o Docker reaproveita esta camada enquanto o package.json nao mudar.
COPY backend/package*.json ./
RUN npm ci && npm cache clean --force

# Compila o TypeScript e tira as devDependencies (o CLI do Nest e o tsc so servem no build).
COPY backend/ ./
RUN npm run build && npm prune --omit=dev

# O backend serve o frontend (dist/main.js procura em ../../frontend).
COPY frontend/ /app/frontend/

EXPOSE 3000

CMD ["node", "dist/main"]
