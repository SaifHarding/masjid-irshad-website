import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Cooldown between notifications to prevent spam
const NOTIFICATION_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

// External prayer-times database (matches frontend src/hooks/usePrayerTimes.ts)
const EXTERNAL_PRAYER_DB_URL = "https://twlkumpbwplusfqhgchw.supabase.co";
const EXTERNAL_PRAYER_DB_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3bGt1bXBid3BsdXNmcWhnY2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMDk1NzMsImV4cCI6MjA2Nzg4NTU3M30.2iB_wRs8YoWYwqNHveW8wrpBzumOw8IbnIPtnC1WhMc";

const STATION_ID = "masjidirshad";

// Prayer time windows (in minutes)
const PRAYER_WINDOW_MINUTES = 15;
const IQAMAH_WINDOW_MINUTES = 15;
const JUMMAH_WINDOW_MINUTES = 30;

interface PrayerTime {
  name: string;
  displayName: string;
  beginsField: string;
  iqamahField: string;
  phase?: "bayaan" | "prayer";
}

interface PrayerEvent {
  prayer: PrayerTime;
  type: "adhan" | "iqamah";
}

interface PrayerNotificationEvent {
  prayer: PrayerTime;
  type: "adhan" | "iqamah";
  scheduledTime: string;
}

type NotificationType = "begin_times" | "iqamah" | "announcements" | "events" | "general";

interface NotificationPayload {
  title: string;
  body: string;
  tag: string;
  notification_type: NotificationType;
  icon?: string;
  badge?: string;
  url: string;
  data: Record<string, unknown>;
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
  const ukTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/London" }));
  return ukTime.getHours() * 60 + ukTime.getMinutes();
}

function isFridayInUK(): boolean {
  const now = new Date();
  const ukTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/London" }));
  return ukTime.getDay() === 5;
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
    console.log(`[check-live-and-notify] Normalizing ${fieldName} from ${timeStr} (${minutes} mins) to ${normalized} mins`);
    return normalized;
  }

  return minutes;
}

function findCurrentJumuah(prayerData: Record<string, string>): PrayerTime | null {
  const currentMinutes = getCurrentUKMinutes();

  const jummah1 = prayerData["Jummah_1"];
  if (jummah1) {
    const jummah1Minutes = normalizePMTime(jummah1, "Jummah_1");
    const minutesDiff = currentMinutes - jummah1Minutes;

    if (minutesDiff >= -30 && minutesDiff < 0) {
      console.log(`[check-live-and-notify] Near 1st Jumu'ah Bayaan (${Math.abs(minutesDiff)} mins before)`);
      return {
        name: "Jumuah", displayName: "1st Jumu'ah",
        beginsField: "", iqamahField: "Jummah_1", phase: "bayaan"
      };
    } else if (minutesDiff >= 0 && minutesDiff <= 30) {
      console.log(`[check-live-and-notify] Near 1st Jumu'ah prayer (${minutesDiff} mins after start)`);
      return {
        name: "Jumuah", displayName: "1st Jumu'ah",
        beginsField: "", iqamahField: "Jummah_1", phase: "prayer"
      };
    }
  }

  const jummah2 = prayerData["Jummah_2"];
  if (jummah2) {
    const jummah2Minutes = normalizePMTime(jummah2, "Jummah_2");
    const minutesDiff = currentMinutes - jummah2Minutes;

    if (minutesDiff >= -30 && minutesDiff < 0) {
      return {
        name: "Jumuah", displayName: "2nd Jumu'ah",
        beginsField: "", iqamahField: "Jummah_2", phase: "bayaan"
      };
    } else if (minutesDiff >= 0 && minutesDiff <= 30) {
      return {
        name: "Jumuah", displayName: "2nd Jumu'ah",
        beginsField: "", iqamahField: "Jummah_2", phase: "prayer"
      };
    }
  }

  return null;
}

