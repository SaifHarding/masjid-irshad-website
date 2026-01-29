import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Persist last known live state + notification cooldown in the database.
// Edge functions can cold-start frequently; in-memory state causes notification spam.
const NOTIFICATION_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes between notifications

// External prayer-times database (matches frontend src/hooks/usePrayerTimes.ts)
const EXTERNAL_PRAYER_DB_URL = "https://twlkumpbwplusfqhgchw.supabase.co";
const EXTERNAL_PRAYER_DB_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3bGt1bXBid3BsdXNmcWhnY2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMDk1NzMsImV4cCI6MjA2Nzg4NTU3M30.2iB_wRs8YoWYwqNHveW8wrpBzumOw8IbnIPtnC1WhMc";

const STATION_ID = "masjidirshad";

// Prayer time windows (in minutes) - check if current time is near prayer begin (Adhan) or iqamah
// 15-minute window balances precision with detection reliability
const PRAYER_WINDOW_MINUTES = 15;
const IQAMAH_WINDOW_MINUTES = 15;
// Jummah gets a wider 30-minute window due to varying khutbah durations
const JUMMAH_WINDOW_MINUTES = 30;

interface PrayerTime {
  name: string;
  displayName: string;
  beginsField: string;
  iqamahField: string;
}

interface PrayerEvent {
  prayer: PrayerTime;
  type: "adhan" | "iqamah";
}

const DAILY_PRAYERS: PrayerTime[] = [
  { name: "Fajr", displayName: "Fajr", beginsField: "Fajr_Begins", iqamahField: "Fajr_Jamaat" },
  { name: "Dhuhr", displayName: "Dhuhr", beginsField: "Dhuhr_Begins", iqamahField: "Dhuhr_Jamaat" },
  { name: "Asr", displayName: "Asr", beginsField: "Asr_Begins", iqamahField: "Asr_Jamaat" },
  { name: "Maghrib", displayName: "Maghrib", beginsField: "Maghrib_Begins", iqamahField: "Maghrib_Jamaat" },
  { name: "Isha", displayName: "Isha", beginsField: "Isha_Begins", iqamahField: "Isha_Jamaat" },
];

// Get current UK time in minutes since midnight
function getCurrentUKMinutes(): number {
  const now = new Date();
  // Convert to UK timezone
  const ukTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/London" }));
  return ukTime.getHours() * 60 + ukTime.getMinutes();
}

// Check if today is Friday in UK timezone
function isFridayInUK(): boolean {
  const now = new Date();
  const ukTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/London" }));
  return ukTime.getDay() === 5; // 5 = Friday
}

// Normalize prayer time (matches frontend usePrayerTimes.ts normalization)
// The database stores some PM times incorrectly as AM (e.g., 1:00 PM stored as 01:00)
// If hour is between 1-11 (60-719 minutes), it's likely a PM time stored as AM
function normalizePMTime(timeStr: string, fieldName: string): number {
  const parts = timeStr.split(':').map(Number);
  const hour = parts[0];
  const minute = parts[1];
  let minutes = hour * 60 + minute;

  // Fields that need normalization (matches frontend exactly):
  // Dhuhr_Jamaat, Asr_Begins, Asr_Jamaat, Maghrib_Begins, Maghrib_Jamaat,
  // Isha_Begins, Isha_Jamaat, Jummah_2
  const fieldsToNormalize = [
    "Dhuhr_Jamaat",
    "Asr_Begins", "Asr_Jamaat",
    "Maghrib_Begins", "Maghrib_Jamaat",
    "Isha_Begins", "Isha_Jamaat",
    "Jummah_2"
  ];

  if (fieldsToNormalize.includes(fieldName) && hour >= 1 && hour <= 11) {
    const normalized = minutes + 720; // Add 12 hours
    console.log(`[check-live-and-notify] Normalizing ${fieldName} from ${timeStr} (${minutes} mins) to ${normalized} mins`);
    return normalized;
  }

  return minutes;
}

