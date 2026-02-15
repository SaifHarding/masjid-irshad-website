import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// External prayer-times database
const EXTERNAL_PRAYER_DB_URL = "https://twlkumpbwplusfqhgchw.supabase.co";
const EXTERNAL_PRAYER_DB_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3bGt1bXBid3BsdXNmcWhnY2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMDk1NzMsImV4cCI6MjA2Nzg4NTU3M30.2iB_wRs8YoWYwqNHveW8wrpBzumOw8IbnIPtnC1WhMc";

const PRAYER_WINDOW_MINUTES = 15;

function getCurrentUKMinutes(): number {
  const now = new Date();
  const ukTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/London" }));
  return ukTime.getHours() * 60 + ukTime.getMinutes();
}

function getCurrentUKDate(): { day: number; month: number; year: number; dayName: string } {
  const now = new Date();
  const ukTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/London" }));
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return {
    day: ukTime.getDate(),
    month: ukTime.getMonth() + 1,
    year: ukTime.getFullYear(),
    dayName: days[ukTime.getDay()]
  };
}

function normalizePMTime(timeStr: string, fieldName: string): number {
  const parts = timeStr.split(':').map(Number);
  const hour = parts[0];
  const minute = parts[1];
  let minutes = hour * 60 + minute;

  const fieldsToNormalize = [
    "Dhuhr_Jamaat",
    "Asr_Begins", "Asr_Jamaat",
    "Maghrib_Begins", "Maghrib_Jamaat",
    "Isha_Begins", "Isha_Jamaat",
    "Jummah_2"
  ];

  if (fieldsToNormalize.includes(fieldName) && hour >= 1 && hour <= 11) {
    const normalized = minutes + 720;
    return normalized;
  }

  return minutes;
}

function formatMinutes(mins: number): string {
  const hour = Math.floor(mins / 60);
  const minute = mins % 60;
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const externalSupabase = createClient(EXTERNAL_PRAYER_DB_URL, EXTERNAL_PRAYER_DB_ANON_KEY);

    const currentDate = getCurrentUKDate();
    const currentMinutes = getCurrentUKMinutes();

    const debug: any = {
      currentTime: {
        raw: new Date().toISOString(),
        ukTime: formatMinutes(currentMinutes),
        minutes: currentMinutes,
        date: `${currentDate.day}/${currentDate.month}/${currentDate.year}`,
        dayName: currentDate.dayName,
        isFriday: currentDate.dayName === 'Friday'
      },
      dateFormatsAttempted: [],
      prayerTimesFound: null,
      prayerAnalysis: []
    };

    // Try multiple date formats
    const dateFormats = [
      `${currentDate.year}-${String(currentDate.month).padStart(2, '0')}-${String(currentDate.day).padStart(2, '0')}`,
      `${currentDate.day}/${currentDate.month}`,
      `${currentDate.day}/${String(currentDate.month).padStart(2, '0')}`,
      `${String(currentDate.day).padStart(2, '0')}/${currentDate.month}`,
      `${String(currentDate.day).padStart(2, '0')}/${String(currentDate.month).padStart(2, '0')}`,
    ];

    for (const dateStr of dateFormats) {
      debug.dateFormatsAttempted.push(dateStr);

      const { data, error } = await externalSupabase
        .from("MasjidIrshadTimes")
        .select("*")
        .eq("Date", dateStr)
        .maybeSingle();

      if (data) {
        debug.prayerTimesFound = {
          dateFormat: dateStr,
          rawData: data
        };

        // Analyze each prayer time
        const prayers = ['Fajr', 'Dhuhr', 'Asr', 'Maghrib', 'Isha'];
        for (const prayer of prayers) {
          const beginsField = `${prayer}_Begins`;
          const jamaatField = `${prayer}_Jamaat`;

          if (data[beginsField]) {
            const beginsMins = normalizePMTime(data[beginsField], beginsField);
            const diff = currentMinutes - beginsMins;
            const absDiff = Math.abs(diff);
            debug.prayerAnalysis.push({
              prayer,
              type: 'begins',
              time: data[beginsField],
              normalizedMinutes: beginsMins,
              formatted: formatMinutes(beginsMins),
              minutesUntil: -diff,
              minutesAgo: diff,
              absoluteDifference: absDiff,
              withinWindow: absDiff <= PRAYER_WINDOW_MINUTES,
              status: absDiff <= PRAYER_WINDOW_MINUTES ? '✅ WITHIN WINDOW' : '❌ Outside window'
            });
          }

          if (data[jamaatField]) {
            const jamaatMins = normalizePMTime(data[jamaatField], jamaatField);
            const diff = currentMinutes - jamaatMins;
            const absDiff = Math.abs(diff);
            debug.prayerAnalysis.push({
              prayer,
              type: 'iqamah',
              time: data[jamaatField],
              normalizedMinutes: jamaatMins,
              formatted: formatMinutes(jamaatMins),
              minutesUntil: -diff,
              minutesAgo: diff,
              absoluteDifference: absDiff,
              withinWindow: absDiff <= PRAYER_WINDOW_MINUTES,
              status: absDiff <= PRAYER_WINDOW_MINUTES ? '✅ WITHIN WINDOW' : '❌ Outside window'
            });
          }
        }

        // Check Jummah on Fridays
        if (currentDate.dayName === 'Friday') {
          if (data['Jummah_1']) {
            const jummah1Mins = normalizePMTime(data['Jummah_1'], 'Jummah_1');
            const diff = currentMinutes - jummah1Mins;
            const absDiff = Math.abs(diff);
            debug.prayerAnalysis.push({
              prayer: '1st Jumuah',
              type: 'iqamah',
              time: data['Jummah_1'],
              normalizedMinutes: jummah1Mins,
              formatted: formatMinutes(jummah1Mins),
              minutesUntil: -diff,
              minutesAgo: diff,
              absoluteDifference: absDiff,
              withinWindow: absDiff <= 30,
              status: absDiff <= 30 ? '✅ WITHIN WINDOW' : '❌ Outside window'
            });
          }
          if (data['Jummah_2']) {
            const jummah2Mins = normalizePMTime(data['Jummah_2'], 'Jummah_2');
            const diff = currentMinutes - jummah2Mins;
            const absDiff = Math.abs(diff);
            debug.prayerAnalysis.push({
              prayer: '2nd Jumuah',
              type: 'iqamah',
              time: data['Jummah_2'],
              normalizedMinutes: jummah2Mins,
              formatted: formatMinutes(jummah2Mins),
              minutesUntil: -diff,
              minutesAgo: diff,
              absoluteDifference: absDiff,
              withinWindow: absDiff <= 30,
              status: absDiff <= 30 ? '✅ WITHIN WINDOW' : '❌ Outside window'
            });
          }
        }

        break;
      }
    }

    if (!debug.prayerTimesFound) {
      debug.error = "No prayer times found in database for today";
    }

    return new Response(
      JSON.stringify(debug, null, 2),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[debug-prayer-times] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
