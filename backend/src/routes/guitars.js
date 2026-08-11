const express = require('express');
const router = express.Router();
const { getAllGuitars, getGuitarByName, updateGuitarByRowIndex, suggestStreet, addGuitar, deleteGuitarRow, repairGuitarIds, loadSkippedAddressIds, saveSkippedAddressIds, loadThankedIds, saveThankedIds, loadAddressVerifiedIds, saveAddressVerifiedIds, getCollections, updateCollectionRow, logAction, unlockGuitar } = require('../services/sheetsService');
const { geocodeAddress, suggestAddress, clearGeocodeCache } = require('../services/geocodeService');
const { guitars: mockGuitars } = require('../mockData');

function useMock() {
  return !process.env.GOOGLE_SHEET_ID;
}

// In-memory sets of guitar IDs — shared across all clients.
const addressVerifiedIds = new Set();
const skippedAddressIds  = new Set();

// Load persisted IDs from the sheet on startup
loadSkippedAddressIds().then(ids => ids.forEach(id => skippedAddressIds.add(id))).catch(() => {});
loadAddressVerifiedIds().then(ids => ids.forEach(id => addressVerifiedIds.add(id))).catch(() => {});

const thankedIds = new Set();
loadThankedIds().then(ids => ids.forEach(id => thankedIds.add(id))).catch(() => {});

const THANK_CUTOFF = new Date(2026, 6, 16); // July 16, 2026

