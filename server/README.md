# Backend API (local)

This repo includes a tiny local Node server to make the dashboard data dynamic (flows, runs, logs) without requiring external infrastructure.

- Starts on `http://localhost:8787`
- Persists data to `server/data/*.json`
- Exposes REST endpoints under `/api/*`

Run it:

1. `npm run server`
2. In another terminal: `npm run dev`

Or run both together: `npm run dev:full`

