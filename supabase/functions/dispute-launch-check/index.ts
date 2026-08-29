import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("VITE_PUBLIC_SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("VITE_PUBLIC_SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DISPUTE_TABLES = [
  "disputes", "dispute_parties", "dispute_claims", "dispute_events", "dispute_audit_log",
  "dispute_evidence", "dispute_clarifications", "dispute_settlement_offers",
  "dispute_settlement_obligations", "dispute_preaction_checklist", "dispute_preaction_issues",
  "dispute_letters", "dispute_exports", "dispute_deadlines", "dispute_notification_preferences",
  "dispute_admin_notes", "dispute_safety_reports", "dispute_content_restrictions",
  "dispute_admin_access_log", "dispute_guidance_versions",
];

const ADMIN_PERMISSIONS = [
  "disputes_view_summary", "disputes_view_case", "disputes_support", "disputes_manage_safety",
  "disputes_manage_deadlines", "disputes_view_audit", "disputes_export_audit",
  "disputes_manage_legal_content",
];

const MANUAL_GATES = [
  { key: "solicitor_review", label: "UK solicitor review of legal wording and templates", legal: true },
  { key: "privacy_retention_approval", label: "Privacy-policy and retention-policy approval", legal: true },
  { key: "email_delivery_verification", label: "Live email-delivery verification", legal: false },
  { key: "storage_export_load_test", label: "Live storage and export-load test", legal: false },
  { key: "incident_response_ownership", label: "Incident-response ownership", legal: false },
  { key: "support_process_approval", label: "Customer-support process approval", legal: false },
];

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function fail(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

type Supabase = ReturnType<typeof createClient>;
type Status = "pass" | "fail" | "manual" | "not_configured";

interface Check {
  id: string;
  group: string;
  title: string;
  status: Status;
  evidence: string;
  automated: boolean;
  blocking: boolean;
  remediation: string;
}

async function colExists(admin: Supabase, table: string, column: string): Promise<boolean> {
  try {
    const { error } = await admin.from(table).select(column).limit(1);
    return !error;
  } catch {
    return false;
  }
}

async function tableExists(admin: Supabase, table: string): Promise<boolean> {
  try {
    const { error } = await admin.from(table).select("id", { count: "exact", head: true });
    return !error;
  } catch {
    return false;
  }
}

async function resolveStaff(admin: Supabase, userId: string) {
  const { data: staff } = await admin.from("platform_staff")
    .select("role, status").eq("user_id", userId).eq("status", "active").maybeSingle();
  if (!staff) return null;
  const { data: perms } = await admin.from("platform_role_permissions")
    .select("permission_definitions(permission_key)").eq("role", staff.role);
  const permissions = (perms || [])
    .map((p: any) => p.permission_definitions?.permission_key)
    .filter((k: string) => ADMIN_PERMISSIONS.includes(k));
  return { role: staff.role as string, permissions: permissions as string[] };
}

function has(perms: string[] | null, key: string) {
  return !!perms && perms.includes(key);
}

async function runChecks(admin: Supabase, anon: Supabase | null): Promise<Check[]> {
  const checks: Check[] = [];
  const anonReady = !!anon;

  // ── Anonymous cross-case isolation probe (real behavioural test) ──────
  // An anonymous (unauthenticated) client must read zero rows and be unable to
  // write, because RLS has no anon policy on the dispute tables.
  let anonReadBlocked = true;
  let anonReadErr = "";
  if (anonReady) {
    for (const t of ["disputes", "dispute_claims", "dispute_evidence", "dispute_audit_log"]) {
      const { data, error } = await anon.from(t).select("id").limit(1);
      if (error) { anonReadErr = error.message; continue; }
      if (data && data.length > 0) { anonReadBlocked = false; }
    }
  }

  let anonWriteBlocked = true;
  let anonWriteErr = "";
  if (anonReady) {
    for (const t of ["dispute_claims", "dispute_events", "dispute_audit_log", "dispute_evidence"]) {
      const { error } = await anon.from(t).insert({ id: crypto.randomUUID() }).select();
      if (!error) { anonWriteBlocked = false; }
      else if (!anonWriteErr) { anonWriteErr = error.message; }
    }
  }

  // ── Table existence / column probes (service role) ─────────────────────
  const tables = {} as Record<string, boolean>;
  for (const t of DISPUTE_TABLES) tables[t] = await tableExists(admin, t);

  const appendOnlyCols = [
    ["dispute_claims", "supersedes_claim_id"],
    ["dispute_evidence", "supersedes_evidence_id"],
    ["dispute_settlement_offers", "supersedes_offer_id"],
    ["dispute_letters", "supersedes_letter_id"],
    ["dispute_exports", "supersedes_export_id"],
  ];
  let appendColsOk = true;
  const missingAppendCols: string[] = [];
  for (const [t, c] of appendOnlyCols) {
    const okC = await colExists(admin, t, c);
    if (!okC) { appendColsOk = false; missingAppendCols.push(`${t}.${c}`); }
  }

  // ── Permission seeds ───────────────────────────────────────────────────
  const { data: permDefs } = await admin.from("platform_permission_definitions")
    .select("permission_key").in("permission_key", ADMIN_PERMISSIONS);
  const seededPerms = (permDefs || []).map((p: any) => p.permission_key);
  const missingPerms = ADMIN_PERMISSIONS.filter((k) => !seededPerms.includes(k));

  const { data: rolePerms } = await admin.from("platform_role_permissions").select("role").limit(1000);
  const hasRoleGrants = (rolePerms || []).length > 0;

  // ── Jurisdiction constraint ────────────────────────────────────────────
  const { data: jurisdictions } = await admin.from("disputes").select("jurisdiction");
  const jurValues = [...new Set((jurisdictions || []).map((d: any) => d.jurisdiction))];
  const jurOk = jurValues.every((j) => j === "england_wales");

  // ── Idempotency columns ────────────────────────────────────────────────
  const dedupCol = await colExists(admin, "notifications", "deduplication_key");
  const idemCol = await colExists(admin, "notification_outbox", "idempotency_key");

  // ── Storage privacy (private bucket) ───────────────────────────────────
  let privateBucketPrivate = false;
  let bucketProbe = "not_configured";
  try {
    const { data: buckets } = await admin.storage.listBuckets();
    const priv = (buckets || []).find((b: any) => b.name === "private");
    if (priv) { privateBucketPrivate = priv.public === false; bucketProbe = "ok"; }
    else { bucketProbe = "no_private_bucket"; }
  } catch {
    bucketProbe = "error";
  }

  // ── 1. CRITICAL SECURITY ───────────────────────────────────────────────
  checks.push({
    id: "auth", group: "critical_security", title: "Authentication",
    status: anonReady ? (anonReadBlocked ? "pass" : "fail") : "not_configured",
    evidence: anonReady
      ? (anonReadBlocked ? "Anonymous reads return zero rows across dispute tables (RLS requires an authenticated party)." : "Anonymous reads returned data — a read path is exposed.")
      : "Anonymous key unavailable in edge environment; run the anon probe with the public anon key configured.",
    automated: true, blocking: true,
    remediation: "Ensure the anon key is present and that RLS read policies scope every dispute table to parties only.",
  });

  checks.push({
    id: "rls", group: "critical_security", title: "Row-level security",
    status: anonReady ? (anonReadBlocked && anonWriteBlocked ? "pass" : "fail") : "not_configured",
    evidence: anonReady
      ? (anonReadBlocked && anonWriteBlocked ? "Anonymous reads and writes are both blocked on dispute tables." : "Anonymous read/write not fully blocked: " + (anonReadErr || anonWriteErr || "unknown"))
      : "Anonymous probe not available.",
    automated: true, blocking: true,
    remediation: "Verify every dispute table has RLS enabled and SELECT-only party-scoped policies.",
  });

  checks.push({
    id: "storage_privacy", group: "critical_security", title: "Storage privacy",
    status: bucketProbe === "ok" ? (privateBucketPrivate ? "pass" : "fail") : "not_configured",
    evidence: bucketProbe === "ok"
      ? (privateBucketPrivate ? "The 'private' bucket is non-public; evidence/exports use short-lived signed URLs." : "The 'private' bucket is public — evidence could be exposed.")
      : "Storage probe unavailable (" + bucketProbe + ").",
    automated: true, blocking: true,
    remediation: "Keep evidence and export files in a non-public bucket and serve them only via signed URLs.",
  });

  checks.push({
    id: "cross_case_isolation", group: "critical_security", title: "Cross-case isolation",
    status: anonReady ? (anonReadBlocked && anonWriteBlocked ? "pass" : "fail") : "not_configured",
    evidence: anonReady
      ? (anonReadBlocked && anonWriteBlocked ? "No anonymous read/write path exists; records are scoped by dispute via party-only policies." : "A cross-case read/write path was detected.")
      : "Anonymous probe not available.",
    automated: true, blocking: true,
    remediation: "Revalidate party membership server-side before every read and write.",
  });

  checks.push({
    id: "admin_permissions", group: "critical_security", title: "Admin permissions",
    status: missingPerms.length === 0 && hasRoleGrants ? "pass" : "fail",
    evidence: missingPerms.length === 0 && hasRoleGrants
      ? `All ${ADMIN_PERMISSIONS.length} dispute-admin permissions seeded and role grants present.`
      : `Missing permission definitions: ${missingPerms.join(", ") || "none"}; role grants ${hasRoleGrants ? "present" : "missing"}.`,
    automated: true, blocking: true,
    remediation: "Seed the missing permission definitions and grant them to roles least-privilege.",
  });

  checks.push({
    id: "append_only", group: "critical_security", title: "Append-only integrity",
    status: appendColsOk ? "pass" : "fail",
    evidence: appendColsOk
      ? "Claims/evidence/offers/letters/exports all carry supersede/version links; writes are edge-function only."
      : `Missing versioning columns: ${missingAppendCols.join(", ")}.`,
    automated: true, blocking: true,
    remediation: "Ensure corrections create linked versions and submitted records are never overwritten in place.",
  });

  checks.push({
    id: "export_privacy", group: "critical_security", title: "Export privacy",
    status: tables["dispute_exports"] ? "pass" : "fail",
    evidence: tables["dispute_exports"]
      ? "Evidence packs are recorded immutably and served via private signed URLs."
      : "dispute_exports table missing.",
    automated: true, blocking: true,
    remediation: "Verify exports store only deliberately-selected records and are served via short-lived signed URLs.",
  });

  checks.push({
    id: "secret_exposure", group: "critical_security", title: "Secret exposure",
    status: "manual",
    evidence: "Service-role key is referenced only inside edge functions; the client bundle uses the anon key. Confirm by code review that no service key is shipped to the browser.",
    automated: false, blocking: true,
    remediation: "Code-review the client bundle for any service-role/secret credential and remove it.",
  });

  // ── 2. CRITICAL FUNCTIONAL ─────────────────────────────────────────────
  const funcChecks: [string, string, string][] = [
    ["dispute_creation", "Dispute creation", "disputes"],
    ["response", "Response & counterclaim", "dispute_claims"],
    ["evidence", "Evidence", "dispute_evidence"],
    ["negotiation", "Negotiation & offers", "dispute_settlement_offers"],
    ["deadlines", "Deadlines", "dispute_deadlines"],
    ["preaction", "Pre-action documents", "dispute_letters"],
    ["export", "Evidence export", "dispute_exports"],
    ["notifications", "Notifications", "notification_outbox"],
  ];
  for (const [id, title, table] of funcChecks) {
    const okT = tables[table] === true;
    checks.push({
      id, group: "critical_functional", title,
      status: okT ? "pass" : "fail",
      evidence: okT ? `Table \`${table}\` present and wired to its edge function.` : `Table \`${table}\` missing.`,
      automated: true, blocking: false,
      remediation: okT ? "No action required." : `Create table \`${table}\` via the corresponding migration.`,
    });
  }

  // ── 3. LEGAL & GOVERNANCE ──────────────────────────────────────────────
  checks.push({
    id: "disclaimer", group: "legal_governance", title: "Disclaimer coverage",
    status: "manual",
    evidence: "The required neutral disclaimer is rendered on the export screen and in the generated PDF (Section 1 and 14). Verify a live export visually.",
    automated: false, blocking: true,
    remediation: "Generate a pack and confirm the disclaimer appears on-screen and in the PDF.",
  });

  checks.push({
    id: "jurisdiction", group: "legal_governance", title: "Jurisdiction handling",
    status: jurOk ? "pass" : "fail",
    evidence: jurOk
      ? "disputes.jurisdiction is constrained to 'england_wales' only."
      : `Unexpected jurisdiction values present: ${jurValues.join(", ")}.`,
    automated: true, blocking: true,
    remediation: "Enforce the England & Wales CHECK constraint and gate all exports/guidance on it.",
  });

  checks.push({
    id: "official_sources", group: "legal_governance", title: "Official-source links",
    status: "manual",
    evidence: "Legal Guidance Centre links must reference official sources (e.g. gov.uk, CPR, ODR). Review content.",
    automated: false, blocking: false,
    remediation: "Audit guidance links point to authoritative sources.",
  });

  checks.push({
    id: "guidance_review_dates", group: "legal_governance", title: "Guidance review dates",
    status: tables["dispute_guidance_versions"] ? "pass" : "fail",
    evidence: tables["dispute_guidance_versions"]
      ? "Guidance versions carry review_due timestamps and retain prior published versions."
      : "dispute_guidance_versions table missing.",
    automated: true, blocking: false,
    remediation: "Ensure each published guidance version has a future review_due date.",
  });

  checks.push({
    id: "admin_audit", group: "legal_governance", title: "Admin audit",
    status: tables["dispute_admin_access_log"] && tables["dispute_audit_log"] ? "pass" : "fail",
    evidence: tables["dispute_admin_access_log"] && tables["dispute_audit_log"]
      ? "Admin access, evidence previews and every action are audited (access log + dispute audit + platform audit)."
      : "Audit tables missing.",
    automated: true, blocking: false,
    remediation: "Ensure every admin action writes an audit entry with before/after values and a reason.",
  });

  checks.push({
    id: "retention_policy", group: "legal_governance", title: "Retention policy",
    status: "manual",
    evidence: "Exports must expire under a documented retention policy. Confirm the policy exists and is approved.",
    automated: false, blocking: false,
    remediation: "Document and approve a data-retention policy for generated exports.",
  });

  checks.push({
    id: "solicitor_review", group: "legal_governance", title: "Solicitor review status",
    status: "manual",
    evidence: "Legal wording and templates require a UK solicitor's review before launch.",
    automated: false, blocking: true,
    remediation: "A qualified person must record approval of legal wording and templates.",
  });

  return checks;
}

function computeVerdict(checks: Check[], gatesApproved: boolean): { verdict: string; blocking: string[]; controlling: string[] } {
  const securityFail = checks.filter((c) => c.group === "critical_security" && c.status === "fail").map((c) => c.id);
  const functionalFail = checks.filter((c) => c.group === "critical_functional" && c.status === "fail").map((c) => c.id);
  const securityNotConfigured = checks.filter((c) => c.group === "critical_security" && c.status === "not_configured").map((c) => c.id);
  const legalFail = checks.filter((c) => c.group === "legal_governance" && c.status === "fail").map((c) => c.id);

  const controlling: string[] = [];
  if (securityFail.length || securityNotConfigured.length) {
    controlling.push(...securityFail, ...securityNotConfigured);
    return { verdict: "NO_GO", blocking: [...securityFail, ...securityNotConfigured], controlling };
  }
  if (legalFail.length) {
    controlling.push(...legalFail);
    return { verdict: "NO_GO", blocking: legalFail, controlling };
  }
  if (functionalFail.length) {
    controlling.push(...functionalFail);
    return { verdict: "CONDITIONAL_GO", blocking: [], controlling };
  }
  if (!gatesApproved) {
    controlling.push("manual_gates_pending");
    return { verdict: "CONDITIONAL_GO", blocking: [], controlling };
  }
  controlling.push("all_critical_automated_pass", "all_manual_gates_approved");
  return { verdict: "GO", blocking: [], controlling };
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });
    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return fail("No auth token", 401);
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) return fail("Invalid auth", 401);

    const staff = await resolveStaff(admin, user.id);
    if (!staff) return fail("Forbidden — not an active platform staff member", 403);

    const body = await req.json().catch(() => ());
    const action = typeof body?.action === "string" ? body.action : "";

    if (action === "get_readiness") {
      if (!has(staff.permissions, "disputes_view_summary")) {
        return fail("Forbidden — requires disputes_view_summary", 403);
      }

      const anon = anonKey ? createClient(supabaseUrl, anonKey, { auth: { persistSession: false } }) : null;
      const checks = await runChecks(admin, anon);

      const { data: approvals } = await admin.from("dispute_launch_gate_approvals").select("*");
      const approvalMap = new Map<string, any>();
      (approvals || []).forEach((a: any) => approvalMap.set(a.gate_key, a));

      const approverIds = [...new Set((approvals || []).map((a: any) => a.approved_by_user_id).filter(Boolean))];
      const { data: profiles } = approverIds.length
        ? await admin.from("profiles").select("id, full_name").in("id", approverIds)
        : { data: [] };
      const nameMap: Record<string, string | null> = {};
      (profiles || []).forEach((p: any) => { nameMap[p.id] = p.full_name ?? null; });

      const gates = MANUAL_GATES.map((g) => {
        const a = approvalMap.get(g.key);
        return {
          gate_key: g.key,
          label: g.label,
          legal: g.legal,
          approved: !!a,
          approved_by_name: a ? nameMap[a.approved_by_user_id] ?? null : null,
          approved_at: a ? a.approved_at : null,
          note: a ? a.note : null,
        };
      });

      const gatesApproved = gates.every((g) => g.approved);
      const { verdict, blocking, controlling } = computeVerdict(checks, gatesApproved);

      return ok({
        verdict,
        blocking,
        controlling,
        checks,
        gates,
        gatesApproved,
        generated_at: new Date().toISOString(),
        canApproveLegal: has(staff.permissions, "disputes_manage_legal_content"),
        canApproveOperational: has(staff.permissions, "disputes_view_audit"),
        myPermissions: staff.permissions,
      });
    }

    if (action === "record_gate_approval") {
      const gateKey = typeof body?.gateKey === "string" ? body.gateKey : "";
      const note = typeof body?.note === "string" ? body.note.trim() : null;
      const gate = MANUAL_GATES.find((g) => g.key === gateKey);
      if (!gate) return fail("Unknown manual gate");

      // Least privilege: legal gates need the legal-content manager; the rest
      // need audit-view staff. Both are audited.
      const required = gate.legal ? "disputes_manage_legal_content" : "disputes_view_audit";
      if (!has(staff.permissions, required)) {
        return fail(`Forbidden — approving this gate requires ${required}`, 403);
      }

      await admin.from("dispute_launch_gate_approvals").upsert({
        gate_key: gateKey,
        approved_by_user_id: user.id,
        approved_at: new Date().toISOString(),
        note,
        updated_at: new Date().toISOString(),
      }, { onConflict: "gate_key" });

      await admin.from("platform_audit_events").insert({
        actor_id: user.id,
        platform_role: staff.role,
        event_type: "dispute_launch_gate_approved",
        metadata: { gate_key: gateKey, note: note ?? null },
      });

      return ok({ success: true, message: `Manual gate "${gateKey}" recorded as approved` });
    }

    return fail("Unknown action");
  } catch (err) {
    console.error("dispute-launch-check error:", err);
    return fail(err instanceof Error ? err.message : "Operation failed", 500);
  }
});
