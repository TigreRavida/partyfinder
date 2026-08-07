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
    console.log('🔔 Notifier activo. Permiso:', ('Notification' in window) ? Notification.permission : 'no soportado');

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((p) => console.log('🔔 permiso ahora:', p)).catch(() => {});
    }

    const showNotif = async () => {
      console.log('🔔 llegó mensaje. visible?', document.visibilityState, 'permiso?', Notification?.permission);
      if (document.visibilityState === 'visible') return;   // ya lo ve
      if (notifiedRef.current) return;                       // ya avisé
      if (!('Notification' in window) || Notification.permission !== 'granted') { console.log('🔔 no notifico: sin permiso'); return; }
      notifiedRef.current = true;
      const opts = { body: 'Tenés mensajes sin leer 💬', icon: '/icon-192.png',
        badge: '/icon-192.png', tag: 'nemo-unread', renotify: true, vibrate: [200] };
      try {
        const reg = await navigator.serviceWorker?.getRegistration();
        if (reg?.showNotification) { await reg.showNotification('NEMO', opts); console.log('🔔 notif via SW'); return; }
      } catch (e) { console.log('🔔 error SW:', e?.message); }
      try { new Notification('NEMO', opts); console.log('🔔 notif directa'); } catch (e) { console.log('🔔 error directa:', e?.message); }
    };

    const updateTitle = async () => {
      try {
        const counts = await fetchConvUnread(session.group, session.name);
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        document.title = total > 0 ? `(${total}) NEMO` : 'NEMO';
      } catch {}
    };

    const unsub = subscribeConversation(session.group, (m) => {
      console.log('🔔 realtime recibió mensaje:', m.kind, 'de', m.author);
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
