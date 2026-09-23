import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const responseHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return json({ error: "Method not allowed" }, 405);
  }

  try {
    if (!supabaseUrl || !serviceKey) {
      console.error("get-portal-schedule: missing Supabase environment");
      return json({ error: "Schedule service unavailable" }, 503);
    }

    const body = await req.json().catch(() => ({}));
    const token = typeof body?.token === "string" ? body.token.trim() : "";
    if (token.length < 32 || token.length > 512) {
      return json({ error: "Invalid portal link" }, 400);
    }

    const encoded = new TextEncoder().encode(token);
    const digest = await crypto.subtle.digest("SHA-256", encoded);
    const tokenHash = Array.from(new Uint8Array(digest))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");

    const supabase = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false },
    });

    const { data: access, error: accessError } = await supabase
      .from("portal_access")
      .select("id, organisation_id, client_id, job_scope, status, expires_at")
      .eq("token_hash", tokenHash)
      .eq("status", "active")
      .maybeSingle();

    if (accessError) {
      console.error("get-portal-schedule access lookup failed:", accessError.message);
      return json({ error: "Schedule service unavailable" }, 503);
    }
    if (!access) {
      return json({ error: "Invalid or expired portal link" }, 404);
    }
    if (access.expires_at && new Date(access.expires_at).getTime() < Date.now()) {
      return json({ error: "Portal link expired" }, 403);
    }

    let jobsQuery = supabase
      .from("jobs")
      .select("id")
      .eq("organisation_id", access.organisation_id)
      .is("archived_at", null);

    if (Array.isArray(access.job_scope) && access.job_scope.length > 0) {
      jobsQuery = jobsQuery.in("id", access.job_scope);
    } else if (access.client_id) {
      jobsQuery = jobsQuery.eq("client_id", access.client_id);
    } else {
      return json({ events: [], client: null });
    }

    const { data: jobs, error: jobsError } = await jobsQuery;
    if (jobsError) {
      console.error("get-portal-schedule job lookup failed:", jobsError.message);
      return json({ error: "Schedule service unavailable" }, 503);
    }

    const jobIds = (jobs ?? []).map((job) => job.id);
    if (jobIds.length === 0) {
      return json({ events: [], client: access.client_id });
    }

    const { data: timelineEvents, error: eventsError } = await supabase
      .from("timeline_events")
      .select("id, event_type, title, event_date, metadata")
      .eq("organisation_id", access.organisation_id)
      .in("job_id", jobIds)
      .eq("visibility", "client_visible")
      .order("event_date", { ascending: true });

    if (eventsError) {
      console.error("get-portal-schedule event lookup failed:", eventsError.message);
      return json({ error: "Schedule service unavailable" }, 503);
    }

    const allowedPortalTypes = new Set(["site_visit", "milestone", "payment", "meeting", "handover"]);
    const typeMap: Record<string, string> = {
      inspection: "site_visit",
      payment: "payment",
      completion: "handover",
    };

    const events = (timelineEvents ?? []).map((event) => {
      const metadata = event.metadata && typeof event.metadata === "object" ? event.metadata as Record<string, unknown> : {};
      const requestedType = typeof metadata.portal_event_type === "string" ? metadata.portal_event_type : "";
      const eventType = allowedPortalTypes.has(requestedType)
        ? requestedType
        : (typeMap[event.event_type] ?? "meeting");

      return {
        id: event.id,
        event_type: eventType,
        title: event.title,
        event_date: event.event_date,
        event_time: typeof metadata.event_time === "string" ? metadata.event_time : null,
        location: typeof metadata.location === "string" ? metadata.location : null,
      };
    });

    const { error: touchError } = await supabase
      .from("portal_access")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("id", access.id);
    if (touchError) {
      console.error("get-portal-schedule access timestamp failed:", touchError.message);
    }

    return json({ events, client: access.client_id });
  } catch (err) {
    console.error("get-portal-schedule unexpected error:", err);
    return json({ error: "Schedule fetch failed" }, 500);
  }
});
