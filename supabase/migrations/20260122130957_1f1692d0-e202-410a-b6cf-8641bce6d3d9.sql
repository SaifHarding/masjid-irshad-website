-- Add explicit deny-all policies to satisfy linter while keeping tables inaccessible to anon/auth users.
CREATE POLICY "Deny all select" ON public.live_status_cache
FOR SELECT USING (false);
CREATE POLICY "Deny all insert" ON public.live_status_cache
FOR INSERT WITH CHECK (false);
CREATE POLICY "Deny all update" ON public.live_status_cache
FOR UPDATE USING (false);
CREATE POLICY "Deny all delete" ON public.live_status_cache
FOR DELETE USING (false);

CREATE POLICY "Deny all select" ON public.push_subscriptions
FOR SELECT USING (false);
CREATE POLICY "Deny all insert" ON public.push_subscriptions
FOR INSERT WITH CHECK (false);
CREATE POLICY "Deny all update" ON public.push_subscriptions
FOR UPDATE USING (false);
CREATE POLICY "Deny all delete" ON public.push_subscriptions
FOR DELETE USING (false);