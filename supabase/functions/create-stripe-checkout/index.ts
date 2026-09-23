import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@22.4.0";

const stripeKey = Deno.env.get("STRIPE_RESTRICTED_KEY") ?? Deno.env.get("STRIPE_SECRET_KEY") ?? "";
const stripe = new Stripe(stripeKey, {
  apiVersion: "2026-07-29.dahlia",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const appUrl = (Deno.env.get("PUBLIC_APP_URL") ?? "").replace(/\/$/, "");

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

function integrationIdentifier(requestId: string): string {
  const suffix = requestId.replace(/-/g, "").slice(0, 8)
    .split("")
    .map((value) => String.fromCharCode(97 + Number.parseInt(value, 16)))
    .join("");
  return `buildnerve_checkout_${suffix}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("origin") ?? "";
    if (!appUrl || origin !== new URL(appUrl).origin) {
      return new Response("Forbidden", { status: 403 });
    }
    return new Response("ok", { headers: corsHeaders(req) });
  }
  if (req.method !== "POST") return json(req, { error: "Method not allowed" }, 405);
  if (!stripeKey || !supabaseUrl || !supabaseServiceKey || !appUrl) {
    console.error("create-stripe-checkout: missing server configuration");
    return json(req, { error: "Billing is not configured" }, 503);
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
    const planKey = typeof body.plan_key === "string" ? body.plan_key : "";
    const billingInterval = body.billing_interval;
    const requestId = typeof body.request_id === "string" ? body.request_id : "";

    if (!organisationId || !planKey || !["monthly", "annual"].includes(billingInterval)) {
      return json(req, { error: "Invalid checkout request" }, 400);
    }
    if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(requestId)) {
      return json(req, { error: "Invalid request ID" }, 400);
    }

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

    const { data: activeSubscription } = await supabase
      .from("organisation_subscriptions")
      .select("id")
      .eq("organisation_id", organisationId)
      .in("status", ["trialing", "active", "past_due", "unpaid", "paused"])
      .maybeSingle();
    if (activeSubscription) {
      return json(req, { error: "This organisation already has a subscription" }, 409);
    }

    const { data: plan, error: planError } = await supabase
      .from("billing_plans")
      .select("id, plan_key, trial_days, require_payment_method_for_trial")
      .eq("plan_key", planKey)
      .eq("is_active", true)
      .eq("is_public", true)
      .maybeSingle();
    if (planError || !plan) return json(req, { error: "Plan not found or not active" }, 404);

    const { data: planPrice } = await supabase
      .from("billing_plan_prices")
      .select("stripe_price_id, stripe_product_id, currency")
      .eq("plan_id", plan.id)
      .eq("billing_interval", billingInterval)
      .eq("is_active", true)
      .maybeSingle();
    if (!planPrice) return json(req, { error: "Plan price is not configured" }, 503);

    const stripePrice = await stripe.prices.retrieve(planPrice.stripe_price_id);
    const expectedStripeInterval = billingInterval === "annual" ? "year" : "month";
    const stripeProductId = typeof stripePrice.product === "string" ? stripePrice.product : stripePrice.product.id;
    if (
      !stripePrice.active ||
      stripePrice.type !== "recurring" ||
      stripePrice.recurring?.interval !== expectedStripeInterval ||
      stripePrice.currency !== planPrice.currency ||
      (planPrice.stripe_product_id && stripeProductId !== planPrice.stripe_product_id)
    ) {
      console.error("create-stripe-checkout: Stripe catalogue mismatch");
      return json(req, { error: "Plan price is not configured correctly" }, 503);
    }

    const { data: existingCustomer } = await supabase
      .from("organisation_billing_customers")
      .select("stripe_customer_id")
      .eq("organisation_id", organisationId)
      .maybeSingle();

    let stripeCustomerId = existingCustomer?.stripe_customer_id;
    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { organisation_id: organisationId },
      });
      stripeCustomerId = customer.id;
      const { error: customerError } = await supabase
        .from("organisation_billing_customers")
        .insert({
          organisation_id: organisationId,
          stripe_customer_id: stripeCustomerId,
          stripe_customer_email: user.email,
        });
      if (customerError) throw customerError;
    }

    const successUrl = `${appUrl}/app/settings/billing/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancelUrl = `${appUrl}/app/settings/billing/cancelled`;
    const idempotencyKey = `checkout_${requestId}`;

    const { data: existingAttempt } = await supabase
      .from("billing_checkout_attempts")
      .select("id, organisation_id, plan_id, billing_interval, stripe_checkout_session_id")
      .eq("idempotency_key", idempotencyKey)
      .maybeSingle();

    if (
      existingAttempt &&
      (
        existingAttempt.organisation_id !== organisationId ||
        existingAttempt.plan_id !== plan.id ||
        existingAttempt.billing_interval !== billingInterval
      )
    ) {
      return json(req, { error: "Request ID has already been used" }, 409);
    }

    let attemptId = existingAttempt?.id;
    if (!attemptId) {
      const { data: attempt, error: attemptError } = await supabase
        .from("billing_checkout_attempts")
        .insert({
          organisation_id: organisationId,
          user_id: user.id,
          plan_id: plan.id,
          billing_interval: billingInterval,
          stripe_price_id: planPrice.stripe_price_id,
          idempotency_key: idempotencyKey,
          success_url: successUrl,
          cancel_url: cancelUrl,
          status: "created",
        })
        .select("id")
        .single();
      if (attemptError || !attempt) throw attemptError ?? new Error("Unable to create checkout attempt");
      attemptId = attempt.id;
    }

    const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
      metadata: {
        organisation_id: organisationId,
        plan_key: planKey,
        checkout_attempt_id: attemptId,
      },
    };
    if (plan.trial_days && plan.trial_days > 0) {
      subscriptionData.trial_period_days = plan.trial_days;
    }

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      line_items: [{ price: planPrice.stripe_price_id, quantity: 1 }],
      success_url: successUrl,
      cancel_url: cancelUrl,
      subscription_data: subscriptionData,
      metadata: {
        organisation_id: organisationId,
        plan_key: planKey,
        checkout_attempt_id: attemptId,
      },
      integration_identifier: integrationIdentifier(requestId),
      allow_promotion_codes: true,
      billing_address_collection: "required",
      tax_id_collection: { enabled: true },
    }, { idempotencyKey });

    const { error: updateError } = await supabase
      .from("billing_checkout_attempts")
      .update({ stripe_checkout_session_id: session.id, status: "redirected" })
      .eq("id", attemptId);
    if (updateError) throw updateError;

    return json(req, { url: session.url, sessionId: session.id });
  } catch (err) {
    console.error("create-stripe-checkout failed:", err instanceof Error ? err.message : "unknown");
    return json(req, { error: "Checkout failed" }, 500);
  }
});
