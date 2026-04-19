import { useState, useCallback, useEffect, useRef } from 'react';
import AsyncSelect from 'react-select/async';
import toast, { Toaster } from 'react-hot-toast';
import {
  getGuitarsByName,
  updateGuitar,
  uploadImage,
  searchDonors,
  parseGeneralUpdate,
  addGuitar,
} from '../api/client';
import { Sparkles, CheckCircle, AlertCircle, X, Plus } from 'lucide-react';
import styles from './QuickEdit.module.css';

const GUITAR_TYPES = ['קלאסית', 'אקוסטית', 'חשמלית'];

// ─── CollectMode ──────────────────────────────────────────────────────────────

function CollectMode() {
  const [donorOption, setDonorOption] = useState(null);
  const [donorGuitars, setDonorGuitars] = useState([]);
  const [selectedGuitarId, setSelectedGuitarId] = useState(''); // guitar.id (stable ID from col U)
  const [donorInputValue, setDonorInputValue] = useState('');
  const [noResults, setNoResults] = useState(false);

  // New donor mode
  const [newDonorMode, setNewDonorMode] = useState(false);
  const [newDonorName, setNewDonorName] = useState('');
  const [newDonorPhone, setNewDonorPhone] = useState('');
  const [newDonorCity, setNewDonorCity] = useState('');
  const [newDonorGuitarType, setNewDonorGuitarType] = useState('');
  const newDonorFormRef = useRef(null);

  const [collector, setCollector]   = useState('');
  const [destination, setDestination] = useState('');
  const [notes, setNotes]           = useState('');
  const [imageFile, setImageFile]   = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!donorOption) { setDonorGuitars([]); setSelectedGuitarId(''); return; }
    getGuitarsByName(donorOption.value).then(list => {
      setDonorGuitars(list);
      if (list.length === 1) prefill(list[0]);
      else setSelectedGuitarId('');
    });
  }, [donorOption]);

  function prefill(guitar) {
    setSelectedGuitarId(guitar.id); // use stable ID, not physical rowIndex
    setNotes('');
    setImagePreview('');
    // collector and destination are independent — do not reset them here
  }

  function resetForm() {
    setDonorOption(null);
    setDonorGuitars([]);
    setSelectedGuitarId('');
    setDonorInputValue('');
    setNoResults(false);
    setNewDonorMode(false);
    setNewDonorName(''); setNewDonorPhone(''); setNewDonorCity(''); setNewDonorGuitarType('');
    setCollector(''); setDestination('');
    setNotes('');
    setImageFile(null); setImagePreview('');
  }

  const openNewDonorMode = (prefillName = '') => {
    setNewDonorMode(true);
    setNewDonorName(prefillName);
    setTimeout(() => newDonorFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const loadDonorOptions = useCallback(async (inputValue) => {
    if (!inputValue || inputValue.length < 2) { setNoResults(false); return []; }
    const donors = await searchDonors(inputValue);
    setNoResults(donors.length === 0);
    return donors.map(d => ({
      value: d.name,
      label: `${d.name} — ${d.city}`,
    }));
  }, []);

  const handleGuitarSelect = (rowIndex) => {
    const g = donorGuitars.find(g => g.rowIndex === Number(rowIndex));
    if (g) prefill(g);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const buildNotes = () => {
    const parts = [];
    if (notes.trim())       parts.push(notes.trim());
    if (collector.trim())   parts.push(`אוסף: ${collector.trim()}`);
    if (destination.trim()) parts.push(`יעד: ${destination.trim()}`);
    return parts.join(' | ');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      let imageUrl = '';
      if (imageFile) {
        try { const u = await uploadImage(imageFile); imageUrl = u.url; } catch {}
      }

      if (newDonorMode) {
        await addGuitar({
          name:        newDonorName.trim(),
          phone:       newDonorPhone.trim(),
          city:        newDonorCity.trim(),
          guitarType:  newDonorGuitarType,
          collected:   true,
          notes:       buildNotes(),
          ...(imageUrl && { imageUrl }),
        });
        toast.success('תורם חדש נוסף והגיטרה סומנה כנאספה!');
        resetForm();
        return;
      }

      if (!selectedGuitarId) { alert('יש לבחור גיטרה'); setSubmitting(false); return; }

      await updateGuitar(selectedGuitarId, {
        collected: true,
        notes:     buildNotes(),
        ...(imageUrl && { imageUrl }),
      });
      toast.success('הגיטרה סומנה כ"נאספה" בהצלחה!');
      resetForm();
    } catch (err) {
      toast.error('שגיאה: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const currentGuitar = donorGuitars.find(g => g.id === Number(selectedGuitarId));

  return (
    <>
      <div className={styles.collectHeader}>
        <p className={styles.sectionSub}>מלאו את הטופס כדי לסמן גיטרה כנאספה</p>
        <button
          type="button"
          className={styles.newGuitarBtn}
          onClick={() => openNewDonorMode()}
        >
          <Plus size={15} /> גיטרה חדשה שנאספה
        </button>
      </div>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.label}>שם האוסף</label>
        <input
          className={styles.input}
          placeholder="מי אוסף את הגיטרה?"
          value={collector}
          onChange={e => setCollector(e.target.value)}
        />
        <label className={styles.label}>לאן לוקחים את הגיטרה?</label>
        <input
          className={styles.input}
          placeholder="כתובת יעד / שם מקום..."
          value={destination}
          onChange={e => setDestination(e.target.value)}
        />

        {/* ── Donor search OR new-donor form ── */}
        {!newDonorMode ? (
          <>
            <label className={styles.label}>שם התורם/ת</label>
            <AsyncSelect
              cacheOptions
              loadOptions={loadDonorOptions}
              inputValue={donorInputValue}
              onInputChange={(v) => { setDonorInputValue(v); if (v.length < 2) setNoResults(false); }}
              value={donorOption}
              onChange={(opt) => { setDonorOption(opt); setNoResults(false); }}
              placeholder="הקלד שם לחיפוש..."
              noOptionsMessage={({ inputValue }) =>
                inputValue.length < 2 ? 'הקלד לפחות 2 תווים' : 'לא נמצאו תורמים'
              }
              isClearable
              classNamePrefix="rs"
            />

            {noResults && donorInputValue.length >= 2 && (
              <div className={styles.newDonorPrompt}>
                <span>"{donorInputValue}" לא נמצא ברשימה</span>
                <button
                  type="button"
                  className={styles.newDonorBtn}
                  onClick={() => openNewDonorMode(donorInputValue)}
                >
                  + הוסף תורם חדש
                </button>
              </div>
            )}
          </>
        ) : (
          <div className={styles.newDonorForm} ref={newDonorFormRef}>
            <div className={styles.newDonorTitle}>🎸 הוספת תורם חדש</div>
            <label className={styles.label}>שם מלא</label>
            <input className={styles.input} placeholder="שם מלא (לא חובה)" value={newDonorName} onChange={e => setNewDonorName(e.target.value)} />
            <label className={styles.label}>טלפון</label>
            <input className={styles.input} placeholder="מספר טלפון (לא חובה)" value={newDonorPhone} onChange={e => setNewDonorPhone(e.target.value)} />
            <label className={styles.label}>עיר / כתובת</label>
            <input className={styles.input} placeholder="עיר (לא חובה)" value={newDonorCity} onChange={e => setNewDonorCity(e.target.value)} />
            <label className={styles.label}>סוג גיטרה</label>
            <select className={styles.select} value={newDonorGuitarType} onChange={e => setNewDonorGuitarType(e.target.value)}>
              <option value="">— בחר (לא חובה) —</option>
              {GUITAR_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <button type="button" className={styles.cancelLink} onClick={() => setNewDonorMode(false)}>
              ✕ בטל, חזור לחיפוש
            </button>
          </div>
        )}

        {donorGuitars.length > 0 && donorGuitars.every(g => g.collected) && (
          <div className={styles.alert} style={{ background: '#fef3c7', color: '#92400e', border: '1.5px solid #f59e0b' }}>
            <AlertCircle size={17} />
            <span>שים לב: כל הגיטרות של תורם זה כבר סומנו כנאספות. ייתכן שמדובר בטעות בשם או בסימון קודם.</span>
          </div>
        )}

        {donorGuitars.length > 1 && (
          <>
            <label className={styles.label}>בחר גיטרה (לתורם יש {donorGuitars.length} רשומות)</label>
            <select
              className={styles.select}
              value={currentGuitar?.rowIndex ?? ''}
              onChange={e => handleGuitarSelect(e.target.value)}
            >
              <option value="">— בחר —</option>
              {donorGuitars.map(g => (
                <option key={g.rowIndex} value={g.rowIndex}>
                  #{g.rowIndex} | {g.guitarType || 'סוג לא ידוע'} | {g.city}
                  {g.collected ? ' ✓ נאספה' : ''}
                </option>
              ))}
            </select>
          </>
        )}

        {currentGuitar && currentGuitar.collected && (
          <div className={styles.alert} style={{ background: '#fef3c7', color: '#92400e', border: '1.5px solid #f59e0b' }}>
            <AlertCircle size={17} />
            <span>גיטרה זו כבר סומנה כנאספה בעבר. האם בטוח שזה נכון?</span>
          </div>
        )}

        {currentGuitar && (
          <div className={styles.guitarInfo}>
            <span>🎸 {currentGuitar.guitarType || 'סוג לא ידוע'}</span>
            <span>📍 {currentGuitar.city}{currentGuitar.street ? `, ${currentGuitar.street}` : ''}</span>
            <span>📞 {currentGuitar.phone}</span>
          </div>
        )}

        <label className={styles.label}>הערות</label>
        <textarea
          className={styles.textarea}
          rows={4}
          placeholder="תארו את מצב הגיטרה, נזקים, מאפיינים מיוחדים..."
          value={notes}
          onChange={e => setNotes(e.target.value)}
        />

        <label className={styles.label}>תמונת הגיטרה</label>
        <div className={styles.uploadBtns}>
          <label className={styles.uploadBtn}>
            <input type="file" accept="image/*" onChange={handleImageChange} hidden />
            📁 גלריה
          </label>
          <label className={styles.uploadBtn}>
            <input type="file" accept="image/*" capture="environment" onChange={handleImageChange} hidden />
            📷 צלם
          </label>
        </div>
        {imagePreview && (
          <img src={imagePreview} alt="preview" className={styles.preview} style={{ borderRadius: 8 }} />
        )}

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={submitting || (!selectedGuitarId && !newDonorMode)}
        >
          {submitting ? 'שומר...' : newDonorMode ? '+ הוסף תורם וסמן כנאסף' : '✓ סמן כנאסף'}
        </button>
      </form>
    </>
  );
}

// ─── DonateMode ───────────────────────────────────────────────────────────────

function DonateMode() {
  const [orgName, setOrgName]               = useState('');
  const [selectedGuitars, setSelectedGuitars] = useState([]);
  const [searchQuery, setSearchQuery]       = useState('');
  const [searchResults, setSearchResults]   = useState([]);
  const [submitting, setSubmitting]         = useState(false);
  const [result, setResult]                 = useState(null);
  const [actionResults, setActionResults]   = useState([]);
  const searchTimeout = useRef(null);

  // Debounced donor search
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      try {
        const donors = await searchDonors(searchQuery);
        setSearchResults(donors);
      } catch {
        setSearchResults([]);
      }
    }, 300);
    return () => clearTimeout(searchTimeout.current);
  }, [searchQuery]);

  const handleDonorClick = async (donor) => {
    setSearchQuery('');
    setSearchResults([]);
    try {
      const guitars = await getGuitarsByName(donor.name);
      setSelectedGuitars(prev => {
        const existingIds = new Set(prev.map(g => g.rowIndex));
        const newOnes = guitars.filter(g => !existingIds.has(g.rowIndex));
        return [...prev, ...newOnes];
      });
    } catch (err) {
      alert('שגיאה בטעינת גיטרות: ' + err.message);
    }
  };

  const removeGuitar = (rowIndex) => {
    setSelectedGuitars(prev => prev.filter(g => g.rowIndex !== rowIndex));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!orgName.trim()) { alert('יש להזין שם ארגון'); return; }
    if (selectedGuitars.length === 0) { alert('יש לבחור לפחות גיטרה אחת'); return; }
    setSubmitting(true);
    setResult(null);
    setActionResults([]);
    const results = [];
    for (const guitar of selectedGuitars) {
      try {
        await updateGuitar(guitar.id, { donatedTo: orgName.trim(), collected: true });
        results.push({ guitar, ok: true });
      } catch (err) {
        results.push({ guitar, ok: false, err: err.message });
      }
    }
    setActionResults(results);
    const allOk = results.every(r => r.ok);
    setResult(allOk ? 'success' : 'error');
    if (allOk) {
      setSelectedGuitars([]);
      setOrgName('');
    }
    setSubmitting(false);
  };

  return (
    <>
      <p className={styles.sectionSub}>סמן גיטרות כנתרמו לארגון</p>
      <form className={styles.form} onSubmit={handleSubmit}>
        <label className={styles.label}>שם הארגון</label>
        <input
          className={styles.input}
          placeholder="הזן שם ארגון..."
          value={orgName}
          onChange={e => setOrgName(e.target.value)}
          required
        />

        <label className={styles.label}>חיפוש תורמים להוספה</label>
        <input
          className={styles.input}
          placeholder="הקלד שם תורם לחיפוש..."
          value={searchQuery}
          onChange={e => setSearchQuery(e.target.value)}
        />

        {searchResults.length > 0 && (
          <div className={styles.searchResults}>
            {searchResults.map((d, i) => (
              <div
                key={i}
                className={styles.searchResultItem}
                onClick={() => handleDonorClick(d)}
              >
                {d.name} — {d.city}
              </div>
            ))}
          </div>
        )}

        <label className={styles.label}>גיטרות שנבחרו ({selectedGuitars.length})</label>
        <div className={styles.chipList}>
          {selectedGuitars.length === 0 && (
            <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>טרם נבחרו גיטרות</span>
          )}
          {selectedGuitars.map(g => (
            <span key={g.rowIndex} className={styles.chip}>
              #{g.rowIndex} {g.name}
              <button
                type="button"
                className={styles.chipRemove}
                onClick={() => removeGuitar(g.rowIndex)}
                title="הסר"
              >
                <X size={13} />
              </button>
            </span>
          ))}
        </div>

        {actionResults.length > 0 && (
          <div className={styles.actionResults}>
            {actionResults.map(({ guitar, ok, err }) => (
              <div key={guitar.rowIndex} className={`${styles.actionResult} ${ok ? styles.actionResultOk : styles.actionResultErr}`}>
                {ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                <span>#{guitar.rowIndex} {guitar.name} — {ok ? 'נשמר בהצלחה' : `שגיאה: ${err}`}</span>
              </div>
            ))}
          </div>
        )}

        {result && actionResults.length === 0 && (
          <div className={`${styles.alert} ${result === 'success' ? styles.success : styles.error}`}>
            {result === 'success' ? <CheckCircle size={17} /> : <AlertCircle size={17} />}
            {result === 'success' ? 'כל הגיטרות עודכנו בהצלחה!' : 'חלק מהעדכונים נכשלו'}
          </div>
        )}

        <button
          type="submit"
          className={styles.submitBtn}
          disabled={submitting || selectedGuitars.length === 0 || !orgName.trim()}
        >
          {submitting ? 'שומר...' : `✓ סמן ${selectedGuitars.length} גיטרות כנתרמו`}
        </button>
      </form>
    </>
  );
}

