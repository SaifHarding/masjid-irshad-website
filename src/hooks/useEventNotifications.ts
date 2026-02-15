import { useEffect, useRef, useCallback } from "react";
import { usePublicEvents, PublicEvent } from "@/hooks/usePublicEvents";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";

const SEEN_EVENTS_KEY = "masjid-seen-event-ids";
const LAST_EVENT_NOTIFICATION_KEY = "masjid-last-event-notification";

function getNotifDetails(event: PublicEvent) {
  if (event.item_type === "announcement") {
    return {
      title: `📣 New announcement: ${event.title}`,
      tag: `announcement-${event.id}`,
    };
  }
  return {
    title: `🌙 New event: ${event.title}`,
    tag: `event-${event.id}`,
  };
}

export const useEventNotifications = () => {
  const { data: events, isLoading } = usePublicEvents();
  const { registration, showNotification: swShowNotification } = useServiceWorker();
  const { isSupported, isSubscribed, permissionState } = useNotificationPermission();
  const hasCheckedInitialRef = useRef(false);

  const getSeenEventIds = useCallback((): string[] => {
    try {
      const stored = localStorage.getItem(SEEN_EVENTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  const saveSeenEventIds = useCallback((ids: string[]) => {
    localStorage.setItem(SEEN_EVENTS_KEY, JSON.stringify(ids));
  }, []);

  const sendItemNotification = useCallback((event: PublicEvent) => {
    const { title, tag } = getNotifDetails(event);
    const body = "Tap to view";
    const notificationOptions = {
      body,
      icon: "/masjid-irshad-logo.png",
      badge: "/masjid-irshad-logo.png",
      tag,
      requireInteraction: false,
      data: { url: "/#announcements-section" },
      vibrate: [200, 100, 200],
    };

    if (registration?.active) {
      swShowNotification(title, notificationOptions);
    } else {
      try {
        const notification = new Notification(title, {
          body,
          icon: "/masjid-irshad-logo.png",
          tag,
        });
        notification.onclick = () => {
          window.focus();
          notification.close();
        };
      } catch (error) {
        console.error("[useEventNotifications] Failed to send notification:", error);
      }
    }
  }, [registration, swShowNotification]);

  useEffect(() => {
    if (!isSupported || !isSubscribed || permissionState !== "granted") return;
    if (isLoading || !events || events.length === 0) return;

    if (!hasCheckedInitialRef.current) {
      hasCheckedInitialRef.current = true;
      const currentIds = events.map(e => e.id);
      saveSeenEventIds(currentIds);
      return;
    }

    const seenIds = getSeenEventIds();
    const currentIds = events.map(e => e.id);
    const newItems = events.filter(e => !seenIds.includes(e.id));

    if (newItems.length > 0) {
      const lastNotification = localStorage.getItem(LAST_EVENT_NOTIFICATION_KEY);
      const now = Date.now();
      if (lastNotification && now - parseInt(lastNotification) < 5 * 60 * 1000) {
        saveSeenEventIds(currentIds);
        return;
      }

      if (newItems.length === 1) {
        sendItemNotification(newItems[0]);
      } else {
        // Group by type
        const announcements = newItems.filter(e => e.item_type === "announcement");
        const eventItems = newItems.filter(e => e.item_type !== "announcement");

        const parts: string[] = [];
        if (eventItems.length > 0) parts.push(`${eventItems.length} event${eventItems.length > 1 ? "s" : ""}`);
        if (announcements.length > 0) parts.push(`${announcements.length} announcement${announcements.length > 1 ? "s" : ""}`);

        const summaryTitle = `📢 ${parts.join(" & ")}`;
        const summaryBody = newItems.map(e => e.title).join(", ");
        const notificationOptions = {
          body: summaryBody,
          icon: "/masjid-irshad-logo.png",
          badge: "/masjid-irshad-logo.png",
          tag: "new-items",
          requireInteraction: false,
          data: { url: "/#announcements-section" },
          vibrate: [200, 100, 200],
        };

        if (registration?.active) {
          swShowNotification(summaryTitle, notificationOptions);
        } else {
          try {
            new Notification(summaryTitle, {
              body: summaryBody,
              icon: "/masjid-irshad-logo.png",
              tag: "new-items",
            });
          } catch (error) {
            console.error("[useEventNotifications] Failed to send notification:", error);
          }
        }
      }

      localStorage.setItem(LAST_EVENT_NOTIFICATION_KEY, now.toString());
    }

    saveSeenEventIds(currentIds);
  }, [events, isLoading, isSupported, isSubscribed, permissionState, getSeenEventIds, saveSeenEventIds, sendItemNotification, registration, swShowNotification]);

  return null;
};
