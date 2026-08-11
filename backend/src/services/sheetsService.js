const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

const SHEET_TAB        = 'גיליון1';
const COLLECTIONS_TAB  = 'Collections';
const ACTION_LOG_TAB   = 'ActionLog';

// Column indices (0-based) for main guitar sheet (A–W)
const COL = {
  SUBMISSION_TIME: 0,  // A
  NAME:            1,  // B
  PHONE:           2,  // C
  CITY:            3,  // D
  STREET:          4,  // E
  EMAIL:           5,  // F
  GUITAR_TYPE:     6,  // G
  WORKING:         7,  // H
  CASE:            8,  // I
  DEFECT:          9,  // J
  HOW_FOUND:      10,  // K
  EXTRA_DETAILS:  11,  // L
  CONTACT:        12,  // M
  COLLECTION:     13,  // N
  COLLECTED:      14,  // O
  NOTES:          15,  // P
  WHO_REPAIRS:    16,  // Q
  REPAIRED:       17,  // R
  MODEL:          18,  // S
  DONATED_TO:     19,  // T
  ID:             20,  // U
  IMAGE_URL:      21,  // V
  IN_COLLECTION:  22,  // W — volunteer name locking this guitar; empty = available
  // X/Y/Z are reserved for single-cell app metadata (skipped/thanked/verified address IDs) — see loadSkippedAddressIds etc.
  IRRELEVANT:     26,  // AA — donor gave the guitar away elsewhere before we collected it
  SOLD:           27,  // AB — sold instead of donated (after collection)
  SOLD_PRICE:     28,  // AC — sale price in ₪, only meaningful when SOLD is true
};

// Collections sheet column indices (0-based)
const COL_COLL = {
  ID:                     0,  // A
  VOLUNTEER_NAME:         1,  // B
  VOLUNTEER_ADDRESS:      2,  // C
  GUITARS_JSON:           3,  // D — JSON array of {id, name, city, street, phone, status}
  STATUS:                 4,  // E — active | sent | closed
  SENT_TO_ADMIN:          5,  // F — TRUE/FALSE
  CREATED_AT:             6,  // G
  UPDATED_AT:             7,  // H
  VOLUNTEER_ACTIVITY_AT:  8,  // I — bumped only by volunteer-initiated actions, not admin approvals
};

// ActionLog sheet column indices (0-based)
const COL_LOG = {
  TIMESTAMP:   0,  // A
  ACTOR:       1,  // B
  ACTION:      2,  // C
  GUITAR_ID:   3,  // D
  GUITAR_NAME: 4,  // E
  DETAILS:     5,  // F
};

