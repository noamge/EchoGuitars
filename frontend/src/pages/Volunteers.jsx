import { useEffect, useState } from 'react';
import {
  getVolunteerCollections,
  getVolunteerLog,
  approveGuitarCollection,
  rejectGuitarCollection,
  adminMarkGuitarCollected,
} from '../api/client';
import styles from './Volunteers.module.css';

const STATUS_LABELS = {
  active:  { text: 'פעיל',         color: '#2563eb' },
  sent:    { text: 'נשלח למנהל',   color: '#d97706' },
  closed:  { text: 'סגור',         color: '#6b7280' },
};

const GUITAR_STATUS_LABELS = {
  selected: { text: 'נבחרה',              bg: '#dbeafe', color: '#1d4ed8' },
  pending:  { text: 'ממתין לאישור',       bg: '#fef3c7', color: '#92400e' },
  approved: { text: 'אושר ✓',            bg: '#dcfce7', color: '#15803d' },
  rejected: { text: 'נדחה',              bg: '#fee2e2', color: '#dc2626' },
};

const ACTION_LABELS = {
  guitar_locked:             '🔒 נעל גיטרה לרשימה',
  guitar_unlocked:           '🔓 שחרר גיטרה מרשימה',
  collection_sent_to_admin:  '📤 שלח רשימה למנהל',
  guitar_marked_collected:   '📦 סימן כנאסף',
  guitar_approved:           '✅ מנהל אישר',
  guitar_rejected:           '❌ מנהל דחה',
  guitar_collected_manual:   '✓ נאסף ידנית',
  guitar_donated:            '🎁 נתרם',
  guitar_added:              '➕ נוסף לדאטהבייס',
  guitar_deleted:            '🗑 נמחק',
};

