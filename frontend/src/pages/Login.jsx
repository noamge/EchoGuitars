import { useState } from 'react';

export default function Login({ onLogin }) {
  const [password, setPassword] = useState('');
  const [error, setError]       = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (password === import.meta.env.VITE_APP_PASSWORD) {
      localStorage.setItem('echo_auth', '1');
      onLogin();
    } else {
      setError(true);
      setPassword('');
    }
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      minHeight: '100vh', background: 'var(--bg)', direction: 'rtl',
    }}>
      <div style={{
        background: 'var(--bg-card)', borderRadius: 14, padding: '40px 36px',
        boxShadow: 'var(--shadow)', width: 320, textAlign: 'center',
      }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎸</div>
        <h1 style={{ fontSize: 20, fontWeight: 700, color: 'var(--primary-dark)', marginBottom: 6 }}>
          EchoGuitars
        </h1>
        <p style={{ fontSize: 13, color: 'var(--text-muted)', marginBottom: 28 }}>
          הזן סיסמה להמשך
        </p>
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
            border: 'none', borderRadius: 8, fontSize: 15, fontWeight: 700,
          }}>
            כניסה
          </button>
        </form>
      </div>
    </div>
  );
}
