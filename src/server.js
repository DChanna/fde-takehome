#!/usr/bin/env node

const express = require('express');
const { initDb, findAccountByNumber, getAccountCount } = require('./db');
const { ingestCSV, DEFAULT_CSV_PATH } = require('./ingest');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware for JSON responses
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Stats endpoint - useful for debugging
app.get('/stats', async (req, res) => {
  try {
    const count = getAccountCount();
    res.json({ 
      total_accounts: count,
      timestamp: new Date().toISOString()
    });
  } catch (err) {
    res.status(500).json({ error: 'Database error', message: err.message });
  }
});

/**
 * GET /accounts/:accountNumber
 * Look up an account by account number
 */
app.get('/accounts/:accountNumber', (req, res) => {
  const { accountNumber } = req.params;

  // Validate input
  if (!accountNumber || accountNumber.trim() === '') {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Account number is required'
    });
  }

  try {
    const account = findAccountByNumber(accountNumber.trim());

    if (!account) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Account with number '${accountNumber}' does not exist`
      });
    }

    // Return the account data
    res.json({
      account_number: account.account_number,
      debtor_name: account.debtor_name,
      phone_number: account.phone_number,
      balance: account.balance,
      status: account.status,
      client_name: account.client_name
    });

  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while looking up the account'
    });
  }
});

/**
 * Alternative: GET /accounts?account_number=...
 * Query string based lookup
 */
app.get('/accounts', (req, res) => {
  const accountNumber = req.query.account_number;

  // If no query param, return helpful message
  if (!accountNumber) {
    return res.status(400).json({
      error: 'Bad Request',
      message: 'Please provide an account_number query parameter',
      example: '/accounts?account_number=ACC001'
    });
  }

  try {
    const account = findAccountByNumber(accountNumber.trim());

    if (!account) {
      return res.status(404).json({
        error: 'Not Found',
        message: `Account with number '${accountNumber}' does not exist`
      });
    }

    res.json({
      account_number: account.account_number,
      debtor_name: account.debtor_name,
      phone_number: account.phone_number,
      balance: account.balance,
      status: account.status,
      client_name: account.client_name
    });

  } catch (err) {
    console.error('Database error:', err);
    res.status(500).json({
      error: 'Internal Server Error',
      message: 'An error occurred while looking up the account'
    });
  }
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({
    error: 'Not Found',
    message: `Route ${req.method} ${req.path} not found`,
    available_endpoints: [
      'GET /health',
      'GET /stats',
      'GET /accounts/:accountNumber',
      'GET /accounts?account_number=...'
    ]
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: 'An unexpected error occurred'
  });
});

// Start server
async function start() {
  try {
    await initDb();
    const csvPath = process.env.CSV_PATH || DEFAULT_CSV_PATH;
    console.log(`Auto-ingesting CSV at startup from ${csvPath}`);
    await ingestCSV(csvPath);
    console.log('✅ Database initialized');
    
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`\n🚀 CollectWise API Server running at http://localhost:${PORT}`);
      console.log('\nAvailable endpoints:');
      console.log(`  GET /health                         - Health check`);
      console.log(`  GET /stats                          - Database statistics`);
      console.log(`  GET /accounts/:accountNumber        - Look up by account number`);
      console.log(`  GET /accounts?account_number=...    - Alternative lookup\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
