import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { subscription, action } = await req.json();
    
    console.log(`[push-subscribe] Action: ${action}`, subscription?.endpoint?.slice(0, 50));

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

      // Upsert subscription (update if exists, insert if not)
      const { error } = await supabase
        .from("push_subscriptions")
        .upsert(
          {
            endpoint: subscription.endpoint,
            p256dh: subscription.keys.p256dh,
            auth: subscription.keys.auth,
            user_agent: req.headers.get("user-agent") || null,
          },
          { onConflict: "endpoint" }
        );

      if (error) {
        console.error("[push-subscribe] Database error:", error);
        return new Response(
          JSON.stringify({ error: "Failed to save subscription" }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      console.log("[push-subscribe] Subscription saved successfully");
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
