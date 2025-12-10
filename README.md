# CollectWise Account Lookup Service

A lightweight Node.js service that enables Atlas Recovery's AI agent to look up debtor accounts by account number. This service ingests CSV files containing account data and exposes a REST API for account lookups.

## Quick Start

```bash
# Install dependencies
npm install

# Ingest the CSV file
npm run ingest

# Start the API server
npm start
```

## Project Structure

```
collectwise/
├── src/
│   ├── db.js          # Database initialization and queries
│   ├── ingest.js      # CSV ingestion script
│   └── server.js      # Express API server
├── atlas_inventory.csv # Sample CSV file
├── package.json
└── README.md
```

## 1. CSV Ingestion

### Running the Ingestion Script

```bash
# Ingest the default file (atlas_inventory.csv)
npm run ingest

# Or specify a custom CSV path
node src/ingest.js /path/to/your/file.csv
```

### Expected CSV Format

The CSV file must include a header row. Required and optional columns:

| Column | Required | Description |
|--------|----------|-------------|
| `account_number` | **Yes** | Unique identifier for the account |
| `debtor_name` | No | Name of the debtor |
| `phone_number` | No | Contact phone number |
| `balance` | No | Outstanding balance (must be numeric) |
| `status` | No | Account status (e.g., Active, Closed) |
| `client_name` | No | Name of the client who owns the debt |

### Validation Rules

- **`account_number`**: Must be present and non-empty. Rows without a valid account number are skipped.
- **`balance`**: If provided, must be a valid number. Rows with non-numeric balances are skipped. Defaults to 0 if not provided.
- All other fields are optional and will be stored as-is (trimmed of whitespace).

### Duplicate Handling

**Strategy: UPSERT (Update on Conflict)**

When a duplicate `account_number` is encountered:
- **Within the same CSV file**: Later rows overwrite earlier rows
- **Across multiple uploads**: New data overwrites existing records

This approach was chosen because:
1. It supports incremental updates (upload a CSV with corrections)
2. It's idempotent (running the same CSV twice produces the same result)
3. It ensures the database always reflects the latest uploaded data

---

## 2. Account Lookup API

### Starting the Server

```bash
npm start
```

The server runs on port 3000 by default. Set the `PORT` environment variable to change it:

```bash
PORT=8080 npm start
```

### API Endpoints

#### Health Check
```
GET /health
```
Response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Database Statistics
```
GET /stats
```
Response:
```json
{
  "total_accounts": 10,
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

#### Account Lookup (Path Parameter)
```
GET /accounts/:accountNumber
```
Example:
```bash
curl http://localhost:3000/accounts/ACC001
```
Success Response (200):
```json
{
  "account_number": "ACC001",
  "debtor_name": "John Smith",
  "phone_number": "555-123-4567",
  "balance": 1250.00,
  "status": "Active",
  "client_name": "Acme Medical"
}
```
Not Found Response (404):
```json
{
  "error": "Not Found",
  "message": "Account with number 'ACC999' does not exist"
}
```

#### Account Lookup (Query Parameter)
```
GET /accounts?account_number=ACC001
```
Returns the same response format as the path parameter version.

---

## 3. Deployment

### Option A: Local Development
```bash
npm install
npm run ingest
npm start
```

### Option B: Deploy to Render.com (Free Tier)

1. Push code to a GitHub repository
2. Create a new "Web Service" on [Render](https://render.com)
3. Connect your GitHub repo
4. Configure:
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment**: Node
5. Deploy and note your public URL (e.g., `https://your-app.onrender.com`)

### Option C: Deploy to Railway

1. Install Railway CLI: `npm install -g @railway/cli`
2. Run: `railway login && railway init && railway up`
3. Get your public URL from the Railway dashboard

### Option D: Deploy to Fly.io

1. Install flyctl and authenticate
2. Run: `fly launch` and follow prompts
3. Deploy with: `fly deploy`

---

## Design Decisions

### Why SQLite?
- Zero configuration required
- Perfect for prototyping and small-to-medium datasets
- Easy to migrate to PostgreSQL later if needed

### Why UPSERT for Duplicates?
- Allows Atlas Recovery to send corrected data in subsequent uploads
- No manual intervention needed for updates
- Predictable behavior: latest data wins

### Why sql.js Instead of better-sqlite3?
- Pure JavaScript implementation (no native compilation)
- Works in any Node.js environment without build tools
- Trades some performance for portability

---

## Edge Cases Handled

| Scenario | Behavior |
|----------|----------|
| Missing `account_number` | Row skipped, logged as error |
| Non-numeric `balance` | Row skipped, logged as error |
| Duplicate `account_number` in CSV | Later row overwrites earlier |
| Duplicate `account_number` in DB | Existing record updated |
| Empty CSV file | No records inserted, success message |
| Malformed CSV | Parsing error reported |
| Account not found via API | 404 response with clear message |

---

## Testing the Integration

```bash
# 1. Start fresh
rm -f collectwise.db

# 2. Ingest sample data
npm run ingest

# 3. Start the server (in a separate terminal)
npm start

# 4. Test lookups
curl http://localhost:3000/accounts/ACC001
curl http://localhost:3000/accounts/NONEXISTENT
curl http://localhost:3000/health
curl http://localhost:3000/stats
```
