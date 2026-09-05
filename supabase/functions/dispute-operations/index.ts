import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("VITE_PUBLIC_SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const STATUSES = [
  "draft", "open", "awaiting_response", "under_discussion", "evidence_collection",
  "negotiation", "mediation_considered", "pre_action", "resolved", "withdrawn", "closed",
];
const ACTIVE_STATUSES = [
  "open", "awaiting_response", "under_discussion", "evidence_collection",
  "negotiation", "mediation_considered", "pre_action",
];
const TERMINAL_STATUSES = ["resolved", "withdrawn", "closed"];
const RESPONSE_WINDOW_DAYS = 14;
const OFFER_TYPES = [
  "payment", "partial_refund", "full_refund", "remedial_work",
  "revised_completion_plan", "mutual_walk_away", "combined_resolution", "other",
];

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
function fail(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function generateCaseReference(): string {
  const year = new Date().getFullYear();
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = new Uint8Array(6);
  crypto.getRandomValues(bytes);
  let suffix = "";
  for (let i = 0; i < bytes.length; i++) suffix += chars[bytes[i] % chars.length];
  return `BN-DIS-${year}-${suffix}`;
}

// Inserts an in-app notification for a party.
async function notifyParty(
  supabase: ReturnType<typeof createClient>,
  dispute: { id: string; organisation_id: string; project_id: string; case_reference: string },
  recipientUserId: string,
  notificationType: string,
  title: string,
  body: string,
  priority: string,
  dedupKey: string,
) {
  await supabase.from("notifications").insert({
    organisation_id: dispute.organisation_id,
    recipient_user_id: recipientUserId,
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
    deduplication_key: dedupKey,
  });
}

// Creates settlement obligations from an accepted offer's terms.
async function createObligationsFromOffer(
  supabase: ReturnType<typeof createClient>,
  disputeId: string,
  offer: {
    id: string;
    payment_amount_pence: number | null;
    payment_due_date: string | null;
    work_description: string | null;
    proposed_completion_date: string | null;
  },
) {
  const obligations: Record<string, unknown>[] = [];
  if (offer.payment_amount_pence != null) {
    obligations.push({
      dispute_id: disputeId,
      offer_id: offer.id,
      kind: "payment",
      title: "Make the agreed payment",
      amount_pence: offer.payment_amount_pence,
      due_date: offer.payment_due_date ?? null,
      status: "not_started",
    });
  }
  if (offer.work_description) {
    obligations.push({
      dispute_id: disputeId,
      offer_id: offer.id,
      kind: "work",
      title: offer.work_description,
      due_date: offer.proposed_completion_date ?? null,
      status: "not_started",
    });
  }
  if (obligations.length === 0) {
    obligations.push({
      dispute_id: disputeId,
      offer_id: offer.id,
      kind: "other",
      title: "Complete the agreed terms",
      status: "not_started",
    });
  }
  await supabase.from("dispute_settlement_obligations").insert(obligations);
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return fail("No auth token", 401);

    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return fail("Invalid auth", 401);

    const body = await req.json().catch(() => ());
    const action = typeof body?.action === "string" ? body.action : "";

    // ── verify_participation ──────────────────────────────────────────────
    if (action === "verify_participation") {
      const projectId = typeof body?.projectId === "string" ? body.projectId : "";
      if (!projectId) return fail("projectId is required");

      const { data: job } = await supabase
        .from("jobs").select("organisation_id").eq("id", projectId).maybeSingle();
      if (!job) return ok({ participant: false });

      const { data: member } = await supabase
        .from("organisation_members")
        .select("id")
        .eq("organisation_id", job.organisation_id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      return ok({ participant: !!member, organisation_id: job.organisation_id });
    }

    // ── create_draft ──────────────────────────────────────────────────────
    if (action === "create_draft") {
      const p = body?.payload ?? {};
      const projectId = typeof p.projectId === "string" ? p.projectId : "";
      const title = typeof p.title === "string" ? p.title.trim() : "";
      const category = typeof p.disputeCategory === "string" ? p.disputeCategory : "";
      const relationship = typeof p.relationshipType === "string" ? p.relationshipType : "";
      const claimantRole = typeof p.claimantRole === "string" ? p.claimantRole : "";
      if (!projectId || !title || !category || !relationship || !claimantRole) {
        return fail("Missing required fields");
      }

      const { data: job } = await supabase
        .from("jobs").select("organisation_id").eq("id", projectId).maybeSingle();
      if (!job) return fail("Project not found", 404);

      const { data: member } = await supabase
        .from("organisation_members")
        .select("id")
        .eq("organisation_id", job.organisation_id)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (!member) return fail("You are not a participant on this project", 403);

      let caseReference = generateCaseReference();
      for (let attempt = 0; attempt < 5; attempt++) {
        const { data: existing } = await supabase
          .from("disputes").select("id").eq("case_reference", caseReference).maybeSingle();
        if (!existing) break;
        caseReference = generateCaseReference();
      }

      const { data: dispute, error: createErr } = await supabase
        .from("disputes")
        .insert({
          organisation_id: job.organisation_id,
          case_reference: caseReference,
          project_id: projectId,
          raised_by_user_id: user.id,
          claimant_user_id: user.id,
          claimant_role: claimantRole,
          relationship_type: relationship,
          jurisdiction: "england_wales",
          dispute_category: category,
          title,
          summary: typeof p.summary === "string" ? p.summary : null,
          amount_disputed_pence: typeof p.amountDisputedPence === "number" ? p.amountDisputedPence : null,
          currency: typeof p.currency === "string" ? p.currency : "GBP",
          desired_resolution: typeof p.desiredResolution === "string" ? p.desiredResolution : null,
          status: "draft",
          current_stage: "open",
        })
        .select()
        .single();
      if (createErr) return fail(createErr.message);

      await supabase.from("dispute_parties").insert({
        dispute_id: dispute.id,
        user_id: user.id,
        party_role: "claimant",
        display_name_snapshot: user.user_metadata?.full_name ?? user.email ?? null,
        email_snapshot: user.email ?? null,
      });

      await supabase.from("dispute_events").insert({
        dispute_id: dispute.id,
        event_type: "dispute_drafted",
        actor_user_id: user.id,
        actor_role: "claimant",
        title: "Dispute drafted",
        description: title,
        visibility: "parties",
      });

      await supabase.from("dispute_audit_log").insert({
        dispute_id: dispute.id,
        actor_user_id: user.id,
        action: "dispute.created_draft",
        target_type: "dispute",
        target_id: dispute.id,
        new_value: { status: "draft" },
      });

      return ok({ dispute });
    }

    // ── update_draft (creator only, while draft) ───────────────────────────
    if (action === "update_draft") {
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      if (!disputeId) return fail("disputeId is required");

      const { data: dispute } = await supabase
        .from("disputes").select("*").eq("id", disputeId).maybeSingle();
      if (!dispute) return fail("Dispute not found", 404);
      if (dispute.status !== "draft") return fail("Only draft disputes can be edited", 409);
      if (dispute.claimant_user_id !== user.id) return fail("Only the creator can edit this draft", 403);

      const p = body?.payload ?? {};
      const allowed: Record<string, unknown> = {};
      for (const key of ["title", "summary", "dispute_category", "relationship_type", "claimant_role", "desired_resolution"]) {
        if (typeof p[key] === "string") allowed[key] = p[key];
      }
      if (typeof p.amountDisputedPence === "number") allowed.amount_disputed_pence = p.amountDisputedPence;
      if (typeof p.currency === "string") allowed.currency = p.currency;
      if (Object.keys(allowed).length === 0) return fail("Nothing to update");

      const { data: updated, error: updErr } = await supabase
        .from("disputes").update({ ...allowed, updated_at: new Date().toISOString() })
        .eq("id", disputeId).select().single();
      if (updErr) return fail(updErr.message);

      await supabase.from("dispute_audit_log").insert({
        dispute_id: disputeId,
        actor_user_id: user.id,
        action: "dispute.draft_updated",
        target_type: "dispute",
        target_id: disputeId,
        previous_value: { title: dispute.title, dispute_category: dispute.dispute_category },
        new_value: allowed,
      });

      return ok({ dispute: updated });
    }

    // ── submit (draft → open) ──────────────────────────────────────────────
    if (action === "submit") {
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      const respondentUserId = typeof body?.respondentUserId === "string" ? body.respondentUserId : null;
      const respondentRole = typeof body?.respondentRole === "string" ? body.respondentRole : null;
      const claimStatement = typeof body?.statement === "string" ? body.statement : null;
      const requestedRemedy = typeof body?.requestedRemedy === "string" ? body.requestedRemedy : null;
      const amountPence = typeof body?.amountPence === "number" ? body.amountPence : null;
      if (!disputeId) return fail("disputeId is required");

      const { data: dispute } = await supabase
        .from("disputes").select("*").eq("id", disputeId).maybeSingle();
      if (!dispute) return fail("Dispute not found", 404);
      if (dispute.status !== "draft") return fail("Only draft disputes can be submitted", 409);
      if (dispute.claimant_user_id !== user.id) return fail("Only the creator can submit this dispute", 403);

      // Cross-case isolation: a named respondent must be an active member of
      // the dispute's organisation, so a claimant cannot attach an arbitrary
      // user (and thereby grant them read access) to this case.
      if (respondentUserId) {
        const { data: respMember } = await supabase
          .from("organisation_members")
          .select("id")
          .eq("organisation_id", dispute.organisation_id)
          .eq("user_id", respondentUserId)
          .eq("status", "active")
          .maybeSingle();
        if (!respMember) {
          return fail("The named respondent must be an active member of this project's organisation", 403);
        }
      }

      const now = new Date().toISOString();
      const responseDueAt = new Date(Date.now() + RESPONSE_WINDOW_DAYS * 86400000).toISOString();

      const { data: updated } = await supabase
        .from("disputes")
        .update({
          status: "open",
          current_stage: "awaiting_response",
          opened_at: now,
          response_due_at: responseDueAt,
          respondent_user_id: respondentUserId,
          respondent_role: respondentRole,
          updated_at: now,
        })
        .eq("id", disputeId).select().single();

      if (respondentUserId) {
        const { data: respProfile } = await supabase
          .from("profiles").select("full_name").eq("id", respondentUserId).maybeSingle();
        await supabase.from("dispute_parties").insert({
          dispute_id: disputeId,
          user_id: respondentUserId,
          party_role: "respondent",
          display_name_snapshot: respProfile?.full_name ?? null,
        });
      }

      const { data: claim, error: claimErr } = await supabase
        .from("dispute_claims")
        .insert({
          dispute_id: disputeId,
          submitted_by_user_id: user.id,
          claim_type: "claim",
          statement: claimStatement,
          amount_pence: amountPence,
          requested_remedy: requestedRemedy,
          status: "submitted",
        })
        .select()
        .single();
      if (claimErr) return fail(claimErr.message);

      await supabase.from("dispute_events").insert({
        dispute_id: disputeId,
        event_type: "dispute_submitted",
        actor_user_id: user.id,
        actor_role: "claimant",
        title: "Dispute opened",
        description: dispute.title,
        related_record_type: "dispute_claim",
        related_record_id: claim.id,
        visibility: "parties",
      });

      await supabase.from("dispute_audit_log").insert({
        dispute_id: disputeId,
        actor_user_id: user.id,
        action: "dispute.submitted",
        target_type: "dispute",
        target_id: disputeId,
        previous_value: { status: "draft" },
        new_value: { status: "open", response_due_at: responseDueAt },
      });

      if (respondentUserId && respondentUserId !== user.id) {
        await notifyParty(
          supabase,
          dispute,
          respondentUserId,
          "dispute_opened",
          "A dispute has been opened with you",
          `${dispute.case_reference}: a dispute has been opened and is awaiting your response.`,
          "high",
          `dispute:${disputeId}:opened`,
        );
      }

      return ok({ dispute: updated, claim });
    }

    // ── add_claim ──────────────────────────────────────────────────────────
    if (action === "add_claim") {
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      const claimType = typeof body?.claimType === "string" ? body.claimType : "response";
      if (!disputeId) return fail("disputeId is required");

      const { data: dispute } = await supabase
        .from("disputes").select("*").eq("id", disputeId).maybeSingle();
      if (!dispute) return fail("Dispute not found", 404);
      const isParty = dispute.claimant_user_id === user.id || dispute.respondent_user_id === user.id;
      if (!isParty) return fail("Only parties to this dispute can add claims", 403);
      if (ACTIVE_STATUSES.indexOf(dispute.status) === -1) {
        return fail("This dispute is not in an active state", 409);
      }

      const actorRole = dispute.claimant_user_id === user.id ? "claimant" : "respondent";
      const { data: claim, error: claimErr } = await supabase
        .from("dispute_claims")
        .insert({
          dispute_id: disputeId,
          submitted_by_user_id: user.id,
          claim_type: claimType,
          statement: typeof body?.statement === "string" ? body.statement : null,
          amount_pence: typeof body?.amountPence === "number" ? body.amountPence : null,
          calculation_breakdown: body?.calculationBreakdown ?? null,
          requested_remedy: typeof body?.requestedRemedy === "string" ? body.requestedRemedy : null,
          status: "submitted",
        })
        .select()
        .single();
      if (claimErr) return fail(claimErr.message);

      await supabase.from("dispute_events").insert({
        dispute_id: disputeId,
        event_type: claimType === "claim" ? "claim_submitted" : "party_responded",
        actor_user_id: user.id,
        actor_role: actorRole,
        title: claimType === "claim" ? "Claim submitted" : "Response submitted",
        related_record_type: "dispute_claim",
        related_record_id: claim.id,
        visibility: "parties",
      });

      await supabase.from("dispute_audit_log").insert({
        dispute_id: disputeId,
        actor_user_id: user.id,
        action: "claim.submitted",
        target_type: "dispute_claim",
        target_id: claim.id,
        new_value: { claim_type: claimType },
      });

      return ok({ claim });
    }

    // ── submit_response (formal response + optional counterclaim) ──────────
    if (action === "submit_response") {
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      const position = typeof body?.position === "string" ? body.position : "";
      const statement = typeof body?.statement === "string" ? body.statement.trim() : "";
      const factsAccepted = Array.isArray(body?.factsAccepted)
        ? body.factsAccepted.filter((f: unknown) => typeof f === "string" && f.trim() !== "")
        : [];
      const factsDisputed = Array.isArray(body?.factsDisputed)
        ? body.factsDisputed.filter((f: unknown) => f && typeof f === "object" && (f as { point?: string }).point)
        : [];
      const proposedResolution = typeof body?.proposedResolution === "string" ? body.proposedResolution.trim() : null;
      const amountAcceptedPence = typeof body?.amountAcceptedPence === "number" ? body.amountAcceptedPence : null;
      const hasCounterclaim = body?.counterclaim === true;
      const counterclaimCategory = typeof body?.counterclaimCategory === "string" ? body.counterclaimCategory : null;
      const counterclaimSummary = typeof body?.counterclaimSummary === "string" ? body.counterclaimSummary.trim() : null;
      const counterclaimAmountPence = typeof body?.counterclaimAmountPence === "number" ? body.counterclaimAmountPence : null;
      const counterclaimBreakdown = body?.counterclaimBreakdown ?? null;
      const counterclaimRemedy = typeof body?.counterclaimRemedy === "string" ? body.counterclaimRemedy.trim() : null;
      const linkedRecords = Array.isArray(body?.linkedRecords) ? body.linkedRecords : null;

      if (!disputeId) return fail("disputeId is required");
      const VALID_POSITIONS = ["accept_full", "accept_part", "dispute", "need_clarification"];
      if (VALID_POSITIONS.indexOf(position) === -1) return fail("A valid position is required");
      if (!statement) return fail("A plain-language response is required");

      const { data: dispute } = await supabase
        .from("disputes").select("*").eq("id", disputeId).maybeSingle();
      if (!dispute) return fail("Dispute not found", 404);
      if (dispute.respondent_user_id !== user.id) {
        return fail("Only the named respondent can submit a formal response", 403);
      }
      if (!(dispute.status === "open" || dispute.status === "awaiting_response")) {
        return fail("This dispute is not awaiting a response", 409);
      }

      const { data: existingResp } = await supabase
        .from("dispute_claims")
        .select("id")
        .eq("dispute_id", disputeId)
        .eq("submitted_by_user_id", user.id)
        .eq("claim_type", "response")
        .maybeSingle();
      if (existingResp) return fail("You have already submitted a formal response", 409);

      const { data: responseClaim, error: respErr } = await supabase
        .from("dispute_claims")
        .insert({
          dispute_id: disputeId,
          submitted_by_user_id: user.id,
          claim_type: "response",
          statement,
          position,
          facts_accepted: factsAccepted.length ? factsAccepted : null,
          facts_disputed: factsDisputed.length ? factsDisputed : null,
          proposed_resolution: proposedResolution,
          amount_accepted_pence: amountAcceptedPence,
          linked_records: linkedRecords,
          status: "submitted",
        })
        .select()
        .single();
      if (respErr) return fail(respErr.message);

      let counterclaim = null;
      if (hasCounterclaim) {
        if (!counterclaimCategory || !counterclaimSummary) {
          return fail("A counterclaim requires a category and summary");
        }
        const { data: cc, error: ccErr } = await supabase
          .from("dispute_claims")
          .insert({
            dispute_id: disputeId,
            submitted_by_user_id: user.id,
            claim_type: "counterclaim",
            statement: counterclaimSummary,
            amount_pence: counterclaimAmountPence,
            calculation_breakdown: counterclaimBreakdown,
            requested_remedy: counterclaimRemedy,
            counterclaim_category: counterclaimCategory,
            linked_records: linkedRecords,
            status: "submitted",
          })
          .select()
          .single();
        if (ccErr) return fail(ccErr.message);
        counterclaim = cc;
      }

      let newStatus = "under_discussion";
      if (position === "accept_full") newStatus = "negotiation";

      const now = new Date().toISOString();
      const { data: updated, error: updErr } = await supabase
        .from("disputes")
        .update({ status: newStatus, current_stage: newStatus, updated_at: now })
        .eq("id", disputeId).select().single();
      if (updErr) return fail(updErr.message);

      const positionTitle =
        position === "accept_full" ? "Claim accepted in full"
          : position === "accept_part" ? "Claim accepted in part"
            : position === "dispute" ? "Claim disputed"
              : "Clarification requested";

      await supabase.from("dispute_events").insert({
        dispute_id: disputeId,
        event_type: "response_submitted",
        actor_user_id: user.id,
        actor_role: "respondent",
        title: "Formal response submitted",
        description: positionTitle,
        related_record_type: "dispute_claim",
        related_record_id: responseClaim.id,
        visibility: "parties",
      });

      if (counterclaim) {
        await supabase.from("dispute_events").insert({
          dispute_id: disputeId,
          event_type: "counterclaim_submitted",
          actor_user_id: user.id,
          actor_role: "respondent",
          title: "Counterclaim submitted",
          related_record_type: "dispute_claim",
          related_record_id: counterclaim.id,
          visibility: "parties",
        });
      }

      if (position === "accept_full") {
        await supabase.from("dispute_events").insert({
          dispute_id: disputeId,
          event_type: "resolution_requested",
          actor_user_id: user.id,
          actor_role: "respondent",
          title: "Agreement proposed (claim accepted in full)",
          description: "The claim was accepted in full. The other party's confirmation is required to close the case.",
          visibility: "parties",
        });
      }

      await supabase.from("dispute_audit_log").insert({
        dispute_id: disputeId,
        actor_user_id: user.id,
        action: "claim.response_submitted",
        target_type: "dispute_claim",
        target_id: responseClaim.id,
        previous_value: { status: dispute.status },
        new_value: { status: newStatus, position },
      });

      await notifyParty(
        supabase,
        dispute,
        dispute.claimant_user_id,
        "dispute_response_received",
        "Response received on your dispute",
        `${dispute.case_reference}: the other party has submitted a formal response.`,
        "high",
        `dispute:${disputeId}:response:${responseClaim.id}`,
      );

      return ok({ dispute: updated, claim: responseClaim, counterclaim });
    }

    // ── request_clarification ──────────────────────────────────────────────
    if (action === "request_clarification") {
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      const point = typeof body?.point === "string" ? body.point.trim() : "";
      const relevance = typeof body?.relevance === "string" ? body.relevance.trim() : "";
      const deadlineDays = typeof body?.deadlineDays === "number" ? body.deadlineDays : 7;
      const targetClaimId = typeof body?.targetClaimId === "string" ? body.targetClaimId : null;

      if (!disputeId || !point || !relevance) return fail("disputeId, point and relevance are required");

      const { data: dispute } = await supabase
        .from("disputes").select("*").eq("id", disputeId).maybeSingle();
      if (!dispute) return fail("Dispute not found", 404);
      const isParty = dispute.claimant_user_id === user.id || dispute.respondent_user_id === user.id;
      if (!isParty) return fail("Only parties to this dispute can request clarification", 403);
      if (ACTIVE_STATUSES.indexOf(dispute.status) === -1) return fail("This dispute is not in an active state", 409);

      const { data: openReqs } = await supabase
        .from("dispute_clarifications").select("id")
        .eq("dispute_id", disputeId).eq("status", "open");
      if ((openReqs || []).length >= 3) {
        return fail("Too many open clarification requests — resolve existing ones first", 409);
      }
      const { data: dup } = await supabase
        .from("dispute_clarifications").select("id")
        .eq("dispute_id", disputeId).eq("status", "open").eq("point", point)
        .maybeSingle();
      if (dup) return fail("A clarification on this exact point is already open", 409);

      const dueAt = new Date(Date.now() + Math.max(1, Math.min(28, deadlineDays)) * 86400000).toISOString();

      const { data: clarification, error: clarErr } = await supabase
        .from("dispute_clarifications")
        .insert({
          dispute_id: disputeId,
          requested_by_user_id: user.id,
          target_claim_id: targetClaimId,
          point,
          relevance,
          response_due_at: dueAt,
          status: "open",
        })
        .select()
        .single();
      if (clarErr) return fail(clarErr.message);

      const actorRole = dispute.claimant_user_id === user.id ? "claimant" : "respondent";
      await supabase.from("dispute_events").insert({
        dispute_id: disputeId,
        event_type: "clarification_requested",
        actor_user_id: user.id,
        actor_role: actorRole,
        title: "Clarification requested",
        description: point,
        related_record_type: "dispute_clarification",
        related_record_id: clarification.id,
        visibility: "parties",
      });

      await supabase.from("dispute_audit_log").insert({
        dispute_id: disputeId,
        actor_user_id: user.id,
        action: "clarification.requested",
        target_type: "dispute_clarification",
        target_id: clarification.id,
        new_value: { point, response_due_at: dueAt },
      });

      const otherUserId = dispute.claimant_user_id === user.id ? dispute.respondent_user_id : dispute.claimant_user_id;
      if (otherUserId) {
        await notifyParty(
          supabase,
          dispute,
          otherUserId,
          "dispute_clarification_requested",
          "Clarification requested on your dispute",
          `${dispute.case_reference}: a point needs clarification.`,
          "normal",
          `dispute:${disputeId}:clarification:${clarification.id}`,
        );
      }

      return ok({ clarification });
    }

    // ── answer_clarification ───────────────────────────────────────────────
    if (action === "answer_clarification") {
      const clarificationId = typeof body?.clarificationId === "string" ? body.clarificationId : "";
      const response = typeof body?.response === "string" ? body.response.trim() : "";
      if (!clarificationId || !response) return fail("clarificationId and response are required");

      const { data: clarification } = await supabase
        .from("dispute_clarifications").select("*").eq("id", clarificationId).maybeSingle();
      if (!clarification) return fail("Clarification not found", 404);
      if (clarification.status !== "open") return fail("This clarification has already been answered", 409);

      const { data: dispute } = await supabase
        .from("disputes").select("*").eq("id", clarification.dispute_id).maybeSingle();
      if (!dispute) return fail("Dispute not found", 404);
      const isParty = dispute.claimant_user_id === user.id || dispute.respondent_user_id === user.id;
      if (!isParty) return fail("Only parties can answer a clarification", 403);
      if (clarification.requested_by_user_id === user.id) {
        return fail("You cannot answer your own clarification request", 403);
      }

      const now = new Date().toISOString();
      const { data: updated, error: updErr } = await supabase
        .from("dispute_clarifications")
        .update({ status: "answered", response, answered_by_user_id: user.id, answered_at: now })
        .eq("id", clarificationId).select().single();
      if (updErr) return fail(updErr.message);

      const actorRole = dispute.claimant_user_id === user.id ? "claimant" : "respondent";
      await supabase.from("dispute_events").insert({
        dispute_id: dispute.id,
        event_type: "clarification_answered",
        actor_user_id: user.id,
        actor_role: actorRole,
        title: "Clarification answered",
        description: response,
        related_record_type: "dispute_clarification",
        related_record_id: clarificationId,
        visibility: "parties",
      });

      await supabase.from("dispute_audit_log").insert({
        dispute_id: dispute.id,
        actor_user_id: user.id,
        action: "clarification.answered",
        target_type: "dispute_clarification",
        target_id: clarificationId,
        previous_value: { status: "open" },
        new_value: { status: "answered" },
      });

      if (clarification.requested_by_user_id) {
        await notifyParty(
          supabase,
          dispute,
          clarification.requested_by_user_id,
          "dispute_clarification_answered",
          "Clarification answered",
          `${dispute.case_reference}: your clarification request has been answered.`,
          "normal",
          `dispute:${dispute.id}:clarification:answered:${clarificationId}`,
        );
      }

      return ok({ clarification: updated });
    }

    // ── correct_claim (versioned via supersedes_claim_id) ──────────────────
    if (action === "correct_claim") {
      const claimId = typeof body?.claimId === "string" ? body.claimId : "";
      if (!claimId) return fail("claimId is required");

      const { data: original } = await supabase
        .from("dispute_claims").select("*").eq("id", claimId).maybeSingle();
      if (!original) return fail("Claim not found", 404);
      if (original.submitted_by_user_id !== user.id) {
        return fail("You can only correct your own claim", 403);
      }

      const { data: dispute } = await supabase
        .from("disputes").select("status, claimant_user_id").eq("id", original.dispute_id).maybeSingle();
      if (!dispute || ACTIVE_STATUSES.indexOf(dispute.status) === -1) {
        return fail("This dispute is not in an active state", 409);
      }

      const { data: correction, error: corrErr } = await supabase
        .from("dispute_claims")
        .insert({
          dispute_id: original.dispute_id,
          submitted_by_user_id: user.id,
          claim_type: "correction",
          statement: typeof body?.statement === "string" ? body.statement : original.statement,
          amount_pence: typeof body?.amountPence === "number" ? body.amountPence : original.amount_pence,
          calculation_breakdown: body?.calculationBreakdown ?? original.calculation_breakdown,
          requested_remedy: typeof body?.requestedRemedy === "string" ? body.requestedRemedy : original.requested_remedy,
          status: "submitted",
          supersedes_claim_id: original.id,
        })
        .select()
        .single();
      if (corrErr) return fail(corrErr.message);

      await supabase.from("dispute_claims").update({ status: "superseded" }).eq("id", original.id);

      await supabase.from("dispute_events").insert({
        dispute_id: original.dispute_id,
        event_type: "claim_corrected",
        actor_user_id: user.id,
        actor_role: dispute && original.submitted_by_user_id === dispute.claimant_user_id ? "claimant" : "respondent",
        title: "Claim corrected",
        related_record_type: "dispute_claim",
        related_record_id: correction.id,
        visibility: "parties",
      });

      await supabase.from("dispute_audit_log").insert({
        dispute_id: original.dispute_id,
        actor_user_id: user.id,
        action: "claim.corrected",
        target_type: "dispute_claim",
        target_id: original.id,
        previous_value: { status: "submitted" },
        new_value: { status: "superseded", superseded_by: correction.id },
      });

      return ok({ claim: correction });
    }

    // ── list_disputes (server-side join for the list dashboard) ────────────
    if (action === "list_disputes") {
      const { data: disputes, error: listErr } = await supabase
        .from("disputes")
        .select("*")
        .or(`claimant_user_id.eq.${user.id},respondent_user_id.eq.${user.id}`)
        .order("created_at", { ascending: false });
      if (listErr) return fail(listErr.message);

      const rows = disputes || [];
      if (rows.length === 0) return ok({ items: [] });

      const projectIds = [...new Set(rows.map((d) => d.project_id))];
      const disputeIds = rows.map((d) => d.id);

      const [{ data: jobs }, { data: parties }, { data: events }] = await Promise.all([
        supabase.from("jobs").select("id, reference, project_name").in("id", projectIds),
        supabase.from("dispute_parties").select("*").in("dispute_id", disputeIds),
        supabase.from("dispute_events").select("dispute_id, title, created_at, visibility")
          .in("dispute_id", disputeIds).order("created_at", { ascending: false }),
      ]);

      const jobMap: Record<string, { reference: string | null; project_name: string | null }> = {};
      (jobs || []).forEach((j) => {
        jobMap[j.id] = { reference: j.reference ?? null, project_name: j.project_name ?? null };
      });

      const partiesByDispute: Record<string, Record<string, unknown>[]> = {};
      (parties || []).forEach((p) => {
        (partiesByDispute[p.dispute_id] ||= []).push(p);
      });

      const roleByDispute: Record<string, "claimant" | "respondent"> = {};
      rows.forEach((d) => {
        if (d.claimant_user_id === user.id) roleByDispute[d.id] = "claimant";
        else if (d.respondent_user_id === user.id) roleByDispute[d.id] = "respondent";
      });

      const lastEventByDispute: Record<string, { title: string; created_at: string }> = {};
      (events || []).forEach((e) => {
        const role = roleByDispute[e.dispute_id];
        const visible = role
          ? (e.visibility === "parties" || (role === "claimant" ? e.visibility === "claimant" : e.visibility === "respondent"))
          : false;
        if (visible && !lastEventByDispute[e.dispute_id]) lastEventByDispute[e.dispute_id] = e;
      });

      const items = rows.map((d) => {
        const myRole = d.claimant_user_id === user.id ? "claimant"
          : d.respondent_user_id === user.id ? "respondent" : null;
        const dps = partiesByDispute[d.id] || [];
        const other = dps.find((p) => p.user_id !== user.id);
        const otherRole = other
          ? (other.party_role === "claimant" ? d.claimant_role : d.respondent_role)
          : (myRole === "claimant" ? d.respondent_role : d.claimant_role);
        const job = jobMap[d.project_id];
        const last = lastEventByDispute[d.id];

        let actionRequired = false;
        let nextAction: string | null = null;
        if (d.status === "draft") {
          if (myRole === "claimant") { actionRequired = true; nextAction = "Submit your dispute"; }
        } else if (d.status === "open" || d.status === "awaiting_response") {
          if (myRole === "respondent") { actionRequired = true; nextAction = "Submit your response"; }
          else if (myRole === "claimant") { nextAction = "Awaiting other party's response"; }
        } else if (d.status === "negotiation") {
          if (myRole === "claimant") { actionRequired = true; nextAction = "Confirm the agreed resolution"; }
          else { nextAction = "Awaiting confirmation of resolution"; }
        } else if (ACTIVE_STATUSES.indexOf(d.status) !== -1) {
          nextAction = "Respond or add clarification";
        } else {
          nextAction = "Closed";
        }

        return {
          ...d,
          project_name: job?.project_name ?? null,
          project_reference: job?.reference ?? null,
          my_role: myRole,
          other_party_name: other?.display_name_snapshot ?? null,
          other_party_role: otherRole,
          action_required: actionRequired,
          next_action: nextAction,
          last_activity_at: last?.created_at ?? d.updated_at,
          last_activity_title: last?.title ?? null,
        };
      });

      return ok({ items });
    }

    // ── get_dispute_detail (server-side join + access revalidation) ────────
    if (action === "get_dispute_detail") {
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      if (!disputeId) return fail("disputeId is required");

      const { data: dispute } = await supabase
        .from("disputes").select("*").eq("id", disputeId).maybeSingle();
      if (!dispute) return fail("Not found", 404);

      const isClaimant = dispute.claimant_user_id === user.id;
      const isRespondent = dispute.respondent_user_id === user.id;
      const isParty = isClaimant || isRespondent;

      // Organisation role alone grants no case access: only the two named
      // parties read here. Platform staff use the dispute-admin function with
      // an explicit dispute permission + recorded reason + access log.
      if (!isParty) return fail("Access denied", 403);

      const [{ data: job }, { data: parties }, { data: claims }, { data: events }, { data: clarifications }] = await Promise.all([
        supabase.from("jobs").select("id, reference, project_name").eq("id", dispute.project_id).maybeSingle(),
        supabase.from("dispute_parties").select("*").eq("dispute_id", disputeId).order("joined_at", { ascending: true }),
        supabase.from("dispute_claims").select("*").eq("dispute_id", disputeId).order("submitted_at", { ascending: true }),
        supabase.from("dispute_events").select("*").eq("dispute_id", disputeId).order("created_at", { ascending: true }),
        supabase.from("dispute_clarifications").select("*").eq("dispute_id", disputeId).order("created_at", { ascending: true }),
      ]);

      const partyUserIds = (parties || []).map((p) => p.user_id).filter(Boolean);
      const { data: profiles } = await supabase
        .from("profiles").select("id, full_name, job_title").in("id", partyUserIds);
      const profileMap: Record<string, { full_name: string | null; job_title: string | null }> = {};
      (profiles || []).forEach((p) => { profileMap[p.id] = p; });

      const partiesView = (parties || []).map((p) => ({
        ...p,
        profile_name: profileMap[p.user_id]?.full_name ?? p.display_name_snapshot ?? null,
        profile_job_title: profileMap[p.user_id]?.job_title ?? null,
      }));

      const isDraft = dispute.status === "draft";
      const isActive = ACTIVE_STATUSES.indexOf(dispute.status) !== -1;
      const isAwaitingResponse = dispute.status === "open" || dispute.status === "awaiting_response";

      const hasPriorResponse = (claims || []).some(
        (c) => c.claim_type === "response" && c.submitted_by_user_id === user.id && c.status !== "superseded",
      );

      const resReq = (events || []).find((e) => e.event_type === "resolution_requested");
      const resolution = {
        pendingRequest: !!resReq,
        requestedByMe: resReq ? resReq.actor_user_id === user.id : false,
      };

      const openClarificationForMe = (clarifications || []).some(
        (c) => c.status === "open" && c.requested_by_user_id !== user.id,
      );

      const actions = {
        canEditDraft: isDraft && isClaimant,
        canSubmit: isDraft && isClaimant,
        canAddClaim: isParty && isActive,
        canCorrectOwnClaim: isParty && isActive,
        canRespond: isParty && isActive,
        canSubmitResponse: isRespondent && isAwaitingResponse && !hasPriorResponse,
        canRequestClarification: isParty && isActive,
        canAnswerClarification: isParty && openClarificationForMe,
        canWithdraw: isClaimant && (isActive || dispute.status === "open"),
        canRequestResolution: isParty && isActive && !resolution.pendingRequest,
        canConfirmResolution: isParty && isActive && resolution.pendingRequest && !resolution.requestedByMe,
        canViewFull: isParty,
        isParty,
      };

      return ok({
        dispute,
        project: job ? { id: job.id, reference: job.reference ?? null, project_name: job.project_name ?? null } : null,
        parties: partiesView,
        claims: claims || [],
        clarifications: clarifications || [],
        events: (events || []).filter((e) =>
          isClaimant ? e.visibility === "parties" || e.visibility === "claimant"
            : e.visibility === "parties" || e.visibility === "respondent"
        ),
        actions,
        myRole: isClaimant ? "claimant" : isRespondent ? "respondent" : null,
        resolution,
      });
    }

    // ── list_my_projects (for the Raise an issue form) ─────────────────────
    if (action === "list_my_projects") {
      const { data: memberships } = await supabase
        .from("organisation_members")
        .select("organisation_id")
        .eq("user_id", user.id)
        .eq("status", "active");
      const orgIds = (memberships || []).map((m) => m.organisation_id);
      if (orgIds.length === 0) return ok({ projects: [] });

      const { data: jobs } = await supabase
        .from("jobs")
        .select("id, reference, project_name, status")
        .in("organisation_id", orgIds)
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      return ok({ projects: jobs || [] });
    }

    // ── withdraw (claimant only) ───────────────────────────────────────────
    if (action === "withdraw") {
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      if (!disputeId) return fail("disputeId is required");

      const { data: dispute } = await supabase
        .from("disputes").select("*").eq("id", disputeId).maybeSingle();
      if (!dispute) return fail("Dispute not found", 404);
      if (dispute.claimant_user_id !== user.id) return fail("Only the claimant can withdraw this dispute", 403);
      if (TERMINAL_STATUSES.indexOf(dispute.status) !== -1) return fail("This dispute is already closed", 409);

      const now = new Date().toISOString();
      const { data: updated } = await supabase
        .from("disputes")
        .update({ status: "withdrawn", current_stage: "withdrawn", closed_at: now, updated_at: now })
        .eq("id", disputeId).select().single();

      await supabase.from("dispute_events").insert({
        dispute_id: disputeId,
        event_type: "dispute_withdrawn",
        actor_user_id: user.id,
        actor_role: "claimant",
        title: "Dispute withdrawn",
        visibility: "parties",
      });

      await supabase.from("dispute_audit_log").insert({
        dispute_id: disputeId,
        actor_user_id: user.id,
        action: "dispute.withdrawn",
        target_type: "dispute",
        target_id: disputeId,
        previous_value: { status: dispute.status },
        new_value: { status: "withdrawn" },
      });

      return ok({ dispute: updated });
    }

    // ── request_resolution (party proposes agreed resolution) ──────────────
    if (action === "request_resolution") {
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      if (!disputeId) return fail("disputeId is required");

      const { data: dispute } = await supabase
        .from("disputes").select("*").eq("id", disputeId).maybeSingle();
      if (!dispute) return fail("Dispute not found", 404);
      const isParty = dispute.claimant_user_id === user.id || dispute.respondent_user_id === user.id;
      if (!isParty) return fail("Only parties can request a resolution", 403);
      if (ACTIVE_STATUSES.indexOf(dispute.status) === -1) return fail("This dispute is not in an active state", 409);

      const { data: existing } = await supabase
        .from("dispute_events").select("id").eq("dispute_id", disputeId)
        .eq("event_type", "resolution_requested").maybeSingle();
      if (existing) return fail("A resolution has already been requested", 409);

      await supabase.from("dispute_events").insert({
        dispute_id: disputeId,
        event_type: "resolution_requested",
        actor_user_id: user.id,
        actor_role: dispute.claimant_user_id === user.id ? "claimant" : "respondent",
        title: "Agreed resolution requested",
        visibility: "parties",
      });

      return ok({ requested: true });
    }

    // ── confirm_resolution (other party confirms → resolved) ───────────────
    if (action === "confirm_resolution") {
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      if (!disputeId) return fail("disputeId is required");

      const { data: dispute } = await supabase
        .from("disputes").select("*").eq("id", disputeId).maybeSingle();
      if (!dispute) return fail("Dispute not found", 404);
      const isParty = dispute.claimant_user_id === user.id || dispute.respondent_user_id === user.id;
      if (!isParty) return fail("Only parties can confirm a resolution", 403);
      if (ACTIVE_STATUSES.indexOf(dispute.status) === -1) return fail("This dispute is not in an active state", 409);

      const { data: req } = await supabase
        .from("dispute_events").select("*").eq("dispute_id", disputeId)
        .eq("event_type", "resolution_requested").maybeSingle();
      if (!req) return fail("No resolution request to confirm", 409);
      if (req.actor_user_id === user.id) return fail("The other party must confirm this resolution", 409);

      const now = new Date().toISOString();
      const { data: updated } = await supabase
        .from("disputes")
        .update({ status: "resolved", current_stage: "resolved", resolved_at: now, closed_at: now, updated_at: now })
        .eq("id", disputeId).select().single();

      await supabase.from("dispute_events").insert({
        dispute_id: disputeId,
        event_type: "resolution_agreed",
        actor_user_id: user.id,
        actor_role: dispute.claimant_user_id === user.id ? "claimant" : "respondent",
        title: "Resolution agreed",
        visibility: "parties",
      });

      await supabase.from("dispute_audit_log").insert({
        dispute_id: disputeId,
        actor_user_id: user.id,
        action: "dispute.resolved",
        target_type: "dispute",
        target_id: disputeId,
        previous_value: { status: dispute.status },
        new_value: { status: "resolved" },
      });

      return ok({ dispute: updated });
    }

    // ── list_offers (negotiation tab) ────────────────────────────────────
    if (action === "list_offers") {
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      if (!disputeId) return fail("disputeId is required");

      const { data: dispute } = await supabase
        .from("disputes").select("*").eq("id", disputeId).maybeSingle();
      if (!dispute) return fail("Dispute not found", 404);

      const isParty = dispute.claimant_user_id === user.id || dispute.respondent_user_id === user.id;
      if (!isParty) return fail("Access denied", 403);

      await supabase.from("dispute_settlement_offers").update({ status: "expired" })
        .eq("dispute_id", disputeId).eq("status", "submitted")
        .lt("response_deadline", new Date().toISOString());

      const [{ data: offers }, { data: obligations }] = await Promise.all([
        supabase.from("dispute_settlement_offers").select("*").eq("dispute_id", disputeId).order("created_at", { ascending: true }),
        supabase.from("dispute_settlement_obligations").select("*").eq("dispute_id", disputeId).order("created_at", { ascending: true }),
      ]);

      const userIds = new Set<string>();
      (offers || []).forEach((o: { offered_by_user_id: string; responded_by_user_id: string | null }) => {
        userIds.add(o.offered_by_user_id);
        if (o.responded_by_user_id) userIds.add(o.responded_by_user_id);
      });
      (obligations || []).forEach((ob: { submitted_by_user_id: string | null; confirmed_by_user_id: string | null }) => {
        if (ob.submitted_by_user_id) userIds.add(ob.submitted_by_user_id);
        if (ob.confirmed_by_user_id) userIds.add(ob.confirmed_by_user_id);
      });
      const { data: profiles } = await supabase
        .from("profiles").select("id, full_name").in("id", [...userIds]);
      const nameMap: Record<string, string | null> = {};
      (profiles || []).forEach((p: { id: string; full_name: string | null }) => { nameMap[p.id] = p.full_name ?? null; });

      const roleFor = (uid: string): string | null =>
        uid === dispute.claimant_user_id ? "claimant" : uid === dispute.respondent_user_id ? "respondent" : null;

      const offersView = (offers || []).map((o: Record<string, unknown>) => ({
        ...o,
        offered_by_name: nameMap[o.offered_by_user_id as string] ?? null,
        offered_by_role: roleFor(o.offered_by_user_id as string),
        responded_by_name: o.responded_by_user_id ? nameMap[o.responded_by_user_id as string] ?? null : null,
      }));

      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const obligationsView = (obligations || []).map((ob: Record<string, unknown>) => {
        let effective = ob.status as string;
        if (["not_started", "in_progress", "submitted_completed"].indexOf(ob.status as string) !== -1 && ob.due_date) {
          const due = new Date(`${ob.due_date}T00:00:00`);
          if (due < today) effective = "overdue";
        }
        return {
          ...ob,
          effective_status: effective,
          submitted_by_name: ob.submitted_by_user_id ? nameMap[ob.submitted_by_user_id as string] ?? null : null,
          confirmed_by_name: ob.confirmed_by_user_id ? nameMap[ob.confirmed_by_user_id as string] ?? null : null,
        };
      });

      const sortedOffers = [...offersView].sort(
        (a, b) => new Date((b as { created_at: string }).created_at).getTime() - new Date((a as { created_at: string }).created_at).getTime(),
      );
      const activeOffer = sortedOffers.find((o) => o.status === "submitted") ?? null;
      const acceptedOffer = offersView.find((o) => o.status === "accepted") ?? null;
      const isActive = ACTIVE_STATUSES.indexOf(dispute.status) !== -1;

      return ok({
        offers: offersView,
        obligations: obligationsView,
        activeOfferId: activeOffer?.id ?? null,
        acceptedOfferId: acceptedOffer?.id ?? null,
        canCreateOffer: isParty && isActive,
        canRespondOffer: isParty && isActive && !!activeOffer && activeOffer.offered_by_user_id !== user.id,
      });
    }

    // ── create_offer ──────────────────────────────────────────────────────
    if (action === "create_offer") {
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      const offerType = typeof body?.offerType === "string" ? body.offerType : "";
      const summary = typeof body?.summary === "string" ? body.summary.trim() : "";
      if (!disputeId || !summary) return fail("disputeId and summary are required");
      if (OFFER_TYPES.indexOf(offerType) === -1) return fail("A valid offer type is required");

      const { data: dispute } = await supabase
        .from("disputes").select("*").eq("id", disputeId).maybeSingle();
      if (!dispute) return fail("Dispute not found", 404);
      const isParty = dispute.claimant_user_id === user.id || dispute.respondent_user_id === user.id;
      if (!isParty) return fail("Only parties to this dispute can make offers", 403);
      if (ACTIVE_STATUSES.indexOf(dispute.status) === -1) return fail("This dispute is not in an active state", 409);

      const dayAgo = new Date(Date.now() - 24 * 3600000).toISOString();
      const { data: recent } = await supabase
        .from("dispute_settlement_offers").select("id")
        .eq("dispute_id", disputeId).eq("offered_by_user_id", user.id).gte("created_at", dayAgo);
      if ((recent || []).length >= 5) {
        return fail("Too many offers submitted recently — please wait before submitting another", 429);
      }

      const actorRole = dispute.claimant_user_id === user.id ? "claimant" : "respondent";
      const { data: offer, error: offerErr } = await supabase
        .from("dispute_settlement_offers")
        .insert({
          dispute_id: disputeId,
          offered_by_user_id: user.id,
          offer_type: offerType,
          summary,
          payment_amount_pence: typeof body?.paymentAmountPence === "number" ? body.paymentAmountPence : null,
          currency: typeof body?.currency === "string" ? body.currency : "GBP",
          work_description: typeof body?.workDescription === "string" ? body.workDescription.trim() || null : null,
          proposed_completion_date: typeof body?.proposedCompletionDate === "string" ? body.proposedCompletionDate || null : null,
          payment_due_date: typeof body?.paymentDueDate === "string" ? body.paymentDueDate || null : null,
          conditions: typeof body?.conditions === "string" ? body.conditions.trim() || null : null,
          referenced_evidence: typeof body?.referencedEvidence === "string" ? body.referencedEvidence.trim() || null : null,
          response_deadline: typeof body?.responseDeadline === "string" ? body.responseDeadline || null : null,
          status: "submitted",
        })
        .select()
        .single();
      if (offerErr) return fail(offerErr.message);

      await supabase.from("disputes")
        .update({ status: "negotiation", current_stage: "negotiation", updated_at: new Date().toISOString() })
        .eq("id", disputeId);

      await supabase.from("dispute_events").insert({
        dispute_id: disputeId, event_type: "offer_submitted", actor_user_id: user.id, actor_role: actorRole,
        title: "Settlement offer submitted", description: summary,
        related_record_type: "dispute_settlement_offer", related_record_id: offer.id, visibility: "parties",
      });
      await supabase.from("dispute_audit_log").insert({
        dispute_id: disputeId, actor_user_id: user.id, action: "offer.submitted",
        target_type: "dispute_settlement_offer", target_id: offer.id, new_value: { offer_type: offerType, status: "submitted" },
      });

      const otherUserId = dispute.claimant_user_id === user.id ? dispute.respondent_user_id : dispute.claimant_user_id;
      if (otherUserId) {
        await notifyParty(supabase, dispute, otherUserId, "dispute_offer_received",
          "A settlement offer has been made on your dispute",
          `${dispute.case_reference}: a settlement offer is awaiting your response.`,
          "high", `dispute:${disputeId}:offer:${offer.id}`);
      }
      return ok({ offer });
    }

    // ── withdraw_offer (creator only, unaccepted) ─────────────────────────
    if (action === "withdraw_offer") {
      const offerId = typeof body?.offerId === "string" ? body.offerId : "";
      if (!offerId) return fail("offerId is required");

      const { data: offer } = await supabase
        .from("dispute_settlement_offers").select("*").eq("id", offerId).maybeSingle();
      if (!offer) return fail("Offer not found", 404);
      if (offer.offered_by_user_id !== user.id) return fail("Only the creator can withdraw this offer", 403);
      if (offer.status !== "submitted") return fail("Only an unaccepted offer can be withdrawn", 409);

      const { data: dispute } = await supabase
        .from("disputes").select("*").eq("id", offer.dispute_id).maybeSingle();
      const now = new Date().toISOString();
      const { data: updated, error: updErr } = await supabase
        .from("dispute_settlement_offers")
        .update({ status: "withdrawn", withdrawn_at: now }).eq("id", offerId).select().single();
      if (updErr) return fail(updErr.message);

      const actorRole = dispute && dispute.claimant_user_id === user.id ? "claimant" : "respondent";
      await supabase.from("dispute_events").insert({
        dispute_id: offer.dispute_id, event_type: "offer_withdrawn", actor_user_id: user.id, actor_role: actorRole,
        title: "Settlement offer withdrawn",
        related_record_type: "dispute_settlement_offer", related_record_id: offerId, visibility: "parties",
      });
      await supabase.from("dispute_audit_log").insert({
        dispute_id: offer.dispute_id, actor_user_id: user.id, action: "offer.withdrawn",
        target_type: "dispute_settlement_offer", target_id: offerId,
        previous_value: { status: "submitted" }, new_value: { status: "withdrawn" },
      });
      if (dispute) {
        const otherUserId = dispute.claimant_user_id === user.id ? dispute.respondent_user_id : dispute.claimant_user_id;
        if (otherUserId) {
          await notifyParty(supabase, dispute, otherUserId, "dispute_offer_withdrawn",
            "A settlement offer was withdrawn",
            `${dispute.case_reference}: a settlement offer has been withdrawn.`,
            "normal", `dispute:${offer.dispute_id}:offer:withdrawn:${offerId}`);
        }
      }
      return ok({ offer: updated });
    }

    // ── respond_offer (accept / reject / counter / clarify) ───────────────
    if (action === "respond_offer") {
      const offerId = typeof body?.offerId === "string" ? body.offerId : "";
      const response = typeof body?.response === "string" ? body.response : "";
      if (!offerId || ["accept", "reject", "counter", "clarify"].indexOf(response) === -1) {
        return fail("offerId and a valid response are required");
      }

      const { data: offer } = await supabase
        .from("dispute_settlement_offers").select("*").eq("id", offerId).maybeSingle();
      if (!offer) return fail("Offer not found", 404);
      if (offer.offered_by_user_id === user.id) return fail("You cannot respond to your own offer", 403);

      const { data: dispute } = await supabase
        .from("disputes").select("*").eq("id", offer.dispute_id).maybeSingle();
      if (!dispute) return fail("Dispute not found", 404);
      const isParty = dispute.claimant_user_id === user.id || dispute.respondent_user_id === user.id;
      if (!isParty) return fail("Only parties can respond to an offer", 403);

      if (offer.status !== "submitted") return fail("This offer is no longer open for response", 409);
      if (offer.response_deadline && new Date(offer.response_deadline) < new Date()) {
        await supabase.from("dispute_settlement_offers").update({ status: "expired" }).eq("id", offerId);
        return fail("This offer has expired", 409);
      }

      const now = new Date().toISOString();
      const actorRole = dispute.claimant_user_id === user.id ? "claimant" : "respondent";

      if (response === "accept") {
        const { data: updated } = await supabase
          .from("dispute_settlement_offers")
          .update({ status: "accepted", responded_by_user_id: user.id, responded_at: now })
          .eq("id", offerId).select().single();
        await createObligationsFromOffer(supabase, dispute.id, offer);
        await supabase.from("disputes")
          .update({ status: "negotiation", current_stage: "negotiation", updated_at: now }).eq("id", dispute.id);
        await supabase.from("dispute_events").insert({
          dispute_id: dispute.id, event_type: "offer_accepted", actor_user_id: user.id, actor_role: actorRole,
          title: "Settlement offer accepted", description: offer.summary,
          related_record_type: "dispute_settlement_offer", related_record_id: offerId, visibility: "parties",
        });
        await supabase.from("dispute_audit_log").insert({
          dispute_id: dispute.id, actor_user_id: user.id, action: "offer.accepted",
          target_type: "dispute_settlement_offer", target_id: offerId,
          previous_value: { status: "submitted" }, new_value: { status: "accepted" },
        });
        await notifyParty(supabase, dispute, offer.offered_by_user_id, "dispute_offer_accepted",
          "Your settlement offer was accepted",
          `${dispute.case_reference}: your offer has been accepted. The agreed obligations are now being tracked.`,
          "high", `dispute:${dispute.id}:offer:accepted:${offerId}`);
        return ok({ offer: updated });
      }

      if (response === "reject") {
        const { data: updated } = await supabase
          .from("dispute_settlement_offers")
          .update({ status: "rejected", responded_by_user_id: user.id, responded_at: now })
          .eq("id", offerId).select().single();
        await supabase.from("dispute_events").insert({
          dispute_id: dispute.id, event_type: "offer_rejected", actor_user_id: user.id, actor_role: actorRole,
          title: "Settlement offer rejected",
          related_record_type: "dispute_settlement_offer", related_record_id: offerId, visibility: "parties",
        });
        await supabase.from("dispute_audit_log").insert({
          dispute_id: dispute.id, actor_user_id: user.id, action: "offer.rejected",
          target_type: "dispute_settlement_offer", target_id: offerId,
          previous_value: { status: "submitted" }, new_value: { status: "rejected" },
        });
        await notifyParty(supabase, dispute, offer.offered_by_user_id, "dispute_offer_rejected",
          "Your settlement offer was rejected",
          `${dispute.case_reference}: your offer was not accepted.`,
          "normal", `dispute:${dispute.id}:offer:rejected:${offerId}`);
        return ok({ offer: updated });
      }

      if (response === "counter") {
        const offerType = typeof body?.offerType === "string" ? body.offerType : "";
        const summary = typeof body?.summary === "string" ? body.summary.trim() : "";
        if (OFFER_TYPES.indexOf(offerType) === -1 || !summary) {
          return fail("A counteroffer requires a valid type and summary");
        }

        await supabase.from("dispute_settlement_offers")
          .update({ status: "countered", responded_by_user_id: user.id, responded_at: now }).eq("id", offerId);

        const { data: counter, error: cErr } = await supabase
          .from("dispute_settlement_offers")
          .insert({
            dispute_id: dispute.id,
            offered_by_user_id: user.id,
            offer_type: offerType,
            summary,
            payment_amount_pence: typeof body?.paymentAmountPence === "number" ? body.paymentAmountPence : null,
            currency: typeof body?.currency === "string" ? body.currency : "GBP",
            work_description: typeof body?.workDescription === "string" ? body.workDescription.trim() || null : null,
            proposed_completion_date: typeof body?.proposedCompletionDate === "string" ? body.proposedCompletionDate || null : null,
            payment_due_date: typeof body?.paymentDueDate === "string" ? body.paymentDueDate || null : null,
            conditions: typeof body?.conditions === "string" ? body.conditions.trim() || null : null,
            referenced_evidence: typeof body?.referencedEvidence === "string" ? body.referencedEvidence.trim() || null : null,
            response_deadline: typeof body?.responseDeadline === "string" ? body.responseDeadline || null : null,
            status: "submitted",
            supersedes_offer_id: offerId,
          })
          .select()
          .single();
        if (cErr) return fail(cErr.message);

        await supabase.from("dispute_events").insert({
          dispute_id: dispute.id, event_type: "offer_countered", actor_user_id: user.id, actor_role: actorRole,
          title: "Counteroffer made", description: summary,
          related_record_type: "dispute_settlement_offer", related_record_id: counter.id, visibility: "parties",
        });
        await supabase.from("dispute_audit_log").insert({
          dispute_id: dispute.id, actor_user_id: user.id, action: "offer.countered",
          target_type: "dispute_settlement_offer", target_id: offerId,
          previous_value: { status: "submitted" }, new_value: { status: "countered", counter_offer_id: counter.id },
        });
        await notifyParty(supabase, dispute, offer.offered_by_user_id, "dispute_offer_countered",
          "A counteroffer has been made",
          `${dispute.case_reference}: a counteroffer is awaiting your response.`,
          "high", `dispute:${dispute.id}:offer:counter:${counter.id}`);
        return ok({ offer: counter, counteroffer: counter });
      }

      if (response === "clarify") {
        const point = typeof body?.point === "string" ? body.point.trim() : "";
        const relevance = typeof body?.relevance === "string" ? body.relevance.trim() : "";
        const deadlineDays = typeof body?.deadlineDays === "number" ? body.deadlineDays : 7;
        if (!point || !relevance) return fail("A clarification needs a point and relevance");
        const dueAt = new Date(Date.now() + Math.max(1, Math.min(28, deadlineDays)) * 86400000).toISOString();
        const { data: clarification, error: clarErr } = await supabase
          .from("dispute_clarifications")
          .insert({
            dispute_id: dispute.id, requested_by_user_id: user.id, target_offer_id: offerId,
            point, relevance, response_due_at: dueAt, status: "open",
          })
          .select()
          .single();
        if (clarErr) return fail(clarErr.message);

        await supabase.from("dispute_events").insert({
          dispute_id: dispute.id, event_type: "clarification_requested", actor_user_id: user.id, actor_role: actorRole,
          title: "Clarification requested on offer", description: point,
          related_record_type: "dispute_clarification", related_record_id: clarification.id, visibility: "parties",
        });
        await supabase.from("dispute_audit_log").insert({
          dispute_id: dispute.id, actor_user_id: user.id, action: "offer.clarification_requested",
          target_type: "dispute_settlement_offer", target_id: offerId, new_value: { point },
        });
        await notifyParty(supabase, dispute, offer.offered_by_user_id, "dispute_offer_clarification",
          "Clarification requested on your offer",
          `${dispute.case_reference}: a point in your offer needs clarification.`,
          "normal", `dispute:${dispute.id}:offer:clarify:${clarification.id}`);
        return ok({ clarification });
      }

      return fail("Invalid response");
    }

    // ── update_obligation (start / complete / confirm / dispute) ──────────
    if (action === "update_obligation") {
      const obligationId = typeof body?.obligationId === "string" ? body.obligationId : "";
      const transition = typeof body?.transition === "string" ? body.transition : "";
      const reason = typeof body?.reason === "string" ? body.reason.trim() : null;
      if (!obligationId || ["start", "complete", "confirm", "dispute"].indexOf(transition) === -1) {
        return fail("obligationId and a valid transition are required");
      }

      const { data: obligation } = await supabase
        .from("dispute_settlement_obligations").select("*").eq("id", obligationId).maybeSingle();
      if (!obligation) return fail("Obligation not found", 404);
      const { data: dispute } = await supabase
        .from("disputes").select("*").eq("id", obligation.dispute_id).maybeSingle();
      if (!dispute) return fail("Dispute not found", 404);
      const isParty = dispute.claimant_user_id === user.id || dispute.respondent_user_id === user.id;
      if (!isParty) return fail("Only parties can update obligations", 403);
      const actorRole = dispute.claimant_user_id === user.id ? "claimant" : "respondent";
      const otherUserId = dispute.claimant_user_id === user.id ? dispute.respondent_user_id : dispute.claimant_user_id;
      const now = new Date().toISOString();

      if (transition === "start") {
        if (["not_started", "overdue", "disputed_completion"].indexOf(obligation.status) === -1) {
          return fail("This obligation cannot be started", 409);
        }
        const { data: updated } = await supabase
          .from("dispute_settlement_obligations").update({ status: "in_progress" })
          .eq("id", obligationId).select().single();
        await supabase.from("dispute_audit_log").insert({
          dispute_id: dispute.id, actor_user_id: user.id, action: "obligation.started",
          target_type: "dispute_settlement_obligation", target_id: obligationId,
          previous_value: { status: obligation.status }, new_value: { status: "in_progress" },
        });
        return ok({ obligation: updated });
      }

      if (transition === "complete") {
        if (["not_started", "in_progress", "overdue", "disputed_completion"].indexOf(obligation.status) === -1) {
          return fail("This obligation cannot be marked complete", 409);
        }
        const { data: updated } = await supabase
          .from("dispute_settlement_obligations")
          .update({ status: "submitted_completed", submitted_by_user_id: user.id, submitted_at: now, dispute_reason: null })
          .eq("id", obligationId).select().single();
        await supabase.from("dispute_events").insert({
          dispute_id: dispute.id, event_type: "obligation_completed", actor_user_id: user.id, actor_role: actorRole,
          title: "Obligation submitted as completed", description: obligation.title,
          related_record_type: "dispute_settlement_obligation", related_record_id: obligationId, visibility: "parties",
        });
        await supabase.from("dispute_audit_log").insert({
          dispute_id: dispute.id, actor_user_id: user.id, action: "obligation.completed",
          target_type: "dispute_settlement_obligation", target_id: obligationId,
          previous_value: { status: obligation.status }, new_value: { status: "submitted_completed" },
        });
        if (otherUserId) {
          await notifyParty(supabase, dispute, otherUserId, "dispute_obligation_completed",
            "An obligation was marked complete",
            `${dispute.case_reference}: an obligation has been submitted as completed and needs your confirmation.`,
            "high", `dispute:${dispute.id}:obligation:completed:${obligationId}`);
        }
        return ok({ obligation: updated });
      }

      if (transition === "confirm") {
        if (obligation.status !== "submitted_completed") return fail("This obligation is not awaiting confirmation", 409);
        if (obligation.submitted_by_user_id === user.id) return fail("The other party must confirm completion", 409);
        const { data: updated } = await supabase
          .from("dispute_settlement_obligations")
          .update({ status: "confirmed_completed", confirmed_by_user_id: user.id, confirmed_at: now, dispute_reason: null })
          .eq("id", obligationId).select().single();
        await supabase.from("dispute_events").insert({
          dispute_id: dispute.id, event_type: "obligation_confirmed", actor_user_id: user.id, actor_role: actorRole,
          title: "Obligation confirmed complete", description: obligation.title,
          related_record_type: "dispute_settlement_obligation", related_record_id: obligationId, visibility: "parties",
        });
        await supabase.from("dispute_audit_log").insert({
          dispute_id: dispute.id, actor_user_id: user.id, action: "obligation.confirmed",
          target_type: "dispute_settlement_obligation", target_id: obligationId,
          previous_value: { status: "submitted_completed" }, new_value: { status: "confirmed_completed" },
        });

        const { data: remaining } = await supabase
          .from("dispute_settlement_obligations").select("id")
          .eq("dispute_id", dispute.id).neq("status", "confirmed_completed");
        if (!remaining || remaining.length === 0) {
          await supabase.from("disputes")
            .update({ status: "resolved", current_stage: "resolved", resolved_at: now, closed_at: now, updated_at: now })
            .eq("id", dispute.id);
          if (obligation.offer_id) {
            await supabase.from("dispute_settlement_offers").update({ status: "completed" }).eq("id", obligation.offer_id);
          }
          await supabase.from("dispute_events").insert({
            dispute_id: dispute.id, event_type: "resolution_agreed", actor_user_id: user.id, actor_role: actorRole,
            title: "All obligations confirmed — dispute resolved", visibility: "parties",
          });
        }
        if (otherUserId) {
          await notifyParty(supabase, dispute, otherUserId, "dispute_obligation_confirmed",
            "An obligation was confirmed",
            `${dispute.case_reference}: an obligation was confirmed complete.`,
            "normal", `dispute:${dispute.id}:obligation:confirmed:${obligationId}`);
        }
        return ok({ obligation: updated });
      }

      if (transition === "dispute") {
        if (obligation.status !== "submitted_completed") return fail("This obligation is not awaiting confirmation", 409);
        if (obligation.submitted_by_user_id === user.id) return fail("The other party must dispute completion", 409);
        if (!reason) return fail("Please provide a reason for disputing completion");
        const { data: updated } = await supabase
          .from("dispute_settlement_obligations")
          .update({ status: "disputed_completion", dispute_reason: reason })
          .eq("id", obligationId).select().single();
        await supabase.from("dispute_events").insert({
          dispute_id: dispute.id, event_type: "obligation_disputed", actor_user_id: user.id, actor_role: actorRole,
          title: "Obligation completion disputed", description: reason,
          related_record_type: "dispute_settlement_obligation", related_record_id: obligationId, visibility: "parties",
        });
        await supabase.from("dispute_audit_log").insert({
          dispute_id: dispute.id, actor_user_id: user.id, action: "obligation.disputed",
          target_type: "dispute_settlement_obligation", target_id: obligationId,
          previous_value: { status: "submitted_completed" }, new_value: { status: "disputed_completion", dispute_reason: reason },
        });
        if (otherUserId) {
          await notifyParty(supabase, dispute, otherUserId, "dispute_obligation_disputed",
            "An obligation completion was disputed",
            `${dispute.case_reference}: an obligation's completion has been disputed.`,
            "high", `dispute:${dispute.id}:obligation:disputed:${obligationId}`);
        }
        return ok({ obligation: updated });
      }

      return fail("Invalid transition");
    }

    // ── permitted_actions ──────────────────────────────────────────────────
    if (action === "permitted_actions") {
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      if (!disputeId) return fail("disputeId is required");

      const { data: dispute } = await supabase
        .from("disputes").select("*").eq("id", disputeId).maybeSingle();
      if (!dispute) return fail("Dispute not found", 404);

      const isClaimant = dispute.claimant_user_id === user.id;
      const isRespondent = dispute.respondent_user_id === user.id;
      const isParty = isClaimant || isRespondent;
      const isDraft = dispute.status === "draft";
      const isActive = ACTIVE_STATUSES.indexOf(dispute.status) !== -1;
      const isAwaitingResponse = dispute.status === "open" || dispute.status === "awaiting_response";

      let canRequestResolution = false;
      let canConfirmResolution = false;
      if (isParty && isActive) {
        const { data: req } = await supabase
          .from("dispute_events").select("id, actor_user_id")
          .eq("dispute_id", disputeId).eq("event_type", "resolution_requested")
          .maybeSingle();
        if (!req) {
          canRequestResolution = true;
        } else if (req.actor_user_id !== user.id) {
          canConfirmResolution = true;
        }
      }

      const { data: priorResponse } = await supabase
        .from("dispute_claims").select("id")
        .eq("dispute_id", disputeId).eq("submitted_by_user_id", user.id)
        .eq("claim_type", "response").neq("status", "superseded").maybeSingle();

      const { data: openClarForMe } = await supabase
        .from("dispute_clarifications").select("id")
        .eq("dispute_id", disputeId).eq("status", "open").neq("requested_by_user_id", user.id).maybeSingle();

      return ok({
        actions: {
          canEditDraft: isDraft && isClaimant,
          canSubmit: isDraft && isClaimant,
          canAddClaim: isParty && isActive,
          canCorrectOwnClaim: isParty && isActive,
          canRespond: isParty && isActive,
          canSubmitResponse: isRespondent && isAwaitingResponse && !priorResponse,
          canRequestClarification: isParty && isActive,
          canAnswerClarification: isParty && !!openClarForMe,
          canWithdraw: isClaimant && (isActive || dispute.status === "open"),
          canRequestResolution,
          canConfirmResolution,
          canViewFull: isParty,
          isParty,
        },
      });
    }

    return fail("Unknown action");
  } catch (err) {
    console.error("dispute-operations error:", err);
    return fail(err instanceof Error ? err.message : "Operation failed", 500);
  }
});
