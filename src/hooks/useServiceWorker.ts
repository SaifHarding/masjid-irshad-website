import { useEffect, useState, useCallback } from "react";

export const useServiceWorker = () => {
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);
  const [isSupported, setIsSupported] = useState(false);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const isServiceWorkerSupported = "serviceWorker" in navigator;
    setIsSupported(isServiceWorkerSupported);

    if (!isServiceWorkerSupported) {
      return;
    }

    const registerServiceWorker = async () => {
      try {
        // Wait for the service worker to be ready
        const reg = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });
        setRegistration(reg);

        // Wait for the service worker to be active
        if (reg.active) {
          setIsReady(true);
        } else if (reg.installing || reg.waiting) {
          const worker = reg.installing || reg.waiting;
          worker?.addEventListener("statechange", () => {
            if (worker.state === "activated") {
              setIsReady(true);
            }
          });
        }

        // Check for updates
        reg.addEventListener("updatefound", () => {
          // New service worker found
        });
      } catch (error) {
        console.error("[useServiceWorker] Registration failed:", error);
      }
    };

    registerServiceWorker();

    // Listen for messages from the service worker
    const handleMessage = (event: MessageEvent) => {
      if (event.data.type === "NOTIFICATION_CLICK") {
        // Scroll to live section when notification is clicked
        const embedSection = document.getElementById("masjid-live");
        if (embedSection) {
          embedSection.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    };

    navigator.serviceWorker.addEventListener("message", handleMessage);

    return () => {
      navigator.serviceWorker.removeEventListener("message", handleMessage);
    };
  }, []);

  const showNotification = useCallback(async (title: string, options?: NotificationOptions & { vibrate?: number[] }) => {
    if (!registration) {
      return false;
    }

    try {
      // Use the service worker to show the notification for better reliability
      if (registration.active) {
        registration.active.postMessage({
          type: "SHOW_NOTIFICATION",
          title,
          options: {
            ...options,
            icon: options?.icon || "/masjid-irshad-logo.png",
            badge: "/masjid-irshad-logo.png",
            requireInteraction: true,
            vibrate: options?.vibrate || [200, 100, 200, 100, 200],
          },
        });
        return true;
      }
    } catch (error) {
      console.error("[useServiceWorker] Failed to show notification:", error);
    }
    return false;
  }, [registration]);

  return {
    registration,
    isSupported,
    isReady,
    showNotification,
  };
};
