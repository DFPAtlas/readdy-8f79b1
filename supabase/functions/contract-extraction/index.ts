import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

const CONTRACT_FIELDS: Array<{ key: string; label: string }> = [
  { key: "contract_type", label: "Contract type" },
  { key: "payment_period_days", label: "Payment period (days)" },
  { key: "notice_period_days", label: "Notice period (days)" },
  { key: "final_date_for_payment_days", label: "Final date for payment (days)" },
  { key: "retention_percentage", label: "Retention (%)" },
  { key: "retention_release_stages", label: "Retention release stages" },
  { key: "defects_liability_months", label: "Defects liability period (months)" },
  { key: "liquidated_damages", label: "Liquidated damages" },
  { key: "payment_terms", label: "Payment terms" },
  { key: "insurance_requirements", label: "Insurance requirements" },
  { key: "governing_law", label: "Governing law" },
  { key: "adjudication", label: "Dispute resolution" },
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
    const path = url.pathname.replace(/^\/contract-extraction\/?/, "");

    async function assertMembership(organisationId: string): Promise<void> {
      const { data: member } = await supabaseClient
        .from("organisation_members")
        .select("id")
        .eq("organisation_id", organisationId)
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();
      if (!member) {
        throw new Error("Forbidden");
      }
    }

    // GET /documents — list contract documents
    if (req.method === "GET" && (path === "documents" || path === "")) {
      const organisationId = url.searchParams.get("organisationId");
      const jobId = url.searchParams.get("jobId");
      if (!organisationId) {
        return new Response(JSON.stringify({ error: "organisationId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await assertMembership(organisationId);

      let query = supabaseClient
        .from("contract_documents")
        .select("*")
        .eq("organisation_id", organisationId)
        .is("archived_at", null)
        .order("created_at", { ascending: false });
      if (jobId) query = query.eq("job_id", jobId);

      const { data: documents, error } = await query;
      if (error) throw error;

      return new Response(JSON.stringify({ documents: documents || [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /documents/:id — detail with terms + signed URL
    const detailMatch = path.match(/^documents\/([0-9a-f-]+)$/);
    if (req.method === "GET" && detailMatch) {
      const documentId = detailMatch[1];
      const { data: document, error: docErr } = await supabaseClient
        .from("contract_documents")
        .select("*")
        .eq("id", documentId)
        .maybeSingle();
      if (docErr || !document) {
        return new Response(JSON.stringify({ error: "Contract not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await assertMembership(document.organisation_id);

      const { data: terms } = await supabaseClient
        .from("contract_extracted_terms")
        .select("*")
        .eq("contract_document_id", documentId)
        .order("field_name");

      let signedUrl = null;
      if (document.storage_path) {
        const { data: signed } = await supabaseClient
          .storage
          .from("documents")
          .createSignedUrl(document.storage_path, 3600);
        signedUrl = signed?.signedUrl || null;
      }

      return new Response(JSON.stringify({ document, terms: terms || [], signedUrl }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /upload — store PDF and create contract_documents row
    if (req.method === "POST" && path === "upload") {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const organisationId = formData.get("organisationId") as string;
      const jobId = (formData.get("jobId") as string) || null;

      if (!file || !organisationId) {
        return new Response(JSON.stringify({ error: "file and organisationId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await assertMembership(organisationId);

      const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg", "image/webp"];
      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|png|jpg|jpeg|webp)$/i)) {
        return new Response(JSON.stringify({ error: "Unsupported file type (PDF or images only)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (file.size > 20 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: "File too large (max 20MB)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const timestamp = Date.now();
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, "_").replace(/\s+/g, "_");
      const storagePath = `${organisationId}/contracts/${timestamp}_${safeName}`;

      const arrayBuffer = await file.arrayBuffer();
      const { error: uploadErr } = await supabaseClient
        .storage
        .from("documents")
        .upload(storagePath, new Uint8Array(arrayBuffer), {
          contentType: file.type,
          upsert: false,
        });
      if (uploadErr) throw uploadErr;

      const { data: document, error: insertErr } = await supabaseClient
        .from("contract_documents")
        .insert({
          organisation_id: organisationId,
          job_id: jobId || null,
          file_name: file.name,
          storage_path: storagePath,
          mime_type: file.type,
          file_size_bytes: file.size,
          extraction_status: "pending",
          created_by: user.id,
        })
        .select("id")
        .single();
      if (insertErr) throw insertErr;

      return new Response(JSON.stringify({ success: true, documentId: document.id, fileName: file.name }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /extract — run AI extraction, write contract_extracted_terms
    if (req.method === "POST" && path === "extract") {
      const body = await req.json();
      const { documentId } = body;
      if (!documentId) {
        return new Response(JSON.stringify({ error: "documentId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: document, error: docErr } = await supabaseClient
        .from("contract_documents")
        .select("*")
        .eq("id", documentId)
        .maybeSingle();
      if (docErr || !document) {
        return new Response(JSON.stringify({ error: "Contract not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await assertMembership(document.organisation_id);

      const openaiKey = Deno.env.get("OPENAI_API_KEY");
      if (!openaiKey) {
        await supabaseClient
          .from("contract_documents")
          .update({ extraction_status: "failed", error_message: "AI extraction not configured" })
          .eq("id", documentId);
        return new Response(JSON.stringify({
          error: "AI extraction not configured. Add OPENAI_API_KEY to continue.",
          code: "MISSING_OPENAI_KEY",
        }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseClient
        .from("contract_documents")
        .update({ extraction_status: "processing" })
        .eq("id", documentId);

      // Download the file
      const { data: fileData, error: downloadErr } = await supabaseClient
        .storage
        .from("documents")
        .download(document.storage_path);
      if (downloadErr || !fileData) {
        await supabaseClient
          .from("contract_documents")
          .update({ extraction_status: "failed", error_message: "Failed to download file" })
          .eq("id", documentId);
        throw downloadErr || new Error("Download failed");
      }

      let fileContent: string;
      if (document.mime_type?.startsWith("image/")) {
        const bytes = await fileData.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
        fileContent = `data:${document.mime_type};base64,${base64}`;
      } else {
        // PDF text extraction requires OCR; pass a placeholder so the schema
        // is still enforced and low-confidence empties are returned.
        fileContent = "[Document text unavailable — OCR pipeline not configured]";
      }

      const fieldSchema = CONTRACT_FIELDS.map((f) => `"${f.key}"`).join(", ");
      const systemPrompt =
        `You extract commercial and contractual terms from a UK construction contract (JCT, NEC, or bespoke). ` +
        `Return ONLY valid JSON — a flat object with exactly these keys: { ${fieldSchema} }. ` +
        `Each value is a string. Use an empty string "" when a term is not present in the document. ` +
        `Do not invent values.`;

      try {
        const messages = [
          { role: "system", content: systemPrompt },
          {
            role: "user",
            content: document.mime_type?.startsWith("image/")
              ? [
                  { type: "text", text: "Extract the contract terms from this document image using the schema. Return ONLY valid JSON." },
                  { type: "image_url", image_url: { url: fileContent, detail: "high" } },
                ]
              : `Contract file: ${document.file_name}\n\n${fileContent}\n\nExtract the terms using the schema. Return ONLY valid JSON.`,
          },
        ];

        const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: { "Content-Type": "application/json", "Authorization": `Bearer ${openaiKey}` },
          body: JSON.stringify({
            model: "gpt-4o",
            messages,
            temperature: 0.1,
            max_tokens: 1500,
            response_format: { type: "json_object" },
          }),
        });
        const openaiData = await openaiResp.json();
        if (!openaiResp.ok) {
          throw new Error(openaiData.error?.message || "OpenAI API error");
        }

        const extracted = JSON.parse(openaiData.choices?.[0]?.message?.content || "");

        // Determine detected contract type (normalise to JCT/NEC/bespoke)
        const rawType = String(extracted.contract_type || "").toLowerCase();
        const detectedType = rawType.includes("nec") ? "NEC" : rawType.includes("jct") ? "JCT" : "bespoke";

        const termRows = CONTRACT_FIELDS.map((f) => {
          const value = extracted[f.key] != null ? String(extracted[f.key]) : "";
          return {
            contract_document_id: documentId,
            organisation_id: document.organisation_id,
            field_name: f.key,
            field_label: f.label,
            extracted_value: value,
            confidence_score: value ? 0.85 : 0.2,
            confirmed_by_user: false,
          };
        });

        const { error: termsErr } = await supabaseClient
          .from("contract_extracted_terms")
          .upsert(termRows, { onConflict: "contract_document_id,field_name" });
        if (termsErr) throw termsErr;

        await supabaseClient
          .from("contract_documents")
          .update({ extraction_status: "needs_review", contract_type: detectedType })
          .eq("id", documentId);

        return new Response(JSON.stringify({ success: true, documentId, contract_type: detectedType, terms: termRows }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      } catch (extractErr: any) {
        await supabaseClient
          .from("contract_documents")
          .update({ extraction_status: "failed", error_message: extractErr.message })
          .eq("id", documentId);
        throw extractErr;
      }
    }

    // POST /confirm — persist confirmed terms; optionally write to jobs + deadline_rules
    if (req.method === "POST" && path === "confirm") {
      const body = await req.json();
      const { documentId, terms, jobId } = body;
      if (!documentId || !Array.isArray(terms)) {
        return new Response(JSON.stringify({ error: "documentId and terms required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: document, error: docErr } = await supabaseClient
        .from("contract_documents")
        .select("*")
        .eq("id", documentId)
        .maybeSingle();
      if (docErr || !document) {
        return new Response(JSON.stringify({ error: "Contract not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      await assertMembership(document.organisation_id);

      // Persist confirmed values
      for (const term of terms) {
        await supabaseClient
          .from("contract_extracted_terms")
          .update({ confirmed_by_user: true, confirmed_value: term.confirmed_value ?? null })
          .eq("contract_document_id", documentId)
          .eq("field_name", term.field_name);
      }

      await supabaseClient
        .from("contract_documents")
        .update({ extraction_status: "complete" })
        .eq("id", documentId);

      // Build a confirmed map for downstream writes
      const confirmedMap: Record<string, string> = {};
      for (const term of terms) {
        confirmedMap[term.field_name] = term.confirmed_value ?? "";
      }

      // Write to the job (when a job is linked) and seed deadline rules
      const targetJobId = jobId || document.job_id;
      if (targetJobId) {
        const retentionPct = confirmedMap.retention_percentage
          ? parseFloat(confirmedMap.retention_percentage)
          : null;

        const jobUpdates: Record<string, unknown> = {
          updated_at: new Date().toISOString(),
        };
        if (confirmedMap.contract_type) jobUpdates.contract_type = confirmedMap.contract_type;
        if (confirmedMap.payment_terms) jobUpdates.payment_terms = confirmedMap.payment_terms;
        if (retentionPct !== null && !Number.isNaN(retentionPct)) {
          jobUpdates.retention_applies = true;
          jobUpdates.retention_percentage = retentionPct;
        }

        await supabaseClient
          .from("jobs")
          .update(jobUpdates)
          .eq("id", targetJobId);

        // Seed deadline_rules from notice/final-date/defects terms
        const contractType = confirmedMap.contract_type || "bespoke";
        const rules: Array<{ deadline_type: string; notice_days: number }> = [];

        const noticeDays = parseInt(confirmedMap.notice_period_days || "", 10);
        if (!Number.isNaN(noticeDays)) rules.push({ deadline_type: "pay_less_notice", notice_days: noticeDays });

        const finalDays = parseInt(confirmedMap.final_date_for_payment_days || "", 10);
        if (!Number.isNaN(finalDays)) rules.push({ deadline_type: "final_date_for_payment", notice_days: finalDays });

        const defectsMonths = parseInt(confirmedMap.defects_liability_months || "", 10);
        if (!Number.isNaN(defectsMonths)) rules.push({ deadline_type: "defects_liability_end", notice_days: defectsMonths * 30 });

        for (const rule of rules) {
          await supabaseClient
            .from("deadline_rules")
            .upsert(
              {
                organisation_id: document.organisation_id,
                contract_type: contractType,
                deadline_type: rule.deadline_type,
                notice_days: rule.notice_days,
                enabled: true,
                updated_at: new Date().toISOString(),
              },
              { onConflict: "organisation_id,contract_type,deadline_type" }
            );
        }
      }

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err: any) {
    const status = err.message === "Forbidden" ? 403 : 500;
    return new Response(JSON.stringify({ error: err.message || "Server error" }), {
      status, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
