import { useEffect, useRef } from 'react';
import { loadSession, subscribeConversation, fetchConvUnread } from '../lib/db';

// Notifica cuando llega un mensaje y el usuario no está mirando el chat.
// Usa el service worker (registration.showNotification) que es más robusto que
// new Notification() y es la ÚNICA vía que funciona en iOS.
// LÍMITE: si la app está TOTALMENTE cerrada, esto no corre (haría falta push real
// con backend). Funciona con la app abierta o recién puesta en segundo plano.
export default function Notifier() {
  const notifiedRef = useRef(false);

  useEffect(() => {
    const session = loadSession();
    if (!session) return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const showNotif = async () => {
      if (document.visibilityState === 'visible') return;   // ya lo ve
      if (notifiedRef.current) return;                       // ya avisé
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      notifiedRef.current = true;
      const opts = { body: 'Tenés mensajes sin leer 💬', icon: '/icon-192.png',
        badge: '/icon-192.png', tag: 'nemo-unread', renotify: true, vibrate: [200] };
      try {
        // preferir el service worker (funciona en iOS y en segundo plano)
        const reg = await navigator.serviceWorker?.getRegistration();
        if (reg?.showNotification) { await reg.showNotification('NEMO', opts); return; }
      } catch {}
      // fallback: notificación directa (desktop)
      try { new Notification('NEMO', opts); } catch {}
    };

    const updateTitle = async () => {
      try {
        const counts = await fetchConvUnread(session.group, session.name);
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        document.title = total > 0 ? `(${total}) NEMO` : 'NEMO';
      } catch {}
    };

    const unsub = subscribeConversation(session.group, (m) => {
      if (m.author === session.name) return;
      if (m.kind === 'group' || (m.kind === 'dm' && m.recipient === session.name)) { showNotif(); updateTitle(); }
    });

    const onVis = () => { if (document.visibilityState === 'visible') { notifiedRef.current = false; document.title = 'NEMO'; } };
    document.addEventListener('visibilitychange', onVis);
    updateTitle();

    return () => { unsub(); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  return null;
}
