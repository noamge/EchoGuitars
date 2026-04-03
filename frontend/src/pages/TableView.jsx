import { useEffect, useState, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { getGuitars, updateGuitar } from '../api/client';
import styles from './TableView.module.css';

function toWhatsApp(phone) {
  if (!phone) return null;
  let p = phone.replace(/\D/g, '');
  if (p.startsWith('972')) p = p;
  else if (p.startsWith('0')) p = '972' + p.slice(1);
  else if (p.startsWith('5')) p = '972' + p;
  return `https://wa.me/${p}`;
}

function WaIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 32 32" fill="white" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 3C8.82 3 3 8.82 3 16c0 2.35.64 4.55 1.76 6.44L3 29l6.74-1.76A13 13 0 0 0 16 29c7.18 0 13-5.82 13-13S23.18 3 16 3zm6.45 17.6c-.27.76-1.57 1.46-2.16 1.55-.55.08-1.24.12-2-.13-.46-.14-1.05-.34-1.8-.67-3.16-1.36-5.22-4.54-5.38-4.75-.16-.21-1.3-1.73-1.3-3.3 0-1.57.82-2.34 1.12-2.66.27-.3.6-.37.8-.37.2 0 .4 0 .57.01.18.01.44-.07.68.52.27.63.9 2.2.98 2.36.08.16.13.35.03.56-.1.21-.15.34-.3.52-.16.19-.33.42-.47.56-.16.16-.32.33-.14.65.18.32.82 1.35 1.76 2.19 1.21 1.08 2.23 1.41 2.55 1.57.32.16.5.13.68-.08.19-.21.8-.93 1.01-1.25.21-.32.42-.27.7-.16.29.11 1.84.87 2.16 1.03.32.16.53.24.61.37.08.13.08.76-.19 1.52z"/>
    </svg>
  );
}

const COLUMNS = [
  { key: 'id',         label: '#',          width: 44 },
  { key: 'name',       label: 'שם',         width: 130 },
  { key: 'city',       label: 'עיר',        width: 90 },
  { key: 'street',     label: 'רחוב',       width: 110 },
  { key: 'phone',      label: 'טלפון',      width: 145, render: v => v ? (
    <span style={{ display:'flex', gap:6, alignItems:'center' }}>
      <a href={`tel:${v}`} style={{ color:'var(--primary)', textDecoration:'none', fontWeight:500 }}>{v}</a>
      <a href={toWhatsApp(v)} target="_blank" rel="noopener noreferrer"
        style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', background:'#25d366', borderRadius:'50%', width:20, height:20, flexShrink:0, textDecoration:'none' }}>
        <WaIcon />
      </a>
    </span>
  ) : '—' },
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
  const [marking, setMarking] = useState(null);

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

  const markCollected = async (id) => {
    setMarking(id);
    try {
      await updateGuitar(id, { collected: true });
      setGuitars(prev => prev.map(g => g.id === id ? { ...g, collected: true } : g));
    } catch (err) {
      alert('שגיאה: ' + err.message);
    } finally {
      setMarking(null);
    }
  };

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
                <th style={{ width: 90, minWidth: 90 }}>פעולה</th>
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
                  <td>
                    {!g.collected && (
                      <button
                        className={styles.collectBtn}
                        onClick={() => markCollected(g.id)}
                        disabled={marking === g.id}
                      >
                        {marking === g.id ? '...' : '✓ נאסף'}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