// ── Region mapping ────────────────────────────────────────────────────────────
const CITY_TO_REGION = {
  'חיפה': 'צפון', 'עכו': 'צפון', 'נהריה': 'צפון', 'קריית שמונה': 'צפון',
  'צפת': 'צפון', 'טבריה': 'צפון', 'נצרת': 'צפון', 'עפולה': 'צפון',
  'קריית ביאליק': 'צפון', 'קריית אתא': 'צפון', 'קריית ים': 'צפון',
  'קריית מוצקין': 'צפון', 'קריית טבעון': 'צפון', 'יוקנעם': 'צפון',
  'כרמיאל': 'צפון', 'שפרעם': 'צפון', 'מגדל העמק': 'צפון',
  'בית שאן': 'צפון', 'אור עקיבא': 'צפון', 'זכרון יעקב': 'צפון',
  'פרדס חנה': 'צפון', 'בנימינה': 'צפון', 'כפר ורדים': 'צפון',
  'כרם מהר"ל': 'צפון', "כרם מהר''ל": 'צפון', 'אלון הגליל': 'צפון',
  'אלון אבא': 'צפון', 'יקנעם': 'צפון', "יוק'נעם": 'צפון',
  'מושב כרם מהר"ל': 'צפון',
  'טירת כרמל': 'צפון', 'טירת הכרמל': 'צפון', 'נשר': 'צפון', 'דלית אל-כרמל': 'צפון',
  'קרית חיים': 'צפון', 'קרית ים': 'צפון', 'קרית ביאליק': 'צפון',
  'קרית מוצקין': 'צפון', 'קרית אתא': 'צפון', 'קרית שמונה': 'צפון',
  'רמת ישי': 'צפון', 'אילניה': 'צפון', 'כחל': 'צפון', 'אלוני אבא': 'צפון',
  'כמון': 'צפון', 'יבנאל': 'צפון', 'לבון': 'צפון', 'תל עדשים': 'צפון',
  'יזרעאל': 'צפון', 'מורן': 'צפון', 'שורשים': 'צפון', 'נתיב השיירה': 'צפון',
  'להבות הבשן': 'צפון', 'מעלות': 'צפון', 'מעלות-תרשיחא': 'צפון',
  'שלומי': 'צפון', 'ראש פינה': 'צפון', 'כפר יובל': 'צפון', 'דן': 'צפון',
  'כרם מהרל': 'צפון',
  'נתניה': 'שרון', 'חדרה': 'שרון', 'כפר סבא': 'שרון', 'רעננה': 'שרון',
  'הרצליה': 'שרון', 'רמת השרון': 'שרון', 'הוד השרון': 'שרון',
  'רא"ש העין': 'שרון', 'ראש העין': 'שרון', 'כפר יונה': 'שרון',
  'טייבה': 'שרון', 'קלנסווה': 'שרון', 'פתח תקווה': 'שרון',
  'קדימה צורן': 'שרון', 'קדימה-צורן': 'שרון', 'צורן': 'שרון',
  'תל מונד': 'שרון', 'גבעת עדה': 'שרון', 'חריש': 'שרון',
  'בני דרור': 'שרון', 'עין ורד': 'שרון', 'פורת': 'שרון',
  'נורדיה': 'שרון', 'מתן': 'שרון', 'ארסוף': 'שרון', 'אלישמע': 'שרון',
  'בית הלוי': 'שרון', 'אלפי מנשה': 'שרון', 'פרדסיה': 'שרון',
  'מושב חניאל': 'שרון',
  'תל אביב': 'מרכז', 'תל אביב-יפו': 'מרכז', 'רמת גן': 'מרכז',
  'גבעתיים': 'מרכז', 'בני ברק': 'מרכז', 'בת ים': 'מרכז', 'חולון': 'מרכז',
  'ראשון לציון': 'מרכז', 'נס ציונה': 'מרכז', 'רחובות': 'מרכז',
  'לוד': 'מרכז', 'רמלה': 'מרכז', 'מודיעין': 'מרכז',
  'מודיעין-מכבים-רעות': 'מרכז', 'יהוד': 'מרכז', 'אור יהודה': 'מרכז',
  'אזור': 'מרכז', 'קרית אונו': 'מרכז', 'קריית אונו': 'מרכז', 'גבעת שמואל': 'מרכז',
  'שוהם': 'מרכז', 'שהם': 'מרכז', 'באר יעקב': 'מרכז',
  'גני תקווה': 'מרכז', 'אפק': 'מרכז',
  'ירושלים': 'ירושלים', 'בית שמש': 'ירושלים', 'מעלה אדומים': 'ירושלים',
  'גבעת זאב': 'ירושלים', 'ביתר עילית': 'ירושלים', 'מבשרת ציון': 'ירושלים',
  'אורה': 'ירושלים', 'נווה שלום': 'ירושלים', 'הר אדר': 'ירושלים',
  'אריאל': 'ירושלים',
  'באר שבע': 'דרום', 'אשדוד': 'דרום', 'אשקלון': 'דרום', 'אילת': 'דרום',
  'קריית גת': 'דרום', 'קרית גת': 'דרום', 'נתיבות': 'דרום', 'שדרות': 'דרום',
  'קריית מלאכי': 'דרום', 'קרית מלאכי': 'דרום',
  'דימונה': 'דרום', 'ערד': 'דרום', 'רהט': 'דרום', 'ופארה': 'דרום',
  'נהורה': 'דרום', 'כפר מימון': 'דרום', 'נבטים': 'דרום', 'להבים': 'דרום',
  'קריית עקרון': 'שפלה', 'קרית עקרון': 'שפלה', 'גדרה': 'שפלה',
  'יבנה': 'שפלה', 'גן יבנה': 'שפלה', 'חצור הגלילית': 'שפלה',
  'כפר ורבורג': 'שפלה', 'גאליה': 'שפלה', 'סתריה': 'שפלה',
  'משמר דוד': 'שפלה', 'כרמי יוסף': 'שפלה', 'מזכרת בתיה': 'שפלה',
  'שדה משה': 'שפלה', 'תלמי יפה': 'שפלה', 'יסעור': 'שפלה', 'גלעד': 'שפלה',
};

const ALL_KNOWN_CITIES = [
  ...Object.keys(CITY_TO_REGION),
  'אילת', 'דימונה', 'ערד', 'רהט', 'נתיבות', 'שדרות', 'אשקלון', 'אשדוד',
  'קריית גת', 'קריית מלאכי', 'גדרה', 'יבנה', 'נס ציונה',
  'אורנית', 'אֳרָנִית', 'אלעד', 'ביתר עילית', 'עלי', 'ענתות', 'מעלה אפרים',
];

