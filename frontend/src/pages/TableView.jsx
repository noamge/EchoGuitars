import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getGuitars } from '../api/client';
import styles from './TableView.module.css';

const COLUMNS = [
  { key: 'id',         label: '#' },
  { key: 'name',       label: 'שם' },
  { key: 'city',       label: 'עיר' },
  { key: 'street',     label: 'רחוב' },
  { key: 'phone',      label: 'טלפון' },
  { key: 'guitarType', label: 'סוג גיטרה' },
  { key: 'working',    label: 'תקינות' },
  { key: 'hasCase',    label: 'קייס' },
  { key: 'defect',     label: 'פירוט תקלה' },
  { key: 'collected',  label: 'נאסף', render: v => v ? '✓' : '—' },
  { key: 'whoRepairs', label: 'מי מתקן' },
  { key: 'repaired',   label: 'תוקן', render: v => v ? '✓' : '—' },
  { key: 'donatedTo',  label: 'נתרם ל' },
  { key: 'notes',      label: 'הערות' },
  { key: 'region',     label: 'אזור' },
  { key: 'imageUrl',   label: 'תמונה', render: v => v
      ? <a href={v} target="_blank" rel="noopener noreferrer" style={{color:'#2563eb'}}>📷 צפה</a>
      : '—'
  },
];

export default function TableView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [guitars, setGuitars]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [search, setSearch]     = useState('');

  const filterField = searchParams.get('field');
  const filterValue = searchParams.get('value');

  useEffect(() => {
    getGuitars()
      .then(setGuitars)
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    let rows = guitars;
    if (filterField && filterValue !== null && filterValue !== undefined) {
      rows = rows.filter(g => {
        const gVal = g[filterField];
        // Handle boolean fields
        if (typeof gVal === 'boolean') return gVal === (filterValue === 'true');
        return String(gVal) === filterValue;
      });
    }
    if (search) {
      const q = search.toLowerCase();
      rows = rows.filter(g =>
        COLUMNS.some(col => String(g[col.key] ?? '').toLowerCase().includes(q))
      );
    }
    return rows;
  }, [guitars, filterField, filterValue, search]);

  const clearFilter = () => setSearchParams({});

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>טבלת נתונים</h1>
        <div className={styles.controls}>
          {filterField && (
            <div className={styles.activeFilter}>
              מסנן: <strong>{filterField} = {filterValue}</strong>
              <button onClick={clearFilter}>✕ נקה</button>
            </div>
          )}
          <input
            className={styles.search}
            placeholder="חיפוש חופשי..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <span className={styles.count}>{filtered.length} רשומות</span>
        </div>
      </header>

      {loading ? (
        <div className={styles.loading}>טוען...</div>
      ) : (
        <div className={styles.tableWrapper}>
          <table className={styles.table}>
            <thead>
              <tr>
                {COLUMNS.map(col => (
                  <th key={col.key}>{col.label}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(g => (
                <tr key={g.id} className={g.collected ? styles.collected : ''}>
                  {COLUMNS.map(col => (
                    <td key={col.key}>
                      {col.render ? col.render(g[col.key]) : (g[col.key] ?? '—')}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
