import { Logo } from '../components/Logo';

// Pantalla de carga inicial (como la referencia): pin + NEMO + Loading.
export default function Splash() {
  return (
    <div style={S.root}>
      <Logo size={150} />
      <div style={S.loading}>
        <span style={S.spinner} />
        <span className="neon-text" style={{ '--nc': 'var(--cyan)', ...S.loadingTxt }}>Loading…</span>
      </div>
    </div>
  );
}

const S = {
  root: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 60 },
  loading: { display: 'flex', alignItems: 'center', gap: 12 },
  spinner: { width: 22, height: 22, borderRadius: 11, border: '3px solid rgba(53,231,225,0.25)', borderTopColor: 'var(--cyan)', animation: 'spin 0.8s linear infinite', display: 'inline-block' },
  loadingTxt: { fontSize: 22, fontWeight: 700 },
};
