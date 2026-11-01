# Self-Hosted Deployment Plan (Public GitHub + GitHub Actions + GHCR + Arcane & Dockhand)

## 1. Why Public GitHub + GitHub Actions + GHCR is the Best Approach

Hosting the repository publicly on **GitHub** (without Gitea) is the cleanest, lowest-maintenance path for your **Arcane** and **Dockhand** server:
- **100% Safe to Host Publicly**: No API keys or secrets ever live in the repository (`GEMINI_API_KEY` is injected at runtime inside Arcane on your server).
- **Zero CPU/RAM Build Load on Your Server**: **GitHub Actions** (100% free and unlimited for public repos) runs the unit tests and builds the production Docker image on GitHub's runners whenever you push to `main`.
- **Zero Registry Auth Needed in Arcane / Dockhand**: Because the container image (`ghcr.io/<your-username>/<repo-name>:latest`) is published publicly on **GHCR**, **Arcane** and **Dockhand** can pull and auto-update the container on your server without needing Personal Access Tokens or `docker login`.

---

## 2. Architecture & Deployment Flow

1. **Unified Express + Static SPA Server (`server.ts`)**:
   - Runs as a single lightweight container on port `3000`.
   - Serves the compiled React + Three.js + PWA bundle (`/dist`), the server-side Gemini API proxy (`POST /api/pathology/analyze`), the PWA manifest (`GET /manifest.webmanifest`), and a container readiness check (`GET /api/health`).
2. **GitHub Actions CI/CD (`.github/workflows/ghcr-deploy.yml`)**:
   - Triggers on every push to `main` (and manual `workflow_dispatch`).
   - Runs unit tests (`tsx --test src/utils/pathologyEngine.test.ts`).
   - Builds the multi-stage Docker image and pushes `:latest` and `:sha-<commit>` to `ghcr.io`.
   - Optionally triggers your **Dockhand / Arcane webhook URL** (if you set `DEPLOY_WEBHOOK_URL` in GitHub repo secrets) for instant rollout.
3. **Production Container (`Dockerfile` & `.dockerignore`)**:
   - **Stage 1 (`builder`)**: `node:22-alpine`, runs `npm ci` and `npm run build` (`vite build`).
   - **Stage 2 (`runner`)**: `node:22-alpine`, runs `NODE_ENV=production node server.ts` on port `3000` with a built-in Docker `HEALTHCHECK` against `GET /api/health`.
4. **Arcane & Dockhand Stack (`docker-compose.yml`)**:
   - Pulls `ghcr.io/<your-username>/<repo-name>:latest`.
   - Injects `GEMINI_API_KEY` from Arcane's environment variables.
   - Exposes port `3000` to your existing reverse proxy (Traefik, Nginx, Caddy, or Cloudflare Tunnel) and includes auto-update labels for **Dockhand**.

---

## 3. Files to Add & Update

- **`/server.ts`**: Add `GET /api/health` readiness endpoint and `app.set('trust proxy', 1)` for HTTPS reverse-proxy support.
- **`/Dockerfile`** & **`/.dockerignore`**: Multi-stage `node:22-alpine` production image with `HEALTHCHECK`.
- **`/docker-compose.yml`**: Production Compose stack ready to paste or sync directly into **Arcane** and **Dockhand**.
- **`/.github/workflows/ghcr-deploy.yml`**: GitHub Actions workflow to test, build, and publish the image to `ghcr.io`.
- **`/DEPLOY.md`**: Concise step-by-step instructions to export to public GitHub, make the GHCR package public, and launch the stack in Arcane & Dockhand.
