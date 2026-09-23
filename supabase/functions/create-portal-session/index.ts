import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@22.4.0";

const stripeKey = Deno.env.get("STRIPE_RESTRICTED_KEY") ?? Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const portalConfigurationId = Deno.env.get("STRIPE_PORTAL_CONFIGURATION_ID") ?? "";
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const appUrl = (Deno.env.get("PUBLIC_APP_URL") ?? "").replace(/\/$/, "");

const stripe = new Stripe(stripeKey, {
  apiVersion: "2026-07-29.dahlia",
  httpClient: Stripe.createFetchHttpClient(),
});

function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("origin") ?? "";
  const allowedOrigin = appUrl ? new URL(appUrl).origin : "";
  return {
    "Access-Control-Allow-Origin": origin === allowedOrigin ? origin : allowedOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("origin") ?? "";
    if (!appUrl || origin !== new URL(appUrl).origin) return new Response("Forbidden", { status: 403 });
    return new Response("ok", { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);
  if (!stripeKey || !supabaseUrl || !supabaseServiceKey || !appUrl) {
    console.error("create-portal-session: missing server configuration");
    return json(req, { error: "Billing portal is not configured" }, 503);
  }

  try {
    const origin = req.headers.get("origin") ?? "";
    if (origin && origin !== new URL(appUrl).origin) {
      return json(req, { error: "Origin not allowed" }, 403);
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });
    const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json(req, { error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const organisationId = typeof body.organisation_id === "string" ? body.organisation_id : "";
    if (!organisationId) return json(req, { error: "Invalid portal request" }, 400);

    const { data: membership } = await supabase
      .from("organisation_members")
      .select("role")
      .eq("organisation_id", organisationId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    if (!membership) return json(req, { error: "Forbidden" }, 403);
    if (!["owner", "admin"].includes(membership.role)) {
      return json(req, { error: "Only organisation owners or admins can manage billing" }, 403);
    }

    const { data: billingCustomer } = await supabase
      .from("organisation_billing_customers")
      .select("stripe_customer_id")
      .eq("organisation_id", organisationId)
      .maybeSingle();
    if (!billingCustomer?.stripe_customer_id) {
      return json(req, { error: "No billing customer found for this organisation" }, 404);
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: billingCustomer.stripe_customer_id,
      return_url: `${appUrl}/app/settings/billing`,
      ...(portalConfigurationId ? { configuration: portalConfigurationId } : {}),
    });

    return json(req, { url: portalSession.url });
  } catch (err) {
    console.error("create-portal-session failed:", err instanceof Error ? err.message : "unknown");
    return json(req, { error: "Portal session failed" }, 500);
  }
});
