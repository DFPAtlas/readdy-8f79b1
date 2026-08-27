import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEMO_EMAIL = "demo@buildnerve.co.uk";
const DEMO_PASSWORD = "Demo1234!";

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFromDomain = Deno.env.get("RESEND_FROM_DOMAIN");

  if (!resendApiKey || !resendFromDomain) {
    return new Response(
      JSON.stringify({ error: "Email service is not configured yet." }),
      { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const name = typeof body?.name === "string" ? body.name.trim() : "";
    const signInUrl =
      typeof body?.signInUrl === "string" && body.signInUrl.startsWith("http")
        ? body.signInUrl
        : "";

    if (!email || !email.includes("@")) {
      return new Response(JSON.stringify({ error: "A valid email address is required." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const firstName = name ? name.split(" ")[0] : "there";
    const from = `noreply@${resendFromDomain}`;

    const html = `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="background:#ffffff;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
      <div style="background:#0F172A;padding:28px 32px;">
        <div style="color:#ffffff;font-size:20px;font-weight:700;">BuildNerve</div>
        <div style="color:#94A3B8;font-size:13px;margin-top:4px;">Your demo is ready</div>
      </div>
      <div style="padding:32px;">
        <p style="margin:0 0 18px;color:#0F172A;font-size:16px;line-height:1.6;">
          Hi ${firstName},<br/><br/>
          Thanks for requesting a demo. You can jump straight in and explore BuildNerve right now &mdash; your login details are below.
        </p>
        <div style="background:#F1F5F9;border:1px solid #E2E8F0;border-radius:8px;padding:20px;margin:0 0 24px;">
          <div style="font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:12px;">Your demo login</div>
          <div style="font-size:14px;color:#0F172A;margin-bottom:8px;"><span style="color:#64748B;">Email:</span> <strong>${DEMO_EMAIL}</strong></div>
          <div style="font-size:14px;color:#0F172A;"><span style="color:#64748B;">Password:</span> <strong>${DEMO_PASSWORD}</strong></div>
        </div>
        <a href="${signInUrl}" style="display:inline-block;background:#0D9488;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 28px;border-radius:8px;">Sign in to your demo</a>
        <p style="margin:24px 0 0;color:#64748B;font-size:13px;line-height:1.6;">
          If the button doesn&apos;t work, copy and paste this link into your browser:<br/>
          <a href="${signInUrl}" style="color:#0D9488;word-break:break-all;">${signInUrl}</a>
        </p>
      </div>
    </div>
    <p style="text-align:center;color:#94A3B8;font-size:12px;margin:20px 0 0;">
      BuildNerve &middot; Run your business with clarity
    </p>
  </div>
</body>
</html>`;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: "Your BuildNerve demo login",
        html,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      return new Response(
        JSON.stringify({
          error: typeof data?.message === "string" ? data.message : "Failed to send email.",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch {
    return new Response(
      JSON.stringify({ error: "Something went wrong while sending the email." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});