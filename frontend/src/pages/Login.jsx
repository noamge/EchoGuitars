import { useState } from 'react';

const ADMIN_PASSWORD     = 'JANIS123';
const VOLUNTEER_PASSWORD = 'JANIS';

export default function Login({ onLogin }) {
  const [mode, setMode]         = useState(null); // 'admin' | 'volunteer' | null
  const [password, setPassword] = useState('');
  const [error, setError]       = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    const expected = mode === 'admin' ? ADMIN_PASSWORD : VOLUNTEER_PASSWORD;
    if (password === expected) {
      localStorage.setItem('echo_auth', '1');
      localStorage.setItem('echo_role', mode);
      onLogin(mode);
    } else {
      setError(true);
      setPassword('');
    }
  };

  const card = {
    background: 'var(--bg-card)', borderRadius: 16, padding: '40px 36px',
    boxShadow: 'var(--shadow)', width: 340, textAlign: 'center', direction: 'rtl',
  };

  // ── Mode selection screen ──────────────────────────────────────────────────
  if (!mode) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
        <div style={card}>
          <div style={{ fontSize: 52, marginBottom: 10 }}>🎸</div>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 6 }}>EchoGuitars</h1>
          <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 32 }}>גיטרה לכל ילד</p>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <button
              onClick={() => setMode('volunteer')}
              style={{
                padding: '14px', borderRadius: 10, border: '2px solid var(--primary)',
                background: 'transparent', color: 'var(--primary)',
                fontSize: 15, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'background 0.15s, color 0.15s',
              }}
              onMouseOver={e => { e.currentTarget.style.background = 'var(--primary)'; e.currentTarget.style.color = '#fff'; }}
              onMouseOut={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--primary)'; }}
            >
              🙋 מתנדב לאיסוף גיטרה
            </button>

            <button
              onClick={() => setMode('admin')}
              style={{
                padding: '14px', borderRadius: 10, border: '2px solid var(--border)',
                background: 'transparent', color: 'var(--text-muted)',
                fontSize: 14, fontWeight: 600, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseOver={e => { e.currentTarget.style.borderColor = 'var(--primary-light)'; e.currentTarget.style.color = 'var(--primary)'; }}
              onMouseOut={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-muted)'; }}
            >
              🔐 כניסה כמנהל
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Password screen ────────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'var(--bg)' }}>
      <div style={card}>
        <div style={{ fontSize: 52, marginBottom: 10 }}>🎸</div>
        <h1 style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 4 }}>
          {mode === 'admin' ? 'כניסה כמנהל' : 'מתנדב לאיסוף גיטרה'}
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 24 }}>הזן סיסמה להמשך</p>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <input
            type="password"
            placeholder="סיסמה..."
            value={password}
            onChange={e => { setPassword(e.target.value); setError(false); }}
            autoFocus
            style={{
              padding: '10px 14px', border: `1.5px solid ${error ? '#ef4444' : 'var(--border)'}`,
              borderRadius: 8, fontSize: 15, textAlign: 'center', direction: 'ltr',
            }}
          />
          {error && <p style={{ color: '#ef4444', fontSize: 13, margin: 0 }}>סיסמה שגויה</p>}
          <button type="submit" style={{
            padding: '11px', background: 'var(--primary)', color: '#fff',
            border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700, cursor: 'pointer',
          }}>
            כניסה
          </button>
          <button
            type="button"
            onClick={() => { setMode(null); setPassword(''); setError(false); }}
            style={{
              background: 'none', border: 'none', color: 'var(--text-muted)',
              fontSize: 13, cursor: 'pointer', textDecoration: 'underline', padding: 0,
            }}
          >
            חזרה
          </button>
        </form>
      </div>
    </div>
  );
}
