// Logo NEMO — pin de ubicación con estrella + wordmark tipo cartel de neón.
// Referencia: pin naranja, estrella dorada, aro cian; "NEMO" con relleno
// claro y triple contorno (cian → naranja → glow).
export function Logo({ size = 130 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
      <svg width={size} height={size * 1.15} viewBox="0 0 100 115" fill="none">
        <defs>
          <filter id="glowOrange" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2.4" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glowCyan" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="2" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id="glowGold" x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="1.6" result="b" />
            <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        {/* pin (gota) — doble trazo naranja para dar cuerpo de tubo */}
        <path d="M50 8 C30 8 16 23 16 42 C16 66 50 104 50 104 C50 104 84 66 84 42 C84 23 70 8 50 8 Z"
          stroke="#FF6B2C" strokeWidth="4.5" fill="rgba(0,0,0,0.25)" filter="url(#glowOrange)" />
        <path d="M50 8 C30 8 16 23 16 42 C16 66 50 104 50 104 C50 104 84 66 84 42 C84 23 70 8 50 8 Z"
          stroke="#FFB07A" strokeWidth="1.4" fill="none" />
        {/* aro cian interno */}
        <circle cx="50" cy="40" r="22" stroke="#35E7E1" strokeWidth="4" fill="none" filter="url(#glowCyan)" />
        <circle cx="50" cy="40" r="22" stroke="#B6FBF8" strokeWidth="1.2" fill="none" />
        {/* estrella dorada */}
        <path d="M50 26 L54.5 37 L66 37.5 L57 45 L60 56.5 L50 49.5 L40 56.5 L43 45 L34 37.5 L45.5 37 Z"
          stroke="#FFCB2E" strokeWidth="3" fill="rgba(255,203,46,0.18)" strokeLinejoin="round" filter="url(#glowGold)" />
        <path d="M50 26 L54.5 37 L66 37.5 L57 45 L60 56.5 L50 49.5 L40 56.5 L43 45 L34 37.5 L45.5 37 Z"
          stroke="#FFF0B8" strokeWidth="0.9" fill="none" strokeLinejoin="round" />
      </svg>
      <Wordmark size={size * 0.42} />
    </div>
  );
}

// "NEMO" tipo tubo de neón: relleno claro + triple contorno (cian, naranja, glow)
export function Wordmark({ size = 40 }) {
  return (
    <span style={{
      fontSize: size,
      fontWeight: 900,
      letterSpacing: size * 0.06,
      color: '#FFE28C',
      textShadow: [
        '-1px -1px 0 #78F0FF', '1px 1px 0 #78F0FF',
        '-1px 1px 0 #28B4D2', '1px -1px 0 #28B4D2',
        '0 0 5px #35E7E1',
        '0 0 10px #35E7E1',
        '0 0 22px #FF6B2C',
        '0 0 38px rgba(255,107,44,0.55)',
      ].join(', '),
    }}>
      NEMO
    </span>
  );
}
