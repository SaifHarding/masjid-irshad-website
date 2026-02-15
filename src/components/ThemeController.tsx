import { useEffect } from "react";
import { useTheme } from "next-themes";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";

const MANUAL_OVERRIDE_KEY = "fajr-mode-manual-override";
const MANUAL_THEME_KEY = "fajr-mode-manual-theme";

export const ThemeController = ({ children }: { children: React.ReactNode }) => {
  const { setTheme } = useTheme();
  const { data: prayerResult } = usePrayerTimes();
  const prayerData = prayerResult?.data;

  useEffect(() => {
    const checkAndSetTheme = () => {
      // Check if user has manually overridden the theme
      const manualOverride = localStorage.getItem(MANUAL_OVERRIDE_KEY);
      
      if (manualOverride === "true") {
        const manualTheme = localStorage.getItem(MANUAL_THEME_KEY);
        if (manualTheme) {
          setTheme(manualTheme);
          return;
        }
      }

      // Automatic theme based on prayer times
      if (!prayerData?.Maghrib_Begins || !prayerData?.Sunrise) return;

      const now = new Date();
      const currentTime = now.getHours() * 60 + now.getMinutes();

      // Parse Maghrib time (format: "HH:MM")
      const [maghribHour, maghribMinute] = prayerData.Maghrib_Begins.split(":").map(Number);
      let maghribMinutes = maghribHour * 60 + maghribMinute;
      // Normalize PM time if stored as AM value
      if (maghribMinutes < 720) maghribMinutes += 720;

      // Parse Sunrise time and add 1 hour
      const [sunriseHour, sunriseMinute] = prayerData.Sunrise.split(":").map(Number);
      const sunrisePlusOneHour = sunriseHour * 60 + sunriseMinute + 60;

      // Check if current time is between Maghrib and 1hr after Sunrise
      // This handles the overnight period (e.g., Maghrib at 18:00 to Sunrise+1hr next day)
      const shouldBeDark = currentTime >= maghribMinutes || currentTime < sunrisePlusOneHour;

      setTheme(shouldBeDark ? "dark" : "light");
    };

    // Check immediately
    checkAndSetTheme();

    // Check every 2 minutes (reduced from 1 minute for performance while keeping responsive)
    const interval = setInterval(checkAndSetTheme, 2 * 60 * 1000);

    return () => clearInterval(interval);
  }, [prayerData, setTheme]);

  return <>{children}</>;
};

export const setManualThemeOverride = (theme: string) => {
  localStorage.setItem(MANUAL_OVERRIDE_KEY, "true");
  localStorage.setItem(MANUAL_THEME_KEY, theme);
};

export const clearManualThemeOverride = () => {
  localStorage.removeItem(MANUAL_OVERRIDE_KEY);
  localStorage.removeItem(MANUAL_THEME_KEY);
};

export const hasManualThemeOverride = (): boolean => {
  return localStorage.getItem(MANUAL_OVERRIDE_KEY) === "true";
};
