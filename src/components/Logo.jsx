// Logo NEMO — pin de ubicación con estrella + wordmark en neón.
export function Logo({ size = 130 }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
      <svg width={size} height={size * 1.15} viewBox="0 0 100 115" fill="none">
        <defs>
          <filter id="glowOrange" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
          <filter id="glowGold" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="1.8" result="b" />
            <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
          </filter>
        </defs>
        {/* pin (gota) contorno naranja neón */}
        <path d="M50 8 C30 8 16 23 16 42 C16 66 50 104 50 104 C50 104 84 66 84 42 C84 23 70 8 50 8 Z"
          stroke="#FF6B2C" strokeWidth="3" fill="rgba(0,0,0,0.25)" filter="url(#glowOrange)" />
        {/* aro cian interno */}
        <circle cx="50" cy="40" r="22" stroke="#35E7E1" strokeWidth="3" fill="none" filter="url(#glowOrange)" />
        {/* estrella dorada */}
        <path d="M50 27 L54 37 L65 37 L56 44 L59 55 L50 48 L41 55 L44 44 L35 37 L46 37 Z"
          stroke="#FFCB2E" strokeWidth="2.5" fill="rgba(255,203,46,0.12)" strokeLinejoin="round" filter="url(#glowGold)" />
      </svg>
      <Wordmark size={size * 0.34} />
    </div>
  );
}

export function Wordmark({ size = 34 }) {
  return (
    <span className="neon-tube" style={{ '--nc': 'var(--cyan)', fontSize: size, fontWeight: 900, letterSpacing: size * 0.08 }}>
      NEMO
    </span>
  );
}
