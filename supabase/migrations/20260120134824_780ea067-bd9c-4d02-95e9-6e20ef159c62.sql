-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create table for storing push subscriptions
CREATE TABLE public.push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS (public subscriptions - no auth required for push notifications)
ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert subscriptions (needed for anonymous push subscribers)
CREATE POLICY "Anyone can create push subscriptions"
ON public.push_subscriptions
FOR INSERT
WITH CHECK (true);

-- Allow anyone to delete their own subscription by endpoint
CREATE POLICY "Anyone can delete push subscriptions by endpoint"
ON public.push_subscriptions
FOR DELETE
USING (true);

-- Allow service role to read all subscriptions for sending notifications
CREATE POLICY "Service role can read all subscriptions"
ON public.push_subscriptions
FOR SELECT
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_push_subscriptions_updated_at
BEFORE UPDATE ON public.push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();