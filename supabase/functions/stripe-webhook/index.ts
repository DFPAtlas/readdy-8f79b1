
import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.25.0?target=deno";

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
  apiVersion: "2024-06-20",
  httpClient: Stripe.createFetchHttpClient(),
});

const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
const supabaseUrl = Deno.env.get("VITE_PUBLIC_SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

type SubscriptionStatus = "trialing" | "active" | "past_due" | "unpaid" | "canceled" | "incomplete" | "incomplete_expired" | "paused";
type AccessState = "full" | "grace_period" | "read_only" | "billing_locked" | "suspended_by_platform";

function mapStripeStatus(status: string): SubscriptionStatus {
  const map: Record<string, SubscriptionStatus> = {
    trialing: "trialing", active: "active", past_due: "past_due",
    unpaid: "unpaid", canceled: "canceled", incomplete: "incomplete",
    incomplete_expired: "incomplete_expired", paused: "paused",
  };
  return map[status] || "incomplete";
}

function deriveAccessState(subscriptionStatus: SubscriptionStatus, orgId: string): AccessState {
  // Check if there's a manual platform suspension first
  // For now: full for active/trialing, grace_period for past_due, billing_locked for unpaid/canceled
  switch (subscriptionStatus) {
    case "trialing":
    case "active":
      return "full";
    case "past_due":
      return "grace_period";
    case "unpaid":
    case "incomplete":
    case "incomplete_expired":
      return "billing_locked";
    case "canceled":
      return "read_only";
    case "paused":
      return "billing_locked";
    default:
      return "full";
  }
}

async function recordEvent(eventId: string, eventType: string, status: string, meta: Record<string, unknown> = {}) {
  const { data: existing } = await supabase
    .from("billing_webhook_events")
    .select("id, processing_status")
    .eq("stripe_event_id", eventId)
    .maybeSingle();

  if (existing) {
    if (existing.processing_status === "processed") {
      return { status: "duplicate" };
    }
    await supabase.from("billing_webhook_events").update({
      processing_status: status,
      attempt_count: 1,
      last_error: meta.error ? String(meta.error) : null,
      processed_at: status === "processed" ? new Date().toISOString() : null,
    }).eq("id", existing.id);
    return { status: "retry" };
  }

  await supabase.from("billing_webhook_events").insert({
    stripe_event_id: eventId,
    event_type: eventType,
    processing_status: status,
    stripe_object_id: meta.object_id ? String(meta.object_id) : null,
    stripe_customer_id: meta.customer_id ? String(meta.customer_id) : null,
    stripe_subscription_id: meta.subscription_id ? String(meta.subscription_id) : null,
    attempt_count: 1,
    last_error: meta.error ? String(meta.error) : null,
    processed_at: status === "processed" ? new Date().toISOString() : null,
  });
  return { status: "new" };
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session) {
  const orgId = session.metadata?.organisation_id;
  const planKey = session.metadata?.plan_key;
  const attemptId = session.metadata?.checkout_attempt_id;
  const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id;

  if (!orgId || !planKey) return;

  // Update checkout attempt
  if (attemptId) {
    await supabase.from("billing_checkout_attempts").update({
      status: "completed",
      completed_at: new Date().toISOString(),
    }).eq("id", attemptId);
  }

  if (!subscriptionId) return;

  // Fetch fresh subscription from Stripe
  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  const status = mapStripeStatus(subscription.status);
  const accessState = deriveAccessState(status, orgId);

  // Get plan ID
  const { data: plan } = await supabase.from("billing_plans").select("id").eq("plan_key", planKey).maybeSingle();

  const subData: Record<string, unknown> = {
    organisation_id: orgId,
    stripe_subscription_id: subscription.id,
    stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id || "",
    plan_id: plan?.id || null,
    status,
    access_state: accessState,
    billing_interval: subscription.items.data[0]?.plan?.interval === "year" ? "annual" : "monthly",
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
    trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    latest_invoice_id: typeof subscription.latest_invoice === "string" ? subscription.latest_invoice : null,
    updated_at: new Date().toISOString(),
  };

  // Upsert subscription
  const { data: existingSub } = await supabase.from("organisation_subscriptions")
    .select("id").eq("stripe_subscription_id", subscription.id).maybeSingle();

  if (existingSub) {
    await supabase.from("organisation_subscriptions").update(subData).eq("id", existingSub.id);
  } else {
    await supabase.from("organisation_subscriptions").insert(subData);
  }

  // Provision entitlements
  if (plan?.id) {
    await provisionEntitlements(orgId, plan.id);
  }

  // Record status history
  await supabase.from("billing_status_history").insert({
    organisation_id: orgId,
    new_status: status,
    new_access_state: accessState,
    provider_event_id: subscription.id,
    reason: "checkout_completed",
  });

  // Record trial if applicable
  if (subscription.trial_start && subscription.trial_end) {
    await supabase.from("billing_trial_history").insert({
      organisation_id: orgId,
      plan_id: plan?.id || null,
      trial_start: new Date(subscription.trial_start * 1000).toISOString(),
      trial_end: new Date(subscription.trial_end * 1000).toISOString(),
      payment_method_required: true,
      converted: subscription.status === "active",
      converted_at: subscription.status === "active" ? new Date().toISOString() : null,
      conversion_plan_id: subscription.status === "active" ? plan?.id : null,
      reminder_status: "none",
    });
  }
}

async function provisionEntitlements(orgId: string, planId: string) {
  const { data: entitlements } = await supabase
    .from("billing_plan_entitlements")
    .select("feature_id, is_enabled, limit_value, limit_unit")
    .eq("plan_id", planId);

  if (!entitlements?.length) return;

  for (const ent of entitlements) {
    await supabase.from("organisation_entitlements").upsert({
      organisation_id: orgId,
      feature_id: ent.feature_id,
      plan_id: planId,
      is_enabled: ent.is_enabled,
      limit_value: ent.limit_value,
      limit_unit: ent.limit_unit,
      source: "plan",
      effective_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "organisation_id, feature_id" });
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription) {
  const orgId = subscription.metadata?.organisation_id;
  if (!orgId) return;

  const status = mapStripeStatus(subscription.status);
  const accessState = deriveAccessState(status, orgId);

  const subData: Record<string, unknown> = {
    status,
    access_state: accessState,
    current_period_start: new Date(subscription.current_period_start * 1000).toISOString(),
    current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
    cancel_at_period_end: subscription.cancel_at_period_end,
    canceled_at: subscription.canceled_at ? new Date(subscription.canceled_at * 1000).toISOString() : null,
    ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : null,
    trial_start: subscription.trial_start ? new Date(subscription.trial_start * 1000).toISOString() : null,
    trial_end: subscription.trial_end ? new Date(subscription.trial_end * 1000).toISOString() : null,
    latest_invoice_id: typeof subscription.latest_invoice === "string" ? subscription.latest_invoice : null,
    billing_interval: subscription.items.data[0]?.plan?.interval === "year" ? "annual" : "monthly",
    updated_at: new Date().toISOString(),
  };

  // Grace period: if past_due, set grace_period_ends_at
  if (status === "past_due") {
    const graceDays = 14;
    const graceEnd = new Date();
    graceEnd.setDate(graceEnd.getDate() + graceDays);
    subData.grace_period_ends_at = graceEnd.toISOString();
  }

  const { data: existingSub } = await supabase.from("organisation_subscriptions")
    .select("id, status, access_state")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  if (existingSub) {
    // Don't override manual suspension
    if (existingSub.access_state === "suspended_by_platform") {
      delete subData.access_state;
    }

    await supabase.from("organisation_subscriptions").update(subData).eq("id", existingSub.id);

    // Record status change
    if (existingSub.status !== status) {
      await supabase.from("billing_status_history").insert({
        organisation_id: orgId,
        subscription_id: existingSub.id,
        previous_status: existingSub.status,
        new_status: status,
        previous_access_state: existingSub.access_state,
        new_access_state: existingSub.access_state === "suspended_by_platform" ? "suspended_by_platform" : accessState,
        provider_event_id: subscription.id,
        reason: "subscription_updated",
      });
    }
  } else {
    await supabase.from("organisation_subscriptions").insert({
      ...subData,
      organisation_id: orgId,
      stripe_subscription_id: subscription.id,
      stripe_customer_id: typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id || "",
    });
  }
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription) {
  const orgId = subscription.metadata?.organisation_id;
  if (!orgId) return;

  const { data: existingSub } = await supabase.from("organisation_subscriptions")
    .select("id, status, access_state")
    .eq("stripe_subscription_id", subscription.id)
    .maybeSingle();

  if (!existingSub) return;

  // Don't override manual suspension with canceled state - but still record the Stripe status
  const newAccessState = existingSub.access_state === "suspended_by_platform"
    ? "suspended_by_platform"
    : "read_only";

  await supabase.from("organisation_subscriptions").update({
    status: "canceled",
    access_state: newAccessState,
    ended_at: subscription.ended_at ? new Date(subscription.ended_at * 1000).toISOString() : new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }).eq("id", existingSub.id);

  await supabase.from("billing_status_history").insert({
    organisation_id: orgId,
    subscription_id: existingSub.id,
    previous_status: existingSub.status,
    new_status: "canceled",
    previous_access_state: existingSub.access_state,
    new_access_state: newAccessState,
    provider_event_id: subscription.id,
    reason: "subscription_deleted",
  });
}

async function handleInvoicePaid(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  // Find organisation by Stripe customer
  const { data: billingCustomer } = await supabase
    .from("organisation_billing_customers")
    .select("organisation_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!billingCustomer) return;

  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;

  await supabase.from("billing_invoices").upsert({
    organisation_id: billingCustomer.organisation_id,
    stripe_invoice_id: invoice.id,
    stripe_subscription_id: subscriptionId || null,
    stripe_customer_id: customerId,
    invoice_number: invoice.number || null,
    status: invoice.status || "paid",
    currency: invoice.currency || "gbp",
    subtotal_amount: invoice.subtotal || 0,
    tax_amount: invoice.tax || 0,
    total_amount: invoice.total || 0,
    tax_rate: invoice.tax_rate || null,
    invoice_period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
    invoice_period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
    hosted_invoice_url: invoice.hosted_invoice_url || null,
    invoice_pdf_url: invoice.invoice_pdf || null,
    paid_at: invoice.status === "paid" ? new Date().toISOString() : null,
  }, { onConflict: "stripe_invoice_id" });
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice) {
  const customerId = typeof invoice.customer === "string" ? invoice.customer : invoice.customer?.id;
  if (!customerId) return;

  const { data: billingCustomer } = await supabase
    .from("organisation_billing_customers")
    .select("organisation_id")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!billingCustomer) return;

  const subscriptionId = typeof invoice.subscription === "string" ? invoice.subscription : invoice.subscription?.id;

  await supabase.from("billing_invoices").upsert({
    organisation_id: billingCustomer.organisation_id,
    stripe_invoice_id: invoice.id,
    stripe_subscription_id: subscriptionId || null,
    stripe_customer_id: customerId,
    invoice_number: invoice.number || null,
    status: "payment_failed",
    currency: invoice.currency || "gbp",
    subtotal_amount: invoice.subtotal || 0,
    tax_amount: invoice.tax || 0,
    total_amount: invoice.total || 0,
    invoice_period_start: invoice.period_start ? new Date(invoice.period_start * 1000).toISOString() : null,
    invoice_period_end: invoice.period_end ? new Date(invoice.period_end * 1000).toISOString() : null,
    hosted_invoice_url: invoice.hosted_invoice_url || null,
    invoice_pdf_url: invoice.invoice_pdf || null,
  }, { onConflict: "stripe_invoice_id" });
}

serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return new Response("No signature", { status: 400 });
  }

  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${err instanceof Error ? err.message : "Invalid signature"}`, { status: 400 });
  }

  // Record event as received, mark duplicate if already processed
  const eventResult = await recordEvent(event.id, event.type, "processing", {
    object_id: event.data.object && "id" in event.data.object ? (event.data.object as { id?: string }).id : undefined,
    customer_id: event.data.object && "customer" in event.data.object
      ? (typeof (event.data.object as { customer?: unknown }).customer === "string"
        ? (event.data.object as { customer: string }).customer
        : undefined)
      : undefined,
    subscription_id: event.data.object && "subscription" in event.data.object
      ? (typeof (event.data.object as { subscription?: unknown }).subscription === "string"
        ? (event.data.object as { subscription: string }).subscription
        : undefined)
      : undefined,
  });

  if (eventResult.status === "duplicate") {
    return new Response(JSON.stringify({ received: true, status: "duplicate" }), {
      headers: { "Content-Type": "application/json" },
    });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(session);
        break;
      }
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdated(subscription);
        break;
      }
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionDeleted(subscription);
        break;
      }
      case "invoice.paid": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaid(invoice);
        break;
      }
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }
      case "invoice.payment_action_required": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoicePaymentFailed(invoice);
        break;
      }
      case "customer.subscription.trial_will_end": {
        const subscription = event.data.object as Stripe.Subscription;
        // Trial ending — notification handled separately
        await handleSubscriptionUpdated(subscription);
        break;
      }
      default:
        // Unhandled event type, still mark as processed
        break;
    }

    await recordEvent(event.id, event.type, "processed", {
      object_id: event.data.object && "id" in event.data.object ? (event.data.object as { id?: string }).id : undefined,
    });

    return new Response(JSON.stringify({ received: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(`Webhook processing error for ${event.type}:`, err);
    await recordEvent(event.id, event.type, "failed", {
      error: err instanceof Error ? err.message : "Unknown error",
    });
    return new Response(
      JSON.stringify({ error: "Processing failed" }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
