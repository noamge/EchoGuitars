import { useState, useEffect } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { BarChart2, Map, ClipboardList, Table, MapPin, Users, X, Menu } from 'lucide-react';
import { getAddressIssuesCount, getVolunteerPendingCount } from '../api/client';
import styles from './Layout.module.css';

const nav = [
  { to: '/',               label: 'דשבורד',            Icon: BarChart2 },
  { to: '/map',            label: 'מפה',               Icon: Map },
  { to: '/collect',        label: 'עדכון מהיר',        Icon: ClipboardList },
  { to: '/table',          label: 'טבלת נתונים',       Icon: Table },
  { to: '/address-review', label: 'כתובות לא מזוהות', Icon: MapPin,  badgeKey: 'addressIssues' },
  { to: '/volunteers',     label: 'מתנדבים',           Icon: Users,   badgeKey: 'volunteers' },
];

export default function Layout() {
  const [open, setOpen]                     = useState(false);
  const [addressBadge, setAddressBadge]     = useState(0);
  const [volunteerBadge, setVolunteerBadge] = useState(0);

  useEffect(() => {
    getAddressIssuesCount().then(setAddressBadge).catch(() => {});
    getVolunteerPendingCount().then(setVolunteerBadge).catch(() => {});
  }, []);

  const getBadge = (key) => {
    if (key === 'addressIssues') return addressBadge;
    if (key === 'volunteers')    return volunteerBadge;
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
                {badgeKey && <span className={styles.badge} style={badge === 0 ? { background: '#6b7280' } : {}}>{badge}</span>}
              </NavLink>
            );
          })}
        </nav>

        <div className={styles.sidebarFooter}>
          <p>גיטרה לכל ילד</p>
          <button
            className={styles.volunteerSwitchBtn}
            onClick={() => {
              localStorage.setItem('echo_auth', '1');
              localStorage.setItem('echo_role', 'volunteer');
              localStorage.setItem('volunteer_info', JSON.stringify({ name: 'נועם גבע', address: '' }));
              window.location.reload();
            }}
          >
            👤 כניסה כמתנדב
          </button>
          <button
            className={styles.logoutBtn}
            onClick={() => {
              localStorage.removeItem('echo_auth');
              localStorage.removeItem('echo_role');
              window.location.reload();
            }}
          >
            יציאה
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className={styles.main}>
        {/* Hamburger button inside main, so it doesn't cover content */}
        <div className={styles.topBar}>
          <button className={styles.menuBtn} onClick={() => setOpen(true)}>
            <Menu size={20} />
          </button>
          <div className={styles.topBarLogo}>
            <span className={styles.topBarLogoIcon}>🎸</span>
            <span className={styles.topBarLogoText}>EchoGuitars</span>
            <span className={styles.topBarBadge}>מנהל</span>
          </div>
        </div>
        <div className={styles.content}>
          <Outlet />
        </div>
      </main>
    </div>
  );
}
