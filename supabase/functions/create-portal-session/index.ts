
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

    // Get user's active org
    const { data: membership } = await supabase
      .from("organisation_members")
      .select("organisation_id, role")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (!membership) throw new Error("No active organisation membership");

    if (membership.role !== "owner" && membership.role !== "admin") {
      throw new Error("Only organisation owners or admins can manage billing");
    }

    // Resolve Stripe Customer ID server-side
    const { data: billingCustomer } = await supabase
      .from("organisation_billing_customers")
      .select("stripe_customer_id")
      .eq("organisation_id", membership.organisation_id)
      .maybeSingle();

    if (!billingCustomer?.stripe_customer_id) {
      throw new Error("No billing customer found for this organisation");
    }

    const basePath = req.headers.get("origin") || "";
    const returnUrl = `${basePath}/app/settings/billing`;

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: billingCustomer.stripe_customer_id,
      return_url: returnUrl,
      configuration: "bpc_1RB000000000000000000000",
    });

    return new Response(
      JSON.stringify({ url: portalSession.url }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Portal error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Portal session failed" }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
