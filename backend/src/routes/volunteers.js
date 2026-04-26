const express = require('express');
const router = express.Router();
const {
  getCollections, getCollection, createCollection, updateCollectionRow,
  lockGuitar, unlockGuitar, updateGuitarByRowIndex,
  logAction, getActionLog, getGuitarsCollectedStatus,
} = require('../services/sheetsService');
const { sendCollectionEmail } = require('../services/emailService');

const useMock = () => !process.env.GOOGLE_SHEET_ID;

// ── GET /api/volunteers/collections — admin: all collections
router.get('/collections', async (req, res) => {
  try {
    if (useMock()) return res.json([]);
    const collections = await getCollections();
    res.json(collections);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/volunteers/pending-count — badge count for admin nav
router.get('/pending-count', async (req, res) => {
  try {
    if (useMock()) return res.json({ count: 0 });
    const collections = await getCollections();
    let count = 0;
    for (const c of collections) {
      count += c.guitars.filter(g => g.status === 'pending').length;
    }
    res.json({ count });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/volunteers/collection/:id — get single collection
// Cross-references with main sheet: guitars already collected elsewhere → admin_collected
router.get('/collection/:id', async (req, res) => {
  try {
    if (useMock()) return res.json(null);
    const col = await getCollection(req.params.id);
    if (!col) return res.status(404).json({ error: 'Not found' });

    // Check if any "selected" guitars were already collected via another method
    const activeGuitarIds = col.guitars
      .filter(g => g.status === 'selected' || g.status === 'rejected')
      .map(g => g.id);

    if (activeGuitarIds.length > 0) {
      const collectedMap = await getGuitarsCollectedStatus();
      let changed = false;
      const updatedGuitars = col.guitars.map(g => {
        if ((g.status === 'selected' || g.status === 'rejected') && collectedMap[g.id]) {
          changed = true;
          return { ...g, status: 'admin_collected' };
        }
        return g;
      });
      if (changed) {
        await updateCollectionRow(req.params.id, { guitars: updatedGuitars });
        col.guitars = updatedGuitars;
      }
    }

    res.json(col);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/volunteers/collection — create or extend collection
// Body: { collectionId?, volunteerName, volunteerAddress, guitars: [{id, name, city, street, phone}] }
router.post('/collection', async (req, res) => {
  try {
    if (useMock()) {
      return res.json({ id: 'MOCK-COL', guitars: req.body.guitars || [], status: 'active', sentToAdmin: false });
    }
    const { collectionId, volunteerName, volunteerAddress, guitars } = req.body;
    if (!volunteerName) return res.status(400).json({ error: 'volunteerName is required' });

    // New guitars arrive with status 'selected'; lock them
    const newGuitars = (guitars || []).map(g => ({ ...g, status: 'selected' }));

    let collection;
    if (collectionId) {
      // Extend existing collection
      collection = await getCollection(collectionId);
      if (!collection) return res.status(404).json({ error: 'Collection not found' });

      const existingIds = new Set(collection.guitars.map(g => g.id));
      const toAdd = newGuitars.filter(g => !existingIds.has(g.id));
      const merged = [...collection.guitars, ...toAdd];
      collection = await updateCollectionRow(collectionId, { guitars: merged });

      // Lock only newly added guitars
      for (const g of toAdd) {
        try { await lockGuitar(g.id, volunteerName); } catch {}
        await logAction(volunteerName, 'guitar_locked', g.id, g.name, `נעול לרשימת האיסוף`);
      }
    } else {
      // Create new collection
      collection = await createCollection(volunteerName, volunteerAddress, newGuitars);
      for (const g of newGuitars) {
        try { await lockGuitar(g.id, volunteerName); } catch {}
        await logAction(volunteerName, 'guitar_locked', g.id, g.name, `נוסף לרשימת איסוף`);
      }
    }

    // Send email notification (non-blocking)
    sendCollectionEmail({
      volunteerName,
      volunteerAddress,
      guitars: collection.guitars.filter(g => g.status === 'selected'),
      action: 'saved',
    }).catch(() => {});

    res.json(collection);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE /api/volunteers/collection/:id/guitar/:guitarId — remove guitar from collection
router.delete('/collection/:id/guitar/:guitarId', async (req, res) => {
  try {
    if (useMock()) return res.json({ ok: true });
    const collection = await getCollection(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Not found' });

    const guitarId = Number(req.params.guitarId);
    const removed = collection.guitars.find(g => g.id === guitarId);
    const remaining = collection.guitars.filter(g => g.id !== guitarId);
    await updateCollectionRow(req.params.id, { guitars: remaining });

    // Unlock the guitar so it returns to map
    try { await unlockGuitar(guitarId); } catch {}
    if (removed) await logAction(collection.volunteerName, 'guitar_unlocked', guitarId, removed.name, 'הוסר מרשימת האיסוף');

    // Send email notification (non-blocking)
    sendCollectionEmail({
      volunteerName: collection.volunteerName,
      volunteerAddress: collection.volunteerAddress,
      guitars: remaining,
      action: 'removed',
      removedGuitar: removed || { name: String(guitarId) },
    }).catch(() => {});

    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/volunteers/collection/:id/send — mark sent to admin
router.patch('/collection/:id/send', async (req, res) => {
  try {
    if (useMock()) return res.json({ ok: true });
    const collection = await getCollection(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Not found' });
    const updated = await updateCollectionRow(req.params.id, { sentToAdmin: true, status: 'sent' });
    await logAction(collection.volunteerName, 'collection_sent_to_admin', '', '', `רשימת ${collection.guitars.length} גיטרות נשלחה לאישור מנהל`);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/volunteers/collection/:id/mark-collected — volunteer marks guitar as collected
// Body: { guitarId }
router.patch('/collection/:id/mark-collected', async (req, res) => {
  try {
    if (useMock()) return res.json({ ok: true });
    const { guitarId } = req.body;
    const collection = await getCollection(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Not found' });

    const updated = collection.guitars.map(g =>
      g.id === Number(guitarId) ? { ...g, status: 'pending' } : g
    );
    const result = await updateCollectionRow(req.params.id, { guitars: updated });
    const guitar = collection.guitars.find(g => g.id === Number(guitarId));
    if (guitar) await logAction(collection.volunteerName, 'guitar_marked_collected', guitarId, guitar.name, 'סומנה כנאספת — ממתינה לאישור מנהל');

    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/volunteers/collection/:id/unmark-collected — volunteer undoes "נאסף"
// Body: { guitarId }
router.patch('/collection/:id/unmark-collected', async (req, res) => {
  try {
    if (useMock()) return res.json({ ok: true });
    const { guitarId } = req.body;
    const collection = await getCollection(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Not found' });

    const updated = collection.guitars.map(g =>
      g.id === Number(guitarId) ? { ...g, status: 'selected' } : g
    );
    const result = await updateCollectionRow(req.params.id, { guitars: updated });
    const guitar = collection.guitars.find(g => g.id === Number(guitarId));
    if (guitar) await logAction(collection.volunteerName, 'guitar_unmark_collected', guitarId, guitar.name, 'ביטול סימון איסוף');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/volunteers/collection/:id/admin-mark-collected — admin marks guitar as already collected
// Body: { guitarId }
router.patch('/collection/:id/admin-mark-collected', async (req, res) => {
  try {
    if (useMock()) return res.json({ ok: true });
    const { guitarId } = req.body;
    const collection = await getCollection(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Not found' });

    const guitar = collection.guitars.find(g => g.id === Number(guitarId));
    if (!guitar) return res.status(404).json({ error: 'Guitar not found in collection' });

    // Mark as collected in main sheet
    const notesStr = [`אוסף: ${collection.volunteerName}`, collection.volunteerAddress ? `יעד: ${collection.volunteerAddress}` : ''].filter(Boolean).join(' | ');
    await updateGuitarByRowIndex(guitarId, { collected: true, notes: notesStr, inCollection: '' });

    // Update collection record
    const updatedGuitars = collection.guitars.map(g =>
      g.id === Number(guitarId) ? { ...g, status: 'admin_collected' } : g
    );
    const result = await updateCollectionRow(req.params.id, { guitars: updatedGuitars });

    await logAction('מנהל', 'guitar_collected_manual', guitarId, guitar.name, `סומנה כנאספה על ידי מנהל — רשימת ${collection.volunteerName}`);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/volunteers/collection/:id/approve — admin approves guitar collection
// Body: { guitarId }
router.patch('/collection/:id/approve', async (req, res) => {
  try {
    if (useMock()) return res.json({ ok: true });
    const { guitarId } = req.body;
    const collection = await getCollection(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Not found' });

    const guitar = collection.guitars.find(g => g.id === Number(guitarId));
    if (!guitar) return res.status(404).json({ error: 'Guitar not found in collection' });

    // Build notes string (same format as CollectMode)
    const notesStr = [`אוסף: ${collection.volunteerName}`, collection.volunteerAddress ? `יעד: ${collection.volunteerAddress}` : ''].filter(Boolean).join(' | ');

    // Update main sheet: collected=TRUE + notes
    await updateGuitarByRowIndex(guitarId, {
      collected: true,
      notes: notesStr,
      inCollection: '',
    });

    // Update collection record
    const updatedGuitars = collection.guitars.map(g =>
      g.id === Number(guitarId) ? { ...g, status: 'approved' } : g
    );
    const allDone = updatedGuitars.every(g => ['approved', 'rejected'].includes(g.status));
    const result = await updateCollectionRow(req.params.id, {
      guitars: updatedGuitars,
      status: allDone ? 'closed' : collection.status,
    });

    await logAction('מנהל', 'guitar_approved', guitarId, guitar.name, `אושר — אוסף: ${collection.volunteerName}`);
    res.json(result);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH /api/volunteers/collection/:id/reject — admin rejects guitar
// Body: { guitarId }
router.patch('/collection/:id/reject', async (req, res) => {
  try {
    if (useMock()) return res.json({ ok: true });
    const { guitarId } = req.body;
    const collection = await getCollection(req.params.id);
    if (!collection) return res.status(404).json({ error: 'Not found' });

    const guitar = collection.guitars.find(g => g.id === Number(guitarId));

    // Reset guitar to 'selected' — volunteer can try to mark as collected again
    const updatedGuitars = collection.guitars.map(g =>
      g.id === Number(guitarId) ? { ...g, status: 'selected' } : g
    );
    const result = await updateCollectionRow(req.params.id, { guitars: updatedGuitars });

    if (guitar) await logAction('מנהל', 'guitar_rejected', guitarId, guitar.name, `נדחה — חזר לרשימת המתנדב`);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST /api/volunteers/log-login — called when volunteer logs in
router.post('/log-login', async (req, res) => {
  try {
    const { volunteerName, volunteerAddress } = req.body;
    if (!volunteerName) return res.status(400).json({ error: 'volunteerName is required' });
    if (!useMock()) {
      await logAction(volunteerName, 'volunteer_login', '', '', volunteerAddress ? `כתובת: ${volunteerAddress}` : 'ללא כתובת');
    }
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/volunteers/log — action log (admin)
router.get('/log', async (req, res) => {
  try {
    if (useMock()) return res.json([]);
    const log = await getActionLog(300);
    res.json(log);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
