/**
 * fixOutOfTableRows.js
 * Extends the banded range (table formatting) in גיליון1 to cover ALL data rows.
 * Run once: node scripts/fixOutOfTableRows.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { google } = require('googleapis');

const SHEET_TAB = 'גיליון1';
const SHEET_ID  = process.env.GOOGLE_SHEET_ID;

async function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
}

async function run() {
  const auth   = await getAuth();
  const sheets = google.sheets({ version: 'v4', auth });

  // 1. Get sheet metadata: find the tab's sheetId and current banded ranges
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: SHEET_ID,
    fields: 'sheets(properties,bandedRanges)',
  });

  const tab = meta.data.sheets.find(s => s.properties.title === SHEET_TAB);
  if (!tab) { console.error(`Sheet "${SHEET_TAB}" not found`); process.exit(1); }

  const tabId       = tab.properties.sheetId;
  const bandedRanges = tab.bandedRanges || [];

  // 2. Count data rows (read column B = Name, find last non-empty)
  const dataRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SHEET_ID,
    range: `${SHEET_TAB}!B2:B`,
  });
  const nameRows = dataRes.data.values || [];
  let lastDataRow = 1;
  for (let i = 0; i < nameRows.length; i++) {
    if (nameRows[i][0] && nameRows[i][0].trim()) lastDataRow = i + 2; // 1-based
  }
  console.log(`Last data row with a name: ${lastDataRow}`);

  if (bandedRanges.length === 0) {
    console.log('No banded ranges found — nothing to extend. The table may use a different formatting.');
    console.log('Tip: manually select all rows in Google Sheets and apply alternating colors.');
    return;
  }

  // 3. Extend each banded range that covers the data area
  const requests = [];
  for (const br of bandedRanges) {
    const range   = br.range;
    const brId    = br.bandedRangeId;
    const currEnd = range.endRowIndex; // exclusive, 0-based → last row = currEnd-1 (1-based)
    const needed  = lastDataRow + 1;   // exclusive end needed (0-based)

    console.log(`Banded range #${brId}: rows ${range.startRowIndex}–${currEnd} (0-based)`);

    if (currEnd >= needed) {
      console.log(`  → Already covers row ${lastDataRow}. No change needed.`);
      continue;
    }

    console.log(`  → Extending to row index ${needed} (covers up to sheet row ${lastDataRow})`);
    requests.push({
      updateBanding: {
        bandedRange: {
          bandedRangeId: brId,
          range: { ...range, endRowIndex: needed },
        },
        fields: 'range.endRowIndex',
      },
    });
  }

  if (requests.length === 0) {
    console.log('Nothing to update.');
    return;
  }

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SHEET_ID,
    requestBody: { requests },
  });

  console.log('✅ Done! Banded range extended to cover all data rows.');
}

run().catch(err => { console.error('Error:', err.message); process.exit(1); });
