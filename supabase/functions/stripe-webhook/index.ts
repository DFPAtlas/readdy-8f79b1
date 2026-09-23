import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient, type SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "npm:stripe@22.4.0";

type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "unpaid"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "paused";

type AccessState =
  | "full"
  | "grace_period"
  | "read_only"
  | "billing_locked"
  | "suspended_by_platform";

type JsonObject = Record<string, any>;

function getRequiredEnv(name: string): string {
  const value = Deno.env.get(name) ?? "";
  if (!value) throw new Error("Missing server configuration: " + name);
  return value;
}

function mapStripeStatus(status: string): SubscriptionStatus {
  const allowed: SubscriptionStatus[] = [
    "trialing",
    "active",
    "past_due",
    "unpaid",
    "canceled",
    "incomplete",
    "incomplete_expired",
    "paused",
  ];
  return allowed.includes(status as SubscriptionStatus)
    ? status as SubscriptionStatus
    : "incomplete";
}

function deriveAccessState(status: SubscriptionStatus): AccessState {
  if (status === "active" || status === "trialing") return "full";
  if (status === "past_due") return "grace_period";
  if (status === "canceled") return "read_only";
  return "billing_locked";
}

function objectId(value: unknown): string | null {
  if (typeof value === "string") return value;
  if (value && typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" ? id : null;
  }
  return null;
}

function toIso(value: unknown): string | null {
  return typeof value === "number" ? new Date(value * 1000).toISOString() : null;
}

function subscriptionPeriod(subscription: JsonObject): {
  start: string | null;
  end: string | null;
} {
  const item = subscription.items?.data?.[0];
  return {
    start: toIso(item?.current_period_start ?? subscription.current_period_start),
    end: toIso(item?.current_period_end ?? subscription.current_period_end),
  };
}

function invoiceSubscriptionId(invoice: JsonObject): string | null {
  return objectId(invoice.parent?.subscription_details?.subscription)
    ?? objectId(invoice.subscription);
}

function invoiceTaxAmount(invoice: JsonObject): number {
  if (Array.isArray(invoice.total_taxes)) {
    return invoice.total_taxes.reduce(
      (sum: number, tax: JsonObject) => sum + (Number(tax.amount) || 0),
      0,
    );
  }
  return Number(invoice.tax) || 0;
}

function assertNoError(error: unknown, context: string): void {
  if (error) {
    const message = error instanceof Error
      ? error.message
      : String((error as { message?: unknown })?.message ?? error);
    throw new Error(context + ": " + message);
  }
}

async function claimEvent(
  supabase: SupabaseClient,
  event: Stripe.Event,
): Promise<"new" | "retry" | "duplicate"> {
  const dataObject = event.data.object as JsonObject;
  const { error: insertError } = await supabase
    .from("billing_webhook_events")
    .insert({
      stripe_event_id: event.id,
      event_type: event.type,
      processing_status: "processing",
      stripe_object_id: objectId(dataObject),
      stripe_customer_id: objectId(dataObject.customer),
      stripe_subscription_id: objectId(dataObject.subscription)
        ?? objectId(dataObject.parent?.subscription_details?.subscription),
      attempt_count: 1,
    });

  if (!insertError) return "new";
  if (insertError.code !== "23505") {
    throw new Error("Unable to claim webhook event: " + insertError.message);
  }

  const { data: existing, error: readError } = await supabase
    .from("billing_webhook_events")
    .select("id, processing_status, attempt_count")
    .eq("stripe_event_id", event.id)
    .single();
  assertNoError(readError, "Unable to read duplicate webhook event");

  if (existing.processing_status === "processed") return "duplicate";

  const { error: retryError } = await supabase
    .from("billing_webhook_events")
    .update({
      processing_status: "processing",
      attempt_count: Number(existing.attempt_count || 0) + 1,
      last_error: null,
      processed_at: null,
    })
    .eq("id", existing.id);
  assertNoError(retryError, "Unable to claim webhook retry");
  return "retry";
}