function normalizeCity(raw) {
  if (!raw) return '';
  let city = raw.trim();
  city = city.split(',')[0].trim();
  city = city.replace(/\s+(רחוב|רח'|רח׳|שד'|שד׳|שדרות|סמטת|סמ'|ככר|קיבוץ|מושב|יישוב)\b.*/i, '');
  city = city.replace(/\s+\d+.*$/, '');
  return city.trim();
}

const NON_CITY_PATTERNS = [
  /^אביא/, /^אפגש/, /^נמסר/, /^תמסרו/, /^להביא/, /^ינועם/,
  /^אמסור/, /^מסרתי/, /לנועם/, /לגבע/, /צור קשר/, /בוואטסאפ/,
];

function cityWordMatch(src, city) {
  // Must match city as a whole word (not inside another word like "יבנה" inside "הליבנה")
  const escaped = city.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?:^|[\\s,/\\-״׳])${escaped}(?:$|[\\s,/\\-״׳])`).test(src)
    || src === city
    || src.startsWith(city + ' ') || src.startsWith(city + ',')
    || src.endsWith(' ' + city) || src.endsWith(',' + city);
}

function extractCity(rawCity, rawStreet) {
  const sources = [rawCity, rawStreet].filter(Boolean);
  for (const src of sources) {
    for (const city of ALL_KNOWN_CITIES) {
      if (cityWordMatch(src, city)) return city;
    }
  }
  const normalized = normalizeCity(rawCity || '');
  if (!normalized) return '';
  if (normalized.length > 25) return '';
  for (const pattern of NON_CITY_PATTERNS) {
    if (pattern.test(normalized)) return '';
  }
  return normalized;
}

function suggestStreet(rawCity, rawStreet, knownCity) {
  const stripPrefixes = (s) =>
    s.replace(/^(רחוב|רח[''׳]|שד[''׳]|שדרות|סמטת|סמ[''׳]|ככר)\s+/i, '').trim();

  if (rawStreet) {
    let s = rawStreet.trim();
    if (knownCity) s = s.replace(knownCity, '').trim();
    s = s.replace(/^[,\s]+/, '');
    s = stripPrefixes(s);
    if (s.length > 1 && s.length < 80) return s;
  }

  if (rawCity && knownCity && rawCity.includes(knownCity)) {
    let rest = rawCity.replace(knownCity, '').trim();
    rest = rest.replace(/^[,\s]+/, '').replace(/[,\s]+$/, '');
    rest = stripPrefixes(rest);
    if (rest.length > 1 && rest.length < 80) return rest;
  }

  return '';
}

function getRegion(city) {
  if (!city) return 'אחר';
  const trimmed = city.trim();
  if (CITY_TO_REGION[trimmed]) return CITY_TO_REGION[trimmed];
  for (const [key, region] of Object.entries(CITY_TO_REGION)) {
    if (trimmed.includes(key) || key.includes(trimmed)) return region;
  }
  return 'אחר';
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function getAuth() {
  const privateKey = process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n');
  return new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL,
      private_key: privateKey,
    },
    scopes: SCOPES,
  });
}

function getSheetsClient() {
  return google.sheets({ version: 'v4', auth: getAuth() });
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function now() {
  return new Date().toISOString();
}

function formatSubmissionTime(d = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

// ── Ensure auxiliary sheets exist ─────────────────────────────────────────────
async function ensureSheets() {
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    fields: 'sheets.properties',
  });
  const existing = new Set(meta.data.sheets.map(s => s.properties.title));

  const toCreate = [];
  if (!existing.has(COLLECTIONS_TAB)) {
    toCreate.push({
      name: COLLECTIONS_TAB,
      headers: ['ID', 'volunteer_name', 'volunteer_address', 'guitars_json', 'status', 'sent_to_admin', 'created_at', 'updated_at', 'volunteer_activity_at'],
    });
  }
  if (!existing.has(ACTION_LOG_TAB)) {
    toCreate.push({
      name: ACTION_LOG_TAB,
      headers: ['timestamp', 'actor', 'action', 'guitar_id', 'guitar_name', 'details'],
    });
  }

  if (toCreate.length === 0) return;

  // Create missing sheets
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    requestBody: {
      requests: toCreate.map(t => ({ addSheet: { properties: { title: t.name } } })),
    },
  });

  // Write headers
  for (const t of toCreate) {
    await sheets.spreadsheets.values.update({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      range: `${t.name}!A1`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: [t.headers] },
    });
  }
}

// ── Row → guitar object ───────────────────────────────────────────────────────
function rowToGuitar(row, rowIndex) {
  const city = extractCity(row[COL.CITY], row[COL.STREET]);
  const id = row[COL.ID] ? Number(row[COL.ID]) : rowIndex;
  return {
    id,
    rowIndex,
    submissionTime: row[COL.SUBMISSION_TIME] || '',
    name:      row[COL.NAME] || '',
    phone:     row[COL.PHONE] || '',
    city,
    rawCity:   row[COL.CITY] || '',
    rawStreet: row[COL.STREET] || '',
    street:    suggestStreet(row[COL.CITY], row[COL.STREET], city) || '',
    email:     row[COL.EMAIL] || '',
    guitarType: row[COL.GUITAR_TYPE] || '',
    working:   row[COL.WORKING] || '',
    hasCase:   row[COL.CASE] || '',
    defect:    row[COL.DEFECT] || '',
    howFound:  row[COL.HOW_FOUND] || '',
    extraDetails: row[COL.EXTRA_DETAILS] || '',
    contact:   row[COL.CONTACT] || '',
    collection: row[COL.COLLECTION] || '',
    collected: ['TRUE', 'true', 'True', 'V', 'v', 'כן', '1', 'yes', 'Yes'].includes(row[COL.COLLECTED]) || row[COL.COLLECTED] === true,
    notes:     row[COL.NOTES] || '',
    whoRepairs: row[COL.WHO_REPAIRS] || '',
    repaired:  ['TRUE', 'true', 'True', 'V', 'v', 'כן', '1', 'yes', 'Yes'].includes(row[COL.REPAIRED]) || row[COL.REPAIRED] === true,
    model:     row[COL.MODEL] || '',
    donatedTo: row[COL.DONATED_TO] || '',
    imageUrl:  row[COL.IMAGE_URL]  || '',
    inCollection: (row[COL.IN_COLLECTION] || '').split('|')[0].trim(),
    inCollectionDate: (row[COL.IN_COLLECTION] || '').split('|')[1]?.trim() || '',
    irrelevant: row[COL.IRRELEVANT] === 'TRUE',
    sold:       row[COL.SOLD] === 'TRUE',
    soldPrice:  row[COL.SOLD_PRICE] ? Number(row[COL.SOLD_PRICE]) : null,
    region:    getRegion(city),
  };
}

// ── Read all guitars ──────────────────────────────────────────────────────────
async function getAllGuitars() {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_TAB}!A2:AC`,
  });
  const rows = res.data.values || [];
  return rows
    .map((row, i) => rowToGuitar(row, i + 2))
    .filter(g => g.name && g.name.trim());
}

