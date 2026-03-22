import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BarChart2, Map, ClipboardList, Table, MapPin, X, Menu } from 'lucide-react';
import { getAddressIssuesCount } from '../api/client';
import styles from './Layout.module.css';

const nav = [
  { to: '/',               label: 'דשבורד',            Icon: BarChart2 },
  { to: '/map',            label: 'מפה',               Icon: Map },
  { to: '/collect',        label: 'עדכון מהיר',        Icon: ClipboardList },
  { to: '/table',          label: 'טבלת נתונים',       Icon: Table },
  { to: '/address-review', label: 'כתובות לא מזוהות', Icon: MapPin, badgeKey: 'addressIssues' },
];

export default function Layout() {
  const [open, setOpen]               = useState(false);
  const [addressBadge, setAddressBadge] = useState(0);

  useEffect(() => {
    getAddressIssuesCount()
      .then(setAddressBadge)
      .catch(() => {});
  }, []);

  const getBadge = (key) => {
    if (key === 'addressIssues') return addressBadge;
    return 0;
  };

  return (
    <div className={styles.shell}>
      {/* Overlay */}
      {open && <div className={styles.overlay} onClick={() => setOpen(false)} />}

      {/* Sidebar drawer */}
      <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>🎸</span>
            <span className={styles.logoText}>EchoGuitars</span>
          </div>
          <button className={styles.closeBtn} onClick={() => setOpen(false)}>
            <X size={20} />
          </button>
        </div>

        <nav className={styles.nav}>
          {nav.map(({ to, label, Icon, badgeKey }) => {
            const badge = badgeKey ? getBadge(badgeKey) : 0;
            return (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `${styles.navLink} ${isActive ? styles.active : ''}`
                }
                onClick={() => setOpen(false)}
              >
                <Icon size={20} />
                <span>{label}</span>
                {badge > 0 && <span className={styles.badge}>{badge}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <p>גיטרה לכל ילד</p>
        </div>
      </aside>

      {/* Main content */}
      <main className={styles.main}>
        {/* Hamburger button inside main, so it doesn't cover content */}
        <div className={styles.topBar}>
          <button className={styles.menuBtn} onClick={() => setOpen(true)}>
            <Menu size={22} />
            <span>תפריט</span>
          </button>
        </div>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
