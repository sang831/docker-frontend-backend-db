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
