# Self-Hosting Guide (Public GitHub + GHCR + Arcane & Dockhand Behind NetBird)

Because your **Arcane** and **Dockhand** management interfaces are private behind **NetBird**, this setup is designed to work **100% via outbound pulls** from your server—meaning you **never** have to expose Arcane or Dockhand to the public internet.

---

## How Updates Work Behind NetBird (2 Options)

### Option A: Outbound Polling from Your Server (Recommended — Zero Secrets Needed)
Even when Arcane and Dockhand are only accessible on your private NetBird mesh (`100.x.y.z`), your server still has outbound internet access to `github.com` and `ghcr.io`:
1. **GitHub Actions** builds the image on every push to `main` and updates `ghcr.io/<your-username>/<repo-name>:latest`.
2. **Dockhand** (running inside your server) polls `ghcr.io` outbound on its schedule, detects the new `:latest` image digest via the `"dockhand.auto-update=true"` label in `docker-compose.yml`, pulls the new image, and recreates the `patho3d-atlas` container automatically.
3. **Arcane** can also sync `docker-compose.yml` outbound from your public GitHub URL (`https://github.com/<your-username>/<repo>.git`) on a polling interval without needing inbound webhooks.

### Option B: Instant Webhook Over NetBird (Optional)
If you want GitHub Actions to trigger your private NetBird webhook URL (`http://100.x.y.z:...`) the exact second a build finishes:
1. In your NetBird dashboard, create a reusable, ephemeral **Setup Key** (with auto-offload/ephemeral peer enabled) and assign it to a group that can reach your server's Dockhand/Arcane port.
2. Add these secrets in your GitHub repository (**Settings $\rightarrow$ Secrets and variables $\rightarrow$ Actions**):
   - `NETBIRD_SETUP_KEY`: Your ephemeral NetBird setup key.
   - `NETBIRD_MANAGEMENT_URL`: Your self-hosted NetBird management URL (e.g., `https://netbird.yourdomain.com:443`).
   - `DEPLOY_WEBHOOK_URL`: Your private NetBird webhook URL (e.g., `http://100.x.y.z:.../api/webhooks/...`).
3. `.github/workflows/ghcr-deploy.yml` uses `Alemiz112/netbird-connect@v1` with `setup-key`, `management-url`, and `hostname: 'gha-patho3d-deployer'` to connect the runner to your NetBird mesh and trigger your private webhook automatically.

---

## Step-by-Step Setup

1. **Export to a Public GitHub Repository**:
   - Export this project from AI Studio to a public GitHub repo.
   - Once the first GitHub Action finishes, go to your GitHub repo's **Packages** sidebar $\rightarrow$ click the package $\rightarrow$ **Package settings** $\rightarrow$ change visibility to **Public** so your server can pull without credentials.
2. **Deploy in Arcane (Connected via NetBird)**:
   - Open your Arcane UI over NetBird and create a new **Stack** using `docker-compose.yml` (or Git sync from your public GitHub repo URL).
   - Set these Stack Environment Variables in Arcane:
     ```env
     GITHUB_REPOSITORY=your-github-username/patho3d
     GEMINI_API_KEY=your_actual_gemini_api_key_here
     HOST_PORT=3000
     ```
3. **Verify Health**:
   - Over NetBird (or via your reverse proxy), check:
     ```bash
     curl http://<server-netbird-ip>:3000/api/health
     ```
