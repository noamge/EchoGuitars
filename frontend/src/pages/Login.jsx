import { useState, useEffect } from 'react';
import styles from './Login.module.css';

const ADMIN_PASSWORD     = 'JANIS123';
const VOLUNTEER_PASSWORD = 'JANIS';

const s = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'linear-gradient(135deg, #0f2027 0%, #1a3a5c 50%, #2d6a4f 100%)',
    padding: '24px 16px',
  },
  card: {
    background: '#fff',
    borderRadius: 20,
    padding: '36px 36px 30px',
    width: '100%',
    maxWidth: 380,
    boxShadow: '0 24px 64px rgba(0,0,0,0.32)',
    direction: 'rtl',
  },
  logoArea: { textAlign: 'center', marginBottom: 24 },
  logoTitle: { fontSize: 22, fontWeight: 800, color: '#1a3a5c', margin: '8px 0 2px', letterSpacing: '-0.3px' },
  logoSub:   { fontSize: 13, color: '#6b7280', margin: 0 },
  sectionTitle: {
    fontSize: 15, fontWeight: 700, color: '#1a3a5c',
    marginBottom: 16, paddingBottom: 10,
    borderBottom: '2px solid #e5e7eb',
  },
  fieldGroup: { marginBottom: 12 },
  label: { display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 },
  input: {
    width: '100%', padding: '10px 13px',
    border: '1.5px solid #d1d5db', borderRadius: 9,
    fontSize: 14, color: '#111827', background: '#f9fafb',
    boxSizing: 'border-box', outline: 'none', fontFamily: 'inherit',
    transition: 'border-color 0.15s',
  },
  inputError: { borderColor: '#ef4444', background: '#fff5f5' },
  errorMsg:   { color: '#ef4444', fontSize: 12, marginTop: 4 },
  btn: {
    width: '100%', padding: '12px',
    background: 'linear-gradient(135deg, #1a3a5c, #2d6a4f)',
    color: '#fff', border: 'none', borderRadius: 10,
    fontSize: 15, fontWeight: 700, cursor: 'pointer',
    marginTop: 6, letterSpacing: '0.3px',
    transition: 'opacity 0.15s',
  },
  divider: {
    display: 'flex', alignItems: 'center', gap: 10,
    margin: '20px 0 16px', color: '#9ca3af', fontSize: 12,
  },
  dividerLine: { flex: 1, height: 1, background: '#e5e7eb' },
  adminBtn: {
    width: '100%', padding: '10px',
    background: 'transparent', color: '#6b7280',
    border: '1.5px solid #e5e7eb', borderRadius: 9,
    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
    transition: 'border-color 0.15s, color 0.15s',
  },
  backLink: {
    background: 'none', border: 'none', color: '#9ca3af',
    fontSize: 13, cursor: 'pointer', textDecoration: 'underline',
    display: 'block', textAlign: 'center', marginTop: 12, fontFamily: 'inherit',
  },
};

function SplashScreen() {
  return (
    <div className={styles.splash}>
      <div className={styles.splashLogoWrap}>
        <div className={styles.spinner} />
        <div className={styles.pulseRing} />
        <div className={styles.pulseRing2} />
        <img src="/logo.png" alt="אקו" className={styles.splashLogo} />
      </div>
      <div className={styles.splashText}>אקו — גיטרה לכל ילד</div>
      <div className={styles.splashSub}>לזכר רס״ן עמרי דוד</div>
    </div>
  );
}

