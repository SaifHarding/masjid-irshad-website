-- Create table to store live status history
CREATE TABLE public.live_status_cache (
  id TEXT PRIMARY KEY DEFAULT 'masjidirshad',
  last_live_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Insert initial row
INSERT INTO public.live_status_cache (id, last_live_at) 
VALUES ('masjidirshad', now() - interval '2 hours')
ON CONFLICT (id) DO NOTHING;

-- No RLS needed - this is backend-only cache data
ALTER TABLE public.live_status_cache ENABLE ROW LEVEL SECURITY;

-- Allow public read access (edge function uses anon key)
CREATE POLICY "Allow public read" ON public.live_status_cache FOR SELECT USING (true);

-- Allow public update (edge function updates when live)
CREATE POLICY "Allow public update" ON public.live_status_cache FOR UPDATE USING (true);

-- Allow public insert for initial seeding
CREATE POLICY "Allow public insert" ON public.live_status_cache FOR INSERT WITH CHECK (true);