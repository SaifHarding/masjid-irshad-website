import { useEffect, useRef } from "react";
import { useSharedLiveStatus } from "@/contexts/LiveStatusContext";
import { usePushSubscription, NotificationPrefs } from "@/hooks/usePushSubscription";

export type { NotificationPrefs };

export const useLiveNotifications = (station: string = "masjidirshad") => {
  const { data: liveStatus } = useSharedLiveStatus();
  const {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    preferences,
    subscribe,
    unsubscribe,
    toggleSubscription
  } = usePushSubscription();
  
  // Track which server-pushed sessions we've already seen to avoid duplicate in-app notifications
  const lastSeenPushSessionRef = useRef<string | null>(null);

  // REMOVED: In-app fallback notifications that duplicate server-side Web Push
  // The server (check-live-and-notify cron) handles all push notifications reliably.
  // When the user opens the app while already subscribed, we should NOT re-notify them.
  // This prevents the "notification pops up again when opening the app" issue.

  // Update the last seen session when push data changes (prevents stale state)
  useEffect(() => {
    if (liveStatus?.checkedAt) {
      lastSeenPushSessionRef.current = liveStatus.checkedAt;
    }
  }, [liveStatus?.checkedAt]);

  // Derive permission state from subscription status
  const permissionState: NotificationPermission | "unsupported" = !isSupported 
    ? "unsupported" 
    : isSubscribed 
      ? "granted" 
      : Notification.permission;

  return {
    station,
    isSupported,
    isSubscribed,
    isLoading,
    error,
    preferences,
    permissionState,
    subscribe,
    unsubscribe,
    toggleSubscription,
  };
};
