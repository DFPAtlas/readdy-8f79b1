import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("VITE_PUBLIC_SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "private";
const EVIDENCE_PREFIX = "dispute-evidence";
const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20 MB
const SIGNED_URL_EXPIRY = 3600; // 1 hour

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Canonical MIME type per allowed extension (authoritative, not browser-supplied).
const ALLOWED_TYPES: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  mp4: "video/mp4",
  mov: "video/quicktime",
};

// Executables, scripts, HTML and archives are rejected outright.
const BLOCKED_EXTENSIONS = new Set([
  "exe", "bat", "cmd", "com", "scr", "sh", "js", "mjs", "cjs", "ts",
  "html", "htm", "xhtml", "svg", "php", "py", "pl", "rb", "jar", "dll",
  "zip", "rar", "7z", "tar", "gz", "gzip", "bz2", "xz", "iso", "apk",
  "msi", "bin", "ps1", "vbs", "lnk",
]);

const BLOCKED_MIME_PREFIXES = [
  "application/x-msdownload",
  "application/x-msdos-program",
  "application/x-executable",
  "application/x-sh",
  "application/x-shellscript",
  "text/html",
  "application/x-httpd-php",
  "application/octet-stream",
];

const CATEGORIES = new Set([
  "contract_or_quote", "scope_or_specification", "variation", "invoice",
  "payment", "message_or_email", "photograph", "video", "inspection_report",
  "defect_record", "remedial_estimate", "completion_record", "access_record",
  "witness_information", "other",
]);

const SOURCE_TYPES = new Set(["linked_record", "file_upload", "text_note"]);

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

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function safeDisplayFilename(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  return base.replace(/[\u0000-\u001f\u007f]/g, "").slice(0, 200) || "file";
}

function extensionOf(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? name;
  const idx = base.lastIndexOf(".");
  if (idx === -1) return "";
  return base.slice(idx + 1).toLowerCase();
}

async function generateEvidenceReference(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data: refs } = await supabase
    .from("dispute_evidence")
    .select("evidence_reference");
  let maxN = 0;
  for (const r of refs || []) {
    const m = /^BN-E(\d+)$/.exec(r.evidence_reference);
    if (m) maxN = Math.max(maxN, parseInt(m[1], 10));
  }
  return `BN-E${String(maxN + 1).padStart(3, "0")}`;
}

// Abuse prevention: cap the number of evidence submissions a user can make
// within a sliding window, mirroring the settlement-offer rate limit.
const MAX_SUBMISSIONS_PER_WINDOW = 10;
const SUBMISSION_WINDOW_MS = 10 * 60 * 1000;

async function enforceSubmissionRateLimit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<string | null> {
  const since = new Date(Date.now() - SUBMISSION_WINDOW_MS).toISOString();
  const { data: recent } = await supabase
    .from("dispute_evidence")
    .select("id")
    .eq("submitted_by_user_id", userId)
    .gte("submitted_at", since);
  if ((recent || []).length >= MAX_SUBMISSIONS_PER_WINDOW) {
    return "Too many evidence submissions recently — please wait before submitting more";
  }
  return null;
}

// Re-validates party / org-admin / platform access on every request.
async function authorize(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  disputeId: string,
) {
  const { data: dispute } = await supabase
    .from("disputes").select("*").eq("id", disputeId).maybeSingle();
  if (!dispute) return { dispute: null, isParty: false, role: null };

  const isClaimant = dispute.claimant_user_id === userId;
  const isRespondent = dispute.respondent_user_id === userId;
  let isParty = isClaimant || isRespondent;

  if (!isParty) {
    const { data: admin } = await supabase
      .from("organisation_members")
      .select("id")
      .eq("organisation_id", dispute.organisation_id)
      .eq("user_id", userId)
      .eq("status", "active")
      .in("role", ["owner", "admin"])
      .maybeSingle();
    if (!admin) return { dispute, isParty: false, role: null };
  }

  const role = isClaimant ? "claimant" : isRespondent ? "respondent" : "admin";
  return { dispute, isParty, role };
}

