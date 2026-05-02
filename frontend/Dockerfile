# ─── Stage 1: Build ──────────────────────────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
RUN npm run build

# ─── Stage 2: Serve ──────────────────────────────────────────────────────────
FROM node:20-alpine AS runtime

RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001 -G nodejs

# Install serve for static file hosting
RUN npm install -g serve@14

WORKDIR /app

COPY --from=build --chown=nodeuser:nodejs /app/dist ./dist

ENV PORT=8080
EXPOSE 8080

USER nodeuser

HEALTHCHECK --interval=30s --timeout=10s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:8080', r => r.statusCode === 200 ? process.exit(0) : process.exit(1)).on('error', () => process.exit(1))"

CMD ["serve", "-s", "dist", "-l", "8080"]