// ─── AiMode ───────────────────────────────────────────────────────────────────

function getBadgeClass(action) {
  switch (action) {
    case 'collected': return styles.badgeCollected;
    case 'repaired':  return styles.badgeRepaired;
    case 'donated':   return styles.badgeDonated;
    case 'notes':     return styles.badgeNotes;
    default:          return styles.badgeUnknown;
  }
}

function getActionLabel(action) {
  switch (action) {
    case 'collected': return 'נאסף';
    case 'repaired':  return 'תוקן';
    case 'donated':   return 'נתרם';
    case 'notes':     return 'הערה';
    default:          return action;
  }
}

function AiMode() {
  const [text, setText]               = useState('');
  const [loading, setLoading]         = useState(false);
  const [actions, setActions]         = useState(null);
  const [confirmed, setConfirmed]     = useState({});
  const [matchedGuitars, setMatchedGuitars] = useState({}); // idx → [{id,name,city,...}]
  const [chosenIds, setChosenIds]     = useState({}); // idx → chosen guitar id
  const [saving, setSaving]           = useState(false);
  const [saveResults, setSaveResults] = useState([]);
  const [recording, setRecording]     = useState(false);
  const recognitionRef                = useRef(null);

  const startRecording = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert('הדפדפן שלך לא תומך בהקלטה קולית. נסה Chrome.'); return; }
    const rec = new SpeechRecognition();
    rec.lang = 'he-IL';
    rec.continuous = false;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = e.results[0][0].transcript;
      setText(prev => prev ? prev + ' ' + transcript : transcript);
    };
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);
    recognitionRef.current = rec;
    rec.start();
    setRecording(true);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setRecording(false);
  };

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    setActions(null);
    setSaveResults([]);
    setConfirmed({});
    setMatchedGuitars({});
    setChosenIds({});
    try {
      const res = await parseGeneralUpdate(text);
      setActions(res.actions || []);
    } catch (err) {
      alert('שגיאת AI: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const removeAction = (idx) => setActions(prev => prev.filter((_, i) => i !== idx));

  const handleConfirm = async (idx, action) => {
    setConfirmed(c => ({ ...c, [idx]: true }));
    if (!action.guitarId && action.guitarName) {
      try {
        const guitars = await getGuitarsByName(action.guitarName);
        setMatchedGuitars(m => ({ ...m, [idx]: guitars }));
      } catch { /* ignore */ }
    }
  };

  const handleSave = async () => {
    if (!actions || actions.length === 0) return;
    setSaving(true);
    setSaveResults([]);
    const results = [];
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      // Skip low-confidence that weren't explicitly confirmed
      if (action.confidence === 'low' && !confirmed[i]) {
        results.push({ action, ok: false, err: 'דולג — לא אושר' });
        continue;
      }
      const guitarId = chosenIds[i] ?? action.guitarId;
      if (!guitarId) {
        results.push({ action, ok: false, err: 'גיטרה לא זוהתה — יש לבחור מהרשימה' });
        continue;
      }
      let updates = {};
      if (action.action === 'collected') updates = { collected: true };
      else if (action.action === 'repaired') updates = { repaired: true };
      else if (action.action === 'donated') updates = { donatedTo: action.donatedTo, collected: true };
      else if (action.action === 'notes') updates = { notes: action.notes };
      try {
        await updateGuitar(guitarId, updates);
        results.push({ action, ok: true });
      } catch (err) {
        results.push({ action, ok: false, err: err.message });
      }
    }
    setSaveResults(results);
    setSaving(false);
  };

  const highConfidenceCount = actions
    ? actions.filter((a, i) => {
        const id = chosenIds[i] ?? a.guitarId;
        return id && (a.confidence !== 'low' || confirmed[i]);
      }).length
    : 0;

  return (
    <>
      <p className={styles.sectionSub}>דבר או כתוב עברית חופשית — AI יזהה את הגיטרות והפעולות</p>
      <div className={styles.form}>
        <label className={styles.label}>עדכון בטקסט חופשי</label>
        <div style={{ position: 'relative' }}>
          <textarea
            className={styles.textarea}
            rows={5}
            placeholder="למשל: איספתי את הגיטרה של כהן מתל אביב, ותיקנתי את הגיטרה של לוי..."
            value={text}
            onChange={e => setText(e.target.value)}
            dir="rtl"
            style={{ paddingLeft: 48 }}
          />
          <button
            type="button"
            onClick={recording ? stopRecording : startRecording}
            title={recording ? 'עצור הקלטה' : 'הקלט קולית'}
            style={{
              position: 'absolute', left: 10, bottom: 10,
              background: recording ? '#ef4444' : '#6b7280',
              color: '#fff', border: 'none', borderRadius: '50%',
              width: 34, height: 34, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 16, cursor: 'pointer',
              animation: recording ? 'pulse 1s infinite' : 'none',
            }}
          >
            {recording ? '⏹' : '🎙'}
          </button>
        </div>
        {recording && (
          <div style={{ color: '#ef4444', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444', display: 'inline-block' }} />
            מקליט... דבר עכשיו
          </div>
        )}

        <button
          type="button"
          className={styles.analyzeBtn}
          onClick={handleAnalyze}
          disabled={!text.trim() || loading}
        >
          <Sparkles size={16} />
          {loading ? 'מנתח...' : 'נתח'}
        </button>

        {actions !== null && (
          <div className={styles.previewSection}>
            <div className={styles.previewTitle}>תוצאות ניתוח — {actions.length} פעולות זוהו</div>

            {actions.length === 0 && (
              <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>לא זוהו פעולות</div>
            )}

            {actions.map((action, idx) => {
              const isLow = action.confidence === 'low';
              const isConfirmed = confirmed[idx];
              return (
                <div
                  key={idx}
                  className={styles.actionCard}
                  style={isLow && !isConfirmed ? { borderColor: '#f59e0b', background: '#fffbeb' } : {}}
                >
                  <div className={styles.actionCardBody}>
                    <div className={styles.actionCardGuitar}>
                      {action.guitarId
                        ? `#${action.guitarId} — ${action.guitarName}`
                        : `לא זוהה — ${action.guitarName}`}
                    </div>
                    <div className={styles.actionCardDetail}>
                      {action.action === 'donated' && action.donatedTo && `נתרם ל: ${action.donatedTo}`}
                      {action.action === 'notes' && action.notes}
                      {!action.guitarId && <span style={{ color: '#dc2626' }}>⚠️ לא ניתן לשמור</span>}
                    </div>
                    {isLow && action.question && (
                      <div style={{ marginTop: 6, fontSize: 13, color: '#92400e' }}>
                        ❓ {action.question}
                        {!isConfirmed && (
                          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                            <button
                              type="button"
                              onClick={() => handleConfirm(idx, action)}
                              style={{ padding: '3px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                            >
                              כן, נכון
                            </button>
                            <button
                              type="button"
                              onClick={() => removeAction(idx)}
                              style={{ padding: '3px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}
                            >
                              לא, הסר
                            </button>
                          </div>
                        )}
                        {isConfirmed && !action.guitarId && matchedGuitars[idx] && (
                          <div style={{ marginTop: 6 }}>
                            <div style={{ fontSize: 12, marginBottom: 4, color: '#92400e' }}>בחר את הגיטרה הספציפית:</div>
                            <select
                              className={styles.select}
                              value={chosenIds[idx] ?? ''}
                              onChange={e => setChosenIds(c => ({ ...c, [idx]: Number(e.target.value) }))}
                              style={{ fontSize: 12, padding: '4px 8px' }}
                            >
                              <option value="">— בחר —</option>
                              {matchedGuitars[idx].map(g => (
                                <option key={g.id} value={g.id}>
                                  {g.name} | {g.city}{g.street ? `, ${g.street}` : ''} | {g.guitarType || 'סוג לא ידוע'}
                                  {g.collected ? ' ✓ נאספה' : ''}
                                </option>
                              ))}
                            </select>
                          </div>
                        )}
                        {isConfirmed && (action.guitarId || chosenIds[idx]) && (
                          <span style={{ color: '#16a34a', marginRight: 8, fontSize: 12 }}>✓ אושר</span>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={`${styles.badge} ${getBadgeClass(action.action)}`}>
                    {getActionLabel(action.action)}
                  </span>
                  <button type="button" className={styles.removeBtn} onClick={() => removeAction(idx)}>
                    <X size={16} />
                  </button>
                </div>
              );
            })}

            {saveResults.length > 0 && (
              <div className={styles.actionResults}>
                {saveResults.map(({ action, ok, err }, i) => (
                  <div key={i} className={`${styles.actionResult} ${ok ? styles.actionResultOk : styles.actionResultErr}`}>
                    {ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                    <span>{action.guitarId ? `#${action.guitarId}` : action.guitarName} — {ok ? 'נשמר בהצלחה' : err}</span>
                  </div>
                ))}
              </div>
            )}

            {actions.length > 0 && saveResults.length === 0 && (
              <button
                type="button"
                className={styles.submitBtn}
                onClick={handleSave}
                disabled={saving || highConfidenceCount === 0}
              >
                {saving ? 'שומר...' : `✓ אשר ושמור (${highConfidenceCount} פעולות)`}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main QuickEdit Page ──────────────────────────────────────────────────────

const MODES = [
  { key: 'collect', label: 'איסוף' },
  { key: 'donate',  label: 'תרומה' },
  { key: 'ai',      label: '✨ AI' },
];

export default function QuickEdit() {
  const [mode, setMode] = useState('collect');

  return (
    <div className={styles.page} dir="rtl">
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
      <header className={styles.header}>
        <h1>עדכון מהיר</h1>
      </header>

      <div className={styles.tabs}>
        {MODES.map(m => (
          <button
            key={m.key}
            className={`${styles.tab} ${mode === m.key ? styles.tabActive : ''}`}
            onClick={() => setMode(m.key)}
            type="button"
          >
            {m.label}
          </button>
        ))}
      </div>

      {mode === 'collect' && <CollectMode />}
      {mode === 'donate'  && <DonateMode />}
      {mode === 'ai'      && <AiMode />}
    </div>
  );
}
