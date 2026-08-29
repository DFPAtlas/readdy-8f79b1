import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// Deterministic knowledge base used when no AI key is configured.
const HAZARD_KB: Record<string, { hazards: string[]; controls: string[] }> = {
  "Working at height": {
    hazards: ["Falls from ladders, scaffolds or roof edges", "Falling tools or materials", "Fragile or unstable surfaces"],
    controls: ["Use podium steps or scaffold with guardrails and toe boards", "Maintain three points of contact on ladders", "Inspect access equipment before each use", "Keep a clear exclusion zone below the work area"],
  },
  "Manual handling": {
    hazards: ["Musculoskeletal injury from lifting", "Repetitive strain", "Dropped or shifting loads"],
    controls: ["Plan lifts and use mechanical aids (trolleys, hoists)", "Team lift items over 25kg", "Assess load weight and route before moving", "Take regular breaks and rotate tasks"],
  },
  "Electrical": {
    hazards: ["Electric shock", "Contact with live conductors", "Fire from faulty equipment"],
    controls: ["Isolate and lock off circuits before work", "Use 110V equipment where possible", "PAT test all portable tools", "Competent electrician only for live work"],
  },
  "Fire / hot works": {
    hazards: ["Fire from sparks or heat", "Smoke inhalation", "Ignition of combustible materials"],
    controls: ["Hot works permit in place", "Fire watch for 60 minutes after work", "Remove or shield combustibles", "Fire extinguishers available and maintained"],
  },
  "Asbestos": {
    hazards: ["Asbestos fibre release and inhalation"],
    controls: ["Check asbestos register or survey before starting", "Stop work and report if suspect material is found", "Use a licensed contractor for removal", "Do not disturb suspect materials"],
  },
  "Dust / silica": {
    hazards: ["Silica dust inhalation", "Respiratory irritation", "Long-term lung damage"],
    controls: ["Use M-class dust extraction", "Wet cutting where possible", "Wear FFP3 respirators", "Minimise cutting of concrete and brick"],
  },
  "Noise / vibration": {
    hazards: ["Hearing damage from sustained noise", "Hand-arm vibration syndrome"],
    controls: ["Use low-vibration tools", "Wear hearing protection in noisy areas", "Limit exposure time", "Maintain tools to reduce noise and vibration"],
  },
  "Slips, trips & falls": {
    hazards: ["Slips on wet or uneven surfaces", "Trips over cables and materials", "Falls on the same level"],
    controls: ["Keep walkways clear and tidy", "Manage cables with ramps or routing", "Maintain good housekeeping at all times", "Sign and light any changes in level"],
  },
  "Plant & machinery": {
    hazards: ["Contact with moving parts", "Vehicle or plant collisions", "Crush injuries"],
    controls: ["Competent and authorised operators only", "Daily pre-use checks", "Segregate plant from pedestrians", "Use a banksman for reversing operations"],
  },
  "Excavations": {
    hazards: ["Ground collapse", "Fall into excavation", "Strike of buried services"],
    controls: ["CAT scan and utility plans before digging", "Shoring or battering as required", "Edge protection and barriers", "Inspect before each shift"],
  },
  "Confined spaces": {
    hazards: ["Oxygen deficiency", "Toxic gas build-up", "Entrapment"],
    controls: ["Avoid entry where possible", "Atmosphere testing before and during entry", "Rescue plan and trained personnel", "Permit to work required"],
  },
  "Lifting operations": {
    hazards: ["Load collapse or swing", "Crane or hoist failure", "Crush injuries"],
    controls: ["Lifting plan and competent slinger or signaller", "Check lifting accessories and certificates", "Exclusion zone around the lift", "Never work under a suspended load"],
  },
  "COSHH (substances)": {
    hazards: ["Chemical burns or skin irritation", "Fume inhalation", "Environmental contamination"],
    controls: ["Review COSHH assessment before use", "Use correct PPE (gloves, goggles)", "Store substances securely and labelled", "Keep a spill kit available"],
  },
  "Welfare & first aid": {
    hazards: ["Inadequate welfare facilities", "Delayed first aid response"],
    controls: ["Welfare facilities available on site", "Trained first aider on site", "First aid kit stocked and accessible", "Emergency procedures displayed"],
  },
  "Public & client safety": {
    hazards: ["Access by unauthorised persons", "Falling materials onto the public", "Trip hazards for visitors"],
    controls: ["Secure site boundary and signage", "Protect work areas from public access", "Escort visitors on site", "Remove or cover hazards at end of day"],
  },
  "Services / utilities": {
    hazards: ["Strike of gas, water or electric services", "Loss of supply"],
    controls: ["Obtain utility plans before work", "Hand-dig trial holes near services", "Follow safe digging practices", "Report any damage immediately"],
  },
};

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
    const path = url.pathname.replace(/^\/rams-generator\/?/, "");

    // POST /generate — draft a RAMS from title + scope + hazard categories
    if (req.method === "POST" && path === "generate") {
      const body = await req.json();
      const { title, scopeSummary, hazardCategories = [] } = body;

      if (!title || !Array.isArray(hazardCategories) || hazardCategories.length === 0) {
        return new Response(JSON.stringify({ error: "title and hazardCategories are required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const hazards: string[] = [];
      const controls: string[] = [];
      for (const cat of hazardCategories) {
        const kb = HAZARD_KB[cat];
        if (kb) {
          hazards.push(...kb.hazards);
          controls.push(...kb.controls);
        }
      }

      let result = {
        title,
        hazards: [...new Set(hazards)],
        controlMeasures: [...new Set(controls)],
      };

      // Optional AI tailoring when a key is configured; fall back to the KB on any failure.
      const openaiKey = Deno.env.get("OPENAI_API_KEY");
      if (openaiKey) {
        try {
          const prompt =
            `You are a UK construction health & safety advisor. Write a Risk Assessment & Method Statement (RAMS) for this task: "${title}". ` +
            `Scope and activities: ${scopeSummary || "Not specified"}. Identified hazard categories: ${hazardCategories.join(", ")}. ` +
            `Return ONLY valid JSON with two arrays: {"hazards": ["..."], "controlMeasures": ["..."]}. Hazards and controls must be specific, realistic and proportionate.`;

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
            if (Array.isArray(parsed.hazards) && Array.isArray(parsed.controlMeasures)) {
              result = { title, hazards: parsed.hazards, controlMeasures: parsed.controlMeasures };
            }
          }
        } catch {
          // keep the knowledge-base fallback
        }
      }

      return new Response(JSON.stringify({ success: true, ...result }), {
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
