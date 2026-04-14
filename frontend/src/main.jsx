import { StrictMode, Component } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'

class ErrorBoundary extends Component {
  state = { crashed: false };
  static getDerivedStateFromError() { return { crashed: true }; }
  reset() {
    localStorage.removeItem('echo_auth');
    localStorage.removeItem('echo_role');
    window.location.reload();
  }
  render() {
    if (this.state.crashed) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          justifyContent: 'center', minHeight: '100vh', gap: 16,
          fontFamily: 'inherit', direction: 'rtl',
        }}>
          <div style={{ fontSize: 40 }}>🎸</div>
          <p style={{ color: '#374151', fontWeight: 600 }}>משהו השתבש</p>
          <button
            onClick={() => this.reset()}
            style={{
              padding: '10px 24px', background: '#2d6a4f', color: '#fff',
              border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            }}
          >
            חזור למסך כניסה
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
)
