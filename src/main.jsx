import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { supabaseReady } from './lib/db';
import './styles/theme.css';

// muestra errores en pantalla en vez de dejar todo en blanco
class ErrorBoundary extends React.Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) { console.error('PartyFinder error:', err, info); }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 24, color: '#EAF2FF', fontFamily: 'sans-serif' }}>
          <h2 style={{ color: '#FF3DB8' }}>Algo falló al cargar</h2>
          <p style={{ color: '#EAF2FF', fontSize: 15, fontWeight: 700 }}>{String(this.state.err?.message || this.state.err)}</p>
          <button
            onClick={() => { try { localStorage.clear(); } catch {} location.href = '/'; }}
            style={{ margin: '16px 0', padding: '12px 20px', background: '#35E7E1', color: '#04231F', border: 'none', borderRadius: 10, fontSize: 15, fontWeight: 800 }}>
            Reiniciar y empezar de cero
          </button>
          <details style={{ marginTop: 8 }}>
            <summary style={{ color: '#8FA3C4', fontSize: 13, cursor: 'pointer' }}>Ver detalle técnico</summary>
            <pre style={{ whiteSpace: 'pre-wrap', fontSize: 12, color: '#8FA3C4' }}>{String(this.state.err?.stack || this.state.err)}</pre>
          </details>
        </div>
      );
    }
    return this.props.children;
  }
}

function Root() {
  if (!supabaseReady) {
    return (
      <div style={{ padding: 24, color: '#EAF2FF', fontFamily: 'sans-serif', maxWidth: 520, margin: '40px auto' }}>
        <h2 style={{ color: '#35E7E1' }}>Falta configurar Supabase</h2>
        <p style={{ color: '#8FA3C4', lineHeight: 1.5 }}>
          Creá un archivo <b>.env</b> en la raíz del proyecto (junto a package.json) con:
        </p>
        <pre style={{ background: '#141B2D', padding: 14, borderRadius: 8, fontSize: 13, color: '#EAF2FF' }}>
VITE_SUPABASE_URL=tu_url{'\n'}VITE_SUPABASE_ANON_KEY=tu_anon_key
        </pre>
        <p style={{ color: '#8FA3C4', lineHeight: 1.5 }}>
          Son las mismas claves que usa tu app Expo (en su .env están como EXPO_PUBLIC_SUPABASE_URL). Después reiniciá <code>npm run dev</code>.
        </p>
      </div>
    );
  }
  return <ErrorBoundary><App /></ErrorBoundary>;
}

ReactDOM.createRoot(document.getElementById('root')).render(<Root />);