// Check if near a Jumu'ah time and return which one
function findCurrentJumuah(prayerData: Record<string, string>): PrayerTime | null {
  const currentMinutes = getCurrentUKMinutes();

  // Check 1st Jumu'ah
  const jummah1 = prayerData["Jummah_1"];
  if (jummah1) {
    const jummah1Minutes = normalizePMTime(jummah1, "Jummah_1");
    if (Math.abs(currentMinutes - jummah1Minutes) <= JUMMAH_WINDOW_MINUTES) {
      console.log(`[check-live-and-notify] Near 1st Jumu'ah (diff: ${Math.abs(currentMinutes - jummah1Minutes)} mins)`);
      return { name: "Jumuah", displayName: "1st Jumu'ah", beginsField: "", iqamahField: "Jummah_1" };
    }
  }

  // Check 2nd Jumu'ah
  const jummah2 = prayerData["Jummah_2"];
  if (jummah2) {
    const jummah2Minutes = normalizePMTime(jummah2, "Jummah_2");
    if (Math.abs(currentMinutes - jummah2Minutes) <= JUMMAH_WINDOW_MINUTES) {
      console.log(`[check-live-and-notify] Near 2nd Jumu'ah (diff: ${Math.abs(currentMinutes - jummah2Minutes)} mins)`);
      return { name: "Jumuah", displayName: "2nd Jumu'ah", beginsField: "", iqamahField: "Jummah_2" };
    }
  }

  return null;
}

// Find which prayer event (Adhan or Iqamah) is currently active (within window)
// Returns the closest event if multiple are within the window
function findCurrentPrayer(prayerData: Record<string, string>): PrayerEvent | null {
  const currentMinutes = getCurrentUKMinutes();
  console.log(`[check-live-and-notify] Current time: ${Math.floor(currentMinutes / 60)}:${String(currentMinutes % 60).padStart(2, '0')} (${currentMinutes} mins)`);

  // On Fridays, check Jumu'ah times first (they replace Dhuhr)
  if (isFridayInUK()) {
    const jumuah = findCurrentJumuah(prayerData);
    if (jumuah) {
      // Jumu'ah is always an iqamah (there's no separate adhan for Jumu'ah in this context)
      return { prayer: jumuah, type: "iqamah" };
    }
  }

  let closestEvent: PrayerEvent | null = null;
  let closestDiff = Infinity;

  for (const prayer of DAILY_PRAYERS) {
    // Skip Dhuhr on Fridays (replaced by Jumu'ah)
    if (isFridayInUK() && prayer.name === "Dhuhr") continue;

    // MAGHRIB SPECIAL CASE: begins and iqamah times are always the same
    // (Maghrib is prayed immediately at sunset). Only check iqamah to avoid duplicate detection.
    const isMaghrib = prayer.name === "Maghrib";

    // Check prayer begin time (Adhan) - skip for Maghrib since it equals iqamah
    if (!isMaghrib) {
      const beginTime = prayerData[prayer.beginsField];
      if (beginTime) {
        const beginMinutes = normalizePMTime(beginTime, prayer.beginsField);
        const beginDiff = Math.abs(currentMinutes - beginMinutes);
        console.log(`[check-live-and-notify] ${prayer.name} begins at ${beginTime} (${beginMinutes} mins), diff: ${beginDiff} mins`);

        if (beginDiff <= PRAYER_WINDOW_MINUTES && beginDiff < closestDiff) {
          closestEvent = { prayer, type: "adhan" };
          closestDiff = beginDiff;
          console.log(`[check-live-and-notify] ✓ Near ${prayer.name} prayer begin/Adhan (diff: ${beginDiff} mins)`);
        }
      }
    }

    // Check iqamah time (for Maghrib, this is the only check)
    const iqamahTime = prayerData[prayer.iqamahField];
    if (iqamahTime) {
      const iqamahMinutes = normalizePMTime(iqamahTime, prayer.iqamahField);
      const iqamahDiff = Math.abs(currentMinutes - iqamahMinutes);
      
      if (isMaghrib) {
        console.log(`[check-live-and-notify] ${prayer.name} at ${iqamahTime} (${iqamahMinutes} mins), diff: ${iqamahDiff} mins [begins=iqamah]`);
      } else {
        console.log(`[check-live-and-notify] ${prayer.name} iqamah at ${iqamahTime} (${iqamahMinutes} mins), diff: ${iqamahDiff} mins`);
      }

      if (iqamahDiff <= IQAMAH_WINDOW_MINUTES && iqamahDiff < closestDiff) {
        closestEvent = { prayer, type: "iqamah" };
        closestDiff = iqamahDiff;
        console.log(`[check-live-and-notify] ✓ Near ${prayer.name} ${isMaghrib ? 'prayer' : 'iqamah'} (diff: ${iqamahDiff} mins)`);
      }
    }
  }

  if (closestEvent) {
    console.log(`[check-live-and-notify] Selected closest event: ${closestEvent.prayer.displayName} ${closestEvent.type} (${closestDiff} mins away)`);
  } else {
    console.log(`[check-live-and-notify] No prayer event within window (${PRAYER_WINDOW_MINUTES} mins for adhan/iqamah, ${JUMMAH_WINDOW_MINUTES} mins for Jummah)`);
  }

  return closestEvent;
}

