import { useState, useEffect, useCallback } from "react";
import { getBackendClient } from "@/lib/backendClient";

const PUSH_SUBSCRIPTION_KEY = "masjid-push-subscription";
const PUSH_PREFS_KEY = "masjid-notification-prefs";

export interface NotificationPrefs {
  notify_begin_times: boolean;
  notify_iqamah: boolean;
  notify_announcements: boolean;
  notify_events: boolean;
}

// Convert base64 URL to Uint8Array for applicationServerKey
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}

export const usePushSubscription = () => {
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preferences, setPreferences] = useState<NotificationPrefs | null>(null);

  // Check if push is supported
  const isSupported =
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window;

  // Fetch VAPID public key on mount
  useEffect(() => {
    if (!isSupported) {
      setIsLoading(false);
      return;
    }

    const fetchVapidKey = async () => {
      try {
        const supabase = getBackendClient();
        const { data, error } = await supabase.functions.invoke("get-vapid-public-key");
        if (error) throw error;
        if (data?.vapidPublicKey) {
          setVapidPublicKey(data.vapidPublicKey);
        }
      } catch (err) {
        console.error("[usePushSubscription] Failed to fetch VAPID key:", err);
        setError("Failed to initialize push notifications");
      }
    };

    fetchVapidKey();
  }, [isSupported]);

  // Check existing subscription on mount
  useEffect(() => {
    if (!isSupported || !vapidPublicKey) {
      setIsLoading(false);
      return;
    }

    const checkExistingSubscription = async () => {
      try {
        const registration = await navigator.serviceWorker.ready;
        const mgr = (registration as any).pushManager;
        const existingSub = await mgr.getSubscription();
        
        if (existingSub) {
          setSubscription(existingSub);
          setIsSubscribed(true);
          // Load saved preferences from localStorage
          const storedPrefs = localStorage.getItem(PUSH_PREFS_KEY);
          if (storedPrefs) {
            setPreferences(JSON.parse(storedPrefs));
          }
        } else {
          // Check localStorage for previous subscription state
          const stored = localStorage.getItem(PUSH_SUBSCRIPTION_KEY);
          if (stored === "true") {
            // Had subscription before but it's gone - clear state
            localStorage.removeItem(PUSH_SUBSCRIPTION_KEY);
            localStorage.removeItem(PUSH_PREFS_KEY);
          }
        }
      } catch (err) {
        console.error("[usePushSubscription] Error checking subscription:", err);
      } finally {
        setIsLoading(false);
      }
    };

    checkExistingSubscription();
  }, [isSupported, vapidPublicKey]);

  const subscribe = useCallback(async (prefs?: NotificationPrefs): Promise<boolean> => {
    if (!isSupported || !vapidPublicKey) {
      setError("Push notifications not supported");
      return false;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Request notification permission first
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setError("Notification permission denied");
        setIsLoading(false);
        return false;
      }

      // Get service worker registration
      const registration = await navigator.serviceWorker.ready;

      // Subscribe to push
      const mgr = (registration as any).pushManager;
      const pushSubscription = await mgr.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });

      // Default preferences if not provided
      const notificationPrefs = prefs || {
        notify_begin_times: true,
        notify_iqamah: true,
        notify_announcements: true,
        notify_events: true,
      };

      // Send subscription to server with preferences
      const supabase = getBackendClient();
      const { error: serverError } = await supabase.functions.invoke("push-subscribe", {
        body: {
          action: "subscribe",
          subscription: pushSubscription.toJSON(),
          preferences: notificationPrefs,
        },
      });

      if (serverError) {
        throw serverError;
      }

      setSubscription(pushSubscription);
      setIsSubscribed(true);
      setPreferences(notificationPrefs);
      localStorage.setItem(PUSH_SUBSCRIPTION_KEY, "true");
      localStorage.setItem(PUSH_PREFS_KEY, JSON.stringify(notificationPrefs));
      return true;
    } catch (err) {
      console.error("[usePushSubscription] Subscribe error:", err);
      setError(err instanceof Error ? err.message : "Failed to subscribe");
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [isSupported, vapidPublicKey]);

  const unsubscribe = useCallback(async (): Promise<boolean> => {
    if (!subscription) {
      setIsSubscribed(false);
      localStorage.removeItem(PUSH_SUBSCRIPTION_KEY);
      localStorage.removeItem(PUSH_PREFS_KEY);
      return true;
    }

    setIsLoading(true);

    try {
      // Unsubscribe from push manager
      await subscription.unsubscribe();

      // Remove from server
      const supabase = getBackendClient();
      await supabase.functions.invoke("push-subscribe", {
        body: {
          action: "unsubscribe",
          subscription: { endpoint: subscription.endpoint },
        },
      });

      setSubscription(null);
      setIsSubscribed(false);
      setPreferences(null);
      localStorage.removeItem(PUSH_SUBSCRIPTION_KEY);
      localStorage.removeItem(PUSH_PREFS_KEY);
      return true;
    } catch (err) {
      console.error("[usePushSubscription] Unsubscribe error:", err);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [subscription]);

  const toggleSubscription = useCallback(async (prefs?: NotificationPrefs): Promise<boolean> => {
    if (isSubscribed) {
      return await unsubscribe();
    } else {
      return await subscribe(prefs);
    }
  }, [isSubscribed, subscribe, unsubscribe]);

  return {
    isSupported,
    isSubscribed,
    isLoading,
    error,
    preferences,
    subscribe,
    unsubscribe,
    toggleSubscription,
  };
};
