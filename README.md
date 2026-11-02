# Todo app

React frontend, Express API, and MongoDB data store. The API requires one administrator account configured with environment variables. It sets an HTTP-only, SameSite cookie after login; the cookie expires after eight hours.

## Run locally

Requirements: Node.js 20.19 or newer, npm, and a reachable MongoDB instance.

1. Copy `backend/.env.example` to `backend/.env` and set a unique username and password of at least 12 characters. Generate `JWT_SECRET` with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`. The API refuses to start if credentials are missing or secrets are too short. Keep `backend/.env` private and out of Git.
2. In `backend`, run `npm ci` and `npm start`.
3. In `frontend`, run `npm ci` and `npm run dev`.
4. Open `http://localhost:3000`. The frontend calls the local API at `http://localhost:3001/api` during development.

The production frontend defaults to `/api` on the same host. If the API uses a separate host, set `VITE_API_URL` when building the frontend. Configure `FRONTEND_ORIGINS` on the API to the exact frontend origin(s).

## Run with Docker Compose

1. Copy the project-root `.env.example` to `.env`. Set a password of at least 12 characters for `APP_PASSWORD`, generate a random `JWT_SECRET` of at least 32 characters, and set a strong `MONGO_ROOT_PASSWORD`. Generate a secret with `node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"`.
2. Start the stack with `docker compose up --build -d`.
3. Open `http://localhost:3000`; the API health endpoint is proxied through `http://localhost:3000/api/health`.

Compose builds the frontend into static files served by Nginx. Nginx forwards `/api` requests to the API over the private Compose network, so the browser does not need to resolve a container hostname or connect to a separately published API port. The web service is published at host port `3000`; MongoDB and the API stay on the private Compose network. On a Linux server, block inbound port `3000` at the firewall and terminate HTTPS at the host reverse proxy. MongoDB stores data in the `mongodb_data` named volume. `docker compose down` preserves that volume; do not add `--volumes` unless you intend to erase the database. Keep `.env` out of Git.

## Checks

Run `npm test` and `npm run build` in `frontend`, and `npm test` in `backend`.

## Continuous integration

GitHub Actions runs the backend and frontend tests, builds the frontend and Docker images, validates the Compose configuration, and starts the Compose stack for a web-to-API health smoke test on each push and pull request. It can also be started manually from the Actions tab. CI uses temporary test credentials only. The workflow actions are pinned to reviewed commit SHAs.

## Continuous deployment to Linux

The `CD` workflow deploys only after the `CI` workflow succeeds for a push to `master`. It skips a tested commit if `master` has since advanced, then checks out the current tested commit, connects to the server over Tailscale and SSH, copies the application, runs `docker compose up --build -d`, and waits for `http://127.0.0.1:3000/api/health`. SSH host verification uses only the host key stored in `DEPLOY_KNOWN_HOSTS`; the workflow never accepts a newly scanned key. The server's root `.env` remains on the server and is not transferred by rsync or generated from GitHub secrets. If a new release fails its health check and a previous release exists, CD restores the previous source and starts it again; the workflow still reports failure so the bad release can be investigated. A failed first deployment has no release to roll back to. The application data volume is preserved. Reverting a bad commit on `master` is also supported.

### Prepare the Linux server

1. Install Docker Engine with the Compose plugin, `rsync`, and `curl`. Make sure the deploy account can run Docker commands and can write to the deployment directory.
2. Create a dedicated deployment directory, for example `/opt/todo-app`, and create its production `.env` using `.env.example` as a reference. Set strong production credentials, run `chmod 600 .env`, and keep the file on the server. The directory and `.env` must already exist before the first CD run. Compose sets `NODE_ENV=production` for the API so session cookies use the `Secure` attribute; serve the app through HTTPS.
3. Keep the app behind a host reverse proxy that forwards to `127.0.0.1:3000`. Block inbound TCP port `3000` at the server/provider firewall; publish HTTPS through the reverse proxy. Keep MongoDB and API ports private.
4. Create a dedicated SSH key for deployment. Install only its public key in the server deploy account's `authorized_keys`. Configure the deploy account's SSH service to be reachable over Tailscale and restrict the runner's Tailscale access with a tag-based ACL. For the `TAILSCALE` secret, use a tagged, reusable, ephemeral auth key and grant the tag access only to this server's SSH port.
5. Verify the SSH host-key fingerprint through a trusted channel. Store the matching `known_hosts` line for the exact `DEPLOY_HOST` and `DEPLOY_PORT` in GitHub; the workflow enforces strict host-key checking and does not trust a newly scanned key automatically.

### Configure GitHub

Create a GitHub Actions environment named `production` in repository settings. Add these environment secrets and variables; never paste private keys or `.env` values into the workflow file:

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `DEPLOY_SSH_PRIVATE_KEY` | Private half of the dedicated deploy key |
| Secret | `DEPLOY_KNOWN_HOSTS` | Verified SSH host-key line(s) matching the host and port below |
| Secret | `TAILSCALE` | Tailscale auth key; use a tagged, reusable, ephemeral key with the minimum ACL permissions |
| Variable | `DEPLOY_HOST` | Server's Tailscale IP or MagicDNS hostname |
| Variable | `DEPLOY_USER` | Linux deploy account |
| Variable | `DEPLOY_PORT` | SSH port; defaults to `22` if blank |
| Variable | `DEPLOY_PATH` | Absolute deployment directory, e.g. `/opt/todo-app` |

Keep `APP_USERNAME`, `APP_PASSWORD`, `JWT_SECRET`, `MONGO_ROOT_USERNAME`, and `MONGO_ROOT_PASSWORD` in the server's `.env`; do not create GitHub Actions variables or secrets for them. Restrict the `production` environment to the `master` branch. You can add required reviewers so a successful CI run waits for approval before deployment. Once the environment settings and server directory are ready, pushing a commit to `master` starts CI; CD follows only when CI succeeds. The `CD` job does not run for pull requests or failed CI runs.
