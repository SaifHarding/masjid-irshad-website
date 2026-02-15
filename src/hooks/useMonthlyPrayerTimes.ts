import { useQuery } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import { createClient } from '@supabase/supabase-js';
import type { PrayerTimesData } from "./usePrayerTimes";

// External Supabase client for Masjid Irshad prayer times
const prayerSupabaseUrl = import.meta.env.VITE_PRAYER_SUPABASE_URL || 'https://twlkumpbwplusfqhgchw.supabase.co';
const prayerSupabaseKey = import.meta.env.VITE_PRAYER_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3bGt1bXBid3BsdXNmcWhnY2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMDk1NzMsImV4cCI6MjA2Nzg4NTU3M30.2iB_wRs8YoWYwqNHveW8wrpBzumOw8IbnIPtnC1WhMc';
const masjidSupabase = createClient(prayerSupabaseUrl, prayerSupabaseKey);

const normalizePMTime = (time: string): string => {
  if (!time) return time;
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

const fetchMonthlyPrayerTimes = async (year: number, month: number): Promise<PrayerTimesData[]> => {
  const monthDate = new Date(year, month, 1);
  const startDate = format(startOfMonth(monthDate), "yyyy-MM-dd");
  const endDate = format(endOfMonth(monthDate), "yyyy-MM-dd");

  const { data, error } = await masjidSupabase
    .from('MasjidIrshadTimes')
    .select('Date, Day, Fajr_Begins, Fajr_Jamaat, Sunrise, Dhuhr_Begins, Dhuhr_Jamaat, Asr_Begins, Asr_Jamaat, Maghrib_Begins, Maghrib_Jamaat, Isha_Begins, Isha_Jamaat, Jummah_1, Jummah_2')
    .gte('Date', startDate)
    .lte('Date', endDate)
    .order('Date', { ascending: true });

  if (error) {
    throw new Error(`Failed to fetch prayer times: ${error.message}`);
  }

  if (!data || data.length === 0) {
    return [];
  }

  return data.map(normalizeData);
};

export const useMonthlyPrayerTimes = (year: number, month: number) => {
  return useQuery({
    queryKey: ["monthlyPrayerTimes", year, month],
    queryFn: () => fetchMonthlyPrayerTimes(year, month),
    staleTime: 1000 * 60 * 60, // 1 hour
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  });
};
