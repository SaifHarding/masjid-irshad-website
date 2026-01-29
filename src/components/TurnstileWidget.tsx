import { Turnstile } from "@marsidev/react-turnstile";
import { useEffect, useState } from "react";
import { getBackendClient } from "@/lib/backendClient";

interface TurnstileWidgetProps {
  onVerify: (token: string) => void;
  onError?: () => void;
}

export const TurnstileWidget = ({ onVerify, onError }: TurnstileWidgetProps) => {
  const supabase = getBackendClient();
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSiteKey = async () => {
      try {
        const { data, error } = await supabase.functions.invoke('get-turnstile-site-key');
        if (error) throw error;
        setSiteKey(data?.siteKey || null);
      } catch (err) {
        console.error('Failed to fetch Turnstile site key:', err);
        onError?.();
      } finally {
        setLoading(false);
      }
    };
    fetchSiteKey();
  }, [onError]);

  if (loading) {
    return <div className="h-[65px] w-[300px] bg-muted animate-pulse rounded" />;
  }

  if (!siteKey) {
    return <div className="text-sm text-muted-foreground">CAPTCHA unavailable</div>;
  }

  return (
    <Turnstile
      siteKey={siteKey}
      onSuccess={onVerify}
      onError={onError}
      options={{
        theme: 'light',
        size: 'normal',
      }}
    />
  );
};
