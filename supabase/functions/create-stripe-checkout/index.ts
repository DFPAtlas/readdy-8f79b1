
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("VITE_PUBLIC_SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) throw new Error("No auth token");

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) throw new Error("Invalid auth");

    const body = await req.json();
    const { plan_key, billing_interval, success_path, cancel_path } = body;

    if (!plan_key || !billing_interval) throw new Error("Missing plan_key or billing_interval");
    if (billing_interval !== "monthly" && billing_interval !== "annual") throw new Error("Invalid billing_interval");

    // Get user's active org membership
    const { data: membership } = await supabase
      .from("organisation_members")
      .select("organisation_id, role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!membership) throw new Error("No active organisation membership");
    const orgId = membership.organisation_id;

    // Only owners or billing users can start checkout
    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new Error("Only organisation owners or admins can manage billing");
    }

    // Resolve the plan server-side
    const { data: plan } = await supabase
      .from("billing_plans")
      .select("id, plan_key, display_name")
      .eq("plan_key", plan_key)
      .eq("is_active", true)
      .maybeSingle();

    if (!plan) throw new Error("Plan not found or not active");

    // Resolve the Stripe Price ID server-side
    const { data: planPrice } = await supabase
      .from("billing_plan_prices")
      .select("stripe_price_id")
      .eq("plan_id", plan.id)
      .eq("billing_interval", billing_interval)
      .eq("is_active", true)
      .maybeSingle();

    if (!planPrice) throw new Error("No Stripe price mapped for this plan and interval");

    // Get or create Stripe Customer
    const { data: existingCustomer } = await supabase
      .from("organisation_billing_customers")
      .select("stripe_customer_id")
      .eq("organisation_id", orgId)
      .maybeSingle();

    let stripeCustomerId = existingCustomer?.stripe_customer_id;

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { organisation_id: orgId },
      });
      stripeCustomerId = customer.id;

      await supabase.from("organisation_billing_customers").insert({
        organisation_id: orgId,
        stripe_customer_id: stripeCustomerId,
        stripe_customer_email: user.email,
      });
    }

    // Build allowlisted URLs
    const basePath = req.headers.get("origin") || "";
    const successUrl = `${basePath}/app/settings/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${basePath}/app/settings/billing/cancelled`;

    // Create idempotency key
    const idempotencyKey = `checkout_${orgId}_${plan_key}_${billing_interval}_${Date.now()}`;

    // Record attempt
    const { data: attempt } = await supabase
      .from("billing_checkout_attempts")
      .insert({
        organisation_id: orgId,
        user_id: user.id,
        plan_id: plan.id,
        billing_interval,
        stripe_price_id: planPrice.stripe_price_id,
        idempotency_key: idempotencyKey,
        success_url: successUrl,
        cancel_url: cancelUrl,
        status: "created",
      })
      .select("id")
      .single();

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [{ price: planPrice.stripe_price_id, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: {
        metadata: {
          organisation_id: orgId,
          plan_key: plan_key,
          checkout_attempt_id: attempt?.id || "",
        },
      },
      metadata: {
        organisation_id: orgId,
        plan_key: plan_key,
        checkout_attempt_id: attempt?.id || "",
      },
      allow_promotion_codes: true,
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
    }, { idempotencyKey });

    // Update the attempt with session ID
    if (attempt) {
      await supabase
        .from("billing_checkout_attempts")
        .update({ stripe_checkout_session_id: session.id, status: "redirected" })
        .eq("id", attempt.id);
    }

    return new Response(
      JSON.stringify({ url: session.url, sessionId: session.id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Checkout error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Checkout failed" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