async function getGuitarByName(name) {
  const all = await getAllGuitars();
  return all.filter(g => g.name === name);
}

// ── Find physical row by stable ID ────────────────────────────────────────────
async function findRowByStableId(stableId) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_TAB}!U2:U`,
  });
  const idCol = res.data.values || [];
  const idx = idCol.findIndex(r => Number(r[0]) === Number(stableId));
  if (idx === -1) return null;
  return idx + 2;
}

// ── Update guitar by stable ID ────────────────────────────────────────────────
async function updateGuitarByRowIndex(stableId, updates) {
  const sheets = getSheetsClient();

  let rowIndex = await findRowByStableId(stableId);
  if (!rowIndex) {
    const numId = Number(stableId);
    if (numId >= 2) rowIndex = numId;
    else throw new Error(`Guitar with ID ${stableId} not found`);
  }

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_TAB}!A${rowIndex}:AC${rowIndex}`,
  });
  const row = (res.data.values || [[]])[0];
  while (row.length < 29) row.push('');

  if (updates.collected   !== undefined) row[COL.COLLECTED]  = updates.collected ? 'TRUE' : 'FALSE';
  if (updates.notes       !== undefined && updates.notes.trim()) {
    const existing = row[COL.NOTES] ? row[COL.NOTES].trim() : '';
    row[COL.NOTES] = existing ? existing + '\n' + updates.notes.trim() : updates.notes.trim();
  }
  if (updates.whoRepairs  !== undefined) row[COL.WHO_REPAIRS] = updates.whoRepairs;
  if (updates.repaired    !== undefined) row[COL.REPAIRED]   = updates.repaired ? 'TRUE' : 'FALSE';
  if (updates.donatedTo   !== undefined) row[COL.DONATED_TO] = updates.donatedTo;
  if (updates.guitarType  !== undefined) row[COL.GUITAR_TYPE] = updates.guitarType;
  if (updates.working     !== undefined) row[COL.WORKING]    = updates.working;
  if (updates.model       !== undefined) row[COL.MODEL]      = updates.model;
  if (updates.imageUrl    !== undefined) row[COL.IMAGE_URL]  = updates.imageUrl;
  if (updates.inCollection !== undefined) row[COL.IN_COLLECTION] = updates.inCollection;
  if (updates.irrelevant  !== undefined) row[COL.IRRELEVANT] = updates.irrelevant ? 'TRUE' : 'FALSE';
  if (updates.sold        !== undefined) row[COL.SOLD]       = updates.sold ? 'TRUE' : 'FALSE';
  if (updates.soldPrice   !== undefined) row[COL.SOLD_PRICE] = updates.soldPrice === null ? '' : String(updates.soldPrice);

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_TAB}!A${rowIndex}:AC${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });

  return rowToGuitar(row, rowIndex);
}

