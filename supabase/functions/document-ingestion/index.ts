import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
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
    const path = url.pathname.replace(/^\/document-ingestion\/?/, "");

    // GET /jobs — list ingestion jobs for org
    if (req.method === "GET" && (path === "jobs" || path === "")) {
      const organisationId = url.searchParams.get("organisationId");
      if (!organisationId) {
        return new Response(JSON.stringify({ error: "organisationId required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify org membership
      const { data: member } = await supabaseClient
        .from("organisation_members")
        .select("id")
        .eq("organisation_id", organisationId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!member) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: jobs, error } = await supabaseClient
        .from("document_ingestion_jobs")
        .select("*")
        .eq("organisation_id", organisationId)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // For jobs with extractions, fetch extraction data too
      const jobsWithExtractions = await Promise.all(
        (jobs || []).map(async (job) => {
          const { data: extractions } = await supabaseClient
            .from("document_extractions")
            .select("id, template_name, status")
            .eq("ingestion_job_id", job.id);
          return { ...job, extractions: extractions || [] };
        })
      );

      return new Response(JSON.stringify({ jobs: jobsWithExtractions }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // GET /jobs/:id — get job detail with extraction fields
    const jobDetailMatch = path.match(/^jobs\/(\d+)$/);
    if (req.method === "GET" && jobDetailMatch) {
      const jobId = parseInt(jobDetailMatch[1]);

      const { data: job, error: jobErr } = await supabaseClient
        .from("document_ingestion_jobs")
        .select("*")
        .eq("id", jobId)
        .maybeSingle();

      if (jobErr || !job) {
        return new Response(JSON.stringify({ error: "Job not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify org membership
      const { data: member } = await supabaseClient
        .from("organisation_members")
        .select("id")
        .eq("organisation_id", job.organisation_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!member) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get extractions with fields
      const { data: extractions } = await supabaseClient
        .from("document_extractions")
        .select("*")
        .eq("ingestion_job_id", jobId);

      const extractionsWithFields = await Promise.all(
        (extractions || []).map(async (ext) => {
          const { data: fields } = await supabaseClient
            .from("document_extracted_fields")
            .select("*")
            .eq("extraction_id", ext.id)
            .order("field_name");
          return { ...ext, fields: fields || [] };
        })
      );

      // Get signed URL for document preview
      let signedUrl = null;
      if (job.storage_path) {
        const { data: signed } = await supabaseClient
          .storage
          .from("documents")
          .createSignedUrl(job.storage_path, 3600);
        signedUrl = signed?.signedUrl || null;
      }

      return new Response(JSON.stringify({
        job,
        extractions: extractionsWithFields,
        signedUrl,
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /upload — upload document and create ingestion job
    if (req.method === "POST" && path === "upload") {
      const formData = await req.formData();
      const file = formData.get("file") as File | null;
      const organisationId = formData.get("organisationId") as string;
      const documentType = formData.get("documentType") as string;
      const jobId = formData.get("jobId") as string || null;
      const metadataStr = formData.get("metadata") as string || "";

      if (!file || !organisationId || !documentType) {
        return new Response(JSON.stringify({ error: "file, organisationId, and documentType required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify org membership
      const { data: member } = await supabaseClient
        .from("organisation_members")
        .select("id")
        .eq("organisation_id", organisationId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!member) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate file type
      const allowedTypes = [
        "application/pdf",
        "image/png", "image/jpeg", "image/jpg", "image/webp",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/msword",
        "application/vnd.ms-excel",
      ];
      if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|png|jpg|jpeg|webp|docx|xlsx|doc|xls)$/i)) {
        return new Response(JSON.stringify({ error: "Unsupported file type" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Max 20MB
      if (file.size > 20 * 1024 * 1024) {
        return new Response(JSON.stringify({ error: "File too large (max 20MB)" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const metadata = JSON.parse(metadataStr);
      const timestamp = Date.now();
      const safeName = file.name.toLowerCase().replace(/[^a-z0-9._-]/g, "_").replace(/\s+/g, "_");
      const storagePath = `${organisationId}/${timestamp}_${safeName}`;

      // Upload to private storage
      const arrayBuffer = await file.arrayBuffer();
      const { error: uploadErr } = await supabaseClient
        .storage
        .from("documents")
        .upload(storagePath, new Uint8Array(arrayBuffer), {
          contentType: file.type,
          upsert: false,
        });

      if (uploadErr) throw uploadErr;

      // Generate simple checksum
      const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const checksum = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

      // Create ingestion job
      const { data: job, error: insertErr } = await supabaseClient
        .from("document_ingestion_jobs")
        .insert({
          organisation_id: organisationId,
          user_id: user.id,
          job_id: jobId || null,
          document_name: file.name,
          document_type: documentType,
          storage_path: storagePath,
          file_size_bytes: file.size,
          mime_type: file.type,
          checksum,
          status: "queued",
          metadata,
        })
        .select("id")
        .single();

      if (insertErr) throw insertErr;

      return new Response(JSON.stringify({
        success: true,
        jobId: job.id,
        storagePath,
        message: "Document uploaded. Ingestion queued.",
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /extract — trigger AI extraction for a job
    if (req.method === "POST" && path === "extract") {
      const body = await req.json();
      const { jobId, templateName } = body;

      if (!jobId || !templateName) {
        return new Response(JSON.stringify({ error: "jobId and templateName required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get job
      const { data: job, error: jobErr } = await supabaseClient
        .from("document_ingestion_jobs")
        .select("*")
        .eq("id", jobId)
        .maybeSingle();

      if (jobErr || !job) {
        return new Response(JSON.stringify({ error: "Job not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify org membership
      const { data: member } = await supabaseClient
        .from("organisation_members")
        .select("id")
        .eq("organisation_id", job.organisation_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!member) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const openaiKey = Deno.env.get("OPENAI_API_KEY");
      if (!openaiKey) {
        return new Response(JSON.stringify({
          error: "AI extraction not configured. Add OPENAI_API_KEY to continue.",
          code: "MISSING_OPENAI_KEY",
        }), {
          status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update job status
      await supabaseClient
        .from("document_ingestion_jobs")
        .update({ status: "scanning" })
        .eq("id", jobId);

      // Download the file
      const { data: fileData, error: downloadErr } = await supabaseClient
        .storage
        .from("documents")
        .download(job.storage_path);

      if (downloadErr || !fileData) {
        await supabaseClient
          .from("document_ingestion_jobs")
          .update({ status: "failed", error_message: "Failed to download file" })
          .eq("id", jobId);
        throw downloadErr || new Error("Download failed");
      }

      // For images, convert to base64 for vision API
      let fileContent: string;
      if (job.mime_type?.startsWith("image/")) {
        const bytes = await fileData.arrayBuffer();
        const base64 = btoa(String.fromCharCode(...new Uint8Array(bytes)));
        fileContent = `data:${job.mime_type};base64,${base64}`;
      } else {
        // For PDFs and docs, we'd need OCR - for now use text extraction
        // This is a placeholder — real OCR would use a dedicated service
        fileContent = "[Document content would be extracted via OCR pipeline]";
      }

      // Get the prompt template
      const { data: template } = await supabaseClient
        .from("ai_prompt_templates")
        .select("*")
        .eq("template_key", templateName)
        .eq("is_active", true)
        .maybeSingle();

      if (!template) {
        await supabaseClient
          .from("document_ingestion_jobs")
          .update({ status: "failed", error_message: "Template not found" })
          .eq("id", jobId);
        return new Response(JSON.stringify({ error: "Extraction template not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update to extracting
      await supabaseClient
        .from("document_ingestion_jobs")
        .update({ status: "extracting" })
        .eq("id", jobId);

      try {
        // Call OpenAI for extraction
        const messages = [
          { role: "system", content: template.system_prompt },
          { role: "user", content: [
            { type: "text", text: `Extract structured data from this ${job.document_type} document using the schema defined in the system prompt. Return ONLY valid JSON.` },
            ...(job.mime_type?.startsWith("image/")
              ? [{ type: "image_url", image_url: { url: fileContent, detail: "high" } }]
              : [{ type: "text", text: fileContent }]
            ),
          ]},
        ];

        const openaiResp = await fetch("https://api.openai.com/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages,
            temperature: template.temperature || 0.1,
            max_tokens: template.max_tokens || 2000,
            response_format: { type: "json_object" },
          }),
        });

        const openaiData = await openaiResp.json();

        if (!openaiResp.ok) {
          throw new Error(openaiData.error?.message || "OpenAI API error");
        }

        const extractedJson = JSON.parse(openaiData.choices?.[0]?.message?.content || "");

        // Create extraction record
        const { data: extraction, error: extErr } = await supabaseClient
          .from("document_extractions")
          .insert({
            organisation_id: job.organisation_id,
            ingestion_job_id: jobId,
            user_id: user.id,
            template_name: templateName,
            template_version: template.version,
            raw_text: typeof fileContent === "string" && fileContent.length < 5000 ? fileContent : null,
            extracted_json: extractedJson,
            status: "needs_review",
          })
          .select("id")
          .single();

        if (extErr) throw extErr;

        // Create extracted fields from JSON
        const fieldRows = flattenExtractionFields(extractedJson, extraction.id, job.document_type);
        if (fieldRows.length > 0) {
          const { error: fieldsErr } = await supabaseClient
            .from("document_extracted_fields")
            .insert(fieldRows);

          if (fieldsErr) throw fieldsErr;
        }

        // Update job status
        await supabaseClient
          .from("document_ingestion_jobs")
          .update({ status: "needs_review" })
          .eq("id", jobId);

        return new Response(JSON.stringify({
          success: true,
          extractionId: extraction.id,
          fields: fieldRows.length,
          status: "needs_review",
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      } catch (extractErr: any) {
        await supabaseClient
          .from("document_ingestion_jobs")
          .update({ status: "failed", error_message: extractErr.message })
          .eq("id", jobId);
        throw extractErr;
      }
    }

    // POST /confirm — confirm/edit extracted fields
    if (req.method === "POST" && path === "confirm") {
      const body = await req.json();
      const { extractionId, fields } = body;

      if (!extractionId || !fields) {
        return new Response(JSON.stringify({ error: "extractionId and fields required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Get extraction to verify org
      const { data: extraction, error: extErr } = await supabaseClient
        .from("document_extractions")
        .select("*, document_ingestion_jobs!inner(organisation_id)")
        .eq("id", extractionId)
        .maybeSingle();

      if (extErr || !extraction) {
        return new Response(JSON.stringify({ error: "Extraction not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Verify org membership
      const orgId = (extraction as any).document_ingestion_jobs?.organisation_id;
      const { data: member } = await supabaseClient
        .from("organisation_members")
        .select("id")
        .eq("organisation_id", orgId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!member) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Update each field
      for (const field of fields) {
        await supabaseClient
          .from("document_extracted_fields")
          .update({
            is_confirmed: field.is_confirmed ?? true,
            edited_value: field.edited_value || null,
          })
          .eq("id", field.id)
          .eq("extraction_id", extractionId);
      }

      // Update extraction status
      await supabaseClient
        .from("document_extractions")
        .update({
          status: "confirmed",
          confirmed_json: fields.reduce((acc: any, f: any) => {
            acc[f.field_name] = f.edited_value || f.extracted_value;
            return acc;
          }, {}),
          reviewed_by: user.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", extractionId);

      // Mark ingestion job as ready
      await supabaseClient
        .from("document_ingestion_jobs")
        .update({ status: "ready" })
        .eq("id", extraction.ingestion_job_id);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // POST /status — update job status (for polling)
    if (req.method === "POST" && path === "status") {
      const body = await req.json();
      const { jobId, status, errorMessage } = body;

      if (!jobId || !status) {
        return new Response(JSON.stringify({ error: "jobId and status required" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: job } = await supabaseClient
        .from("document_ingestion_jobs")
        .select("organisation_id")
        .eq("id", jobId)
        .maybeSingle();

      if (!job) {
        return new Response(JSON.stringify({ error: "Job not found" }), {
          status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const { data: member } = await supabaseClient
        .from("organisation_members")
        .select("id")
        .eq("organisation_id", job.organisation_id)
        .eq("user_id", user.id)
        .maybeSingle();

      if (!member) {
        return new Response(JSON.stringify({ error: "Forbidden" }), {
          status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      await supabaseClient
        .from("document_ingestion_jobs")
        .update({ status, error_message: errorMessage || null })
        .eq("id", jobId);

      return new Response(JSON.stringify({ success: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ error: "Not found" }), {
      status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err: any) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

// Helper: flatten nested extraction JSON into field rows
function flattenExtractionFields(
  obj: Record<string, any>,
  extractionId: number,
  documentType: string,
  prefix = "",
): Array<{
  extraction_id: number;
  field_name: string;
  field_label: string;
  extracted_value: string;
  confidence: string;
  source_highlight: string | null;
  is_safety_critical: boolean;
  is_financial: boolean;
}> {
  const rows: Array<any> = [];
  const safetyFields = ["hazard", "risk", "ppe", "emergency", "coshh", "safety", "control_measure", "competency", "certificate_number", "expiry"];
  const financialFields = ["total", "net", "vat", "gross", "amount", "price", "cost", "invoice_number", "po_number", "discount", "tax", "subtotal"];

  for (const [key, value] of Object.entries(obj)) {
    const fullName = prefix ? `${prefix}.${key}` : key;
    const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

    if (value !== null && typeof value === "object" && !Array.isArray(value)) {
      rows.push(...flattenExtractionFields(value, extractionId, documentType, fullName));
    } else if (Array.isArray(value) && value.length > 0 && typeof value[0] === "object") {
      value.forEach((item: any, idx: number) => {
        rows.push(...flattenExtractionFields(item, extractionId, documentType, `${fullName}[${idx}]`));
      });
    } else {
      const displayValue = Array.isArray(value) ? value.join(", ") : String(value ?? "");
      const isSafety = safetyFields.some((sf) => fullName.toLowerCase().includes(sf));
      const isFinancial = financialFields.some((ff) => fullName.toLowerCase().includes(ff));

      rows.push({
        extraction_id: extractionId,
        field_name: fullName,
        field_label: label,
        extracted_value: displayValue,
        confidence: "medium",
        source_highlight: null,
        is_safety_critical: isSafety,
        is_financial: isFinancial,
      });
    }
  }

  return rows;
}
