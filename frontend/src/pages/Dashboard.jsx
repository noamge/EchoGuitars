import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell,
  Tooltip, ResponsiveContainer, XAxis, YAxis, Legend,
} from 'recharts';
import { getGuitarStats, getGuitars } from '../api/client';
import CitiesDrilldown from './CitiesDrilldown';
import GuitarListModal from '../components/GuitarListModal';
import styles from './Dashboard.module.css';

const REGION_COLORS = {
  'צפון': '#1a9641', 'שרון': '#52b788', 'מרכז': '#a6d96a',
  'ירושלים': '#ffffbf', 'דרום': '#fdae61', 'שפלה': '#d7191c', 'אחר': '#adb5bd',
};

const TYPE_COLORS = {
  'קלאסית': '#1a9641', 'אקוסטית': '#fdae61', 'חשמלית': '#2e7fbf',
};

// ירוק → צהוב → כתום → אדום (לפי כמות - יוקצה דינמית)
const HEAT_PALETTE = ['#1a9641','#52b788','#a6d96a','#d9ef8b','#fee08b','#fdae61','#f46d43','#d7191c'];

function heatColors(data) {
  const sorted = [...data].sort((a, b) => b.value - a.value);
  const rank = {};
  sorted.forEach((d, i) => { rank[d.name] = i; });
  return data.map(d => HEAT_PALETTE[Math.min(rank[d.name], HEAT_PALETTE.length - 1)]);
}

