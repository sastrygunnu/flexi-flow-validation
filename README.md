# Validly (Hackathon)

Vite + React dashboard for configuring validation flows (KYC/identity/address/fraud), simulating runs, and inspecting per-step logs and nanopayment receipts.

This repo now includes a small local backend so flows/runs/logs are **dynamic and persisted** (no more hard-coded mock data).

## Run locally

From `flexi-flow-validation/`:

- Backend API: `npm run server` (defaults to `http://localhost:8787`)
- Frontend: `npm run dev` (defaults to `http://localhost:8080`)
- Both together: `npm run dev:full`

Frontend can point at the API with `VITE_API_URL` (defaults to `http://localhost:8787`).

## What’s dynamic

- Flows are created/updated via `/api/flows` and stored in `server/data/flows.json`
- “Run sample” creates a flow run via `/api/runs`, generating step logs + payment receipts in `server/data/{runs,logs}.json`
- Dashboard tabs pull from the API (runs/logs/analytics) instead of `generateMockLogs`

## Circle / Arc integration points

The backend supports **real x402 settlement via Circle Gateway on Arc testnet** when configured, and falls back to **mock** nanopayment receipts otherwise.

### Enable real settlement (Arc + USDC + Gateway x402)

Set these in `flexi-flow-validation/.env` (never commit it):

- `CIRCLE_API_KEY`
- `CIRCLE_ENTITY_SECRET`
- `PAYER_WALLET_ID`
- `PAY_TO_ADDRESS`

Helpers:

- Encrypt entity secret for Console registration: `npm run circle:encrypt-entity-secret -- --pem entity-public-key.pem`
- Create wallet set + wallets: `npm run circle:create-wallet -- --count 2`

With that in place, `/api/runs` will attempt to settle each paid step via Circle Gateway `POST /v1/x402/settle` and store the returned transfer id in the log receipt.

Next step to improve receipts is subscribing to transfer status (webhooks) and mapping batch confirmations to an onchain tx hash.

### Integration notes

- **Arc (settlement layer)**: submit/verify settlement tx hashes
- **USDC**: represent value + (on Arc) gas token semantics
- **Circle Nanopayments / x402**: perform per-request settlement and return a verifiable receipt to the UI

See `server/README.md` for the local API.
