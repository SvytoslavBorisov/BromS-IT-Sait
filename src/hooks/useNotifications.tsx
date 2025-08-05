import { useEffect, useState } from 'react';

export interface Notification {
  id: string;
  type: string;
  payload: any;
  isRead: boolean;
  createdAt: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    let evtSource: EventSource;

    async function init() {
      // 1) Сначала подгружаем уже существующие уведомления
      try {
        const res = await fetch('/api/notifications');
        if (res.ok) {
          const initial: Notification[] = await res.json();
          setNotifications(initial);
        }
      } catch (e) {
        console.error('Ошибка загрузки истории уведомлений:', e);
      }

      // 2) Затем открываем SSE-стрим для новых
      evtSource = new EventSource('/api/notifications/stream');
      evtSource.onmessage = (e) => {
        const notif: Notification = JSON.parse(e.data);
        // добавляем в начало списка
        setNotifications(prev => [notif, ...prev]);
      };
      evtSource.onerror = () => {
        console.warn('SSE connection closed');
        evtSource.close();
      };
    }

    init();

    return () => {
      if (evtSource) evtSource.close();
    };
  }, []);

  return notifications;
}