// ── Lock / Unlock a guitar (column W only) ────────────────────────────────────
async function lockGuitar(stableId, volunteerName) {
  const sheets = getSheetsClient();
  let rowIndex = await findRowByStableId(stableId);
  if (!rowIndex) throw new Error(`Guitar ${stableId} not found`);
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_TAB}!W${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [[volunteerName + '|' + new Date().toISOString().slice(0, 10)]] },
  });
}

async function unlockGuitar(stableId) {
  const sheets = getSheetsClient();
  let rowIndex = await findRowByStableId(stableId);
  if (!rowIndex) throw new Error(`Guitar ${stableId} not found`);
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_TAB}!W${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [['']] },
  });
}

// ── Donor autocomplete ────────────────────────────────────────────────────────
async function searchDonors(query) {
  const all = await getAllGuitars();
  const q = query.toLowerCase();
  const seen = new Set();
  return all
    .filter(g => g.name.toLowerCase().includes(q))
    .filter(g => { if (seen.has(g.name)) return false; seen.add(g.name); return true; })
    .map(g => ({ name: g.name, city: g.city, phone: g.phone, email: g.email }));
}

// ── Update city ───────────────────────────────────────────────────────────────
async function findAndUpdateCity(stableId, newCity, newStreet) {
  const sheets = getSheetsClient();
  const idRes = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_TAB}!U2:U`,
  });
  const idCol = idRes.data.values || [];
  const idx = idCol.findIndex(r => Number(r[0]) === Number(stableId));
  if (idx === -1) throw new Error(`Guitar with ID ${stableId} not found`);
  const rowIndex = idx + 2;

  const updates = [{ range: `${SHEET_TAB}!D${rowIndex}`, values: [[newCity]] }];
  if (newStreet !== undefined && newStreet !== null) {
    updates.push({ range: `${SHEET_TAB}!E${rowIndex}`, values: [[newStreet]] });
  }
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    requestBody: { valueInputOption: 'USER_ENTERED', data: updates },
  });
  return { id: stableId, rowIndex, city: newCity, street: newStreet };
}

// ── Apply row formatting: extend banding + set checkbox validation for boolean columns ──
async function applyRowFormatting(sheets, targetRow1Based) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    fields: 'sheets(properties,bandedRanges,basicFilter)',
  });
  const tab = meta.data.sheets.find(s => s.properties.title === SHEET_TAB);
  if (!tab) return;

  const tabId   = tab.properties.sheetId;
  const rowIdx0 = targetRow1Based - 1;        // 0-based row index
  const needed  = targetRow1Based + 1;         // exclusive end (0-based) for banding

  const requests = [];

  // If a basicFilter exists and its range doesn't reach the new row,
  // we must clear it before extending the banding (otherwise Google Sheets
  // throws "remove the filter that overlaps with the conversion area").
  // After extending the banding we re-apply the filter with the new end.
  const filter = tab.basicFilter;
  const filterNeedsUpdate = filter && filter.range && filter.range.endRowIndex < needed;

  if (filterNeedsUpdate) {
    requests.push({ clearBasicFilter: { sheetId: tabId } });
  }

  // Extend banded range so the row gets table formatting
  for (const br of tab.bandedRanges || []) {
    if (br.range.endRowIndex < needed) {
      requests.push({
        updateBanding: {
          bandedRange: { bandedRangeId: br.bandedRangeId, range: { ...br.range, endRowIndex: needed } },
          fields: 'range.endRowIndex',
        },
      });
    }
  }

  // Set BOOLEAN (checkbox) validation for collected/repaired/irrelevant/sold columns
  for (const colIdx of [COL.COLLECTED, COL.REPAIRED, COL.IRRELEVANT, COL.SOLD]) {
    requests.push({
      repeatCell: {
        range: {
          sheetId: tabId,
          startRowIndex: rowIdx0,
          endRowIndex:   rowIdx0 + 1,
          startColumnIndex: colIdx,
          endColumnIndex:   colIdx + 1,
        },
        cell: { dataValidation: { condition: { type: 'BOOLEAN' } } },
        fields: 'dataValidation',
      },
    });
  }

  if (requests.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      requestBody: { requests },
    });
  }

  // Re-apply the filter with the updated (wider) range in a separate call,
  // because setBasicFilter and clearBasicFilter can't coexist in one batch.
  if (filterNeedsUpdate) {
    const newFilterRange = { ...filter.range, endRowIndex: needed };
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      requestBody: { requests: [{ setBasicFilter: { filter: { range: newFilterRange } } }] },
    });
  }
}

// ── Add guitar ────────────────────────────────────────────────────────────────
async function addGuitar(data) {
  const sheets = getSheetsClient();

  // Scan column B (Name) from the bottom to find the last row with actual data.
  // Using values.update (not append) so data always lands in column A, never shifted.
  const namesRes = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_TAB}!B2:B`,
  });
  const nameRows = namesRes.data.values || [];
  let lastNameRow = 1;
  for (let i = nameRows.length - 1; i >= 0; i--) {
    if (nameRows[i][0] && nameRows[i][0].trim()) { lastNameRow = i + 2; break; }
  }
  const newRowIndex = lastNameRow + 1;

  // Sequential ID: find max existing ID in column U and increment
  const idRes = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_TAB}!U2:U`,
  });
  const idRows = idRes.data.values || [];
  let maxId = 0;
  for (const [val] of idRows) {
    const n = Number(val);
    if (n > 0 && n < 1e10 && n > maxId) maxId = n;
  }
  const newId = maxId + 1;

  const row = new Array(29).fill('');
  row[COL.SUBMISSION_TIME] = formatSubmissionTime();
  row[COL.NAME]        = data.name        || '';
  row[COL.PHONE]       = data.phone       || '';
  row[COL.CITY]        = data.city        || '';
  row[COL.STREET]      = data.street      || '';
  row[COL.GUITAR_TYPE] = data.guitarType  || '';
  row[COL.COLLECTED]   = data.collected   ? 'TRUE' : 'FALSE';
  row[COL.NOTES]       = data.notes       || '';
  row[COL.IMAGE_URL]   = data.imageUrl    || '';
  row[COL.ID]          = String(newId);
  row[COL.IRRELEVANT]  = 'FALSE';
  row[COL.SOLD]        = 'FALSE';

  // Write to exact computed row (always starts at column A — no column shift bug)
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_TAB}!A${newRowIndex}:AC${newRowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });

  // Extend banded range + set checkbox validation (non-fatal if it fails)
  try { await applyRowFormatting(sheets, newRowIndex); } catch (e) {
    console.warn('applyRowFormatting non-fatal:', e.message);
  }

  return rowToGuitar(row, newRowIndex);
}

// ── Delete guitar ─────────────────────────────────────────────────────────────
async function deleteGuitarRow(stableId) {
  const sheets = getSheetsClient();
  const rowIndex = await findRowByStableId(stableId);
  if (!rowIndex) throw new Error(`Guitar with ID ${stableId} not found`);

  const meta = await sheets.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    fields: 'sheets.properties',
  });
  const sheetMeta = meta.data.sheets.find(s => s.properties.title === SHEET_TAB);
  const sheetId = sheetMeta ? sheetMeta.properties.sheetId : 0;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowIndex - 1, endIndex: rowIndex },
        },
      }],
    },
  });

  return { id: stableId, deleted: true };
}

// ── Collections ───────────────────────────────────────────────────────────────

function rowToCollection(row) {
  if (!row || !row[COL_COLL.ID]) return null;
  let guitars = [];
  try { guitars = JSON.parse(row[COL_COLL.GUITARS_JSON] || '[]'); } catch {}
  return {
    id:               row[COL_COLL.ID],
    volunteerName:    row[COL_COLL.VOLUNTEER_NAME]    || '',
    volunteerAddress: row[COL_COLL.VOLUNTEER_ADDRESS]  || '',
    guitars,
    status:           row[COL_COLL.STATUS]        || 'active',
    sentToAdmin:      row[COL_COLL.SENT_TO_ADMIN] === 'TRUE',
    createdAt:        row[COL_COLL.CREATED_AT]    || '',
    updatedAt:        row[COL_COLL.UPDATED_AT]    || '',
    // Older rows predate this column — fall back to updatedAt/createdAt so they still sort sensibly.
    volunteerActivityAt: row[COL_COLL.VOLUNTEER_ACTIVITY_AT] || row[COL_COLL.UPDATED_AT] || row[COL_COLL.CREATED_AT] || '',
  };
}

async function getCollectionRows() {
  await ensureSheets();
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${COLLECTIONS_TAB}!A2:I`,
  });
  return { sheets, rows: res.data.values || [] };
}

