import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("VITE_PUBLIC_SUPABASE_URL") || Deno.env.get("SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "dispute-files";
const SIGNED_URL_EXPIRY = 900; // 15 minutes — short-lived signed URLs

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ALL_PERMISSIONS = [
  "disputes_view_summary",
  "disputes_view_case",
  "disputes_support",
  "disputes_manage_safety",
  "disputes_manage_deadlines",
  "disputes_view_audit",
  "disputes_export_audit",
  "disputes_manage_legal_content",
];

const ACTIVE_STATUSES = [
  "open", "awaiting_response", "under_discussion", "evidence_collection",
  "negotiation", "mediation_considered", "pre_action",
];

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function fail(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

type AdminClient = ReturnType<typeof createClient>;

// Resolve the caller's staff record + permissions (or null if not staff).
async function resolveStaff(admin: AdminClient, userId: string) {
  const { data: staff } = await admin
    .from("platform_staff")
    .select("role, status")
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  if (!staff) return null;

  const { data: perms } = await admin
    .from("platform_role_permissions")
    .select("permission_definitions(permission_key)")
    .eq("role", staff.role);
  const permissions = (perms || [])
    .map((p: any) => p.permission_definitions?.permission_key)
    .filter((k: string) => ALL_PERMISSIONS.includes(k));
  return { role: staff.role as string, permissions: permissions as string[] };
}

function has(perms: string[] | null, key: string): boolean {
  return !!perms && perms.includes(key);
}

async function profileNames(admin: AdminClient, ids: string[]): Promise<Record<string, string | null>> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return {};
  const { data } = await admin.from("profiles").select("id, full_name").in("id", unique);
  const map: Record<string, string | null> = {};
  (data || []).forEach((p: any) => { map[p.id] = p.full_name ?? null; });
  return map;
}

async function disputeAudit(admin: AdminClient, disputeId: string, userId: string, action: string, extra: Record<string, unknown> = {}) {
  await admin.from("dispute_audit_log").insert({
    dispute_id: disputeId,
    actor_user_id: userId,
    action,
    ...extra,
  });
}

async function platformAudit(admin: AdminClient, userId: string, role: string, eventType: string, extra: Record<string, unknown> = {}) {
  await admin.from("platform_audit_events").insert({
    actor_id: userId,
    platform_role: role,
    event_type: eventType,
    ...extra,
  });
}

async function timeline(admin: AdminClient, disputeId: string, userId: string, eventType: string, title: string, extra: Record<string, unknown> = {}) {
  await admin.from("dispute_events").insert({
    dispute_id: disputeId,
    event_type: eventType,
    actor_user_id: userId,
    actor_role: "platform_admin",
    title,
    visibility: "parties",
    ...extra,
  });
}

async function notifyParties(admin: AdminClient, dispute: any, notificationType: string, title: string, body: string, priority = "normal", dedupSuffix = "") {
  const recipients = [dispute.claimant_user_id, dispute.respondent_user_id].filter(Boolean);
  for (const rid of [...new Set(recipients)]) {
    await admin.from("notifications").insert({
      organisation_id: dispute.organisation_id,
      recipient_user_id: rid,
      notification_type: notificationType,
      category: "system",
      title,
      body,
      priority,
      related_entity_type: "dispute",
      related_entity_id: dispute.id,
      job_id: dispute.project_id,
      action_route: `/disputes/${dispute.id}`,
      action_label: "View dispute",
      deduplication_key: `dispute-admin:${dispute.id}:${notificationType}${dedupSuffix}`,
    });
  }
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

    // ── get_my_permissions ────────────────────────────────────────────────
    if (action === "get_my_permissions") {
      return ok({ role: staff.role, permissions: staff.permissions });
    }

    // ── get_dashboard ─────────────────────────────────────────────────────
    if (action === "get_dashboard") {
      if (!has(staff.permissions, "disputes_view_summary")) return fail("Forbidden — requires disputes_view_summary", 403);

      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const [
        { count: openDisputes },
        { count: awaitingResponse },
        { count: overdue },
        { count: negotiations },
        { count: preAction },
        { count: resolvedThisMonth },
        { count: pendingEvidence },
        { count: notifFailures },
        { data: disputes },
        { data: staffRows },
      ] = await Promise.all([
        admin.from("disputes").select("id", { count: "exact", head: true }).in("status", ACTIVE_STATUSES),
        admin.from("disputes").select("id", { count: "exact", head: true }).in("status", ["open", "awaiting_response"]),
        admin.from("dispute_deadlines").select("id", { count: "exact", head: true }).eq("status", "overdue"),
        admin.from("disputes").select("id", { count: "exact", head: true }).in("status", ["negotiation", "mediation_considered"]),
        admin.from("disputes").select("id", { count: "exact", head: true }).eq("status", "pre_action"),
        admin.from("disputes").select("id", { count: "exact", head: true }).gte("resolved_at", startOfMonth.toISOString()),
        admin.from("dispute_evidence").select("id", { count: "exact", head: true }).eq("submission_status", "pending_validation"),
        admin.from("notification_outbox").select("id", { count: "exact", head: true }).in("status", ["failed", "permanent_failure"]),
        admin.from("disputes").select("id, case_reference, project_id, status, current_stage, dispute_category, jurisdiction, opened_at, safety_flag, support_owner_user_id, created_at").order("created_at", { ascending: false }).limit(500),
        admin.from("platform_staff").select("user_id").eq("status", "active"),
      ]);

      const projectIds = [...new Set((disputes || []).map((d: any) => d.project_id))];
      const disputeIds = (disputes || []).map((d: any) => d.id);
      const ownerIds = [...new Set((disputes || []).map((d: any) => d.support_owner_user_id).filter(Boolean))];
      const staffUserIds = (staffRows || []).map((s: any) => s.user_id);

      const [{ data: jobs }, { data: overdueRows }, names] = await Promise.all([
        admin.from("jobs").select("id, reference, project_name").in("id", projectIds),
        admin.from("dispute_deadlines").select("dispute_id").eq("status", "overdue"),
        profileNames(admin, [...ownerIds, ...staffUserIds]),
      ]);

      const jobMap: Record<string, any> = {};
      (jobs || []).forEach((j: any) => { jobMap[j.id] = j; });
      const overdueDisputeIds = new Set((overdueRows || []).map((o: any) => o.dispute_id));

      const items = (disputes || []).map((d: any) => ({
        id: d.id,
        case_reference: d.case_reference,
        project_name: jobMap[d.project_id]?.project_name ?? null,
        project_reference: jobMap[d.project_id]?.reference ?? null,
        status: d.status,
        current_stage: d.current_stage,
        dispute_category: d.dispute_category,
        jurisdiction: d.jurisdiction,
        opened_at: d.opened_at,
        overdue: overdueDisputeIds.has(d.id),
        safety_flag: d.safety_flag,
        support_owner_user_id: d.support_owner_user_id,
        support_owner_name: d.support_owner_user_id ? names[d.support_owner_user_id] ?? null : null,
        awaiting_response: d.status === "open" || d.status === "awaiting_response",
        created_at: d.created_at,
      }));

      const supportOwners = staffUserIds.map((id: string) => ({ user_id: id, name: names[id] ?? "Staff member" }));

      return ok({
        metrics: {
          openDisputes: openDisputes ?? 0,
          awaitingResponse: awaitingResponse ?? 0,
          overduePlatformActions: overdue ?? 0,
          activeNegotiations: negotiations ?? 0,
          preActionCases: preAction ?? 0,
          resolvedThisMonth: resolvedThisMonth ?? 0,
          evidenceAwaitingValidation: pendingEvidence ?? 0,
          notificationFailures: notifFailures ?? 0,
        },
        items,
        supportOwners,
      });
    }

    // ── get_case_overview (read-only, requires reason + view_case) ────────
    if (action === "get_case_overview") {
      if (!has(staff.permissions, "disputes_view_case")) return fail("Forbidden — requires disputes_view_case", 403);
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
      if (!disputeId) return fail("disputeId is required");
      if (!reason) return fail("A documented support or compliance reason is required to open this case");

      const { data: dispute } = await admin.from("disputes").select("*").eq("id", disputeId).maybeSingle();
      if (!dispute) return fail("Dispute not found", 404);

      const [
        { data: job }, { data: parties }, { data: claims }, { data: evidence },
        { data: events }, { data: offers }, { data: deadlines }, { data: outbox },
        { data: exports }, { data: notes }, { data: restrictions }, { data: safetyReports },
        { data: auditTrail },
      ] = await Promise.all([
        admin.from("jobs").select("id, reference, project_name").eq("id", dispute.project_id).maybeSingle(),
        admin.from("dispute_parties").select("*").eq("dispute_id", disputeId).order("joined_at", { ascending: true }),
        admin.from("dispute_claims").select("*").eq("dispute_id", disputeId).order("submitted_at", { ascending: true }),
        admin.from("dispute_evidence").select("*").eq("dispute_id", disputeId).order("submitted_at", { ascending: true }),
        admin.from("dispute_events").select("*").eq("dispute_id", disputeId).order("created_at", { ascending: true }),
        admin.from("dispute_settlement_offers").select("*").eq("dispute_id", disputeId).order("created_at", { ascending: true }),
        admin.from("dispute_deadlines").select("*").eq("dispute_id", disputeId).order("due_at", { ascending: true }),
        admin.from("notification_outbox").select("*").eq("related_entity_type", "dispute").eq("related_entity_id", disputeId).order("created_at", { ascending: false }),
        admin.from("dispute_exports").select("*").eq("dispute_id", disputeId).order("created_at", { ascending: false }),
        admin.from("dispute_admin_notes").select("*").eq("dispute_id", disputeId).order("created_at", { ascending: true }),
        admin.from("dispute_content_restrictions").select("*").eq("dispute_id", disputeId).order("restricted_at", { ascending: false }),
        admin.from("dispute_safety_reports").select("*").eq("dispute_id", disputeId).order("created_at", { ascending: false }),
        admin.from("dispute_audit_log").select("*").eq("dispute_id", disputeId).order("created_at", { ascending: true }),
      ]);

      const userNames = await profileNames(admin, [
        ...(claims || []).map((c: any) => c.submitted_by_user_id),
        ...(offers || []).map((o: any) => o.offered_by_user_id),
        ...(deadlines || []).map((d: any) => d.actor_user_id),
        ...(evidence || []).map((e: any) => e.submitted_by_user_id),
        ...(notes || []).map((n: any) => n.author_user_id),
        ...(safetyReports || []).map((s: any) => s.reporting_user_id),
        dispute.support_owner_user_id,
      ]);

      const roleFor = (uid: string) => uid === dispute.claimant_user_id ? "claimant" : uid === dispute.respondent_user_id ? "respondent" : null;

      // Record access audit (sections viewed reflects this overview request).
      await admin.from("dispute_admin_access_log").insert({
        admin_user_id: user.id,
        dispute_id: disputeId,
        access_reason: reason,
        sections_viewed: ["overview", "parties", "claims", "evidence_index", "timeline", "negotiation", "deadlines", "notifications", "exports", "notes", "audit"],
        action_taken: "case_overview_viewed",
      });
      await disputeAudit(admin, disputeId, user.id, "admin.case_opened", { target_type: "dispute", target_id: disputeId, new_value: { reason } });
      await platformAudit(admin, user.id, staff.role, "dispute_case_opened", { reason, target_org_id: dispute.organisation_id, metadata: { dispute_id: disputeId } });

      return ok({
        dispute: {
          id: dispute.id,
          case_reference: dispute.case_reference,
          title: dispute.title,
          summary: dispute.summary,
          status: dispute.status,
          current_stage: dispute.current_stage,
          dispute_category: dispute.dispute_category,
          relationship_type: dispute.relationship_type,
          jurisdiction: dispute.jurisdiction,
          amount_disputed_pence: dispute.amount_disputed_pence,
          currency: dispute.currency,
          opened_at: dispute.opened_at,
          response_due_at: dispute.response_due_at,
          resolved_at: dispute.resolved_at,
          closed_at: dispute.closed_at,
          safety_flag: dispute.safety_flag,
          safety_flag_reason: dispute.safety_flag_reason,
          support_owner_user_id: dispute.support_owner_user_id,
          support_owner_name: dispute.support_owner_user_id ? userNames[dispute.support_owner_user_id] ?? null : null,
          created_at: dispute.created_at,
        },
        project: job ? { id: job.id, reference: job.reference ?? null, project_name: job.project_name ?? null } : null,
        parties: (parties || []).map((p: any) => ({
          id: p.id, user_id: p.user_id, party_role: p.party_role,
          display_name_snapshot: p.display_name_snapshot, business_name_snapshot: p.business_name_snapshot,
          email_snapshot: p.email_snapshot, access_status: p.access_status,
        })),
        claims: (claims || []).map((c: any) => ({
          id: c.id, claim_type: c.claim_type, submitted_by_user_id: c.submitted_by_user_id,
          submitted_by_name: userNames[c.submitted_by_user_id] ?? null, submitted_by_role: roleFor(c.submitted_by_user_id),
          statement: c.statement, amount_pence: c.amount_pence, status: c.status, submitted_at: c.submitted_at,
        })),
        evidence: (evidence || []).map((e: any) => ({
          id: e.id, evidence_reference: e.evidence_reference, title: e.title,
          evidence_category: e.evidence_category, submission_status: e.submission_status,
          submitted_by_name: userNames[e.submitted_by_user_id] ?? null, submitted_at: e.submitted_at, file_hash: e.file_hash,
        })),
        timeline: (events || []).map((ev: any) => ({
          id: ev.id, event_type: ev.event_type, title: ev.title, description: ev.description,
          actor_role: ev.actor_role, visibility: ev.visibility, created_at: ev.created_at,
        })),
        negotiations: (offers || []).map((o: any) => ({
          id: o.id, offer_type: o.offer_type, summary: o.summary, status: o.status,
          payment_amount_pence: o.payment_amount_pence, offered_by_name: userNames[o.offered_by_user_id] ?? null, created_at: o.created_at,
        })),
        deadlines: (deadlines || []).map((d: any) => ({
          id: d.id, deadline_type: d.deadline_type, title: d.title, due_at: d.due_at, status: d.status,
          actor_name: d.actor_user_id ? userNames[d.actor_user_id] ?? null : null,
        })),
        notifications: (outbox || []).map((n: any) => ({
          id: n.id, notification_type: n.event_type, title: n.event_type, status: n.status,
          recipient_email: n.recipient_email, last_error: n.last_error, created_at: n.created_at,
        })),
        exports: (exports || []).map((x: any) => ({
          id: x.id, version: x.version, perspective: x.perspective, purpose: x.purpose, status: x.status, generated_at: x.generated_at,
        })),
        notes: (notes || []).map((n: any) => ({
          id: n.id, note_scope: n.note_scope, body: n.body, author_name: userNames[n.author_user_id] ?? null, created_at: n.created_at,
        })),
        restrictions: (restrictions || []).map((r: any) => ({
          id: r.id, target_type: r.target_type, target_id: r.target_id, reason: r.reason, status: r.status, restricted_at: r.restricted_at,
        })),
        safetyReports: (safetyReports || []).map((s: any) => ({
          id: s.id, report_category: s.report_category, description: s.description, priority: s.priority, status: s.status,
          reporting_name: userNames[s.reporting_user_id] ?? null, created_at: s.created_at,
        })),
        auditTrail: (auditTrail || []).map((a: any) => ({
          id: a.id, action: a.action, actor_user_id: a.actor_user_id, target_type: a.target_type,
          previous_value: a.previous_value, new_value: a.new_value, created_at: a.created_at,
        })),
      });
    }

    // ── get_evidence_preview (elevated + audited) ─────────────────────────
    if (action === "get_evidence_preview") {
      if (!has(staff.permissions, "disputes_manage_safety")) return fail("Forbidden — evidence preview requires an elevated permission", 403);
      const evidenceId = typeof body?.evidenceId === "string" ? body.evidenceId : "";
      const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
      if (!evidenceId || !reason) return fail("evidenceId and a reason are required");

      const { data: evidence } = await admin.from("dispute_evidence").select("*").eq("id", evidenceId).maybeSingle();
      if (!evidence) return fail("Evidence not found", 404);

      const { data: restriction } = await admin
        .from("dispute_content_restrictions")
        .select("id").eq("target_type", "dispute_evidence").eq("target_id", evidenceId).eq("status", "restricted")
        .maybeSingle();
      if (restriction) return fail("This evidence is currently restricted pending a safety review", 409);

      let signedUrl: string | null = null;
      if (evidence.storage_path) {
        const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(evidence.storage_path, SIGNED_URL_EXPIRY);
        signedUrl = signed?.signedUrl ?? null;
      }

      await admin.from("dispute_admin_access_log").insert({
        admin_user_id: user.id, dispute_id: evidence.dispute_id, access_reason: reason,
        sections_viewed: ["evidence"], evidence_previewed: [evidence.evidence_reference],
        action_taken: "evidence_previewed",
      });
      await disputeAudit(admin, evidence.dispute_id, user.id, "admin.evidence_previewed", { target_type: "dispute_evidence", target_id: evidenceId, new_value: { reference: evidence.evidence_reference, reason } });
      await platformAudit(admin, user.id, staff.role, "dispute_evidence_previewed", { reason, metadata: { evidence_id: evidenceId } });

      return ok({ evidenceId, reference: evidence.evidence_reference, title: evidence.title, signedUrl });
    }

    // ── assign_support_owner ──────────────────────────────────────────────
    if (action === "assign_support_owner") {
      if (!has(staff.permissions, "disputes_support")) return fail("Forbidden — requires disputes_support", 403);
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      const ownerUserId = typeof body?.ownerUserId === "string" ? body.ownerUserId : null;
      const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
      if (!disputeId || !reason) return fail("disputeId and reason are required");

      const { data: dispute } = await admin.from("disputes").select("*").eq("id", disputeId).maybeSingle();
      if (!dispute) return fail("Dispute not found", 404);
      const previous = dispute.support_owner_user_id;

      await admin.from("disputes").update({ support_owner_user_id: ownerUserId, updated_at: new Date().toISOString() }).eq("id", disputeId);
      await disputeAudit(admin, disputeId, user.id, "admin.support_owner_assigned", {
        target_type: "dispute", target_id: disputeId,
        previous_value: { support_owner_user_id: previous }, new_value: { support_owner_user_id: ownerUserId, reason },
      });
      await platformAudit(admin, user.id, staff.role, "dispute_support_owner_assigned", { target_org_id: dispute.organisation_id, reason, metadata: { dispute_id: disputeId, previous, ownerUserId } });
      return ok({ success: true, message: "Support owner updated" });
    }

    // ── correct_status (operational, non-terminal, non-backdating) ────────
    if (action === "correct_status") {
      if (!has(staff.permissions, "disputes_support")) return fail("Forbidden — requires disputes_support", 403);
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      const newStatus = typeof body?.newStatus === "string" ? body.newStatus : "";
      const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
      if (!disputeId || !newStatus || !reason) return fail("disputeId, newStatus and reason are required");
      if (!ACTIVE_STATUSES.includes(newStatus)) return fail("Only active, non-terminal statuses may be corrected");

      const { data: dispute } = await admin.from("disputes").select("*").eq("id", disputeId).maybeSingle();
      if (!dispute) return fail("Dispute not found", 404);
      const previous = dispute.status;

      await admin.from("disputes").update({ status: newStatus, current_stage: newStatus, updated_at: new Date().toISOString() }).eq("id", disputeId);
      await timeline(admin, disputeId, user.id, "status_corrected", "Operational status corrected by BuildNerve support", { description: `${previous} → ${newStatus}: ${reason}` });
      await disputeAudit(admin, disputeId, user.id, "admin.status_corrected", {
        target_type: "dispute", target_id: disputeId,
        previous_value: { status: previous }, new_value: { status: newStatus, reason },
      });
      await platformAudit(admin, user.id, staff.role, "dispute_status_corrected", { target_org_id: dispute.organisation_id, reason, metadata: { dispute_id: disputeId, previous, newStatus } });
      await notifyParties(admin, dispute, "dispute_status_corrected", "Dispute status updated", `${dispute.case_reference}: BuildNerve support corrected the operational status.`, "normal", `:${newStatus}`);
      return ok({ success: true, message: "Status corrected" });
    }

    // ── resend_notification (rate-limited) ────────────────────────────────
    if (action === "resend_notification") {
      if (!has(staff.permissions, "disputes_support")) return fail("Forbidden — requires disputes_support", 403);
      const outboxId = typeof body?.outboxId === "string" ? body.outboxId : "";
      const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
      if (!outboxId || !reason) return fail("outboxId and reason are required");

      // Rate limit: max 10 resends per 5 minutes.
      const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
      const { count: recentResends } = await admin.from("dispute_audit_log")
        .select("id", { count: "exact", head: true })
        .eq("actor_user_id", user.id).eq("action", "admin.notification_resend").gte("created_at", fiveMinAgo);
      if ((recentResends ?? 0) >= 10) return fail("Rate limit exceeded — please wait before resending more notifications", 429);

      const { data: outbox } = await admin.from("notification_outbox").select("*").eq("id", outboxId).maybeSingle();
      if (!outbox) return fail("Notification not found", 404);
      if (!["failed", "permanent_failure"].includes(outbox.status)) return fail("Only failed notifications can be resent", 409);

      await admin.from("notification_outbox").update({ status: "pending", last_error: null }).eq("id", outboxId);
      await disputeAudit(admin, outbox.related_entity_id, user.id, "admin.notification_resend", {
        target_type: "notification_outbox", target_id: outboxId, new_value: { reason },
      });
      await platformAudit(admin, user.id, staff.role, "dispute_notification_resend", { reason, metadata: { outbox_id: outboxId } });
      return ok({ success: true, message: "Notification queued for resend" });
    }

    // ── extend_deadline ───────────────────────────────────────────────────
    if (action === "extend_deadline") {
      if (!has(staff.permissions, "disputes_manage_deadlines")) return fail("Forbidden — requires disputes_manage_deadlines", 403);
      const deadlineId = typeof body?.deadlineId === "string" ? body.deadlineId : "";
      const newDueAt = typeof body?.newDueAt === "string" ? body.newDueAt : "";
      const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
      if (!deadlineId || !newDueAt || !reason) return fail("deadlineId, newDueAt and reason are required");

      const { data: deadline } = await admin.from("dispute_deadlines").select("*").eq("id", deadlineId).maybeSingle();
      if (!deadline) return fail("Deadline not found", 404);
      const { data: dispute } = await admin.from("disputes").select("*").eq("id", deadline.dispute_id).maybeSingle();

      // Supersede the old deadline and create a new one with the new date.
      await admin.from("dispute_deadlines").update({ status: "superseded" }).eq("id", deadlineId);
      const { data: extended } = await admin.from("dispute_deadlines").insert({
        dispute_id: deadline.dispute_id,
        deadline_type: deadline.deadline_type,
        related_record_type: deadline.related_record_type,
        related_record_id: deadline.related_record_id,
        title: deadline.title,
        actor_user_id: deadline.actor_user_id,
        actor_role: deadline.actor_role,
        due_at: newDueAt,
        timezone: deadline.timezone,
        is_platform_deadline: true,
        status: "scheduled",
        superseded_by: deadline.id,
      }).select().single();

      await disputeAudit(admin, deadline.dispute_id, user.id, "admin.deadline_extended", {
        target_type: "dispute_deadline", target_id: deadlineId,
        previous_value: { due_at: deadline.due_at }, new_value: { due_at: newDueAt, reason },
      });
      await platformAudit(admin, user.id, staff.role, "dispute_deadline_extended", { reason, metadata: { deadline_id: deadlineId, new_due_at: newDueAt } });
      if (dispute) {
        await notifyParties(admin, dispute, "dispute_deadline_extended", "Platform deadline extended",
          `${dispute.case_reference}: a BuildNerve platform deadline was extended by support.`, "normal", `:${deadlineId}`);
      }
      return ok({ success: true, deadline: extended });
    }

    // ── add_admin_note ────────────────────────────────────────────────────
    if (action === "add_admin_note") {
      if (!has(staff.permissions, "disputes_support")) return fail("Forbidden — requires disputes_support", 403);
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      const noteScope = typeof body?.noteScope === "string" ? body.noteScope : "shared";
      const bodyText = typeof body?.body === "string" ? body.body.trim() : "";
      if (!disputeId || !bodyText) return fail("disputeId and body are required");
      if (!["shared", "internal"].includes(noteScope)) return fail("noteScope must be shared or internal");

      const { data: dispute } = await admin.from("disputes").select("*").eq("id", disputeId).maybeSingle();
      if (!dispute) return fail("Dispute not found", 404);

      const { data: note } = await admin.from("dispute_admin_notes").insert({
        dispute_id: disputeId, author_user_id: user.id, note_scope: noteScope, body: bodyText,
      }).select().single();

      await disputeAudit(admin, disputeId, user.id, "admin.note_added", { target_type: "dispute_admin_note", target_id: note.id, new_value: { note_scope: noteScope } });
      await platformAudit(admin, user.id, staff.role, "dispute_note_added", { target_org_id: dispute.organisation_id, metadata: { dispute_id: disputeId, note_scope: noteScope } });

      if (noteScope === "shared") {
        await notifyParties(admin, dispute, "dispute_admin_note", "A note was added to your dispute",
          `${dispute.case_reference}: BuildNerve support added a procedural note visible to both parties.`, "normal", `:${note.id}`);
      }
      return ok({ success: true, note });
    }

    // ── restrict_content ──────────────────────────────────────────────────
    if (action === "restrict_content") {
      if (!has(staff.permissions, "disputes_manage_safety")) return fail("Forbidden — requires disputes_manage_safety", 403);
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      const targetType = typeof body?.targetType === "string" ? body.targetType : "";
      const targetId = typeof body?.targetId === "string" ? body.targetId : "";
      const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
      if (!disputeId || !targetType || !targetId || !reason) return fail("disputeId, targetType, targetId and reason are required");

      const { data: dispute } = await admin.from("disputes").select("*").eq("id", disputeId).maybeSingle();
      if (!dispute) return fail("Dispute not found", 404);

      await admin.from("dispute_content_restrictions").insert({
        dispute_id: disputeId, target_type: targetType, target_id: targetId, reason, restricted_by_user_id: user.id,
      });
      await admin.from("disputes").update({ safety_flag: true, safety_flag_reason: reason, updated_at: new Date().toISOString() }).eq("id", disputeId);
      await timeline(admin, disputeId, user.id, "content_restricted", "Content access restricted pending safety review", { description: reason });
      await disputeAudit(admin, disputeId, user.id, "admin.content_restricted", { target_type: targetType, target_id: targetId, new_value: { reason } });
      await platformAudit(admin, user.id, staff.role, "dispute_content_restricted", { target_org_id: dispute.organisation_id, reason, metadata: { dispute_id: disputeId, target_type: targetType, target_id: targetId } });
      await notifyParties(admin, dispute, "dispute_content_restricted", "Content temporarily restricted",
        `${dispute.case_reference}: BuildNerve has temporarily restricted access to a record for safety review.`, "high", `:${targetType}:${targetId}`);
      return ok({ success: true, message: "Content restricted" });
    }

    // ── suspend_upload (alias of restrict_content for evidence) ───────────
    if (action === "suspend_upload") {
      const evidenceId = typeof body?.evidenceId === "string" ? body.evidenceId : "";
      const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
      if (!has(staff.permissions, "disputes_manage_safety")) return fail("Forbidden — requires disputes_manage_safety", 403);
      if (!evidenceId || !reason) return fail("evidenceId and reason are required");
      const { data: evidence } = await admin.from("dispute_evidence").select("dispute_id").eq("id", evidenceId).maybeSingle();
      if (!evidence) return fail("Evidence not found", 404);
      const result = await (async () => {
        const { data: dispute } = await admin.from("disputes").select("*").eq("id", evidence.dispute_id).maybeSingle();
        await admin.from("dispute_content_restrictions").insert({
          dispute_id: evidence.dispute_id, target_type: "dispute_evidence", target_id: evidenceId, reason, restricted_by_user_id: user.id,
        });
        await admin.from("disputes").update({ safety_flag: true, safety_flag_reason: reason }).eq("id", evidence.dispute_id);
        await disputeAudit(admin, evidence.dispute_id, user.id, "admin.upload_suspended", { target_type: "dispute_evidence", target_id: evidenceId, new_value: { reason } });
        await platformAudit(admin, user.id, staff.role, "dispute_upload_suspended", { reason, metadata: { evidence_id: evidenceId } });
        if (dispute) {
          await notifyParties(admin, dispute, "dispute_upload_suspended", "An upload was suspended for review",
            `${dispute.case_reference}: BuildNerve suspended an uploaded file pending safety review.`, "high", `:${evidenceId}`);
        }
        return { success: true, message: "Upload suspended" };
      })();
      return ok(result);
    }

    // ── record_external_outcome ───────────────────────────────────────────
    if (action === "record_external_outcome") {
      if (!has(staff.permissions, "disputes_support")) return fail("Forbidden — requires disputes_support", 403);
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      const outcome = typeof body?.outcome === "string" ? body.outcome.trim() : "";
      if (!disputeId || !outcome) return fail("disputeId and outcome are required");

      const { data: dispute } = await admin.from("disputes").select("*").eq("id", disputeId).maybeSingle();
      if (!dispute) return fail("Dispute not found", 404);

      await timeline(admin, disputeId, user.id, "external_outcome_recorded", "External outcome recorded (as reported by the parties)", { description: outcome });
      await disputeAudit(admin, disputeId, user.id, "admin.external_outcome_recorded", { target_type: "dispute", target_id: disputeId, new_value: { outcome } });
      await platformAudit(admin, user.id, staff.role, "dispute_external_outcome_recorded", { target_org_id: dispute.organisation_id, metadata: { dispute_id: disputeId } });
      await notifyParties(admin, dispute, "dispute_external_outcome", "An external outcome was recorded",
        `${dispute.case_reference}: BuildNerve recorded an external court or mediator outcome as reported by the parties.`, "normal");
      return ok({ success: true, message: "Outcome recorded" });
    }

    // ── close_duplicate_draft ─────────────────────────────────────────────
    if (action === "close_duplicate_draft") {
      if (!has(staff.permissions, "disputes_support")) return fail("Forbidden — requires disputes_support", 403);
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      const duplicateOf = typeof body?.duplicateOf === "string" ? body.duplicateOf.trim() : "";
      const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
      if (!disputeId || !duplicateOf || !reason) return fail("disputeId, duplicateOf and reason are required");

      const { data: dispute } = await admin.from("disputes").select("*").eq("id", disputeId).maybeSingle();
      if (!dispute) return fail("Dispute not found", 404);
      if (dispute.status !== "draft") return fail("Only draft disputes may be closed as duplicates", 409);

      const now = new Date().toISOString();
      await admin.from("disputes").update({ status: "closed", current_stage: "closed", closed_at: now, updated_at: now }).eq("id", disputeId);
      await timeline(admin, disputeId, user.id, "duplicate_closed", "Duplicate draft closed by BuildNerve support", { description: `Duplicate of ${duplicateOf}: ${reason}` });
      await disputeAudit(admin, disputeId, user.id, "admin.duplicate_closed", {
        target_type: "dispute", target_id: disputeId, previous_value: { status: "draft" }, new_value: { status: "closed", duplicate_of: duplicateOf, reason },
      });
      await platformAudit(admin, user.id, staff.role, "dispute_duplicate_closed", { target_org_id: dispute.organisation_id, reason, metadata: { dispute_id: disputeId, duplicate_of: duplicateOf } });
      return ok({ success: true, message: "Duplicate draft closed" });
    }

    // ── restore_access ────────────────────────────────────────────────────
    if (action === "restore_access") {
      if (!has(staff.permissions, "disputes_manage_safety")) return fail("Forbidden — requires disputes_manage_safety", 403);
      const restrictionId = typeof body?.restrictionId === "string" ? body.restrictionId : "";
      const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
      if (!restrictionId || !reason) return fail("restrictionId and reason are required");

      const { data: restriction } = await admin.from("dispute_content_restrictions").select("*").eq("id", restrictionId).maybeSingle();
      if (!restriction) return fail("Restriction not found", 404);

      await admin.from("dispute_content_restrictions").update({ status: "restored", restored_by_user_id: user.id, restored_at: new Date().toISOString() }).eq("id", restrictionId);
      await disputeAudit(admin, restriction.dispute_id, user.id, "admin.access_restored", {
        target_type: restriction.target_type, target_id: restriction.target_id,
        previous_value: { status: "restricted" }, new_value: { status: "restored", reason },
      });
      await platformAudit(admin, user.id, staff.role, "dispute_access_restored", { reason, metadata: { restriction_id: restrictionId } });
      return ok({ success: true, message: "Access restored" });
    }

    // ── report_safety (party or staff) ────────────────────────────────────
    if (action === "report_safety") {
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      const category = typeof body?.category === "string" ? body.category : "";
      const description = typeof body?.description === "string" ? body.description.trim() : "";
      const targetType = typeof body?.targetType === "string" ? body.targetType : null;
      const targetId = typeof body?.targetId === "string" ? body.targetId : null;
      const priority = typeof body?.priority === "string" ? body.priority : "normal";
      if (!disputeId || !category) return fail("disputeId and category are required");

      const { data: dispute } = await admin.from("disputes").select("*").eq("id", disputeId).maybeSingle();
      if (!dispute) return fail("Dispute not found", 404);
      const isParty = dispute.claimant_user_id === user.id || dispute.respondent_user_id === user.id;
      if (!isParty && !has(staff.permissions, "disputes_manage_safety")) return fail("Only parties or safety staff can report", 403);

      const { data: report } = await admin.from("dispute_safety_reports").insert({
        dispute_id: disputeId, report_category: category, reporting_user_id: user.id,
        target_type: targetType, target_id: targetId, description, priority, status: "open",
      }).select().single();

      return ok({ success: true, report });
    }

    // ── list_safety_queue ─────────────────────────────────────────────────
    if (action === "list_safety_queue") {
      if (!has(staff.permissions, "disputes_manage_safety")) return fail("Forbidden — requires disputes_manage_safety", 403);
      const { data: reports } = await admin.from("dispute_safety_reports").select("*").order("created_at", { ascending: false }).limit(500);
      const disputeIds = [...new Set((reports || []).map((r: any) => r.dispute_id))];
      const userIds = [...new Set([
        ...(reports || []).map((r: any) => r.reporting_user_id),
        ...(reports || []).map((r: any) => r.assigned_reviewer_user_id),
      ].filter(Boolean))];
      const [{ data: disputes }, names] = await Promise.all([
        admin.from("disputes").select("id, case_reference").in("id", disputeIds),
        profileNames(admin, userIds),
      ]);
      const refMap: Record<string, string> = {};
      (disputes || []).forEach((d: any) => { refMap[d.id] = d.case_reference; });
      const items = (reports || []).map((r: any) => ({
        id: r.id, dispute_id: r.dispute_id, case_reference: refMap[r.dispute_id] ?? "—",
        report_category: r.report_category, reporting_user_id: r.reporting_user_id,
        reporting_name: names[r.reporting_user_id] ?? null, target_type: r.target_type, target_id: r.target_id,
        description: r.description, priority: r.priority, status: r.status,
        assigned_reviewer_user_id: r.assigned_reviewer_user_id, assigned_reviewer_name: names[r.assigned_reviewer_user_id] ?? null,
        decision: r.decision, decision_reason: r.decision_reason, resolved_at: r.resolved_at, created_at: r.created_at,
      }));
      return ok({ items });
    }

    // ── review_safety_report ──────────────────────────────────────────────
    if (action === "review_safety_report") {
      if (!has(staff.permissions, "disputes_manage_safety")) return fail("Forbidden — requires disputes_manage_safety", 403);
      const reportId = typeof body?.reportId === "string" ? body.reportId : "";
      const newStatus = typeof body?.status === "string" ? body.status : "";
      const decision = typeof body?.decision === "string" ? body.decision.trim() : null;
      const decisionReason = typeof body?.decisionReason === "string" ? body.decisionReason.trim() : null;
      const assignedReviewer = typeof body?.assignedReviewerUserId === "string" ? body.assignedReviewerUserId : null;
      if (!reportId || !newStatus) return fail("reportId and status are required");
      if (!["open", "in_review", "restricted", "no_action", "resolved"].includes(newStatus)) return fail("Invalid status");

      const { data: report } = await admin.from("dispute_safety_reports").select("*").eq("id", reportId).maybeSingle();
      if (!report) return fail("Report not found", 404);

      const patch: Record<string, unknown> = { status: newStatus };
      if (decision) patch.decision = decision;
      if (decisionReason) patch.decision_reason = decisionReason;
      if (assignedReviewer) patch.assigned_reviewer_user_id = assignedReviewer;
      if (["restricted", "no_action", "resolved"].includes(newStatus)) patch.resolved_at = new Date().toISOString();

      await admin.from("dispute_safety_reports").update(patch).eq("id", reportId);
      await disputeAudit(admin, report.dispute_id, user.id, "admin.safety_reviewed", {
        target_type: "dispute_safety_report", target_id: reportId,
        previous_value: { status: report.status }, new_value: { status: newStatus, decision, decision_reason: decisionReason },
      });
      await platformAudit(admin, user.id, staff.role, "dispute_safety_reviewed", { metadata: { report_id: reportId, new_status: newStatus } });
      return ok({ success: true, message: "Safety report updated" });
    }

    // ── list_access_audit ─────────────────────────────────────────────────
    if (action === "list_access_audit") {
      if (!has(staff.permissions, "disputes_view_audit")) return fail("Forbidden — requires disputes_view_audit", 403);
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : null;
      let query = admin.from("dispute_admin_access_log").select("*").order("created_at", { ascending: false }).limit(1000);
      if (disputeId) query = query.eq("dispute_id", disputeId);
      const { data: rows } = await query;
      const adminIds = [...new Set((rows || []).map((r: any) => r.admin_user_id))];
      const disputeIds = [...new Set((rows || []).map((r: any) => r.dispute_id))];
      const [names, { data: disputes }] = await Promise.all([
        profileNames(admin, adminIds),
        admin.from("disputes").select("id, case_reference").in("id", disputeIds),
      ]);
      const refMap: Record<string, string> = {};
      (disputes || []).forEach((d: any) => { refMap[d.id] = d.case_reference; });

      const items = (rows || []).map((r: any) => ({
        id: r.id, admin_user_id: r.admin_user_id, admin_name: names[r.admin_user_id] ?? null,
        dispute_id: r.dispute_id, case_reference: refMap[r.dispute_id] ?? "—",
        access_reason: r.access_reason, sections_viewed: r.sections_viewed || [],
        evidence_previewed: r.evidence_previewed || [], files_downloaded: r.files_downloaded || [],
        action_taken: r.action_taken, created_at: r.created_at,
      }));

      // Basic rule-based alerts (NOT anomaly detection).
      const alerts = computeAlerts(items, names);
      return ok({ items, alerts });
    }

    // ── list_guidance_versions ────────────────────────────────────────────
    if (action === "list_guidance_versions") {
      if (!has(staff.permissions, "disputes_manage_legal_content")) return fail("Forbidden — requires disputes_manage_legal_content", 403);
      const { data: rows } = await admin.from("dispute_guidance_versions").select("*").order("created_at", { ascending: false }).limit(500);
      const publisherIds = [...new Set((rows || []).map((r: any) => r.published_by_user_id).filter(Boolean))];
      const names = await profileNames(admin, publisherIds);
      const items = (rows || []).map((r: any) => ({
        id: r.id, section_id: r.section_id, version: r.version, title: r.title, summary: r.summary,
        content: r.content, status: r.status, published_by_name: names[r.published_by_user_id] ?? null,
        published_at: r.published_at, review_due: r.review_due, supersedes_version_id: r.supersedes_version_id,
        created_at: r.created_at, used_by_dispute_count: 0,
      }));
      return ok({ items });
    }

    // ── draft_guidance ────────────────────────────────────────────────────
    if (action === "draft_guidance") {
      if (!has(staff.permissions, "disputes_manage_legal_content")) return fail("Forbidden — requires disputes_manage_legal_content", 403);
      const sectionId = typeof body?.sectionId === "string" ? body.sectionId.trim() : "";
      const title = typeof body?.title === "string" ? body.title.trim() : "";
      const summary = typeof body?.summary === "string" ? body.summary : null;
      const content = body?.content ?? {};
      if (!sectionId || !title) return fail("sectionId and title are required");

      const { data: latest } = await admin.from("dispute_guidance_versions")
        .select("version").eq("section_id", sectionId).order("version", { ascending: false }).limit(1).maybeSingle();
      const version = (latest?.version ?? 0) + 1;

      const { data: row } = await admin.from("dispute_guidance_versions").insert({
        section_id: sectionId, version, title, summary, content, status: "draft",
      }).select().single();

      await platformAudit(admin, user.id, staff.role, "dispute_guidance_drafted", { metadata: { section_id: sectionId, version } });
      return ok({ success: true, version: row });
    }

    // ── publish_guidance ──────────────────────────────────────────────────
    if (action === "publish_guidance") {
      if (!has(staff.permissions, "disputes_manage_legal_content")) return fail("Forbidden — requires disputes_manage_legal_content", 403);
      const versionId = typeof body?.versionId === "string" ? body.versionId : "";
      if (!versionId) return fail("versionId is required");

      const { data: row } = await admin.from("dispute_guidance_versions").select("*").eq("id", versionId).maybeSingle();
      if (!row) return fail("Version not found", 404);

      // Retire the currently-published version for this section.
      await admin.from("dispute_guidance_versions")
        .update({ status: "retired" })
        .eq("section_id", row.section_id).eq("status", "published");

      await admin.from("dispute_guidance_versions").update({
        status: "published", published_by_user_id: user.id, published_at: new Date().toISOString(),
      }).eq("id", versionId);

      await platformAudit(admin, user.id, staff.role, "dispute_guidance_published", { metadata: { section_id: row.section_id, version: row.version } });
      return ok({ success: true, message: "Guidance version published" });
    }

    // ── retire_guidance ───────────────────────────────────────────────────
    if (action === "retire_guidance") {
      if (!has(staff.permissions, "disputes_manage_legal_content")) return fail("Forbidden — requires disputes_manage_legal_content", 403);
      const versionId = typeof body?.versionId === "string" ? body.versionId : "";
      if (!versionId) return fail("versionId is required");

      const { data: row } = await admin.from("dispute_guidance_versions").select("*").eq("id", versionId).maybeSingle();
      if (!row) return fail("Version not found", 404);

      await admin.from("dispute_guidance_versions").update({ status: "retired" }).eq("id", versionId);
      await platformAudit(admin, user.id, staff.role, "dispute_guidance_retired", { metadata: { section_id: row.section_id, version: row.version } });
      return ok({ success: true, message: "Guidance version retired" });
    }

    return fail("Unknown action");
  } catch (err) {
    console.error("dispute-admin error:", err);
    return fail(err instanceof Error ? err.message : "Operation failed", 500);
  }
});

// Simple rule-based access alerts. Clearly labelled — not anomaly detection.
function computeAlerts(items: any[], names: Record<string, string | null>) {
  const byAdmin: Record<string, any[]> = {};
  items.forEach((r) => { (byAdmin[r.admin_user_id] ||= []).push(r); });

  const repeatedAccessWithoutAction: { admin_name: string; count: number }[] = [];
  const largeVolumeDownloads: { admin_name: string; files: number }[] = [];
  const repeatedFailedPermissionChecks: { admin_name: string; count: number }[] = [];

  Object.entries(byAdmin).forEach(([adminId, rows]) => {
    const name = names[adminId] ?? "Unknown";
    const noAction = rows.filter((r) => !r.action_taken).length;
    if (noAction >= 5) repeatedAccessWithoutAction.push({ admin_name: name, count: noAction });
    const files = rows.reduce((sum, r) => sum + (r.files_downloaded?.length || 0), 0);
    if (files >= 20) largeVolumeDownloads.push({ admin_name: name, files });
  });

  return { repeatedAccessWithoutAction, largeVolumeDownloads, repeatedFailedPermissionChecks };
}