// Records a timeline event + audit entry + notification for an evidence action.
async function recordActivity(
  supabase: ReturnType<typeof createClient>,
  dispute: { id: string; organisation_id: string; project_id: string; claimant_user_id: string; respondent_user_id: string | null; case_reference: string },
  userId: string,
  role: string,
  eventType: string,
  eventTitle: string,
  eventDescription: string | null,
  evidenceId: string,
  auditAction: string,
  auditNewValue: unknown,
  notifyOther: boolean,
  notificationType: string,
  notificationTitle: string,
  notificationBody: string,
) {
  await supabase.from("dispute_events").insert({
    dispute_id: dispute.id,
    event_type: eventType,
    actor_user_id: userId,
    actor_role: role === "claimant" || role === "respondent" ? role : "system",
    title: eventTitle,
    description: eventDescription,
    related_record_type: "dispute_evidence",
    related_record_id: evidenceId,
    visibility: "parties",
  });

  await supabase.from("dispute_audit_log").insert({
    dispute_id: dispute.id,
    actor_user_id: userId,
    action: auditAction,
    target_type: "dispute_evidence",
    target_id: evidenceId,
    new_value: auditNewValue,
  });

  if (notifyOther) {
    const otherId = dispute.claimant_user_id === userId ? dispute.respondent_user_id : dispute.claimant_user_id;
    if (otherId) {
      await supabase.from("notifications").insert({
        organisation_id: dispute.organisation_id,
        recipient_user_id: otherId,
        notification_type: notificationType,
        category: "system",
        title: notificationTitle,
        body: notificationBody,
        priority: "normal",
        related_entity_type: "dispute",
        related_entity_id: dispute.id,
        job_id: dispute.project_id,
        action_route: `/disputes/${dispute.id}`,
        action_label: "View dispute",
        deduplication_key: `dispute-evidence:${dispute.id}:${evidenceId}`,
      });
    }
  }
}

