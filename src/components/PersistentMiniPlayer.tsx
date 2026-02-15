import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useTheme } from "next-themes";
import { X, ChevronUp, ChevronDown } from "lucide-react";
import { useSharedLiveStatus } from "@/contexts/LiveStatusContext";
import { debounce } from "@/lib/utils";

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

// Parse CSS variable HSL value
const parseHslVariable = (hslValue: string): { h: number; s: number; l: number } | null => {
  const match = hslValue.match(/(\d+(?:\.\d+)?)\s*,?\s*(\d+(?:\.\d+)?)%?\s*,?\s*(\d+(?:\.\d+)?)%?/);
  if (!match) return null;
  return {
    h: parseFloat(match[1]),
    s: parseFloat(match[2]),
    l: parseFloat(match[3]),
  };
};

interface PersistentMiniPlayerProps {
  station?: string;
}

const PersistentMiniPlayer = ({ station = "masjidirshad" }: PersistentMiniPlayerProps) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { resolvedTheme } = useTheme();
  const { data: liveStatus, isLoading } = useSharedLiveStatus();
  
  const [mounted, setMounted] = useState(false);
  const [derivedHex, setDerivedHex] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);
  
  // Track if user has ever expanded (started playing)
  const hasExpandedOnce = useRef(false);
  
  const isLive = liveStatus?.live === true;
  const isOnHomepage = location.pathname === "/";
  
  // Show the floating UI when: live, not on homepage, not dismissed, mounted
  const shouldShowUI = mounted && isLive && !isOnHomepage && !isDismissed && !isLoading;
  
  // Keep iframe mounted if user has expanded at least once AND still live
  // This ensures audio continues across page navigations
  const shouldMountIframe = mounted && isLive && hasExpandedOnce.current && !isLoading;

  // Reset dismissed state when going back to homepage or when stream goes offline
  useEffect(() => {
    if (isOnHomepage || !isLive) {
      setIsDismissed(false);
    }
    // Reset expanded state when stream goes offline
    if (!isLive) {
      setIsExpanded(false);
      hasExpandedOnce.current = false;
    }
  }, [isOnHomepage, isLive]);

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

    const debouncedCompute = debounce(computeBackgroundHex, 100);
    const observer = new MutationObserver(() => debouncedCompute());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, [mounted, resolvedTheme]);

  const actualTheme = useMemo(() => {
    if (!mounted) return "light";
    return resolvedTheme === "dark" ? "dark" : "light";
  }, [mounted, resolvedTheme]);

  const iframeSrc = useMemo(() => {
    if (!derivedHex) return null;
    return `https://emasjidlive.co.uk/miniplayer/${station}?theme=${actualTheme}&background=${derivedHex}`;
  }, [station, actualTheme, derivedHex]);

  // Stable key - only changes with station to prevent iframe reload on theme change
  const iframeKey = useMemo(() => {
    return `persistent-${station}`;
  }, [station]);

  const handleDismiss = useCallback(() => {
    setIsDismissed(true);
    setIsExpanded(false);
  }, []);

  const handleGoHome = useCallback(() => {
    navigate("/", { state: { scrollToLive: true } });
  }, [navigate]);

  const handleToggleExpand = useCallback(() => {
    setIsExpanded((prev) => {
      if (!prev) {
        hasExpandedOnce.current = true;
      }
      return !prev;
    });
  }, []);

  // Don't render anything if not live or not mounted
  if (!mounted || !isLive || isLoading || !iframeSrc) {
    return null;
  }

  // On homepage: render hidden iframe to maintain audio, no visible UI
  if (isOnHomepage) {
    if (!shouldMountIframe) return null;
    
    return (
      <div 
        className="fixed pointer-events-none"
        style={{ 
          position: 'fixed',
          bottom: '-9999px',
          left: '-9999px',
          width: '1px',
          height: '1px',
          overflow: 'hidden',
        }}
        aria-hidden="true"
      >
        <iframe
          key={iframeKey}
          src={iframeSrc}
          width="360"
          height="120"
          style={{ border: "none" }}
          title="Masjid Irshad Live Stream - Persistent Audio"
          allow="autoplay"
        />
      </div>
    );
  }

  // On other pages: show mini-player UI (if not dismissed)
  if (!shouldShowUI) {
    // Still render hidden iframe if user has played before
    if (shouldMountIframe) {
      return (
        <div 
          className="fixed pointer-events-none"
          style={{ 
            position: 'fixed',
            bottom: '-9999px',
            left: '-9999px',
            width: '1px',
            height: '1px',
            overflow: 'hidden',
          }}
          aria-hidden="true"
        >
          <iframe
            key={iframeKey}
            src={iframeSrc}
            width="360"
            height="120"
            style={{ border: "none" }}
            title="Masjid Irshad Live Stream - Persistent Audio"
            allow="autoplay"
          />
        </div>
      );
    }
    return null;
  }

  // Collapsed state - small floating pill
  if (!isExpanded) {
    return (
      <>
        {/* Hidden iframe for audio continuity */}
        {shouldMountIframe && (
          <div 
            className="fixed pointer-events-none"
            style={{ 
              position: 'fixed',
              bottom: '-9999px',
              left: '-9999px',
              width: '1px',
              height: '1px',
              overflow: 'hidden',
            }}
            aria-hidden="true"
          >
            <iframe
              key={iframeKey}
              src={iframeSrc}
              width="360"
              height="120"
              style={{ border: "none" }}
              title="Masjid Irshad Live Stream - Persistent Audio"
              allow="autoplay"
            />
          </div>
        )}
        
        {/* Visible collapsed UI */}
        <div className="fixed bottom-4 right-4 z-50 animate-fade-in">
          <button
            onClick={handleToggleExpand}
            className="flex items-center gap-2 px-4 py-3 rounded-full bg-card border border-border shadow-lg hover:shadow-xl transition-all duration-200"
            aria-label="Expand mini player"
          >
            {/* Pulsing live dot */}
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-full w-full bg-primary" />
            </span>
            <span className="text-sm font-medium text-foreground">
              {hasExpandedOnce.current ? "Playing" : "Live"}
            </span>
            <ChevronUp className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </>
    );
  }

  // Expanded mini-player with visible iframe
  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:w-[360px] z-50 animate-fade-in">
      <div 
        className="rounded-lg border border-border bg-card shadow-xl overflow-hidden"
        style={{ backgroundColor: `#${derivedHex}` }}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between px-3 py-2 bg-primary/10 border-b border-border/50">
          <button
            onClick={handleGoHome}
            className="flex items-center gap-2 text-sm font-medium text-foreground hover:text-primary transition-colors"
          >
            {/* Pulsing live dot */}
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full rounded-full bg-primary opacity-75 animate-ping" />
              <span className="relative inline-flex rounded-full h-full w-full bg-primary" />
            </span>
            <span>Masjid Irshad Live</span>
          </button>
          <div className="flex items-center gap-1">
            <button
              onClick={handleToggleExpand}
              className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Collapse player"
            >
              <ChevronDown className="h-4 w-4" />
            </button>
            <button
              onClick={handleDismiss}
              className="p-1.5 rounded-md hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Close player"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Visible iframe */}
        <iframe
          key={iframeKey}
          src={iframeSrc}
          width="100%"
          height="120"
          style={{ border: "none", display: "block" }}
          title="Masjid Irshad Live Stream - Mini Player"
          allow="autoplay"
          loading="eager"
        />
      </div>
    </div>
  );
};

export default PersistentMiniPlayer;
