const { google } = require('googleapis');

const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];

// The single sheet tab name — default first tab
const SHEET_TAB = 'גיליון1';

// Column indices (0-based), matching the actual Google Sheet
const COL = {
  SUBMISSION_TIME: 0,  // A - Submission time
  NAME:            1,  // B - שם
  PHONE:           2,  // C - מס' פלאפון
  CITY:            3,  // D - כתובת - עיר
  STREET:          4,  // E - כתובת - רחוב
  EMAIL:           5,  // F - אימייל
  GUITAR_TYPE:     6,  // G - סוג הגיטרה (קלאסית/אקוסטית/חשמלית)
  WORKING:         7,  // H - הגיטרה תקינה?
  CASE:            8,  // I - קייס
  DEFECT:          9,  // J - פירוט התקלה
  HOW_FOUND:      10,  // K - איך הגעתם למיזם?
  EXTRA_DETAILS:  11,  // L - פירוט נוסף
  CONTACT:        12,  // M - קשר
  COLLECTION:     13,  // N - איך אוספים?
  COLLECTED:      14,  // O - נאסף (TRUE/FALSE)
  NOTES:          15,  // P - הערות
  WHO_REPAIRS:    16,  // Q - מי מתקן?
  REPAIRED:       17,  // R - תוקן? (TRUE/FALSE)
  MODEL:          18,  // S - דגם
  DONATED_TO:     19,  // T - נתרם
  ID:             20,  // U - מזהה (permanent numeric ID, written once)
  IMAGE_URL:      21,  // V - קישור לתמונה ב-Google Drive
};

// ── Region mapping by city (Israeli cities → region) ──────────────────────────
const CITY_TO_REGION = {
  // צפון
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
  // חיפה והקריות
  'טירת כרמל': 'צפון', 'טירת הכרמל': 'צפון', 'נשר': 'צפון', 'דלית אל-כרמל': 'צפון',
  'קרית חיים': 'צפון', 'קרית ים': 'צפון', 'קרית ביאליק': 'צפון',
  'קרית מוצקין': 'צפון', 'קרית אתא': 'צפון', 'קרית שמונה': 'צפון',
  // גליל ועמקים
  'רמת ישי': 'צפון', 'אילניה': 'צפון', 'כחל': 'צפון', 'אלוני אבא': 'צפון',
  'כמון': 'צפון', 'יבנאל': 'צפון', 'לבון': 'צפון', 'תל עדשים': 'צפון',
  'יזרעאל': 'צפון', 'מורן': 'צפון', 'שורשים': 'צפון', 'נתיב השיירה': 'צפון',
  'להבות הבשן': 'צפון', 'מעלות': 'צפון', 'מעלות-תרשיחא': 'צפון',
  'שלומי': 'צפון', 'ראש פינה': 'צפון', 'כפר יובל': 'צפון', 'דן': 'צפון',
  'כרם מהרל': 'צפון',

  // שרון
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

  // מרכז / גוש דן
  'תל אביב': 'מרכז', 'תל אביב-יפו': 'מרכז', 'רמת גן': 'מרכז',
  'גבעתיים': 'מרכז', 'בני ברק': 'מרכז', 'בת ים': 'מרכז', 'חולון': 'מרכז',
  'ראשון לציון': 'מרכז', 'נס ציונה': 'מרכז', 'רחובות': 'מרכז',
  'לוד': 'מרכז', 'רמלה': 'מרכז', 'מודיעין': 'מרכז',
  'מודיעין-מכבים-רעות': 'מרכז', 'יהוד': 'מרכז', 'אור יהודה': 'מרכז',
  'אזור': 'מרכז', 'קרית אונו': 'מרכז', 'קריית אונו': 'מרכז', 'גבעת שמואל': 'מרכז',
  'שוהם': 'מרכז', 'שהם': 'מרכז', 'באר יעקב': 'מרכז',
  'גני תקווה': 'מרכז', 'אפק': 'מרכז',

  // ירושלים
  'ירושלים': 'ירושלים', 'בית שמש': 'ירושלים', 'מעלה אדומים': 'ירושלים',
  'גבעת זאב': 'ירושלים', 'ביתר עילית': 'ירושלים', 'מבשרת ציון': 'ירושלים',
  'אורה': 'ירושלים', 'נווה שלום': 'ירושלים', 'הר אדר': 'ירושלים',
  'אריאל': 'ירושלים',

  // דרום
  'באר שבע': 'דרום', 'אשדוד': 'דרום', 'אשקלון': 'דרום', 'אילת': 'דרום',
  'קריית גת': 'דרום', 'קרית גת': 'דרום', 'נתיבות': 'דרום', 'שדרות': 'דרום',
  'קריית מלאכי': 'דרום', 'קרית מלאכי': 'דרום',
  'דימונה': 'דרום', 'ערד': 'דרום', 'רהט': 'דרום', 'ופארה': 'דרום',
  'נהורה': 'דרום', 'כפר מימון': 'דרום', 'נבטים': 'דרום', 'להבים': 'דרום',

  // שפלה
  'קריית עקרון': 'שפלה', 'קרית עקרון': 'שפלה', 'גדרה': 'שפלה',
  'יבנה': 'שפלה', 'גן יבנה': 'שפלה', 'חצור הגלילית': 'שפלה',
  'כפר ורבורג': 'שפלה', 'גאליה': 'שפלה', 'סתריה': 'שפלה',
  'משמר דוד': 'שפלה', 'כרמי יוסף': 'שפלה', 'מזכרת בתיה': 'שפלה',
  'שדה משה': 'שפלה', 'תלמי יפה': 'שפלה', 'יסעור': 'שפלה', 'גלעד': 'שפלה',
};