async function getCollections() {
  const { rows } = await getCollectionRows();
  return rows.map(rowToCollection).filter(Boolean);
}

async function getCollection(id) {
  const { rows } = await getCollectionRows();
  const row = rows.find(r => r[COL_COLL.ID] === id);
  return row ? rowToCollection(row) : null;
}

async function createCollection(volunteerName, volunteerAddress, guitars) {
  await ensureSheets();
  const sheets = getSheetsClient();
  const id = `COL-${Date.now()}`;
  const ts = now();
  const row = [
    id,
    volunteerName,
    volunteerAddress,
    JSON.stringify(guitars),
    'active',
    'FALSE',
    ts,
    ts,
    ts,
  ];
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${COLLECTIONS_TAB}!A:I`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
  return { id, volunteerName, volunteerAddress, guitars, status: 'active', sentToAdmin: false, createdAt: ts, updatedAt: ts, volunteerActivityAt: ts };
}

async function updateCollectionRow(id, fields) {
  await ensureSheets();
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${COLLECTIONS_TAB}!A2:I`,
  });
  const rows = res.data.values || [];
  const idx = rows.findIndex(r => r[COL_COLL.ID] === id);
  if (idx === -1) throw new Error(`Collection ${id} not found`);
  const rowIndex = idx + 2;
  const row = [...rows[idx]];
  while (row.length < 9) row.push('');

  if (fields.guitars    !== undefined) row[COL_COLL.GUITARS_JSON]      = JSON.stringify(fields.guitars);
  if (fields.status     !== undefined) row[COL_COLL.STATUS]            = fields.status;
  if (fields.sentToAdmin !== undefined) row[COL_COLL.SENT_TO_ADMIN]   = fields.sentToAdmin ? 'TRUE' : 'FALSE';
  const ts = now();
  row[COL_COLL.UPDATED_AT] = ts;
  // Only volunteer-initiated actions bump this, so admin approvals don't reorder the list mid-review.
  if (fields.touchVolunteerActivity) row[COL_COLL.VOLUNTEER_ACTIVITY_AT] = ts;

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${COLLECTIONS_TAB}!A${rowIndex}:I${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
  return rowToCollection(row);
}

