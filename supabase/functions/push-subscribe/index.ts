import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface NotificationPrefs {
  notify_begin_times?: boolean;
  notify_iqamah?: boolean;
  notify_announcements?: boolean;
  notify_events?: boolean;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subscription, action, preferences } = await req.json();
    
    console.log(`[push-subscribe] Action: ${action}`, subscription?.endpoint?.slice(0, 50));
    if (preferences) {
      console.log(`[push-subscribe] Preferences:`, preferences);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (action === "subscribe") {
      if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        return new Response(
          JSON.stringify({ error: "Invalid subscription object" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Build upsert object with preferences (defaults to true if not provided)
      const prefs: NotificationPrefs = preferences || {};
      const upsertData = {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        user_agent: req.headers.get("user-agent") || null,
        notify_begin_times: prefs.notify_begin_times ?? true,
        notify_iqamah: prefs.notify_iqamah ?? true,
        notify_announcements: prefs.notify_announcements ?? true,
        notify_events: prefs.notify_events ?? true,
      };

      // Upsert subscription (update if exists, insert if not)
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert(upsertData, { onConflict: "endpoint" });

      if (error) {
        console.error("[push-subscribe] Database error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to save subscription" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("[push-subscribe] Subscription saved successfully with preferences");
      return new Response(
        JSON.stringify({ success: true, message: "Subscribed to push notifications" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "unsubscribe") {
      if (!subscription?.endpoint) {
        return new Response(
          JSON.stringify({ error: "Endpoint required for unsubscribe" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("push_subscriptions")
        .delete()
        .eq("endpoint", subscription.endpoint);

      if (error) {
        console.error("[push-subscribe] Delete error:", error);
      }

      console.log("[push-subscribe] Subscription removed");
      return new Response(
        JSON.stringify({ success: true, message: "Unsubscribed from push notifications" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Invalid action" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[push-subscribe] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
