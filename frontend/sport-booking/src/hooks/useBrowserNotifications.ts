import { useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchNotifications, markNotificationRead } from '../api/customer';
import type { Notification } from '../types/auth';

const POLLING_INTERVAL = 30000; // 30 seconds

export const useBrowserNotifications = (enabled: boolean) => {
  const queryClient = useQueryClient();
  const lastNotificationIdsRef = useRef<Set<number>>(new Set());
  const permissionRequestedRef = useRef(false);

  // Request notification permission
  useEffect(() => {
    if (!enabled || permissionRequestedRef.current) return;

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().then((permission) => {
        if (permission === 'granted') {
          console.log('Notification permission granted');
        }
      });
      permissionRequestedRef.current = true;
    }
  }, [enabled]);

  // Poll for new notifications
  const { data: notifications } = useQuery({
    queryKey: ['me', 'notifications'],
    queryFn: fetchNotifications,
    enabled,
    refetchInterval: enabled ? POLLING_INTERVAL : false,
    refetchIntervalInBackground: true, // Continue polling even when tab is in background
  });

  // Show browser notifications for new unread notifications
  useEffect(() => {
    if (!enabled || !notifications || !('Notification' in window)) return;

    // Initialize lastNotificationIds on first load
    if (lastNotificationIdsRef.current.size === 0) {
      notifications.forEach((n) => lastNotificationIdsRef.current.add(n.id));
      return;
    }

    // Find new unread notifications (not in our tracking set)
    const newNotifications = notifications.filter(
      (n) => !lastNotificationIdsRef.current.has(n.id),
    );

    // Show browser notification for each new notification (only if permission granted)
    if (Notification.permission === 'granted' && newNotifications.length > 0) {
      newNotifications.forEach((notification) => {
        showBrowserNotification(notification, queryClient);
        lastNotificationIdsRef.current.add(notification.id);
      });
    }

    // Update the set to include all current notification IDs
    notifications.forEach((n) => lastNotificationIdsRef.current.add(n.id));
  }, [notifications, enabled, queryClient]);
};

const showBrowserNotification = (notification: Notification, queryClient: any) => {
  if (!('Notification' in window) || Notification.permission !== 'granted') {
    return;
  }

  const icon = '/favicon.ico'; // You can add a custom icon later

  const browserNotification = new Notification(notification.title, {
    body: notification.message,
    icon: icon,
    badge: icon,
    tag: `notification-${notification.id}`, // Prevent duplicate notifications
    requireInteraction: false,
    silent: false, // Play sound
    vibrate: [200, 100, 200], // Vibrate pattern (if supported)
  });

  // Focus window when notification is clicked
  browserNotification.onclick = () => {
    window.focus();
    browserNotification.close();
    
    // Mark notification as read
    if (queryClient && !notification.is_read) {
      // Mark as read via API
      markNotificationRead(notification.id).then(() => {
        queryClient.invalidateQueries({ queryKey: ['me', 'notifications'] });
      }).catch(() => {
        // Silently fail if marking as read fails
      });
    }
  };

  // Auto-close after 5 seconds
  setTimeout(() => {
    browserNotification.close();
  }, 5000);
};