function parseSubmissionDate(str) {
  if (!str) return null;
  // DD/MM/YYYY or DD.MM.YYYY (Israeli/admin format)
  let m = str.match(/^(\d{1,2})[\/\.](\d{1,2})[\/\.](\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  // YYYY-MM-DD (ISO / Wix format)
  m = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

async function fetchGuitars() {
  if (useMock()) {
    console.log('⚠️  MOCK MODE active');
    return mockGuitars;
  }
  return getAllGuitars();
}

// Strip a guitar out of any volunteer collection still holding it (unlocked or no longer pickup-relevant)
async function purgeGuitarFromCollections(id, details) {
  const collections = await getCollections();
  for (const c of collections) {
    const guitar = c.guitars.find(g => g.id === id);
    if (!guitar) continue;
    const remaining = c.guitars.filter(g => g.id !== id);
    await updateCollectionRow(c.id, { guitars: remaining });
    await logAction('מנהל', 'guitar_unlocked', id, guitar.name, details);
  }
}

// GET /api/guitars — all guitars, optional filters: ?region=&city=&type=&collected=true/false
router.get('/', async (req, res) => {
  try {
    let guitars = await fetchGuitars();
    const { region, city, type, collected } = req.query;
    if (region)    guitars = guitars.filter(g => g.region === region);
    if (city)      guitars = guitars.filter(g => g.city === city);
    if (type)      guitars = guitars.filter(g => g.guitarType === type);
    if (collected !== undefined)
      guitars = guitars.filter(g => g.collected === (collected === 'true'));
    res.json(guitars);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// Normalize free-text "working" answers into clean categories
function normalizeWorking(val) {
  if (!val) return 'לא ידוע';
  const v = val.trim().toLowerCase();
  if (v === 'כן' || v.startsWith('כן ') || v.startsWith('כן-') || v.startsWith('כן–') || v.startsWith('כן,')) return 'כן (עם הערות)';
  if (v === 'כן') return 'כן';
  if (v === 'לא' || v.startsWith('לא ') || v.startsWith('לא-')) return 'לא';
  if (v === 'חצי' || v.includes('חצי')) return 'חצי';
  if (v.includes('מיתר') || v.includes('מיתרים') || v.includes('קרוע')) return 'בעיה במיתרים';
  if (v.includes('לא בדקתי') || v.includes('לא יודע') || v.includes('לא ברור')) return 'לא ידוע';
  // anything starting with כן
  if (v.startsWith('כן')) return 'כן (עם הערות)';
  // anything starting with לא
  if (v.startsWith('לא')) return 'לא';
  return 'אחר';
}

// GET /api/guitars/stats — dashboard aggregations
router.get('/stats', async (req, res) => {
  try {
    const guitars = await fetchGuitars();

    const count = (arr, key) => {
      const map = {};
      for (const g of arr) {
        const val = g[key] || 'לא ידוע';
        map[val] = (map[val] || 0) + 1;
      }
      return Object.entries(map)
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);
    };

    // Normalized working condition count
    const workingMap = {};
    for (const g of guitars) {
      const cat = normalizeWorking(g.working);
      workingMap[cat] = (workingMap[cat] || 0) + 1;
    }
    const byWorking = Object.entries(workingMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    res.json({
      total:       guitars.length,
      collected:   guitars.filter(g => g.collected).length,
      repaired:    guitars.filter(g => g.repaired).length,
      byRegion:    count(guitars, 'region'),
      byCity:      count(guitars, 'city'),
      byType:      count(guitars, 'guitarType'),
      byWorking,
      byDonatedTo: count(guitars.filter(g => g.donatedTo), 'donatedTo'),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/guitars/map — guitars with geocoded coordinates (for map view)
router.get('/map', async (req, res) => {
  try {
    const guitars = (await fetchGuitars()).filter(g => !g.irrelevant);
    if (useMock()) {
      return res.json(guitars.filter(g => g.lat && g.lon));
    }
    const results = [];
    for (const g of guitars) {
      if (!g.city) continue;
      const coords = await geocodeAddress(g.street, g.city, true); // staticOnly=true
      if (coords) results.push({ ...g, lat: coords.lat, lon: coords.lon, cityOnly: coords.cityOnly });
    }
    res.json(results);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/guitars/by-name/:name — find all records for a donor name
router.get('/by-name/:name', async (req, res) => {
  try {
    const name = decodeURIComponent(req.params.name);
    const results = useMock()
      ? mockGuitars.filter(g => g.name === name)
      : await getGuitarByName(name);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/guitars/validate-address — ask Google to parse a raw address string
// Body: { rawText: "תל אביב רחוב דיזנגוף 50" }
router.post('/validate-address', async (req, res) => {
  const { rawText } = req.body;
  if (!rawText) return res.status(400).json({ error: 'rawText is required' });
  try {
    const suggestion = await suggestAddress(rawText);
    if (!suggestion) return res.json({ city: null, street: null });
    res.json(suggestion);
  } catch (err) {
    console.error('validate-address error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/guitars/address-issues/count — fast count for badge
router.get('/address-issues/count', async (req, res) => {
  try {
    const guitars = await fetchGuitars();
    const count = guitars.filter(g =>
      (!g.city || !g.city.trim()) &&
      !addressVerifiedIds.has(g.id) &&
      !skippedAddressIds.has(g.id)
    ).length;
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/guitars/address-issues/skip/:id — mark address as skipped, persisted to sheet cell X1
router.post('/address-issues/skip/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  skippedAddressIds.add(id);
  saveSkippedAddressIds([...skippedAddressIds]).catch(() => {});
  res.json({ ok: true });
});

// GET /api/guitars/address-issues — guitars where city could not be identified,
// OR where city is known but Google couldn't find the specific street (imprecise geocode)
router.get('/address-issues', async (req, res) => {
  try {
    const guitars = await fetchGuitars();

    // Original: no city at all
    const missingCity = guitars.filter(g => !g.city || !g.city.trim());

    // Has city + street but Google returned a city-level result (street not found)
    const withStreet = guitars.filter(g => g.city && g.city.trim() && g.street && g.street.trim());
    const geocodeResults = await Promise.all(
      withStreet.map(g => geocodeAddress(g.street, g.city))
    );
    const impreciseStreet = withStreet.filter((_, i) =>
      geocodeResults[i]?.cityOnly === true && !addressVerifiedIds.has(withStreet[i].id)
    );
    // geocodeAddress returned null — street was matched to a wrong city or failed entirely
    const geocodeFailed = withStreet.filter((_, i) =>
      geocodeResults[i] === null && !addressVerifiedIds.has(withStreet[i].id)
    );
    const impreciseIds = new Set(impreciseStreet.map(g => g.id));
    const geocodeFailedIds = new Set(geocodeFailed.map(g => g.id));
    const missingCityIds = new Set(missingCity.map(g => g.id));

    const excluded = g => addressVerifiedIds.has(g.id) || skippedAddressIds.has(g.id);
    const issues = [
      ...missingCity.filter(g => !excluded(g)),
      ...impreciseStreet.filter(g => !excluded(g) && !missingCityIds.has(g.id)),
      ...geocodeFailed.filter(g => !excluded(g) && !missingCityIds.has(g.id) && !impreciseIds.has(g.id)),
    ];

    res.json(issues.map(g => ({
      id: g.id,
      rowIndex: g.rowIndex,
      name: g.name,
      rawCity: g.rawCity,
      rawStreet: g.rawStreet,
      parsedCity: g.city,
      suggestedStreet: suggestStreet(g.rawCity, g.rawStreet, g.city),
      region: g.region,
      guitarType: g.guitarType,
      collected: g.collected,
      impreciseStreet: impreciseIds.has(g.id) || geocodeFailedIds.has(g.id),
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/guitars — add a new donor/guitar record
router.post('/', async (req, res) => {
  try {
    if (useMock()) {
      return res.status(201).json({ id: 9999, ...req.body });
    }
    const result = await addGuitar(req.body);
    res.status(201).json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/guitars/:id/city — update only the city field
router.patch('/:id/city', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  const { city, street } = req.body;
  if (!city) return res.status(400).json({ error: 'city is required' });
  try {
    if (useMock()) {
      addressVerifiedIds.add(id);
      return res.json({ id, city, street, precise: true });
    }
    // Update column D (city) and optionally E (street)
    const { findAndUpdateCity } = require('../services/sheetsService');
    const result = await findAndUpdateCity(id, city, street);
    clearGeocodeCache();
    addressVerifiedIds.add(id); // remember this address was manually confirmed
    saveAddressVerifiedIds([...addressVerifiedIds]).catch(() => {});

    // Verify precision using the same geocoding logic as /address-issues.
    // Wrapped in try/catch so a geocoding failure never breaks the save response.
    let precise = false;
    try {
      const processedStreet = suggestStreet(city, street || '', city) || (street || '');
      if (!processedStreet.trim()) {
        precise = true; // no street → city-level is acceptable
      } else {
        const coords = await geocodeAddress(processedStreet, city);
        precise = !!coords && !coords.cityOnly;
      }
    } catch (geocodeErr) {
      console.error('Post-save geocode check failed (non-fatal):', geocodeErr.message);
    }

    res.json({ ...result, precise });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/guitars/thanked-ids
router.get('/thanked-ids', (req, res) => {
  res.json([...thankedIds]);
});

// GET /api/guitars/new-count — count of new unthanked guitars (added >= 2026-07-01)
router.get('/new-count', async (req, res) => {
  try {
    const guitars = await fetchGuitars();
    const count = guitars.filter(g => {
      const d = parseSubmissionDate(g.submissionTime);
      return d && d >= THANK_CUTOFF && !thankedIds.has(g.id);
    }).length;
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/guitars/thank/:id — mark guitar as thanked, persisted to sheet cell Y1
router.post('/thank/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  thankedIds.add(id);
  saveThankedIds([...thankedIds]).catch(() => {});
  res.json({ ok: true });
});

// GET /api/guitars/:id — single record by stable ID
router.get('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    const all = await fetchGuitars();
    const guitar = all.find(g => g.id === id);
    if (!guitar) return res.status(404).json({ error: 'Not found' });
    res.json(guitar);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/guitars/:id — permanently delete a row from the sheet
router.delete('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    if (useMock()) {
      return res.json({ id, deleted: true });
    }
    const result = await deleteGuitarRow(id);

    // Guitar row is gone — strip it out of any volunteer collection still holding it
    try {
      await purgeGuitarFromCollections(id, 'נמחקה מהמאגר — הוסרה מרשימת האיסוף');
    } catch (cleanupErr) {
      console.error('collection cleanup after delete failed:', cleanupErr.message);
    }

    res.json(result);
  } catch (err) {
    console.error('delete error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/guitars/:id — update by stable ID
router.patch('/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'Invalid ID' });
  try {
    if (useMock()) {
      const g = mockGuitars.find(g => g.id === id);
      return res.json({ ...g, ...req.body, id });
    }
    const updated = await updateGuitarByRowIndex(id, req.body);

    // No longer pickup-relevant — free it up and drop it from any volunteer's list
    if (req.body.irrelevant === true || req.body.sold === true) {
      const reason = req.body.irrelevant === true ? 'סומנה לא רלוונטית' : 'סומנה כנמכרה';
      try { await unlockGuitar(id); } catch {}
      try { await purgeGuitarFromCollections(id, `${reason} — הוסרה מרשימת האיסוף`); } catch (cleanupErr) {
        console.error('collection cleanup after status change failed:', cleanupErr.message);
      }
    }

    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/guitars/admin/repair-ids — one-time fix for duplicate/missing IDs
// Add ?dry=true to preview without writing
router.post('/admin/repair-ids', async (req, res) => {
  try {
    if (useMock()) return res.json({ repaired: 0, details: [] });
    const dry = req.query.dry === 'true';
    const result = await repairGuitarIds(dry);
    res.json(result);
  } catch (err) {
    console.error('repair-ids error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