function findCurrentPrayer(
  prayerData: Record<string, string>,
  windows?: { adhanMinutes?: number; iqamahMinutes?: number; jummahMinutes?: number }
): (PrayerEvent & { minutesUntil: number }) | null {
  const currentMinutes = getCurrentUKMinutes();
  console.log(`[check-live-and-notify] Current time: ${Math.floor(currentMinutes / 60)}:${String(currentMinutes % 60).padStart(2, '0')} (${currentMinutes} mins)`);

  const adhanWindow = windows?.adhanMinutes ?? PRAYER_WINDOW_MINUTES;
  const iqamahWindow = windows?.iqamahMinutes ?? IQAMAH_WINDOW_MINUTES;

  if (isFridayInUK()) {
    const jumuah = findCurrentJumuah(prayerData);
    if (jumuah) {
      const jumuahTime = prayerData[jumuah.iqamahField];
      const jumuahMinutes = normalizePMTime(jumuahTime, jumuah.iqamahField);
      const minutesUntil = jumuahMinutes - currentMinutes;
      return { prayer: jumuah, type: "iqamah", minutesUntil };
    }
  }

  let closestEvent: (PrayerEvent & { minutesUntil: number }) | null = null;
  let closestDiff = Infinity;

  for (const prayer of DAILY_PRAYERS) {
    if (isFridayInUK() && prayer.name === "Dhuhr") continue;

    const isMaghrib = prayer.name === "Maghrib";

    // MAGHRIB: skip adhan check since begins = iqamah (single notification)
    if (!isMaghrib) {
      const beginTime = prayerData[prayer.beginsField];
      if (beginTime) {
        const beginMinutes = normalizePMTime(beginTime, prayer.beginsField);
        const minutesUntil = beginMinutes - currentMinutes;
        const beginDiff = Math.abs(minutesUntil);
        console.log(`[check-live-and-notify] ${prayer.name} begins at ${beginTime} (${beginMinutes} mins), diff: ${beginDiff} mins`);

        if (beginDiff <= adhanWindow && beginDiff < closestDiff) {
          closestEvent = { prayer, type: "adhan", minutesUntil };
          closestDiff = beginDiff;
        }
      }
    }

    const iqamahTime = prayerData[prayer.iqamahField];
    if (iqamahTime) {
      const iqamahMinutes = normalizePMTime(iqamahTime, prayer.iqamahField);
      const minutesUntil = iqamahMinutes - currentMinutes;
      const iqamahDiff = Math.abs(minutesUntil);
      console.log(`[check-live-and-notify] ${prayer.name} iqamah at ${iqamahTime} (${iqamahMinutes} mins), diff: ${iqamahDiff} mins`);

      if (iqamahDiff <= iqamahWindow && iqamahDiff < closestDiff) {
        closestEvent = { prayer, type: "iqamah", minutesUntil };
        closestDiff = iqamahDiff;
      }
    }
  }

  if (closestEvent) {
    console.log(`[check-live-and-notify] Selected: ${closestEvent.prayer.displayName} ${closestEvent.type} (${closestDiff} mins away)`);
  } else {
    console.log(`[check-live-and-notify] No prayer event within window`);
  }

  return closestEvent;
}

