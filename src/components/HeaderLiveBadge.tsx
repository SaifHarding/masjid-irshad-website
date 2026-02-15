import { useNavigate, useLocation } from "react-router-dom";
import { useSharedLiveStatus } from "@/contexts/LiveStatusContext";
import { useCallback, useEffect, useState, useRef } from "react";

const HeaderLiveBadge = () => {
  const { data: liveStatus, isLoading, isFetching } = useSharedLiveStatus();
  const navigate = useNavigate();
  const location = useLocation();
  const [isVisible, setIsVisible] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  
  // Track the last known live state to prevent flicker during refetches
  const lastKnownLiveState = useRef<boolean>(false);

  // Determine if live - use last known state during loading/refetching
  const isLive = isLoading || isFetching 
    ? lastKnownLiveState.current 
    : liveStatus?.live === true;

  // Update last known state when we get fresh data
  useEffect(() => {
    if (!isLoading && !isFetching && liveStatus) {
      lastKnownLiveState.current = liveStatus.live === true;
    }
  }, [liveStatus, isLoading, isFetching]);

  // Check for reduced motion preference
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // Handle enter/exit animation for LIVE badge
  useEffect(() => {
    if (isLive) {
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [isLive]);

  const handleClick = useCallback(() => {
    const scrollToEmbed = () => {
      const embedSection = document.getElementById("masjid-live");
      if (embedSection) {
        embedSection.scrollIntoView({ 
          behavior: prefersReducedMotion ? "auto" : "smooth",
          block: "center"
        });
      }
    };

    if (location.pathname === "/") {
      scrollToEmbed();
    } else {
      navigate("/", { state: { scrollToLive: true } });
    }
  }, [location.pathname, navigate, prefersReducedMotion]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" || e.key === " ") {
        e.preventDefault();
        handleClick();
      }
    },
    [handleClick]
  );

  // OFFLINE state - always visible, calm, muted, but still clickable
  if (!isLive) {
    return (
      <button
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        aria-label="Jump to live stream section"
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
          bg-muted/50 hover:bg-muted/70 border border-border/50 hover:border-border
          text-muted-foreground
          text-xs font-medium
          select-none cursor-pointer
          focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
          transition-colors duration-200"
      >
        <span className="inline-flex rounded-full h-2 w-2 bg-muted-foreground/40" />
        <span>Offline</span>
      </button>
    );
  }

  // LIVE state - animated, clickable badge
  return (
    <button
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      aria-label="Jump to live stream"
      className={`
        inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full
        bg-red-500/10 hover:bg-red-500/20 
        border border-red-500/30 hover:border-red-500/50
        text-red-600 dark:text-red-400
        text-xs font-semibold uppercase tracking-wide
        cursor-pointer select-none
        focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2
        transition-all duration-300
        ${isVisible ? "opacity-100 scale-100" : "opacity-0 scale-95"}
        ${prefersReducedMotion ? "" : "animate-fade-in"}
      `}
    >
      {/* Pulsing dot */}
      <span className="relative flex h-2 w-2">
        {!prefersReducedMotion && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-75 animate-ping" />
        )}
        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500" />
      </span>
      <span>Live</span>
    </button>
  );
};

export default HeaderLiveBadge;
