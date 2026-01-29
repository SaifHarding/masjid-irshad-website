import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Base64url encoding helpers
function base64urlEncode(data: Uint8Array): string {
  const base64 = btoa(String.fromCharCode(...data));
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  const binaryStr = atob(base64);
  const bytes = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes;
}

// Generate VAPID JWT for authorization
async function generateVapidJwt(
  audience: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<string> {
  const header = { typ: "JWT", alg: "ES256" };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: "mailto:info@masjidirshad.co.uk",
  };

  const headerB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(header)));
  const payloadB64 = base64urlEncode(new TextEncoder().encode(JSON.stringify(payload)));
  const unsignedToken = `${headerB64}.${payloadB64}`;

  // Decode keys
  const privateKeyBytes = base64urlDecode(vapidPrivateKey);
  const publicKeyBytes = base64urlDecode(vapidPublicKey);

  // Extract x, y coordinates from uncompressed public key (65 bytes: 0x04 + x + y)
  const x = publicKeyBytes.slice(1, 33);
  const y = publicKeyBytes.slice(33, 65);

  // Create JWK for the EC key pair
  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: base64urlEncode(x),
    y: base64urlEncode(y),
    d: base64urlEncode(privateKeyBytes),
  };

  const cryptoKey = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signatureBuffer = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    cryptoKey,
    new TextEncoder().encode(unsignedToken)
  );

  const signature = new Uint8Array(signatureBuffer);
  const signatureB64 = base64urlEncode(signature);

  return `${unsignedToken}.${signatureB64}`;
}

// Encrypt payload using aes128gcm (RFC 8291)
async function encryptPayload(
  payload: string,
  p256dh: string,
  auth: string
): Promise<{ encrypted: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  // Generate ephemeral ECDH key pair
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  // Export local public key
  const localPublicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const localPublicKey = new Uint8Array(localPublicKeyRaw);

  // Import subscriber's public key
  const subscriberKeyBytes = base64urlDecode(p256dh);
  const subscriberKey = await crypto.subtle.importKey(
    "raw",
    subscriberKeyBytes.buffer as ArrayBuffer,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret
  const sharedSecretBuffer = await crypto.subtle.deriveBits(
    { name: "ECDH", public: subscriberKey },
    keyPair.privateKey,
    256
  );
  const sharedSecret = new Uint8Array(sharedSecretBuffer);

  // Get auth secret
  const authSecret = base64urlDecode(auth);

  // Generate salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF to derive IKM
  const authInfo = new TextEncoder().encode("WebPush: info\0");
  const authInfoFull = new Uint8Array(authInfo.length + subscriberKeyBytes.length + localPublicKey.length);
  authInfoFull.set(authInfo, 0);
  authInfoFull.set(subscriberKeyBytes, authInfo.length);
  authInfoFull.set(localPublicKey, authInfo.length + subscriberKeyBytes.length);

  // Import shared secret for HKDF
  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  // Derive PRK using auth secret as salt
  const prkBuffer = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: authSecret.buffer as ArrayBuffer, info: authInfoFull.buffer as ArrayBuffer },
    hkdfKey,
    256
  );

  // Import PRK for deriving CEK and nonce
  const prkKey = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(prkBuffer),
    { name: "HKDF" },
    false,
    ["deriveBits"]
  );

  // Derive content encryption key
  const cekInfo = new TextEncoder().encode("Content-Encoding: aes128gcm\0");
  const cekBuffer = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: salt.buffer as ArrayBuffer, info: cekInfo.buffer as ArrayBuffer },
    prkKey,
    128
  );

  // Derive nonce
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");
  const nonceBuffer = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: salt.buffer as ArrayBuffer, info: nonceInfo.buffer as ArrayBuffer },
    prkKey,
    96
  );

  // Import CEK for AES-GCM
  const cek = await crypto.subtle.importKey(
    "raw",
    new Uint8Array(cekBuffer),
    { name: "AES-GCM" },
    false,
    ["encrypt"]
  );

  // Pad plaintext with delimiter
  const plaintext = new TextEncoder().encode(payload);
  const paddedPlaintext = new Uint8Array(plaintext.length + 1);
  paddedPlaintext.set(plaintext, 0);
  paddedPlaintext[plaintext.length] = 0x02; // Delimiter

  // Encrypt
  const encryptedBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: new Uint8Array(nonceBuffer) },
    cek,
    paddedPlaintext
  );

  return {
    encrypted: new Uint8Array(encryptedBuffer),
    salt,
    localPublicKey,
  };
}

// Build aes128gcm body
function buildAes128gcmBody(
  encrypted: Uint8Array,
  salt: Uint8Array,
  localPublicKey: Uint8Array
): Uint8Array {
  const recordSize = 4096;
  const header = new Uint8Array(86);
  
  // Salt (16 bytes)
  header.set(salt, 0);
  
  // Record size (4 bytes, big-endian)
  const view = new DataView(header.buffer);
  view.setUint32(16, recordSize, false);
  
  // Key ID length (1 byte)
  header[20] = localPublicKey.length;
  
  // Key ID (public key)
  header.set(localPublicKey, 21);
  
  // Combine header and encrypted content
  const body = new Uint8Array(header.length + encrypted.length);
  body.set(header, 0);
  body.set(encrypted, header.length);
  
  return body;
}

