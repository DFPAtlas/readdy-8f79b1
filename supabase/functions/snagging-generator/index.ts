import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

type Severity = "low" | "medium" | "high" | "critical";

interface SnagDraft {
  title: string;
  description: string;
  area: string;
  severity: Severity;
  trade: string;
}

// Deterministic trade knowledge base — the fallback when no AI key is configured.
const TRADE_SNAG_KB: Record<string, SnagDraft[]> = {
  "General building": [
    { title: "Uneven mortar joints", description: "Joint thickness and tooling inconsistent with the existing gauge.", area: "Elevations", severity: "medium", trade: "General building" },
    { title: "Skirting gap at floor", description: "Gap between skirting and finished floor requires filling and caulking.", area: "Throughout", severity: "low", trade: "General building" },
    { title: "Plaster crack above opening", description: "Hairline crack above doorway, rake out and re-fill before decoration.", area: "Openings", severity: "medium", trade: "General building" },
    { title: "Exposed screw heads on joinery", description: "Screw heads visible on finished joinery, fill, sand and touch up.", area: "Throughout", severity: "low", trade: "General building" },
  ],
  "Electrical": [
    { title: "Socket faceplate not level", description: "Faceplate out of level, re-seat and align.", area: "Rooms", severity: "low", trade: "Electrical" },
    { title: "Loose switch plate", description: "Switch plate loose to wall, tighten fixings and reseat.", area: "Rooms", severity: "low", trade: "Electrical" },
    { title: "Missing blank plate", description: "Unused back box left without a blank plate.", area: "Walls", severity: "low", trade: "Electrical" },
    { title: "Exposed wiring above rose", description: "Wiring exposed above ceiling rose, terminate and cover to regs.", area: "Ceilings", severity: "high", trade: "Electrical" },
    { title: "Data outlet not terminated", description: "Outlet not terminated or tested.", area: "Comms areas", severity: "medium", trade: "Electrical" },
  ],
  "Plumbing": [
    { title: "Trap leaking", description: "Water weeping from trap connection, re-tighten and reseal.", area: "Under sinks", severity: "high", trade: "Plumbing" },
    { title: "Uneven silicon beading", description: "Beading uneven with gaps, rake out and re-bead.", area: "Wet areas", severity: "low", trade: "Plumbing" },
    { title: "Tap handles misaligned", description: "Handles not aligned when closed.", area: "Basins", severity: "low", trade: "Plumbing" },
    { title: "Missing waste pipe clip", description: "Waste pipe unsupported, fit clip to prevent sag.", area: "Under sinks", severity: "low", trade: "Plumbing" },
  ],
  "Heating and gas": [
    { title: "Flue bracket loose", description: "Flue support bracket needs tightening to spec.", area: "Boiler", severity: "medium", trade: "Heating and gas" },
    { title: "Radiator valve weeping", description: "Slight weep at radiator valve, re-tighten and check.", area: "Radiators", severity: "medium", trade: "Heating and gas" },
    { title: "Thermostat not commissioned", description: "Programmer not set up or handed over.", area: "Controls", severity: "low", trade: "Heating and gas" },
  ],
  "Carpentry": [
    { title: "Door sticks on closing", description: "Door catches on frame, ease and re-touch.", area: "Doors", severity: "medium", trade: "Carpentry" },
    { title: "Architrave mitre gaps", description: "Mitres open, fill, sand and caulk.", area: "Openings", severity: "low", trade: "Carpentry" },
    { title: "Worktop joint not flush", description: "Joint between worktop lengths not flush.", area: "Kitchen", severity: "medium", trade: "Carpentry" },
    { title: "Drawer misaligned", description: "Drawer face out of alignment, adjust runners.", area: "Joinery", severity: "low", trade: "Carpentry" },
  ],
  "Roofing": [
    { title: "Tile alignment uneven", description: "Courses out of alignment, re-bed and align tiles.", area: "Main roof", severity: "medium", trade: "Roofing" },
    { title: "Flashing gap at abutment", description: "Lead flashing not dressed correctly, risk of ingress.", area: "Abutments", severity: "high", trade: "Roofing" },
    { title: "Ridge pointing cracked", description: "Ridge mortar cracked, re-point.", area: "Ridge", severity: "medium", trade: "Roofing" },
  ],
  "Plastering": [
    { title: "Uneven skim around openings", description: "Skim ripples visible in raking light.", area: "Walls", severity: "low", trade: "Plastering" },
    { title: "Crack at board joint", description: "Crack opening at board joint, tape and re-fill.", area: "Ceilings", severity: "medium", trade: "Plastering" },
    { title: "Scratches in finish", description: "Trowel scratches visible, re-skim affected area.", area: "Walls", severity: "low", trade: "Plastering" },
  ],
  "Decorating": [
    { title: "Paint runs on skirtings", description: "Runs visible on skirtings, sand and repaint.", area: "Skirtings", severity: "low", trade: "Decorating" },
    { title: "Uneven cutting-in", description: "Ceiling line not crisp, recut and touch up.", area: "Ceilings", severity: "low", trade: "Decorating" },
    { title: "Missed patch behind radiator", description: "Area behind radiator not decorated.", area: "Walls", severity: "low", trade: "Decorating" },
    { title: "Colour mismatch on feature wall", description: "Wall appears a different batch/colour.", area: "Feature walls", severity: "medium", trade: "Decorating" },
  ],
  "Groundworks": [
    { title: "Paving lippage", description: "Flag lippage at threshold, re-bed to remove trip.", area: "Paths", severity: "low", trade: "Groundworks" },
    { title: "Manhole cover not level", description: "Cover frame sits proud, re-seat and level.", area: "Driveways", severity: "medium", trade: "Groundworks" },
    { title: "Drainage fall insufficient", description: "Standing water suggests incorrect fall.", area: "Drainage", severity: "high", trade: "Groundworks" },
  ],
  "Tiling": [
    { title: "Tile lippage", description: "Adjacent tiles out of plane, re-bed affected tiles.", area: "Wet areas", severity: "low", trade: "Tiling" },
    { title: "Grout gaps in corners", description: "Corner grout missing or cracked, re-grout and seal.", area: "Corners", severity: "low", trade: "Tiling" },
    { title: "Chipped cut edge", description: "Cut edge chipped at reveal, replace or trim.", area: "Reveals", severity: "low", trade: "Tiling" },
  ],
};