async function fetchTodaysPrayerTimes(externalSupabase: any): Promise<Record<string, string> | null> {
  try {
    const now = new Date();
    const ukDate = new Date(now.toLocaleString("en-US", { timeZone: "Europe/London" }));
    const day = ukDate.getDate();
    const month = ukDate.getMonth() + 1;
    const year = ukDate.getFullYear();

    console.log(`[check-live-and-notify] 📅 Current UK date: ${day}/${month}/${year}`);

    const dateFormats = [
      `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
      `${day}/${month}`,
      `${day}/${String(month).padStart(2, '0')}`,
      `${String(day).padStart(2, '0')}/${month}`,
      `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}`,
    ];

    for (const dateStr of dateFormats) {
      const { data, error } = await externalSupabase
        .from("MasjidIrshadTimes")
        .select("*")
        .eq("Date", dateStr)
        .maybeSingle();

      if (error) continue;
      if (data) {
        console.log(`[check-live-and-notify] ✓ Found prayer times with format: ${dateStr}`);
        return data;
      }
    }

    console.error("[check-live-and-notify] ❌ No prayer data found for any date format");
    return null;
  } catch (err) {
    console.error("[check-live-and-notify] ❌ Failed to fetch prayer times:", err);
    return null;
  }
}

// ========== TIME FORMATTING ==========

function normalizeTimeString(timeStr: string, fieldName: string): string {
  const parts = timeStr.split(':').map(Number);
  let hour = parts[0];
  const minute = parts[1];

  const fieldsToNormalize = [
    "Dhuhr_Jamaat", "Asr_Begins", "Asr_Jamaat",
    "Maghrib_Begins", "Maghrib_Jamaat",
    "Isha_Begins", "Isha_Jamaat", "Jummah_2"
  ];

  if (fieldsToNormalize.includes(fieldName) && hour >= 1 && hour <= 11) {
    hour = hour + 12;
  }

  return `${hour}:${String(minute).padStart(2, '0')}`;
}

function formatTime12Hour(timeStr: string): string {
  const parts = timeStr.split(':').map(Number);
  let hour = parts[0];
  const minute = parts[1];
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour}:${String(minute).padStart(2, '0')} ${ampm}`;
}

function formatPrayerTimeForDisplay(timeStr: string, fieldName: string): string {
  const normalized = normalizeTimeString(timeStr, fieldName);
  return formatTime12Hour(normalized);
}

// ========== NOTIFICATION BUILDERS ==========

function getPrayerTime(
  prayerData: Record<string, string>,
  event: { prayer: PrayerTime; type: "adhan" | "iqamah" }
): string {
  if (event.type === "adhan") {
    return prayerData[`${event.prayer.name}_Begins`];
  } else {
    if (event.prayer.name === "Jumuah") {
      return prayerData[event.prayer.iqamahField];
    }
    return prayerData[`${event.prayer.name}_Jamaat`];
  }
}

/**
 * Builds notification payload for prayer events.
 * No more "about to start" - only triggered AFTER prayer time.
 * All notifications include "tap to listen in".
 * Maghrib only gets one notification (iqamah) with wording "Iqamah has started".
 */
function buildPrayerNotification(event: PrayerNotificationEvent): NotificationPayload {
  const title = "🕌 Masjid Irshad";
  let body: string;
  let notificationType: NotificationType;

  const fieldName = event.type === "adhan"
    ? event.prayer.beginsField
    : event.prayer.iqamahField;

  const time = formatPrayerTimeForDisplay(event.scheduledTime, fieldName);

  if (event.prayer.name === "Jumuah" && event.prayer.phase === "bayaan") {
    body = `${event.prayer.displayName} Khutbah is starting — tap to listen in`;
    notificationType = "iqamah";
  } else if (event.type === "adhan") {
    body = `${event.prayer.displayName} prayer time has begun — tap to listen to Adhan`;
    notificationType = "begin_times";
  } else {
    if (event.prayer.name === "Jumuah") {
      body = `${event.prayer.displayName} prayer is starting — tap to listen in`;
    } else {
      body = `${event.prayer.displayName} Iqamah has started — tap to listen in`;
    }
    notificationType = "iqamah";
  }

  return {
    title,
    body,
    tag: `prayer-${event.prayer.name}-${event.type}`,
    notification_type: notificationType,
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    url: "/#masjid-live",
    data: {
      type: "prayer-notification",
      prayer: event.prayer.name,
      eventType: event.type,
      time: event.scheduledTime,
      phase: event.prayer.phase,
    },
  };
}

/**
 * Determines if we should send a prayer notification right now.
 * No longer checks live status - always sends when time is reached.
 */
async function shouldSendPrayerNotification(
  currentMinutes: number,
  prayerData: Record<string, string>,
  supabase: any
): Promise<{ event: PrayerNotificationEvent } | null> {

  const prayerEvent = findCurrentPrayer(prayerData);
  if (!prayerEvent) return null;

  const prayerTimeStr = getPrayerTime(prayerData, prayerEvent);
  const prayerMinutes = normalizePMTime(prayerTimeStr,
    prayerEvent.type === "adhan" ? prayerEvent.prayer.beginsField : prayerEvent.prayer.iqamahField
  );
  const minutesSincePrayer = currentMinutes - prayerMinutes;

  console.log(`[prayer-notif] Checking ${prayerEvent.prayer.displayName} ${prayerEvent.type}: prayer at ${prayerTimeStr} (${prayerMinutes} mins), current ${currentMinutes} mins, diff: ${minutesSincePrayer} mins`);

  // Must be AFTER prayer time (>= 0), within 5 minutes
  if (minutesSincePrayer < 0 || minutesSincePrayer > 5) {
    if (minutesSincePrayer < 0) {
      console.log(`[prayer-notif] Prayer hasn't started yet (${Math.abs(minutesSincePrayer)} mins until)`);
    } else {
      console.log(`[prayer-notif] Too late (${minutesSincePrayer} mins after, window is 5 mins)`);
    }
    return null;
  }

  console.log(`[prayer-notif] ✓ Within trigger window (${minutesSincePrayer} mins after prayer time)`);

  // Check if already sent today
  const today = getCurrentUKDate();
  const { data: existingLog } = await supabase
    .from("prayer_notification_log")
    .select("id")
    .eq("date", today)
    .eq("prayer_name", prayerEvent.prayer.name)
    .eq("event_type", prayerEvent.type)
    .maybeSingle();

  if (existingLog) {
    console.log(`[prayer-notif] Already sent today: ${prayerEvent.prayer.displayName} ${prayerEvent.type}`);
    return null;
  }

  console.log(`[prayer-notif] ✅ Ready to send ${prayerEvent.type} notification`);

  return {
    event: {
      prayer: prayerEvent.prayer,
      type: prayerEvent.type,
      scheduledTime: prayerTimeStr,
    },
  };
}

// ========== TARAWEEH NOTIFICATION (RAMADAN ONLY) ==========

const TARAWEEH_DELAY_AFTER_ISHA_MINUTES = 20;

async function isRamadan(): Promise<boolean> {
  try {
    const now = new Date();
    const ukDate = new Date(now.toLocaleString("en-US", { timeZone: "Europe/London" }));
    const day = ukDate.getDate();
    const month = ukDate.getMonth() + 1;
    const year = ukDate.getFullYear();

    const res = await fetch(
      `https://api.aladhan.com/v1/gToH/${day}-${String(month).padStart(2, "0")}-${year}`
    );
    if (!res.ok) {
      console.error(`[taraweeh] Aladhan API error: ${res.status}`);
      return false;
    }
    const json = await res.json();
    const hijriMonth = json?.data?.hijri?.month?.number;
    console.log(`[taraweeh] Hijri month: ${hijriMonth} (Ramadan = 9)`);
    return hijriMonth === 9;
  } catch (err) {
    console.error(`[taraweeh] Failed to check Hijri date:`, err);
    return false;
  }
}

async function checkTaraweehNotification(
  prayerData: Record<string, string>,
  currentMinutes: number,
  supabase: any
): Promise<boolean> {
  const ramadan = await isRamadan();
  if (!ramadan) {
    console.log("[taraweeh] Not Ramadan — skipping Taraweeh check");
    return false;
  }

  const ishaIqamah = prayerData["Isha_Jamaat"];
  if (!ishaIqamah) {
    console.log("[taraweeh] No Isha_Jamaat time found");
    return false;
  }

  const ishaMinutes = normalizePMTime(ishaIqamah, "Isha_Jamaat");
  const taraweehTarget = ishaMinutes + TARAWEEH_DELAY_AFTER_ISHA_MINUTES;
  const diff = currentMinutes - taraweehTarget;

  console.log(`[taraweeh] Isha iqamah at ${ishaIqamah} (${ishaMinutes} mins), Taraweeh target at ${taraweehTarget} mins, current ${currentMinutes} mins, diff ${diff} mins`);

  // Must be 0-5 minutes AFTER target time
  if (diff < 0 || diff > 5) {
    if (diff < 0) {
      console.log(`[taraweeh] Not yet (${Math.abs(diff)} mins until target)`);
    } else {
      console.log(`[taraweeh] Window passed (${diff} mins after target)`);
    }
    return false;
  }

  // Check deduplication — only 1 per night
  const today = getCurrentUKDate();
  const { data: existing } = await supabase
    .from("prayer_notification_log")
    .select("id")
    .eq("date", today)
    .eq("prayer_name", "Taraweeh")
    .eq("event_type", "taraweeh")
    .maybeSingle();

  if (existing) {
    console.log("[taraweeh] Already sent Taraweeh notification tonight");
    return false;
  }

  console.log("[taraweeh] ✅ Ready to send Taraweeh notification");
  return true;
}

function buildTaraweehNotification(): NotificationPayload {
  return {
    title: "🕌 Masjid Irshad",
    body: "Taraweeh has begun — tap to join the live recitation.",
    tag: "prayer-Taraweeh",
    notification_type: "iqamah",
    icon: "/icon-192.png",
    badge: "/badge-72.png",
    url: "/#masjid-live",
    data: {
      type: "prayer-notification",
      prayer: "Taraweeh",
      eventType: "taraweeh",
    },
  };
}

// ========== EVENT NOTIFICATION HELPERS ==========

const EVENTS_API_URL = "https://kqezxvivoddnqmylsuwd.supabase.co/functions/v1/get-public-events";
const EVENT_NOTIFICATION_DELAY_MINUTES = 20;

interface PublicEventData {
  id: string;
  title: string;
  description: string;
  image_url: string;
  event_date: string | null;
  event_end_date: string | null;
  event_time_type: "standard" | "salah";
  event_start_time: string | null;
  item_type: "announcement" | "event";
  display_order: number;
}

const SALAH_FIELD_MAP: Record<string, string> = {
  fajr: "Fajr_Jamaat",
  dhuhr: "Dhuhr_Jamaat",
  asr: "Asr_Jamaat",
  maghrib: "Maghrib_Jamaat",
  isha: "Isha_Jamaat",
  jummah: "Jummah_1",
};

async function fetchPublicEvents(): Promise<PublicEventData[]> {
  try {
    const res = await fetch(EVENTS_API_URL, { headers: { "Accept": "application/json" } });
    if (!res.ok) {
      console.error(`[event-notif] Failed to fetch events: ${res.status}`);
      return [];
    }
    const data = await res.json();
    if (!data.success || !Array.isArray(data.events)) return [];
    return data.events;
  } catch (err) {
    console.error(`[event-notif] Error fetching events:`, err);
    return [];
  }
}

function parseSalahReference(startTime: string): string | null {
  const lower = startTime.toLowerCase();
  for (const key of Object.keys(SALAH_FIELD_MAP)) {
    if (lower.includes(key)) return key;
  }
  return null;
}

function resolveEventNotificationMinutes(
  event: PublicEventData,
  prayerData: Record<string, string> | null
): number | null {
  if (!event.event_start_time) return null;

  let resolvedMinutes: number | null = null;

  if (event.event_time_type === "standard") {
    const parts = event.event_start_time.split(":").map(Number);
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      resolvedMinutes = parts[0] * 60 + parts[1];
    }
  } else if (event.event_time_type === "salah" && prayerData) {
    const salahKey = parseSalahReference(event.event_start_time);
    if (salahKey) {
      const fieldName = SALAH_FIELD_MAP[salahKey];
      const timeStr = prayerData[fieldName];
      if (timeStr) {
        resolvedMinutes = normalizePMTime(timeStr, fieldName);
        console.log(`[event-notif] Resolved "${event.event_start_time}" → ${fieldName} = ${timeStr} → ${resolvedMinutes} mins`);
      }
    }
  }

  if (resolvedMinutes === null) return null;

  const notificationMinutes = resolvedMinutes + EVENT_NOTIFICATION_DELAY_MINUTES;
  console.log(`[event-notif] Event "${event.title}": start=${resolvedMinutes} mins + ${EVENT_NOTIFICATION_DELAY_MINUTES} delay = notify at ${notificationMinutes} mins`);
  return notificationMinutes;
}