async function markEvent(
  supabase: SupabaseClient,
  eventId: string,
  status: "processed" | "failed",
  errorMessage: string | null = null,
): Promise<void> {
  const { error } = await supabase
    .from("billing_webhook_events")
    .update({
      processing_status: status,
      last_error: errorMessage,
      processed_at: status === "processed" ? new Date().toISOString() : null,
    })
    .eq("stripe_event_id", eventId);
  assertNoError(error, "Unable to update webhook event");
}

async function organisationForCustomer(
  supabase: SupabaseClient,
  customerId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("organisation_billing_customers")
    .select("organisation_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();
  assertNoError(error, "Unable to resolve billing customer");
  return data?.organisation_id ?? null;
}

async function resolvePlan(
  supabase: SupabaseClient,
  priceId: string | null,
): Promise<{ id: string; plan_key: string } | null> {
  if (!priceId) return null;
  const { data, error } = await supabase
    .from("billing_plan_prices")
    .select("plan_id, plan:billing_plans(id, plan_key)")
    .eq("stripe_price_id", priceId)
    .eq("is_active", true)
    .maybeSingle();
  assertNoError(error, "Unable to resolve subscription plan");
  const plan = Array.isArray(data?.plan) ? data.plan[0] : data?.plan;
  return plan?.id && plan?.plan_key ? plan : null;
}

async function provisionEntitlements(
  supabase: SupabaseClient,
  organisationId: string,
  planId: string,
  eventId: string,
): Promise<void> {
  const { data: entitlements, error: entitlementError } = await supabase
    .from("billing_plan_entitlements")
    .select("feature_id, is_enabled, limit_value, limit_unit")
    .eq("plan_id", planId);
  assertNoError(entitlementError, "Unable to load plan entitlements");
  if (!entitlements?.length) return;

  const now = new Date().toISOString();
  const rows = entitlements.map((entitlement) => ({
    organisation_id: organisationId,
    feature_id: entitlement.feature_id,
    plan_id: planId,
    is_enabled: entitlement.is_enabled,
    limit_value: entitlement.limit_value,
    limit_unit: entitlement.limit_unit,
    source: "plan",
    provider_event_id: eventId,
    effective_at: now,
    expires_at: null,
    updated_at: now,
  }));
  const { error } = await supabase
    .from("organisation_entitlements")
    .upsert(rows, { onConflict: "organisation_id,feature_id" });
  assertNoError(error, "Unable to provision plan entitlements");
}

async function syncSubscription(
  supabase: SupabaseClient,
  subscription: Stripe.Subscription,
  eventId: string,
): Promise<void> {
  const raw = subscription as unknown as JsonObject;
  const customerId = objectId(raw.customer);
  if (!customerId) throw new Error("Subscription is missing a customer");

  const organisationId = typeof raw.metadata?.organisation_id === "string"
    ? raw.metadata.organisation_id
    : await organisationForCustomer(supabase, customerId);
  if (!organisationId) throw new Error("Subscription customer is not mapped to an organisation");

  const item = raw.items?.data?.[0] ?? {};
  const priceId = objectId(item.price);
  const plan = await resolvePlan(supabase, priceId);
  if (!plan) throw new Error("Subscription price is not mapped to an active BuildNerve plan");

  const status = mapStripeStatus(raw.status);
  const desiredAccessState = deriveAccessState(status);
  const interval = item.price?.recurring?.interval === "year" ? "annual" : "monthly";
  const period = subscriptionPeriod(raw);

  const { data: existing, error: existingError } = await supabase
    .from("organisation_subscriptions")
    .select("id, status, access_state")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();
  assertNoError(existingError, "Unable to read subscription state");

  const accessState = existing?.access_state === "suspended_by_platform"
    ? "suspended_by_platform"
    : desiredAccessState;
  const now = new Date().toISOString();
  const data = {
    organisation_id: organisationId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    plan_id: plan.id,
    billing_interval: interval,
    status,
    access_state: accessState,
    trial_start: toIso(raw.trial_start),
    trial_end: toIso(raw.trial_end),
    current_period_start: period.start,
    current_period_end: period.end,
    cancel_at_period_end: Boolean(raw.cancel_at_period_end),
    canceled_at: toIso(raw.canceled_at),
    ended_at: toIso(raw.ended_at),
    pause_collection: raw.pause_collection ?? null,
    latest_invoice_id: objectId(raw.latest_invoice),
    grace_period_ends_at: status === "past_due"
      ? new Date(Date.now() + 14 * 86400000).toISOString()
      : null,
    updated_at: now,
  };

  if (existing) {
    const { error } = await supabase
      .from("organisation_subscriptions")
      .update(data)
      .eq("id", existing.id);
    assertNoError(error, "Unable to update subscription");
  } else {
    const { error } = await supabase
      .from("organisation_subscriptions")
      .insert(data);
    assertNoError(error, "Unable to insert subscription");
  }

  await provisionEntitlements(supabase, organisationId, plan.id, eventId);

  if (!existing || existing.status !== status || existing.access_state !== accessState) {
    const { error } = await supabase
      .from("billing_status_history")
      .insert({
        organisation_id: organisationId,
        subscription_id: existing?.id ?? null,
        previous_status: existing?.status ?? null,
        new_status: status,
        previous_access_state: existing?.access_state ?? null,
        new_access_state: accessState,
        provider_event_id: eventId,
        reason: existing ? "subscription_updated" : "subscription_created",
      });
    assertNoError(error, "Unable to record subscription status");
  }
}

async function handleCheckoutCompleted(
  stripe: Stripe,
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
  eventId: string,
): Promise<void> {
  const attemptId = session.metadata?.checkout_attempt_id;
  if (attemptId) {
    const { error } = await supabase
      .from("billing_checkout_attempts")
      .update({ status: "completed", completed_at: new Date().toISOString() })
      .eq("id", attemptId);
    assertNoError(error, "Unable to complete checkout attempt");
  }

  const subscriptionId = objectId(session.subscription);
  if (!subscriptionId) throw new Error("Completed subscription checkout has no subscription");
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  await syncSubscription(supabase, subscription, eventId);

  const raw = subscription as unknown as JsonObject;
  if (typeof raw.trial_start === "number" && typeof raw.trial_end === "number") {
    const organisationId = typeof raw.metadata?.organisation_id === "string"
      ? raw.metadata.organisation_id
      : null;
    const priceId = objectId(raw.items?.data?.[0]?.price);
    const plan = await resolvePlan(supabase, priceId);
    if (organisationId && plan) {
      const { error } = await supabase.from("billing_trial_history").insert({
        organisation_id: organisationId,
        plan_id: plan.id,
        trial_start: toIso(raw.trial_start),
        trial_end: toIso(raw.trial_end),
        payment_method_required: true,
        converted: false,
        reminder_status: "none",
      });
      assertNoError(error, "Unable to record trial");
    }
  }
}

async function handleCheckoutExpired(
  supabase: SupabaseClient,
  session: Stripe.Checkout.Session,
): Promise<void> {
  const attemptId = session.metadata?.checkout_attempt_id;
  if (!attemptId) return;
  const { error } = await supabase
    .from("billing_checkout_attempts")
    .update({ status: "expired" })
    .eq("id", attemptId);
  assertNoError(error, "Unable to expire checkout attempt");
}

async function mirrorInvoice(
  stripe: Stripe,
  supabase: SupabaseClient,
  invoice: Stripe.Invoice,
  failed: boolean,
  eventId: string,
): Promise<void> {
  const raw = invoice as unknown as JsonObject;
  const customerId = objectId(raw.customer);
  if (!customerId) throw new Error("Invoice is missing a customer");

  const organisationId = await organisationForCustomer(supabase, customerId);
  if (!organisationId) throw new Error("Invoice customer is not mapped to an organisation");

  const subscriptionId = invoiceSubscriptionId(raw);
  const { error } = await supabase.from("billing_invoices").upsert({
    organisation_id: organisationId,
    stripe_invoice_id: invoice.id,
    stripe_subscription_id: subscriptionId,
    stripe_customer_id: customerId,
    invoice_number: raw.number ?? null,
    status: failed ? "payment_failed" : (raw.status ?? "paid"),
    currency: raw.currency ?? "gbp",
    subtotal_amount: Number(raw.subtotal) || 0,
    tax_amount: invoiceTaxAmount(raw),
    total_amount: Number(raw.total) || 0,
    invoice_period_start: toIso(raw.period_start),
    invoice_period_end: toIso(raw.period_end),
    hosted_invoice_url: raw.hosted_invoice_url ?? null,
    invoice_pdf_url: raw.invoice_pdf ?? null,
    paid_at: !failed && raw.status === "paid" ? new Date().toISOString() : null,
  }, { onConflict: "stripe_invoice_id" });
  assertNoError(error, "Unable to mirror invoice");

  if (subscriptionId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await syncSubscription(supabase, subscription, eventId);
  }
}

serve(async (req) => {
  if (req.method !== "POST") return new Response("Method not allowed", { status: 405 });

  let stripe: Stripe;
  let supabase: SupabaseClient;
  let webhookSecret: string;
  try {
    const stripeKey = Deno.env.get("STRIPE_RESTRICTED_KEY")
      ?? Deno.env.get("STRIPE_SECRET_KEY")
      ?? "";
    if (!stripeKey) throw new Error("Missing server configuration: STRIPE_RESTRICTED_KEY");
    webhookSecret = getRequiredEnv("STRIPE_WEBHOOK_SECRET");
    const supabaseUrl = getRequiredEnv("SUPABASE_URL");
    const serviceRoleKey = getRequiredEnv("SUPABASE_SERVICE_ROLE_KEY");
    stripe = new Stripe(stripeKey, {
      apiVersion: "2026-07-29.dahlia",
      httpClient: Stripe.createFetchHttpClient(),
    });
    supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });
  } catch (error) {
    console.error("stripe-webhook configuration error:", error instanceof Error ? error.message : "unknown");
    return new Response("Webhook is not configured", { status: 503 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) return new Response("Missing signature", { status: 400 });

  let event: Stripe.Event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch {
    console.error("stripe-webhook signature verification failed");
    return new Response("Invalid signature", { status: 400 });
  }

  try {
    const claim = await claimEvent(supabase, event);
    if (claim === "duplicate") {
      return new Response(JSON.stringify({ received: true, status: "duplicate" }), {
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
      });
    }

    switch (event.type) {
      case "checkout.session.completed":
        await handleCheckoutCompleted(
          stripe,
          supabase,
          event.data.object as Stripe.Checkout.Session,
          event.id,
        );
        break;
      case "checkout.session.expired":
        await handleCheckoutExpired(
          supabase,
          event.data.object as Stripe.Checkout.Session,
        );
        break;
      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted":
      case "customer.subscription.trial_will_end":
        await syncSubscription(
          supabase,
          event.data.object as Stripe.Subscription,
          event.id,
        );
        break;
      case "invoice.paid":
        await mirrorInvoice(
          stripe,
          supabase,
          event.data.object as Stripe.Invoice,
          false,
          event.id,
        );
        break;
      case "invoice.payment_failed":
      case "invoice.payment_action_required":
        await mirrorInvoice(
          stripe,
          supabase,
          event.data.object as Stripe.Invoice,
          true,
          event.id,
        );
        break;
      default:
        break;
    }

    await markEvent(supabase, event.id, "processed");
    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown processing error";
    console.error("stripe-webhook processing error:", event.type, message);
    try {
      await markEvent(supabase, event.id, "failed", message.slice(0, 1000));
    } catch (markError) {
      console.error(
        "stripe-webhook event log update failed:",
        markError instanceof Error ? markError.message : "unknown",
      );
    }
    return new Response(JSON.stringify({ error: "Processing failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Cache-Control": "no-store" },
    });
  }
});
