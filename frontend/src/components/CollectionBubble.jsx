import { useState } from 'react';
import { X, CheckCircle, Send, MapPin } from 'lucide-react';
import styles from './CollectionBubble.module.css';

const WA_ADMIN = '972547274003';

function WaIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 3C8.82 3 3 8.82 3 16c0 2.35.64 4.55 1.76 6.44L3 29l6.74-1.76A13 13 0 0 0 16 29c7.18 0 13-5.82 13-13S23.18 3 16 3zm6.45 17.6c-.27.76-1.57 1.46-2.16 1.55-.55.08-1.24.12-2-.13-.46-.14-1.05-.34-1.8-.67-3.16-1.36-5.22-4.54-5.38-4.75-.16-.21-1.3-1.73-1.3-3.3 0-1.57.82-2.34 1.12-2.66.27-.3.6-.37.8-.37.2 0 .4 0 .57.01.18.01.44-.07.68.52.27.63.9 2.2.98 2.36.08.16.13.35.03.56-.1.21-.15.34-.3.52-.16.19-.33.42-.47.56-.16.16-.32.33-.14.65.18.32.82 1.35 1.76 2.19 1.21 1.08 2.23 1.41 2.55 1.57.32.16.5.13.68-.08.19-.21.8-.93 1.01-1.25.21-.32.42-.27.7-.16.29.11 1.84.87 2.16 1.03.32.16.53.24.61.37.08.13.08.76-.19 1.52z"/>
    </svg>
  );
}

function toWhatsApp(phone) {
  if (!phone) return null;
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('0')) p = '972' + p.slice(1);
  else if (p.startsWith('5')) p = '972' + p;
  const msg = encodeURIComponent('😊 תודה רבה על התרומה למיזם אקו! 🎸\nכדי שנתאם את איסוף הגיטרה אשמח שתכתוב כתובת מדויקת וזמן אפשרי לאיסוף.\nתודה!');
  return `https://wa.me/${p}?text=${msg}`;
}

function buildAdminWaUrl(collection, volunteerName, volunteerAddress) {
  const guitars = (collection?.guitars || []).filter(g => g.status !== 'approved' && g.status !== 'rejected');
  const lines = guitars.map(g => {
    const addr = [g.city, g.street].filter(Boolean).join(', ');
    return [g.name, addr, g.phone].filter(Boolean).join(' | ');
  }).join('\n');
  const msg = `היי, אני ${volunteerName}${volunteerAddress ? ` (${volunteerAddress})` : ''} ואני יכול/ה לאסוף את הגיטרות הבאות:\n\n${lines}`;
  return `https://wa.me/${WA_ADMIN}?text=${encodeURIComponent(msg)}`;
}

function statusLabel(status) {
  switch (status) {
    case 'pending':  return { text: 'ממתין לאישור מנהל', color: '#f59e0b' };
    case 'approved': return { text: 'אושר ✓', color: '#16a34a' };
    case 'rejected': return { text: 'נדחה', color: '#dc2626' };
    default:         return null;
  }
}

export default function CollectionBubble({
  collection,
  volunteerName,
  volunteerAddress,
  onRemove,
  onSendToAdmin,
  onMarkCollected,
}) {
  const [open, setOpen] = useState(false);

  if (!collection || collection.guitars.length === 0) return null;

  const activeGuitars  = collection.guitars.filter(g => g.status === 'selected');
  const pendingGuitars = collection.guitars.filter(g => g.status === 'pending');
  const totalActive    = activeGuitars.length + pendingGuitars.length;

  return (
    <>
      {/* ── Bubble ── */}
      <button
        className={styles.bubble}
        onClick={() => setOpen(true)}
        title="רשימת האיסוף שלי"
      >
        <span className={styles.bubbleIcon}>🎸</span>
        {totalActive > 0 && <span className={styles.bubbleBadge}>{totalActive}</span>}
        <span className={styles.bubbleLabel}>רשימת איסוף</span>
      </button>

      {/* ── Panel ── */}
      {open && (
        <div className={styles.overlay} onClick={e => e.target === e.currentTarget && setOpen(false)}>
          <div className={styles.panel} dir="rtl">
            <div className={styles.panelHeader}>
              <div>
                <h2 className={styles.panelTitle}>רשימת האיסוף שלי</h2>
                <p className={styles.panelSub}>{collection.guitars.length} גיטרות</p>
              </div>
              <button className={styles.closeBtn} onClick={() => setOpen(false)}><X size={20} /></button>
            </div>

            {/* Sent-to-admin indicator */}
            {collection.sentToAdmin && (
              <div className={styles.sentBadge}>
                <Send size={14} /> נשלח למנהל לאישור
              </div>
            )}

            <div className={styles.guitarList}>
              {collection.guitars.map(g => {
                const sl = statusLabel(g.status);
                const isActive = g.status === 'selected';
                const isPending = g.status === 'pending';
                return (
                  <div key={g.id} className={`${styles.guitarCard} ${isPending ? styles.guitarCardPending : ''} ${g.status === 'approved' ? styles.guitarCardApproved : ''}`}>
                    <div className={styles.guitarInfo}>
                      <div className={styles.guitarName}>{g.name}</div>
                      <div className={styles.guitarAddr}>
                        <MapPin size={11} /> {g.city}{g.street ? `, ${g.street}` : ''}
                      </div>
                      {g.phone && (
                        <div className={styles.guitarPhone}>
                          <a href={`tel:${g.phone}`} className={styles.phoneLink}>📞 {g.phone}</a>
                          {toWhatsApp(g.phone) && (
                            <a href={toWhatsApp(g.phone)} target="_blank" rel="noopener noreferrer" className={styles.waLink}>
                              <WaIcon /> לתיאום
                            </a>
                          )}
                        </div>
                      )}
                      {sl && <div className={styles.statusChip} style={{ color: sl.color }}>{sl.text}</div>}
                    </div>

                    <div className={styles.guitarActions}>
                      {isActive && (
                        <>
                          <button
                            className={styles.collectedBtn}
                            onClick={() => onMarkCollected(g.id)}
                            title="סמן שאספת גיטרה זו"
                          >
                            <CheckCircle size={14} /> נאספה
                          </button>
                          <button
                            className={styles.removeBtn}
                            onClick={() => onRemove(g.id)}
                            title="הסר מהרשימה"
                          >
                            <X size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className={styles.panelFooter}>
              {/* WhatsApp per-guitar links already in card; admin approval button here */}
              {!collection.sentToAdmin && activeGuitars.length > 0 && (
                <a
                  href={buildAdminWaUrl(collection, volunteerName, volunteerAddress)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.adminWaBtn}
                  onClick={onSendToAdmin}
                >
                  <WaIcon /> לאישור מנהל
                </a>
              )}
              {collection.sentToAdmin && (
                <div className={styles.alreadySent}>✓ הרשימה כבר נשלחה למנהל</div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