async function deleteCollectionRow(id) {
  const { sheets, rows } = await getCollectionRows();
  const idx = rows.findIndex(r => r[COL_COLL.ID] === id);
  if (idx === -1) throw new Error(`Collection ${id} not found`);
  const rowIndex = idx + 2;

  const meta = await sheets.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    fields: 'sheets.properties',
  });
  const sheetMeta = meta.data.sheets.find(s => s.properties.title === COLLECTIONS_TAB);
  const sheetId = sheetMeta ? sheetMeta.properties.sheetId : 0;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    requestBody: {
      requests: [{
        deleteDimension: {
          range: { sheetId, dimension: 'ROWS', startIndex: rowIndex - 1, endIndex: rowIndex },
        },
      }],
    },
  });

  return { id, deleted: true };
}

// ── Check collected status for a set of guitar IDs ───────────────────────────
async function getGuitarsCollectedStatus() {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_TAB}!O2:U`, // O=collected (index 0), U=id (index 6)
  });
  const rows = res.data.values || [];
  const map = {};
  for (const row of rows) {
    const id = Number(row[6]);
    const collected = ['TRUE', 'true', 'True', 'V', 'v', 'כן', '1', 'yes', 'Yes'].includes(row[0]) || row[0] === true;
    if (id) map[id] = collected;
  }
  return map;
}

// ── Action Log ────────────────────────────────────────────────────────────────
async function logAction(actor, action, guitarId, guitarName, details) {
  await ensureSheets();
  const sheets = getSheetsClient();
  const row = [now(), actor, action, String(guitarId || ''), guitarName || '', details || ''];
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${ACTION_LOG_TAB}!A:F`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
}