// All known city names for smart extraction
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

  // 1. Try each source: check if it directly contains a known city
  for (const src of sources) {
    for (const city of ALL_KNOWN_CITIES) {
      if (src.includes(city)) return city;
    }
  }

  // 2. Fall back to normalization of city field
  const normalized = normalizeCity(rawCity || '');
  if (!normalized) return '';

  // 3. Reject if it looks like a note/sentence
  if (normalized.length > 25) return '';
  for (const pattern of NON_CITY_PATTERNS) {
    if (pattern.test(normalized)) return '';
  }

  return normalized;
}

// Extract a clean street name from raw address fields, given the known city
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
  // Partial match fallback
  for (const [key, region] of Object.entries(CITY_TO_REGION)) {
    if (trimmed.includes(key) || key.includes(trimmed)) return region;
  }
  return 'אחר';
}

// ── Auth ───────────────────────────────────────────────────────────────────────
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

// ── Row → object ───────────────────────────────────────────────────────────────
function rowToGuitar(row, rowIndex) {
  const city = extractCity(row[COL.CITY], row[COL.STREET]);
  // ID comes from column U (stable even if sheet is sorted/filtered).
  // Falls back to rowIndex if not yet populated (run scripts/populateIds.js once).
  const id = row[COL.ID] ? Number(row[COL.ID]) : rowIndex;
  return {
    id,
    rowIndex,   // current physical row (needed for range writes)
    submissionTime: row[COL.SUBMISSION_TIME] || '',
    name:      row[COL.NAME] || '',
    phone:     row[COL.PHONE] || '',
    city,
    rawCity:   row[COL.CITY] || '',
    rawStreet: row[COL.STREET] || '',
    street:    row[COL.STREET] || '',
    email:     row[COL.EMAIL] || '',
    guitarType: row[COL.GUITAR_TYPE] || '',     // Hebrew: קלאסית/אקוסטית/חשמלית
    working:   row[COL.WORKING] || '',
    hasCase:   row[COL.CASE] || '',
    defect:    row[COL.DEFECT] || '',
    howFound:  row[COL.HOW_FOUND] || '',
    extraDetails: row[COL.EXTRA_DETAILS] || '',
    contact:   row[COL.CONTACT] || '',
    collection: row[COL.COLLECTION] || '',
    collected: row[COL.COLLECTED] === 'TRUE' || row[COL.COLLECTED] === true,
    notes:     row[COL.NOTES] || '',
    whoRepairs: row[COL.WHO_REPAIRS] || '',
    repaired:  row[COL.REPAIRED] === 'TRUE' || row[COL.REPAIRED] === true,
    model:     row[COL.MODEL] || '',
    donatedTo: row[COL.DONATED_TO] || '',
    imageUrl:  row[COL.IMAGE_URL]  || '',
    region:    getRegion(city),
  };
}

