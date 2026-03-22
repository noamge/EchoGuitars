import { useState, useMemo } from 'react';
import { X } from 'lucide-react';
import styles from './CitiesDrilldown.module.css';

export default function CitiesDrilldown({ stats, guitars, onClose }) {
  const [selectedCity, setSelectedCity] = useState(null);

  const cityGuitars = useMemo(() => {
    if (!selectedCity) return [];
    return guitars.filter(g => g.city === selectedCity);
  }, [selectedCity, guitars]);

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        <div className={styles.modalHeader}>
          <h2>{selectedCity ? `גיטרות ב${selectedCity}` : 'כל הערים'}</h2>
          <div className={styles.headerActions}>
            {selectedCity && (
              <button className={styles.backBtn} onClick={() => setSelectedCity(null)}>← חזור</button>
            )}
            <button className={styles.closeBtn} onClick={onClose}><X size={18} /></button>
          </div>
        </div>

        {!selectedCity ? (
          <div className={styles.cityList}>
            {[...stats.byCity].sort((a, b) => b.value - a.value).map(({ name, value }) => (
              <div key={name} className={styles.cityRow} onClick={() => setSelectedCity(name)}>
                <span className={styles.cityName}>{name}</span>
                <div className={styles.cityBar}>
                  <div
                    className={styles.cityBarFill}
                    style={{ width: `${(value / stats.byCity[0]?.value) * 100}%` }}
                  />
                </div>
                <span className={styles.cityCount}>{value}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className={styles.guitarTable}>
            <div className={styles.tableSummary}>
              {cityGuitars.filter(g => g.collected).length} נאספו מתוך {cityGuitars.length}
            </div>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>שם</th>
                  <th>סוג</th>
                  <th>תקינות</th>
                  <th>נאסף</th>
                  <th>מי מתקן</th>
                  <th>נתרם ל</th>
                </tr>
              </thead>
              <tbody>
                {cityGuitars
                  .sort((a, b) => Number(b.collected) - Number(a.collected))
                  .map(g => (
                    <tr key={g.id} className={g.collected ? styles.collectedRow : styles.pendingRow}>
                      <td>{g.name}</td>
                      <td>{g.guitarType || '—'}</td>
                      <td>{g.working || '—'}</td>
                      <td>{g.collected ? '✓ נאסף' : 'ממתין'}</td>
                      <td>{g.whoRepairs || '—'}</td>
                      <td>{g.donatedTo || '—'}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
