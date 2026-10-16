import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const successBody = JSON.stringify({
  ok: true,
  message: "If the request is valid, a secure sign-in link will be sent shortly.",
});

function json(body: string, status: number, origin: string | null, siteUrl: string) {
  const allowedOrigin = origin && origin === new URL(siteUrl).origin ? origin : "null";
  return new Response(body, {
    status,
    headers: {
      ...corsHeaders,
      "Access-Control-Allow-Origin": allowedOrigin,
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    },
  });
}

async function sha256(value: string) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

serve(async (req) => {
  const siteUrl = Deno.env.get("DEMO_SITE_URL") ?? "";
  const origin = req.headers.get("origin");
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        ...corsHeaders,
        "Access-Control-Allow-Origin": origin && siteUrl && origin === new URL(siteUrl).origin ? origin : "null",
      },
    });
  }

  if (req.method !== "POST") return json(JSON.stringify({ error: "Method not allowed" }), 405, origin, siteUrl);

  const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
  const rateLimitSecret = Deno.env.get("DEMO_RATE_LIMIT_SECRET") ?? "";
  if (!siteUrl || !supabaseUrl || !anonKey || !serviceRoleKey || !rateLimitSecret) {
    console.error("request-demo: required server configuration is missing");
    return json(JSON.stringify({ error: "Demo requests are temporarily unavailable." }), 503, origin, siteUrl || "https://buildnerve.co.uk");
  }

  if (origin && origin !== new URL(siteUrl).origin) {
    return json(JSON.stringify({ error: "Origin not allowed" }), 403, origin, siteUrl);
  }

  let body: Record<string, unknown>;
  try {
    const raw = await req.text();
    if (raw.length > 4000) return json(JSON.stringify({ error: "Invalid request" }), 400, origin, siteUrl);
    body = JSON.parse(raw);
  } catch {
    return json(JSON.stringify({ error: "Invalid request" }), 400, origin, siteUrl);
  }

  // The honeypot intentionally receives the same success response without sending anything.
  if (typeof body.website_alt === "string" && body.website_alt.trim()) {
    return json(successBody, 202, origin, siteUrl);
  }

  const name = typeof body.name === "string" ? body.name.trim().replace(/\s+/g, " ") : "";
  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  const company = typeof body.company === "string" ? body.company.trim().replace(/\s+/g, " ") : "";
  if (!name || name.length > 120 || !company || company.length > 120 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return json(JSON.stringify({ error: "Enter your name, work email, and company." }), 400, origin, siteUrl);
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
  const emailHash = await sha256(`${rateLimitSecret}:${email}`);
  const { data: allowed, error: rateError } = await admin.rpc("consume_demo_request_rate_limit", {
    p_email_hash: emailHash,
    p_max_requests: 5,
  });
  if (rateError) {
    console.error("request-demo: rate-limit check failed", rateError.message);
    return json(JSON.stringify({ error: "Demo requests are temporarily unavailable." }), 503, origin, siteUrl);
  }
  if (!allowed) return json(successBody, 202, origin, siteUrl);

  const clientIp = req.headers.get("cf-connecting-ip") || req.headers.get("x-real-ip");
  if (clientIp) {
    const ipHash = await sha256(`${rateLimitSecret}:ip:${clientIp}`);
    const { data: ipAllowed, error: ipRateError } = await admin.rpc("consume_demo_request_rate_limit", {
      p_email_hash: ipHash,
      p_max_requests: 20,
    });
    if (ipRateError) {
      console.error("request-demo: IP rate-limit check failed", ipRateError.message);
      return json(JSON.stringify({ error: "Demo requests are temporarily unavailable." }), 503, origin, siteUrl);
    }
    if (!ipAllowed) return json(successBody, 202, origin, siteUrl);
  }

  const { data: existingRequest, error: lookupError } = await admin
    .from("demo_access_requests")
    .select("id, status, demo_organisation_id")
    .eq("normalized_email", email)
    .maybeSingle();
  if (lookupError) {
    console.error("request-demo: existing request lookup failed", lookupError.message);
    return json(JSON.stringify({ error: "Demo requests are temporarily unavailable." }), 503, origin, siteUrl);
  }

  const requestDetails = {
    normalized_email: email,
    full_name: name,
    company_name: company,
    link_requested_at: new Date().toISOString(),
    link_expires_at: new Date(Date.now() + 60 * 60 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
  };
  const saveResult = existingRequest
    ? await admin.from("demo_access_requests").update({
      ...requestDetails,
      ...(existingRequest.status === "activated" && existingRequest.demo_organisation_id
        ? {}
        : { status: "pending", activated_at: null }),
    }).eq("id", existingRequest.id)
    : await admin.from("demo_access_requests").insert({
      ...requestDetails,
      status: "pending",
    });
  const saveError = saveResult.error;
  if (saveError) {
    console.error("request-demo: request storage failed", saveError.message);
    return json(JSON.stringify({ error: "Demo requests are temporarily unavailable." }), 503, origin, siteUrl);
  }

  const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { error: linkError } = await authClient.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${new URL(siteUrl).origin}/demo/activate`,
      shouldCreateUser: true,
      data: { full_name: name },
    },
  });
  if (linkError) {
    console.error("request-demo: sign-in link delivery failed", linkError.message);
    return json(JSON.stringify({ error: "Demo requests are temporarily unavailable." }), 503, origin, siteUrl);
  }

  return json(successBody, 202, origin, siteUrl);
});
