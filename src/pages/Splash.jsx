// Pantalla de carga inicial: imagen nueva_2 (NEMO + Loading) a pantalla completa.
export default function Splash() {
  return (
    <div style={S.root}>
      <img src="/splash-bg.jpeg" alt="NEMO" style={S.bg} draggable={false} />
    </div>
  );
}

const S = {
  root: { flex: 1, position: 'relative', background: '#0a0a0c', overflow: 'hidden' },
  bg: { position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', display: 'block' },
};
