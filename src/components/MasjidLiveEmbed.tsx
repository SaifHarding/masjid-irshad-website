import { useTheme } from "next-themes";
import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Radio, PlayCircle, Bell, BellOff, Share, MoreVertical, Download, Loader2, Clock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useSharedLiveStatus } from "@/contexts/LiveStatusContext";
import { useLiveNotifications, NotificationPrefs } from "@/hooks/useLiveNotifications";
import { useSubscriberCount } from "@/hooks/useSubscriberCount";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { debounce } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import NotificationPreferences from "@/components/NotificationPreferences";

interface MasjidLiveEmbedProps {
  station?: string;
}

type MobilePlatform = "ios" | "android" | null;

// Convert HSL CSS variable value to hex
const hslToHex = (h: number, s: number, l: number): string => {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, "0");
  };
  return `${f(0)}${f(8)}${f(4)}`;
};

// Parse CSS variable HSL value like "180 50% 10%" or "0 0% 98%"
const parseHslVariable = (hslValue: string): { h: number; s: number; l: number } | null => {
  const match = hslValue.match(/(\d+(?:\.\d+)?)\s*,?\s*(\d+(?:\.\d+)?)%?\s*,?\s*(\d+(?:\.\d+)?)%?/);
  if (!match) return null;
  return {
    h: parseFloat(match[1]),
    s: parseFloat(match[2]),
    l: parseFloat(match[3]),
  };
};

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

// Format relative time - minutes for first hour, hours for first day, then days
const formatLastOnline = (lastLiveAt: string | null | undefined): string | null => {
  if (!lastLiveAt) return null;
  
  const lastLiveDate = new Date(lastLiveAt);
  const now = new Date();
  const diffMs = now.getTime() - lastLiveDate.getTime();
  
  // If in the future or very recent (within 1 minute), don't show
  if (diffMs < 60_000) return null;
  
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours = Math.floor(diffMs / 3_600_000);
  const diffDays = Math.floor(diffMs / 86_400_000);
  
  if (diffMinutes < 60) {
    return `Last online ${diffMinutes} ${diffMinutes === 1 ? 'minute' : 'minutes'} ago`;
  } else if (diffHours < 24) {
    return `Last online ${diffHours} ${diffHours === 1 ? 'hour' : 'hours'} ago`;
  } else {
    return `Last online ${diffDays} ${diffDays === 1 ? 'day' : 'days'} ago`;
  }
};

