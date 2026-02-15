import { useState, useRef, useEffect } from "react";
import { CalendarPlus } from "lucide-react";
import googleCalendarLogo from "@/assets/google-calendar-logo.png";
import outlookLogo from "@/assets/outlook-logo.png";
import { createClient } from "@supabase/supabase-js";
import { format, parseISO } from "date-fns";
import type { PublicEvent } from "@/hooks/usePublicEvents";

const prayerSupabaseUrl = import.meta.env.VITE_PRAYER_SUPABASE_URL || "https://twlkumpbwplusfqhgchw.supabase.co";
const prayerSupabaseKey = import.meta.env.VITE_PRAYER_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InR3bGt1bXBid3BsdXNmcWhnY2h3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMDk1NzMsImV4cCI6MjA2Nzg4NTU3M30.2iB_wRs8YoWYwqNHveW8wrpBzumOw8IbnIPtnC1WhMc";
const masjidSupabase = createClient(prayerSupabaseUrl, prayerSupabaseKey);

const SALAH_FIELD_MAP: Record<string, string> = {
  fajr: "Fajr_Jamaat",
  dhuhr: "Dhuhr_Jamaat",
  asr: "Asr_Jamaat",
  maghrib: "Maghrib_Jamaat",
  isha: "Isha_Jamaat",
  jummah: "Jummah_1",
};

const normalizePMTime = (time: string): string => {
  const parts = time.split(":");
  const hour = parseInt(parts[0]);
  if (hour >= 1 && hour <= 11) {
    return `${String(hour + 12).padStart(2, "0")}:${parts[1]}:${parts[2] || "00"}`;
  }
  return time;
};

const parseSalahReference = (startTime: string): string | null => {
  const lower = startTime.toLowerCase();
  for (const key of Object.keys(SALAH_FIELD_MAP)) {
    if (lower.includes(key)) return key;
  }
  return null;
};

const resolveSalahTime = async (eventDate: string, salahKey: string): Promise<string | null> => {
  try {
    const field = SALAH_FIELD_MAP[salahKey];
    if (!field) return null;

    const { data, error } = await masjidSupabase
      .from("MasjidIrshadTimes")
      .select(field)
      .eq("Date", eventDate)
      .maybeSingle();

    if (error || !data) return null;

    const rawTime = (data as unknown as Record<string, string>)[field];
    if (!rawTime) return null;

    // Normalize PM times (DB stores afternoon times as AM values)
    const normalized = normalizePMTime(rawTime);
    // Return HH:MM
    return normalized.substring(0, 5);
  } catch {
    return null;
  }
};

const resolveEventTime = async (
  event: PublicEvent
): Promise<{ startHour: number; startMinute: number } | null> => {
  if (!event.event_date) return null;

  if (event.event_time_type === "standard" && event.event_start_time) {
    const parts = event.event_start_time.split(":").map(Number);
    if (parts.length >= 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
      return { startHour: parts[0], startMinute: parts[1] };
    }
    return null;
  }

  if (event.event_time_type === "salah" && event.event_start_time) {
    const salahKey = parseSalahReference(event.event_start_time);
    if (!salahKey) return null;

    const time = await resolveSalahTime(event.event_date, salahKey);
    if (!time) return null;

    const [h, m] = time.split(":").map(Number);
    return { startHour: h, startMinute: m };
  }

  return null;
};

const formatDateTimeForGoogle = (dateStr: string, hour: number, minute: number): string => {
  // Format: YYYYMMDDTHHmmss
  const d = parseISO(dateStr);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  const hh = String(hour).padStart(2, "0");
  const mm = String(minute).padStart(2, "0");
  return `${y}${mo}${da}T${hh}${mm}00`;
};

const buildGoogleCalendarUrl = (
  title: string,
  description: string,
  dateStr: string,
  endDateStr: string | null,
  hour: number,
  minute: number
): string => {
  const start = formatDateTimeForGoogle(dateStr, hour, minute);
  // Default 1 hour event
  const endH = hour + 1;
  const end = formatDateTimeForGoogle(endDateStr || dateStr, endH > 23 ? 23 : endH, minute);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: title,
    dates: `${start}/${end}`,
    details: description || "",
    location: "Masjid Irshad, Luton, UK",
    ctz: "Europe/London",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
};

