#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const { initDb, upsertAccount, getAccountCount, saveDb } = require('./db');

// Configuration
const DEFAULT_CSV_PATH = path.join(__dirname, '..', 'atlas_inventory.csv');
const REQUIRED_COLUMNS = ['account_number'];

/**
 * Validate a single row of CSV data
 * Returns { valid: boolean, errors: string[], data: object }
 */
function validateRow(row, rowNumber) {
  const errors = [];
  const data = {};

  // Check for required account_number
  if (!row.account_number || row.account_number.trim() === '') {
    errors.push(`Row ${rowNumber}: Missing required field 'account_number'`);
    return { valid: false, errors, data: null };
  }

  data.account_number = row.account_number.trim();

  // Validate and parse balance (must be numeric if present)
  if (row.balance !== undefined && row.balance !== '') {
    const balance = parseFloat(row.balance);
    if (isNaN(balance)) {
      errors.push(`Row ${rowNumber}: Invalid balance '${row.balance}' - must be numeric`);
      return { valid: false, errors, data: null };
    }
    data.balance = balance;
  } else {
    data.balance = 0; // Default to 0 if not provided
  }

  // Copy other fields (with trimming)
  data.debtor_name = row.debtor_name?.trim() || null;
  data.phone_number = row.phone_number?.trim() || null;
  data.status = row.status?.trim() || null;
  data.client_name = row.client_name?.trim() || null;

  return { valid: true, errors: [], data };
}

/**
 * Process the CSV file and ingest records into the database
 */
async function ingestCSV(csvPath) {
  console.log('='.repeat(60));
  console.log('CollectWise CSV Ingestion');
  console.log('='.repeat(60));
  
  // Check if file exists
  if (!fs.existsSync(csvPath)) {
    console.error(`\n❌ Error: CSV file not found at '${csvPath}'`);
    console.log('\nUsage: npm run ingest [path/to/csv]');
    console.log('       Default path: atlas_inventory.csv\n');
    process.exit(1);
  }

  console.log(`\n📂 Processing: ${csvPath}`);

  // Initialize database
  await initDb();
  const countBefore = getAccountCount();

  // Track statistics
  const stats = {
    total: 0,
    inserted: 0,
    updated: 0,
    skipped: 0,
    errors: []
  };

  // Track seen account numbers to detect duplicates within the file
  const seenAccounts = new Set();

  return new Promise((resolve, reject) => {
    const parser = fs
      .createReadStream(csvPath)
      .pipe(parse({
        columns: true,           // Use first row as headers
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true // Handle rows with inconsistent column counts
      }));

    parser.on('data', (row) => {
      stats.total++;
      const rowNumber = stats.total + 1; // +1 for header row

      // Validate the row
      const validation = validateRow(row, rowNumber);
      
      if (!validation.valid) {
        stats.skipped++;
        stats.errors.push(...validation.errors);
        return;
      }

      const { data } = validation;

      // Check for duplicate within the file itself
      const isDuplicate = seenAccounts.has(data.account_number);
      seenAccounts.add(data.account_number);

      try {
        // Upsert handles DB-level duplicates (updates existing records)
        upsertAccount(data);
        
        if (isDuplicate) {
          stats.updated++;
        } else {
          stats.inserted++;
        }
      } catch (err) {
        stats.skipped++;
        stats.errors.push(`Row ${rowNumber}: Database error - ${err.message}`);
      }
    });

    parser.on('error', (err) => {
      console.error(`\n❌ CSV parsing error: ${err.message}`);
      reject(err);
    });

    parser.on('end', () => {
      saveDb();
      const countAfter = getAccountCount();
      
      // Print results
      console.log('\n📊 Ingestion Results:');
      console.log('-'.repeat(40));
      console.log(`   Total rows processed: ${stats.total}`);
      console.log(`   New records inserted: ${stats.inserted}`);
      console.log(`   Records updated:      ${stats.updated}`);
      console.log(`   Rows skipped:         ${stats.skipped}`);
      console.log('-'.repeat(40));
      console.log(`   DB records before:    ${countBefore}`);
      console.log(`   DB records after:     ${countAfter}`);

      if (stats.errors.length > 0) {
        console.log('\n⚠️  Validation Errors:');
        stats.errors.forEach(err => console.log(`   • ${err}`));
      }

      console.log('\n✅ Ingestion complete!\n');
      resolve(stats);
    });
  });
}

// Main execution
const csvPath = process.argv[2] || DEFAULT_CSV_PATH;
ingestCSV(csvPath).catch(err => {
  console.error('Ingestion failed:', err);
  process.exit(1);
});
