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

Compose builds the frontend into static files served by Nginx. Nginx forwards `/api` requests to the API over the private Compose network, so the browser does not need to resolve a container hostname or connect to a separately published API port. The current Compose file publishes the web service on host port `3000`; MongoDB and the API stay on the private Compose network. On a server, restrict direct access to port `3000` with the firewall and terminate HTTPS at the host reverse proxy. MongoDB stores data in the `mongodb_data` named volume. `docker compose down` preserves that volume; do not add `--volumes` unless you intend to erase the database. Keep `.env` out of Git.

## Checks

Run `npm test` and `npm run build` in `frontend`, and `npm test` in `backend`.

## Continuous integration

GitHub Actions runs backend and frontend tests, builds the frontend, validates the Compose configuration, then builds and starts the full stack with temporary credentials. It checks the web page, API health, login, and session-cookie flow. CI runs on pushes and pull requests and can also be started manually. CI credentials are disposable and are never used for production.

## Continuous deployment to Linux

The `CD` workflow deploys only after the `CI` workflow succeeds for a push to `master`. It checks out that exact tested commit, connects to the private server through Tailscale, copies source over SSH, runs `docker compose up --build -d`, and waits for `http://127.0.0.1:3000/api/health` to report a healthy API and database. It requires the server's root `.env` to exist and deliberately preserves it; production application and database passwords stay on the server rather than in GitHub Actions. A failed health check reports failure and prints recent Compose logs, but does not automatically restore the previous image. To roll back, revert the bad commit on `master`; CI and CD will deploy the reverted version.

### Prepare the Linux server

1. Install Docker Engine with the Compose plugin, `rsync`, `curl`, and Tailscale. Join the server to your tailnet. Make sure the deploy account can run Docker commands and write to the deployment directory.
2. Create a dedicated deployment directory under `/opt` or `/srv`, for example `/opt/todo-app`, and create its production `.env` using `.env.example` as a reference. Set strong production credentials, run `chmod 600 .env`, and keep this file on the server. The directory and `.env` must exist before the first CD run.
3. Keep the app behind a host reverse proxy that forwards to `127.0.0.1:3000`; allow public HTTPS through the proxy and restrict direct access to host port `3000` with the firewall. Do not publish MongoDB or the API port.
4. Create a dedicated SSH key for deployment. Install only its public key in the server deploy account's `authorized_keys`. Verify the SSH host-key fingerprint through a trusted channel. Put the matching `known_hosts` entry for the exact `DEPLOY_HOST` and `DEPLOY_PORT` in GitHub; for a non-default port, the entry must use `[DEPLOY_HOST]:DEPLOY_PORT`. Do not generate and trust host keys inside the deploy workflow.

### Configure GitHub

Create a GitHub Actions environment named `production` in repository settings. Add these environment secrets and variables; never paste private keys or `.env` values into the workflow file:

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `DEPLOY_SSH_PRIVATE_KEY` | Private half of the dedicated deploy key |
| Secret | `DEPLOY_KNOWN_HOSTS` | Verified SSH host-key line(s) for the server |
| Secret | `TAILSCALE` | Tailscale auth key for the GitHub runner; use a tagged, reusable, ephemeral key, pre-approved if device approval is enabled, with ACL access limited to this server |
| Variable | `DEPLOY_HOST` | Server hostname or IPv4 address |
| Variable | `DEPLOY_USER` | Linux deploy account |
| Variable | `DEPLOY_PORT` | SSH port; defaults to `22` |
| Variable | `DEPLOY_PATH` | Absolute deployment directory, e.g. `/opt/todo-app` |

Keep `APP_USERNAME`, `APP_PASSWORD`, `JWT_SECRET`, `MONGO_ROOT_USERNAME`, and `MONGO_ROOT_PASSWORD` in the server's `.env`; they are not GitHub Actions variables or secrets in this setup. Remove those values from GitHub Actions if they were added for an earlier deployment workflow. `DEPLOY_HOST` must be the server's Tailscale hostname or IP and match the verified `known_hosts` entry. Restrict the `production` environment to the `master` branch. You can also add required reviewers so a successful CI run waits for approval before deploying. Once these values and the server directory are ready, pushing a commit to `master` starts CI; CD follows only when CI succeeds. The `CD` job does not run for pull requests or failed CI runs.