// Fetch today's prayer times from database
async function fetchTodaysPrayerTimes(externalSupabase: any): Promise<Record<string, string> | null> {
  try {
    // Get today's date in UK timezone
    const now = new Date();
    const ukDate = new Date(now.toLocaleString("en-US", { timeZone: "Europe/London" }));
    const day = ukDate.getDate();
    const month = ukDate.getMonth() + 1;
    const year = ukDate.getFullYear();

    console.log(`[check-live-and-notify] 📅 Current UK date: ${day}/${month}/${year}`);

    // Try multiple date formats since DB might use different formats
    const dateFormats = [
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`, // "2026-01-29" (ISO format)
      `${day}/${month}`,                                    // "29/1"
      `${day}/${String(month).padStart(2, '0')}`,          // "29/01"
      `${String(day).padStart(2, '0')}/${month}`,          // "29/1"
      `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`, // "29/01"
    ];

    console.log(`[check-live-and-notify] Trying date formats: ${dateFormats.join(', ')}`);

    for (const dateStr of dateFormats) {
      const { data, error } = await externalSupabase
        .from("MasjidIrshadTimes")
        .select("*")
        .eq("Date", dateStr)
        .maybeSingle();

      if (error) {
        console.log(`[check-live-and-notify] ✗ Error for format ${dateStr}:`, error.message);
        continue;
      }

      if (data) {
        console.log(`[check-live-and-notify] ✓ Found prayer times with format: ${dateStr}`);
        console.log(`[check-live-and-notify] Prayer times data keys:`, Object.keys(data).join(', '));
        return data;
      } else {
        console.log(`[check-live-and-notify] ✗ No data for format: ${dateStr}`);
      }
    }

    console.error("[check-live-and-notify] ❌ No prayer data found for any date format");
    return null;
  } catch (err) {
    console.error("[check-live-and-notify] ❌ Failed to fetch prayer times:", err);
    return null;
  }
}

// Fetch with retry logic for transient DNS/network failures
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
  let lastError: Error | null = null;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);
      return response;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : String(err);
      lastError = err instanceof Error ? err : new Error(errorMessage);
      console.warn(`[check-live-and-notify] Attempt ${attempt}/${maxRetries} failed: ${errorMessage}`);
      
      if (attempt < maxRetries) {
        // Exponential backoff: 500ms, 1000ms, 2000ms
        const delay = Math.pow(2, attempt - 1) * 500;
        console.log(`[check-live-and-notify] Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError;
}

// PRIMARY: Check the eMasjid widget API directly 
// The widget likely fetches status via an API that we can call
async function checkEmasjidApi(station: string): Promise<{ live: boolean; method: string } | null> {
  // Known eMasjid API endpoints to try (in order of preference)
  const apiEndpoints = [
    `https://emasjidlive.co.uk/api/status/${station}`,
    `https://emasjidlive.co.uk/api/stations/${station}`,
    `https://api.emasjid.net/v1/status/${station}`,
    `https://emasjid.net/api/status/${station}`,
  ];
  
  for (const apiUrl of apiEndpoints) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const res = await fetch(apiUrl, {
        method: "GET",
        signal: controller.signal,
        headers: {
          "Accept": "application/json",
          "User-Agent": "Mozilla/5.0 (compatible; MasjidIrshadNotifier/1.0)",
        },
      });
      
      clearTimeout(timeoutId);
      
      if (res.ok) {
        const data = await res.json();
        // Try common field names for live status
        const isLive = data.live === true || data.is_live === true || data.status === "live" || data.streaming === true;
        console.log(`[check-live-and-notify] API ${apiUrl} returned: ${JSON.stringify(data).slice(0, 200)}`);
        return { live: isLive, method: "api" };
      }
      
      console.log(`[check-live-and-notify] API ${apiUrl}: ${res.status}`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log(`[check-live-and-notify] API check failed for ${apiUrl}: ${errMsg}`);
    }
  }
  
  return null;
}

// SECONDARY: Check Icecast stream directly via HEAD request
// Icecast returns 200 when streaming, connection refused or timeout when offline
async function checkIcecastStream(station: string): Promise<{ live: boolean; method: string } | null> {
  const streamUrls = [
    `https://live.emasjid.net/${station}`,
    `https://stream.emasjid.net/${station}`,
  ];
  
  for (const streamUrl of streamUrls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      
      const res = await fetch(streamUrl, {
        method: "HEAD",
        signal: controller.signal,
        headers: {
          "User-Agent": "Mozilla/5.0 (compatible; MasjidIrshadNotifier/1.0)",
        },
      });
      
      clearTimeout(timeoutId);
      
      // Icecast returns 200 with audio content-type when streaming
      const contentType = res.headers.get("content-type") || "";
      const isAudioStream = contentType.includes("audio") || contentType.includes("mpeg") || contentType.includes("ogg");
      
      if (res.ok && isAudioStream) {
        console.log(`[check-live-and-notify] Icecast stream LIVE at ${streamUrl} (${contentType})`);
        return { live: true, method: "icecast" };
      }
      
      console.log(`[check-live-and-notify] Icecast ${streamUrl}: ${res.status} (${contentType || "no content-type"})`);
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : String(err);
      console.log(`[check-live-and-notify] Icecast check failed for ${streamUrl}: ${errMsg}`);
    }
  }
  
  return null;
}

