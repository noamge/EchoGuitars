import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getGuitars } from '../api/client';
import styles from './TableView.module.css';

const COLUMNS = [
  { key: 'id',         label: '#',          width: 44 },
  { key: 'name',       label: 'שם',         width: 130 },
  { key: 'city',       label: 'עיר',        width: 90 },
  { key: 'street',     label: 'רחוב',       width: 110 },
  { key: 'phone',      label: 'טלפון',      width: 110 },
  { key: 'guitarType', label: 'סוג',        width: 80 },
  { key: 'working',    label: 'תקינות',     width: 80 },
  { key: 'hasCase',    label: 'קייס',       width: 55 },
  { key: 'collected',  label: 'נאסף',       width: 55,  render: v => v ? '✓' : '—' },
  { key: 'donatedTo',  label: 'נתרם ל',     width: 110 },
  { key: 'notes',      label: 'הערות',      width: 140 },
  { key: 'region',     label: 'אזור',       width: 70 },
  { key: 'imageUrl',   label: 'תמונה',      width: 65,  render: v => v
      ? <a href={v} target="_blank" rel="noopener noreferrer" style={{color:'#2563eb'}}>📷</a>
      : '—'
  },
];

function sortValue(g, key) {
  const v = g[key];
  if (typeof v === 'boolean') return v ? 0 : 1;
  if (typeof v === 'number') return v;
  return (v ?? '').toString().toLowerCase();
}

export default function TableView() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [guitars, setGuitars] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch]   = useState('');
  const [sortKey, setSortKey] = useState(null);
  const [sortDir, setSortDir] = useState('asc');

  const filterField = searchParams.get('field');
  const filterValue = searchParams.get('value');

  useEffect(() => {
    getGuitars().then(setGuitars).finally(() => setLoading(false));
  }, []);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  };

  const filtered = useMemo(() => {
    let rows = guitars;
    if (filterField && filterValue != null) {
      rows = rows.filter(g => {
        const gVal = g[filterField];
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
    if (sortKey) {
      rows = [...rows].sort((a, b) => {
        const av = sortValue(a, sortKey);
        const bv = sortValue(b, sortKey);
        if (av < bv) return sortDir === 'asc' ? -1 : 1;
        if (av > bv) return sortDir === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return rows;
  }, [guitars, filterField, filterValue, search, sortKey, sortDir]);

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
                  <th
                    key={col.key}
                    style={{ width: col.width, minWidth: col.width }}
                    onClick={() => handleSort(col.key)}
                    className={styles.sortableTh}
                    title={`מיין לפי ${col.label}`}
                  >
                    {col.label}
                    {sortKey === col.key
                      ? (sortDir === 'asc' ? ' ▲' : ' ▼')
                      : ' ⇅'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(g => (
                <tr key={g.id} className={g.collected ? styles.collected : ''}>
                  {COLUMNS.map(col => (
                    <td key={col.key} style={{ maxWidth: col.width }}>
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