const buildOutlookUrl = (
  title: string,
  description: string,
  dateStr: string,
  endDateStr: string | null,
  hour: number,
  minute: number
): string => {
  const [y, mo, da] = dateStr.split("-").map(Number);
  const startDt = new Date(y, mo - 1, da, hour, minute);
  const [ey, emo, eda] = (endDateStr || dateStr).split("-").map(Number);
  const endH = hour + 1;
  const endDt = new Date(ey, emo - 1, eda, endH > 23 ? 23 : endH, minute);

  const fmt = (dt: Date) => {
    const yr = dt.getFullYear();
    const mn = String(dt.getMonth() + 1).padStart(2, "0");
    const dy = String(dt.getDate()).padStart(2, "0");
    const hh = String(dt.getHours()).padStart(2, "0");
    const mm = String(dt.getMinutes()).padStart(2, "0");
    return `${yr}-${mn}-${dy}T${hh}:${mm}:00`;
  };

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: title,
    body: description || "",
    startdt: fmt(startDt),
    enddt: fmt(endDt),
    location: "Masjid Irshad, Luton, UK",
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
};
const buildIcsContent = (
  title: string,
  description: string,
  dateStr: string,
  endDateStr: string | null,
  hour: number,
  minute: number
): string => {
  const start = formatDateTimeForGoogle(dateStr, hour, minute);
  const endH = hour + 1;
  const end = formatDateTimeForGoogle(endDateStr || dateStr, endH > 23 ? 23 : endH, minute);
  const now = new Date();
  const stamp = format(now, "yyyyMMdd'T'HHmmss");

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Masjid Irshad//Events//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `DTSTART;TZID=Europe/London:${start}`,
    `DTEND;TZID=Europe/London:${end}`,
    `DTSTAMP:${stamp}Z`,
    `UID:${Date.now()}@masjidirshad.co.uk`,
    `SUMMARY:${title}`,
    `DESCRIPTION:${(description || "").replace(/\n/g, "\\n")}`,
    "LOCATION:Masjid Irshad\\, Luton\\, UK",
    "BEGIN:VALARM",
    "TRIGGER:-PT1H",
    "ACTION:DISPLAY",
    "DESCRIPTION:Event in 1 hour",
    "END:VALARM",
    "BEGIN:VALARM",
    "TRIGGER:PT0M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Event starting now",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
};

const downloadIcs = (filename: string, content: string) => {
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

interface AddToCalendarButtonProps {
  event: PublicEvent;
}

const AddToCalendarButton = ({ event }: AddToCalendarButtonProps) => {
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close menu when clicking outside
  useEffect(() => {
    if (!open) return;
    const handleClickOutside = (e: MouseEvent | TouchEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("touchstart", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("touchstart", handleClickOutside);
    };
  }, [open]);

  if (!event.event_date) return null;

  const isMobile = /Android|iPhone|iPad|iPod|Opera Mini|IEMobile|WPDesktop/i.test(navigator.userAgent);

  const handleCalendar = async (type: "google" | "apple" | "outlook") => {
    setLoading(true);
    setOpen(false);
    try {
      const resolved = await resolveEventTime(event);
      const hour = resolved?.startHour ?? 12;
      const minute = resolved?.startMinute ?? 0;

      const title = `Masjid Event: ${event.title}`;
      const desc = event.description || "";

      // On mobile, always use ICS for reliable calendar integration
      if (isMobile) {
        const ics = buildIcsContent(title, desc, event.event_date!, event.event_end_date, hour, minute);
        const filename = `${title.replace(/[^a-zA-Z0-9]/g, "-")}.ics`;
        downloadIcs(filename, ics);
      } else if (type === "google") {
        const url = buildGoogleCalendarUrl(title, desc, event.event_date!, event.event_end_date, hour, minute);
        window.open(url, "_blank", "noopener");
      } else if (type === "outlook") {
        const url = buildOutlookUrl(title, desc, event.event_date!, event.event_end_date, hour, minute);
        window.open(url, "_blank", "noopener");
      } else {
        const ics = buildIcsContent(title, desc, event.event_date!, event.event_end_date, hour, minute);
        const filename = `${title.replace(/[^a-zA-Z0-9]/g, "-")}.ics`;
        downloadIcs(filename, ics);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative inline-block" ref={menuRef}>
      {isMobile ? (
        /* Mobile: single button that downloads ICS directly */
        <button
          type="button"
          disabled={loading}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            if (!loading) handleCalendar("apple");
          }}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground min-h-[44px] px-2.5 rounded-md hover:bg-accent transition-colors disabled:opacity-50"
          aria-label="Add to calendar"
        >
          {loading ? (
            <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
              <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
            </svg>
          ) : (
            <CalendarPlus className="h-3.5 w-3.5" />
          )}
          {loading ? "Adding…" : "Add to Calendar"}
        </button>
      ) : (
        /* Desktop: dropdown with platform choices */
        <>
          <button
            type="button"
            disabled={loading}
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              if (!loading) setOpen((prev) => !prev);
            }}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground min-h-[44px] px-2.5 rounded-md hover:bg-accent transition-colors disabled:opacity-50"
            aria-label="Add to calendar"
          >
            {loading ? (
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" strokeLinecap="round" />
              </svg>
            ) : (
              <CalendarPlus className="h-3.5 w-3.5" />
            )}
            {loading ? "Opening…" : "Add to Calendar"}
          </button>

          {open && (
            <div className="absolute left-0 bottom-full mb-1 z-50 min-w-[190px] rounded-md border bg-popover p-1 text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95">
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleCalendar("google"); }}
                className="flex w-full items-center gap-2.5 rounded-sm px-3 min-h-[48px] text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors active:bg-accent/80"
              >
                <img src={googleCalendarLogo} alt="Google Calendar" className="h-5 w-5 object-contain shrink-0" />
                <span>Google Calendar</span>
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleCalendar("apple"); }}
                className="flex w-full items-center gap-2.5 rounded-sm px-3 min-h-[48px] text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors active:bg-accent/80"
              >
                <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
                </svg>
                <span>Apple Calendar</span>
              </button>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleCalendar("outlook"); }}
                className="flex w-full items-center gap-2.5 rounded-sm px-3 min-h-[48px] text-sm cursor-pointer hover:bg-accent hover:text-accent-foreground transition-colors active:bg-accent/80"
              >
                <img src={outlookLogo} alt="Outlook" className="h-5 w-5 object-contain shrink-0" />
                <span>Outlook</span>
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AddToCalendarButton;
