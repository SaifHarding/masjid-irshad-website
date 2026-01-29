import { useState, useEffect, useCallback } from "react";

const NOTIFICATION_STORAGE_KEY = "masjid-notifications-enabled";

export const useNotificationPermission = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [permissionState, setPermissionState] = useState<NotificationPermission | "unsupported">("default");

  // Check if notifications are supported
  const isSupported = typeof window !== "undefined" && "Notification" in window;

  // Load subscription state from localStorage
  useEffect(() => {
    if (!isSupported) {
      setPermissionState("unsupported");
      return;
    }

    const stored = localStorage.getItem(NOTIFICATION_STORAGE_KEY);
    setIsSubscribed(stored === "true");
    setPermissionState(Notification.permission);
  }, [isSupported]);

  const subscribe = useCallback(async () => {
    if (!isSupported) return false;

    try {
      const permission = await Notification.requestPermission();
      setPermissionState(permission);

      if (permission === "granted") {
        localStorage.setItem(NOTIFICATION_STORAGE_KEY, "true");
        setIsSubscribed(true);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }, [isSupported]);

  const unsubscribe = useCallback(() => {
    localStorage.setItem(NOTIFICATION_STORAGE_KEY, "false");
    setIsSubscribed(false);
  }, []);

  const toggleSubscription = useCallback(async () => {
    if (isSubscribed) {
      unsubscribe();
      return false;
    } else {
      return await subscribe();
    }
  }, [isSubscribed, subscribe, unsubscribe]);

  return {
    isSupported,
    isSubscribed,
    permissionState,
    subscribe,
    unsubscribe,
    toggleSubscription,
  };
};
