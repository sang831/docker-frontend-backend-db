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

Compose builds the frontend into static files served by Nginx. Nginx forwards `/api` requests to the API over the private Compose network, so the browser does not need to resolve a container hostname or connect to a separately published API port. Only the frontend is published on `127.0.0.1:3000`; MongoDB and the API stay on the private Compose network. MongoDB stores data in the `mongodb_data` named volume. `docker compose down` preserves that volume; do not add `--volumes` unless you intend to erase the database. Keep `.env` out of Git. For a server deployment, terminate HTTPS at the host reverse proxy.

## Checks

Run `npm test` and `npm run build` in `frontend`, and `npm test` in `backend`.

## Continuous integration

GitHub Actions runs the backend and frontend tests, builds the frontend, validates the Compose configuration, and builds the Docker images on each push and pull request. It can also be started manually from the Actions tab. CI uses temporary test credentials only; configure production secrets on the Linux server during the CD step.

## Continuous deployment to Linux

The `CD` workflow deploys only after the `CI` workflow succeeds for a push to `master`. It checks out that exact tested commit, copies the application to the server over SSH, runs `docker compose up --build -d`, and waits for `http://127.0.0.1:3000/api/health` to report a healthy API and database. The transfer preserves the server's root `.env`; it does not put production credentials in GitHub or overwrite that file. Failed health checks fail the deployment job and print recent Compose logs. To roll back, revert the bad commit on `master`; CI and CD will deploy the reverted version.

### Prepare the Linux server

1. Install Docker Engine with the Compose plugin, `rsync`, and `curl`. Make sure the deploy account can run Docker commands and can write to the deployment directory.
2. Create a dedicated deployment directory, for example `/opt/todo-app`, and create its production `.env` using `.env.example` as a reference. Set strong production credentials and keep the file on the server. The directory and `.env` must already exist before the first CD run.
3. Allow inbound SSH from GitHub-hosted runners (or use a self-hosted runner if your firewall restricts SSH by source IP). Keep the app behind a host reverse proxy that forwards to `127.0.0.1:3000`; expose HTTPS, not the MongoDB or API ports.
4. Create a dedicated SSH key for deployment. Install only its public key in the server deploy account's `authorized_keys`. Verify the server host-key fingerprint through a trusted channel before adding the matching `ssh-keyscan -H -p 22 SERVER_HOST` output to GitHub.

### Configure GitHub

Create a GitHub Actions environment named `production` in repository settings. Add these environment secrets and variables; never paste private keys or `.env` values into the workflow file:

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `DEPLOY_SSH_PRIVATE_KEY` | Private half of the dedicated deploy key |
| Secret | `DEPLOY_KNOWN_HOSTS` | Verified SSH host-key line(s) for the server |
| Variable | `DEPLOY_HOST` | Server hostname or IPv4 address |
| Variable | `DEPLOY_USER` | Linux deploy account |
| Variable | `DEPLOY_PORT` | SSH port; defaults to `22` if blank |
| Variable | `DEPLOY_PATH` | Absolute deployment directory, e.g. `/opt/todo-app` |

Restrict the `production` environment to the `master` branch. You can also add required reviewers so a successful CI run waits for approval before deploying. Once these values and the server directory are ready, pushing a commit to `master` starts CI; CD follows only when CI succeeds. The `CD` job does not run for pull requests or failed CI runs.