const MasjidLiveEmbed = ({ station = "masjidirshad" }: MasjidLiveEmbedProps) => {
  const { resolvedTheme } = useTheme();
  const navigate = useNavigate();
  const [mounted, setMounted] = useState(false);
  const [derivedHex, setDerivedHex] = useState<string | null>(null);
  const [showInstallDialog, setShowInstallDialog] = useState(false);
  const [showPrefsDialog, setShowPrefsDialog] = useState(false);
  const [mobilePlatform, setMobilePlatform] = useState<MobilePlatform>(null);
  
  // Get live status - fail closed (treat loading/error as offline)
  const { data: liveStatus, isLoading: isStatusLoading, isFetching } = useSharedLiveStatus();
  
  // Track last known live state to prevent flicker during refetches
  const lastKnownLiveState = useRef<boolean>(false);
  const hasInitialData = useRef<boolean>(false);
  
  // Update last known state when we get fresh data
  useEffect(() => {
    if (!isStatusLoading && !isFetching && liveStatus) {
      lastKnownLiveState.current = liveStatus.live === true;
      hasInitialData.current = true;
    }
  }, [liveStatus, isStatusLoading, isFetching]);
  
  // Use last known state during refetches to prevent flicker
  const isLive = (isStatusLoading || isFetching) && hasInitialData.current
    ? lastKnownLiveState.current 
    : liveStatus?.live === true;
  
  // Compute last online text (only shown when offline)
  const lastOnlineText = useMemo(() => {
    if (isLive) return null;
    return formatLastOnline(liveStatus?.lastLiveAt);
  }, [isLive, liveStatus?.lastLiveAt]);
  
  // Notification subscription
  const { isSupported, isSubscribed, isLoading: isNotificationLoading, permissionState, subscribe, unsubscribe } = useLiveNotifications(station);
  
  // Subscriber count
  const { data: subscriberCount } = useSubscriberCount();

  // Detect platform on mount
  useEffect(() => {
    setMobilePlatform(detectMobilePlatform());
  }, []);
  
  const handleToggleNotifications = useCallback(async () => {
    // If already subscribed, just unsubscribe
    if (isSubscribed) {
      const success = await unsubscribe();
      if (success) {
        toast.info("Notifications disabled. You won't receive alerts when we go live.");
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
  
  const recordingsUrl = `https://emasjidlive.co.uk/recordings/${station}`;

  // Ensure we're mounted before accessing theme
  useEffect(() => {
    setMounted(true);
  }, []);

  // Derive background color from CSS variables
  useEffect(() => {
    if (!mounted) return;

    const computeBackgroundHex = () => {
      const root = document.documentElement;
      const computedStyle = getComputedStyle(root);
      
      const cardValue = computedStyle.getPropertyValue("--card").trim();
      const backgroundValue = computedStyle.getPropertyValue("--background").trim();
      const hslValue = cardValue || backgroundValue;
      
      if (hslValue) {
        const parsed = parseHslVariable(hslValue);
        if (parsed) {
          const hex = hslToHex(parsed.h, parsed.s, parsed.l);
          setDerivedHex(hex);
          return;
        }
      }
      
      setDerivedHex(resolvedTheme === "dark" ? "1a3333" : "ffffff");
    };

    computeBackgroundHex();

    // Debounce the background computation to reduce CPU usage on theme changes
    const debouncedComputeBackground = debounce(computeBackgroundHex, 100);

    const observer = new MutationObserver(() => {
      debouncedComputeBackground();
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [mounted, resolvedTheme]);

  // Determine the actual theme to use
  const actualTheme = useMemo(() => {
    if (!mounted) return "light";
    return resolvedTheme === "dark" ? "dark" : "light";
  }, [mounted, resolvedTheme]);

  // Generate iframe src
  const iframeSrc = useMemo(() => {
    if (!derivedHex) return null;
    return `https://emasjidlive.co.uk/miniplayer/${station}?theme=${actualTheme}&background=${derivedHex}`;
  }, [station, actualTheme, derivedHex]);

  // Generate a unique key for iframe to force reload on theme/color change
  const iframeKey = useMemo(() => {
    return `${station}-${actualTheme}-${derivedHex}`;
  }, [station, actualTheme, derivedHex]);

  // Show skeleton only on initial load (not during background refetches)
  const showSkeleton = !mounted || (isStatusLoading && !hasInitialData.current);

  // Install dialog for mobile users
  const InstallDialog = (
    <Dialog open={showInstallDialog} onOpenChange={setShowInstallDialog}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            Install for Best Notifications
          </DialogTitle>
          <DialogDescription>
            For reliable notifications on {mobilePlatform === "ios" ? "iPhone/iPad" : "Android"}, install our app to your home screen first.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {mobilePlatform === "ios" ? (
            <div className="space-y-3">
              <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-3">
                <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
                  ⚠️ You must use Safari browser for this to work
                </p>
              </div>
              <p className="text-sm text-muted-foreground">Quick steps:</p>
              <ol className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">1</span>
                  <span>Open this page in <strong>Safari</strong> (not Chrome or other browsers)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">2</span>
                  <span>Tap the <Share className="inline h-4 w-4 mx-1" /> Share button</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">3</span>
                  <span>Tap <strong>"Add to Home Screen"</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">4</span>
                  <span>Open from your home screen & tap "Get Notified"</span>
                </li>
              </ol>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">Quick steps:</p>
              <ol className="text-sm space-y-2">
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">1</span>
                  <span>Tap the <MoreVertical className="inline h-4 w-4 mx-1" /> menu (⋮) in Chrome</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">2</span>
                  <span>Tap <strong>"Install app"</strong> or <strong>"Add to Home screen"</strong></span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-medium text-primary">3</span>
                  <span>Open from your home screen & tap "Get Notified"</span>
                </li>
              </ol>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <Button onClick={handleGoToInstallPage} className="gap-2">
            <Download className="h-4 w-4" />
            View Full Instructions
          </Button>
          <Button variant="ghost" onClick={() => setShowInstallDialog(false)}>
            Maybe Later
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
  
  if (showSkeleton) {
    return (
      <section id="masjid-live" className="py-4">
        <div className="container">
          <Skeleton className="w-full h-[172px] rounded-lg" />
        </div>
      </section>
    );
  }

  // OFFLINE state - calm placeholder with link to recordings
  if (!isLive) {
    return (
      <section id="masjid-live" className="py-4">
        <div className="container">
          <div 
            className="rounded-lg border border-border/30 bg-card/80 backdrop-blur-sm flex flex-col items-center justify-center py-10 px-6 text-center"
          >
            <Radio className="h-8 w-8 text-muted-foreground/50 mb-3" />
            <p className="text-foreground font-medium text-lg mb-1">
              No live broadcast at the moment
            </p>
            <p className="text-muted-foreground text-sm mb-4">
              Please check back later
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-3">
              <a
                href={recordingsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 rounded-md
                  bg-primary/10 hover:bg-primary/20 
                  text-primary font-medium text-sm
                  border border-primary/20 hover:border-primary/30
                  transition-colors duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <PlayCircle className="h-4 w-4" />
                <span>View Past Recordings</span>
              </a>
              <div className="relative">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleToggleNotifications}
                  disabled={isNotificationLoading}
                  className={`gap-2 ${isSubscribed ? "text-primary border-primary/30" : ""}`}
                >
                  {isNotificationLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Loading...</span>
                    </>
                  ) : isSubscribed ? (
                    <>
                      <BellOff className="h-4 w-4" />
                      <span>Notifications On</span>
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4" />
                      <span>Get Notified</span>
                    </>
                  )}
                </Button>
                {typeof subscriberCount === 'number' && subscriberCount > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 flex items-center justify-center min-w-[18px] h-[18px] px-1 text-[10px] font-medium bg-muted text-muted-foreground rounded-full border border-border">
                    {subscriberCount}
                  </span>
                )}
              </div>
            </div>
            {lastOnlineText && (
              <p className="flex items-center gap-1.5 text-muted-foreground text-xs mt-4">
                <Clock className="h-3 w-3" />
                <span>{lastOnlineText}</span>
              </p>
            )}
          </div>
        </div>
        {InstallDialog}
        <NotificationPreferences
          open={showPrefsDialog}
          onOpenChange={setShowPrefsDialog}
          onConfirm={handleConfirmPreferences}
          isLoading={isNotificationLoading}
        />
      </section>
    );
  }

  // LIVE state - show the iframe
  if (!derivedHex || !iframeSrc) {
    return (
      <section id="masjid-live" className="py-4">
        <div className="container">
          <Skeleton className="w-full h-[172px] rounded-lg" />
        </div>
      </section>
    );
  }

  return (
    <section id="masjid-live" className="py-4">
      <div className="container space-y-3">
        {/* Live notification banner */}
        <div className="flex items-center justify-between gap-4 px-4 py-3 rounded-lg bg-primary/10 border border-primary/20">
          <div className="flex items-center gap-3">
            {/* Pulsing dot - matching header live badge */}
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-full w-full bg-primary" />
            </span>
            <span className="text-sm font-medium text-foreground">
              Masjid Irshad is live now — tap the play button below to listen in
            </span>
          </div>
          <div className="relative shrink-0">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleToggleNotifications}
              disabled={isNotificationLoading}
              className={`gap-2 ${isSubscribed ? "text-primary" : "text-muted-foreground"}`}
            >
              {isNotificationLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="hidden sm:inline">Loading...</span>
                </>
              ) : isSubscribed ? (
                <>
                  <BellOff className="h-4 w-4" />
                  <span className="hidden sm:inline">Notifications On</span>
                </>
              ) : (
                <>
                  <Bell className="h-4 w-4" />
                  <span className="hidden sm:inline">Get Notified</span>
                </>
              )}
            </Button>
            {typeof subscriberCount === 'number' && subscriberCount > 0 && (
              <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-[16px] px-1 text-[9px] font-medium bg-muted text-muted-foreground rounded-full border border-border">
                {subscriberCount}
              </span>
            )}
          </div>
        </div>
        
        {/* Iframe */}
        <div 
          className="rounded-lg overflow-hidden border border-border/30"
          style={{ 
            backgroundColor: `#${derivedHex}`,
          }}
        >
          <iframe
            key={iframeKey}
            src={iframeSrc}
            width="100%"
            height="172"
            style={{ 
              border: "none",
              display: "block",
            }}
            title="Masjid Irshad Live Stream"
            allow="autoplay"
            loading="lazy"
          />
        </div>
      </div>
      {InstallDialog}
      <NotificationPreferences
        open={showPrefsDialog}
        onOpenChange={setShowPrefsDialog}
        onConfirm={handleConfirmPreferences}
        isLoading={isNotificationLoading}
      />
    </section>
  );
};

export default MasjidLiveEmbed;
