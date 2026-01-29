import { useQuery } from "@tanstack/react-query";
import { usePrayerTimes } from "@/hooks/usePrayerTimes";
import { useMemo, useEffect, useState } from "react";
import { getBackendClient } from "@/lib/backendClient";

interface LiveStatusResponse {
  station: string;
  live: boolean;
  checkedAt: string;
  lastLiveAt?: string | null;
  error?: string;
}

// Parse time string (HH:MM:SS) to minutes since midnight
const parseTimeToMinutes = (timeStr: string): number => {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return hours * 60 + minutes;
};

// Get current time in minutes since midnight
const getCurrentMinutes = (): number => {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
};

// Check if current time is within a window around prayer time
const isNearPrayerTime = (prayerTimeStr: string, windowMinutes: number = 15): boolean => {
  const prayerMinutes = parseTimeToMinutes(prayerTimeStr);
  const currentMinutes = getCurrentMinutes();
  
  // Check if within window before or after prayer time
  return Math.abs(currentMinutes - prayerMinutes) <= windowMinutes;
};

export const useLiveStatus = (station: string = "masjidirshad") => {
  const { data: prayerData } = usePrayerTimes();
  const [lastCheckTime, setLastCheckTime] = useState<number>(Date.now());
  
  // Determine if we're near any prayer time (begin or iqamah)
  const isNearPrayer = useMemo(() => {
    if (!prayerData?.data) return false;
    
    const times = prayerData.data;
    const prayerTimes = [
      times.Fajr_Begins,
      times.Fajr_Jamaat,
      times.Dhuhr_Begins,
      times.Dhuhr_Jamaat,
      times.Asr_Begins,
      times.Asr_Jamaat,
      times.Maghrib_Begins,
      times.Maghrib_Jamaat,
      times.Isha_Begins,
      times.Isha_Jamaat,
      times.Jummah_1,
      times.Jummah_2,
    ];
    
    return prayerTimes.some(time => isNearPrayerTime(time, 20)); // 20 min window
  }, [prayerData, lastCheckTime]);
  
  // Refresh check every minute to update isNearPrayer
  useEffect(() => {
    const interval = setInterval(() => {
      setLastCheckTime(Date.now());
    }, 60_000);
    
    return () => clearInterval(interval);
  }, []);
  
  // Calculate refetch interval - more frequent near prayer times
  // For notifications to be prompt, we need faster polling
  const refetchInterval = isNearPrayer ? 15_000 : 45_000; // 15s near prayer, 45s otherwise
  
  return useQuery({
    queryKey: ["live-status", station, isNearPrayer],
    queryFn: async (): Promise<LiveStatusResponse> => {
      const supabase = getBackendClient();
      const { data, error } = await supabase.functions.invoke('emasjid-live-status', {
        body: { station },
      });

      if (error) {
        return {
          station,
          live: false,
          checkedAt: new Date().toISOString(),
          error: "Failed to fetch status",
        };
      }

      return data as LiveStatusResponse;
    },
    staleTime: isNearPrayer ? 10_000 : 30_000, // Shorter stale time for responsiveness
    refetchInterval,
    refetchOnWindowFocus: false, // Polling already keeps data fresh, prevent refetch flicker on tab switch
    refetchOnReconnect: true,
    retry: 2,
    retryDelay: 3000,
  });
};
