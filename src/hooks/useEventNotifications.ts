import { useEffect, useRef, useCallback } from "react";
import { usePublicEvents, PublicEvent } from "@/hooks/usePublicEvents";
import { useServiceWorker } from "@/hooks/useServiceWorker";
import { useNotificationPermission } from "@/hooks/useNotificationPermission";

const SEEN_EVENTS_KEY = "masjid-seen-event-ids";
const LAST_EVENT_NOTIFICATION_KEY = "masjid-last-event-notification";

export const useEventNotifications = () => {
  const { data: events, isLoading } = usePublicEvents();
  const { registration, showNotification: swShowNotification } = useServiceWorker();
  const { isSupported, isSubscribed, permissionState } = useNotificationPermission();
  const hasCheckedInitialRef = useRef(false);

  // Get previously seen event IDs from localStorage
  const getSeenEventIds = useCallback((): string[] => {
    try {
      const stored = localStorage.getItem(SEEN_EVENTS_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  }, []);

  // Save seen event IDs to localStorage
  const saveSeenEventIds = useCallback((ids: string[]) => {
    localStorage.setItem(SEEN_EVENTS_KEY, JSON.stringify(ids));
  }, []);

  // Send notification for a new event
  const sendEventNotification = useCallback((event: PublicEvent) => {
    const notificationOptions = {
      body: event.description?.slice(0, 100) || "Tap to view details",
      icon: "/masjid-irshad-logo.png",
      badge: "/masjid-irshad-logo.png",
      tag: `event-${event.id}`,
      requireInteraction: false,
      data: { url: "/" },
      vibrate: [200, 100, 200],
    };

    if (registration?.active) {
      swShowNotification(`📢 New Event: ${event.title}`, notificationOptions);
    } else {
      try {
        const notification = new Notification(`📢 New Event: ${event.title}`, {
          body: event.description?.slice(0, 100) || "Tap to view details",
          icon: "/masjid-irshad-logo.png",
          tag: `event-${event.id}`,
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

  // Check for new events and notify
  useEffect(() => {
    if (!isSupported || !isSubscribed || permissionState !== "granted") return;
    if (isLoading || !events || events.length === 0) return;

    // Don't notify on the very first load (user just opened the app)
    if (!hasCheckedInitialRef.current) {
      hasCheckedInitialRef.current = true;
      // Store current events as "seen" on first load
      const currentIds = events.map(e => e.id);
      saveSeenEventIds(currentIds);
      return;
    }

    const seenIds = getSeenEventIds();
    const currentIds = events.map(e => e.id);
    
    // Find new events (in current but not in seen)
    const newEvents = events.filter(e => !seenIds.includes(e.id));

    if (newEvents.length > 0) {
      // Check cooldown (don't spam notifications - max 1 per 5 minutes)
      const lastNotification = localStorage.getItem(LAST_EVENT_NOTIFICATION_KEY);
      const now = Date.now();
      if (lastNotification && now - parseInt(lastNotification) < 5 * 60 * 1000) {
        // Still save the IDs so we don't re-notify later
        saveSeenEventIds(currentIds);
        return;
      }

      // Send notification for the first new event (or a summary if multiple)
      if (newEvents.length === 1) {
        sendEventNotification(newEvents[0]);
      } else {
        // Multiple new events - send summary
        const notificationOptions = {
          body: `${newEvents.map(e => e.title).join(", ")}`,
          icon: "/masjid-irshad-logo.png",
          badge: "/masjid-irshad-logo.png",
          tag: "new-events",
          requireInteraction: false,
          data: { url: "/" },
          vibrate: [200, 100, 200],
        };

        if (registration?.active) {
          swShowNotification(`📢 ${newEvents.length} New Events`, notificationOptions);
        } else {
          try {
            new Notification(`📢 ${newEvents.length} New Events`, {
              body: newEvents.map(e => e.title).join(", "),
              icon: "/masjid-irshad-logo.png",
              tag: "new-events",
            });
          } catch (error) {
            console.error("[useEventNotifications] Failed to send notification:", error);
          }
        }
      }

      localStorage.setItem(LAST_EVENT_NOTIFICATION_KEY, now.toString());
    }

    // Update seen events
    saveSeenEventIds(currentIds);
  }, [events, isLoading, isSupported, isSubscribed, permissionState, getSeenEventIds, saveSeenEventIds, sendEventNotification, registration, swShowNotification]);

  return null;
};