// SECONDARY: Scrape the miniplayer page for "Live Now" text
async function checkMiniplayerPage(station: string): Promise<{ live: boolean; method: string }> {
  const url = `https://emasjidlive.co.uk/miniplayer/${encodeURIComponent(station)}`;
  const res = await fetchWithRetry(
    url,
    {
      headers: {
        "Accept": "text/html",
        "User-Agent": "Mozilla/5.0 (compatible; MasjidIrshadNotifier/1.0)",
        "Cache-Control": "no-cache",
      },
    },
    3
  );

  if (!res.ok) {
    throw new Error(`Miniplayer fetch failed: HTTP ${res.status}`);
  }

  const html = await res.text();
  
  // Multiple detection patterns for robustness
  const patterns = [
    /Live\s*Now/i,                    // Standard "Live Now"
    /class="[^"]*live[^"]*"/i,        // CSS class containing "live"
    /data-live="true"/i,              // Data attribute
    /is-live/i,                       // Alternative class pattern
    /streaming\s*now/i,               // Alternative text
  ];
  
  const matchedPattern = patterns.find(p => p.test(html));
  const live = matchedPattern !== undefined;
  
  // Log a snippet for debugging (first 500 chars around key indicators)
  const liveIndex = html.toLowerCase().indexOf("live");
  if (liveIndex >= 0) {
    const snippet = html.substring(Math.max(0, liveIndex - 50), liveIndex + 100);
    console.log(`[check-live-and-notify] Miniplayer HTML snippet: "${snippet.replace(/\s+/g, ' ').trim()}"`);
  }
  
  console.log(`[check-live-and-notify] Miniplayer detected live=${live}, matched=${matchedPattern?.toString() || "none"}`);
  
  return { live, method: "miniplayer" };
}