const GENERIC_SNAGS: SnagDraft[] = [
  { title: "Protection damaged", description: "Finished surface not protected, clean and make good.", area: "Throughout", severity: "low", trade: "Multi-trade" },
  { title: "Cleanliness of works", description: "Debris and offcuts not cleared, tidy before handover.", area: "Throughout", severity: "low", trade: "Multi-trade" },
  { title: "Fixing not flush", description: "Fixing proud of surface, re-seat flush.", area: "Throughout", severity: "low", trade: "Multi-trade" },
];

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
    const path = url.pathname.replace(/^\/snagging-generator\/?/, "");

    if (req.method === "POST" && path === "generate") {
      const body = await req.json();
      const { trade = "", scopeSummary, count = 5 } = body;

      if (!trade) {
        return new Response(JSON.stringify({ error: "trade is required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const kb = TRADE_SNAG_KB[trade] ?? GENERIC_SNAGS;
      let snags: SnagDraft[] = kb.slice(0, Math.max(1, Math.min(Number(count) || 5, 10)));

      // Optional AI tailoring when a key is configured; fall back to the KB on failure.
      const openaiKey = Deno.env.get("OPENAI_API_KEY");
      if (openaiKey) {
        try {
          const prompt =
            `You are a UK construction quality inspector. Generate a snagging and defects list for the trade "${trade}". ` +
            `Job scope: ${scopeSummary || "Not specified"}. ` +
            `Return ONLY valid JSON: {"snags":[{"title":"...","description":"...","area":"...","severity":"low|medium|high|critical","trade":"${trade}"}]}. ` +
            `Provide up to ${count} realistic, specific, actionable items. Distinguish minor cosmetic snags from genuine defects.`;

          const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [{ role: "user", content: prompt }],
              temperature: 0.4,
              max_tokens: 1500,
              response_format: { type: "json_object" },
            }),
          });
          const openaiData = await openaiResp.json();
          if (openaiResp.ok) {
            const parsed = JSON.parse(openaiData.choices?.[0]?.message?.content || "");
            if (Array.isArray(parsed.snags)) {
              snags = parsed.snags.map((s: any) => ({
                title: String(s.title || "Snag item"),
                description: String(s.description || ""),
                area: String(s.area || ""),
                severity: (["low", "medium", "high", "critical"].includes(s.severity) ? s.severity : "medium") as Severity,
                trade: String(s.trade || trade),
              }));
            }
          }
        } catch {
          // keep the knowledge-base fallback
        }
      }

      return new Response(JSON.stringify({ success: true, trade, snags }), {
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
