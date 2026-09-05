# ── Stage 1: Build ──────────────────────────────────────────────────
FROM node:22-slim AS build
WORKDIR /app

# Install dependencies first (better layer caching)
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
RUN npm run build

# ── Stage 2: Production ─────────────────────────────────────────────
FROM node:22-slim
WORKDIR /app
ENV NODE_ENV=production

# Only install production deps
COPY --from=build /app/package*.json ./
RUN npm ci --omit=dev

# Copy server build and frontend static files
COPY --from=build /app/dist/server ./dist/server
COPY --from=build /app/dist/client ./dist/client

# Create data directory for SQLite
RUN mkdir -p /app/data

# Cloud Run injects PORT; default to 8080
EXPOSE 8080
ENV PORT=8080

# Non-root user for security
RUN useradd -m -u 1001 medlens && chown -R medlens:medlens /app
USER medlens

CMD ["node", "--experimental-sqlite", "dist/server/index.js"]
