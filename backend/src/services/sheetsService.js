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
};

// Collections sheet column indices (0-based)
const COL_COLL = {
  ID:                0,  // A
  VOLUNTEER_NAME:    1,  // B
  VOLUNTEER_ADDRESS: 2,  // C
  GUITARS_JSON:      3,  // D — JSON array of {id, name, city, street, phone, status}
  STATUS:            4,  // E — active | sent | closed
  SENT_TO_ADMIN:     5,  // F — TRUE/FALSE
  CREATED_AT:        6,  // G
  UPDATED_AT:        7,  // H
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

function extractCity(rawCity, rawStreet) {
  const sources = [rawCity, rawStreet].filter(Boolean);
  for (const src of sources) {
    for (const city of ALL_KNOWN_CITIES) {
      if (src.includes(city)) return city;
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
      headers: ['ID', 'volunteer_name', 'volunteer_address', 'guitars_json', 'status', 'sent_to_admin', 'created_at', 'updated_at'],
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
    inCollection: row[COL.IN_COLLECTION] || '',  // volunteer name locking this guitar
    region:    getRegion(city),
  };
}

// ── Read all guitars ──────────────────────────────────────────────────────────
async function getAllGuitars() {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_TAB}!A2:W`,
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
    range: `${SHEET_TAB}!A${rowIndex}:W${rowIndex}`,
  });
  const row = (res.data.values || [[]])[0];
  while (row.length < 23) row.push('');

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

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_TAB}!A${rowIndex}:W${rowIndex}`,
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
    requestBody: { values: [[volunteerName]] },
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

// ── Extend banded range to cover a new row (keeps new rows inside the table visually) ──
async function extendBandingToRow(sheets, targetRow1Based) {
  const meta = await sheets.spreadsheets.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    fields: 'sheets(properties.title,bandedRanges)',
  });
  const tab = meta.data.sheets.find(s => s.properties.title === SHEET_TAB);
  if (!tab || !tab.bandedRanges?.length) return;

  const needed = targetRow1Based + 1; // exclusive end in 0-based = row1based + 1
  const requests = tab.bandedRanges
    .filter(br => br.range.endRowIndex < needed)
    .map(br => ({
      updateBanding: {
        bandedRange: { bandedRangeId: br.bandedRangeId, range: { ...br.range, endRowIndex: needed } },
        fields: 'range.endRowIndex',
      },
    }));
  if (requests.length) {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: process.env.GOOGLE_SHEET_ID,
      requestBody: { requests },
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

  // Find max stable ID from column U
  const idRes = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_TAB}!U2:U`,
  });
  const maxId = (idRes.data.values || []).reduce((max, r) => {
    const n = Number(r[0] || 0); return n > max ? n : max;
  }, 1);
  const newId = maxId + 1;

  const row = new Array(23).fill('');
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

  // Write to exact computed row (always starts at column A — no column shift bug)
  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_TAB}!A${newRowIndex}:W${newRowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });

  // Extend the banded range so the new row gets table formatting (non-fatal if it fails)
  try { await extendBandingToRow(sheets, newRowIndex); } catch (e) {
    console.warn('extendBanding non-fatal:', e.message);
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
  };
}

async function getCollectionRows() {
  await ensureSheets();
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${COLLECTIONS_TAB}!A2:H`,
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
  ];
  await sheets.spreadsheets.values.append({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${COLLECTIONS_TAB}!A:H`,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: [row] },
  });
  return { id, volunteerName, volunteerAddress, guitars, status: 'active', sentToAdmin: false, createdAt: ts, updatedAt: ts };
}

async function updateCollectionRow(id, fields) {
  await ensureSheets();
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${COLLECTIONS_TAB}!A2:H`,
  });
  const rows = res.data.values || [];
  const idx = rows.findIndex(r => r[COL_COLL.ID] === id);
  if (idx === -1) throw new Error(`Collection ${id} not found`);
  const rowIndex = idx + 2;
  const row = [...rows[idx]];
  while (row.length < 8) row.push('');

  if (fields.guitars    !== undefined) row[COL_COLL.GUITARS_JSON]      = JSON.stringify(fields.guitars);
  if (fields.status     !== undefined) row[COL_COLL.STATUS]            = fields.status;
  if (fields.sentToAdmin !== undefined) row[COL_COLL.SENT_TO_ADMIN]   = fields.sentToAdmin ? 'TRUE' : 'FALSE';
  row[COL_COLL.UPDATED_AT] = now();

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${COLLECTIONS_TAB}!A${rowIndex}:H${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });
  return rowToCollection(row);
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
  // Collections
  getCollections,
  getCollection,
  createCollection,
  updateCollectionRow,
  // Action Log
  logAction,
  getActionLog,
};
