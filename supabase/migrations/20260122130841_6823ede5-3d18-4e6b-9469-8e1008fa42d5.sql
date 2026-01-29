ALTER TABLE public.live_status_cache
  ADD COLUMN IF NOT EXISTS last_known_live boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS last_notified_at timestamptz NULL;

CREATE INDEX IF NOT EXISTS idx_live_status_cache_last_notified_at
  ON public.live_status_cache (last_notified_at);