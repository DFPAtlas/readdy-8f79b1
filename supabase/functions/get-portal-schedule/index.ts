import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("VITE_PUBLIC_SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ());
    const token = typeof body?.token === "string" ? body.token : "";

    if (!token) {
      return new Response(JSON.stringify({ error: "Missing token" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Hash the incoming raw token to match the stored token_hash (SHA-256 hex).
    const data = new TextEncoder().encode(token);
    const digest = await crypto.subtle.digest("SHA-256", data);
    const tokenHash = Array.from(new Uint8Array(digest))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    // Resolve the active portal access grant for this token.
    const { data: access, error: accessError } = await supabase
      .from("portal_access")
      .select("id, organisation_id, client_id, job_scope, status, expires_at")
      .eq("token_hash", tokenHash)
      .eq("status", "active")
      .maybeSingle();

    if (accessError || !access) {
      return new Response(JSON.stringify({ error: "Invalid or expired portal link" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (access.expires_at && new Date(access.expires_at).getTime() < Date.now()) {
      return new Response(JSON.stringify({ error: "Portal link expired" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Determine which jobs this client is scoped to.
    let jobIds: string[] = [];
    if (access.job_scope && access.job_scope.length > 0) {
      jobIds = access.job_scope;
    } else if (access.client_id) {
      const { data: jobs } = await supabase
        .from("jobs")
        .select("id")
        .eq("client_id", access.client_id);
      jobIds = (jobs ?? []).map((j) => j.id);
    }

    if (jobIds.length === 0) {
      return new Response(JSON.stringify({ events: [], client: null }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: events, error: eventsError } = await supabase
      .from("portal_schedule_events")
      .select("*")
      .in("job_id", jobIds)
      .eq("is_client_visible", true)
      .order("event_date", { ascending: true });

    if (eventsError) {
      throw eventsError;
    }

    return new Response(
      JSON.stringify({ events: events ?? [], client: access.client_id }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("get-portal-schedule error:", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Schedule fetch failed" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
