import { useState, useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  getGuitarsByName, updateGuitar, searchDonors,
  parseGeneralUpdate, addGuitar,
} from '../api/client';
import { Sparkles, CheckCircle, AlertCircle, X } from 'lucide-react';
import styles from './QuickEdit.module.css';

const GUITAR_TYPES = ['קלאסית', 'אקוסטית', 'חשמלית'];

const ACTION_TYPES = [
  { key: 'collect',     label: '🎸 איסוף' },
  { key: 'repair_send', label: '🔧 מסירה לתיקון' },
  { key: 'repaired',    label: '✓ תוקנה' },
  { key: 'donate',      label: '🎁 תרומה' },
  { key: 'ai',          label: '✨ עדכון חופשי' },
];

// ─── AiMode (unchanged) ───────────────────────────────────────────────────────
function getBadgeClass(action) {
  switch (action) {
    case 'collected': return styles.badgeCollected;
    case 'repaired':  return styles.badgeRepaired;
    case 'in_repair': return styles.badgeRepaired;
    case 'donated':   return styles.badgeDonated;
    case 'notes':     return styles.badgeNotes;
    default:          return styles.badgeUnknown;
  }
}
function getActionLabel(action) {
  switch (action) {
    case 'collected': return 'נאסף';
    case 'repaired':  return 'תוקן ✓';
    case 'in_repair': return 'בתיקון';
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
  const [matchedGuitars, setMatchedGuitars] = useState({});
  const [chosenIds, setChosenIds]     = useState({});
  const [saving, setSaving]           = useState(false);
  const [saveResults, setSaveResults] = useState([]);
  const [recording, setRecording]     = useState(false);
  const recognitionRef                = useRef(null);

  const startRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('הדפדפן לא תומך בהקלטה. נסה Chrome.'); return; }
    const rec = new SR();
    rec.lang = 'he-IL'; rec.continuous = false; rec.interimResults = false;
    rec.onresult = e => setText(p => p ? p + ' ' + e.results[0][0].transcript : e.results[0][0].transcript);
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);
    recognitionRef.current = rec;
    rec.start(); setRecording(true);
  };
  const stopRecording = () => { recognitionRef.current?.stop(); setRecording(false); };

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setLoading(true); setActions(null); setSaveResults([]); setConfirmed({}); setMatchedGuitars({}); setChosenIds({});
    try { const res = await parseGeneralUpdate(text); setActions(res.actions || []); }
    catch (err) { alert('שגיאת AI: ' + err.message); }
    finally { setLoading(false); }
  };

  const removeAction = idx => setActions(p => p.filter((_, i) => i !== idx));

  const handleConfirm = async (idx, action) => {
    setConfirmed(c => ({ ...c, [idx]: true }));
    if (!action.guitarId && action.guitarName) {
      try { const g = await getGuitarsByName(action.guitarName); setMatchedGuitars(m => ({ ...m, [idx]: g })); } catch {}
    }
  };

  const handleSave = async () => {
    if (!actions?.length) return;
    setSaving(true); setSaveResults([]);
    const results = [];
    for (let i = 0; i < actions.length; i++) {
      const action = actions[i];
      if (action.confidence === 'low' && !confirmed[i]) { results.push({ action, ok: false, err: 'דולג — לא אושר' }); continue; }
      const guitarId = chosenIds[i] ?? action.guitarId;
      if (!guitarId) { results.push({ action, ok: false, err: 'גיטרה לא זוהתה' }); continue; }
      let updates = {};
      if (action.action === 'collected') updates = { collected: true };
      else if (action.action === 'repaired') updates = { repaired: true, ...(action.whoRepairs ? { whoRepairs: action.whoRepairs } : {}) };
      else if (action.action === 'in_repair') updates = { repaired: false, ...(action.whoRepairs ? { whoRepairs: action.whoRepairs } : {}) };
      else if (action.action === 'donated') updates = { donatedTo: action.donatedTo, collected: true };
      else if (action.action === 'notes') updates = { notes: action.notes };
      try { await updateGuitar(guitarId, updates); results.push({ action, ok: true }); }
      catch (err) { results.push({ action, ok: false, err: err.message }); }
    }
    setSaveResults(results); setSaving(false);
  };

  const highConfidenceCount = actions
    ? actions.filter((a, i) => { const id = chosenIds[i] ?? a.guitarId; return id && (a.confidence !== 'low' || confirmed[i]); }).length
    : 0;

  return (
    <>
      <p className={styles.sectionSub}>דבר או כתוב עברית חופשית — AI יזהה את הגיטרות והפעולות</p>
      <div className={styles.form}>
        <label className={styles.label}>עדכון בטקסט חופשי</label>
        <div style={{ position: 'relative' }}>
          <textarea className={styles.textarea} rows={5} placeholder="למשל: איספתי את הגיטרה של כהן..." value={text} onChange={e => setText(e.target.value)} dir="rtl" style={{ paddingLeft: 48 }} />
          <button type="button" onClick={recording ? stopRecording : startRecording} style={{ position: 'absolute', left: 10, bottom: 10, background: recording ? '#ef4444' : '#6b7280', color: '#fff', border: 'none', borderRadius: '50%', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, cursor: 'pointer' }}>
            {recording ? '⏹' : '🎙'}
          </button>
        </div>
        {recording && <div style={{ color: '#ef4444', fontSize: 13 }}>● מקליט...</div>}
        <button type="button" className={styles.analyzeBtn} onClick={handleAnalyze} disabled={!text.trim() || loading}>
          <Sparkles size={16} />{loading ? 'מנתח...' : 'נתח'}
        </button>
        {actions !== null && (
          <div className={styles.previewSection}>
            <div className={styles.previewTitle}>תוצאות — {actions.length} פעולות</div>
            {actions.length === 0 && <div style={{ color: 'var(--text-muted)', fontSize: 13 }}>לא זוהו פעולות</div>}
            {actions.map((action, idx) => {
              const isLow = action.confidence === 'low', isCon = confirmed[idx];
              return (
                <div key={idx} className={styles.actionCard} style={isLow && !isCon ? { borderColor: '#f59e0b', background: '#fffbeb' } : {}}>
                  <div className={styles.actionCardBody}>
                    <div className={styles.actionCardGuitar}>{action.guitarId ? `#${action.guitarId} — ${action.guitarName}` : `לא זוהה — ${action.guitarName}`}</div>
                    <div className={styles.actionCardDetail}>
                      {action.action === 'donated' && action.donatedTo && `נתרם ל: ${action.donatedTo}`}
                      {action.action === 'notes' && action.notes}
                      {(action.action === 'repaired' || action.action === 'in_repair') && action.whoRepairs && `מתקן: ${action.whoRepairs}`}
                      {!action.guitarId && <span style={{ color: '#dc2626' }}>⚠️ לא ניתן לשמור</span>}
                    </div>
                    {isLow && action.question && (
                      <div style={{ marginTop: 6, fontSize: 13, color: '#92400e' }}>
                        ❓ {action.question}
                        {!isCon && (
                          <div style={{ display: 'flex', gap: 8, marginTop: 6 }}>
                            <button type="button" onClick={() => handleConfirm(idx, action)} style={{ padding: '3px 12px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>כן</button>
                            <button type="button" onClick={() => removeAction(idx)} style={{ padding: '3px 12px', background: '#dc2626', color: '#fff', border: 'none', borderRadius: 6, fontSize: 12, cursor: 'pointer' }}>לא</button>
                          </div>
                        )}
                        {isCon && !action.guitarId && matchedGuitars[idx] && (
                          <select className={styles.select} value={chosenIds[idx] ?? ''} onChange={e => setChosenIds(c => ({ ...c, [idx]: Number(e.target.value) }))} style={{ fontSize: 12, marginTop: 6 }}>
                            <option value="">— בחר —</option>
                            {matchedGuitars[idx].map(g => <option key={g.id} value={g.id}>{g.name} | {g.city} | {g.guitarType || 'לא ידוע'}</option>)}
                          </select>
                        )}
                      </div>
                    )}
                  </div>
                  <span className={`${styles.badge} ${getBadgeClass(action.action)}`}>{getActionLabel(action.action)}</span>
                  <button type="button" className={styles.removeBtn} onClick={() => removeAction(idx)}><X size={16} /></button>
                </div>
              );
            })}
            {saveResults.length > 0 && (
              <div className={styles.actionResults}>
                {saveResults.map(({ action, ok, err }, i) => (
                  <div key={i} className={`${styles.actionResult} ${ok ? styles.actionResultOk : styles.actionResultErr}`}>
                    {ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                    <span>{action.guitarId ? `#${action.guitarId}` : action.guitarName} — {ok ? 'נשמר' : err}</span>
                  </div>
                ))}
              </div>
            )}
            {actions.length > 0 && saveResults.length === 0 && (
              <button type="button" className={styles.submitBtn} onClick={handleSave} disabled={saving || highConfidenceCount === 0}>
                {saving ? 'שומר...' : `✓ אשר ושמור (${highConfidenceCount} פעולות)`}
              </button>
            )}
          </div>
        )}
      </div>
    </>
  );
}

// ─── Main QuickEdit ───────────────────────────────────────────────────────────
export default function QuickEdit() {
  const [actionType, setActionType] = useState('collect');

  // Guitar selection (shared)
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedGuitars, setSelectedGuitars] = useState([]);
  const searchTimeout = useRef(null);

  // New donor form
  const [newDonorMode, setNewDonorMode]         = useState(false);
  const [newDonorName, setNewDonorName]         = useState('');
  const [newDonorPhone, setNewDonorPhone]       = useState('');
  const [newDonorCity, setNewDonorCity]         = useState('');
  const [newDonorGuitarType, setNewDonorGuitarType] = useState('');
  const newDonorRef = useRef(null);

  // Action-specific fields
  const [collector, setCollector]     = useState('');
  const [destination, setDestination] = useState('');
  const [collectNotes, setCollectNotes] = useState('');
  const [whoRepairs, setWhoRepairs]   = useState('');
  const [orgName, setOrgName]         = useState('');

  // Status
  const [submitting, setSubmitting]     = useState(false);
  const [actionResults, setActionResults] = useState([]);

  // Reset guitar selection when action type changes
  useEffect(() => {
    setSelectedGuitars([]);
    setSearchQuery('');
    setSearchResults([]);
    setNewDonorMode(false);
    setActionResults([]);
    setNewDonorName('');
    setNewDonorPhone('');
    setNewDonorCity('');
    setNewDonorGuitarType('');
  }, [actionType]);

  // Debounced donor search
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); return; }
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      try { setSearchResults(await searchDonors(searchQuery)); }
      catch { setSearchResults([]); }
    }, 300);
    return () => clearTimeout(searchTimeout.current);
  }, [searchQuery]);

  const handleDonorClick = async (donor) => {
    setSearchQuery(''); setSearchResults([]);
    try {
      const guitars = await getGuitarsByName(donor.name);
      setSelectedGuitars(prev => {
        const ids = new Set(prev.map(g => g.id));
        return [...prev, ...guitars.filter(g => !ids.has(g.id))];
      });
    } catch (err) { toast.error('שגיאה: ' + err.message); }
  };

  const removeGuitar = id => setSelectedGuitars(p => p.filter(g => g.id !== id));

  const openNewDonorMode = () => {
    setNewDonorName(searchQuery); // ← auto-fill from search
    setSearchQuery(''); setSearchResults([]);
    setNewDonorMode(true);
    setTimeout(() => newDonorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const resetForm = () => {
    setSelectedGuitars([]); setSearchQuery(''); setSearchResults([]);
    setNewDonorMode(false); setNewDonorName(''); setNewDonorPhone(''); setNewDonorCity(''); setNewDonorGuitarType('');
    setCollector(''); setDestination(''); setCollectNotes(''); setWhoRepairs(''); setOrgName('');
    setActionResults([]);
  };

  const buildCollectNotes = () =>
    [collectNotes.trim(), collector.trim() && `אוסף: ${collector.trim()}`, destination.trim() && `יעד: ${destination.trim()}`]
      .filter(Boolean).join(' | ');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setActionResults([]);

    // ── New donor ──
    if (newDonorMode) {
      try {
        const isCollect = actionType === 'collect';
        const isDonate  = actionType === 'donate';
        const newGuitar = await addGuitar({
          name: newDonorName.trim(), phone: newDonorPhone.trim(),
          city: newDonorCity.trim(), guitarType: newDonorGuitarType,
          collected: isCollect || isDonate,
          notes: isCollect ? buildCollectNotes() : '',
        });
        if (isDonate)       await updateGuitar(newGuitar.id, { donatedTo: orgName.trim() });
        if (actionType === 'repair_send') await updateGuitar(newGuitar.id, { whoRepairs: whoRepairs.trim() });
        if (actionType === 'repaired')    await updateGuitar(newGuitar.id, { repaired: true });
        toast.success('תורם חדש נוסף בהצלחה!');
        resetForm();
      } catch (err) { toast.error('שגיאה: ' + err.message); }
      setSubmitting(false);
      return;
    }

    // ── Validation ──
    if (selectedGuitars.length === 0) { toast.error('יש לבחור לפחות גיטרה אחת'); setSubmitting(false); return; }
    if (actionType === 'repair_send' && !whoRepairs.trim()) { toast.error('יש להזין שם המתקן'); setSubmitting(false); return; }
    if (actionType === 'donate' && !orgName.trim()) { toast.error('יש להזין שם הארגון'); setSubmitting(false); return; }

    // ── Update guitars ──
    const results = [];
    const warnings = [];

    for (const g of selectedGuitars) {
      if (actionType === 'repaired') {
        if (g.repaired)    warnings.push(`${g.name} — כבר סומנה כתוקנה בעבר`);
        if (!g.whoRepairs) warnings.push(`${g.name} — לא מצוין מי תיקן`);
      }
      try {
        let updates = {};
        if (actionType === 'collect')     updates = { collected: true, notes: buildCollectNotes() };
        if (actionType === 'repair_send') updates = { whoRepairs: whoRepairs.trim() };
        if (actionType === 'repaired')    updates = { repaired: true };
        if (actionType === 'donate')      updates = { donatedTo: orgName.trim(), collected: true };
        await updateGuitar(g.id, updates);
        results.push({ guitar: g, ok: true });
      } catch (err) {
        results.push({ guitar: g, ok: false, err: err.message });
      }
    }

    setActionResults(results);

    if (results.every(r => r.ok)) {
      toast.success(`${results.length} גיטרות עודכנו בהצלחה!`);
      warnings.forEach(w => toast(w, { icon: '⚠️', duration: 7000 }));
      resetForm();
    }
    setSubmitting(false);
  };

  const submitLabel = () => {
    if (newDonorMode) return '+ הוסף תורם חדש';
    const n = selectedGuitars.length || '';
    switch (actionType) {
      case 'collect':     return `✓ סמן ${n} גיטרות כנאספו`;
      case 'repair_send': return `🔧 שלח ${n} גיטרות לתיקון`;
      case 'repaired':    return `✓ סמן ${n} גיטרות כתוקנות`;
      case 'donate':      return `🎁 סמן ${n} גיטרות כנתרמו`;
      default:            return 'שמור';
    }
  };

  return (
    <div className={styles.page} dir="rtl">
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />
      <header className={styles.header}>
        <h1>עדכון מהיר</h1>
      </header>

      {/* Action type selector */}
      <div className={styles.form} style={{ marginBottom: 0, borderRadius: 'var(--radius) var(--radius) 0 0' }}>
        <label className={styles.label}>סוג פעולה</label>
        <select className={styles.select} value={actionType} onChange={e => setActionType(e.target.value)}>
          {ACTION_TYPES.map(a => <option key={a.key} value={a.key}>{a.label}</option>)}
        </select>
      </div>

      {/* AI mode */}
      {actionType === 'ai' && <AiMode />}

      {/* Normal form */}
      {actionType !== 'ai' && (
        <form className={styles.form} style={{ borderRadius: '0 0 var(--radius) var(--radius)', borderTop: '1px solid var(--border)' }} onSubmit={handleSubmit}>

          {/* Action-specific fields */}
          {actionType === 'collect' && (
            <>
              <label className={styles.label}>שם האוסף</label>
              <input className={styles.input} placeholder="מי אוסף את הגיטרות?" value={collector} onChange={e => setCollector(e.target.value)} />
              <label className={styles.label}>כתובת יעד</label>
              <input className={styles.input} placeholder="לאן לוקחים?" value={destination} onChange={e => setDestination(e.target.value)} />
              <label className={styles.label}>הערות</label>
              <textarea className={styles.textarea} rows={2} placeholder="הערות..." value={collectNotes} onChange={e => setCollectNotes(e.target.value)} />
            </>
          )}

          {actionType === 'repair_send' && (
            <>
              <label className={styles.label}>מי מתקן?</label>
              <input className={styles.input} placeholder="שם המתקן / סדנה..." value={whoRepairs} onChange={e => setWhoRepairs(e.target.value)} />
            </>
          )}

          {actionType === 'donate' && (
            <>
              <label className={styles.label}>שם הארגון</label>
              <input className={styles.input} placeholder="שם הארגון..." value={orgName} onChange={e => setOrgName(e.target.value)} />
            </>
          )}

          {actionType === 'repaired' && (
            <p className={styles.sectionSub}>בחר גיטרות שתוקנו — יסומנו כ-✓ תוקן</p>
          )}

          {/* Guitar search */}
          <label className={styles.label}>חיפוש תורמים</label>
          <input
            className={styles.input}
            placeholder="הקלד שם תורם לחיפוש..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
          />
          {searchResults.length > 0 && (
            <div className={styles.searchResults}>
              {searchResults.map((d, i) => (
                <div key={i} className={styles.searchResultItem} onClick={() => handleDonorClick(d)}>
                  {d.name} — {d.city}
                </div>
              ))}
            </div>
          )}
          {searchQuery.length >= 2 && searchResults.length === 0 && (
            <div className={styles.newDonorPrompt}>
              <span>"{searchQuery}" לא נמצא ברשימה</span>
              <button type="button" className={styles.newDonorBtn} onClick={openNewDonorMode}>
                + הוסף תורם חדש
              </button>
            </div>
          )}

          {/* Selected chips */}
          <label className={styles.label}>גיטרות שנבחרו ({selectedGuitars.length})</label>
          <div className={styles.chipList}>
            {selectedGuitars.length === 0 && <span style={{ color: 'var(--text-muted)', fontSize: 13 }}>טרם נבחרו גיטרות</span>}
            {selectedGuitars.map(g => (
              <span key={g.id} className={styles.chip}>
                {g.name}{g.city ? ` — ${g.city}` : ''}
                <button type="button" className={styles.chipRemove} onClick={() => removeGuitar(g.id)}><X size={13} /></button>
              </span>
            ))}
          </div>

          {/* New donor form */}
          {newDonorMode && (
            <div className={styles.newDonorForm} ref={newDonorRef}>
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
              <button type="button" className={styles.cancelLink} onClick={() => setNewDonorMode(false)}>✕ בטל, חזור לחיפוש</button>
            </div>
          )}

          {/* Results */}
          {actionResults.length > 0 && (
            <div className={styles.actionResults}>
              {actionResults.map(({ guitar, ok, err }) => (
                <div key={guitar.id} className={`${styles.actionResult} ${ok ? styles.actionResultOk : styles.actionResultErr}`}>
                  {ok ? <CheckCircle size={14} /> : <AlertCircle size={14} />}
                  <span>{guitar.name} — {ok ? 'עודכן בהצלחה' : `שגיאה: ${err}`}</span>
                </div>
              ))}
            </div>
          )}

          <button
            type="submit"
            className={styles.submitBtn}
            disabled={submitting || (selectedGuitars.length === 0 && !newDonorMode)}
          >
            {submitting ? 'שומר...' : submitLabel()}
          </button>
        </form>
      )}
    </div>
  );
}