function StatCard({ label, value, color, sub, onClick, style }) {
  return (
    <div className={styles.statCard} style={{ borderTop: `4px solid ${color}`, cursor: onClick ? 'pointer' : 'default', ...style }} onClick={onClick}>
      <div className={styles.statValue}>{value}</div>
      <div className={styles.statLabel}>{label}</div>
      {sub && <div className={styles.statSub}>{sub}</div>}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const goToTable = (field, value) => navigate(`/table?field=${field}&value=${encodeURIComponent(value)}`);

  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCities, setShowCities] = useState(false);
  const [allGuitars, setAllGuitars] = useState([]);
  const [modal, setModal] = useState(null); // { title, guitars }

  useEffect(() => {
    Promise.all([getGuitarStats(), getGuitars()])
      .then(([s, g]) => { setStats(s); setAllGuitars(g); })
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className={styles.center}>טוען נתונים...</div>;
  if (error)   return <div className={styles.center} style={{ color: 'red' }}>שגיאה: {error}</div>;
  if (!stats)  return null;

  const collectedPct    = stats.total ? Math.round((stats.collected / stats.total) * 100) : 0;
  const waitingPickup   = allGuitars.filter(g => !g.collected);
  const readyToDonate   = allGuitars.filter(g => g.repaired && !g.donatedTo);
  const donated         = allGuitars.filter(g => g.donatedTo);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <h1>לוח בקרה</h1>
        <p>גיטרות לכל ילד — סקירת מלאי</p>
      </header>

      {/* KPI row */}
      <div className={styles.statsRow}>
        <StatCard label="סה״כ גיטרות" value={stats.total} color="#2d6a4f"
          onClick={() => setModal({ title: 'כל הגיטרות', guitars: allGuitars })} />
        <StatCard label="ממתינות לאיסוף" value={waitingPickup.length} color="#f4a261"
          sub={`${100 - collectedPct}% מהסך הכל`}
          onClick={() => setModal({ title: 'גיטרות ממתינות לאיסוף', guitars: waitingPickup, showTypeSummary: true })} />
        <StatCard label="מוכנות לתרומה" value={readyToDonate.length} color="#7c3aed"
          sub="תוקנו, טרם נתרמו"
          onClick={() => setModal({ title: 'גיטרות מוכנות לתרומה', guitars: readyToDonate })} />
        <StatCard label="נתרמו" value={donated.length} color="#4361ee"
          onClick={() => setModal({ title: 'גיטרות שנתרמו', guitars: donated })} />
      </div>

      <div className={styles.chartsGrid}>

        {/* By Region */}
        <div className={styles.chartCard}>
          <h2>לפי אזור</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={stats.byRegion} margin={{ top: 5, right: 16, left: 0, bottom: 5 }} style={{ cursor: 'pointer' }}>
              <XAxis dataKey="name" tick={{ fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
              <Tooltip />
              <Bar dataKey="value" name="גיטרות" radius={[4,4,0,0]} onClick={(data) => setModal({ title: `גיטרות באזור ${data.name}`, guitars: allGuitars.filter(g => g.region === data.name) })}>
                {stats.byRegion.map(entry => (
                  <Cell key={entry.name} fill={REGION_COLORS[entry.name] || '#adb5bd'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By Guitar Type */}
        <div className={styles.chartCard}>
          <h2>לפי סוג גיטרה</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={stats.byType}
                dataKey="value"
                nameKey="name"
                cx="50%" cy="50%"
                outerRadius={85}
                onClick={(data) => { if (!data?.name) return; setModal({ title: `גיטרות מסוג ${data.name}`, guitars: allGuitars.filter(g => g.guitarType === data.name) }); }}
                style={{ cursor: 'pointer' }}
              >
                {stats.byType.map(entry => (
                  <Cell key={entry.name} fill={TYPE_COLORS[entry.name] || '#adb5bd'} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Top Cities */}
        <div className={styles.chartCard}>
          <h2>ערים מובילות (Top 10)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={[...stats.byCity].sort((a,b) => b.value - a.value).slice(0,10)}
              layout="vertical"
              margin={{ top: 5, right: 8, left: 60, bottom: 5 }}
              style={{ cursor: 'pointer' }}
            >
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={58} />
              <Tooltip />
              <Bar dataKey="value" name="גיטרות" radius={[0,4,4,0]} onClick={(data) => setModal({ title: `גיטרות ב${data.name}`, guitars: allGuitars.filter(g => g.city === data.name) })}>
                {heatColors([...stats.byCity].sort((a,b) => b.value - a.value).slice(0,10)).map((color, i) => (
                  <Cell key={i} fill={color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Donated To */}
        <div className={styles.chartCard}>
          <h2>נתרמו ל...</h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart
              data={[...stats.byDonatedTo].sort((a,b) => b.value - a.value).slice(0,8)}
              layout="vertical"
              margin={{ top: 5, right: 8, left: 90, bottom: 5 }}
              style={{ cursor: 'pointer' }}
            >
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={88} />
              <Tooltip />
              <Bar dataKey="value" name="גיטרות" radius={[0,4,4,0]} onClick={(data) => setModal({ title: `נתרמו ל${data.name}`, guitars: allGuitars.filter(g => g.donatedTo === data.name) })}>
                {heatColors([...stats.byDonatedTo].sort((a,b) => b.value - a.value).slice(0,8)).map((color, i) => (
                  <Cell key={i} fill={color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Guitar Working condition */}
        <div className={styles.chartCard}>
          <h2>תקינות הגיטרה</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie
                data={stats.byWorking}
                dataKey="value"
                nameKey="name"
                cx="50%" cy="50%"
                outerRadius={85}
                onClick={(data) => setModal({ title: `תקינות: ${data.name}`, guitars: allGuitars.filter(g => {
                  const v = (g.working || '').toLowerCase();
                  if (data.name === 'כן (עם הערות)') return v.startsWith('כן');
                  if (data.name === 'לא') return v === 'לא' || v.startsWith('לא ');
                  if (data.name === 'חצי') return v.includes('חצי');
                  if (data.name === 'בעיה במיתרים') return v.includes('מיתר');
                  return true;
                }) })}
                style={{ cursor: 'pointer' }}
              >
                {heatColors(stats.byWorking).map((color, i) => (
                  <Cell key={i} fill={color} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>

      </div>

      {showCities && stats && (
        <CitiesDrilldown
          stats={stats}
          guitars={allGuitars}
          onClose={() => setShowCities(false)}
        />
      )}

      {modal && (
        <GuitarListModal
          title={modal.title}
          guitars={modal.guitars}
          onClose={() => setModal(null)}
        />
      )}
    </div>
  );
}