// ── Read all guitars ───────────────────────────────────────────────────────────
async function getAllGuitars() {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_TAB}!A2:V`,   // A–V includes image URL column
  });
  const rows = res.data.values || [];
  return rows
    .map((row, i) => rowToGuitar(row, i + 2))
    .filter(g => g.name && g.name.trim()); // skip empty/blank rows
}

async function getGuitarByName(name) {
  const all = await getAllGuitars();
  return all.filter(g => g.name === name);
}

// ── Find physical row by stable ID (searches column U) ────────────────────────
async function findRowByStableId(stableId) {
  const sheets = getSheetsClient();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_TAB}!U2:U`,
  });
  const idCol = res.data.values || [];
  const idx = idCol.findIndex(r => Number(r[0]) === Number(stableId));
  if (idx === -1) return null;
  return idx + 2; // convert to 1-based sheet row
}

// ── Update a guitar by its stable ID ─────────────────────────────────────────
async function updateGuitarByRowIndex(stableId, updates) {
  const sheets = getSheetsClient();

  // Locate the physical row using the stable ID stored in column U
  const rowIndex = await findRowByStableId(stableId);
  if (!rowIndex) throw new Error(`Guitar with ID ${stableId} not found`);

  // Fetch current row
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_TAB}!A${rowIndex}:U${rowIndex}`,
  });
  const row = (res.data.values || [[]])[0];
  while (row.length < 22) row.push(''); // pad to 22 columns (A–V)

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

  await sheets.spreadsheets.values.update({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_TAB}!A${rowIndex}:V${rowIndex}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [row] },
  });

  return rowToGuitar(row, rowIndex);
}

// ── Donor autocomplete (search by name in same sheet) ─────────────────────────
async function searchDonors(query) {
  const all = await getAllGuitars();
  const q = query.toLowerCase();
  const seen = new Set();
  return all
    .filter(g => g.name.toLowerCase().includes(q))
    .filter(g => { if (seen.has(g.name)) return false; seen.add(g.name); return true; })
    .map(g => ({ name: g.name, city: g.city, phone: g.phone, email: g.email }));
}

async function findAndUpdateCity(stableId, newCity, newStreet) {
  const sheets = getSheetsClient();
  // Find physical row by stable ID (column U)
  const idRes = await sheets.spreadsheets.values.get({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    range: `${SHEET_TAB}!U2:U`,
  });
  const idCol = idRes.data.values || [];
  const idx = idCol.findIndex(r => Number(r[0]) === Number(stableId));
  if (idx === -1) throw new Error(`Guitar with ID ${stableId} not found`);
  const rowIndex = idx + 2;

  // Update column D (city) and optionally column E (street)
  const updates = [
    {
      range: `${SHEET_TAB}!D${rowIndex}`,
      values: [[newCity]],
    },
  ];
  if (newStreet !== undefined && newStreet !== null) {
    updates.push({
      range: `${SHEET_TAB}!E${rowIndex}`,
      values: [[newStreet]],
    });
  }
  await sheets.spreadsheets.values.batchUpdate({
    spreadsheetId: process.env.GOOGLE_SHEET_ID,
    requestBody: { valueInputOption: 'USER_ENTERED', data: updates },
  });
  return { id: stableId, rowIndex, city: newCity, street: newStreet };
}

module.exports = {
  getAllGuitars,
  getGuitarByName,
  updateGuitarByRowIndex,
  searchDonors,
  getRegion,
  findAndUpdateCity,
  suggestStreet,
};
