import { useState, useEffect, useRef } from 'react';
import toast, { Toaster } from 'react-hot-toast';
import {
  getGuitarsByName, updateGuitar, searchDonors,
  smartQuery, addGuitar,
} from '../api/client';
import { Sparkles, CheckCircle, AlertCircle, X } from 'lucide-react';
import styles from './QuickEdit.module.css';

const GUITAR_TYPES = ['קלאסית', 'אקוסטית', 'חשמלית'];

const ACTIONS = [
  {
    key: 'collect',
    icon: '🎸',
    label: 'גיטרה נאספה',
    color: '#2d6a4f',
    bg: '#f0fdf4',
    border: '#86efac',
  },
  {
    key: 'repair_send',
    icon: '🔧',
    label: 'נשלחה לתיקון',
    color: '#92400e',
    bg: '#fffbeb',
    border: '#fcd34d',
  },
  {
    key: 'repaired',
    icon: '✅',
    label: 'גיטרה תוקנה',
    color: '#1d4ed8',
    bg: '#eff6ff',
    border: '#93c5fd',
  },
  {
    key: 'donate',
    icon: '🎁',
    label: 'גיטרה נתרמה',
    color: '#5b21b6',
    bg: '#faf5ff',
    border: '#c4b5fd',
  },
];

// ─── AI Mode (unchanged) ──────────────────────────────────────────────────────
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
  const [text, setText]                     = useState('');
  const [loading, setLoading]               = useState(false);
  const [history, setHistory]               = useState([]); // { q, type, answer?, actions? }
  const [currentActions, setCurrentActions] = useState(null);
  const [confirmed, setConfirmed]           = useState({});
  const [matchedGuitars, setMatchedGuitars] = useState({});
  const [chosenIds, setChosenIds]           = useState({});
  const [saving, setSaving]                 = useState(false);
  const [saveResults, setSaveResults]       = useState([]);
  const [recording, setRecording]           = useState(false);
  const recognitionRef                      = useRef(null);
  const bottomRef                           = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [history, currentActions]);

  const startRecording = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert('הדפדפן שלך לא תומך בהקלטה קולית. נסה Chrome.'); return; }
    const rec = new SR();
    rec.lang = 'he-IL'; rec.continuous = false; rec.interimResults = false;
    rec.onresult = e => setText(p => p ? p + ' ' + e.results[0][0].transcript : e.results[0][0].transcript);
    rec.onend = () => setRecording(false);
    rec.onerror = () => setRecording(false);
    recognitionRef.current = rec;
    rec.start(); setRecording(true);
  };
  const stopRecording = () => { recognitionRef.current?.stop(); setRecording(false); };

  const handleSend = async () => {
    if (!text.trim()) return;
    const q = text.trim();
    setText('');
    setLoading(true); setCurrentActions(null); setSaveResults([]); setConfirmed({}); setMatchedGuitars({}); setChosenIds({});
    try {
      const res = await smartQuery(q);
      if (res.type === 'answer') {
        setHistory(h => [...h, { q, type: 'answer', answer: res.answer }]);
      } else {
        setHistory(h => [...h, { q, type: 'actions' }]);
        setCurrentActions(res.actions || []);
      }
    } catch (err) {
      setHistory(h => [...h, { q, type: 'answer', answer: `שגיאה: ${err.message}` }]);
    } finally { setLoading(false); }
  };

  const removeAction = idx => setCurrentActions(p => p.filter((_, i) => i !== idx));

  const handleConfirm = async (idx, action) => {
    setConfirmed(c => ({ ...c, [idx]: true }));
    if (!action.guitarId && action.guitarName) {
      try { const g = await getGuitarsByName(action.guitarName); setMatchedGuitars(m => ({ ...m, [idx]: g })); } catch {}
    }
  };

  const handleSave = async () => {
    if (!currentActions?.length) return;
    setSaving(true); setSaveResults([]);
    const results = [];
    for (let i = 0; i < currentActions.length; i++) {
      const action = currentActions[i];
      if (action.confidence === 'low' && !confirmed[i]) { results.push({ action, ok: false, err: 'דולג — לא אושר' }); continue; }
      const guitarId = chosenIds[i] ?? action.guitarId;
      if (!guitarId) { results.push({ action, ok: false, err: 'גיטרה לא זוהתה' }); continue; }
      let updates = {};
      if (action.action === 'collected')  updates = { collected: true };
      else if (action.action === 'repaired')  updates = { repaired: true, ...(action.whoRepairs ? { whoRepairs: action.whoRepairs } : {}) };
      else if (action.action === 'in_repair') updates = { repaired: false, ...(action.whoRepairs ? { whoRepairs: action.whoRepairs } : {}) };
      else if (action.action === 'donated')   updates = { donatedTo: action.donatedTo, collected: true };
      else if (action.action === 'notes')     updates = { notes: action.notes };
      try { await updateGuitar(guitarId, updates); results.push({ action, ok: true }); }
      catch (err) { results.push({ action, ok: false, err: err.message }); }
    }
    setSaveResults(results); setSaving(false);
    if (results.every(r => r.ok)) {
      setHistory(h => [...h, { q: '', type: 'answer', answer: `✅ נשמרו ${results.length} פעולות בהצלחה` }]);
      setCurrentActions(null);
    }
  };

  const highCount = currentActions ? currentActions.filter((a, i) => { const id = chosenIds[i] ?? a.guitarId; return id && (a.confidence !== 'low' || confirmed[i]); }).length : 0;

  return (
    <div className={styles.aiChat}>
      {/* History */}
      {history.length === 0 && (
        <div className={styles.aiWelcome}>
          <Sparkles size={22} />
          <p>שאל שאלה על הנתונים או תן פקודת עדכון בעברית חופשית</p>
          <div className={styles.aiExamples}>
            <span>כמה אקוסטיות לא נאספו?</span>
            <span>מה קורה עם הגיטרה של כהן?</span>
            <span>איספתי את הגיטרה של לוי מחיפה</span>
          </div>
        </div>
      )}
      {history.map((entry, i) => (
        <div key={i} className={styles.aiEntry}>
          {entry.q && <div className={styles.aiUserBubble}>{entry.q}</div>}
          {entry.type === 'answer' && <div className={styles.aiAnswerBubble}><Sparkles size={14} />{entry.answer}</div>}
          {entry.type === 'actions' && <div className={styles.aiAnswerBubble}><Sparkles size={14} />זיהיתי פעולות עדכון — ראה למטה</div>}
        </div>
      ))}

      {/* Current action cards */}
      {currentActions !== null && (
        <div className={styles.previewSection}>
          <div className={styles.previewTitle}>{currentActions.length} פעולות זוהו</div>
          {currentActions.length === 0 && <div style={{ color:'var(--text-muted)',fontSize:13 }}>לא זוהו פעולות</div>}
          {currentActions.map((action, idx) => {
            const isLow = action.confidence === 'low';
            const isConf = confirmed[idx];
            return (
              <div key={idx} className={styles.actionCard} style={isLow && !isConf ? { borderColor:'#f59e0b',background:'#fffbeb' } : {}}>
                <div className={styles.actionCardBody}>
                  <div className={styles.actionCardGuitar}>{action.guitarId ? `#${action.guitarId} — ${action.guitarName}` : `לא זוהה — ${action.guitarName}`}</div>
                  <div className={styles.actionCardDetail}>
                    {action.action === 'donated' && action.donatedTo && `נתרם ל: ${action.donatedTo}`}
                    {action.action === 'notes' && action.notes}
                    {action.action === 'repaired' && action.whoRepairs && `מתקן: ${action.whoRepairs}`}
                    {action.action === 'in_repair' && action.whoRepairs && `בתיקון אצל: ${action.whoRepairs}`}
                    {!action.guitarId && <span style={{ color:'#dc2626' }}>⚠️ לא ניתן לשמור</span>}
                  </div>
                  {isLow && action.question && (
                    <div style={{ marginTop:6,fontSize:13,color:'#92400e' }}>
                      ❓ {action.question}
                      {!isConf && (
                        <div style={{ display:'flex',gap:8,marginTop:6 }}>
                          <button type="button" onClick={() => handleConfirm(idx, action)} style={{ padding:'3px 12px',background:'#16a34a',color:'#fff',border:'none',borderRadius:6,fontSize:12,cursor:'pointer' }}>כן, נכון</button>
                          <button type="button" onClick={() => removeAction(idx)} style={{ padding:'3px 12px',background:'#dc2626',color:'#fff',border:'none',borderRadius:6,fontSize:12,cursor:'pointer' }}>לא, הסר</button>
                        </div>
                      )}
                      {isConf && !action.guitarId && matchedGuitars[idx] && (
                        <div style={{ marginTop:6 }}>
                          <select className={styles.select} value={chosenIds[idx]??''} onChange={e => setChosenIds(c => ({ ...c, [idx]: Number(e.target.value) }))} style={{ fontSize:12,padding:'4px 8px' }}>
                            <option value="">— בחר —</option>
                            {matchedGuitars[idx].map(g => <option key={g.id} value={g.id}>{g.name} | {g.city}{g.street?`, ${g.street}`:''} | {g.guitarType||'סוג לא ידוע'}{g.collected?' ✓ נאספה':''}</option>)}
                          </select>
                        </div>
                      )}
                      {isConf && (action.guitarId || chosenIds[idx]) && <span style={{ color:'#16a34a',marginRight:8,fontSize:12 }}>✓ אושר</span>}
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
                  <span>{action.guitarId ? `#${action.guitarId}` : action.guitarName} — {ok ? 'נשמר בהצלחה' : err}</span>
                </div>
              ))}
            </div>
          )}
          {currentActions.length > 0 && saveResults.length === 0 && (
            <button type="button" className={styles.submitBtn} onClick={handleSave} disabled={saving || highCount === 0}>
              {saving ? 'שומר...' : `✓ אשר ושמור (${highCount} פעולות)`}
            </button>
          )}
        </div>
      )}

      <div ref={bottomRef} />

      {/* Input */}
      <div className={styles.aiInputRow}>
        <div style={{ position: 'relative', flex: 1 }}>
          <textarea
            className={styles.aiInput}
            rows={2}
            placeholder="שאל שאלה או תן פקודת עדכון..."
            value={text}
            onChange={e => setText(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            dir="rtl"
          />
          <button type="button" onClick={recording ? stopRecording : startRecording}
            style={{ position:'absolute',left:8,bottom:8,background:recording?'#ef4444':'#6b7280',color:'#fff',border:'none',borderRadius:'50%',width:30,height:30,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,cursor:'pointer' }}>
            {recording ? '⏹' : '🎙'}
          </button>
        </div>
        <button type="button" className={styles.aiSendBtn} onClick={handleSend} disabled={!text.trim() || loading}>
          {loading ? '...' : <Sparkles size={18} />}
        </button>
      </div>
      {recording && <div style={{ color:'#ef4444',fontSize:12,marginTop:4 }}>● מקליט...</div>}
    </div>
  );
}

// ─── Main QuickEdit ───────────────────────────────────────────────────────────
export default function QuickEdit() {
  const [activeAction, setActiveAction] = useState(null); // key of selected action
  const [showAi, setShowAi]             = useState(false);

  // Guitar selection (shared across all action types)
  const [searchQuery, setSearchQuery]     = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching]         = useState(false);
  const [selectedGuitars, setSelectedGuitars] = useState([]);
  const searchTimeout = useRef(null);

  // New donor mode
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

  const [submitting, setSubmitting]       = useState(false);
  const [actionResults, setActionResults] = useState([]);

  // Reset state when switching action
  useEffect(() => {
    setSelectedGuitars([]); setSearchQuery(''); setSearchResults([]); setSearching(false);
    setNewDonorMode(false); setNewDonorName(''); setNewDonorPhone(''); setNewDonorCity(''); setNewDonorGuitarType('');
    setCollector(''); setDestination(''); setCollectNotes(''); setWhoRepairs(''); setOrgName('');
    setActionResults([]);
  }, [activeAction]);

  // Debounced donor search
  useEffect(() => {
    if (searchQuery.length < 2) { setSearchResults([]); setSearching(false); return; }
    setSearching(true);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(async () => {
      try { setSearchResults(await searchDonors(searchQuery)); } catch { setSearchResults([]); }
      finally { setSearching(false); }
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
    setNewDonorName(searchQuery);
    setSearchQuery(''); setSearchResults([]);
    setNewDonorMode(true);
    setTimeout(() => newDonorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  };

  const buildCollectNotes = () =>
    [collectNotes.trim(), collector.trim() && `אוסף: ${collector.trim()}`, destination.trim() && `יעד: ${destination.trim()}`]
      .filter(Boolean).join(' | ');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true); setActionResults([]);

    if (newDonorMode) {
      try {
        const isCollect = activeAction === 'collect';
        const isDonate  = activeAction === 'donate';
        const newGuitar = await addGuitar({
          name: newDonorName.trim(), phone: newDonorPhone.trim(),
          city: newDonorCity.trim(), guitarType: newDonorGuitarType,
          collected: isCollect || isDonate,
          notes: isCollect ? buildCollectNotes() : '',
        });
        if (isDonate)                    await updateGuitar(newGuitar.id, { donatedTo: orgName.trim() });
        if (activeAction === 'repair_send') await updateGuitar(newGuitar.id, { whoRepairs: whoRepairs.trim() });
        if (activeAction === 'repaired')    await updateGuitar(newGuitar.id, { repaired: true });
        toast.success('תורם חדש נוסף בהצלחה!');
        setActiveAction(null);
      } catch (err) { toast.error('שגיאה: ' + err.message); }
      setSubmitting(false); return;
    }

    if (selectedGuitars.length === 0) { toast.error('יש לבחור לפחות גיטרה אחת'); setSubmitting(false); return; }
    if (activeAction === 'repair_send' && !whoRepairs.trim()) { toast.error('יש להזין שם המתקן'); setSubmitting(false); return; }
    if (activeAction === 'donate' && !orgName.trim()) { toast.error('יש להזין שם הארגון'); setSubmitting(false); return; }

    const results = [];
    const warnings = [];

    for (const g of selectedGuitars) {
      if (activeAction === 'repaired') {
        if (g.repaired)    warnings.push(`${g.name} — כבר סומנה כתוקנה בעבר`);
        if (!g.whoRepairs) warnings.push(`${g.name} — לא מצוין מי תיקן`);
      }
      try {
        let updates = {};
        if (activeAction === 'collect')     updates = { collected: true, notes: buildCollectNotes() };
        if (activeAction === 'repair_send') updates = { whoRepairs: whoRepairs.trim() };
        if (activeAction === 'repaired')    updates = { repaired: true };
        if (activeAction === 'donate')      updates = { donatedTo: orgName.trim(), collected: true };
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
      setActiveAction(null);
    }
    setSubmitting(false);
  };

  const submitLabel = () => {
    const n = selectedGuitars.length;
    switch (activeAction) {
      case 'collect':     return `✓ סמן ${n} גיטרות כנאספו`;
      case 'repair_send': return `🔧 שלח ${n} גיטרות לתיקון`;
      case 'repaired':    return `✅ סמן ${n} גיטרות כתוקנות`;
      case 'donate':      return `🎁 סמן ${n} גיטרות כנתרמו`;
      default:            return 'שמור';
    }
  };

  const currentAction = ACTIONS.find(a => a.key === activeAction);

  return (
    <div className={styles.page} dir="rtl">
      <Toaster position="top-center" toastOptions={{ duration: 4000 }} />

      <header className={styles.header}>
        <h1>עדכון מהיר</h1>
        <p>בחר סוג פעולה ואז גיטרה מהרשימה</p>
      </header>

      {/* ── Action tiles ── */}
      <div className={styles.actionTiles}>
        {ACTIONS.map(a => (
          <button
            key={a.key}
            type="button"
            className={`${styles.actionTile} ${activeAction === a.key ? styles.actionTileActive : ''}`}
            style={activeAction === a.key ? { borderColor: a.border, background: a.bg, color: a.color } : {}}
            onClick={() => setActiveAction(activeAction === a.key ? null : a.key)}
          >
            <span className={styles.tileIcon}>{a.icon}</span>
            <span className={styles.tileLabel}>{a.label}</span>
          </button>
        ))}
      </div>

      {/* ── Form (shown when an action is selected) ── */}
      {activeAction && (
        <form className={styles.form} onSubmit={handleSubmit}>

          {/* Action-specific fields */}
          {activeAction === 'collect' && (
            <div className={styles.actionFields}>
              <div>
                <label className={styles.label}>שם האוסף</label>
                <input className={styles.input} placeholder="מי אוסף? (לא חובה)" value={collector} onChange={e => setCollector(e.target.value)} />
              </div>
              <div>
                <label className={styles.label}>כתובת יעד</label>
                <input className={styles.input} placeholder="לאן לוקחים? (לא חובה)" value={destination} onChange={e => setDestination(e.target.value)} />
              </div>
              <div>
                <label className={styles.label}>הערות</label>
                <textarea className={styles.textarea} rows={2} placeholder="הערות נוספות..." value={collectNotes} onChange={e => setCollectNotes(e.target.value)} />
              </div>
            </div>
          )}

          {activeAction === 'repair_send' && (
            <div className={styles.actionFields}>
              <div>
                <label className={styles.label}>מי מתקן? *</label>
                <input className={styles.input} placeholder="שם המתקן / סדנה..." value={whoRepairs} onChange={e => setWhoRepairs(e.target.value)} />
              </div>
            </div>
          )}

          {activeAction === 'repaired' && (
            <p className={styles.sectionSub} style={{ marginBottom: 0 }}>בחר גיטרות שתוקנו — יסומנו כ-✅ תוקן</p>
          )}

          {activeAction === 'donate' && (
            <div className={styles.actionFields}>
              <div>
                <label className={styles.label}>שם הארגון *</label>
                <input className={styles.input} placeholder="לאיזה ארגון נתרמה?" value={orgName} onChange={e => setOrgName(e.target.value)} />
              </div>
            </div>
          )}

          {/* Guitar search */}
          <div>
            <label className={styles.label}>חיפוש תורמים</label>
            <input
              className={styles.input}
              placeholder="הקלד שם תורם לחיפוש..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searching && (
              <div className={styles.searchingIndicator}>
                <span className={styles.searchSpinner} /> מחפש...
              </div>
            )}
            {!searching && searchResults.length > 0 && (
              <div className={styles.searchResults}>
                {searchResults.map((d, i) => (
                  <div key={i} className={styles.searchResultItem} onClick={() => handleDonorClick(d)}>
                    {d.name} — {d.city}
                  </div>
                ))}
              </div>
            )}
            {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className={styles.newDonorPrompt}>
                <span>"{searchQuery}" לא נמצא</span>
                <button type="button" className={styles.newDonorBtn} onClick={openNewDonorMode}>
                  + הוסף תורם חדש
                </button>
              </div>
            )}
          </div>

          {/* Selected chips */}
          <div>
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
          </div>

          {/* New donor form */}
          {newDonorMode && (
            <div className={styles.newDonorForm} ref={newDonorRef}>
              <div className={styles.newDonorTitle}>🎸 הוספת תורם חדש</div>
              <label className={styles.label}>שם מלא</label>
              <input className={styles.input} placeholder="שם מלא" value={newDonorName} onChange={e => setNewDonorName(e.target.value)} />
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
            style={currentAction ? { background: currentAction.color } : {}}
          >
            {submitting ? 'שומר...' : newDonorMode ? '+ הוסף תורם חדש' : submitLabel()}
          </button>
        </form>
      )}

      {/* ── AI mode ── */}
      <div className={styles.aiToggleRow}>
        <button
          type="button"
          className={styles.aiToggleBtn}
          onClick={() => { setShowAi(v => !v); setActiveAction(null); }}
        >
          <Sparkles size={15} />
          {showAi ? 'סגור עדכון חופשי' : 'עדכון חופשי (AI)'}
        </button>
      </div>
      {showAi && <AiMode />}
    </div>
  );
}
