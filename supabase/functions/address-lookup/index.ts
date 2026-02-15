import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { query, addressId } = await req.json();

    const apiKey = Deno.env.get('GETADDRESS_API_KEY');
    if (!apiKey) {
      console.error("GETADDRESS_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Address lookup service not configured" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If addressId is provided, get full address details
    if (addressId) {
      console.log(`Getting full address for ID: ${addressId}`);
      
      const response = await fetch(
        `https://api.getaddress.io/get/${encodeURIComponent(addressId)}?api-key=${apiKey}`,
        { method: 'GET' }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`getaddress.io get error: ${response.status} - ${errorText}`);
        return new Response(
          JSON.stringify({ error: "Failed to get address details" }),
          { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const data = await response.json();
      console.log(`Got address details:`, JSON.stringify(data));

      return new Response(
        JSON.stringify({
          address: {
            line_1: data.line_1 || '',
            line_2: data.line_2 || '',
            line_3: data.line_3 || '',
            line_4: data.line_4 || '',
            town_or_city: data.town_or_city || '',
            county: data.county || '',
            postcode: data.postcode || '',
          }
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Otherwise, do autocomplete search
    if (!query || query.length < 3) {
      return new Response(
        JSON.stringify({ suggestions: [] }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Autocomplete search for: ${query}`);

    const response = await fetch(
      `https://api.getaddress.io/autocomplete/${encodeURIComponent(query)}?api-key=${apiKey}`,
      { method: 'GET' }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`getaddress.io autocomplete error: ${response.status} - ${errorText}`);
      
      if (response.status === 404) {
        return new Response(
          JSON.stringify({ suggestions: [] }),
          { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      return new Response(
        JSON.stringify({ error: "Failed to search addresses" }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    console.log(`Found ${data.suggestions?.length || 0} suggestions`);

    return new Response(
      JSON.stringify({ 
        suggestions: data.suggestions || []
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error("Error in address-lookup function:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
