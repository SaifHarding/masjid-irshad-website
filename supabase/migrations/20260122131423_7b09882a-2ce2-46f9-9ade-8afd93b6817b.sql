-- Add per-device notification tracking
ALTER TABLE public.push_subscriptions
  ADD COLUMN IF NOT EXISTS last_notified_at timestamptz NULL;