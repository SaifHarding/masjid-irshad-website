import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Cache-Control': 'public, max-age=30',
};

serve(async (req: Request) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  let station = url.searchParams.get('station');

  // Also support reading from body (for supabase.functions.invoke calls)
  if (!station && req.method === 'POST') {
    try {
      const body = await req.json();
      station = body.station;
    } catch {
      // Ignore JSON parse errors
    }
  }

  station = station || 'masjidirshad';
  const checkedAt = new Date().toISOString();

  console.log(`Checking live status for station: ${station}`);

  // Create Supabase client
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // Get last live timestamp from database
  let lastLiveAt: string | null = null;
  try {
    const { data: cacheData } = await supabase
      .from('live_status_cache')
      .select('last_live_at')
      .eq('id', station)
      .single();
    
    if (cacheData?.last_live_at) {
      lastLiveAt = cacheData.last_live_at;
    }
  } catch (err) {
    console.error('Error fetching cache:', err);
  }

  try {
    const miniplayerUrl = `https://emasjidlive.co.uk/miniplayer/${station}`;
    console.log(`Fetching: ${miniplayerUrl}`);
    
    const response = await fetch(miniplayerUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; MasjidIrshadBot/1.0)',
      },
    });

    if (!response.ok) {
      console.error(`Failed to fetch miniplayer: ${response.status} ${response.statusText}`);
      return new Response(
        JSON.stringify({
          station,
          live: false,
          checkedAt,
          lastLiveAt,
          error: 'Failed to fetch status',
        }),
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    const html = await response.text();
    const isLive = html.includes('Live Now');
    
    // Update last live timestamp in database if currently live
    if (isLive) {
      lastLiveAt = checkedAt;
      try {
        await supabase
          .from('live_status_cache')
          .upsert({ id: station, last_live_at: checkedAt, updated_at: checkedAt });
      } catch (err) {
        console.error('Error updating cache:', err);
      }
    }
    
    console.log(`Station ${station} live: ${isLive}, lastLiveAt: ${lastLiveAt}`);

    return new Response(
      JSON.stringify({
        station,
        live: isLive,
        checkedAt,
        lastLiveAt,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : "Unknown error";
    console.error(`Error checking live status: ${errorMessage}`);
    
    return new Response(
      JSON.stringify({
        station,
        live: false,
        checkedAt,
        lastLiveAt,
        error: errorMessage,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
        },
      }
    );
  }
});
