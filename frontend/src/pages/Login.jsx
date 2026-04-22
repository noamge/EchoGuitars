import { useState } from 'react';

const ADMIN_PASSWORD     = 'JANIS123';
const VOLUNTEER_PASSWORD = 'JANIS';

export default function Login({ onLogin }) {
  const [adminMode, setAdminMode]   = useState(false);
  const [adminPw, setAdminPw]       = useState('');
  const [adminErr, setAdminErr]     = useState(false);

  const [volName, setVolName]       = useState('');
  const [volAddress, setVolAddress] = useState('');
  const [volPw, setVolPw]           = useState('');
  const [volErr, setVolErr]         = useState('');

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

  const card = {
    background: 'var(--bg-card)', borderRadius: 16, padding: '36px 32px',
    boxShadow: 'var(--shadow)', width: 360, direction: 'rtl',
  };

  // ── Admin popup ─────────────────────────────────────────────────────────────
  if (adminMode) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={card}>
          <div style={{ fontSize: 40, textAlign: 'center', marginBottom: 8 }}>🔐</div>
          <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary-dark)', textAlign: 'center', marginBottom: 20 }}>כניסה כמנהל</h1>
          <form onSubmit={handleAdmin} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="password"
              placeholder="סיסמת מנהל..."
              value={adminPw}
              onChange={e => { setAdminPw(e.target.value); setAdminErr(false); }}
              autoFocus
              style={{
                padding: '10px 14px', border: `1.5px solid ${adminErr ? '#ef4444' : 'var(--border)'}`,
                borderRadius: 8, fontSize: 15, textAlign: 'center', direction: 'ltr',
              }}
            />
            {adminErr && <p style={{ color: '#ef4444', fontSize: 13, margin: 0, textAlign: 'center' }}>סיסמה שגויה</p>}
            <button type="submit" style={{
              padding: '11px', background: 'var(--primary)', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer',
            }}>כניסה</button>
            <button type="button" onClick={() => { setAdminMode(false); setAdminErr(false); setAdminPw(''); }}
              style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: 13, cursor: 'pointer', textDecoration: 'underline' }}>
              חזרה
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Main volunteer login screen ─────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={card}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 48, marginBottom: 6 }}>🎸</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 4 }}>EchoGuitars</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>גיטרה לכל ילד</p>
        </div>

        <h2 style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>התחבר כמתנדב</h2>

        <form onSubmit={handleVolunteer} style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>שם מלא *</label>
            <input
              placeholder="השם שלך..."
              value={volName}
              onChange={e => { setVolName(e.target.value); setVolErr(''); }}
              autoFocus
              style={inputStyle()}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>כתובת (לא חובה)</label>
            <input
              placeholder="עיר / רחוב..."
              value={volAddress}
              onChange={e => setVolAddress(e.target.value)}
              style={inputStyle()}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <label style={{ fontSize: 13, color: 'var(--text-muted)', fontWeight: 600 }}>סיסמה *</label>
            <input
              type="password"
              placeholder="סיסמת מתנדבים..."
              value={volPw}
              onChange={e => { setVolPw(e.target.value); setVolErr(''); }}
              style={inputStyle(!!volErr)}
              dir="ltr"
            />
          </div>

          {volErr && <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>{volErr}</p>}

          <button type="submit" style={{
            marginTop: 4, padding: '12px', background: 'var(--primary)', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}>
            🙋 כניסה כמתנדב
          </button>
        </form>

        <div style={{ marginTop: 24, paddingTop: 16, borderTop: '1px solid var(--border)', textAlign: 'center' }}>
          <button
            onClick={() => setAdminMode(true)}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              fontSize: 13, cursor: 'pointer', textDecoration: 'underline',
            }}
          >
            🔐 כניסה כמנהל
          </button>
        </div>
      </div>
    </div>
  );
}

function inputStyle(error = false) {
  return {
    padding: '9px 12px',
    border: `1.5px solid ${error ? '#ef4444' : 'var(--border)'}`,
    borderRadius: 8,
    fontSize: 14,
    background: 'var(--bg)',
    color: 'var(--text)',
  };
}
