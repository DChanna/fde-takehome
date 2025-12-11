# CollectWise Account Lookup Service

Node.js + SQLite (sql.js) service that ingests Atlas Recovery’s account CSV and exposes a lookup API by `account_number`.

## Setup
```bash
npm install
npm run ingest             # uses atlas_inventory.csv by default
npm start                  # PORT defaults to 3000
```

## What’s Inside (brief)
- `src/db.js` — in-memory SQLite (sql.js) setup, schema, and helpers (`initDb`, `upsertAccount`, `findAccountByNumber`, `getAccountCount`).
- `src/ingest.js` — CSV parser + validation; trims fields, enforces numeric `balance`, UPSERTs into DB, and writes `collectwise.db`.
- `src/server.js` — Express API exposing health, stats, and account lookups (path or query param).
- `atlas_inventory.csv` — sample data used by default for ingestion.

## CSV Ingestion
- Run: `npm run ingest` or `node src/ingest.js /path/to/file.csv`
- Required column: `account_number` (non-empty, unique).
- Optional columns: `debtor_name`, `phone_number`, `balance` (numeric), `status`, `client_name`.
- Validation: rows missing `account_number` or with non-numeric `balance` are skipped.
- Duplicates: later rows (and later uploads) overwrite earlier ones via UPSERT.

## API
- `GET /health`
- `GET /stats`
- `GET /accounts/:accountNumber`
- `GET /accounts?account_number=...`

Example:
```bash
curl http://localhost:3000/accounts/ACC001
```

## Quick Test
```bash
rm -f collectwise.db
npm run ingest
PORT=3000 npm start   # new terminal
curl http://localhost:3000/health
curl http://localhost:3000/accounts/ACC001
```
