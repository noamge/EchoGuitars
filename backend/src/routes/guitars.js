const express = require('express');
const router = express.Router();
const { getAllGuitars, getGuitarByName, updateGuitarByRowIndex, suggestStreet } = require('../services/sheetsService');
const { geocodeAddress, suggestAddress } = require('../services/geocodeService');
const { guitars: mockGuitars } = require('../mockData');

function useMock() {
  return !process.env.GOOGLE_SHEET_ID;
}

async function fetchGuitars() {
  if (useMock()) {
    console.log('⚠️  MOCK MODE active');
    return mockGuitars;
  }
  return getAllGuitars();
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
    const guitars = await fetchGuitars();
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
    const count = guitars.filter(g => !g.city || !g.city.trim()).length;
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/guitars/address-issues — guitars where city could not be identified
router.get('/address-issues', async (req, res) => {
  try {
    const guitars = await fetchGuitars();
    const issues = guitars.filter(g => !g.city || !g.city.trim());
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
    })));
  } catch (err) {
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
      return res.json({ id, city, street });
    }
    // Update column D (city) and optionally E (street)
    const { findAndUpdateCity } = require('../services/sheetsService');
    const result = await findAndUpdateCity(id, city, street);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
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
    res.json(updated);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
