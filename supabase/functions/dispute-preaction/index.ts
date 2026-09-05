import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("VITE_PUBLIC_SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TERMINAL_STATUSES = ["resolved", "withdrawn", "closed"];

const CHECKLIST_KEYS = [
  "party_identities", "contract_basis", "claim_summary", "important_dates",
  "amount_calculation", "requested_remedy", "key_evidence",
  "other_party_response", "counterclaim_reviewed", "negotiation_attempted",
  "adr_considered", "remaining_issues", "procedure_reviewed", "independent_advice",
];
const CHECKLIST_STATUSES = ["not_started", "in_progress", "complete", "not_applicable", "needs_advice"];
const ISSUE_STATUSES = ["open", "partly_resolved", "resolved"];
const LETTER_STATUSES = ["draft", "ready_for_review", "finalised", "sent_external", "sent_buildnerve", "superseded"];
const LEGAL_PROVISIONS = ["contract_terms", "consumer_rights_act_2015", "non_payment", "agreed_variation", "other"];

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

function clean(v: unknown, max = 20000): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t) return null;
  return t.slice(0, max);
}

async function getDispute(supabase: ReturnType<typeof createClient>, disputeId: string) {
  return await supabase.from("disputes").select("*").eq("id", disputeId).maybeSingle();
}

function roleFor(dispute: { claimant_user_id: string; respondent_user_id: string | null }, userId: string): "claimant" | "respondent" | null {
  if (dispute.claimant_user_id === userId) return "claimant";
  if (dispute.respondent_user_id === userId) return "respondent";
  return null;
}

// Computes workspace eligibility and returns reasons when blocked.
function eligibility(dispute: Record<string, unknown>, role: "claimant" | "respondent" | null) {
  const reasons: string[] = [];
  const jurisdiction = dispute.jurisdiction === "england_wales";
  if (!jurisdiction) reasons.push("This Pre-Action Workspace only supports England and Wales disputes in this version.");
  if (dispute.status === "draft") reasons.push("The dispute must be formally submitted before the Pre-Action Workspace is available.");
  if (!dispute.opened_at) reasons.push("The case has not yet been formally opened to both parties.");
  if (TERMINAL_STATUSES.includes(dispute.status as string)) reasons.push("The dispute has already been resolved or closed.");
  if (!role) reasons.push("Only the parties to this dispute can use the Pre-Action Workspace.");

  return {
    eligible: reasons.length === 0,
    reasons,
    isParty: !!role,
    jurisdiction: jurisdiction ? "england_wales" : String(dispute.jurisdiction),
  };
}

async function seedChecklist(supabase: ReturnType<typeof createClient>, disputeId: string) {
  const { data: existing } = await supabase
    .from("dispute_preaction_checklist").select("item_key").eq("dispute_id", disputeId);
  const have = new Set((existing || []).map((r: { item_key: string }) => r.item_key));
  const missing = CHECKLIST_KEYS.filter((k) => !have.has(k));
  if (missing.length) {
    await supabase.from("dispute_preaction_checklist").insert(
      missing.map((item_key) => ({ dispute_id: disputeId, item_key })),
    );
  }
}

function generateIssueReference(existing: string[]): string {
  const used = new Set(existing);
  let n = existing.length + 1;
  for (let i = 0; i < 100; i++) {
    const ref = `BN-I${String(n).padStart(3, "0")}`;
    if (!used.has(ref)) return ref;
    n += 1;
  }
  return `BN-I${Date.now()}`;
}

