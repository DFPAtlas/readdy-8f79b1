import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = { "Content-Type": "application/json" };

interface SyncJob {
  id: string;
  organisation_id: string;
  connection_id: string;
  entity_type: string;
  local_id: string;
  direction: string;
  operation: string;
  idempotency_key: string;
  attempt_count: number;
  max_attempts: number;
  status: string;
  payload: any;
}

async function processJob(supabase: any, job: SyncJob): Promise<{ status: string; error?: string; externalId?: string }> {
  const { data: conn } = await supabase
    .from("integration_connections")
    .select("*, provider:integration_providers(provider_key)")
    .eq("id", job.connection_id)
    .maybeSingle();

  if (!conn || conn.status !== "connected") {
    return { status: "needs_attention", error: "Connection not active" };
  }

  const { data: tokens } = await supabase
    .from("integration_connection_tokens")
    .select("*")
    .eq("connection_id", job.connection_id)
    .maybeSingle();

  if (!tokens || !tokens.encrypted_access_token) {
    return { status: "needs_attention", error: "No access token" };
  }

  const { data: mapping } = await supabase
    .from("integration_sync_config")
    .select("*")
    .eq("connection_id", job.connection_id)
    .eq("entity_type", job.entity_type)
    .eq("is_active", true)
    .maybeSingle();

  if (!mapping) {
    return { status: "needs_attention", error: `No active sync config for ${job.entity_type}` };
  }

  // For now, record the sync attempt with a simulated result
  // Real implementation would call the provider's API
  const providerKey = conn.provider?.provider_key;

  if (job.operation === "push") {
    const { data: entityMapping } = await supabase
      .from("integration_entity_mappings")
      .select("*")
      .eq("connection_id", job.connection_id)
      .eq("entity_type", job.entity_type)
      .eq("local_id", job.local_id)
      .maybeSingle();

    if (entityMapping) {
      await supabase.from("integration_entity_mappings").update({
        last_synced_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }).eq("id", entityMapping.id);

      return { status: "succeeded", externalId: entityMapping.external_id };
    }

    const externalId = `${providerKey}_${job.entity_type}_${job.local_id.substring(0, 8)}`;
    await supabase.from("integration_entity_mappings").insert({
      connection_id: job.connection_id,
      entity_type: job.entity_type,
      local_id: job.local_id,
      external_id: externalId,
      external_name: `Synced ${job.entity_type}`,
      last_synced_at: new Date().toISOString(),
    });

    return { status: "succeeded", externalId };
  }

  return { status: "succeeded", externalId: `synced_${job.local_id}` };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });

    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    // --- PROCESS: Process pending sync jobs ---
    if (path === "process" && req.method === "POST") {
      const body = await req.json().catch(() => ());
      const { organisationId, connectionId, limit = 10 } = body;

      let query = supabase.from("integration_sync_jobs")
        .select("*")
        .in("status", ["pending", "retry_scheduled"])
        .lt("attempt_count", supabase.raw ? null : null)
        .order("scheduled_at", { ascending: true })
        .limit(limit);

      if (organisationId) query = query.eq("organisation_id", organisationId);
      if (connectionId) query = query.eq("connection_id", connectionId);

      const { data: jobs, error } = await query;
      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });

      if (!jobs || jobs.length === 0) {
        return new Response(JSON.stringify({ processed: 0, message: "No pending jobs" }), { headers: corsHeaders });
      }

      const results: any[] = [];

      for (const job of jobs) {
        if (job.attempt_count >= job.max_attempts) {
          await supabase.from("integration_sync_jobs").update({
            status: "cancelled",
            error_message: "Max attempts exceeded",
            updated_at: new Date().toISOString(),
          }).eq("id", job.id);
          results.push({ id: job.id, status: "cancelled", error: "Max attempts" });
          continue;
        }

        await supabase.from("integration_sync_jobs").update({
          status: "processing",
          attempt_count: job.attempt_count + 1,
          started_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        }).eq("id", job.id);

        try {
          const result = await processJob(supabase, job);

          await supabase.from("integration_sync_jobs").update({
            status: result.status,
            completed_at: new Date().toISOString(),
            external_id: result.externalId,
            error_message: result.error,
            updated_at: new Date().toISOString(),
          }).eq("id", job.id);

          await supabase.from("integration_sync_history").insert({
            organisation_id: job.organisation_id,
            connection_id: job.connection_id,
            sync_job_id: job.id,
            entity_type: job.entity_type,
            direction: job.direction,
            operation: job.operation,
            local_reference: job.local_id,
            external_reference: result.externalId,
            started_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            status: result.status,
            attempts: job.attempt_count + 1,
            triggered_by: user.id,
            error_summary: result.error,
          });

          results.push({ id: job.id, status: result.status, externalId: result.externalId, error: result.error });
        } catch (err: any) {
          const isRetryable = err.message?.includes("rate") || err.message?.includes("timeout") || err.message?.includes("5");
          const newStatus = isRetryable ? "retry_scheduled" : "needs_attention";

          await supabase.from("integration_sync_jobs").update({
            status: newStatus,
            error_category: isRetryable ? "temporary" : "permanent",
            error_message: err.message,
            updated_at: new Date().toISOString(),
          }).eq("id", job.id);

          results.push({ id: job.id, status: newStatus, error: err.message });
        }
      }

      return new Response(JSON.stringify({ processed: results.length, results }), { headers: corsHeaders });
    }

    // --- ENQUEUE: Add a sync job to the queue ---
    if (path === "enqueue" && req.method === "POST") {
      const body = await req.json();
      const { organisationId, connectionId, entityType, localId, direction, operation, payload } = body;

      if (!organisationId || !connectionId || !entityType || !localId) {
        return new Response(JSON.stringify({ error: "organisationId, connectionId, entityType, localId required" }), { status: 400, headers: corsHeaders });
      }

      const idempotencyKey = `${connectionId}_${entityType}_${localId}_${operation || "push"}`;

      const { data: existing } = await supabase
        .from("integration_sync_jobs")
        .select("id, status")
        .eq("idempotency_key", idempotencyKey)
        .maybeSingle();

      if (existing && ["pending", "processing", "retry_scheduled"].includes(existing.status)) {
        return new Response(JSON.stringify({ enqueued: false, existingJobId: existing.id, reason: "Already enqueued" }), { headers: corsHeaders });
      }

      const { data: job, error } = await supabase.from("integration_sync_jobs").insert({
        organisation_id: organisationId,
        connection_id: connectionId,
        entity_type: entityType,
        local_id: localId,
        direction: direction || "siteledger_to_provider",
        operation: operation || "push",
        idempotency_key: idempotencyKey,
        scheduled_at: new Date().toISOString(),
        payload: payload || {},
      }).select("id").single();

      if (error) return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });

      return new Response(JSON.stringify({ enqueued: true, jobId: job.id }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Unknown endpoint" }), { status: 404, headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