// Resolve human-readable labels for linked project records.
async function resolveLinkedRecordLabels(
  supabase: ReturnType<typeof createClient>,
  items: { linked_project_record_type: string | null; linked_project_record_id: string | null }[],
): Promise<Record<string, string>> {
  const byType: Record<string, string[]> = {};
  for (const it of items) {
    if (it.linked_project_record_type && it.linked_project_record_id) {
      (byType[it.linked_project_record_type] ||= []).push(it.linked_project_record_id);
    }
  }
  const labelMap: Record<string, string> = {};
  for (const [type, ids] of Object.entries(byType)) {
    const unique = [...new Set(ids)];
    if (type === "project_document") {
      const { data } = await supabase.from("project_documents").select("id, name").in("id", unique);
      for (const d of data || []) labelMap[`${type}:${d.id}`] = d.name;
    } else if (type === "variation") {
      const { data } = await supabase.from("variations").select("id, title, reference").in("id", unique);
      for (const d of data || []) labelMap[`${type}:${d.id}`] = d.reference ? `${d.reference} — ${d.title}` : d.title;
    } else if (type === "daily_log") {
      const { data } = await supabase.from("daily_logs").select("id, log_date").in("id", unique);
      for (const d of data || []) labelMap[`${type}:${d.id}`] = `Daily log — ${d.log_date}`;
    }
  }
  return labelMap;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const token = req.headers.get("Authorization")?.replace("Bearer ", "");
    if (!token) return fail("No auth token", 401);
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return fail("Invalid auth", 401);

    const contentType = req.headers.get("content-type") || "";

    // ── Multipart file upload ─────────────────────────────────────────────
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      const disputeId = typeof form.get("disputeId") === "string" ? (form.get("disputeId") as string) : "";
      const file = form.get("file") as File | null;

      if (!disputeId) return fail("disputeId is required");
      if (!file) return fail("A file is required");

      const { dispute, isParty, role } = await authorize(supabase, user.id, disputeId);
      if (!dispute) return fail("Dispute not found", 404);
      if (!isParty) return fail("Only parties to this dispute can submit evidence", 403);

      const limitErr = await enforceSubmissionRateLimit(supabase, user.id);
      if (limitErr) return fail(limitErr, 429);

      const category = typeof form.get("category") === "string" ? (form.get("category") as string) : "";
      const title = typeof form.get("title") === "string" ? (form.get("title") as string).trim() : "";
      const description = typeof form.get("description") === "string" ? (form.get("description") as string).trim() : "";
      const eventDate = typeof form.get("eventDate") === "string" ? (form.get("eventDate") as string) : "";
      const supersedesId = typeof form.get("supersedesEvidenceId") === "string" ? (form.get("supersedesEvidenceId") as string) : "";

      if (!CATEGORIES.has(category)) return fail("A valid evidence category is required");
      if (!title) return fail("A title is required");

      // Server-side file validation.
      const ext = extensionOf(file.name);
      if (!ext) return fail("File has no recognised extension");
      if (BLOCKED_EXTENSIONS.has(ext)) return fail("This file type is not permitted");
      if (!ALLOWED_TYPES[ext]) return fail("Unsupported file type");
      if (BLOCKED_MIME_PREFIXES.some((p) => (file.type || "").toLowerCase().startsWith(p))) {
        return fail("This file type is not permitted");
      }
      if (file.size > MAX_FILE_SIZE) return fail("File is too large (max 20 MB)");
      if (file.size === 0) return fail("File is empty");

      // If correcting, ensure the target is the user's own evidence in this dispute.
      if (supersedesId) {
        const { data: orig } = await supabase
          .from("dispute_evidence").select("id").eq("id", supersedesId)
          .eq("dispute_id", disputeId).eq("submitted_by_user_id", user.id).maybeSingle();
        if (!orig) return fail("You can only correct your own evidence in this dispute", 403);
      }

      const bytes = new Uint8Array(await file.arrayBuffer());
      const fileHash = await sha256Hex(bytes);
      const canonicalMime = ALLOWED_TYPES[ext];
      const safeName = safeDisplayFilename(file.name);
      const objectPath = `${EVIDENCE_PREFIX}/${disputeId}/${crypto.randomUUID()}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from(BUCKET)
        .upload(objectPath, bytes, { contentType: canonicalMime, upsert: false });
      if (uploadErr) return fail(uploadErr.message);

      const evidenceReference = await generateEvidenceReference(supabase);

      const insert: Record<string, unknown> = {
        dispute_id: disputeId,
        submitted_by_user_id: user.id,
        evidence_reference: evidenceReference,
        evidence_category: category,
        title,
        description: description || null,
        event_date: eventDate || null,
        source_type: "file_upload",
        storage_path: objectPath,
        original_filename: file.name,
        safe_display_filename: safeName,
        mime_type: canonicalMime,
        file_size: file.size,
        file_hash: fileHash,
        captured_metadata: { original_mime: file.type || null },
        visibility: "shared",
        submission_status: "pending_validation", // no malware scanner available
        supersedes_evidence_id: supersedesId || null,
      };

      const { data: evidence, error: insertErr } = await supabase
        .from("dispute_evidence").insert(insert).select().single();
      if (insertErr) return fail(insertErr.message);

      await recordActivity(
        supabase, dispute, user.id, role,
        supersedesId ? "evidence_corrected" : "evidence_submitted",
        supersedesId ? "Evidence corrected (new version)" : "Evidence submitted",
        title,
        evidence.id,
        supersedesId ? "evidence.corrected" : "evidence.uploaded",
        { evidence_reference: evidenceReference, category, supersedes_evidence_id: supersedesId || null },
        !supersedesId,
        "dispute_evidence_submitted",
        "New evidence added to your dispute",
        `${dispute.case_reference}: new evidence (${evidenceReference}) has been added.`,
      );

      return ok({ evidence });
    }

    // ── JSON actions ──────────────────────────────────────────────────────
    const body = await req.json().catch(() => ());
    const action = typeof body?.action === "string" ? body.action : "";

    // list — evidence library for a dispute (already party-scoped).
    if (action === "list") {
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      if (!disputeId) return fail("disputeId is required");
      const { dispute, isParty } = await authorize(supabase, user.id, disputeId);
      if (!dispute) return fail("Dispute not found", 404);
      if (!isParty) return fail("Access denied", 403);

      const { data: items, error } = await supabase
        .from("dispute_evidence")
        .select("*")
        .eq("dispute_id", disputeId)
        .order("created_at", { ascending: false });
      if (error) return fail(error.message);

      const rows = items || [];
      const submitters = [...new Set(rows.map((r) => r.submitted_by_user_id))];
      const { data: profiles } = await supabase
        .from("profiles").select("id, full_name").in("id", submitters);
      const nameMap: Record<string, string> = {};
      for (const p of profiles || []) nameMap[p.id] = p.full_name ?? null;

      // superseded_by: any row whose supersedes_evidence_id points at this row.
      const supersededByMap: Record<string, string> = {};
      for (const r of rows) {
        if (r.supersedes_evidence_id) supersededByMap[r.supersedes_evidence_id] = r.id;
      }

      const labels = await resolveLinkedRecordLabels(supabase, rows);

      const enriched = rows.map((r) => ({
        ...r,
        submitted_by_name: nameMap[r.submitted_by_user_id] ?? null,
        submitted_by_role:
          r.submitted_by_user_id === dispute.claimant_user_id ? "claimant"
            : r.submitted_by_user_id === dispute.respondent_user_id ? "respondent"
              : null,
        superseded_by_id: supersededByMap[r.id] ?? null,
        linked_record_label: r.linked_project_record_type && r.linked_project_record_id
          ? labels[`${r.linked_project_record_type}:${r.linked_project_record_id}`] ?? null
          : null,
      }));

      const counts = {
        total: enriched.length,
        active: enriched.filter((r) => r.submission_status !== "withdrawn").length,
        pendingValidation: enriched.filter((r) => r.submission_status === "pending_validation").length,
        withdrawn: enriched.filter((r) => r.submission_status === "withdrawn").length,
      };

      return ok({ items: enriched, counts });
    }

    // detail — protected evidence view with signed URL + versions + audit.
    if (action === "detail") {
      const evidenceId = typeof body?.evidenceId === "string" ? body.evidenceId : "";
      if (!evidenceId) return fail("evidenceId is required");

      const { data: evidence } = await supabase
        .from("dispute_evidence").select("*").eq("id", evidenceId).maybeSingle();
      if (!evidence) return fail("Not found", 404);

      const { dispute, isParty } = await authorize(supabase, user.id, evidence.dispute_id);
      if (!dispute) return fail("Dispute not found", 404);
      if (!isParty) return fail("Access denied", 403);

      // Resolve the full version chain (walk supersedes_evidence_id).
      const { data: allInDispute } = await supabase
        .from("dispute_evidence").select("*").eq("dispute_id", evidence.dispute_id);
      const all = allInDispute || [];
      const currentId = (() => {
        let cur = evidence.id;
        const bySupersedes = new Map<string, string>();
        for (const r of all) if (r.supersedes_evidence_id) bySupersedes.set(r.supersedes_evidence_id, r.id);
        let next = bySupersedes.get(cur);
        while (next) { cur = next; next = bySupersedes.get(cur); }
        return cur;
      })();

      const versions: { id: string; evidence_reference: string; submitted_at: string; submitted_by_name: string | null; is_current: boolean }[] = [];
      const versionIds = new Set<string>();
      let ancestor = evidence.supersedes_evidence_id;
      while (ancestor) {
        versionIds.add(ancestor);
        const a = all.find((r) => r.id === ancestor);
        ancestor = a?.supersedes_evidence_id ?? null;
      }
      versionIds.add(evidence.id);
      let desc = evidence.id;
      const bySupersedes2 = new Map<string, string>();
      for (const r of all) if (r.supersedes_evidence_id) bySupersedes2.set(r.supersedes_evidence_id, r.id);
      let n = bySupersedes2.get(desc);
      while (n) { versionIds.add(n); n = bySupersedes2.get(n); }

      const versionRows = all.filter((r) => versionIds.has(r.id))
        .sort((a, b) => new Date(a.submitted_at).getTime() - new Date(b.submitted_at).getTime());

      const vSubmitterIds = [...new Set(versionRows.map((r) => r.submitted_by_user_id))];
      const { data: vProfiles } = await supabase
        .from("profiles").select("id, full_name").in("id", vSubmitterIds);
      const vNameMap: Record<string, string> = {};
      for (const p of vProfiles || []) vNameMap[p.id] = p.full_name ?? null;

      for (const r of versionRows) {
        versions.push({
          id: r.id,
          evidence_reference: r.evidence_reference,
          submitted_at: r.submitted_at,
          submitted_by_name: vNameMap[r.submitted_by_user_id] ?? null,
          is_current: r.id === currentId,
        });
      }

      let signedUrl: string | null = null;
      if (evidence.storage_path && evidence.submission_status !== "withdrawn") {
        const { data: signed } = await supabase.storage
          .from(BUCKET).createSignedUrl(evidence.storage_path, SIGNED_URL_EXPIRY);
        signedUrl = signed?.signedUrl ?? null;
      }

      const labels = await resolveLinkedRecordLabels(supabase, [evidence]);

      const { data: audit } = await supabase
        .from("dispute_audit_log").select("action, actor_user_id, created_at, new_value")
        .eq("dispute_id", evidence.dispute_id)
        .eq("target_type", "dispute_evidence")
        .eq("target_id", evidence.id)
        .order("created_at", { ascending: false });

      return ok({
        evidence: {
          ...evidence,
          submitted_by_role:
            evidence.submitted_by_user_id === dispute.claimant_user_id ? "claimant"
              : evidence.submitted_by_user_id === dispute.respondent_user_id ? "respondent"
                : null,
          superseded_by_id: currentId === evidence.id ? null : currentId,
          linked_record_label: evidence.linked_project_record_type && evidence.linked_project_record_id
            ? labels[`${evidence.linked_project_record_type}:${evidence.linked_project_record_id}`] ?? null
            : null,
          versions,
        },
        signedUrl,
        audit: audit || [],
      });
    }

    // linkable_records — authorised project records limited to this dispute's project.
    if (action === "linkable_records") {
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      if (!disputeId) return fail("disputeId is required");
      const { dispute, isParty } = await authorize(supabase, user.id, disputeId);
      if (!dispute) return fail("Dispute not found", 404);
      if (!isParty) return fail("Access denied", 403);

      const [docs, variations, logs] = await Promise.all([
        supabase.from("project_documents").select("id, name")
          .eq("job_id", dispute.project_id).is("archived_at", null).order("uploaded_at", { ascending: false }),
        supabase.from("variations").select("id, title, reference")
          .eq("job_id", dispute.project_id).is("archived_at", null).order("created_at", { ascending: false }),
        supabase.from("daily_logs").select("id, log_date")
          .eq("job_id", dispute.project_id).is("archived_at", null).order("log_date", { ascending: false }),
      ]);

      const records: { type: string; id: string; label: string; reference: string | null }[] = [];
      for (const d of docs.data || []) records.push({ type: "project_document", id: d.id, label: d.name, reference: null });
      for (const v of variations.data || []) records.push({ type: "variation", id: v.id, label: v.title, reference: v.reference ?? null });
      for (const l of logs.data || []) records.push({ type: "daily_log", id: l.id, label: `Daily log — ${l.log_date}`, reference: null });

      return ok({ records });
    }

    // submit_text_note — text-only evidence note (optionally a correction).
    if (action === "submit_text_note") {
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      const category = typeof body?.category === "string" ? body.category : "";
      const title = typeof body?.title === "string" ? body.title.trim() : "";
      const description = typeof body?.description === "string" ? body.description.trim() : "";
      const eventDate = typeof body?.eventDate === "string" ? body.eventDate : "";
      const supersedesId = typeof body?.supersedesEvidenceId === "string" ? body.supersedesEvidenceId : "";

      if (!disputeId) return fail("disputeId is required");
      if (!CATEGORIES.has(category)) return fail("A valid evidence category is required");
      if (!title) return fail("A title is required");
      if (!description) return fail("A note description is required");

      const { dispute, isParty, role } = await authorize(supabase, user.id, disputeId);
      if (!dispute) return fail("Dispute not found", 404);
      if (!isParty) return fail("Only parties can submit evidence", 403);

      const limitErr = await enforceSubmissionRateLimit(supabase, user.id);
      if (limitErr) return fail(limitErr, 429);

      if (supersedesId) {
        const { data: orig } = await supabase
          .from("dispute_evidence").select("id").eq("id", supersedesId)
          .eq("dispute_id", disputeId).eq("submitted_by_user_id", user.id).maybeSingle();
        if (!orig) return fail("You can only correct your own evidence in this dispute", 403);
      }

      const evidenceReference = await generateEvidenceReference(supabase);
      const { data: evidence, error } = await supabase
        .from("dispute_evidence").insert({
          dispute_id: disputeId,
          submitted_by_user_id: user.id,
          evidence_reference: evidenceReference,
          evidence_category: category,
          title,
          description,
          event_date: eventDate || null,
          source_type: "text_note",
          visibility: "shared",
          submission_status: "validated",
          supersedes_evidence_id: supersedesId || null,
        }).select().single();
      if (error) return fail(error.message);

      await recordActivity(
        supabase, dispute, user.id, role,
        supersedesId ? "evidence_corrected" : "evidence_submitted",
        supersedesId ? "Evidence corrected (new version)" : "Evidence note added",
        title,
        evidence.id,
        supersedesId ? "evidence.corrected" : "evidence.note_submitted",
        { evidence_reference: evidenceReference, source_type: "text_note", supersedes_evidence_id: supersedesId || null },
        !supersedesId,
        "dispute_evidence_submitted",
        "New evidence added to your dispute",
        `${dispute.case_reference}: new evidence (${evidenceReference}) has been added.`,
      );

      return ok({ evidence });
    }

    // submit_linked_record — link an authorised project record from the same project.
    if (action === "submit_linked_record") {
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      const category = typeof body?.category === "string" ? body.category : "";
      const title = typeof body?.title === "string" ? body.title.trim() : "";
      const description = typeof body?.description === "string" ? body.description.trim() : "";
      const eventDate = typeof body?.eventDate === "string" ? body.eventDate : "";
      const recordType = typeof body?.recordType === "string" ? body.recordType : "";
      const recordId = typeof body?.recordId === "string" ? body.recordId : "";

      if (!disputeId) return fail("disputeId is required");
      if (!CATEGORIES.has(category)) return fail("A valid evidence category is required");
      if (!title) return fail("A title is required");
      if (!recordType || !recordId) return fail("A linked project record is required");
      if (!["project_document", "variation", "daily_log"].includes(recordType)) {
        return fail("Invalid project record type");
      }

      const { dispute, isParty, role } = await authorize(supabase, user.id, disputeId);
      if (!dispute) return fail("Dispute not found", 404);
      if (!isParty) return fail("Only parties can submit evidence", 403);

      const limitErr = await enforceSubmissionRateLimit(supabase, user.id);
      if (limitErr) return fail(limitErr, 429);

      // Verify the record belongs to THIS dispute's project.
      let belongs = false;
      if (recordType === "project_document") {
        const { data: r } = await supabase.from("project_documents").select("id").eq("id", recordId).eq("job_id", dispute.project_id).maybeSingle();
        belongs = !!r;
      } else if (recordType === "variation") {
        const { data: r } = await supabase.from("variations").select("id").eq("id", recordId).eq("job_id", dispute.project_id).maybeSingle();
        belongs = !!r;
      } else if (recordType === "daily_log") {
        const { data: r } = await supabase.from("daily_logs").select("id").eq("id", recordId).eq("job_id", dispute.project_id).maybeSingle();
        belongs = !!r;
      }
      if (!belongs) return fail("The selected record does not belong to this dispute's project", 403);

      const evidenceReference = await generateEvidenceReference(supabase);
      const { data: evidence, error } = await supabase
        .from("dispute_evidence").insert({
          dispute_id: disputeId,
          submitted_by_user_id: user.id,
          evidence_reference: evidenceReference,
          evidence_category: category,
          title,
          description: description || null,
          event_date: eventDate || null,
          source_type: "linked_record",
          linked_project_record_type: recordType,
          linked_project_record_id: recordId,
          visibility: "shared",
          submission_status: "validated",
        }).select().single();
      if (error) return fail(error.message);

      await recordActivity(
        supabase, dispute, user.id, role,
        "evidence_submitted",
        "Evidence linked from project records",
        title,
        evidence.id,
        "evidence.linked_record",
        { evidence_reference: evidenceReference, source_type: "linked_record", linked_project_record_type: recordType },
        true,
        "dispute_evidence_submitted",
        "New evidence added to your dispute",
        `${dispute.case_reference}: new evidence (${evidenceReference}) has been added.`,
      );

      return ok({ evidence });
    }

    // withdraw — submitting party requests withdrawal (record retained).
    if (action === "withdraw") {
      const evidenceId = typeof body?.evidenceId === "string" ? body.evidenceId : "";
      const reason = typeof body?.reason === "string" ? body.reason.trim() : "";
      if (!evidenceId) return fail("evidenceId is required");

      const { data: evidence } = await supabase
        .from("dispute_evidence").select("*").eq("id", evidenceId).maybeSingle();
      if (!evidence) return fail("Not found", 404);
      if (evidence.submitted_by_user_id !== user.id) {
        return fail("Only the submitting party can withdraw this evidence", 403);
      }
      if (evidence.submission_status === "withdrawn") return fail("Already withdrawn", 409);

      const { dispute, role } = await authorize(supabase, user.id, evidence.dispute_id);
      if (!dispute) return fail("Dispute not found", 404);

      const { data: updated, error } = await supabase
        .from("dispute_evidence")
        .update({ submission_status: "withdrawn", visibility: "withdrawn" })
        .eq("id", evidenceId).select().single();
      if (error) return fail(error.message);

      await supabase.from("dispute_events").insert({
        dispute_id: evidence.dispute_id,
        event_type: "evidence_withdrawn",
        actor_user_id: user.id,
        actor_role: role === "claimant" || role === "respondent" ? role : "system",
        title: "Evidence withdrawn",
        description: reason || "Withdrawn by the submitting party.",
        related_record_type: "dispute_evidence",
        related_record_id: evidenceId,
        visibility: "parties",
      });

      await supabase.from("dispute_audit_log").insert({
        dispute_id: evidence.dispute_id,
        actor_user_id: user.id,
        action: "evidence.withdrawn",
        target_type: "dispute_evidence",
        target_id: evidenceId,
        previous_value: { submission_status: evidence.submission_status },
        new_value: { submission_status: "withdrawn", reason: reason || null },
      });

      return ok({ evidence: updated });
    }

    return fail("Unknown action");
  } catch (err) {
    console.error("dispute-evidence error:", err);
    return fail(err instanceof Error ? err.message : "Operation failed", 500);
  }
});
