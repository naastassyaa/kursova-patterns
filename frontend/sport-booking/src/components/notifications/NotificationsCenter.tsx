import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { fetchNotifications, markNotificationRead } from '../../api/customer';
import { parseApiError } from '../../utils/apiErrors';
import type { Notification } from '../../types/auth';

type NotificationsCenterProps = {
  showHeading?: boolean;
};

const NotificationsCenter = ({ showHeading = true }: NotificationsCenterProps) => {
  const queryClient = useQueryClient();
  const notificationsQuery = useQuery({
    queryKey: ['me', 'notifications'],
    queryFn: fetchNotifications,
  });

  const markReadMutation = useMutation({
    mutationFn: markNotificationRead,
    onMutate: async (notificationId) => {
      await queryClient.cancelQueries({ queryKey: ['me', 'notifications'] });
      const previousNotifications = queryClient.getQueryData<Notification[]>(['me', 'notifications']);
      queryClient.setQueryData<Notification[]>(['me', 'notifications'], (old) => {
        if (!old) return old;
        return old.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n));
      });
      return { previousNotifications };
    },
    onError: (err, notificationId, context) => {
      if (context?.previousNotifications) {
        queryClient.setQueryData(['me', 'notifications'], context.previousNotifications);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] });
    },
  });

  const notifications = useMemo(() => {
    if (!notificationsQuery.data) {
      return [];
    }
    return [...notificationsQuery.data].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );
  }, [notificationsQuery.data]);

  const unreadCount = useMemo(() => {
    return notifications.filter((n) => !n.is_read).length;
  }, [notifications]);

  const handleNotificationClick = (notification: Notification) => {
    if (!notification.is_read) {
      markReadMutation.mutate(notification.id);
    }
  };

  const handleEnableBrowserNotifications = async () => {
    if (!('Notification' in window)) {
      alert('Ваш браузер не підтримує сповіщення');
      return;
    }

    if (Notification.permission === 'granted') {
      alert('Браузерні сповіщення вже увімкнено');
      return;
    }

    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      alert('Браузерні сповіщення увімкнено! Ви будете отримувати сповіщення навіть коли вкладка неактивна.');
    } else {
      alert('Дозвіл на сповіщення відхилено. Ви можете увімкнути їх пізніше в налаштуваннях браузера.');
    }
  };

  return (
    <section className="detail-card notifications-simple">
      {showHeading && <h2>Повідомлення</h2>}
      {showHeading && (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <p className="stat-card__label">
              Тут зʼявляються підтвердження, нагадування та інші оновлення по вашому акаунту.
            </p>
            {unreadCount > 0 && (
              <span className="notification-badge notification-badge--count">
                {unreadCount}
              </span>
            )}
          </div>
          {'Notification' in window && Notification.permission !== 'granted' && (
            <div
              style={{
                padding: '0.75rem',
                backgroundColor: 'rgba(37, 99, 235, 0.1)',
                border: '1px solid var(--primary)',
                borderRadius: '0.5rem',
                marginTop: '0.75rem',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: '0.5rem',
              }}
            >
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text)' }}>
                Увімкніть браузерні сповіщення, щоб отримувати повідомлення навіть коли вкладка неактивна
              </p>
              <button
                type="button"
                className="primary-button"
                onClick={handleEnableBrowserNotifications}
                style={{ padding: '0.5rem 1rem', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
              >
                Увімкнути
              </button>
            </div>
          )}
        </>
      )}
      {notificationsQuery.isLoading ? (
        <p>Завантаження сповіщень...</p>
      ) : notificationsQuery.isError ? (
        <p>{parseApiError(notificationsQuery.error)}</p>
      ) : notifications.length === 0 ? (
        <p>Поки немає жодного повідомлення.</p>
      ) : (
        <ul className="notifications-list notifications-list--simple">
          {notifications.map((notification) => (
            <li
              key={notification.id}
              className={`notification-card ${!notification.is_read ? 'notification-card--unread' : ''}`}
              onClick={() => handleNotificationClick(notification)}
              style={{ cursor: 'pointer' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.5rem' }}>
                <div style={{ flex: 1 }}>
                  <p className="notification-title">{notification.title}</p>
                  <p className="notification-meta">
                    {new Date(notification.created_at).toLocaleString('uk-UA')}
                  </p>
                  <p className="notification-preview">{notification.message}</p>
                </div>
                {!notification.is_read && (
                  <span className="notification-badge notification-badge--dot"></span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
};

export default NotificationsCenter;