async function getActionLog(limit = 200) {
  await ensureSheets();
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${ACTION_LOG_TAB}!A2:F`,
  });
  const rows = (res.data.values || []).map(r => ({
    timestamp:  r[COL_LOG.TIMESTAMP]   || '',
    actor:      r[COL_LOG.ACTOR]       || '',
    action:     r[COL_LOG.ACTION]      || '',
    guitarId:   r[COL_LOG.GUITAR_ID]   || '',
    guitarName: r[COL_LOG.GUITAR_NAME] || '',
    details:    r[COL_LOG.DETAILS]     || '',
  }));
  // Return most recent first
  return rows.reverse().slice(0, limit);
}

// ── One-time ID repair ────────────────────────────────────────────────────────
// Assigns unique IDs to rows with empty column U, and resolves duplicate IDs.
// Also patches any Collections entries that referenced the old (row-index) IDs.
async function repairGuitarIds(dryRun = false) {
  const sheets = getSheetsClient();

  // Read all guitar rows
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_TAB}!A2:W`,
  });
  const rows = res.data.values || [];

  // First pass: collect valid sequential IDs (ignore timestamps >= 1e10)
  const idFirstRow = {}; // id -> first rowIndex that legitimately holds it
  let maxId = 0;

  for (let i = 0; i < rows.length; i++) {
    const rowIndex = i + 2;
    const uVal = (rows[i][COL.ID] || '').trim();
    if (uVal) {
      const id = Number(uVal);
      if (!isNaN(id) && id > 0 && id < 1e10) {
        if (id > maxId) maxId = id;
        if (idFirstRow[id] === undefined) idFirstRow[id] = rowIndex;
      }
    }
  }
  const usedIds = new Set(Object.keys(idFirstRow).map(Number));
  let nextId = maxId + 1;
  function allocateId() {
    while (usedIds.has(nextId)) nextId++;
    usedIds.add(nextId);
    return nextId++;
  }

  // Second pass: identify rows that need a new ID
  // oldId is what the app currently uses for this row (rowIndex when U is empty)
  const repairs = [];
  for (let i = 0; i < rows.length; i++) {
    const rowIndex = i + 2;
    const row = rows[i];
    if (!row[COL.NAME] || !row[COL.NAME].trim()) continue; // skip blank rows

    const uVal = (row[COL.ID] || '').trim();
    if (!uVal) {
      // Empty U — the app uses rowIndex as the id fallback
      repairs.push({ rowIndex, oldId: rowIndex, newId: allocateId(), name: row[COL.NAME] });
    } else {
      const id = Number(uVal);
      if (!isNaN(id) && id >= 1e10) {
        // Timestamp-style ID — replace with sequential
        repairs.push({ rowIndex, oldId: id, newId: allocateId(), name: row[COL.NAME] });
      } else if (!isNaN(id) && id > 0 && idFirstRow[id] !== rowIndex) {
        // Duplicate — not the first holder of this id, reassign
        repairs.push({ rowIndex, oldId: id, newId: allocateId(), name: row[COL.NAME] });
      }
    }
  }

  if (repairs.length === 0) return { repaired: 0, collectionPatches: 0, details: [] };

  if (!dryRun) {
    // Write new IDs to column U
    const batchData = repairs.map(r => ({
      range: `${SHEET_TAB}!U${r.rowIndex}`,
      values: [[String(r.newId)]],
    }));
    await sheets.spreadsheets.values.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      requestBody: { valueInputOption: 'USER_ENTERED', data: batchData },
    });

    // Patch any Collections that referenced an old id
    const oldToNew = Object.fromEntries(repairs.map(r => [r.oldId, r.newId]));
    const allCols = await getCollections();
    let collectionPatches = 0;
    for (const col of allCols) {
      const updated = col.guitars.map(g => oldToNew[g.id] ? { ...g, id: oldToNew[g.id] } : g);
      if (updated.some((g, i) => g.id !== col.guitars[i].id)) {
        await updateCollectionRow(col.id, { guitars: updated });
        collectionPatches++;
      }
    }

    return { repaired: repairs.length, collectionPatches, details: repairs };
  }

  return { repaired: repairs.length, collectionPatches: '(dry-run)', details: repairs };
}

// ── Verified address IDs — stored in cell Z1 of the main sheet ───────────────
async function loadAddressVerifiedIds() {
  if (!process.env.GOOGLE_SHEET_ID) return [];
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_TAB}!Z1`,
  });
  try {
    const val = res.data.values?.[0]?.[0];
    return val ? JSON.parse(val) : [];
  } catch { return []; }
}

async function saveAddressVerifiedIds(ids) {
  if (!process.env.GOOGLE_SHEET_ID) return;
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_TAB}!Z1`,
    valueInputOption: 'RAW',
    requestBody: { values: [[JSON.stringify(ids)]] },
  });
}

// ── Skipped address IDs — stored in cell X1 of the main sheet ────────────────
async function loadSkippedAddressIds() {
  if (!process.env.GOOGLE_SHEET_ID) return [];
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_TAB}!X1`,
  });
  try {
    const val = res.data.values?.[0]?.[0];
    return val ? JSON.parse(val) : [];
  } catch { return []; }
}

async function saveSkippedAddressIds(ids) {
  if (!process.env.GOOGLE_SHEET_ID) return;
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_TAB}!X1`,
    valueInputOption: 'RAW',
    requestBody: { values: [[JSON.stringify(ids)]] },
  });
}

async function loadThankedIds() {
  if (!process.env.GOOGLE_SHEET_ID) return [];
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_TAB}!Y1`,
  });
  try {
    const val = res.data.values?.[0]?.[0];
    return val ? JSON.parse(val) : [];
  } catch { return []; }
}

async function saveThankedIds(ids) {
  if (!process.env.GOOGLE_SHEET_ID) return;
  const sheets = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_TAB}!Y1`,
    valueInputOption: 'RAW',
    requestBody: { values: [[JSON.stringify(ids)]] },
  });
}

module.exports = {
  getAllGuitars,
  getGuitarByName,
  updateGuitarByRowIndex,
  lockGuitar,
  unlockGuitar,
  searchDonors,
  getRegion,
  findAndUpdateCity,
  suggestStreet,
  addGuitar,
  deleteGuitarRow,
  ensureSheets,
  getGuitarsCollectedStatus,
  // Collections
  getCollections,
  getCollection,
  createCollection,
  updateCollectionRow,
  deleteCollectionRow,
  // Action Log
  logAction,
  getActionLog,
  // One-time repair
  repairGuitarIds,
  // Verified addresses
  loadAddressVerifiedIds,
  saveAddressVerifiedIds,
  // Skipped addresses
  loadSkippedAddressIds,
  saveSkippedAddressIds,
  // Thanked IDs
  loadThankedIds,
  saveThankedIds,
};
