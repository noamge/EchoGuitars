import { useEffect, useState } from 'react';
import {
  getVolunteerCollections,
  getVolunteerLog,
  approveGuitarCollection,
  rejectGuitarCollection,
  adminMarkGuitarCollected,
} from '../api/client';
import styles from './Volunteers.module.css';

const GUITAR_STATUS_LABELS = {
  selected:         { text: 'מתוכנן לאיסוף',      bg: '#dbeafe', color: '#1d4ed8' },
  pending:          { text: 'ממתין לאישור',       bg: '#fef3c7', color: '#92400e' },
  approved:         { text: 'אושר ✓',            bg: '#dcfce7', color: '#15803d' },
  admin_collected:  { text: 'עודכן ע"י מנהל ✓',   bg: '#dcfce7', color: '#15803d' },
  rejected:         { text: 'נדחה',              bg: '#fee2e2', color: '#dc2626' },
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

function GuitarChip({ g, collectionId, onApprove, onReject, onAdminMarkCollected, approving, adminMarking }) {
  const sl = GUITAR_STATUS_LABELS[g.status] || { text: g.status, bg: '#f3f4f6', color: '#374151' };
  const isPending  = g.status === 'pending';
  const isSelected = g.status === 'selected';
  const key = `${collectionId}-${g.id}`;
  return (
    <div className={styles.guitarChip}>
      {g.photoUrl && (
        <a href={g.photoUrl} target="_blank" rel="noopener noreferrer" className={styles.guitarChipThumbLink}>
          <img src={g.photoUrl} alt="" className={styles.guitarChipThumb} />
        </a>
      )}
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
              disabled={approving === key}
            >
              {approving === key ? '...' : '✓ אשר'}
            </button>
            <button
              className={styles.rejectBtn}
              onClick={() => onReject(collectionId, g.id)}
              disabled={approving === key}
            >
              ✕ דחה
            </button>
          </div>
        )}
        {isSelected && (
          <button
            className={styles.adminCollectedBtn}
            onClick={() => onAdminMarkCollected(collectionId, g.id)}
            disabled={adminMarking === key}
            title="סמן שהגיטרה כבר נאספה"
          >
            {adminMarking === key ? '...' : '✓ נאסף כבר'}
          </button>
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
  const [tab, setTab]                 = useState('active'); // active | log
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

  // One row per volunteer collection, newest volunteer-activity first.
  // Approvals/rejections (admin actions) don't bump order — only the volunteer
  // saving a new list or marking a guitar collected does.
  const sortedCollections = [...collections].sort((a, b) => {
    const ta = new Date(a.volunteerActivityAt || a.updatedAt || a.createdAt || 0).getTime();
    const tb = new Date(b.volunteerActivityAt || b.updatedAt || b.createdAt || 0).getTime();
    return tb - ta;
  });

  const pendingCount = collections.reduce(
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
          {pendingCount > 0 && <span className={styles.tabBadge}>{pendingCount}</span>}
        </button>
        <button
          className={`${styles.tab} ${tab === 'log' ? styles.tabActive : ''}`}
          onClick={() => setTab('log')}
        >
          לוג פעולות
          <span className={styles.tabBadgeGray}>{log.length}</span>
        </button>
      </div>

      {/* ── Collection lists (one per volunteer, newest activity first) ── */}
      {tab === 'active' && (
        <div className={styles.section}>
          {loadingC && <div className={styles.loading}>טוען...</div>}
          {!loadingC && sortedCollections.length === 0 && (
            <div className={styles.empty}>אין רשימות איסוף עדיין</div>
          )}
          {sortedCollections.map(c => (
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
                {c.guitars.map(g => (
                  <GuitarChip
                    key={g.id}
                    g={g}
                    collectionId={c.id}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    onAdminMarkCollected={handleAdminMarkCollected}
                    approving={approving}
                    adminMarking={adminMarking}
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
