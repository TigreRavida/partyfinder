import { useEffect } from 'react';
import { loadSession, subscribeConversation, fetchConvUnread } from '../lib/db';

// Notifica cuando llega un mensaje y el usuario no está mirando la app.
// Usa el service worker (showNotification) que funciona en iOS y en segundo plano.
// LÍMITE: si la app está TOTALMENTE cerrada no corre (haría falta push real/backend).
export default function Notifier() {
  useEffect(() => {
    const session = loadSession();
    if (!session) return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    const showNotif = async (fromWhom) => {
      if (document.visibilityState === 'visible') return;   // ya lo está viendo
      if (!('Notification' in window) || Notification.permission !== 'granted') return;
      const title = fromWhom ? `Mensaje de ${fromWhom} 💬` : 'Tenés mensajes sin leer 💬';
      const opts = { body: '', icon: '/icon-192.png', badge: '/icon-192.png',
        tag: 'nemo-' + Date.now(), renotify: true, vibrate: [200] };
      try {
        const reg = await navigator.serviceWorker?.getRegistration();
        if (reg?.showNotification) { await reg.showNotification(title, opts); return; }
      } catch {}
      try { new Notification(title, opts); } catch {}
    };

    const updateTitle = async () => {
      try {
        const counts = await fetchConvUnread(session.group, session.name);
        const total = Object.values(counts).reduce((a, b) => a + b, 0);
        document.title = total > 0 ? `(${total}) NEMO` : 'NEMO';
      } catch {}
    };

    const unsub = subscribeConversation(session.group, (m) => {
      if (m.author === session.name) return;   // no me notifico mis propios mensajes
      const paraMi = m.kind === 'group' || (m.kind === 'dm' && m.recipient === session.name);
      if (paraMi) { showNotif(m.author); updateTitle(); }
    });

    const onVis = () => { if (document.visibilityState === 'visible') document.title = 'NEMO'; };
    document.addEventListener('visibilitychange', onVis);
    updateTitle();

    return () => { unsub(); document.removeEventListener('visibilitychange', onVis); };
  }, []);

  return null;
}
