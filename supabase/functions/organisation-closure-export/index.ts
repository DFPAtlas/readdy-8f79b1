import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const BUCKETS = ["documents", "job-evidence", "dispute-files"] as const;
const PAGE_SIZE = 500;
const MAX_OBJECTS = 5000;
const MAX_EXPORT_BYTES = 250 * 1024 * 1024;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Cache-Control": "no-store",
  "Content-Type": "application/json",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: CORS });
}

function redactSecrets(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redactSecrets);
  if (!value || typeof value !== "object") return value;
  const result: Record<string, unknown> = {};
  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    if (/(^|_)(access_token|refresh_token|api_key|secret|password|credential|private_key)(_|$)/i.test(key)) {
      result[key] = "[redacted]";
    } else {
      result[key] = redactSecrets(child);
    }
  }
  return result;
}

function safeZipPath(value: string) {
  return value.split("/").map((segment) => segment.replace(/[^a-zA-Z0-9._ -]/g, "_")).join("/");
}

async function listOrganisationFiles(admin: ReturnType<typeof createClient>, bucket: string, orgId: string) {
  const paths: string[] = [];

  async function walk(folder: string): Promise<void> {
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await admin.storage.from(bucket).list(folder, {
        limit: 1000,
        offset,
        sortBy: { column: "name", order: "asc" },
      });
      if (error) throw new Error(`Storage listing failed for ${bucket}`);
      for (const item of data ?? []) {
        const path = folder ? `${folder}/${item.name}` : item.name;
        if (item.id === null || item.metadata === null) {
          await walk(path);
        } else {
          if (!path.startsWith(`${orgId}/`)) throw new Error("Storage path escaped the organisation prefix");
          paths.push(path);
          if (paths.length > MAX_OBJECTS) throw new Error("Export exceeds the 5,000-file safety limit");
        }
      }
      if (!data || data.length < 1000) break;
    }
  }

  await walk(orgId);
  return paths;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: CORS });
  if (req.method !== "POST") return json({ error: "Use POST" }, 405);
  if (!supabaseUrl || !anonKey || !serviceRoleKey) return json({ error: "Export is not configured" }, 503);

  try {
    const body = await req.json();
    const orgId = typeof body?.organisationId === "string" ? body.organisationId : "";
    if (!UUID.test(orgId)) return json({ error: "A valid organisation ID is required" }, 400);

    const authorization = req.headers.get("Authorization") ?? "";
    if (!authorization.startsWith("Bearer ")) return json({ error: "Authentication required" }, 401);
    const userClient = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false },
      global: { headers: { Authorization: authorization } },
    });
    const { data: authData, error: authError } = await userClient.auth.getUser();
    if (authError || !authData.user) return json({ error: "Authentication required" }, 401);

    const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
    const { data: membership, error: memberError } = await admin
      .from("organisation_members")
      .select("role,status")
      .eq("organisation_id", orgId)
      .eq("user_id", authData.user.id)
      .maybeSingle();
    if (memberError) throw memberError;
    if (!membership || membership.status !== "active" || !["owner", "admin"].includes(membership.role)) {
      return json({ error: "Only an active organisation owner or admin can request this export" }, 403);
    }

    const { data: closure, error: closureError } = await admin
      .from("organisation_deletion_requests")
      .select("status,purge_after,legal_hold")
      .eq("organisation_id", orgId)
      .maybeSingle();
    if (closureError) throw closureError;
    if (!closure || !["scheduled", "blocked"].includes(closure.status) || new Date(closure.purge_after).getTime() < Date.now()) {
      return json({ error: "No active account-closure export window is available" }, 409);
    }

    const { data: tableNames, error: tablesError } = await admin.rpc("organisation_export_table_names");
    if (tablesError || !Array.isArray(tableNames)) throw new Error("Organisation export catalogue is unavailable");

    const zip = new JSZip();
    const tableCounts: Record<string, number> = {};
    for (const table of tableNames) {
      if (typeof table !== "string" || !/^[a-z][a-z0-9_]{0,62}$/.test(table)) {
        throw new Error("Export catalogue contains an invalid table name");
      }
      const records: unknown[] = [];
      for (let offset = 0; ; offset += PAGE_SIZE) {
        const { data, error } = await admin.rpc("organisation_export_table_page", {
          p_table: table,
          p_organisation_id: orgId,
          p_page_size: PAGE_SIZE,
          p_page_offset: offset,
        });
        if (error || !Array.isArray(data)) throw new Error(`Could not export ${table}`);
        records.push(...data);
        if (data.length < PAGE_SIZE) break;
      }
      tableCounts[table] = records.length;
      zip.file(`data/${table}.json`, JSON.stringify(redactSecrets(records), null, 2));
    }

    let objectCount = 0;
    let downloadedBytes = 0;
    const storageManifest: Array<{ bucket: string; path: string; bytes: number }> = [];
    for (const bucket of BUCKETS) {
      const paths = await listOrganisationFiles(admin, bucket, orgId);
      for (const path of paths) {
        const { data, error } = await admin.storage.from(bucket).download(path);
        if (error || !data) throw new Error(`Could not download a stored object from ${bucket}`);
        const bytes = new Uint8Array(await data.arrayBuffer());
        downloadedBytes += bytes.byteLength;
        if (downloadedBytes > MAX_EXPORT_BYTES) throw new Error("Export exceeds the 250 MB safety limit");
        const relative = path.slice(orgId.length + 1);
        zip.file(`files/${bucket}/${safeZipPath(relative)}`, bytes);
        storageManifest.push({ bucket, path: relative, bytes: bytes.byteLength });
        objectCount += 1;
      }
    }

    const generatedAt = new Date().toISOString();
    zip.file("manifest.json", JSON.stringify({
      organisation_id: orgId,
      generated_at: generatedAt,
      database_tables: tableCounts,
      stored_object_count: objectCount,
      stored_object_bytes: downloadedBytes,
      stored_objects: storageManifest,
      exclusions: [
        "BuildNerve platform audit and support records are excluded.",
        "Credential-like fields are redacted from exported database rows.",
        "Files are included from the organisation prefix in all three private buckets.",
      ],
    }, null, 2));

    const bytes = await zip.generateAsync({ type: "uint8array", compression: "DEFLATE", compressionOptions: { level: 5 } });
    const filename = `buildnerve-organisation-export-${orgId}-${generatedAt.slice(0, 10)}.zip`;
    return new Response(bytes, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": CORS["Access-Control-Allow-Headers"],
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
        "X-Export-Table-Count": String(Object.keys(tableCounts).length),
        "X-Export-Object-Count": String(objectCount),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Export failed";
    console.error("organisation-closure-export failed:", message);
    const status = /safety limit/.test(message) ? 413 : 500;
    return json({ error: status === 413 ? message : "Organisation export could not be completed; retry or contact support" }, status);
  }
});
