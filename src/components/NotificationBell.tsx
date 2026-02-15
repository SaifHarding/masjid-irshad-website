import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import NotificationPreferences from "@/components/NotificationPreferences";
import { useLiveNotifications, NotificationPrefs } from "@/hooks/useLiveNotifications";

type MobilePlatform = "ios" | "android" | null;

// Detect mobile platform
const detectMobilePlatform = (): MobilePlatform => {
  if (typeof window === "undefined") return null;
  const userAgent = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(userAgent)) return "ios";
  if (/android/.test(userAgent)) return "android";
  return null;
};

// Check if app is installed as PWA
const isInstalledAsPWA = (): boolean => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(display-mode: standalone)").matches 
    || (navigator as any).standalone 
    || document.referrer.includes("android-app://");
};

interface NotificationBellProps {
  className?: string;
  size?: "xs" | "sm" | "default";
}

const NotificationBell = ({ className = "", size = "default" }: NotificationBellProps) => {
  const navigate = useNavigate();
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [showPrefsDialog, setShowPrefsDialog] = useState(false);
  const [mobilePlatform, setMobilePlatform] = useState<MobilePlatform>(null);

  const { 
    isSupported, 
    isSubscribed, 
    isLoading: isNotificationLoading, 
    permissionState, 
    subscribe, 
    unsubscribe 
  } = useLiveNotifications();

  // Detect platform on mount
  useEffect(() => {
    setMobilePlatform(detectMobilePlatform());
  }, []);

  const handleToggleNotifications = useCallback(async () => {
    // If already subscribed, just unsubscribe
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        toast.info("Notifications disabled. You won't receive prayer time alerts.");
      }
      return;
    }

    // If on mobile and not installed as PWA, show install dialog
    if (mobilePlatform && !isInstalledAsPWA()) {
      setShowInstallDialog(true);
      return;
    }

    if (!isSupported) {
      toast.error("Notifications not available. On mobile, add this site to your home screen first.");
      return;
    }

    if (permissionState === "denied") {
      toast.error("Notifications blocked. Please enable them in your browser settings.");
      return;
    }

    // Show preferences dialog for new subscriptions
    setShowPrefsDialog(true);
  }, [isSubscribed, isSupported, permissionState, unsubscribe, mobilePlatform]);

  const handleConfirmPreferences = useCallback(async (prefs: NotificationPrefs) => {
    const success = await subscribe(prefs);
    setShowPrefsDialog(false);
    
    if (success) {
      toast.success("Notifications enabled! You'll be notified based on your preferences.");
    }
  }, [subscribe]);

  const handleGoToInstallPage = useCallback(() => {
    setShowInstallDialog(false);
    navigate("/install");
  }, [navigate]);

  const iconSize = size === "xs" ? "h-3.5 w-3.5" : size === "sm" ? "h-4 w-4" : "h-5 w-5";
  const buttonSize = size === "xs" ? "h-6 w-6" : size === "sm" ? "h-8 w-8" : "h-9 w-9";

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={`${buttonSize} rounded-full transition-all ${
          isSubscribed 
            ? "text-primary/80 hover:text-primary hover:bg-primary/10" 
            : "text-muted-foreground hover:text-primary hover:bg-primary/10"
        } ${className}`}
        onClick={handleToggleNotifications}
        disabled={isNotificationLoading}
        title={isSubscribed ? "Notifications enabled - click to disable" : "Get prayer time notifications"}
      >
        {isNotificationLoading ? (
          <Loader2 className={`${iconSize} animate-spin`} />
        ) : isSubscribed ? (
          <Bell className={`${iconSize} fill-current`} />
        ) : (
          <Bell className={iconSize} />
        )}
      </Button>

      {/* PWA Install Dialog */}
      <Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Install App for Notifications</DialogTitle>
            <DialogDescription className="space-y-3 pt-2">
              {mobilePlatform === "ios" ? (
                <>
                  <p>To receive prayer time notifications on iPhone/iPad:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Tap the <strong>Share</strong> button in Safari</li>
                    <li>Select <strong>"Add to Home Screen"</strong></li>
                    <li>Open the app from your home screen</li>
                    <li>Tap the notification bell again</li>
                  </ol>
                </>
              ) : (
                <>
                  <p>To receive prayer time notifications on Android:</p>
                  <ol className="list-decimal list-inside space-y-1 text-sm">
                    <li>Tap the <strong>menu</strong> (⋮) in Chrome</li>
                    <li>Select <strong>"Add to Home screen"</strong></li>
                    <li>Open the app from your home screen</li>
                    <li>Tap the notification bell again</li>
                  </ol>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setShowInstallDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleGoToInstallPage}>
              Go to Install Guide
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Notification Preferences Dialog */}
      <NotificationPreferences
        open={showPrefsDialog}
        onOpenChange={setShowPrefsDialog}
        onConfirm={handleConfirmPreferences}
        isLoading={isNotificationLoading}
      />
    </>
  );
};

export default NotificationBell;
