const express = require('express');
const router = express.Router();
const { searchDonors } = require('../services/sheetsService');
const { guitars: mockGuitars } = require('../mockData');

const useMock = () => !process.env.GOOGLE_SHEET_ID;

// GET /api/donors?q=search_term
router.get('/', async (req, res) => {
  try {
    const { q = '' } = req.query;

    let donors;
    if (useMock()) {
      const seen = new Set();
      donors = mockGuitars
        .filter(g => g.name.includes(q))
        .filter(g => { if (seen.has(g.name)) return false; seen.add(g.name); return true; })
        .map(g => ({ name: g.name, city: g.city, phone: g.phone }));
    } else {
      donors = await searchDonors(q);
    }
    res.json(donors);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
