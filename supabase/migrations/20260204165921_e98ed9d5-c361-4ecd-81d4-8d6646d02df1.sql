-- Add notification preference columns to push_subscriptions table
-- All default to true (opted-in by default)
ALTER TABLE public.push_subscriptions
ADD COLUMN IF NOT EXISTS notify_begin_times boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_iqamah boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_announcements boolean NOT NULL DEFAULT true,
ADD COLUMN IF NOT EXISTS notify_events boolean NOT NULL DEFAULT true;