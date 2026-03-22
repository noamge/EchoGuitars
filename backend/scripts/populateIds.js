/**
 * One-time script: populates the ID column (column U, index 20)
 * for all existing rows that don't have an ID yet.
 *
 * Run once: node scripts/populateIds.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { google } = require('googleapis');

const SHEET_TAB = 'גיליון1';
const SHEET_ID  = process.env.GOOGLE_SHEET_ID;
const ID_COL    = 'U';

async function main() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  // Read column A to count how many data rows exist
  const rowsRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_TAB}!A2:A`,
  });
  const totalRows = (rowsRes.data.values || []).length;
  console.log(`Found ${totalRows} data rows.`);

  // Read existing IDs in column U
  const idRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_TAB}!${ID_COL}2:${ID_COL}`,
  });
  const existingIds = idRes.data.values || [];

  const updates = [];
  for (let i = 0; i < totalRows; i++) {
    const sheetRow = i + 2; // row 2 = first data row
    const currentId = existingIds[i]?.[0];
    if (!currentId) {
      updates.push({
        range: `${SHEET_TAB}!${ID_COL}${sheetRow}`,
        values: [[sheetRow]],
      });
    }
  }

  if (updates.length === 0) {
    console.log('✅ All rows already have IDs. Nothing to do.');
    return;
  }

  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { valueInputOption: 'RAW', data: updates },
  });

  console.log(`✅ Assigned IDs to ${updates.length} rows.`);
}

main().catch(err => { console.error('❌ Error:', err.message); process.exit(1); });
