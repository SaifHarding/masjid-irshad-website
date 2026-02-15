-- Track which prayer notifications have been sent today
-- This table prevents duplicate notifications and provides monitoring capabilities
CREATE TABLE IF NOT EXISTS public.prayer_notification_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE NOT NULL,                    -- UK date (YYYY-MM-DD)
  prayer_name TEXT NOT NULL,             -- "Fajr", "Dhuhr", "Asr", "Maghrib", "Isha", "Jumuah"
  event_type TEXT NOT NULL,              -- "adhan" or "iqamah"
  scheduled_time TIME NOT NULL,          -- HH:MM:SS
  stream_was_live BOOLEAN NOT NULL DEFAULT true,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  -- Prevent duplicate notifications: one per prayer event per day
  CONSTRAINT unique_prayer_notification_per_day
    UNIQUE(date, prayer_name, event_type)
);

-- Index for efficient lookups
CREATE INDEX idx_prayer_log_date_sent
  ON public.prayer_notification_log(date, sent_at DESC);

-- Cleanup function: delete records older than 7 days
CREATE OR REPLACE FUNCTION cleanup_old_prayer_logs()
RETURNS void
LANGUAGE plpgsql
AS $$
BEGIN
  DELETE FROM public.prayer_notification_log
  WHERE date < CURRENT_DATE - INTERVAL '7 days';
END;
$$;

-- Enable Row Level Security (RLS)
ALTER TABLE public.prayer_notification_log ENABLE ROW LEVEL SECURITY;

-- Policy: Allow service role to manage all records
CREATE POLICY "Service role can manage prayer notification logs"
  ON public.prayer_notification_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
