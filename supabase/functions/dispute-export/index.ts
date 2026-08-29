import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "https://esm.sh/pdf-lib@1.17.1";
import JSZip from "https://esm.sh/jszip@3.10.1";

const supabaseUrl = Deno.env.get("VITE_PUBLIC_SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BUCKET = "private";
const EXPORT_PREFIX = "dispute-exports";
const SIGNED_URL_EXPIRY = 3600; // 1 hour

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PURPOSES = new Set(["legal_review", "mediation", "pre_action_exchange", "court_preparation"]);
const PERSPECTIVES = new Set(["claimant", "respondent"]);
const TERMINAL_STATUSES = ["resolved", "withdrawn", "closed"];

const DISCLAIMER =
  "This pack organises records selected from BuildNerve. It is not legal advice, a court filing, proof that the contents are true, or a guarantee that every item will be admitted as evidence. Review the pack carefully and obtain professional advice where appropriate.";

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

function safeName(s: string): string {
  const cleaned = (s || "").replace(/[^a-zA-Z0-9._-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "");
  return cleaned.slice(0, 80) || "file";
}

function sanitizeText(s: unknown): string {
  if (typeof s !== "string") return "";
  return s.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, "").slice(0, 20000);
}

function money(pence: number | null | undefined, currency = "GBP"): string {
  if (pence === null || pence === undefined) return "—";
  const symbol = currency === "EUR" ? "€" : currency === "USD" ? "$" : "£";
  const v = pence / 100;
  return `${symbol}${v.toLocaleString("en-GB", { minimumFractionDigits: Number.isInteger(v) ? 0 : 2, maximumFractionDigits: 2 })}`;
}

function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-GB", {
    day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit",
  });
}

// Re-validates party / org-admin access on every request.
async function authorize(supabase: ReturnType<typeof createClient>, userId: string, disputeId: string) {
  const { data: dispute } = await supabase
    .from("disputes").select("*").eq("id", disputeId).maybeSingle();
  if (!dispute) return { dispute: null, isParty: false, role: null };

  const isClaimant = dispute.claimant_user_id === userId;
  const isRespondent = dispute.respondent_user_id === userId;
  let isParty = isClaimant || isRespondent;

  if (!isParty) {
    const { data: admin } = await supabase
      .from("organisation_members").select("id")
      .eq("organisation_id", dispute.organisation_id).eq("user_id", userId)
      .eq("status", "active").in("role", ["owner", "admin"]).maybeSingle();
    if (!admin) return { dispute, isParty: false, role: null };
  }

  const role = isClaimant ? "claimant" : isRespondent ? "respondent" : "admin";
  return { dispute, isParty, role };
}

