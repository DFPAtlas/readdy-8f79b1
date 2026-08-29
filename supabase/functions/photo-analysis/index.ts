import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

type AnalysisType = "hazard" | "quality" | "defect";
type Severity = "low" | "medium" | "high" | "critical";

interface Finding {
  label: string;
  severity: Severity;
  description: string;
  bounding_box: { x: number; y: number; width: number; height: number } | null;
}

interface ChecklistRule {
  type: AnalysisType;
  pattern: RegExp;
  finding: Finding;
}

// Deterministic checklist — the fallback when no vision key is configured.
const CHECKLIST_RULES: ChecklistRule[] = [
  { type: "hazard", pattern: /(opening|open roof|roof|edge|height)/, finding: { label: "Falls from height", severity: "high", description: "Potential open edge or fall risk detected. Verify edge protection and fall restraint.", bounding_box: null } },
  { type: "hazard", pattern: /(steel|beam|prop|propping|support)/, finding: { label: "Temporary support", severity: "medium", description: "Check temporary propping or support arrangements are adequate before work proceeds.", bounding_box: null } },
  { type: "hazard", pattern: /(dust|cut|cutting|disc|saw)/, finding: { label: "Dust control", severity: "low", description: "Dust-generating activity visible; confirm extraction or RPE is in use.", bounding_box: null } },
  { type: "hazard", pattern: /(electric|socket|cable|live|wiring)/, finding: { label: "Electrical safety", severity: "high", description: "Electrical work visible; verify isolation and competent-person control.", bounding_box: null } },
  { type: "hazard", pattern: /(excavat|trench|foundation|footing)/, finding: { label: "Excavation safety", severity: "medium", description: "Excavation or foundation work visible; confirm edge protection and safe access.", bounding_box: null } },
  { type: "hazard", pattern: /(ladder|scaffold|platform|working at height)/, finding: { label: "Working at height", severity: "medium", description: "Check access equipment is inspected and used correctly.", bounding_box: null } },
  { type: "quality", pattern: /(blockwork|mortar|joint|pointing|brick)/, finding: { label: "Joint consistency", severity: "low", description: "Check mortar joint thickness and tooling for consistency.", bounding_box: null } },
  { type: "quality", pattern: /(level|plumb|padstone|bearing|bedded)/, finding: { label: "Levelling & bearing", severity: "low", description: "Verify padstones and bearings are level and correctly bedded.", bounding_box: null } },
  { type: "quality", pattern: /(mark|layout|setting out|chalk|position)/, finding: { label: "Setting out accuracy", severity: "medium", description: "Re-check marked positions against the latest drawing revision before work.", bounding_box: null } },
  { type: "quality", pattern: /(dpc|membrane|dpm|insulation)/, finding: { label: "DPC / membrane", severity: "low", description: "Confirm DPC and membrane laps and positioning are correct.", bounding_box: null } },
  { type: "defect", pattern: /(crack|movement|damp|leak|defect|damage|chip)/, finding: { label: "Defect", severity: "high", description: "Potential defect or damage visible; record and investigate.", bounding_box: null } },
];

function runChecklist(caption: string, evidenceType: string, analysisType: AnalysisType): Finding[] {
  const text = `${caption} ${evidenceType}`.toLowerCase();
  return CHECKLIST_RULES
    .filter((r) => r.type === analysisType && r.pattern.test(text))
    .map((r) => r.finding);
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const path = url.pathname.replace(/^\/photo-analysis\/?/, "");

    // POST /analyze — run checklist/vision analysis and persist findings
    if (req.method === "POST" && path === "analyze") {
      const body = await req.json();
      const {
        organisationId,
        evidenceFileId,
        evidenceRecordId = null,
        analysisType = "hazard",
        caption = "",
        evidenceType = "",
      } = body;

      if (!organisationId || !evidenceFileId) {
        return new Response(JSON.stringify({ error: "organisationId and evidenceFileId are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const type = (["hazard", "quality", "defect"].includes(analysisType) ? analysisType : "hazard") as AnalysisType;

      let findings: Finding[] = runChecklist(caption, evidenceType, type);

      // Optional vision tailoring when an OpenAI key is configured; fall back to checklist on failure.
      const openaiKey = Deno.env.get("OPENAI_API_KEY");
      if (openaiKey && (evidenceFileId || caption)) {
        try {
          const prompt =
            `You are a UK construction site photo analyst. Review the following site photograph context and report ${type} findings. ` +
            `Caption: "${caption || "No caption provided"}". Evidence type: "${evidenceType || "photo"}". ` +
            `Return ONLY valid JSON: {"findings":[{"label":"...","severity":"low|medium|high|critical","description":"..."}]}. ` +
            `Report only specific, credible findings; return an empty array if nothing notable is visible.`;

          const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: prompt }],
              temperature: 0.3,
              max_tokens: 1200,
              response_format: { type: "json_object" },
            }),
          });
          const openaiData = await openaiResp.json();
          if (openaiResp.ok) {
            const parsed = JSON.parse(openaiData.choices?.[0]?.message?.content || "");
            if (Array.isArray(parsed.findings)) {
              findings = parsed.findings.map((f: any) => ({
                label: String(f.label || "Finding"),
                severity: (["low", "medium", "high", "critical"].includes(f.severity) ? f.severity : "medium") as Severity,
                description: String(f.description || ""),
                bounding_box: null,
              }));
            }
          }
        } catch {
          // keep the checklist fallback
        }
      }

      // Best-effort persist (works when evidence_file_id is a real UUID).
      let analysisId: string | null = null;
      try {
        const { data: inserted, error: insertErr } = await supabaseClient
          .from("photo_analyses")
          .insert({
            organisation_id: organisationId,
            evidence_file_id: evidenceFileId,
            evidence_record_id: evidenceRecordId,
            analysis_type: type,
            findings,
            analyzed_at: new Date().toISOString(),
            created_by: user.id,
          })
          .select("id")
          .single();
        if (!insertErr && inserted) analysisId = inserted.id;
      } catch {
        // persist failure should not block returning findings
      }

      return new Response(JSON.stringify({ success: true, analysisId, analysisType: type, findings }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /list — list analyses for an organisation / evidence file
    if (req.method === "GET" && path === "list") {
      const organisationId = url.searchParams.get("organisationId");
      const evidenceFileId = url.searchParams.get("evidenceFileId");
      const evidenceRecordId = url.searchParams.get("evidenceRecordId");

      let query = supabaseClient
        .from("photo_analyses")
        .select("*")
        .is("archived_at", null)
        .order("analyzed_at", { ascending: false });

      if (organisationId) query = query.eq("organisation_id", organisationId);
      if (evidenceFileId) query = query.eq("evidence_file_id", evidenceFileId);
      if (evidenceRecordId) query = query.eq("evidence_record_id", evidenceRecordId);

      const { data, error } = await query;
      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ analyses: data || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /review — mark reviewed / dismissed
    if (req.method === "POST" && path === "review") {
      const body = await req.json();
      const { analysisId, dismissed = false } = body;
      if (!analysisId) {
        return new Response(JSON.stringify({ error: "analysisId is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const updates: Record<string, unknown> = { reviewed_by_human: true };
      if (dismissed) updates.dismissed = true;

      const { error } = await supabaseClient
        .from("photo_analyses")
        .update(updates)
        .eq("id", analysisId);

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message || "Server error" }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
