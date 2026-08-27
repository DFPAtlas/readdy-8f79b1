import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const COMPANIES_HOUSE_API_KEY = Deno.env.get("COMPANIES_HOUSE_API_KEY") || "";

const CH_BASE = "https://api.company-information.service.gov.uk";

const corsHeaders = { "Content-Type": "application/json" };

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: corsHeaders });
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !user) return new Response(JSON.stringify({ error: "Invalid token" }), { status: 401, headers: corsHeaders });

    const url = new URL(req.url);
    const path = url.pathname.split("/").pop();

    // --- SEARCH: Search Companies House ---
    if (path === "search" && req.method === "GET") {
      const query = url.searchParams.get("q");
      if (!query || query.length < 2) {
        return new Response(JSON.stringify({ error: "Query must be at least 2 characters" }), { status: 400, headers: corsHeaders });
      }

      if (!COMPANIES_HOUSE_API_KEY) {
        return new Response(JSON.stringify({ error: "Companies House API not configured" }), { status: 503, headers: corsHeaders });
      }

      const startIndex = parseInt(url.searchParams.get("start") || "0");
      const resp = await fetch(
        `${CH_BASE}/search/companies?q=${encodeURIComponent(query)}&items_per_page=10&start_index=${startIndex}`,
        { headers: { Authorization: `Basic ${btoa(COMPANIES_HOUSE_API_KEY + ":")}` } }
      );

      if (!resp.ok) {
        return new Response(JSON.stringify({ error: `Companies House API error: ${resp.status}` }), { status: resp.status, headers: corsHeaders });
      }

      const data = await resp.json();
      return new Response(JSON.stringify({
        items: (data.items || []).map((item: any) => ({
          company_number: item.company_number,
          company_name: item.title || item.company_name,
          company_status: item.company_status,
          address: item.address,
          date_of_creation: item.date_of_creation,
          company_type: item.company_type,
          description: item.description,
        })),
        total: data.total_results || 0,
      }), { headers: corsHeaders });
    }

    // --- GET_COMPANY: Get detailed company info ---
    if (path === "company" && req.method === "GET") {
      const companyNumber = url.searchParams.get("number");
      if (!companyNumber) {
        return new Response(JSON.stringify({ error: "company number required" }), { status: 400, headers: corsHeaders });
      }

      if (!COMPANIES_HOUSE_API_KEY) {
        return new Response(JSON.stringify({ error: "Companies House API not configured" }), { status: 503, headers: corsHeaders });
      }

      // Check cache first
      const { data: cached } = await supabase
        .from("integration_companies_house_cache")
        .select("*")
        .eq("company_number", companyNumber)
        .gt("expires_at", new Date().toISOString())
        .maybeSingle();

      if (cached) {
        return new Response(JSON.stringify({ company: cached, from_cache: true }), { headers: corsHeaders });
      }

      const resp = await fetch(`${CH_BASE}/company/${encodeURIComponent(companyNumber)}`, {
        headers: { Authorization: `Basic ${btoa(COMPANIES_HOUSE_API_KEY + ":")}` },
      });

      if (!resp.ok) {
        return new Response(JSON.stringify({ error: `Companies House API error: ${resp.status}` }), { status: resp.status, headers: corsHeaders });
      }

      const data = await resp.json();

      // Cache the result
      await supabase.from("integration_companies_house_cache").upsert({
        company_number: companyNumber,
        company_name: data.company_name,
        company_status: data.company_status,
        registered_address: data.registered_office_address || null,
        sic_codes: data.sic_codes || [],
        incorporation_date: data.date_of_creation,
        data_json: data,
        cached_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      }, { onConflict: "company_number" });

      return new Response(JSON.stringify({
        company: {
          company_number: companyNumber,
          company_name: data.company_name,
          company_status: data.company_status,
          registered_address: data.registered_office_address,
          sic_codes: data.sic_codes,
          incorporation_date: data.date_of_creation,
          company_type: data.type,
          jurisdiction: data.jurisdiction,
          accounts: data.accounts,
          confirmation_statement: data.confirmation_statement,
        },
        from_cache: false,
      }), { headers: corsHeaders });
    }

    return new Response(JSON.stringify({ error: "Unknown endpoint" }), { status: 404, headers: corsHeaders });
  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message || "Internal error" }), { status: 500, headers: corsHeaders });
  }
});
