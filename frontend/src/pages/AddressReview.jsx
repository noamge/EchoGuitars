import { useEffect, useState } from 'react';
import { getAddressIssues, updateGuitarCity, validateAddress } from '../api/client';
import styles from './AddressReview.module.css';

export default function AddressReview() {
  const [issues, setIssues]           = useState([]);
  const [loading, setLoading]         = useState(true);
  const [cityEdits, setCityEdits]     = useState({});
  const [streetEdits, setStreetEdits] = useState({});
  const [saved, setSaved]             = useState({});
  const [saving, setSaving]           = useState({});
  const [skipped, setSkipped] = useState(() => {
    try {
      const stored = localStorage.getItem('address_review_skipped');
      return stored ? JSON.parse(stored) : {};
    } catch { return {}; }
  });
  const [search, setSearch]           = useState('');
  const [suggestions, setSuggestions] = useState({});   // id → { city, street, formattedAddress } | 'loading' | 'none'

  useEffect(() => {
    getAddressIssues().then(data => {
      setIssues(data);
      const cities = {}, streets = {};
      data.forEach(g => {
        cities[g.id]  = g.parsedCity || '';
        streets[g.id] = g.suggestedStreet || '';
      });
      setCityEdits(cities);
      setStreetEdits(streets);

      // Auto-validate all issues with Google in parallel
      setSuggestions(Object.fromEntries(data.map(g => [g.id, 'loading'])));
      data.forEach(async (g) => {
        const rawText = [g.rawCity, g.rawStreet].filter(Boolean).join(' ');
        try {
          const result = await validateAddress(rawText);
          setSuggestions(s => ({
            ...s,
            [g.id]: (result?.city || result?.street) ? result : 'none',
          }));
        } catch {
          setSuggestions(s => ({ ...s, [g.id]: 'none' }));
        }
      });
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (g) => {
    const city   = cityEdits[g.id]?.trim();
    const street = streetEdits[g.id]?.trim();
    if (!city) return;
    setSaving(s => ({ ...s, [g.id]: true }));
    try {
      await updateGuitarCity(g.id, city, street);
      setSaved(s => ({ ...s, [g.id]: true }));
    } catch (err) {
      alert('שגיאה בשמירה: ' + err.message);
    } finally {
      setSaving(s => ({ ...s, [g.id]: false }));
    }
  };

  const acceptSuggestion = (g) => {
    const s = suggestions[g.id];
    if (!s || s === 'loading' || s === 'none') return;
    if (s.city)   setCityEdits(prev   => ({ ...prev,   [g.id]: s.city }));
    if (s.street) setStreetEdits(prev => ({ ...prev,   [g.id]: s.street }));
  };

  const pending  = issues.filter(g => !saved[g.id] && !skipped[g.id]);
  const done     = issues.filter(g =>  saved[g.id]);
  const skippedL = issues.filter(g =>  skipped[g.id]);

  const filtered = pending.filter(g =>
    !search ||
    (g.rawCity   || '').includes(search) ||
    (g.rawStreet || '').includes(search) ||
    (g.name      || '').includes(search)
  );

  if (loading) return <div className={styles.center}>טוען...</div>;

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div>
          <h1>סקירת כתובות</h1>
          <p>
            {pending.length} ממתינות · {done.length} עודכנו · {skippedL.length} דולגו
          </p>
        </div>
        <input
          className={styles.search}
          placeholder="חיפוש..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
      </header>

      {filtered.length === 0 && pending.length === 0 && (
        <div className={styles.allDone}>✅ כל הכתובות טופלו!</div>
      )}

      <div className={styles.cardList}>
        {filtered.map(g => {
          const sugg = suggestions[g.id];
          return (
            <div key={g.id} className={styles.card}>
              <div className={styles.cardTop}>
                <span className={styles.name}>{g.name}</span>
                <span className={styles.idBadge}>#{g.id}</span>
                {g.guitarType && <span className={styles.typeBadge}>{g.guitarType}</span>}
              </div>

              <div className={styles.rawFields}>
                <div className={styles.rawRow}>
                  <span className={styles.rawLabel}>עיר (גולמי):</span>
                  <span className={styles.rawValue}>{g.rawCity || <em>ריק</em>}</span>
                </div>
                <div className={styles.rawRow}>
                  <span className={styles.rawLabel}>רחוב (גולמי):</span>
                  <span className={styles.rawValue}>{g.rawStreet || <em>ריק</em>}</span>
                </div>
              </div>

              {/* Google suggestion */}
              {sugg === 'loading' && (
                <div className={styles.suggLoading}>מחפש בGoogle...</div>
              )}
              {sugg === 'none' && (
                <div className={styles.suggNone}>Google לא מצא תוצאה</div>
              )}
              {sugg && sugg !== 'loading' && sugg !== 'none' && (
                <div className={styles.suggBox}>
                  <span className={styles.suggLabel}>הצעת Google:</span>
                  <span className={styles.suggText}>
                    {sugg.city}{sugg.street ? ` · ${sugg.street}` : ''}
                  </span>
                  <button
                    className={styles.acceptBtn}
                    onClick={() => acceptSuggestion(g)}
                  >
                    קבל ✓
                  </button>
                </div>
              )}

              <div className={styles.editGrid}>
                <label className={styles.editLabel}>עיר</label>
                <input
                  className={styles.addrInput}
                  value={cityEdits[g.id] || ''}
                  onChange={e => setCityEdits(prev => ({ ...prev, [g.id]: e.target.value }))}
                  placeholder="שם עיר..."
                  onKeyDown={e => e.key === 'Enter' && handleSave(g)}
                />
                <label className={styles.editLabel}>רחוב</label>
                <input
                  className={styles.addrInput}
                  value={streetEdits[g.id] || ''}
                  onChange={e => setStreetEdits(prev => ({ ...prev, [g.id]: e.target.value }))}
                  placeholder="שם רחוב + מספר..."
                  onKeyDown={e => e.key === 'Enter' && handleSave(g)}
                />
                <div className={styles.editActions}>
                  <button
                    className={styles.saveBtn}
                    onClick={() => handleSave(g)}
                    disabled={!cityEdits[g.id]?.trim() || saving[g.id]}
                  >
                    {saving[g.id] ? '...' : '✓ אשר'}
                  </button>
                  <button
                    className={styles.skipBtn}
                    onClick={() => setSkipped(s => {
                      const next = { ...s, [g.id]: true };
                      try { localStorage.setItem('address_review_skipped', JSON.stringify(next)); } catch {}
                      return next;
                    })}
                  >
                    דלג
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {done.length > 0 && (
          <div className={styles.doneSection}>
            <h3>✅ עודכנו ({done.length})</h3>
            {done.map(g => (
              <div key={g.id} className={styles.doneCard}>
                <span className={styles.name}>{g.name}</span>
                <span className={styles.savedCity}>
                  {cityEdits[g.id]}{streetEdits[g.id] ? `, ${streetEdits[g.id]}` : ''}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