// Combined live status check using multiple methods (API > Icecast > Miniplayer)
async function fetchLiveStateFromMiniplayer(station: string): Promise<{ live: boolean; checkedAt: string; method: string }> {
  const checkedAt = new Date().toISOString();
  
  // Try eMasjid API first (if one exists, it should be most reliable)
  const apiResult = await checkEmasjidApi(station);
  if (apiResult !== null) {
    // API returned a definitive answer
    return { live: apiResult.live, checkedAt, method: apiResult.method };
  }
  
  // Try Icecast stream (real-time, no caching issues)
  const icecastResult = await checkIcecastStream(station);
  if (icecastResult?.live) {
    return { live: true, checkedAt, method: icecastResult.method };
  }
  
  // Fall back to miniplayer scraper
  try {
    const miniplayerResult = await checkMiniplayerPage(station);
    return { live: miniplayerResult.live, checkedAt, method: miniplayerResult.method };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error(`[check-live-and-notify] Miniplayer scraper failed: ${errMsg}`);
    
    // If all methods failed, assume offline
    return { live: false, checkedAt, method: "fallback-offline" };
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[check-live-and-notify] Checking live status...");

    try {
      // Use the multi-method live status checker
      const liveResult = await fetchLiveStateFromMiniplayer(STATION_ID);
      const isCurrentlyLive = liveResult.live === true;
      const nowMs = Date.now();

      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
      const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabase = createClient(supabaseUrl, supabaseServiceKey);

      // ========== PRAYER TIME LOGGING (every run) ==========
      // Fetch prayer times on EVERY check so we can log them for debugging
      const externalSupabase = createClient(EXTERNAL_PRAYER_DB_URL, EXTERNAL_PRAYER_DB_ANON_KEY);
      const prayerData = await fetchTodaysPrayerTimes(externalSupabase);
      
      // Log current UK time
      const currentUKMins = getCurrentUKMinutes();
      const currentHour = Math.floor(currentUKMins / 60);
      const currentMin = currentUKMins % 60;
      console.log(`[check-live-and-notify] ⏰ Current UK time: ${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')} (${currentUKMins} minutes since midnight)`);
      
      // Log all prayer times for debugging
      if (prayerData) {
        const isFriday = isFridayInUK();
        console.log(`[check-live-and-notify] 📅 Today is ${isFriday ? 'Friday (Jumu\'ah)' : 'a regular day'}`);
        
        // Log each prayer time and its difference from current time
        for (const prayer of DAILY_PRAYERS) {
          const beginTime = prayerData[prayer.beginsField];
          const iqamahTime = prayerData[prayer.iqamahField];
          
          if (beginTime) {
            const beginMins = normalizePMTime(beginTime, prayer.beginsField);
            const beginDiff = beginMins - currentUKMins;
            const beginDiffStr = beginDiff >= 0 ? `+${beginDiff}` : `${beginDiff}`;
            console.log(`[check-live-and-notify] 🕐 ${prayer.name} begins at ${beginTime} (${beginMins} mins, diff: ${beginDiffStr} mins)`);
          }
          
          if (iqamahTime) {
            const iqamahMins = normalizePMTime(iqamahTime, prayer.iqamahField);
            const iqamahDiff = iqamahMins - currentUKMins;
            const iqamahDiffStr = iqamahDiff >= 0 ? `+${iqamahDiff}` : `${iqamahDiff}`;
            console.log(`[check-live-and-notify] 🕐 ${prayer.name} iqamah at ${iqamahTime} (${iqamahMins} mins, diff: ${iqamahDiffStr} mins)`);
          }
        }
        
        // Log Jumu'ah times on Fridays
        if (isFriday) {
          const jummah1 = prayerData["Jummah_1"];
          const jummah2 = prayerData["Jummah_2"];
          if (jummah1) {
            const j1Mins = normalizePMTime(jummah1, "Jummah_1");
            const j1Diff = j1Mins - currentUKMins;
            console.log(`[check-live-and-notify] 🕌 1st Jumu'ah at ${jummah1} (${j1Mins} mins, diff: ${j1Diff >= 0 ? '+' : ''}${j1Diff} mins)`);
          }
          if (jummah2) {
            const j2Mins = normalizePMTime(jummah2, "Jummah_2");
            const j2Diff = j2Mins - currentUKMins;
            console.log(`[check-live-and-notify] 🕌 2nd Jumu'ah at ${jummah2} (${j2Mins} mins, diff: ${j2Diff >= 0 ? '+' : ''}${j2Diff} mins)`);
          }
        }
        
        // Check if we're near any prayer
        const currentPrayerEventCheck = findCurrentPrayer(prayerData);
        if (currentPrayerEventCheck) {
          console.log(`[check-live-and-notify] ✅ NEAR PRAYER: ${currentPrayerEventCheck.prayer.displayName} ${currentPrayerEventCheck.type}`);
        } else {
          console.log(`[check-live-and-notify] ⏳ Not near any prayer (window: ${PRAYER_WINDOW_MINUTES} mins for adhan/iqamah, ${JUMMAH_WINDOW_MINUTES} mins for Jumu'ah)`);
        }
      } else {
        console.log("[check-live-and-notify] ⚠️ Could not fetch prayer times data");
      }
      // ========== END PRAYER TIME LOGGING ==========

      // Load persisted state to prevent notification spam across cold starts.
      const { data: cacheRow, error: cacheErr } = await supabase
        .from("live_status_cache")
        .select("id, last_known_live, last_notified_at")
        .eq("id", STATION_ID)
        .maybeSingle();

      if (cacheErr) {
        console.error("[check-live-and-notify] Failed to read live_status_cache:", cacheErr);
      }

      const lastKnownLive = cacheRow?.last_known_live === true;
      const justWentLive = isCurrentlyLive && !lastKnownLive;
      const lastNotifiedAtMs = cacheRow?.last_notified_at ? Date.parse(cacheRow.last_notified_at) : 0;
      const withinCooldown = lastNotifiedAtMs > 0 && nowMs - lastNotifiedAtMs < NOTIFICATION_COOLDOWN_MS;

      // Enhanced logging with detection method and timing
      console.log(
        `[check-live-and-notify] 📡 Live: ${isCurrentlyLive} (via ${liveResult.method}), lastKnownLive: ${lastKnownLive}, justWentLive: ${justWentLive}, withinCooldown: ${withinCooldown}`
      );

      // Persist current live state every run.
      await supabase
        .from("live_status_cache")
        .upsert({
          id: STATION_ID,
          last_known_live: isCurrentlyLive,
          last_live_at: isCurrentlyLive ? liveResult.checkedAt : undefined,
          updated_at: liveResult.checkedAt,
        });

      // Only notify if stream just went live AND cooldown has passed
      if (!justWentLive) {
        return new Response(
          JSON.stringify({ live: isCurrentlyLive, notified: false, reason: "not-live-transition" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (withinCooldown) {
        return new Response(
          JSON.stringify({ live: isCurrentlyLive, notified: false, reason: "cooldown" }),
          { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("[check-live-and-notify] 🔴 Stream went live! Sending notifications...");

      // Determine notification message based on current prayer time
      const title = "🕌 Masjid Irshad";
      let body = "Masjid Irshad is now live — tap to listen in";
      
      if (prayerData) {
        const currentPrayerEvent = findCurrentPrayer(prayerData);
        if (currentPrayerEvent) {
          const prayerName = currentPrayerEvent.prayer.displayName;

          if (currentPrayerEvent.type === "adhan") {
            // Stream going live around prayer begin time (Adhan)
            body = `${prayerName} prayer has begun — tap to listen to Adhan`;
            console.log(`[check-live-and-notify] 📢 Sending Adhan notification for ${prayerName}`);
          } else {
            // Stream going live around iqamah time
            body = `${prayerName} Iqamah has started — tap to listen in`;
            console.log(`[check-live-and-notify] 📢 Sending Iqamah notification for ${prayerName}`);
          }
        } else {
          console.log(`[check-live-and-notify] 📢 Sending generic notification (no prayer within detection window)`);
        }
      } else {
        console.log("[check-live-and-notify] ⚠️ No prayer data available, using generic message");
      }

        // Call the send-push-notification function
        const notifyResponse = await fetch(`${supabaseUrl}/functions/v1/send-push-notification`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${supabaseAnonKey}`,
          },
          body: JSON.stringify({
            title,
            body,
            tag: "emasjid-live",
            url: "/#masjid-live",
            data: { type: "live-stream" },
          }),
        });

      const notifyResult = await notifyResponse.json();
      console.log("[check-live-and-notify] Notification result:", notifyResult);

      // Persist notification time for cooldown
      await supabase
        .from("live_status_cache")
        .upsert({ id: STATION_ID, last_notified_at: liveResult.checkedAt, updated_at: liveResult.checkedAt });

      return new Response(
        JSON.stringify({
          live: isCurrentlyLive,
          notified: true,
          notificationTitle: title,
          notificationBody: body,
          result: notifyResult,
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } catch (fetchErr) {
      const errorMessage = fetchErr instanceof Error ? fetchErr.message : String(fetchErr);
      console.error("[check-live-and-notify] Live status check failed:", errorMessage);
      return new Response(
        JSON.stringify({ error: "Failed to determine live status", details: errorMessage }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (error) {
    console.error("[check-live-and-notify] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
