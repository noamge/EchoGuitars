/**
 * Snapshot backup: dumps every tab of the Google Sheet to a timestamped JSON
 * file under backend/backups/, as a fast local restore point before risky
 * changes (bulk edits, ID repairs, schema tweaks, etc).
 *
 * Google Sheets also keeps its own automatic version history (File > Version
 * history, or Ctrl+Alt+Shift+H in the browser) covering every change, including
 * ones made via this app's API — that already lets you roll the whole sheet
 * back to any point in time with no setup. This script is just a faster local
 * copy for when you want to sanity-check without leaving the terminal.
 *
 * Run manually: node scripts/backupSheet.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

async function main() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_ID,
    fields: 'sheets.properties.title',
  });
  const tabNames = meta.data.sheets.map(s => s.properties.title);

  const snapshot = {};
  for (const tab of tabNames) {
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: tab,
    });
    snapshot[tab] = res.data.values || [];
  }

  const backupsDir = path.join(__dirname, '../backups');
  if (!fs.existsSync(backupsDir)) fs.mkdirSync(backupsDir);

  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const filePath = path.join(backupsDir, `sheet-backup-${ts}.json`);
  fs.writeFileSync(filePath, JSON.stringify(snapshot, null, 2));

  console.log(`✅ Backed up ${tabNames.length} tabs to ${filePath}`);
  for (const tab of tabNames) {
    console.log(`   - ${tab}: ${snapshot[tab].length} rows`);
  }
}

main().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
