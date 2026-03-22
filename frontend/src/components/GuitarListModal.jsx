import { X } from 'lucide-react';
import styles from './GuitarListModal.module.css';

export default function GuitarListModal({ title, guitars, onClose }) {
  const collected = guitars.filter(g => g.collected).length;

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
