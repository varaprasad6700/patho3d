# ============================================================================
# Stage 1: Build Frontend SPA, PWA Assets & Pure-JS Production node_modules
# Runs natively on $BUILDPLATFORM (zero QEMU emulation overhead)
# ============================================================================
FROM --platform=$BUILDPLATFORM node:22-alpine AS builder

WORKDIR /app

# Copy package manifests first for layer caching
COPY package.json package-lock.json* ./

# Install all dependencies (including Vite & TypeScript build tools)
RUN npm install --legacy-peer-deps

# Copy application source
COPY . .

# Generate PWA icons and build the production Vite SPA + Service Worker into /app/dist
RUN node -e "import('./server.ts').catch(() => {})" 2>/dev/null || true
RUN npm run build

# Prune devDependencies natively so Stage 2 needs zero QEMU RUN steps
RUN npm prune --omit=dev --legacy-peer-deps

# ============================================================================
# Stage 2: Multi-Arch Production Runtime (linux/amd64 & linux/arm64/v8)
# ============================================================================
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

# Copy pruned pure-JS production node_modules and compiled assets with node user ownership
COPY --chown=node:node --from=builder /app/package.json ./package.json
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/public ./public
COPY --chown=node:node --from=builder /app/server.ts ./server.ts
COPY --chown=node:node --from=builder /app/src/types ./src/types
COPY --chown=node:node --from=builder /app/src/data ./src/data
COPY --chown=node:node --from=builder /app/src/utils ./src/utils

USER node

EXPOSE 3000

# Built-in healthcheck using configurable $PORT
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:${PORT:-3000}/api/health || exit 1

CMD ["node", "server.ts"]
