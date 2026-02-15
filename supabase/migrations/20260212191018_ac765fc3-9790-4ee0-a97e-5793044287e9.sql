
CREATE TABLE public.prayer_notification_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date TEXT NOT NULL,
  prayer_name TEXT NOT NULL,
  event_type TEXT NOT NULL,
  scheduled_time TEXT,
  stream_was_live BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Index for the deduplication query
CREATE UNIQUE INDEX idx_prayer_notif_dedup ON public.prayer_notification_log (date, prayer_name, event_type);

-- Enable RLS (service role key is used, but good practice)
ALTER TABLE public.prayer_notification_log ENABLE ROW LEVEL SECURITY;

-- No public policies needed - only accessed by edge functions via service role key
