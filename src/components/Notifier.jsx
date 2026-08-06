import { useEffect, useRef } from 'react';
import { loadSession, subscribeConversation } from '../lib/db';

// Escucha mensajes nuevos en todo momento (mientras la app está abierta o de
// fondo) y dispara UNA notificación "tenés mensajes sin leer". No repite hasta
// que el usuario vuelve a la app (visibilitychange resetea el flag).
export default function Notifier() {
  const notifiedRef = useRef(false);

  useEffect(() => {
    const session = loadSession();
    if (!session) return;

    // pedir permiso de notificaciones una vez (si el navegador lo soporta)
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const notify = () => {
      // no molestar si la app está visible en primer plano (ya lo ve)
      if (document.visibilityState === 'visible') return;
      if (notifiedRef.current) return;              // ya avisé, no repito
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      notifiedRef.current = true;
      try {
        new Notification('NEMO', { body: 'Tenés mensajes sin leer 💬', icon: '/icon-192.png', tag: 'nemo-unread' });
      } catch {}
      // vibrar si se puede
      try { navigator.vibrate?.(200); } catch {}
    };

    const unsub = subscribeConversation(session.group, (m) => {
      // solo si el mensaje NO es mío y me corresponde (grupo, o DM hacia mí)
      if (m.author === session.name) return;
      if (m.kind === 'group' || (m.kind === 'dm' && m.recipient === session.name)) {
        notify();
      }
    });

    // cuando el usuario vuelve a la app, reseteamos el flag (para el próximo aviso)
    const onVis = () => { if (document.visibilityState === 'visible') notifiedRef.current = false; };
    document.addEventListener('visibilitychange', onVis);

    return () => { unsub(); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  return null;
}