async function sendPushNotification(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ success: boolean; endpoint: string; error?: string; expired?: boolean }> {
  try {
    const endpointUrl = new URL(subscription.endpoint);
    const audience = `${endpointUrl.protocol}//${endpointUrl.host}`;

    // Generate VAPID JWT
    const jwt = await generateVapidJwt(audience, vapidPublicKey, vapidPrivateKey);

    // Encrypt the payload
    const { encrypted, salt, localPublicKey } = await encryptPayload(
      payload,
      subscription.p256dh,
      subscription.auth
    );

    // Build the body
    const body = buildAes128gcmBody(encrypted, salt, localPublicKey);

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Authorization": `vapid t=${jwt}, k=${vapidPublicKey}`,
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "Content-Length": body.length.toString(),
        "TTL": "86400",
        "Urgency": "high",
      },
      body: body.buffer as ArrayBuffer,
    });

    if (response.status === 201 || response.status === 200) {
      console.log(`[send-push] Success for ${subscription.endpoint.slice(0, 50)}`);
      return { success: true, endpoint: subscription.endpoint };
    }

    if (response.status === 404 || response.status === 410) {
      console.log(`[send-push] Subscription expired: ${subscription.endpoint.slice(0, 50)}`);
      return { success: false, endpoint: subscription.endpoint, expired: true };
    }

    const errorText = await response.text();
    console.error(`[send-push] Failed (${response.status}): ${errorText}`);
    return { success: false, endpoint: subscription.endpoint, error: errorText };
  } catch (error) {
    console.error(`[send-push] Error:`, error);
    return { success: false, endpoint: subscription.endpoint, error: String(error) };
  }
}

// Per-device throttle: skip subscriptions notified within this window
const PER_DEVICE_COOLDOWN_MS = 5 * 60 * 1000; // 5 minutes

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { title, body, tag, data, url } = await req.json();

    console.log(`[send-push] Sending notification: ${title}`);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY")!;
    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;

    if (!vapidPublicKey || !vapidPrivateKey) {
      console.error("[send-push] VAPID keys not configured");
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: subscriptions, error: fetchError } = await supabase
      .from("push_subscriptions")
      .select("*");

    if (fetchError) {
      console.error("[send-push] Failed to fetch subscriptions:", fetchError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      console.log("[send-push] No subscriptions found");
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscriptions" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter out subscriptions that were notified recently (per-device throttle)
    const nowMs = Date.now();
    const eligibleSubscriptions = subscriptions.filter((sub) => {
      if (!sub.last_notified_at) return true;
      const lastNotifiedMs = Date.parse(sub.last_notified_at);
      const elapsed = nowMs - lastNotifiedMs;
      if (elapsed < PER_DEVICE_COOLDOWN_MS) {
        console.log(`[send-push] Skipping ${sub.endpoint.slice(0, 40)}... (notified ${Math.floor(elapsed / 1000)}s ago)`);
        return false;
      }
      return true;
    });

    const skippedCount = subscriptions.length - eligibleSubscriptions.length;
    console.log(`[send-push] Eligible: ${eligibleSubscriptions.length}, Skipped (throttled): ${skippedCount}`);

    if (eligibleSubscriptions.length === 0) {
      console.log("[send-push] All subscriptions throttled");
      return new Response(
        JSON.stringify({ success: true, sent: 0, skipped: skippedCount, message: "All subscriptions throttled" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const payload = JSON.stringify({
      title: title || "Masjid Irshad",
      body: body || "New notification",
      icon: "/masjid-irshad-logo.png",
      badge: "/masjid-irshad-logo.png",
      tag: tag || "masjid-notification",
      requireInteraction: true,
      data: { url: url || "/", ...data },
    });

    const results = await Promise.all(
      eligibleSubscriptions.map((sub) =>
        sendPushNotification(
          { endpoint: sub.endpoint, p256dh: sub.p256dh, auth: sub.auth },
          payload,
          vapidPublicKey,
          vapidPrivateKey
        )
      )
    );

    // Track which subscriptions were successfully notified
    const successfulEndpoints = results
      .filter((r) => r.success)
      .map((r) => r.endpoint);

    const expiredEndpoints = results
      .filter((r) => !r.success && r.expired)
      .map((r) => r.endpoint);

    // Update last_notified_at for successfully sent subscriptions
    if (successfulEndpoints.length > 0) {
      const nowIso = new Date().toISOString();
      await supabase
        .from("push_subscriptions")
        .update({ last_notified_at: nowIso, updated_at: nowIso })
        .in("endpoint", successfulEndpoints);
      console.log(`[send-push] Updated last_notified_at for ${successfulEndpoints.length} subscriptions`);
    }

    if (expiredEndpoints.length > 0) {
      console.log(`[send-push] Cleaning up ${expiredEndpoints.length} expired subscriptions`);
      await supabase
        .from("push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(`[send-push] Sent ${successCount}/${eligibleSubscriptions.length} notifications`);

    return new Response(
      JSON.stringify({
        success: true,
        sent: successCount,
        total: subscriptions.length,
        eligible: eligibleSubscriptions.length,
        skipped: skippedCount,
        expired: expiredEndpoints.length,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("[send-push] Error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
