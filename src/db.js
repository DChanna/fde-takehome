const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'collectwise.db');

let db = null;

/**
 * Initialize the SQLite database with schema
 */
async function initDb() {
  if (db) return db;

  const SQL = await initSqlJs();
  
  // Load existing database or create new one
  if (fs.existsSync(DB_PATH)) {
    const buffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  // Create accounts table if it doesn't exist
  db.run(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_number TEXT UNIQUE NOT NULL,
      debtor_name TEXT,
      phone_number TEXT,
      balance REAL,
      status TEXT,
      client_name TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  // Create index on account_number for faster lookups
  db.run(`
    CREATE INDEX IF NOT EXISTS idx_account_number ON accounts(account_number)
  `);

  saveDb();
  return db;
}

/**
 * Save the database to disk
 */
function saveDb() {
  if (!db) return;
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_PATH, buffer);
}

/**
 * Get the database instance
 */
function getDb() {
  if (!db) {
    throw new Error('Database not initialized. Call initDb() first.');
  }
  return db;
}

/**
 * Upsert an account record (insert or update on conflict)
 */
function upsertAccount(account) {
  const stmt = db.prepare(`
    INSERT INTO accounts (account_number, debtor_name, phone_number, balance, status, client_name, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(account_number) DO UPDATE SET
      debtor_name = excluded.debtor_name,
      phone_number = excluded.phone_number,
      balance = excluded.balance,
      status = excluded.status,
      client_name = excluded.client_name,
      updated_at = datetime('now')
  `);
  
  stmt.run([
    account.account_number,
    account.debtor_name || null,
    account.phone_number || null,
    account.balance,
    account.status || null,
    account.client_name || null
  ]);
  
  stmt.free();
  saveDb();
}

/**
 * Find an account by account number
 */
function findAccountByNumber(accountNumber) {
  const stmt = db.prepare('SELECT * FROM accounts WHERE account_number = ?');
  stmt.bind([accountNumber]);
  
  let result = null;
  if (stmt.step()) {
    const row = stmt.getAsObject();
    result = {
      account_number: row.account_number,
      debtor_name: row.debtor_name,
      phone_number: row.phone_number,
      balance: row.balance,
      status: row.status,
      client_name: row.client_name
    };
  }
  
  stmt.free();
  return result;
}

/**
 * Get count of all accounts
 */
function getAccountCount() {
  const result = db.exec('SELECT COUNT(*) as count FROM accounts');
  return result[0]?.values[0][0] || 0;
}

module.exports = {
  initDb,
  getDb,
  saveDb,
  upsertAccount,
  findAccountByNumber,
  getAccountCount
};
