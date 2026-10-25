# Frontend

The frontend uses React, Vite, and Vitest.

- `npm run dev` starts the development server on port 3000.
- `npm test` runs the frontend tests.
- `npm run build` creates the production bundle in `dist/`.

Set `VITE_API_URL` at build time when the API is hosted separately. Otherwise, the app calls `/api` on the same host.