function getCurrentUKDate(): string {
  const now = new Date();
  const ukTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/London" }));
  const year = ukTime.getFullYear();
  const month = String(ukTime.getMonth() + 1).padStart(2, "0");
  const day = String(ukTime.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

async function checkEventNotifications(
  prayerData: Record<string, string> | null,
  currentMinutes: number,
  supabase: any
): Promise<PublicEventData | null> {
  const today = getCurrentUKDate();
  const events = await fetchPublicEvents();

  if (events.length === 0) {
    console.log("[event-notif] No public events found");
    return null;
  }

  const todaysEvents = events.filter(e => e.event_date === today);
  console.log(`[event-notif] Found ${todaysEvents.length} events for today (${today})`);

  for (const event of todaysEvents) {
    const notifyAt = resolveEventNotificationMinutes(event, prayerData);
    if (notifyAt === null) {
      console.log(`[event-notif] Could not resolve time for "${event.title}", skipping`);
      continue;
    }

    const diff = currentMinutes - notifyAt;
    console.log(`[event-notif] "${event.title}": notify at ${notifyAt} mins, current ${currentMinutes} mins, diff ${diff} mins`);

    if (diff < 0 || diff > 5) continue;

    const { data: existing } = await supabase
      .from("prayer_notification_log")
      .select("id")
      .eq("date", today)
      .eq("prayer_name", `event-${event.id}`)
      .eq("event_type", "event")
      .maybeSingle();

    if (existing) {
      console.log(`[event-notif] Already notified for "${event.title}" today`);
      continue;
    }

    console.log(`[event-notif] ✅ Ready to notify for "${event.title}"`);
    return event;
  }

  return null;
}

// ========== SEND NOTIFICATION ==========

async function callSendPushNotification(notification: NotificationPayload, supabaseUrl: string, supabaseAnonKey: string): Promise<void> {
  const functionUrl = `${supabaseUrl}/functions/v1/send-push-notification`;

  const response = await fetch(functionUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${supabaseAnonKey}`,
    },
    body: JSON.stringify(notification),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Failed to send notification: ${response.status} ${errorText}`);
  }

  const result = await response.json();
  console.log(`[prayer-notif] Send notification result:`, result);
}

// ========== MAIN HANDLER ==========

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("[check-live-and-notify] Running notification check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch prayer times
    const externalSupabase = createClient(EXTERNAL_PRAYER_DB_URL, EXTERNAL_PRAYER_DB_ANON_KEY);
    const prayerData = await fetchTodaysPrayerTimes(externalSupabase);

    const currentUKMins = getCurrentUKMinutes();
    const currentHour = Math.floor(currentUKMins / 60);
    const currentMin = currentUKMins % 60;
    console.log(`[check-live-and-notify] ⏰ Current UK time: ${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')} (${currentUKMins} minutes since midnight)`);

    // Log prayer times for debugging
    if (prayerData) {
      const isFriday = isFridayInUK();
      console.log(`[check-live-and-notify] 📅 Today is ${isFriday ? 'Friday (Jumu\'ah)' : 'a regular day'}`);

      for (const prayer of DAILY_PRAYERS) {
        const beginTime = prayerData[prayer.beginsField];
        const iqamahTime = prayerData[prayer.iqamahField];

        if (beginTime) {
          const beginMins = normalizePMTime(beginTime, prayer.beginsField);
          const beginDiff = beginMins - currentUKMins;
          console.log(`[check-live-and-notify] 🕐 ${prayer.name} begins at ${beginTime} (${beginMins} mins, diff: ${beginDiff >= 0 ? '+' : ''}${beginDiff})`);
        }
        if (iqamahTime) {
          const iqamahMins = normalizePMTime(iqamahTime, prayer.iqamahField);
          const iqamahDiff = iqamahMins - currentUKMins;
          console.log(`[check-live-and-notify] 🕐 ${prayer.name} iqamah at ${iqamahTime} (${iqamahMins} mins, diff: ${iqamahDiff >= 0 ? '+' : ''}${iqamahDiff})`);
        }
      }

      if (isFriday) {
        const jummah1 = prayerData["Jummah_1"];
        const jummah2 = prayerData["Jummah_2"];
        if (jummah1) {
          const j1Mins = normalizePMTime(jummah1, "Jummah_1");
          console.log(`[check-live-and-notify] 🕌 1st Jumu'ah at ${jummah1} (${j1Mins} mins, diff: ${j1Mins - currentUKMins})`);
        }
        if (jummah2) {
          const j2Mins = normalizePMTime(jummah2, "Jummah_2");
          console.log(`[check-live-and-notify] 🕌 2nd Jumu'ah at ${jummah2} (${j2Mins} mins, diff: ${j2Mins - currentUKMins})`);
        }
      }
    } else {
      console.log("[check-live-and-notify] ⚠️ Could not fetch prayer times data");
    }

    // ========== CHECK FOR PRAYER NOTIFICATION ==========
    let prayerNotificationSent = false;
    if (prayerData) {
      const prayerResult = await shouldSendPrayerNotification(currentUKMins, prayerData, supabase);

      if (prayerResult) {
        const { event: prayerEvent } = prayerResult;
        console.log(`[prayer-notif] 🕌 Sending notification: ${prayerEvent.prayer.displayName} ${prayerEvent.type}`);

        try {
          const notification = buildPrayerNotification(prayerEvent);
          const today = getCurrentUKDate();

          // Maghrib special case: begin time = iqamah time, so send as BOTH
          // begin_times and iqamah types to reach users with either preference
          if (prayerEvent.prayer.name === "Maghrib") {
            console.log(`[prayer-notif] Maghrib: sending as both begin_times and iqamah types`);

            // Send as begin_times
            const beginNotification = {
              ...notification,
              body: `${prayerEvent.prayer.displayName} prayer time has begun — tap to listen to Adhan`,
              tag: `prayer-Maghrib-adhan`,
              notification_type: "begin_times" as NotificationType,
            };
            await callSendPushNotification(beginNotification, supabaseUrl, supabaseAnonKey);

            // Send as iqamah (per-device cooldown prevents duplicates for users with both enabled)
            const iqamahNotification = {
              ...notification,
              notification_type: "iqamah" as NotificationType,
            };
            await callSendPushNotification(iqamahNotification, supabaseUrl, supabaseAnonKey);

            // Log both to prevent re-sending
            await supabase.from("prayer_notification_log").insert([
              { date: today, prayer_name: "Maghrib", event_type: "adhan", scheduled_time: prayerEvent.scheduledTime, stream_was_live: true },
              { date: today, prayer_name: "Maghrib", event_type: "iqamah", scheduled_time: prayerEvent.scheduledTime, stream_was_live: true },
            ]);
          } else {
            await callSendPushNotification(notification, supabaseUrl, supabaseAnonKey);

            await supabase
              .from("prayer_notification_log")
              .insert({
                date: today,
                prayer_name: prayerEvent.prayer.name,
                event_type: prayerEvent.type,
                scheduled_time: prayerEvent.scheduledTime,
                stream_was_live: true,
              });
          }

          prayerNotificationSent = true;
          console.log(`[prayer-notif] ✅ Successfully sent and logged notification`);
        } catch (notifyErr) {
          const errMsg = notifyErr instanceof Error ? notifyErr.message : String(notifyErr);
          console.error(`[prayer-notif] ❌ Failed to send prayer notification: ${errMsg}`);
        }
      }
    }

    // ========== CHECK FOR EVENT NOTIFICATION ==========
    let eventNotificationSent = false;
    {
      const eventToNotify = await checkEventNotifications(prayerData, currentUKMins, supabase);
      if (eventToNotify) {
        const isAnnouncement = eventToNotify.item_type === "announcement";
        const notifType: NotificationType = isAnnouncement ? "announcements" : "events";
        const label = isAnnouncement ? "announcement" : "event";

        // Events get "starting now" wording; announcements get "New announcement"
        const body = isAnnouncement
          ? `📣 New announcement: ${eventToNotify.title} — Tap to view`
          : `Event: ${eventToNotify.title} starting now — Tap to listen in`;

        try {
          const eventNotification: NotificationPayload = {
            title: "🕌 Masjid Irshad",
            body,
            tag: `${label}-${eventToNotify.id}`,
            notification_type: notifType,
            icon: "/icon-192.png",
            badge: "/badge-72.png",
            url: "/#announcements-section",
            data: { type: `${label}-notification`, eventId: eventToNotify.id, eventTitle: eventToNotify.title },
          };

          await callSendPushNotification(eventNotification, supabaseUrl, supabaseAnonKey);

          const today = getCurrentUKDate();
          await supabase
            .from("prayer_notification_log")
            .insert({
              date: today,
              prayer_name: `event-${eventToNotify.id}`,
              event_type: "event",
              scheduled_time: eventToNotify.event_start_time || "unknown",
              stream_was_live: true,
            });

          eventNotificationSent = true;
          console.log(`[event-notif] ✅ Event notification sent and logged`);
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error(`[event-notif] ❌ Failed to send event notification: ${errMsg}`);
        }
      }
    }

    // ========== CHECK FOR TARAWEEH NOTIFICATION (RAMADAN ONLY) ==========
    let taraweehNotificationSent = false;
    if (prayerData) {
      const shouldSendTaraweeh = await checkTaraweehNotification(prayerData, currentUKMins, supabase);
      if (shouldSendTaraweeh) {
        try {
          const notification = buildTaraweehNotification();
          await callSendPushNotification(notification, supabaseUrl, supabaseAnonKey);

          const today = getCurrentUKDate();
          await supabase
            .from("prayer_notification_log")
            .insert({
              date: today,
              prayer_name: "Taraweeh",
              event_type: "taraweeh",
              scheduled_time: prayerData["Isha_Jamaat"],
              stream_was_live: true,
            });

          taraweehNotificationSent = true;
          console.log("[taraweeh] ✅ Taraweeh notification sent and logged");
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err);
          console.error(`[taraweeh] ❌ Failed to send Taraweeh notification: ${errMsg}`);
        }
      }
    }

    return new Response(
      JSON.stringify({
        notified: prayerNotificationSent || eventNotificationSent || taraweehNotificationSent,
        prayerNotificationSent,
        eventNotificationSent,
        taraweehNotificationSent,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[check-live-and-notify] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