async function loadWorkspace(supabase: ReturnType<typeof createClient>, disputeId: string, role: "claimant" | "respondent" | null, userId: string) {
  const [{ data: checklist }, { data: issues }, { data: letters }, { data: evidence }, { data: offers }] = await Promise.all([
    supabase.from("dispute_preaction_checklist").select("*").eq("dispute_id", disputeId).order("created_at", { ascending: true }),
    supabase.from("dispute_preaction_issues").select("*").eq("dispute_id", disputeId).order("created_at", { ascending: true }),
    supabase.from("dispute_letters").select("*").eq("dispute_id", disputeId).order("version", { ascending: true }),
    supabase.from("dispute_evidence").select("id, evidence_reference, title").eq("dispute_id", disputeId).eq("visibility", "shared").neq("submission_status", "withdrawn").order("created_at", { ascending: true }),
    supabase.from("dispute_settlement_offers").select("id, status").eq("dispute_id", disputeId),
  ]);

  // Resolve updater names for checklist + letters.
  const userIds = new Set<string>();
  (checklist || []).forEach((c: { updated_by_user_id: string | null }) => { if (c.updated_by_user_id) userIds.add(c.updated_by_user_id); });
  (letters || []).forEach((l: { created_by_user_id: string }) => userIds.add(l.created_by_user_id));
  const { data: profiles } = userIds.size
    ? await supabase.from("profiles").select("id, full_name").in("id", [...userIds])
    : { data: [] };
  const nameMap: Record<string, string | null> = {};
  (profiles || []).forEach((p: { id: string; full_name: string | null }) => { nameMap[p.id] = p.full_name ?? null; });

  const checklistView = (checklist || []).map((c: Record<string, unknown>) => ({
    ...c,
    updated_by_name: c.updated_by_user_id ? nameMap[c.updated_by_user_id as string] ?? null : null,
  }));

  const lettersFinal = (letters || []).map((l: Record<string, unknown>) => ({
    ...l,
    created_by_name: nameMap[l.created_by_user_id as string] ?? null,
    created_by_role: null as "claimant" | "respondent" | null,
  }));

  const offersCount = (offers || []).length;
  const hasAccepted = (offers || []).some((o: { status: string }) => o.status === "accepted");

  const checklistComplete = (checklist || []).filter(
    (c: { status: string }) => c.status === "complete" || c.status === "not_applicable",
  ).length;
  const unresolvedIssues = (issues || []).filter((i: { resolution_status: string }) => i.resolution_status === "open").length;

  const latestLetter = (letters || []).reduce<Record<string, unknown> | null>(
    (acc, l) => (!acc || l.version > (acc.version as number)) ? l : acc, null,
  );

  const adrItem = (checklist || []).find((c: { item_key: string }) => c.item_key === "adr_considered");

  return {
    checklist: checklistView,
    issues: issues || [],
    letters: lettersFinal,
    evidenceOptions: (evidence || []).map((e: { id: string; evidence_reference: string; title: string }) => ({
      id: e.id, reference: e.evidence_reference, title: e.title,
    })),
    summary: {
      checklistComplete,
      checklistTotal: CHECKLIST_KEYS.length,
      unresolvedIssues,
      claimAmountPence: null,
      responseStatus: "",
      negotiationOffers: offersCount,
      hasAcceptedOffer: hasAccepted,
      adrConsidered: !!adrItem && (adrItem.status === "complete" || adrItem.status === "in_progress"),
      letterStatus: latestLetter ? (latestLetter.status as string) : null,
      latestLetterVersion: latestLetter ? (latestLetter.version as number) : null,
    },
  };
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
    const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";

    // ── get_workspace ─────────────────────────────────────────────────────
    if (action === "get_workspace") {
      if (!disputeId) return fail("disputeId is required");
      const { data: dispute } = await getDispute(supabase, disputeId);
      if (!dispute) return fail("Dispute not found", 404);

      const role = roleFor(dispute, user.id);
      // Organisation role alone grants no case access — only the named parties
      // may use the Pre-Action Workspace.
      if (!role) return fail("Access denied", 403);

      const gate = eligibility(dispute, role);
      if (!gate.eligible) {
        return ok({
          eligible: false,
          reasons: gate.reasons,
          isParty: gate.isParty,
          jurisdiction: gate.jurisdiction,
          checklist: [], issues: [], letters: [], evidenceOptions: [],
          summary: { checklistComplete: 0, checklistTotal: CHECKLIST_KEYS.length, unresolvedIssues: 0, claimAmountPence: dispute.amount_disputed_pence ?? null, responseStatus: dispute.status, negotiationOffers: 0, hasAcceptedOffer: false, adrConsidered: false, letterStatus: null, latestLetterVersion: null },
          canGenerate: false,
        });
      }

      await seedChecklist(supabase, disputeId);
      const ws = await loadWorkspace(supabase, disputeId, role, user.id);
      ws.summary.claimAmountPence = dispute.amount_disputed_pence ?? null;
      ws.summary.responseStatus = dispute.status;

      // Resolve letter created_by_role with real dispute.
      ws.letters = ws.letters.map((l: Record<string, unknown>) => ({
        ...l,
        created_by_role: roleFor(dispute, l.created_by_user_id as string),
      }));

      return ok({
        eligible: true,
        reasons: [],
        isParty: gate.isParty,
        jurisdiction: gate.jurisdiction,
        ...ws,
        canGenerate: role === "claimant",
      });
    }

    // ── update_checklist_item ────────────────────────────────────────────
    if (action === "update_checklist_item") {
      const itemKey = typeof body?.itemKey === "string" ? body.itemKey : "";
      const status = typeof body?.status === "string" ? body.status : "";
      const note = clean(body?.note, 2000);
      if (!disputeId || CHECKLIST_KEYS.indexOf(itemKey) === -1) return fail("disputeId and a valid itemKey are required");
      if (CHECKLIST_STATUSES.indexOf(status) === -1) return fail("A valid status is required");

      const { data: dispute } = await getDispute(supabase, disputeId);
      if (!dispute) return fail("Dispute not found", 404);
      const role = roleFor(dispute, user.id);
      if (!role) return fail("Only parties can update the checklist", 403);
      if (TERMINAL_STATUSES.includes(dispute.status)) return fail("This dispute is closed", 409);

      await seedChecklist(supabase, disputeId);
      const now = new Date().toISOString();
      const { data: item, error: updErr } = await supabase
        .from("dispute_preaction_checklist")
        .update({ status, note, updated_by_user_id: user.id, updated_at: now })
        .eq("dispute_id", disputeId).eq("item_key", itemKey).select().single();
      if (updErr) return fail(updErr.message);

      await supabase.from("dispute_audit_log").insert({
        dispute_id: disputeId, actor_user_id: user.id, action: "preaction.checklist_updated",
        target_type: "dispute_preaction_checklist", target_id: item.id,
        new_value: { item_key: itemKey, status, note: note ?? null },
      });

      return ok({ item });
    }

    // ── create_issue ─────────────────────────────────────────────────────
    if (action === "create_issue") {
      const title = clean(body?.title, 500);
      if (!disputeId || !title) return fail("disputeId and title are required");

      const { data: dispute } = await getDispute(supabase, disputeId);
      if (!dispute) return fail("Dispute not found", 404);
      const role = roleFor(dispute, user.id);
      if (!role) return fail("Only parties can add issues", 403);
      if (TERMINAL_STATUSES.includes(dispute.status)) return fail("This dispute is closed", 409);

      const { data: existing } = await supabase
        .from("dispute_preaction_issues").select("issue_reference").eq("dispute_id", disputeId);
      const ref = generateIssueReference((existing || []).map((r: { issue_reference: string }) => r.issue_reference));

      const myPosition = clean(body?.myPosition, 10000);
      const agreedFacts = clean(body?.agreedFacts, 10000);
      const disputedFacts = clean(body?.disputedFacts, 10000);
      const evidenceRefs = Array.isArray(body?.evidenceReferences) ? body.evidenceReferences : null;
      const amountPence = typeof body?.amountPence === "number" ? body.amountPence : null;

      const { data: issue, error: insErr } = await supabase
        .from("dispute_preaction_issues")
        .insert({
          dispute_id: disputeId,
          issue_reference: ref,
          title,
          claimant_position: role === "claimant" ? myPosition : null,
          claimant_position_updated_by: role === "claimant" ? user.id : null,
          claimant_position_updated_at: role === "claimant" ? new Date().toISOString() : null,
          respondent_position: role === "respondent" ? myPosition : null,
          respondent_position_updated_by: role === "respondent" ? user.id : null,
          respondent_position_updated_at: role === "respondent" ? new Date().toISOString() : null,
          agreed_facts: agreedFacts,
          disputed_facts: disputedFacts,
          evidence_references: evidenceRefs,
          amount_pence: amountPence,
          resolution_status: "open",
          created_by_user_id: user.id,
        })
        .select().single();
      if (insErr) return fail(insErr.message);

      await supabase.from("dispute_events").insert({
        dispute_id: disputeId, event_type: "preaction_issue_added", actor_user_id: user.id, actor_role: role,
        title: "Pre-action issue added", description: title,
        related_record_type: "dispute_preaction_issue", related_record_id: issue.id, visibility: "parties",
      });
      await supabase.from("dispute_audit_log").insert({
        dispute_id: disputeId, actor_user_id: user.id, action: "preaction.issue_added",
        target_type: "dispute_preaction_issue", target_id: issue.id, new_value: { issue_reference: ref, title },
      });

      return ok({ issue });
    }

    // ── update_issue_position (each party controls only their own position)
    if (action === "update_issue_position") {
      const issueId = typeof body?.issueId === "string" ? body.issueId : "";
      const myPosition = clean(body?.myPosition, 10000);
      if (!issueId) return fail("issueId is required");

      const { data: issue } = await supabase
        .from("dispute_preaction_issues").select("*").eq("id", issueId).maybeSingle();
      if (!issue) return fail("Issue not found", 404);

      const { data: dispute } = await getDispute(supabase, issue.dispute_id);
      if (!dispute) return fail("Dispute not found", 404);
      const role = roleFor(dispute, user.id);
      if (!role) return fail("Only parties can update their position", 403);
      if (TERMINAL_STATUSES.includes(dispute.status)) return fail("This dispute is closed", 409);

      const now = new Date().toISOString();
      const patch = role === "claimant"
        ? { claimant_position: myPosition, claimant_position_updated_by: user.id, claimant_position_updated_at: now }
        : { respondent_position: myPosition, respondent_position_updated_by: user.id, respondent_position_updated_at: now };

      const { data: updated, error: updErr } = await supabase
        .from("dispute_preaction_issues").update(patch).eq("id", issueId).select().single();
      if (updErr) return fail(updErr.message);

      await supabase.from("dispute_audit_log").insert({
        dispute_id: issue.dispute_id, actor_user_id: user.id, action: "preaction.issue_position_updated",
        target_type: "dispute_preaction_issue", target_id: issueId,
        new_value: { role, my_position: myPosition },
      });

      return ok({ issue: updated });
    }

    // ── update_issue_facts (shared agreed/disputed facts + resolution status)
    if (action === "update_issue_facts") {
      const issueId = typeof body?.issueId === "string" ? body.issueId : "";
      if (!issueId) return fail("issueId is required");

      const { data: issue } = await supabase
        .from("dispute_preaction_issues").select("*").eq("id", issueId).maybeSingle();
      if (!issue) return fail("Issue not found", 404);
      const { data: dispute } = await getDispute(supabase, issue.dispute_id);
      if (!dispute) return fail("Dispute not found", 404);
      const role = roleFor(dispute, user.id);
      if (!role) return fail("Only parties can update issues", 403);
      if (TERMINAL_STATUSES.includes(dispute.status)) return fail("This dispute is closed", 409);

      const resStatus = typeof body?.resolutionStatus === "string" ? body.resolutionStatus : issue.resolution_status;
      if (ISSUE_STATUSES.indexOf(resStatus) === -1) return fail("Invalid resolution status");

      const { data: updated, error: updErr } = await supabase
        .from("dispute_preaction_issues")
        .update({
          agreed_facts: clean(body?.agreedFacts, 10000),
          disputed_facts: clean(body?.disputedFacts, 10000),
          resolution_status: resStatus,
        })
        .eq("id", issueId).select().single();
      if (updErr) return fail(updErr.message);

      await supabase.from("dispute_audit_log").insert({
        dispute_id: issue.dispute_id, actor_user_id: user.id, action: "preaction.issue_facts_updated",
        target_type: "dispute_preaction_issue", target_id: issueId, new_value: { resolution_status: resStatus },
      });

      return ok({ issue: updated });
    }

    // ── save_letter (create or update a draft/ready_for_review letter) ────
    if (action === "save_letter") {
      const letterId = typeof body?.letterId === "string" ? body.letterId : null;
      const title = clean(body?.title, 300) ?? "Letter of Claim";
      if (!disputeId) return fail("disputeId is required");

      const { data: dispute } = await getDispute(supabase, disputeId);
      if (!dispute) return fail("Dispute not found", 404);
      const role = roleFor(dispute, user.id);
      if (role !== "claimant") return fail("Only the claimant can generate a Letter of Claim", 403);
      if (TERMINAL_STATUSES.includes(dispute.status)) return fail("This dispute is closed", 409);

      const desiredStatus = typeof body?.status === "string" && ["draft", "ready_for_review"].includes(body.status)
        ? body.status : "draft";

      const payload: Record<string, unknown> = {
        title,
        claimant_name: clean(body?.claimantName, 500),
        claimant_address: clean(body?.claimantAddress, 2000),
        defendant_name: clean(body?.defendantName, 500),
        defendant_address: clean(body?.defendantAddress, 2000),
        contract_basis: clean(body?.contractBasis, 5000),
        chronology: clean(body?.chronology, 10000),
        claim_basis: clean(body?.claimBasis, 10000),
        legal_provisions: Array.isArray(body?.legalProvisions) ? body.legalProvisions.filter((p: unknown) => LEGAL_PROVISIONS.includes(p as string)) : null,
        other_basis: clean(body?.otherBasis, 5000),
        alleged_work: clean(body?.allegedWork, 10000),
        amount_pence: typeof body?.amountPence === "number" ? body.amountPence : null,
        calculation_breakdown: clean(body?.calculationBreakdown, 5000),
        requested_remedy: clean(body?.requestedRemedy, 5000),
        evidence_references: Array.isArray(body?.evidenceReferences) ? body.evidenceReferences : null,
        resolution_attempts: clean(body?.resolutionAttempts, 10000),
        adr_invitation: clean(body?.adrInvitation, 5000),
        response_date: typeof body?.responseDate === "string" ? body.responseDate : null,
        enclosures: Array.isArray(body?.enclosures) ? body.enclosures.filter((e: unknown) => typeof e === "string") : null,
        letter_body: clean(body?.letterBody, 40000),
      };

      let letter: Record<string, unknown>;
      if (letterId) {
        const { data: existing } = await supabase
          .from("dispute_letters").select("status, created_by_user_id").eq("id", letterId).maybeSingle();
        if (!existing) return fail("Letter not found", 404);
        if (existing.created_by_user_id !== user.id) return fail("You can only edit your own draft", 403);
        if (["finalised", "sent_external", "sent_buildnerve"].includes(existing.status)) {
          return fail("A finalised letter is read-only — create a new version to correct it", 409);
        }
        const { data: updated, error: updErr } = await supabase
          .from("dispute_letters").update({ ...payload, status: desiredStatus, updated_at: new Date().toISOString() })
          .eq("id", letterId).select().single();
        if (updErr) return fail(updErr.message);
        letter = updated;
        await supabase.from("dispute_audit_log").insert({
          dispute_id: disputeId, actor_user_id: user.id, action: "preaction.letter_updated",
          target_type: "dispute_letter", target_id: letterId, new_value: { status: desiredStatus },
        });
      } else {
        const { data: maxRow } = await supabase
          .from("dispute_letters").select("version").eq("dispute_id", disputeId)
          .order("version", { ascending: false }).limit(1).maybeSingle();
        const version = (maxRow?.version ?? 0) + 1;
        const { data: created, error: insErr } = await supabase
          .from("dispute_letters")
          .insert({ ...payload, dispute_id: disputeId, created_by_user_id: user.id, version, status: desiredStatus })
          .select().single();
        if (insErr) return fail(insErr.message);
        letter = created;
        await supabase.from("dispute_events").insert({
          dispute_id: disputeId, event_type: "preaction_letter_drafted", actor_user_id: user.id, actor_role: "claimant",
          title: "Letter of Claim drafted", related_record_type: "dispute_letter", related_record_id: letter.id, visibility: "parties",
        });
        await supabase.from("dispute_audit_log").insert({
          dispute_id: disputeId, actor_user_id: user.id, action: "preaction.letter_created",
          target_type: "dispute_letter", target_id: letter.id, new_value: { version, status: desiredStatus },
        });
      }

      return ok({ letter });
    }

    // ── finalise_letter (read-only thereafter) ────────────────────────────
    if (action === "finalise_letter") {
      const letterId = typeof body?.letterId === "string" ? body.letterId : "";
      if (!letterId) return fail("letterId is required");

      const { data: letter } = await supabase
        .from("dispute_letters").select("*").eq("id", letterId).maybeSingle();
      if (!letter) return fail("Letter not found", 404);
      if (letter.created_by_user_id !== user.id) return fail("Only the creator can finalise this letter", 403);
      if (["finalised", "sent_external", "sent_buildnerve"].includes(letter.status)) {
        return fail("This letter is already finalised", 409);
      }

      const now = new Date().toISOString();
      const { data: updated, error: updErr } = await supabase
        .from("dispute_letters").update({ status: "finalised", finalised_at: now, updated_at: now })
        .eq("id", letterId).select().single();
      if (updErr) return fail(updErr.message);

      await supabase.from("dispute_events").insert({
        dispute_id: letter.dispute_id, event_type: "preaction_letter_finalised", actor_user_id: user.id, actor_role: "claimant",
        title: "Letter of Claim finalised", related_record_type: "dispute_letter", related_record_id: letterId, visibility: "parties",
      });
      await supabase.from("dispute_audit_log").insert({
        dispute_id: letter.dispute_id, actor_user_id: user.id, action: "preaction.letter_finalised",
        target_type: "dispute_letter", target_id: letterId,
        previous_value: { status: letter.status }, new_value: { status: "finalised", finalised_at: now },
      });

      return ok({ letter: updated });
    }

    // ── create_letter_version (correction creates a new version) ──────────
    if (action === "create_letter_version") {
      const letterId = typeof body?.letterId === "string" ? body.letterId : "";
      if (!letterId) return fail("letterId is required");

      const { data: letter } = await supabase
        .from("dispute_letters").select("*").eq("id", letterId).maybeSingle();
      if (!letter) return fail("Letter not found", 404);
      if (letter.created_by_user_id !== user.id) return fail("Only the creator can version this letter", 403);
      if (!["finalised", "sent_external", "sent_buildnerve"].includes(letter.status)) {
        return fail("Only a finalised letter can be corrected into a new version", 409);
      }

      const { data: maxRow } = await supabase
        .from("dispute_letters").select("version").eq("dispute_id", letter.dispute_id)
        .order("version", { ascending: false }).limit(1).maybeSingle();
      const version = (maxRow?.version ?? 0) + 1;

      const { data: created, error: insErr } = await supabase
        .from("dispute_letters")
        .insert({
          dispute_id: letter.dispute_id,
          created_by_user_id: user.id,
          version,
          status: "draft",
          title: letter.title,
          claimant_name: letter.claimant_name,
          claimant_address: letter.claimant_address,
          defendant_name: letter.defendant_name,
          defendant_address: letter.defendant_address,
          contract_basis: letter.contract_basis,
          chronology: letter.chronology,
          claim_basis: letter.claim_basis,
          legal_provisions: letter.legal_provisions,
          other_basis: letter.other_basis,
          alleged_work: letter.alleged_work,
          amount_pence: letter.amount_pence,
          calculation_breakdown: letter.calculation_breakdown,
          requested_remedy: letter.requested_remedy,
          evidence_references: letter.evidence_references,
          resolution_attempts: letter.resolution_attempts,
          adr_invitation: letter.adr_invitation,
          response_date: letter.response_date,
          enclosures: letter.enclosures,
          letter_body: letter.letter_body,
          supersedes_letter_id: letterId,
        })
        .select().single();
      if (insErr) return fail(insErr.message);

      await supabase.from("dispute_letters").update({ status: "superseded", updated_at: new Date().toISOString() }).eq("id", letterId);

      await supabase.from("dispute_events").insert({
        dispute_id: letter.dispute_id, event_type: "preaction_letter_versioned", actor_user_id: user.id, actor_role: "claimant",
        title: "Letter of Claim new version created", related_record_type: "dispute_letter", related_record_id: created.id, visibility: "parties",
      });
      await supabase.from("dispute_audit_log").insert({
        dispute_id: letter.dispute_id, actor_user_id: user.id, action: "preaction.letter_versioned",
        target_type: "dispute_letter", target_id: letterId,
        previous_value: { status: "finalised" }, new_value: { status: "superseded", new_version_id: created.id },
      });

      return ok({ letter: created });
    }

    // ── record_download ───────────────────────────────────────────────────
    if (action === "record_download") {
      const letterId = typeof body?.letterId === "string" ? body.letterId : "";
      if (!letterId) return fail("letterId is required");
      const { data: letter } = await supabase
        .from("dispute_letters").select("*").eq("id", letterId).maybeSingle();
      if (!letter) return fail("Letter not found", 404);
      if (!["finalised", "sent_external", "sent_buildnerve"].includes(letter.status)) {
        return fail("Only a finalised letter can be downloaded", 409);
      }
      const { data: updated } = await supabase
        .from("dispute_letters").update({ downloaded_at: new Date().toISOString() }).eq("id", letterId).select().single();
      await supabase.from("dispute_audit_log").insert({
        dispute_id: letter.dispute_id, actor_user_id: user.id, action: "preaction.letter_downloaded",
        target_type: "dispute_letter", target_id: letterId, new_value: { downloaded_at: new Date().toISOString() },
      });
      return ok({ letter: updated });
    }

    // ── record_sending ────────────────────────────────────────────────────
    if (action === "record_sending") {
      const letterId = typeof body?.letterId === "string" ? body.letterId : "";
      const method = clean(body?.method, 500);
      const sentDate = typeof body?.sentDate === "string" ? body.sentDate : null;
      const recipient = clean(body?.recipient, 500);
      if (!letterId || !method || !sentDate) return fail("letterId, method and sentDate are required");
      const { data: letter } = await supabase
        .from("dispute_letters").select("*").eq("id", letterId).maybeSingle();
      if (!letter) return fail("Letter not found", 404);
      if (!["finalised", "sent_external"].includes(letter.status)) {
        return fail("Only a finalised letter can be recorded as sent", 409);
      }
      const { data: updated, error: updErr } = await supabase
        .from("dispute_letters")
        .update({ status: "sent_external", sent_method: method, sent_date: sentDate, recipient })
        .eq("id", letterId).select().single();
      if (updErr) return fail(updErr.message);

      await supabase.from("dispute_events").insert({
        dispute_id: letter.dispute_id, event_type: "preaction_letter_sent", actor_user_id: user.id, actor_role: "claimant",
        title: "Letter of Claim recorded as sent", description: method,
        related_record_type: "dispute_letter", related_record_id: letterId, visibility: "parties",
      });
      await supabase.from("dispute_audit_log").insert({
        dispute_id: letter.dispute_id, actor_user_id: user.id, action: "preaction.letter_sending_recorded",
        target_type: "dispute_letter", target_id: letterId,
        previous_value: { status: letter.status }, new_value: { status: "sent_external", sent_method: method, sent_date: sentDate, recipient },
      });

      return ok({ letter: updated });
    }

    return fail("Unknown action");
  } catch (err) {
    console.error("dispute-preaction error:", err);
    return fail(err instanceof Error ? err.message : "Operation failed", 500);
  }
});
