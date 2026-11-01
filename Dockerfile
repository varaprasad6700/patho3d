# ============================================================================
# Stage 1: Build Frontend SPA & PWA Assets
# ============================================================================
FROM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests first for layer caching
COPY package.json package-lock.json* ./

# Install all dependencies (including Vite & TypeScript build tools)
RUN npm install

# Copy application source
COPY . .

# Generate PWA icons and build the production Vite SPA + Service Worker into /app/dist
RUN node -e "import('./server.ts').catch(() => {})" 2>/dev/null || true
RUN npm run build

# ============================================================================
# Stage 2: Production Express + Static SPA Runtime
# ============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy package manifests and install only production runtime dependencies
COPY package.json package-lock.json* ./
RUN npm install --omit=dev && npm cache clean --force

# Copy compiled frontend assets and required server-side runtime files
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/public ./public
COPY --from=builder /app/server.ts ./server.ts
COPY --from=builder /app/src/types ./src/types
COPY --from=builder /app/src/data ./src/data
COPY --from=builder /app/src/utils ./src/utils

# Run as non-root node user for container security
RUN chown -R node:node /app
USER node

EXPOSE 3000

# Built-in healthcheck for Arcane, Dockhand, and reverse proxies
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/api/health || exit 1

CMD ["node", "server.ts"]
