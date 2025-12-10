# Email to Atlas Recovery CIO

---

**To:** CIO, Atlas Recovery  
**From:** CollectWise Engineering Team  
**Subject:** New Feature: AI Agent Can Now Look Up Accounts by Account Number

---

Hi,

I'm pleased to let you know that our AI agent can now look up debtor accounts by **account number** in addition to phone number. This should make account verification faster and more flexible during calls.

## How It Works

1. **You upload a CSV file** (`atlas_inventory.csv`) containing your debtor records
2. **We process and store the data** in our system, validating each record
3. **The AI agent queries accounts** by account number during calls, instantly retrieving debtor name, balance, status, and other details

The lookup typically returns results in under 50 milliseconds, so there's no noticeable delay for callers.

## CSV File Requirements

To ensure smooth uploads, please make sure your CSV files follow these guidelines:

### Required Columns
- **`account_number`** — Must be present and unique for each account. Rows missing this field will be skipped.

### Optional Columns
- `debtor_name`
- `phone_number`
- `balance` (must be numeric; rows with invalid values like "N/A" will be skipped)
- `status`
- `client_name`

### What Happens with Duplicates?

If your CSV contains the same account number multiple times, **the last occurrence wins**. This also applies across uploads—uploading new data for an existing account will update the record. This means you can send corrections simply by re-uploading.

### Rows That Get Skipped

Our system will skip (and log) any rows that:
- Are missing an `account_number`
- Have a non-numeric value in the `balance` column (like "TBD" or blank with quotes)

You'll receive a summary after each upload showing how many records were processed, inserted, updated, and skipped.

## What You Need to Do

1. **Prepare your CSV** with the columns listed above (header row required)
2. **Ensure account numbers are unique** within each file
3. **Use numeric values for balance** (e.g., `1250.00` not `$1,250`)
4. **Upload periodically** as your inventory changes

If you have questions about formatting or run into any issues with an upload, feel free to reach out and we can help troubleshoot.

## Next Steps

We can schedule a quick call to walk through a test upload if that would be helpful. Otherwise, you should be ready to start using the new lookup capability right away.

Best regards,

**CollectWise Engineering Team**
