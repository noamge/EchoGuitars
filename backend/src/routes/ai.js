const express = require('express');
const router = express.Router();
const { parseGuitarNotes } = require('../services/aiService');
const { getAllGuitars } = require('../services/sheetsService');

// POST /api/ai/parse-notes
// Body: { notes: "free text from volunteer" }
router.post('/parse-notes', async (req, res) => {
  const { notes } = req.body;
  if (!notes || !notes.trim()) {
    return res.status(400).json({ error: 'notes field is required' });
  }
  try {
    const result = await parseGuitarNotes(notes);
    res.json(result);
  } catch (err) {
    console.error('AI parse error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/parse-update
// Body: { text: "free text from volunteer" }
router.post('/parse-update', async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'text is required' });
  try {
    const { parseGeneralUpdate } = require('../services/aiService');
    const guitars = process.env.GOOGLE_SHEET_ID
      ? await getAllGuitars()
      : [];
    const summaries = guitars.map(g => ({ id: g.id, name: g.name, city: g.city }));
    const result = await parseGeneralUpdate(text, summaries);
    res.json(result);
  } catch (err) {
    console.error('AI parse-update error:', err.message, err.response?.data);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/ai/smart-query
// Body: { text }  →  { type: "answer", answer } | { type: "actions", actions }
router.post('/smart-query', async (req, res) => {
  const { text } = req.body;
  if (!text || !text.trim()) return res.status(400).json({ error: 'text is required' });
  try {
    const { smartQuery } = require('../services/aiService');
    const guitars = process.env.GOOGLE_SHEET_ID ? await getAllGuitars() : [];
    const result = await smartQuery(text, guitars);
    res.json(result);
  } catch (err) {
    console.error('AI smart-query error:', err.message, err.response?.data);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
