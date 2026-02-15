DROP POLICY IF EXISTS "Allow public insert" ON public.live_status_cache;
DROP POLICY IF EXISTS "Allow public update" ON public.live_status_cache;
-- Keeping SELECT open is unnecessary because the app reads via backend function; remove it to avoid permissive warnings.
DROP POLICY IF EXISTS "Allow public read" ON public.live_status_cache;

DROP POLICY IF EXISTS "Anyone can create push subscriptions" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Anyone can delete push subscriptions by endpoint" ON public.push_subscriptions;
DROP POLICY IF EXISTS "Service role can read all subscriptions" ON public.push_subscriptions;