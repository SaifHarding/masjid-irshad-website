import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { createClient } from '@supabase/supabase-js';

export interface PrayerTimesData {
  Date: string;
  Day: string;
  Fajr_Begins: string;
  Fajr_Jamaat: string;
  Sunrise: string;
  Dhuhr_Begins: string;
  Dhuhr_Jamaat: string;
  Asr_Begins: string;
  Asr_Jamaat: string;
  Maghrib_Begins: string;
  Maghrib_Jamaat: string;
  Isha_Begins: string;
  Isha_Jamaat: string;
  Jummah_1: string;
  Jummah_2: string;
}

export type PrayerTimesSource = 'database' | 'cache' | 'api_fallback';

export interface PrayerTimesResult {
  data: PrayerTimesData;
  source: PrayerTimesSource;
}

const CACHE_KEY = 'prayer_times_cache';

interface CachedPrayerTimes {
  date: string;
  data: PrayerTimesData;
  timestamp: number;
}

const saveToCache = (date: string, data: PrayerTimesData): void => {
  try {
    const cacheData: CachedPrayerTimes = {
      date,
      data,
      timestamp: Date.now(),
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cacheData));
  } catch {
    // Silently fail if localStorage is not available
  }
};

const loadFromCache = (date: string): PrayerTimesData | null => {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;
    
    const cacheData: CachedPrayerTimes = JSON.parse(cached);
    
    // Only return cache if it's for today
    if (cacheData.date === date) {
      return cacheData.data;
    }
    return null;
  } catch {
    return null;
  }
};

interface HijriDate {
  date: string;
  day: string;
  month: {
    en: string;
    ar: string;
  };
  year: string;
}

// External Supabase client for Masjid Irshad prayer times
const prayerSupabaseUrl = import.meta.env.VITE_PRAYER_SUPABASE_URL || 'https://twlkumpbwplusfqhgchw.supabase.co';
const prayerSupabaseKey = import.meta.env.VITE_PRAYER_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3bGt1bXBid3BsdXNmcWhnY2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMDk1NzMsImV4cCI6MjA2Nzg4NTU3M30.2iB_wRs8YoWYwqNHveW8wrpBzumOw8IbnIPtnC1WhMc';
const masjidSupabase = createClient(prayerSupabaseUrl, prayerSupabaseKey);

const normalizePMTime = (time: string): string => {
  const [hours, minutes, seconds] = time.split(':');
  const hour = parseInt(hours);
  
  // If hour is between 1-11, it's likely a PM time stored as AM (add 12 hours)
  if (hour >= 1 && hour <= 11) {
    return `${String(hour + 12).padStart(2, '0')}:${minutes}:${seconds}`;
  }
  
  return time;
};

const normalizeData = (data: PrayerTimesData): PrayerTimesData => {
  return {
    ...data,
    Dhuhr_Jamaat: normalizePMTime(data.Dhuhr_Jamaat),
    Asr_Begins: normalizePMTime(data.Asr_Begins),
    Asr_Jamaat: normalizePMTime(data.Asr_Jamaat),
    Maghrib_Begins: normalizePMTime(data.Maghrib_Begins),
    Maghrib_Jamaat: normalizePMTime(data.Maghrib_Jamaat),
    Isha_Begins: normalizePMTime(data.Isha_Begins),
    Isha_Jamaat: normalizePMTime(data.Isha_Jamaat),
    Jummah_2: normalizePMTime(data.Jummah_2),
  };
};

const fetchFromSupabase = async (today: string): Promise<PrayerTimesData | null> => {
  try {
    const { data, error } = await masjidSupabase
      .from('MasjidIrshadTimes')
      .select('Date, Day, Fajr_Begins, Fajr_Jamaat, Sunrise, Dhuhr_Begins, Dhuhr_Jamaat, Asr_Begins, Asr_Jamaat, Maghrib_Begins, Maghrib_Jamaat, Isha_Begins, Isha_Jamaat, Jummah_1, Jummah_2')
      .eq('Date', today)
      .maybeSingle();

    if (error || !data) return null;
    return data;
  } catch {
    return null;
  }
};

const fetchFromPrayerAPI = async (today: string): Promise<PrayerTimesData | null> => {
  try {
    const latitude = 51.885183;
    const longitude = -0.454741;
    const formattedDate = format(new Date(), "dd-MM-yyyy");
    
    const response = await fetch(
      `https://api.aladhan.com/v1/timings/${formattedDate}?latitude=${latitude}&longitude=${longitude}`
    );
    
    if (!response.ok) return null;
    
    const apiData = await response.json();
    const timings = apiData.data.timings;
    const dayName = apiData.data.date.gregorian.weekday.en.slice(0, 3);
    
    // Map API response to our data structure
    return {
      Date: today,
      Day: dayName,
      Fajr_Begins: timings.Fajr + ':00',
      Fajr_Jamaat: timings.Fajr + ':00',
      Sunrise: timings.Sunrise + ':00',
      Dhuhr_Begins: timings.Dhuhr + ':00',
      Dhuhr_Jamaat: timings.Dhuhr + ':00',
      Asr_Begins: timings.Asr + ':00',
      Asr_Jamaat: timings.Asr + ':00',
      Maghrib_Begins: timings.Maghrib + ':00',
      Maghrib_Jamaat: timings.Maghrib + ':00',
      Isha_Begins: timings.Isha + ':00',
      Isha_Jamaat: timings.Isha + ':00',
      Jummah_1: '12:30:00',
      Jummah_2: '13:15:00',
    };
  } catch {
    return null;
  }
};

const fetchPrayerTimes = async (): Promise<PrayerTimesResult> => {
  const today = format(new Date(), "yyyy-MM-dd");
  
  // Try Supabase first (primary source)
  let data = await fetchFromSupabase(today);

  // If database succeeds, normalize and cache the data
  if (data) {
    const normalizedData = normalizeData(data);
    saveToCache(today, normalizedData);
    return { data: normalizedData, source: 'database' };
  }
  
  // Fallback to local storage cache
  data = loadFromCache(today);
  if (data) {
    return { data, source: 'cache' };
  }
  
  // Final fallback to Prayer API
  data = await fetchFromPrayerAPI(today);
  if (data) {
    // Cache API data too (but don't normalize - it's already correct)
    saveToCache(today, data);
    return { data, source: 'api_fallback' };
  }

  throw new Error("No prayer times found for today");
};

const fetchHijriDate = async (): Promise<HijriDate> => {
  const latitude = 51.885083;
  const longitude = -0.454807;
  const adjustment = 1;
  const today = format(new Date(), "dd-MM-yyyy");
  
  const response = await fetch(
    `https://api.aladhan.com/v1/timings/${today}?latitude=${latitude}&longitude=${longitude}&adjustment=${adjustment}`
  );
  
  if (!response.ok) {
    throw new Error("Failed to fetch Hijri date");
  }
  
  const data = await response.json();
  return data.data.date.hijri;
};

export const usePrayerTimes = () => {
  return useQuery({
    queryKey: ["prayerTimes", format(new Date(), "yyyy-MM-dd")],
    queryFn: fetchPrayerTimes,
    staleTime: 1000 * 60 * 60, // 1 hour
    refetchOnMount: false, // Respect cache if within staleTime
    refetchOnWindowFocus: false,
  });
};

export const useHijriDate = () => {
  return useQuery({
    queryKey: ["hijriDate", format(new Date(), "yyyy-MM-dd")],
    queryFn: fetchHijriDate,
    staleTime: 1000 * 60 * 60 * 24, // 24 hours
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};
