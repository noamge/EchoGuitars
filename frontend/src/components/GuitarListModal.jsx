import { X } from 'lucide-react';
import styles from './GuitarListModal.module.css';

const TYPE_COLORS = {
  'קלאסית':  { bg: '#dbeafe', color: '#1d4ed8' },
  'אקוסטית': { bg: '#fef3c7', color: '#92400e' },
  'חשמלית':  { bg: '#f3e8ff', color: '#7c3aed' },
};

export default function GuitarListModal({ title, guitars, onClose, showTypeSummary = false }) {
  const collected = guitars.filter(g => g.collected).length;

  // Type summary
  const typeCounts = {};
  if (showTypeSummary) {
    for (const g of guitars) {
      const t = g.guitarType || 'לא ידוע';
      typeCounts[t] = (typeCounts[t] || 0) + 1;
    }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.header}>
          <div>
            <h2>{title}</h2>
            <p className={styles.sub}>{guitars.length} רשומות · {collected} נאספו</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}><X size={18}/></button>
        </div>

        {showTypeSummary && Object.keys(typeCounts).length > 0 && (
          <div className={styles.typeSummary}>
            {Object.entries(typeCounts)
              .sort((a, b) => b[1] - a[1])
              .map(([type, count]) => {
                const c = TYPE_COLORS[type] || { bg: '#f3f4f6', color: '#374151' };
                return (
                  <span key={type} className={styles.typeChip} style={{ background: c.bg, color: c.color }}>
                    {type}: <strong>{count}</strong>
                  </span>
                );
              })}
          </div>
        )}

        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>#</th>
                <th>שם</th>
                <th>עיר</th>
                <th>סוג</th>
                <th>תקינות</th>
                <th>נאסף</th>
                <th>מי מתקן</th>
                <th>נתרם ל</th>
              </tr>
            </thead>
            <tbody>
              {[...guitars]
                .sort((a, b) => Number(b.collected) - Number(a.collected))
                .map(g => (
                  <tr key={g.id} className={g.collected ? styles.collected : styles.pending}>
                    <td>{g.id}</td>
                    <td>{g.name}</td>
                    <td>{g.city || '—'}</td>
                    <td>{g.guitarType || '—'}</td>
                    <td>{g.working || '—'}</td>
                    <td>{g.collected ? '✓' : '—'}</td>
                    <td>{g.whoRepairs || '—'}</td>
                    <td>{g.donatedTo || '—'}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