async function recordActivity(
  supabase: ReturnType<typeof createClient>,
  dispute: { id: string; organisation_id: string; project_id: string; claimant_user_id: string; respondent_user_id: string | null; case_reference: string },
  userId: string,
  role: string,
  eventType: string,
  eventTitle: string,
  eventDescription: string | null,
  targetId: string,
  auditAction: string,
  auditNewValue: unknown,
) {
  await supabase.from("dispute_events").insert({
    dispute_id: dispute.id,
    event_type: eventType,
    actor_user_id: userId,
    actor_role: role === "claimant" || role === "respondent" ? role : "system",
    title: eventTitle,
    description: eventDescription,
    related_record_type: "dispute_export",
    related_record_id: targetId,
    visibility: "parties",
  });
  await supabase.from("dispute_audit_log").insert({
    dispute_id: dispute.id,
    actor_user_id: userId,
    action: auditAction,
    target_type: "dispute_export",
    target_id: targetId,
    new_value: auditNewValue,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// PDF LAYOUT HELPER (simple A4 paginator using pdf-lib standard fonts)
// ─────────────────────────────────────────────────────────────────────────────
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 48;
const CONTENT_W = PAGE_W - MARGIN * 2;

interface SectionEntry {
  number: number;
  title: string;
  page: number;
}

class Layouter {
  doc: PDFDocument;
  font: ReturnType<PDFDocument["embedFont"]> extends Promise<infer T> ? T : never;
  bold: ReturnType<PDFDocument["embedFont"]> extends Promise<infer T> ? T : never;
  page: ReturnType<PDFDocument["addPage"]>;
  y: number;
  pageNumber = 1;
  pageStartY: number;
  private pageNumbers: { page: ReturnType<PDFDocument["addPage"]>; num: number }[] = [];

  constructor(doc: PDFDocument, font: any, bold: any) {
    this.doc = doc;
    this.font = font;
    this.bold = bold;
    this.page = doc.addPage([PAGE_W, PAGE_H]);
    this.pageStartY = PAGE_H - MARGIN - 30;
    this.y = this.pageStartY;
    this.pageNumbers.push({ page: this.page, num: 1 });
  }

  private newPage() {
    this.page = this.doc.addPage([PAGE_W, PAGE_H]);
    this.y = this.pageStartY;
    this.pageNumber += 1;
    this.pageNumbers.push({ page: this.page, num: this.pageNumber });
  }

  ensure(space: number) {
    if (this.y - space < MARGIN) this.newPage();
  }

  private write(text: string, size: number, font: any, color: any, lineHeight: number, indent = 0) {
    const width = CONTENT_W - indent;
    const words = text.split(/\s+/).filter(Boolean);
    let line = "";
    const lines: string[] = [];
    for (const w of words) {
      const test = line ? `${line} ${w}` : w;
      if (font.widthOfTextAtSize(test, size) > width && line) {
        lines.push(line);
        line = w;
      } else {
        line = test;
      }
    }
    if (line) lines.push(line);
    if (lines.length === 0) lines.push("");

    for (const ln of lines) {
      this.ensure(lineHeight);
      this.page.drawText(ln, { x: MARGIN + indent, y: this.y, size, font, color });
      this.y -= lineHeight;
    }
  }

  text(t: string, opts: { size?: number; color?: any; bold?: boolean; indent?: number } = {}) {
    const size = opts.size ?? 9.5;
    const font = opts.bold ? this.bold : this.font;
    const color = opts.color ?? rgb(0.15, 0.15, 0.15);
    this.write(sanitizeText(t), size, font, color, size + 4, opts.indent ?? 0);
  }

  heading(t: string) {
    this.ensure(20);
    this.y -= 4;
    this.page.drawText(t, { x: MARGIN, y: this.y, size: 13, font: this.bold, color: rgb(0.1, 0.1, 0.1) });
    this.y -= 14;
    this.page.drawLine({
      start: { x: MARGIN, y: this.y + 2 },
      end: { x: PAGE_W - MARGIN, y: this.y + 2 },
      thickness: 1,
      color: rgb(0.82, 0.82, 0.82),
    });
    this.y -= 12;
  }

  subheading(t: string) {
    this.ensure(16);
    this.y -= 3;
    this.page.drawText(t, { x: MARGIN, y: this.y, size: 10.5, font: this.bold, color: rgb(0.2, 0.2, 0.2) });
    this.y -= 12;
  }

  label(t: string) {
    this.text(t, { size: 8.5, color: rgb(0.45, 0.45, 0.45) });
  }

  bullet(t: string) {
    this.write(`•  ${t}`, 9.5, this.font, rgb(0.15, 0.15, 0.15), 14, 12);
  }

  gap(n = 8) {
    this.ensure(n);
    this.y -= n;
  }

  finalize() {
    for (const { page, num } of this.pageNumbers) {
      page.drawText(`Page ${num}`, { x: MARGIN, y: MARGIN - 18, size: 8, font: this.font, color: rgb(0.5, 0.5, 0.5) });
      page.drawText("BuildNerve Evidence Pack", { x: PAGE_W - MARGIN - 110, y: MARGIN - 18, size: 8, font: this.font, color: rgb(0.5, 0.5, 0.5) });
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS TO LOAD SELECTED RECORDS
// ─────────────────────────────────────────────────────────────────────────────
async function loadNames(supabase: ReturnType<typeof createClient>, ids: string[]): Promise<Record<string, string | null>> {
  const map: Record<string, string | null> = {};
  if (ids.length === 0) return map;
  const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", [...new Set(ids)]);
  for (const p of profiles || []) map[p.id] = p.full_name ?? null;
  return map;
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

    // ── get_workspace ──────────────────────────────────────────────────────
    if (action === "get_workspace") {
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      if (!disputeId) return fail("disputeId is required");

      const { dispute, isParty } = await authorize(supabase, user.id, disputeId);
      if (!dispute) return fail("Dispute not found", 404);
      if (!isParty) return fail("Access denied", 403);

      const reasons: string[] = [];
      if (dispute.jurisdiction !== "england_wales") reasons.push("Only England & Wales disputes are supported.");
      if (dispute.status === "draft") reasons.push("The dispute has not been formally submitted.");
      if (TERMINAL_STATUSES.indexOf(dispute.status) !== -1) reasons.push("The dispute is already closed or resolved.");

      const [{ data: project }, { data: claims }, { data: evidence }, { data: letters },
             { data: offers }, { data: issues }, { data: checklist }] = await Promise.all([
        supabase.from("jobs").select("id, reference, project_name").eq("id", dispute.project_id).maybeSingle(),
        supabase.from("dispute_claims").select("*").eq("dispute_id", disputeId).order("submitted_at", { ascending: true }),
        supabase.from("dispute_evidence").select("*").eq("dispute_id", disputeId).order("created_at", { ascending: false }),
        supabase.from("dispute_letters").select("*").eq("dispute_id", disputeId).order("created_at", { ascending: true }),
        supabase.from("dispute_settlement_offers").select("id").eq("dispute_id", disputeId),
        supabase.from("dispute_preaction_issues").select("id").eq("dispute_id", disputeId),
        supabase.from("dispute_preaction_checklist").select("id").eq("dispute_id", disputeId),
      ]);

      const allUserIdSet = new Set<string>();
      (claims || []).forEach((c: any) => allUserIdSet.add(c.submitted_by_user_id));
      (evidence || []).forEach((e: any) => allUserIdSet.add(e.submitted_by_user_id));
      const nameMap = await loadNames(supabase, [...allUserIdSet]);

      const roleFor = (uid: string): "claimant" | "respondent" | null =>
        uid === dispute.claimant_user_id ? "claimant" : uid === dispute.respondent_user_id ? "respondent" : null;

      // Determine superseded evidence ids.
      const supersededBy = new Map<string, string>();
      for (const e of evidence || []) if (e.supersedes_evidence_id) supersededBy.set(e.supersedes_evidence_id, e.id);

      const claimsView = (claims || []).map((c: any) => ({
        id: c.id,
        claim_type: c.claim_type,
        submitted_by_name: nameMap[c.submitted_by_user_id] ?? null,
        submitted_by_role: roleFor(c.submitted_by_user_id),
        submitted_at: c.submitted_at,
        amount_pence: c.amount_pence,
        status: c.status,
        superseded: c.status === "superseded",
        preview: (c.statement || "").slice(0, 240),
      }));

      const evidenceView = (evidence || []).map((e: any) => ({
        id: e.id,
        reference: e.evidence_reference,
        title: e.title,
        category: e.evidence_category,
        submitted_by_name: nameMap[e.submitted_by_user_id] ?? null,
        submitted_by_role: roleFor(e.submitted_by_user_id),
        submission_status: e.submission_status,
        source_type: e.source_type,
        mime_type: e.mime_type,
        original_filename: e.original_filename,
        file_size: e.file_size,
        file_hash: e.file_hash,
        superseded_by_id: supersededBy.get(e.id) ?? null,
        withdrawn: e.submission_status === "withdrawn",
      }));

      const lettersView = (letters || []).map((l: any) => ({
        id: l.id,
        version: l.version,
        status: l.status,
        title: l.title,
        created_at: l.created_at,
      }));

      const partyNames = {
        claimant: null as string | null,
        respondent: null as string | null,
      };
      const { data: parties } = await supabase.from("dispute_parties").select("*").eq("dispute_id", disputeId);
      for (const p of parties || []) {
        const nm = nameMap[p.user_id] ?? p.display_name_snapshot ?? null;
        if (p.party_role === "claimant") partyNames.claimant = nm;
        if (p.party_role === "respondent") partyNames.respondent = nm;
      }

      return ok({
        eligible: reasons.length === 0,
        reasons,
        isParty,
        jurisdiction: dispute.jurisdiction,
        status: dispute.status,
        project: project ? { reference: project.reference ?? null, project_name: project.project_name ?? null } : null,
        claims: claimsView,
        evidence: evidenceView,
        letters: lettersView,
        counts: {
          claims: claimsView.length,
          evidence: evidenceView.length,
          offers: (offers || []).length,
          issues: (issues || []).length,
          checklist: (checklist || []).length,
          letters: lettersView.length,
        },
        partyNames,
      });
    }

    // ── list ───────────────────────────────────────────────────────────────
    if (action === "list") {
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      if (!disputeId) return fail("disputeId is required");
      const { dispute, isParty } = await authorize(supabase, user.id, disputeId);
      if (!dispute) return fail("Dispute not found", 404);
      if (!isParty) return fail("Access denied", 403);

      const { data: exports } = await supabase
        .from("dispute_exports").select("*").eq("dispute_id", disputeId).order("created_at", { ascending: false });

      const userIds = [...new Set((exports || []).map((e: any) => e.created_by_user_id))];
      const nameMap = await loadNames(supabase, userIds);
      const roleFor = (uid: string) => uid === dispute.claimant_user_id ? "claimant" : uid === dispute.respondent_user_id ? "respondent" : null;

      const view = (exports || []).map((e: any) => ({
        ...e,
        created_by_name: nameMap[e.created_by_user_id] ?? null,
        created_by_role: roleFor(e.created_by_user_id),
      }));
      return ok({ exports: view });
    }

    // ── generate ───────────────────────────────────────────────────────────
    if (action === "generate") {
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      const config = body?.config ?? {};
      if (!disputeId) return fail("disputeId is required");

      const { dispute, isParty, role } = await authorize(supabase, user.id, disputeId);
      if (!dispute) return fail("Dispute not found", 404);
      if (!isParty) return fail("Only parties to this dispute can create a pack", 403);
      if (dispute.jurisdiction !== "england_wales") return fail("Only England & Wales disputes are supported", 403);
      if (dispute.status === "draft") return fail("The dispute must be formally submitted", 409);
      if (TERMINAL_STATUSES.indexOf(dispute.status) !== -1) return fail("This dispute is already closed", 409);

      const perspective = typeof config.perspective === "string" ? config.perspective : "";
      const purpose = typeof config.purpose === "string" ? config.purpose : "";
      const title = sanitizeText(config.title).trim();
      if (!PERSPECTIVES.has(perspective)) return fail("A valid perspective is required");
      if (!PURPOSES.has(purpose)) return fail("A valid purpose is required");
      if (!title) return fail("A pack title is required");

      const claimIds: string[] = Array.isArray(config.claimIds) ? config.claimIds.filter((x: unknown) => typeof x === "string") : [];
      const evidenceIds: string[] = Array.isArray(config.evidenceIds) ? config.evidenceIds.filter((x: unknown) => typeof x === "string") : [];
      const letterIds: string[] = Array.isArray(config.letterIds) ? config.letterIds.filter((x: unknown) => typeof x === "string") : [];

      // Fetch all dispute records.
      const [{ data: project }, { data: claims }, { data: evidence }, { data: letters },
             { data: events }, { data: offers }, { data: issues }, { data: checklist }, { data: parties }] = await Promise.all([
        supabase.from("jobs").select("id, reference, project_name").eq("id", dispute.project_id).maybeSingle(),
        supabase.from("dispute_claims").select("*").eq("dispute_id", disputeId).order("submitted_at", { ascending: true }),
        supabase.from("dispute_evidence").select("*").eq("dispute_id", disputeId).order("created_at", { ascending: true }),
        supabase.from("dispute_letters").select("*").eq("dispute_id", disputeId).order("created_at", { ascending: true }),
        supabase.from("dispute_events").select("*").eq("dispute_id", disputeId).order("created_at", { ascending: true }),
        supabase.from("dispute_settlement_offers").select("*").eq("dispute_id", disputeId).order("created_at", { ascending: true }),
        supabase.from("dispute_preaction_issues").select("*").eq("dispute_id", disputeId).order("created_at", { ascending: true }),
        supabase.from("dispute_preaction_checklist").select("*").eq("dispute_id", disputeId).order("created_at", { ascending: true }),
        supabase.from("dispute_parties").select("*").eq("dispute_id", disputeId),
      ]);

      const allRows = claims || [];
      if (allRows.length === 0) return fail("At least one claim or response is required before creating a pack", 409);

      // Selected subsets (all dispute-scoped, so no cross-project leakage possible).
      const selectedClaims = claimIds.length
        ? allRows.filter((c: any) => claimIds.includes(c.id))
        : allRows;
      const selectedEvidence = evidenceIds.length
        ? (evidence || []).filter((e: any) => evidenceIds.includes(e.id))
        : [];
      const selectedLetters = letterIds.length
        ? (letters || []).filter((l: any) => letterIds.includes(l.id))
        : [];

      const nameMap = await loadNames(supabase, [...new Set([...allRows.map((c: any) => c.submitted_by_user_id), ...(evidence || []).map((e: any) => e.submitted_by_user_id), ...(events || []).map((e: any) => e.actor_user_id).filter(Boolean)])]);
      const roleFor = (uid: string): string => uid === dispute.claimant_user_id ? "claimant" : uid === dispute.respondent_user_id ? "respondent" : "system";

      const partyNames: { claimant: string | null; respondent: string | null } = { claimant: null, respondent: null };
      for (const p of parties || []) {
        const nm = nameMap[p.user_id] ?? p.display_name_snapshot ?? null;
        if (p.party_role === "claimant") partyNames.claimant = nm;
        if (p.party_role === "respondent") partyNames.respondent = nm;
      }

      const now = new Date().toISOString();

      // Determine next version.
      const { data: existing } = await supabase.from("dispute_exports").select("id").eq("dispute_id", disputeId);
      const version = (existing || []).length + 1;

      // ── Build the PDF ────────────────────────────────────────────────────
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
      const lay = new Layouter(pdfDoc, font, bold);

      // 1. Cover page
      lay.gap(120);
      lay.page.drawText("BuildNerve", { x: MARGIN, y: lay.y, size: 22, font: bold, color: rgb(0.1, 0.1, 0.1) });
      lay.y -= 30;
      lay.page.drawText("Dispute Evidence Pack", { x: MARGIN, y: lay.y, size: 20, font: bold, color: rgb(0.1, 0.1, 0.1) });
      lay.y -= 40;
      lay.label(`Case reference: ${dispute.case_reference}`);
      lay.label(`Project: ${project?.project_name ?? "—"}`);
      lay.label(`Jurisdiction: England & Wales`);
      lay.label(`Purpose: ${purpose}`);
      lay.label(`Perspective: ${perspective}`);
      lay.label(`Generated: ${fmtDateTime(now)}`);
      lay.label(`Pack version: ${version}`);
      lay.gap(24);
      lay.text(DISCLAIMER, { size: 8.5, color: rgb(0.4, 0.4, 0.4) });

      // 2. Contents page (filled after sections built — collect section page numbers)
      const sections: SectionEntry[] = [];
      const contentsPageIndex = 0; // contents starts on page 2

      // Track contents by building sections, capturing page numbers before each.
      const beginSection = (num: number, titleStr: string) => {
        lay.newPage();
        lay.heading(`Section ${num}. ${titleStr}`);
        sections.push({ number: num, title: titleStr, page: lay.pageNumber });
      };

      // 3. Case information
      beginSection(3, "Case information");
      lay.subheading("Parties");
      lay.text(`Claimant: ${partyNames.claimant ?? "—"} (role: ${dispute.claimant_role})`);
      lay.text(`Respondent: ${partyNames.respondent ?? "—"} (role: ${dispute.respondent_role ?? "—"})`);
      lay.gap();
      lay.subheading("Project details");
      lay.text(`Project: ${project?.project_name ?? "—"}${project?.reference ? ` (${project.reference})` : ""}`);
      lay.gap();
      lay.subheading("Dispute status");
      lay.text(`Status: ${dispute.status}`);
      lay.text(`Category: ${dispute.dispute_category}`);
      lay.gap();
      lay.subheading("Amounts claimed and counterclaimed");
      const claimAmounts = allRows.filter((c: any) => c.claim_type === "claim").map((c: any) => c.amount_pence).filter((v: unknown) => v != null);
      const counterAmounts = allRows.filter((c: any) => c.claim_type === "counterclaim").map((c: any) => c.amount_pence).filter((v: unknown) => v != null);
      const totalClaim = claimAmounts.length ? (claimAmounts as number[]).reduce((a: number, b: number) => a + b, 0) : null;
      const totalCounter = counterAmounts.length ? (counterAmounts as number[]).reduce((a: number, b: number) => a + b, 0) : null;
      lay.text(`Amount claimed: ${money(totalClaim, dispute.currency)}`);
      lay.text(`Amount counterclaimed: ${money(totalCounter, dispute.currency)}`);

      // 4. User-reviewed case summary
      beginSection(4, "User-reviewed case summary");
      if (config.includeSummary && sanitizeText(config.summaryText).trim()) {
        lay.text(`Prepared / approved by: ${sanitizeText(config.summaryPreparedBy) || "—"}`);
        lay.gap();
        lay.text(sanitizeText(config.summaryText));
      } else {
        lay.text("No case summary was included in this pack.");
      }

      // 5. Chronology
      beginSection(5, "Chronology");
      if (config.includeChronology && (events || []).length) {
        for (const ev of events || []) {
          lay.text(`${fmtDate(ev.created_at)} — ${ev.title}`, { bold: true });
          if (ev.description) lay.text(ev.description, { color: rgb(0.3, 0.3, 0.3) });
          lay.label(`Source: ${ev.event_type}`);
          lay.gap(4);
        }
      } else {
        lay.text("Chronology was not included in this pack.");
      }

      // 6. Claims and responses
      beginSection(6, "Claims and responses");
      if (selectedClaims.length) {
        for (const c of selectedClaims) {
          lay.subheading(`${c.claim_type} — ${nameMap[c.submitted_by_user_id] ?? "Party"} (${roleFor(c.submitted_by_user_id)})`);
          lay.label(`Submitted: ${fmtDateTime(c.submitted_at)} · Status: ${c.status}${c.supersedes_claim_id ? " · Supersedes a prior version" : ""}`);
          if (c.statement) lay.text(c.statement);
          if (c.amount_pence != null) lay.text(`Amount: ${money(c.amount_pence, dispute.currency)}`);
          if (c.requested_remedy) lay.text(`Remedy requested: ${c.requested_remedy}`);
          if (c.position) lay.text(`Position: ${c.position}`);
          lay.gap(6);
        }
      } else {
        lay.text("No claims or responses were selected.");
      }

      // 7. Issues schedule
      beginSection(7, "Issues schedule");
      if ((issues || []).length) {
        for (const it of issues || []) {
          lay.subheading(`${it.issue_reference} — ${it.title}`);
          if (it.claimant_position) lay.text(`Claimant position: ${it.claimant_position}`);
          if (it.respondent_position) lay.text(`Respondent position: ${it.respondent_position}`);
          if (it.agreed_facts) lay.text(`Agreed facts: ${it.agreed_facts}`);
          if (it.disputed_facts) lay.text(`Disputed facts: ${it.disputed_facts}`);
          lay.label(`Resolution status: ${it.resolution_status}`);
          lay.gap(6);
        }
      } else {
        lay.text("No issues have been recorded.");
      }
      lay.text("This schedule records agreed and disputed facts without declaring which position is correct.", { size: 8, color: rgb(0.45, 0.45, 0.45) });

      // 8. Financial schedule
      beginSection(8, "Financial schedule");
      lay.text(`Amount claimed: ${money(totalClaim, dispute.currency)}`);
      lay.text(`Amount counterclaimed: ${money(totalCounter, dispute.currency)}`);
      lay.gap();
      lay.subheading("User-provided calculation");
      let hasCalculation = false;
      for (const c of allRows) {
        if (c.calculation_breakdown) {
          hasCalculation = true;
          let calc = "";
          if (typeof c.calculation_breakdown === "string") calc = c.calculation_breakdown;
          else calc = JSON.stringify(c.calculation_breakdown, null, 2);
          lay.text(calc);
          break;
        }
      }
      if (!hasCalculation) lay.text("No calculation breakdown was provided.");
      lay.gap();
      lay.subheading("Selected financial evidence (invoices & payments)");
      const finEvidence = selectedEvidence.filter((e: any) => e.evidence_category === "invoice" || e.evidence_category === "payment");
      if (finEvidence.length) {
        for (const e of finEvidence) lay.bullet(`${e.evidence_reference} — ${e.title}`);
      } else {
        lay.text("No invoice or payment evidence was selected.");
      }
      lay.text("Original contract amount and approved variations are recorded in the project record; this pack does not calculate legal entitlement or interest.", { size: 8, color: rgb(0.45, 0.45, 0.45) });

      // 9. Communications schedule
      beginSection(9, "Communications schedule");
      if (config.includeCorrespondence) {
        const comms = selectedEvidence.filter((e: any) => e.evidence_category === "message_or_email");
        if (comms.length) {
          for (const e of comms) {
            lay.subheading(`${e.evidence_reference} — ${e.title}`);
            lay.label(`Submitted by: ${nameMap[e.submitted_by_user_id] ?? "Party"} (${roleFor(e.submitted_by_user_id)}) · ${fmtDate(e.event_date || e.submitted_at)}`);
            if (e.description) lay.text(e.description);
            lay.gap(6);
          }
        } else {
          lay.text("No message or email evidence was selected.");
        }
      } else {
        lay.text("Correspondence was not included in this pack.");
      }

      // 10. Evidence index
      beginSection(10, "Evidence index");
      if (selectedEvidence.length) {
        for (const e of selectedEvidence) {
          lay.subheading(`${e.evidence_reference} — ${e.title}`);
          lay.label(`Category: ${e.evidence_category} · Submitted by: ${nameMap[e.submitted_by_user_id] ?? "Party"} · Event date: ${fmtDate(e.event_date)} · Submission date: ${fmtDate(e.submitted_at)}`);
          lay.label(`Filename: ${e.original_filename ?? "—"} · File hash: ${e.file_hash ?? "—"} · State: ${e.submission_status}${e.superseded_by_id ? " (superseded)" : ""}`);
          lay.gap(4);
        }
      } else {
        lay.text("No evidence was selected.");
      }

      // 11. Selected documentary exhibits
      beginSection(11, "Selected documentary exhibits");
      let exhibitNo = 0;
      const missingItems: { evidence_reference: string; reason: string }[] = [];
      const zippedFiles: { path: string; bytes: Uint8Array; reference: string; hash: string }[] = [];
      const embeddedImageData: { ref: string; title: string; bytes: Uint8Array; kind: "jpg" | "png" }[] = [];

      for (const e of selectedEvidence) {
        exhibitNo += 1;
        if (e.source_type !== "file_upload" || !e.storage_path) {
          // Linked record or text note — index only.
          lay.text(`Exhibit ${exhibitNo}. ${e.evidence_reference} — ${e.title}`, { bold: true });
          lay.text("Linked project record or text note. No original file is attached in the ZIP.", { size: 8.5, color: rgb(0.45, 0.45, 0.45) });
          lay.gap(4);
          continue;
        }
        // Download the file from private storage.
        const { data: blob, error: dlErr } = await supabase.storage.from(BUCKET).download(e.storage_path);
        if (dlErr || !blob) {
          missingItems.push({ evidence_reference: e.evidence_reference, reason: "File could not be retrieved" });
          lay.text(`Exhibit ${exhibitNo}. ${e.evidence_reference} — ${e.title}`, { bold: true });
          lay.text("Original file could not be retrieved and is excluded from this pack.", { size: 8.5, color: rgb(0.7, 0.2, 0.2) });
          lay.gap(4);
          continue;
        }
        const bytes = new Uint8Array(await blob.arrayBuffer());
        const hash = await sha256Hex(bytes);
        const ext = (e.original_filename?.split(".").pop() || "").toLowerCase();
        const zipPath = `evidence/${e.evidence_reference}_${safeName(e.title)}.${ext || "bin"}`;
        zippedFiles.push({ path: zipPath, bytes, reference: e.evidence_reference, hash });

        const isImage = e.mime_type === "image/jpeg" || e.mime_type === "image/png";
        lay.text(`Exhibit ${exhibitNo}. ${e.evidence_reference} — ${e.title}`, { bold: true });
        lay.label(`Provided as original in the ZIP: ${zipPath}`);
        if (isImage && bytes.length <= 2 * 1024 * 1024 && embeddedImageData.length < 15) {
          embeddedImageData.push({ ref: e.evidence_reference, title: e.title, bytes, kind: e.mime_type === "image/png" ? "png" : "jpg" });
        } else {
          lay.text("This document is indexed as a placeholder (not embedded in the PDF) and included as an original file in the ZIP.", { size: 8.5, color: rgb(0.45, 0.45, 0.45) });
        }
        lay.gap(4);
      }

      // Embed images safely after listing (separate page region).
      if (embeddedImageData.length) {
        lay.newPage();
        lay.heading("Embedded documentary exhibits");
        for (const img of embeddedImageData) {
          try {
            let embedded;
            if (img.kind === "png") embedded = await pdfDoc.embedPng(img.bytes);
            else embedded = await pdfDoc.embedJpg(img.bytes);
            const maxW = CONTENT_W - 20;
            const maxH = 340;
            const ratio = Math.min(maxW / embedded.width, maxH / embedded.height, 1);
            const w = embedded.width * ratio;
            const h = embedded.height * ratio;
            lay.ensure(h + 30);
            lay.page.drawText(`${img.ref} — ${img.title}`, { x: MARGIN, y: lay.y, size: 9, font: bold, color: rgb(0.15, 0.15, 0.15) });
            lay.y -= 14;
            lay.page.drawImage(embedded, { x: MARGIN, y: lay.y - h, width: w, height: h });
            lay.y -= h + 16;
          } catch {
            lay.text(`${img.ref} — ${img.title}: could not be embedded; available as an original in the ZIP.`);
          }
        }
      }

      // 12. Negotiation and ADR history
      beginSection(12, "Negotiation and ADR history");
      if (config.includeNegotiation && (offers || []).length) {
        for (const o of offers || []) {
          lay.subheading(`${o.offer_type} — ${o.status}`);
          lay.label(`Offered by: ${nameMap[o.offered_by_user_id] ?? "Party"} (${roleFor(o.offered_by_user_id)}) · ${fmtDateTime(o.created_at)}`);
          if (o.summary) lay.text(o.summary);
          if (o.payment_amount_pence != null) lay.text(`Amount: ${money(o.payment_amount_pence, o.currency)}`);
          if (o.work_description) lay.text(`Work: ${o.work_description}`);
          if (o.conditions) lay.text(`Conditions: ${o.conditions}`);
          lay.gap(6);
        }
        lay.text("Settlement communications may require legal review before court use.", { size: 8, color: rgb(0.45, 0.45, 0.45) });
      } else {
        lay.text("No negotiation records were included.");
      }

      // 13. Pre-action record
      beginSection(13, "Pre-action record");
      if (config.includePreAction) {
        lay.subheading("Checklist summary");
        if ((checklist || []).length) {
          for (const c of checklist || []) lay.bullet(`${c.item_key}: ${c.status}`);
        } else {
          lay.text("No checklist entries.");
        }
        lay.gap();
        lay.subheading("Letter of Claim versions selected");
        if (selectedLetters.length) {
          for (const l of selectedLetters) lay.text(`v${l.version} — ${l.title} (${l.status})`);
        } else {
          lay.text("No letters selected.");
        }
        lay.gap();
        lay.subheading("Outstanding issues");
        const openIssues = (issues || []).filter((i: any) => i.resolution_status !== "resolved");
        lay.text(`${openIssues.length} outstanding issue(s).`);
      } else {
        lay.text("Pre-action record was not included.");
      }

      // 14. Export declaration and generation record
      beginSection(14, "Export declaration and generation record");
      lay.text(`Generated by: ${nameMap[user.id] ?? "Party"} (${roleFor(user.id)})`);
      lay.text(`Generated at: ${fmtDateTime(now)}`);
      lay.text(`Pack version: ${version}`);
      lay.text(`Purpose: ${purpose} · Perspective: ${perspective}`);
      lay.gap();
      lay.subheading("Declaration");
      lay.text("By generating this pack, the user confirms they have reviewed the selected records. This pack is not legal advice, a court filing, or a guarantee that its contents are true or will be admitted as evidence.");
      lay.gap();
      lay.text(DISCLAIMER, { size: 8.5, color: rgb(0.4, 0.4, 0.4) });

      // Now build the contents page (insert as page 2 by drawing directly).
      // We already used page 1 (cover). We'll render contents on a new page now
      // and note it references section page numbers (approximate).
      // To keep numbering stable, we render contents on the current final page set.
      // (Simplification: contents lists sections with their page numbers.)
      lay.newPage();
      lay.heading("Section 2. Contents");
      for (const s of sections) {
        lay.text(`Section ${s.number}. ${s.title}  —  page ${s.page}`);
      }
      lay.gap();
      lay.text("Numbering: page numbers, section numbers, evidence references (BN-E), exhibit numbers and pack version are stable within this pack.", { size: 8.5, color: rgb(0.45, 0.45, 0.45) });

      lay.finalize();
      const pdfBytes = await pdfDoc.save();

      // ── Build the ZIP ────────────────────────────────────────────────────
      const zip = new JSZip();
      zip.file("BuildNerve_Evidence_Pack.pdf", pdfBytes);
      zip.file("readme.txt", [
        "BuildNerve Dispute Evidence Pack",
        "",
        `Case reference: ${dispute.case_reference}`,
        `Pack version: ${version}`,
        `Generated: ${now}`,
        "",
        "Contents:",
        "  - BuildNerve_Evidence_Pack.pdf (the numbered evidence pack)",
        "  - evidence/ (selected original files)",
        "  - evidence_index.json (machine-readable index)",
        "  - manifest.json (filenames, evidence references and SHA-256 hashes)",
        "  - readme.txt (this file)",
        "",
        DISCLAIMER,
      ].join("\n"));

      const indexJson = selectedEvidence.map((e: any) => ({
        evidence_reference: e.evidence_reference,
        title: e.title,
        category: e.evidence_category,
        submitted_by: nameMap[e.submitted_by_user_id] ?? null,
        event_date: e.event_date ?? null,
        submission_date: e.submitted_at,
        original_filename: e.original_filename ?? null,
        file_hash: e.file_hash ?? null,
        version_state: e.submission_status,
        superseded_by: e.superseded_by_id ?? null,
      }));
      zip.file("evidence_index.json", JSON.stringify(indexJson, null, 2));

      const manifestEntries = zippedFiles.map((f) => ({
        path: f.path,
        evidence_reference: f.reference,
        sha256: f.hash,
      }));
      zip.file("manifest.json", JSON.stringify({
        generated_at: now,
        case_reference: dispute.case_reference,
        pack_version: version,
        files: [
          { path: "BuildNerve_Evidence_Pack.pdf", sha256: await sha256Hex(pdfBytes) },
          ...manifestEntries,
        ],
        missing_items: missingItems,
      }, null, 2));

      for (const f of zippedFiles) {
        zip.file(f.path, f.bytes);
      }

      const zipBytes = await zip.generateAsync({ type: "uint8array" });

      // ── Store privately + create the export record ──────────────────────
      const exportId = crypto.randomUUID();
      const pdfPath = `${EXPORT_PREFIX}/${disputeId}/${exportId}/pack.pdf`;
      const zipPath = `${EXPORT_PREFIX}/${disputeId}/${exportId}/pack.zip`;

      const [upPdf, upZip] = await Promise.all([
        supabase.storage.from(BUCKET).upload(pdfPath, pdfBytes, { contentType: "application/pdf", upsert: false }),
        supabase.storage.from(BUCKET).upload(zipPath, zipBytes, { contentType: "application/zip", upsert: false }),
      ]);
      if (upPdf.error) return fail(upPdf.error.message);
      if (upZip.error) return fail(upZip.error.message);

      const { data: exportRow, error: insErr } = await supabase
        .from("dispute_exports")
        .insert({
          id: exportId,
          dispute_id: disputeId,
          created_by_user_id: user.id,
          version,
          perspective,
          title,
          purpose,
          status: "ready",
          configuration: config,
          pdf_storage_path: pdfPath,
          zip_storage_path: zipPath,
          item_count: selectedClaims.length + selectedEvidence.length,
          file_count: zippedFiles.length,
          missing_items: missingItems.length ? missingItems : null,
          declared_at: now,
          generated_at: now,
        })
        .select()
        .single();
      if (insErr) return fail(insErr.message);

      await recordActivity(
        supabase, dispute, user.id, role,
        "export_generated", "Evidence pack generated", title,
        exportId, "export.generated",
        { version, purpose, perspective, item_count: exportRow.item_count, file_count: exportRow.file_count },
      );

      const [signedPdf, signedZip] = await Promise.all([
        supabase.storage.from(BUCKET).createSignedUrl(pdfPath, SIGNED_URL_EXPIRY),
        supabase.storage.from(BUCKET).createSignedUrl(zipPath, SIGNED_URL_EXPIRY),
      ]);

      return ok({
        export: { ...exportRow, created_by_name: nameMap[user.id] ?? null, created_by_role: roleFor(user.id) },
        pdfUrl: signedPdf?.data?.signedUrl ?? null,
        zipUrl: signedZip?.data?.signedUrl ?? null,
      });
    }

    // ── download ───────────────────────────────────────────────────────────
    if (action === "download") {
      const exportId = typeof body?.exportId === "string" ? body.exportId : "";
      const kind = body?.kind === "zip" ? "zip" : "pdf";
      if (!exportId) return fail("exportId is required");

      const { data: exportRow } = await supabase
        .from("dispute_exports").select("*").eq("id", exportId).maybeSingle();
      if (!exportRow) return fail("Not found", 404);

      const { dispute, isParty, role } = await authorize(supabase, user.id, exportRow.dispute_id);
      if (!dispute) return fail("Dispute not found", 404);
      if (!isParty) return fail("Access denied", 403);
      if (exportRow.status !== "ready") return fail("This pack is not available for download", 409);

      const path = kind === "zip" ? exportRow.zip_storage_path : exportRow.pdf_storage_path;
      if (!path) return fail("File not found", 404);

      const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(path, SIGNED_URL_EXPIRY);
      if (!signed?.signedUrl) return fail("Could not generate a download link", 500);

      await supabase.from("dispute_exports").update({ downloaded_at: new Date().toISOString() }).eq("id", exportId);
      await supabase.from("dispute_audit_log").insert({
        dispute_id: exportRow.dispute_id,
        actor_user_id: user.id,
        action: "export.downloaded",
        target_type: "dispute_export",
        target_id: exportId,
        new_value: { kind, downloaded_at: new Date().toISOString() },
      });

      const ext = kind === "zip" ? "zip" : "pdf";
      return ok({ url: signed.signedUrl, filename: `BuildNerve_Evidence_Pack_v${exportRow.version}.${ext}` });
    }

    return fail("Unknown action");
  } catch (err) {
    console.error("dispute-export error:", err);
    return fail(err instanceof Error ? err.message : "Operation failed", 500);
  }
});
