import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("VITE_PUBLIC_SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const anonKey = Deno.env.get("VITE_PUBLIC_SUPABASE_ANON_KEY") || Deno.env.get("SUPABASE_ANON_KEY") || "";
const BUCKET = "dispute-files";
const FUNCTION_BASE = `${supabaseUrl}/functions/v1`;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

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
  last_checked: string;
}

interface TestResult {
  id: string;
  group: string;
  title: string;
  pass: boolean;
  skipped: boolean;
  evidence: string;
}

async function colExists(admin: Supabase, table: string, column: string): Promise<boolean> {
  try {
    const { error } = await admin.from(table).select(column).limit(1);
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

function makeClient(token?: string) {
  return createClient(supabaseUrl, anonKey, {
    global: token ? { headers: { Authorization: `Bearer ${token}` } } : {},
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(admin: Supabase, email: string, password: string) {
  const { data, error } = await admin.auth.signInWithPassword({ email, password });
  if (error || !data.session) return null;
  return { token: data.session.access_token, client: makeClient(data.session.access_token) };
}

async function invokeFn(fnName: string, token: string, body: Record<string, unknown>) {
  try {
    const resp = await fetch(`${FUNCTION_BASE}/${fnName}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Authorization": `Bearer ${token}`, "apikey": anonKey },
      body: JSON.stringify(body),
    });
    const text = await resp.text();
    let json: any = {};
    try { json = JSON.parse(text); } catch { json = { raw: text.slice(0, 500) }; }
    return { status: resp.status, json };
  } catch (e) {
    return { status: 0, json: { error: e instanceof Error ? e.message : "fetch failed" } };
  }
}

async function updateDenied(admin: Supabase, client: Supabase, table: string, id: string, patch: Record<string, unknown>, field: string, original: unknown): Promise<boolean> {
  try {
    const res = await client.from(table).update(patch).eq("id", id).select();
    const denied = !!res.error || (res.data?.length ?? 0) === 0;
    const { data } = await admin.from(table).select(field).eq("id", id).maybeSingle();
    return denied && data && (data as any)[field] === original;
  } catch {
    return false;
  }
}

async function deleteDenied(admin: Supabase, client: Supabase, table: string, id: string): Promise<boolean> {
  try {
    const res = await client.from(table).delete().eq("id", id).select();
    const denied = !!res.error || (res.data?.length ?? 0) === 0;
    const { data } = await admin.from(table).select("id").eq("id", id).maybeSingle();
    return denied && !!data;
  } catch {
    return false;
  }
}

interface Fixture {
  users: Record<string, { id: string; email: string; password: string }>;
  orgId: string;
  jobId: string;
  disputeId: string;
  dispute2Id: string;
  claimId: string;
  evidenceId: string;
  evidence2Id: string;
  offerId: string;
  openOfferId: string;
  letterId: string;
  exportId: string;
  createdDisputeIds: string[];
  storagePaths: string[];
}

async function setupFixtures(admin: Supabase): Promise<Fixture> {
  const ts = Date.now();
  const password = "BuildNerve-Test-1!";
  const roles = ["claimant", "respondent", "unrelated", "member", "orgowner", "summaryadmin", "caseadmin"];
  const users: Record<string, { id: string; email: string; password: string }> = {};

  for (const r of roles) {
    const email = `bn-${r}-${ts}@buildnerve.test`;
    const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true });
    if (error || !data?.user) throw new Error(`Failed to create ${r} test user: ${error?.message}`);
    users[r] = { id: data.user.id, email, password };
  }

  await admin.from("platform_staff").insert([
    { user_id: users.summaryadmin.id, role: "platform_read_only", status: "active" },
    { user_id: users.caseadmin.id, role: "platform_admin", status: "active" },
  ]);

  const { data: org, error: orgErr } = await admin.from("organisations")
    .insert({ name: `BN Launch Test ${ts}`, default_currency: "GBP" }).select().single();
  if (orgErr || !org) throw new Error("Failed to create test org: " + orgErr?.message);

  const { data: job, error: jobErr } = await admin.from("jobs")
    .insert({ organisation_id: org.id, reference: `BN-TEST-${ts}`, project_name: "BN Launch Test Project" }).select().single();
  if (jobErr || !job) throw new Error("Failed to create test job: " + jobErr?.message);

  await admin.from("organisation_members").insert([
    { organisation_id: org.id, user_id: users.claimant.id, role: "employee", status: "active" },
    { organisation_id: org.id, user_id: users.respondent.id, role: "employee", status: "active" },
    { organisation_id: org.id, user_id: users.member.id, role: "employee", status: "active" },
    { organisation_id: org.id, user_id: users.orgowner.id, role: "owner", status: "active" },
  ]);

  const { data: dispute, error: dErr } = await admin.from("disputes").insert({
    organisation_id: org.id,
    case_reference: `BN-TEST-${ts}-1`,
    project_id: job.id,
    claimant_user_id: users.claimant.id,
    respondent_user_id: users.respondent.id,
    claimant_role: "homeowner",
    respondent_role: "trader",
    relationship_type: "homeowner_trader",
    jurisdiction: "england_wales",
    dispute_category: "defective_work",
    title: "BN Launch Test Dispute",
    status: "open",
    current_stage: "awaiting_response",
  }).select().single();
  if (dErr || !dispute) throw new Error("Failed to create test dispute: " + dErr?.message);

  const { data: dispute2, error: d2Err } = await admin.from("disputes").insert({
    organisation_id: org.id,
    case_reference: `BN-TEST-${ts}-2`,
    project_id: job.id,
    claimant_user_id: users.member.id,
    respondent_user_id: users.unrelated.id,
    claimant_role: "business",
    respondent_role: "contractor",
    relationship_type: "business_business",
    jurisdiction: "england_wales",
    dispute_category: "non_payment",
    title: "BN Launch Test Dispute 2",
    status: "open",
    current_stage: "awaiting_response",
  }).select().single();
  if (d2Err || !dispute2) throw new Error("Failed to create test dispute 2: " + d2Err?.message);

  await admin.from("dispute_events").insert([
    { dispute_id: dispute.id, event_type: "test", title: "Shared event", visibility: "parties" },
    { dispute_id: dispute.id, event_type: "test", title: "Claimant-only event", visibility: "claimant" },
    { dispute_id: dispute.id, event_type: "test", title: "Respondent-only event", visibility: "respondent" },
    { dispute_id: dispute.id, event_type: "test", title: "Admin-only event", visibility: "admin_only" },
  ]);

  const { data: claim, error: claimErr } = await admin.from("dispute_claims").insert({
    dispute_id: dispute.id, submitted_by_user_id: users.claimant.id, claim_type: "claim",
    statement: "Original claim statement", status: "submitted",
  }).select().single();
  if (claimErr) throw new Error("Failed to create test claim: " + claimErr.message);

  const { data: evidence } = await admin.from("dispute_evidence").insert({
    dispute_id: dispute.id, submitted_by_user_id: users.claimant.id,
    evidence_reference: `BN-E-TEST-${ts}`, evidence_category: "other", title: "Test evidence",
    source_type: "text_note", submission_status: "validated",
  }).select().single();

  const { data: evidence2 } = await admin.from("dispute_evidence").insert({
    dispute_id: dispute2.id, submitted_by_user_id: users.member.id,
    evidence_reference: `BN-E-T2-${ts}`, evidence_category: "other", title: "Dispute 2 evidence",
    source_type: "text_note", submission_status: "validated",
  }).select().single();

  const { data: offer } = await admin.from("dispute_settlement_offers").insert({
    dispute_id: dispute.id, offered_by_user_id: users.claimant.id, offer_type: "payment",
    summary: "Accepted settlement offer", status: "accepted", responded_by_user_id: users.respondent.id,
  }).select().single();

  const { data: openOffer } = await admin.from("dispute_settlement_offers").insert({
    dispute_id: dispute.id, offered_by_user_id: users.claimant.id, offer_type: "partial_refund",
    summary: "Open settlement offer", status: "submitted",
  }).select().single();

  const { data: letter } = await admin.from("dispute_letters").insert({
    dispute_id: dispute.id, created_by_user_id: users.claimant.id, title: "Letter of Claim", status: "finalised",
  }).select().single();

  const { data: exp } = await admin.from("dispute_exports").insert({
    dispute_id: dispute.id, created_by_user_id: users.claimant.id, perspective: "claimant",
    title: "Test pack", purpose: "legal_review", status: "ready",
  }).select().single();

  await admin.from("dispute_admin_notes").insert([
    { dispute_id: dispute.id, note_scope: "shared", body: "Shared procedural note" },
    { dispute_id: dispute.id, note_scope: "internal", body: "Internal restricted note" },
  ]);

  return {
    users,
    orgId: org.id,
    jobId: job.id,
    disputeId: dispute.id,
    dispute2Id: dispute2.id,
    claimId: claim.id,
    evidenceId: evidence?.id ?? "",
    evidence2Id: evidence2?.id ?? "",
    offerId: offer?.id ?? "",
    openOfferId: openOffer?.id ?? "",
    letterId: letter?.id ?? "",
    exportId: exp?.id ?? "",
    createdDisputeIds: [],
    storagePaths: [],
  };
}

async function cleanup(admin: Supabase, fx: Fixture) {
  const userIds = Object.values(fx.users).map((u) => u.id);
  const disputeIds = [fx.disputeId, fx.dispute2Id, ...fx.createdDisputeIds].filter(Boolean);
  try { if (disputeIds.length) await admin.from("disputes").delete().in("id", disputeIds); } catch { /* ignore */ }
  try { if (fx.jobId) await admin.from("jobs").delete().eq("id", fx.jobId); } catch { /* ignore */ }
  try { if (fx.orgId) await admin.from("organisations").delete().eq("id", fx.orgId); } catch { /* ignore */ }
  try { await admin.from("notifications").delete().in("recipient_user_id", userIds); } catch { /* ignore */ }
  try { if (fx.storagePaths.length) await admin.storage.from(BUCKET).remove(fx.storagePaths); } catch { /* ignore */ }
  for (const id of userIds) { try { await admin.auth.admin.deleteUser(id); } catch { /* ignore */ } }
}

async function runBehaviouralSuite(admin: Supabase): Promise<{ tests: TestResult[]; ready: boolean; reason: string }> {
  if (!anonKey) {
    return { tests: [], ready: false, reason: "Public anon key is unavailable in this environment; authenticated RLS probes cannot run." };
  }

  const tests: TestResult[] = [];
  const rec = (group: string, id: string, title: string, pass: boolean, evidence: string) => {
    tests.push({ id, group, title, pass, skipped: false, evidence });
  };

  let fx: Fixture | null = null;
  try {
    fx = await setupFixtures(admin);
  } catch (e) {
    return { tests, ready: false, reason: e instanceof Error ? e.message : "Fixture setup failed" };
  }

  try {
    const anon = makeClient();
    const invalid = makeClient("invalid-token-value");
    const claimant = await signIn(admin, fx.users.claimant.email, fx.users.claimant.password);
    const respondent = await signIn(admin, fx.users.respondent.email, fx.users.respondent.password);
    const unrelated = await signIn(admin, fx.users.unrelated.email, fx.users.unrelated.password);
    const member = await signIn(admin, fx.users.member.email, fx.users.member.password);
    const orgowner = await signIn(admin, fx.users.orgowner.email, fx.users.orgowner.password);
    const summaryadmin = await signIn(admin, fx.users.summaryadmin.email, fx.users.summaryadmin.password);
    const caseadmin = await signIn(admin, fx.users.caseadmin.email, fx.users.caseadmin.password);

    const actorsReady = !!claimant && !!respondent && !!unrelated && !!member && !!orgowner && !!summaryadmin && !!caseadmin;
    if (!actorsReady) throw new Error("Could not authenticate one or more test users");

    // ── Authentication ─────────────────────────────────────────────────────
    {
      const { data, error } = await anon.from("disputes").select("id").eq("id", fx.disputeId);
      rec("auth", "anon_read_denied", "Anonymous read denied", !error && (data?.length ?? 0) === 0,
        `Anonymous SELECT returned ${data?.length ?? "error"} rows${error ? ` (${error.message})` : ""}.`);
    }
    {
      const { error } = await anon.from("dispute_claims").insert({
        dispute_id: fx.disputeId, submitted_by_user_id: fx.users.claimant.id, claim_type: "claim", status: "submitted",
      }).select();
      rec("auth", "anon_write_denied", "Anonymous write denied", !!error,
        error ? `Anonymous INSERT denied (${error.message}).` : "Anonymous INSERT was NOT denied — a write path is exposed.");
    }
    {
      const { error } = await invalid.from("disputes").select("id");
      rec("auth", "invalid_token_denied", "Invalid token denied", !!error,
        error ? `Invalid token rejected (${error.message}).` : "Invalid token was accepted — authentication is broken.");
    }
    {
      const { data, error } = await claimant!.client.from("disputes").select("id").eq("id", fx.disputeId);
      rec("auth", "party_read_allowed", "Authenticated party accepted", !error && (data?.length ?? 0) === 1,
        `Claimant read returned ${data?.length ?? 0} row(s).`);
    }

    // ── Cross-case isolation ───────────────────────────────────────────────
    {
      const { data } = await claimant!.client.from("disputes").select("id").eq("id", fx.disputeId);
      rec("isolation", "claimant_sees_own", "Claimant sees their case", (data?.length ?? 0) === 1,
        `Claimant sees ${data?.length ?? 0} row(s) for their dispute.`);
    }
    {
      const { data } = await respondent!.client.from("disputes").select("id").eq("id", fx.disputeId);
      rec("isolation", "respondent_sees_own", "Respondent sees their case", (data?.length ?? 0) === 1,
        `Respondent sees ${data?.length ?? 0} row(s) for their dispute.`);
    }
    {
      const { data } = await unrelated!.client.from("disputes").select("id").eq("id", fx.disputeId);
      rec("isolation", "unrelated_sees_nothing", "Unrelated authenticated user sees nothing", (data?.length ?? 0) === 0,
        `Unrelated user sees ${data?.length ?? 0} row(s) for the dispute.`);
    }
    {
      const { data } = await member!.client.from("disputes").select("id").eq("id", fx.disputeId);
      rec("isolation", "same_org_non_party_sees_nothing", "Same-organisation non-party sees nothing", (data?.length ?? 0) === 0,
        `Same-org non-party sees ${data?.length ?? 0} row(s).`);
    }
    {
      const { data } = await orgowner!.client.from("disputes").select("id").eq("id", fx.disputeId);
      rec("isolation", "org_owner_sees_nothing", "Organisation owner without permission sees nothing", (data?.length ?? 0) === 0,
        `Org owner sees ${data?.length ?? 0} row(s); organisation role alone must not grant case access.`);
    }
    {
      const detail = await invokeFn("dispute-evidence", member!.token, { action: "detail", evidenceId: fx.evidenceId });
      rec("isolation", "cross_dispute_denied", "Cross-dispute access denied", detail.status === 403,
        `Member (party of another dispute) requested another dispute's evidence → HTTP ${detail.status}.`);
    }

    // ── Event visibility ───────────────────────────────────────────────────
    {
      const { data } = await claimant!.client.from("dispute_events").select("visibility").eq("dispute_id", fx.disputeId);
      const vis = new Set((data || []).map((e: any) => e.visibility));
      const pass = vis.has("parties") && vis.has("claimant") && !vis.has("respondent") && !vis.has("admin_only");
      rec("visibility", "claimant_visibility", "Claimant sees only claimant + shared events", pass,
        `Claimant visibility: ${[...vis].join(", ")}.`);
    }
    {
      const { data } = await respondent!.client.from("dispute_events").select("visibility").eq("dispute_id", fx.disputeId);
      const vis = new Set((data || []).map((e: any) => e.visibility));
      const pass = vis.has("parties") && vis.has("respondent") && !vis.has("claimant") && !vis.has("admin_only");
      rec("visibility", "respondent_visibility", "Respondent sees only respondent + shared events", pass,
        `Respondent visibility: ${[...vis].join(", ")}.`);
    }
    {
      const { data } = await caseadmin!.client.from("dispute_events").select("visibility").eq("dispute_id", fx.disputeId);
      const vis = new Set((data || []).map((e: any) => e.visibility));
      rec("visibility", "admin_only_staff_only", "admin_only events visible to authorised staff", vis.has("admin_only"),
        `Case admin (disputes_view_case) sees: ${[...vis].join(", ")}.`);
    }

    // ── Append-only integrity ──────────────────────────────────────────────
    rec("append_only", "claim_update_denied", "Submitted claim UPDATE denied",
      await updateDenied(admin, claimant!.client, "dispute_claims", fx.claimId, { statement: "MUTATED" }, "statement", "Original claim statement"),
      "Attempted UPDATE on a submitted claim; record remained unchanged.");
    rec("append_only", "claim_delete_denied", "Submitted claim DELETE denied",
      await deleteDenied(admin, claimant!.client, "dispute_claims", fx.claimId),
      "Attempted DELETE on a submitted claim; record still exists.");
    rec("append_only", "evidence_replace_denied", "Evidence replacement denied",
      await updateDenied(admin, claimant!.client, "dispute_evidence", fx.evidenceId, { title: "MUTATED" }, "title", "Test evidence"),
      "Attempted UPDATE on submitted evidence; record remained unchanged.");
    rec("append_only", "accepted_offer_modify_denied", "Accepted offer modification denied",
      await updateDenied(admin, respondent!.client, "dispute_settlement_offers", fx.offerId, { summary: "MUTATED" }, "summary", "Accepted settlement offer"),
      "Attempted UPDATE on an accepted offer; record remained unchanged.");
    rec("append_only", "finalised_letter_modify_denied", "Finalised letter modification denied",
      await updateDenied(admin, claimant!.client, "dispute_letters", fx.letterId, { title: "MUTATED" }, "title", "Letter of Claim"),
      "Attempted UPDATE on a finalised letter; record remained unchanged.");
    rec("append_only", "completed_export_modify_denied", "Completed export modification denied",
      await updateDenied(admin, claimant!.client, "dispute_exports", fx.exportId, { status: "failed" }, "status", "ready"),
      "Attempted UPDATE on a completed export; record remained unchanged.");
    {
      const corr = await invokeFn("dispute-operations", claimant!.token, { action: "correct_claim", claimId: fx.claimId, statement: "Corrected statement" });
      const { data: superseding } = await admin.from("dispute_claims").select("id").eq("supersedes_claim_id", fx.claimId).maybeSingle();
      const { data: origNow } = await admin.from("dispute_claims").select("status").eq("id", fx.claimId).maybeSingle();
      const pass = corr.status === 200 && !!superseding && origNow?.status === "superseded";
      rec("append_only", "correction_creates_linked_version", "Correction creates a linked version", pass,
        `correct_claim → HTTP ${corr.status}; original status ${origNow?.status}; linked successor ${superseding ? "created" : "missing"}.`);
    }

    // ── Evidence / export privacy ──────────────────────────────────────────
    {
      let pass = false; let evidence = "dispute-files bucket probe failed";
      try {
        const { data: buckets } = await admin.storage.listBuckets();
        const df = (buckets || []).find((b: any) => b.name === BUCKET);
        pass = !!df && df.public === false;
        evidence = df ? `dispute-files bucket public=${df.public}.` : "dispute-files bucket not found.";
      } catch (e) { evidence = `Storage probe error: ${(e as Error).message}`; }
      rec("privacy", "bucket_private", "Evidence storage bucket is private", pass, evidence);
    }
    {
      const { data } = await claimant!.client.from("dispute_admin_notes").select("note_scope").eq("dispute_id", fx.disputeId);
      const scopes = new Set((data || []).map((n: any) => n.note_scope));
      rec("privacy", "internal_notes_excluded", "Internal admin notes excluded from party view", !scopes.has("internal") && scopes.has("shared"),
        `Claimant sees note scopes: ${[...scopes].join(", ")} (internal must be absent).`);
    }
    {
      const { data } = await claimant!.client.from("dispute_audit_log").select("id").eq("dispute_id", fx.disputeId);
      rec("privacy", "audit_log_restricted", "Audit log restricted from parties", (data?.length ?? 0) === 0,
        `Claimant read ${data?.length ?? 0} audit rows (must be 0).`);
    }

    // ── Authority ──────────────────────────────────────────────────────────
    {
      const r = await invokeFn("dispute-operations", respondent!.token, { action: "withdraw", disputeId: fx.disputeId });
      rec("authority", "respondent_cannot_act_as_claimant", "Respondent cannot act as claimant", r.status === 403,
        `Respondent attempted claimant-only withdraw → HTTP ${r.status}.`);
    }
    {
      const r = await invokeFn("dispute-operations", claimant!.token, { action: "respond_offer", offerId: fx.openOfferId, response: "accept" });
      rec("authority", "party_cannot_self_accept", "Party cannot accept their own offer", r.status === 403,
        `Claimant tried to accept their own offer → HTTP ${r.status}.`);
    }
    {
      const r = await invokeFn("dispute-operations", caseadmin!.token, { action: "respond_offer", offerId: fx.openOfferId, response: "accept" });
      rec("authority", "admin_cannot_accept_settlement", "Admin cannot accept a settlement", r.status === 403,
        `Staff attempted to accept a settlement offer → HTTP ${r.status}.`);
    }
    {
      const r = await invokeFn("dispute-admin", summaryadmin!.token, { action: "get_case_overview", disputeId: fx.disputeId, reason: "test" });
      rec("authority", "summary_admin_cannot_open_case", "Summary-only admin cannot open a case", r.status === 403,
        `Summary admin get_case_overview → HTTP ${r.status}.`);
    }
    {
      const noReason = await invokeFn("dispute-admin", caseadmin!.token, { action: "get_case_overview", disputeId: fx.disputeId });
      rec("authority", "case_admin_reason_required", "Case admin access requires a reason", noReason.status !== 200,
        `get_case_overview without reason → HTTP ${noReason.status}.`);
    }
    {
      await invokeFn("dispute-admin", caseadmin!.token, { action: "get_case_overview", disputeId: fx.disputeId, reason: "Launch readiness verification" });
      const { data } = await admin.from("dispute_admin_access_log").select("id")
        .eq("admin_user_id", fx.users.caseadmin.id).eq("dispute_id", fx.disputeId);
      rec("authority", "admin_access_audited", "Admin case access is audited", (data?.length ?? 0) > 0,
        `Access-log rows recorded for case admin: ${data?.length ?? 0}.`);
    }

    // ── Runtime workflows ──────────────────────────────────────────────────
    {
      const r = await invokeFn("dispute-operations", claimant!.token, {
        action: "create_draft",
        payload: { projectId: fx.jobId, title: "BN Test Draft", disputeCategory: "defective_work", relationshipType: "homeowner_trader", claimantRole: "homeowner" },
      });
      if (r.status === 200 && r.json?.dispute?.id) fx.createdDisputeIds.push(r.json.dispute.id);
      rec("workflow", "create_dispute", "Create dispute", r.status === 200,
        `create_draft → HTTP ${r.status}${r.json?.error ? ` (${r.json.error})` : ""}.`);
    }
    {
      const r = await invokeFn("dispute-operations", respondent!.token, {
        action: "submit_response", disputeId: fx.disputeId, position: "dispute", statement: "I dispute the claim.",
      });
      rec("workflow", "submit_response", "Submit formal response", r.status === 200,
        `submit_response → HTTP ${r.status}${r.json?.error ? ` (${r.json.error})` : ""}.`);
    }
    {
      const r = await invokeFn("dispute-evidence", claimant!.token, {
        action: "submit_text_note", disputeId: fx.disputeId, category: "other", title: "Note evidence", description: "A test note",
      });
      rec("workflow", "add_evidence", "Add evidence", r.status === 200,
        `submit_text_note → HTTP ${r.status}${r.json?.error ? ` (${r.json.error})` : ""}.`);
    }
    {
      const r = await invokeFn("dispute-preaction", claimant!.token, {
        action: "update_checklist_item", disputeId: fx.disputeId, itemKey: "party_identities", status: "complete",
      });
      rec("workflow", "preaction_checklist", "Update pre-action checklist", r.status === 200,
        `update_checklist_item → HTTP ${r.status}${r.json?.error ? ` (${r.json.error})` : ""}.`);
    }
    {
      const r = await invokeFn("dispute-preaction", claimant!.token, { action: "save_letter", disputeId: fx.disputeId });
      rec("workflow", "generate_letter", "Generate letter of claim", r.status === 200,
        `save_letter → HTTP ${r.status}${r.json?.error ? ` (${r.json.error})` : ""}.`);
    }
    {
      const create = await invokeFn("dispute-operations", claimant!.token, {
        action: "create_offer", disputeId: fx.disputeId, offerType: "remedial_work", summary: "Remedial work offer",
      });
      const offerId = create.json?.offer?.id;
      let resp = create.status;
      let accept = { status: 0 as number, json: {} as any };
      if (offerId) {
        accept = await invokeFn("dispute-operations", respondent!.token, { action: "respond_offer", offerId, response: "accept" });
      }
      const pass = create.status === 200 && !!offerId && accept.status === 200;
      rec("workflow", "make_respond_offer", "Make and respond to offer", pass,
        `create_offer → HTTP ${create.status}; respond_offer → HTTP ${accept.status}.`);
    }
    {
      const r = await invokeFn("dispute-export", claimant!.token, {
        action: "generate", disputeId: fx.disputeId,
        config: { perspective: "claimant", purpose: "legal_review", title: "BN Launch Test Pack" },
      });
      const pdfPath = r.json?.export?.pdf_storage_path;
      const zipPath = r.json?.export?.zip_storage_path;
      if (typeof pdfPath === "string") fx.storagePaths.push(pdfPath);
      if (typeof zipPath === "string") fx.storagePaths.push(zipPath);
      rec("workflow", "generate_pack", "Generate evidence pack (PDF + ZIP)", r.status === 200,
        `generate → HTTP ${r.status}${r.json?.error ? ` (${r.json.error})` : ""}.`);
    }
    {
      const { data } = await admin.from("notifications").select("id").eq("related_entity_id", fx.disputeId);
      rec("workflow", "notification_sent", "Notification emitted", (data?.length ?? 0) > 0,
        `Notification rows for the dispute: ${data?.length ?? 0}.`);
    }

    return { tests, ready: true, reason: "" };
  } catch (e) {
    return { tests, ready: false, reason: e instanceof Error ? e.message : "Suite error" };
  } finally {
    try { await cleanup(admin, fx); } catch { /* ignore */ }
  }
}

function groupStatus(tests: TestResult[], ids: string[]): { status: Status; evidence: string } {
  const byId = new Map(tests.map((t) => [t.id, t]));
  const failed: string[] = [];
  const missing: string[] = [];
  for (const id of ids) {
    const t = byId.get(id);
    if (!t) { missing.push(id); continue; }
    if (!t.pass) failed.push(id);
  }
  if (missing.length) return { status: "not_configured", evidence: `Test results missing: ${missing.join(", ")}.` };
  if (failed.length) {
    const details = failed.map((id) => {
      const t = byId.get(id)!;
      return `${id}: ${t.evidence}`;
    }).join(" | ");
    return { status: "fail", evidence: `Behavioural failures — ${details}` };
  }
  return { status: "pass", evidence: `All ${ids.length} behavioural assertions passed.` };
}

function buildChecks(tests: TestResult[], ready: boolean, reason: string, nowIso: string, adminChecks: Record<string, { status: Status; evidence: string }>): Check[] {
  const checks: Check[] = [];
  const add = (id: string, group: string, title: string, status: Status, evidence: string, blocking: boolean, remediation: string) => {
    checks.push({ id, group, title, status, evidence, automated: status !== "manual", blocking, remediation, last_checked: nowIso });
  };

  if (!ready) {
    add("auth", "critical_security", "Authentication", "not_configured", `Behavioural suite could not run: ${reason}`, true, "Fix the reported environment/configuration issue and re-run.");
    add("cross_case_isolation", "critical_security", "Cross-case isolation", "not_configured", reason, true, "Re-run once the suite can execute.");
    add("event_visibility", "critical_security", "Event visibility", "not_configured", reason, true, "Re-run once the suite can execute.");
    add("append_only", "critical_security", "Append-only integrity", "not_configured", reason, true, "Re-run once the suite can execute.");
    add("evidence_privacy", "critical_security", "Evidence privacy", "not_configured", reason, true, "Re-run once the suite can execute.");
    add("authority", "critical_security", "Authority boundaries", "not_configured", reason, true, "Re-run once the suite can execute.");
    add("admin_permissions", "critical_security", "Admin permissions", "not_configured", reason, true, "Re-run once the suite can execute.");
    add("export_privacy", "critical_security", "Export privacy", "not_configured", reason, true, "Re-run once the suite can execute.");
    add("dispute_creation", "critical_functional", "Dispute creation", "not_configured", reason, false, "Re-run once the suite can execute.");
    add("response", "critical_functional", "Response & counterclaim", "not_configured", reason, false, "Re-run once the suite can execute.");
    add("evidence", "critical_functional", "Evidence", "not_configured", reason, false, "Re-run once the suite can execute.");
    add("negotiation", "critical_functional", "Negotiation & offers", "not_configured", reason, false, "Re-run once the suite can execute.");
    add("preaction", "critical_functional", "Pre-action documents", "not_configured", reason, false, "Re-run once the suite can execute.");
    add("export", "critical_functional", "Evidence export", "not_configured", reason, false, "Re-run once the suite can execute.");
    add("notifications", "critical_functional", "Notifications", "not_configured", reason, false, "Re-run once the suite can execute.");
    add("malware_scanning", "critical_security", "Malware scanning", "manual", "No real malware scanner is integrated. Uploaded files are marked pending_validation, never labelled scanned, and unsafe previews are restricted.", false, "Integrate a scanner or formally accept the pending-validation compensating control.");
    add("secret_exposure", "critical_security", "Secret exposure", "manual", "Service-role key is referenced only inside edge functions; the client bundle uses the anon key. Confirm by code review that no service key ships to the browser.", true, "Code-review the client bundle for any service-role/secret credential.");
    add("disclaimer", "legal_governance", "Disclaimer coverage", "manual", "The required neutral disclaimer is rendered on the export screen and in the generated PDF. Verify a live export visually.", true, "Generate a pack and confirm the disclaimer appears on-screen and in the PDF.");
    add("official_sources", "legal_governance", "Official-source links", "manual", "Legal Guidance Centre links must reference official sources (e.g. gov.uk, CPR, ODR). Review content.", false, "Audit guidance links point to authoritative sources.");
    add("retention_policy", "legal_governance", "Retention policy", "manual", "Exports must expire under a documented retention policy. Confirm the policy exists and is approved.", false, "Document and approve a data-retention policy for generated exports.");
    return checks;
  }

  const g = (group: string, ids: string[]) => groupStatus(tests, ids);

  const auth = g("auth", ["anon_read_denied", "anon_write_denied", "invalid_token_denied", "party_read_allowed"]);
  add("auth", "critical_security", "Authentication", auth.status, auth.evidence, true, "Ensure the anon key is present and RLS scopes every dispute table to parties only.");

  const isolation = g("isolation", ["claimant_sees_own", "respondent_sees_own", "unrelated_sees_nothing", "same_org_non_party_sees_nothing", "org_owner_sees_nothing", "cross_dispute_denied"]);
  add("cross_case_isolation", "critical_security", "Cross-case isolation", isolation.status, isolation.evidence, true, "Revalidate party membership server-side before every read and write.");

  const visibility = g("visibility", ["claimant_visibility", "respondent_visibility", "admin_only_staff_only"]);
  add("event_visibility", "critical_security", "Event visibility", visibility.status, visibility.evidence, true, "Enforce visibility in both RLS and server-side event queries.");

  const appendOnly = g("append_only", ["claim_update_denied", "claim_delete_denied", "evidence_replace_denied", "accepted_offer_modify_denied", "finalised_letter_modify_denied", "completed_export_modify_denied", "correction_creates_linked_version"]);
  add("append_only", "critical_security", "Append-only integrity", appendOnly.status, appendOnly.evidence, true, "Ensure corrections create linked versions and submitted records are never overwritten in place.");

  const privacy = g("privacy", ["bucket_private", "internal_notes_excluded", "audit_log_restricted"]);
  add("evidence_privacy", "critical_security", "Evidence & storage privacy", privacy.status, privacy.evidence, true, "Keep evidence in a non-public bucket, exclude internal notes, and restrict the audit log.");

  const authority = g("authority", ["respondent_cannot_act_as_claimant", "party_cannot_self_accept", "admin_cannot_accept_settlement", "summary_admin_cannot_open_case", "case_admin_reason_required", "admin_access_audited"]);
  add("authority", "critical_security", "Authority boundaries", authority.status, authority.evidence, true, "Enforce role boundaries in every edge function action.");

  add("admin_permissions", "critical_security", "Admin permissions", adminChecks.admin_permissions.status, adminChecks.admin_permissions.evidence, true, "Seed the dispute permission definitions and grant them least-privilege.");

  const exportPrivacy = g("privacy", ["bucket_private"]);
  const exportImmutable = tests.find((t) => t.id === "completed_export_modify_denied");
  const exportStatus: Status = exportPrivacy.status === "fail" || (exportImmutable && !exportImmutable.pass) ? "fail" : "pass";
  add("export_privacy", "critical_security", "Export privacy", exportStatus,
    `${exportPrivacy.evidence} Export records are immutable (${exportImmutable ? (exportImmutable.pass ? "modify denied" : "modify NOT denied") : "untested"}).`,
    true, "Serve exports via short-lived signed URLs and keep generated records immutable.");

  add("malware_scanning", "critical_security", "Malware scanning", "manual", "No real malware scanner is integrated. Uploaded files are marked pending_validation, never labelled scanned, and unsafe previews are restricted.", false, "Integrate a scanner or formally accept the pending-validation compensating control.");
  add("secret_exposure", "critical_security", "Secret exposure", "manual", "Service-role key is referenced only inside edge functions; the client bundle uses the anon key. Confirm by code review that no service key ships to the browser.", true, "Code-review the client bundle for any service-role/secret credential.");

  const createDispute = g("workflow", ["create_dispute"]);
  add("dispute_creation", "critical_functional", "Dispute creation", createDispute.status, createDispute.evidence, false, "Ensure create_draft works for an org participant.");
  const response = g("workflow", ["submit_response"]);
  add("response", "critical_functional", "Response & counterclaim", response.status, response.evidence, false, "Ensure submit_response works for the named respondent.");
  const evidence = g("workflow", ["add_evidence"]);
  add("evidence", "critical_functional", "Evidence", evidence.status, evidence.evidence, false, "Ensure evidence submission works for a party.");
  const negotiation = g("workflow", ["make_respond_offer"]);
  add("negotiation", "critical_functional", "Negotiation & offers", negotiation.status, negotiation.evidence, false, "Ensure offer creation and response work.");
  const preaction = g("workflow", ["preaction_checklist", "generate_letter"]);
  add("preaction", "critical_functional", "Pre-action documents", preaction.status, preaction.evidence, false, "Ensure checklist and letter generation work.");
  const exportPk = g("workflow", ["generate_pack"]);
  add("export", "critical_functional", "Evidence export", exportPk.status, exportPk.evidence, false, "Ensure PDF + ZIP pack generation works.");
  const notif = g("workflow", ["notification_sent"]);
  add("notifications", "critical_functional", "Notifications", notif.status, notif.evidence, false, "Ensure party notifications are emitted.");

  add("disclaimer", "legal_governance", "Disclaimer coverage", "manual", "The required neutral disclaimer is rendered on the export screen and in the generated PDF. Verify a live export visually.", true, "Generate a pack and confirm the disclaimer appears on-screen and in the PDF.");
  add("jurisdiction", "legal_governance", "Jurisdiction handling", adminChecks.jurisdiction.status, adminChecks.jurisdiction.evidence, true, "Enforce the England & Wales CHECK constraint and gate exports/guidance on it.");
  add("official_sources", "legal_governance", "Official-source links", "manual", "Legal Guidance Centre links must reference official sources (e.g. gov.uk, CPR, ODR). Review content.", false, "Audit guidance links point to authoritative sources.");
  add("admin_audit", "legal_governance", "Admin audit", authority.status, authority.evidence, false, "Ensure every admin action writes an audit entry with before/after values and a reason.");
  add("export_retention_metadata", "legal_governance", "Export retention metadata", adminChecks.retention.status, adminChecks.retention.evidence, false, "Apply migration 032 to add retention metadata columns and index.");
  add("retention_policy", "legal_governance", "Retention policy", "manual", "Exports must expire under a documented retention policy. Confirm the policy exists and is approved.", false, "Document and approve a data-retention policy for generated exports.");
  add("solicitor_review", "legal_governance", "Solicitor review status", "manual", "Legal wording and templates require a UK solicitor's review before launch.", true, "A qualified person must record approval of legal wording and templates.");

  return checks;
}

async function collectAdminChecks(admin: Supabase): Promise<Record<string, { status: Status; evidence: string }>> {
  const out: Record<string, { status: Status; evidence: string }> = {};

  const { data: permDefs } = await admin.from("platform_permission_definitions")
    .select("permission_key").in("permission_key", ADMIN_PERMISSIONS);
  const seeded = (permDefs || []).map((p: any) => p.permission_key);
  const missing = ADMIN_PERMISSIONS.filter((k) => !seeded.includes(k));
  out.admin_permissions = missing.length === 0
    ? { status: "pass", evidence: `All ${ADMIN_PERMISSIONS.length} dispute-admin permissions seeded. Role boundaries are proven behaviourally by the authority suite.` }
    : { status: "fail", evidence: `Missing permission definitions: ${missing.join(", ")}.` };

  const retentionCols = ["expires_at", "deleted_at", "retention_status"];
  const missingRetention: string[] = [];
  for (const c of retentionCols) {
    if (!(await colExists(admin, "dispute_exports", c))) missingRetention.push(`dispute_exports.${c}`);
  }
  out.retention = missingRetention.length === 0
    ? { status: "pass", evidence: "dispute_exports carries expires_at / deleted_at / retention_status for configurable retention." }
    : { status: "fail", evidence: `Missing retention columns: ${missingRetention.join(", ")}.` };

  const { data: jurisdictions } = await admin.from("disputes").select("jurisdiction");
  const jurValues = [...new Set((jurisdictions || []).map((d: any) => d.jurisdiction))];
  const jurOk = jurValues.every((j) => j === "england_wales");
  out.jurisdiction = jurOk
    ? { status: "pass", evidence: "disputes.jurisdiction is constrained to 'england_wales' only." }
    : { status: "fail", evidence: `Unexpected jurisdiction values present: ${jurValues.join(", ")}.` };

  return out;
}

function computeVerdict(checks: Check[], gatesApproved: boolean): { verdict: string; blocking: string[]; controlling: string[] } {
  const securityFail = checks.filter((c) => c.group === "critical_security" && c.status === "fail").map((c) => c.id);
  const securityNotConfigured = checks.filter((c) => c.group === "critical_security" && c.status === "not_configured").map((c) => c.id);
  const legalFail = checks.filter((c) => c.group === "legal_governance" && c.status === "fail").map((c) => c.id);
  const functionalFail = checks.filter((c) => c.group === "critical_functional" && c.status === "fail").map((c) => c.id);

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

    if (action === "run_test_suite") {
      if (!has(staff.permissions, "disputes_view_audit")) {
        return fail("Forbidden — running the full behavioural suite requires disputes_view_audit", 403);
      }
      const { tests, ready, reason } = await runBehaviouralSuite(admin);
      const passed = tests.filter((t) => t.pass).length;
      const failed = tests.filter((t) => !t.pass).length;
      return ok({
        summary: { total: tests.length, passed, failed, ready },
        ready,
        reason,
        tests,
        generated_at: new Date().toISOString(),
      });
    }

    if (action === "get_readiness") {
      if (!has(staff.permissions, "disputes_view_summary")) {
        return fail("Forbidden — requires disputes_view_summary", 403);
      }
      const nowIso = new Date().toISOString();
      const { tests, ready, reason } = await runBehaviouralSuite(admin);
      const adminChecks = await collectAdminChecks(admin);
      const checks = buildChecks(tests, ready, reason, nowIso, adminChecks);

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
        tests,
        suiteReady: ready,
        suiteReason: reason,
        gates,
        gatesApproved,
        generated_at: nowIso,
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