export default function Login({ onLogin }) {
  const [showSplash, setShowSplash] = useState(true);
  const [adminMode, setAdminMode]   = useState(false);
  const [adminPw, setAdminPw]       = useState('');
  const [adminErr, setAdminErr]     = useState(false);
  const [volName, setVolName]       = useState('');
  const [volAddress, setVolAddress] = useState('');
  const [volPw, setVolPw]           = useState('');
  const [volErr, setVolErr]         = useState('');

  // Hide splash after animation completes (2s fade + 0.5s fadeOut)
  useEffect(() => {
    const t = setTimeout(() => setShowSplash(false), 2500);
    return () => clearTimeout(t);
  }, []);

  const handleVolunteer = (e) => {
    e.preventDefault();
    if (!volName.trim()) { setVolErr('יש להזין שם מלא'); return; }
    if (volPw !== VOLUNTEER_PASSWORD) { setVolErr('סיסמה שגויה'); setVolPw(''); return; }
    const info = { name: volName.trim(), address: volAddress.trim() };
    localStorage.setItem('echo_auth', '1');
    localStorage.setItem('echo_role', 'volunteer');
    localStorage.setItem('volunteer_info', JSON.stringify(info));
    onLogin('volunteer', info);
  };

  const handleAdmin = (e) => {
    e.preventDefault();
    if (adminPw !== ADMIN_PASSWORD) { setAdminErr(true); setAdminPw(''); return; }
    localStorage.setItem('echo_auth', '1');
    localStorage.setItem('echo_role', 'admin');
    onLogin('admin', null);
  };

  return (
    <>
      {showSplash && <SplashScreen />}

      <div style={s.page}>
        {adminMode ? (
          <div style={s.card}>
            <div style={s.logoArea}>
              <img src="/logo.png" alt="אקו" className={styles.logoImg} />
              <h1 style={s.logoTitle}>כניסת מנהל</h1>
              <p style={s.logoSub}>EchoGuitars</p>
            </div>
            <form onSubmit={handleAdmin}>
              <div style={s.fieldGroup}>
                <label style={s.label}>סיסמת מנהל</label>
                <input
                  type="password" placeholder="הזן סיסמה..."
                  value={adminPw}
                  onChange={e => { setAdminPw(e.target.value); setAdminErr(false); }}
                  autoFocus dir="ltr"
                  style={{ ...s.input, ...(adminErr ? s.inputError : {}), textAlign: 'center' }}
                />
                {adminErr && <div style={s.errorMsg}>סיסמה שגויה</div>}
              </div>
              <button type="submit" style={s.btn}>כניסה</button>
              <button type="button" style={s.backLink}
                onClick={() => { setAdminMode(false); setAdminErr(false); setAdminPw(''); }}>
                ← חזרה
              </button>
            </form>
          </div>
        ) : (
          <div style={s.card}>
            <div style={s.logoArea}>
              <img src="/logo.png" alt="אקו" className={styles.logoImg} />
              <h1 style={s.logoTitle}>EchoGuitars</h1>
              <p style={s.logoSub}>גיטרה לכל ילד</p>
            </div>

            <div style={s.sectionTitle}>🙋 כניסה כמתנדב/ת</div>
            <form onSubmit={handleVolunteer}>
              <div style={s.fieldGroup}>
                <label style={s.label}>שם מלא *</label>
                <input placeholder="השם שלך..." value={volName}
                  onChange={e => { setVolName(e.target.value); setVolErr(''); }}
                  autoFocus style={s.input} />
              </div>
              <div style={s.fieldGroup}>
                <label style={s.label}>כתובת (לא חובה)</label>
                <input placeholder="עיר / רחוב — לשימוש כנקודת מוצא במפה"
                  value={volAddress} onChange={e => setVolAddress(e.target.value)} style={s.input} />
              </div>
              <div style={s.fieldGroup}>
                <label style={s.label}>סיסמה *</label>
                <input type="password" placeholder="סיסמת מתנדבים..."
                  value={volPw}
                  onChange={e => { setVolPw(e.target.value); setVolErr(''); }}
                  style={{ ...s.input, ...(volErr ? s.inputError : {}), textAlign: 'center', direction: 'ltr' }}
                />
                {volErr && <div style={s.errorMsg}>{volErr}</div>}
              </div>
              <button type="submit" style={s.btn}>כניסה כמתנדב ←</button>
            </form>

            <div style={s.divider}>
              <span style={s.dividerLine} /><span>או</span><span style={s.dividerLine} />
            </div>
            <button style={s.adminBtn} onClick={() => setAdminMode(true)}>
              🔐 כניסה כמנהל
            </button>
          </div>
        )}
      </div>
    </>
  );
}