function GuitarChip({ g, collectionId, onApprove, onReject, approving }) {
  const sl = GUITAR_STATUS_LABELS[g.status] || { text: g.status, bg: '#f3f4f6', color: '#374151' };
  const isPending = g.status === 'pending';
  return (
    <div className={styles.guitarChip}>
      <div className={styles.guitarChipInfo}>
        <span className={styles.guitarChipName}>{g.name}</span>
        <span className={styles.guitarChipCity}>{g.city}{g.street ? `, ${g.street}` : ''}</span>
        {g.phone && <span className={styles.guitarChipPhone}>📞 {g.phone}</span>}
      </div>
      <div className={styles.guitarChipRight}>
        <span className={styles.guitarStatusBadge} style={{ background: sl.bg, color: sl.color }}>{sl.text}</span>
        {isPending && (
          <div className={styles.approvalBtns}>
            <button
              className={styles.approveBtn}
              onClick={() => onApprove(collectionId, g.id)}
              disabled={approving === `${collectionId}-${g.id}`}
            >
              {approving === `${collectionId}-${g.id}` ? '...' : '✓ אשר'}
            </button>
            <button
              className={styles.rejectBtn}
              onClick={() => onReject(collectionId, g.id)}
              disabled={approving === `${collectionId}-${g.id}`}
            >
              ✕ דחה
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Volunteers() {
  const [collections, setCollections] = useState([]);
  const [log, setLog]                 = useState([]);
  const [loadingC, setLoadingC]       = useState(true);
  const [loadingL, setLoadingL]       = useState(true);
  const [tab, setTab]                 = useState('active'); // active | pending | history | log
  const [approving, setApproving]     = useState(null); // `${collectionId}-${guitarId}`
  const [adminMarking, setAdminMarking] = useState(null); // `${collectionId}-${guitarId}`

  useEffect(() => {
    getVolunteerCollections()
      .then(setCollections)
      .finally(() => setLoadingC(false));
    getVolunteerLog()
      .then(setLog)
      .finally(() => setLoadingL(false));
  }, []);

  const handleApprove = async (collectionId, guitarId) => {
    setApproving(`${collectionId}-${guitarId}`);
    try {
      const updated = await approveGuitarCollection(collectionId, guitarId);
      setCollections(prev => prev.map(c => c.id === collectionId ? updated : c));
    } catch (err) {
      alert('שגיאה: ' + err.message);
    } finally {
      setApproving(null);
    }
  };

  const handleAdminMarkCollected = async (collectionId, guitarId) => {
    setAdminMarking(`${collectionId}-${guitarId}`);
    try {
      const updated = await adminMarkGuitarCollected(collectionId, guitarId);
      setCollections(prev => prev.map(c => c.id === collectionId ? updated : c));
    } catch (err) {
      alert('שגיאה: ' + err.message);
    } finally {
      setAdminMarking(null);
    }
  };

  const handleReject = async (collectionId, guitarId) => {
    setApproving(`${collectionId}-${guitarId}`);
    try {
      const updated = await rejectGuitarCollection(collectionId, guitarId);
      setCollections(prev => prev.map(c => c.id === collectionId ? updated : c));
    } catch (err) {
      alert('שגיאה: ' + err.message);
    } finally {
      setApproving(null);
    }
  };

  // Split collections
  const activeCollections  = collections.filter(c =>
    c.status !== 'closed' && c.guitars.some(g => g.status === 'selected')
  );
  const pendingCollections = collections.filter(c =>
    c.guitars.some(g => g.status === 'pending')
  );
  const historyCollections = collections.filter(c =>
    c.status === 'closed' || (!c.guitars.some(g => g.status === 'selected') && !c.guitars.some(g => g.status === 'pending'))
  );

  const pendingCount = pendingCollections.reduce(
    (sum, c) => sum + c.guitars.filter(g => g.status === 'pending').length, 0
  );

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>מתנדבים</h1>
        <p>ניהול בקשות איסוף ולוג פעולות</p>
      </header>

      {/* Tabs */}
      <div className={styles.tabs}>
        <button
          className={`${styles.tab} ${tab === 'active' ? styles.tabActive : ''}`}
          onClick={() => setTab('active')}
        >
          רשימות איסוף
          <span className={styles.tabBadgeGray}>{activeCollections.length}</span>
        </button>
        <button
          className={`${styles.tab} ${tab === 'pending' ? styles.tabActive : ''}`}
          onClick={() => setTab('pending')}
        >
          ממתין לאישור
          {pendingCount > 0 && <span className={styles.tabBadge}>{pendingCount}</span>}
        </button>
        <button
          className={`${styles.tab} ${tab === 'history' ? styles.tabActive : ''}`}
          onClick={() => setTab('history')}
        >
          היסטוריה
          <span className={styles.tabBadgeGray}>{historyCollections.length}</span>
        </button>
        <button
          className={`${styles.tab} ${tab === 'log' ? styles.tabActive : ''}`}
          onClick={() => setTab('log')}
        >
          לוג פעולות
          <span className={styles.tabBadgeGray}>{log.length}</span>
        </button>
      </div>

      {/* ── Active collections (intent to collect) ── */}
      {tab === 'active' && (
        <div className={styles.section}>
          {loadingC && <div className={styles.loading}>טוען...</div>}
          {!loadingC && activeCollections.length === 0 && (
            <div className={styles.empty}>אין רשימות איסוף פעילות כרגע</div>
          )}
          {activeCollections.map(c => (
            <div key={c.id} className={styles.collectionCard}>
              <div className={styles.collectionHeader}>
                <div>
                  <span className={styles.volunteerName}>👤 {c.volunteerName}</span>
                  {c.volunteerAddress && (
                    <span className={styles.volunteerAddr}>📍 יעד: {c.volunteerAddress}</span>
                  )}
                </div>
                <div className={styles.collectionMeta}>
                  {c.sentToAdmin && <span className={styles.sentBadge}>📤 שלח לוואטסאפ</span>}
                  <span className={styles.dateLabel}>עודכן: {new Date(c.updatedAt).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' })}</span>
                </div>
              </div>
              <div className={styles.guitarList}>
                {c.guitars.filter(g => g.status === 'selected' || g.status === 'admin_collected').map(g => (
                  <div key={g.id} className={styles.guitarChip}>
                    <div className={styles.guitarChipInfo}>
                      <span className={styles.guitarChipName}>{g.name}</span>
                      <span className={styles.guitarChipCity}>{g.city}{g.street ? `, ${g.street}` : ''}</span>
                      {g.phone && <span className={styles.guitarChipPhone}>📞 {g.phone}</span>}
                    </div>
                    <div className={styles.guitarChipRight}>
                      {g.status === 'admin_collected' ? (
                        <span className={styles.guitarStatusBadge} style={{ background: '#dcfce7', color: '#15803d' }}>✓ נאסף</span>
                      ) : (
                        <>
                          <span className={styles.guitarStatusBadge} style={{ background: '#dbeafe', color: '#1d4ed8' }}>מתוכנן לאיסוף</span>
                          <button
                            className={styles.adminCollectedBtn}
                            onClick={() => handleAdminMarkCollected(c.id, g.id)}
                            disabled={adminMarking === `${c.id}-${g.id}`}
                            title="סמן שהגיטרה כבר נאספה"
                          >
                            {adminMarking === `${c.id}-${g.id}` ? '...' : '✓ נאסף כבר'}
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Pending ── */}
      {tab === 'pending' && (
        <div className={styles.section}>
          {loadingC && <div className={styles.loading}>טוען...</div>}
          {!loadingC && pendingCollections.length === 0 && (
            <div className={styles.empty}>✅ אין בקשות ממתינות לאישור</div>
          )}
          {pendingCollections.map(c => (
            <div key={c.id} className={styles.collectionCard}>
              <div className={styles.collectionHeader}>
                <div>
                  <span className={styles.volunteerName}>👤 {c.volunteerName}</span>
                  {c.volunteerAddress && (
                    <span className={styles.volunteerAddr}>📍 {c.volunteerAddress}</span>
                  )}
                </div>
                <div className={styles.collectionMeta}>
                  {c.sentToAdmin && <span className={styles.sentBadge}>📤 נשלח למנהל</span>}
                  <span className={styles.dateLabel}>{new Date(c.updatedAt).toLocaleString('he-IL')}</span>
                </div>
              </div>
              <div className={styles.guitarList}>
                {c.guitars.map(g => (
                  <GuitarChip
                    key={g.id}
                    g={g}
                    collectionId={c.id}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    approving={approving}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── History ── */}
      {tab === 'history' && (
        <div className={styles.section}>
          {loadingC && <div className={styles.loading}>טוען...</div>}
          {!loadingC && historyCollections.length === 0 && (
            <div className={styles.empty}>אין היסטוריה עדיין</div>
          )}
          {historyCollections.map(c => (
            <div key={c.id} className={`${styles.collectionCard} ${styles.collectionCardHistory}`}>
              <div className={styles.collectionHeader}>
                <div>
                  <span className={styles.volunteerName}>👤 {c.volunteerName}</span>
                  {c.volunteerAddress && (
                    <span className={styles.volunteerAddr}>📍 {c.volunteerAddress}</span>
                  )}
                </div>
                <div className={styles.collectionMeta}>
                  <span className={styles.statusLabel} style={{ color: STATUS_LABELS[c.status]?.color }}>
                    {STATUS_LABELS[c.status]?.text || c.status}
                  </span>
                  <span className={styles.dateLabel}>{new Date(c.createdAt).toLocaleString('he-IL')}</span>
                </div>
              </div>
              <div className={styles.guitarList}>
                {c.guitars.map(g => (
                  <GuitarChip
                    key={g.id}
                    g={g}
                    collectionId={c.id}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    approving={approving}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Log ── */}
      {tab === 'log' && (
        <div className={styles.section}>
          {loadingL && <div className={styles.loading}>טוען...</div>}
          {!loadingL && log.length === 0 && (
            <div className={styles.empty}>אין פעולות בלוג עדיין</div>
          )}
          {!loadingL && (
            <div className={styles.logTable}>
              <div className={styles.logHeader}>
                <span>זמן</span>
                <span>מבצע</span>
                <span>פעולה</span>
                <span>גיטרה</span>
                <span>פרטים</span>
              </div>
              {log.map((entry, i) => (
                <div key={i} className={styles.logRow}>
                  <span className={styles.logTime}>
                    {entry.timestamp ? new Date(entry.timestamp).toLocaleString('he-IL', { dateStyle: 'short', timeStyle: 'short' }) : '—'}
                  </span>
                  <span className={styles.logActor}>{entry.actor || '—'}</span>
                  <span className={styles.logAction}>
                    {ACTION_LABELS[entry.action] || entry.action || '—'}
                  </span>
                  <span className={styles.logGuitar}>
                    {entry.guitarName ? `${entry.guitarName}${entry.guitarId ? ` #${entry.guitarId}` : ''}` : '—'}
                  </span>
                  <span className={styles.logDetails}>{entry.details || '—'}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
