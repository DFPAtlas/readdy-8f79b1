import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const anonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const responseHeaders = {
  ...corsHeaders,
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
};

const SITE_URL = (Deno.env.get("SITE_URL") || "https://buildnerve.co.uk").replace(/\/+$/, "");
const INVITE_TTL_DAYS = 7;
const ALLOWED_ROLES = [
  "owner",
  "admin",
  "project_manager",
  "site_supervisor",
  "finance",
  "employee",
];
const ADMIN_ROLES = ["owner", "admin"];

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: responseHeaders });
}
function fail(message: string, status = 400): Response {
  return json({ error: message }, status);
}

type Supabase = ReturnType<typeof createClient>;

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function generateToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function findUserIdByEmail(admin: Supabase, email: string): Promise<string | null> {
  const target = email.trim().toLowerCase();
  const perPage = 1000;
  for (let page = 1; page <= 50; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) return null;
    const users = data?.users ?? [];
    const match = users.find((u) => (u.email ?? "").toLowerCase() === target);
    if (match) return match.id;
    if (users.length < perPage) break;
  }
  return null;
}

async function getActiveMembership(admin: Supabase, organisationId: string, userId: string) {
  const { data } = await admin
    .from("organisation_members")
    .select("id, role, status")
    .eq("organisation_id", organisationId)
    .eq("user_id", userId)
    .eq("status", "active")
    .maybeSingle();
  return data;
}

async function writeAudit(
  admin: Supabase,
  params: {
    organisationId: string;
    actorId: string | null;
    action: string;
    entityType: string;
    entityId: string;
    changeSummary?: Record<string, unknown> | null;
    source?: string;
  },
): Promise<void> {
  try {
    await admin.from("audit_events").insert({
      organisation_id: params.organisationId,
      actor_id: params.actorId,
      action: params.action,
      entity_type: params.entityType,
      entity_id: params.entityId,
      change_summary: params.changeSummary ?? null,
      source: params.source ?? "team-invitations",
    });
  } catch (err) {
    console.error("team-invitations audit write failed:", err);
  }
}

function inviteEmailHtml(organisationName: string, role: string, acceptUrl: string): string {
  const safeOrg = escapeHtml(organisationName);
  const safeRole = escapeHtml(role.replace(/_/g, " "));
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="background:#ffffff;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
      <div style="background:#0F172A;padding:28px 32px;">
        <div style="color:#ffffff;font-size:18px;font-weight:700;">BuildNerve</div>
        <div style="color:#94A3B8;font-size:13px;margin-top:4px;">Team invitation</div>
      </div>
      <div style="padding:32px;">
        <h1 style="margin:0 0 16px;color:#0F172A;font-size:18px;font-weight:700;line-height:1.4;">You&apos;ve been invited to join ${safeOrg}</h1>
        <p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.6;">
          ${safeOrg} has invited you to collaborate on BuildNerve as <strong style="color:#0F172A;">${safeRole}</strong>.
          Accept the invitation to set up your access.
        </p>
        <a href="${acceptUrl}" style="display:inline-block;background:#0D9488;color:#ffffff;text-decoration:none;font-size:15px;font-weight:600;padding:13px 28px;border-radius:8px;">Accept invitation</a>
        <p style="margin:24px 0 0;color:#64748B;font-size:13px;line-height:1.6;">
          This invitation expires in ${INVITE_TTL_DAYS} days. If the button doesn&apos;t work, copy and paste this link into your browser:<br/>
          <a href="${acceptUrl}" style="color:#0D9488;word-break:break-all;">${acceptUrl}</a>
        </p>
      </div>
    </div>
    <p style="text-align:center;color:#94A3B8;font-size:12px;margin:20px 0 0;">
      BuildNerve &middot; Run your business with clarity
    </p>
  </div>
</body>
</html>`;
}

async function sendInviteEmail(
  organisationName: string,
  role: string,
  email: string,
  rawToken: string,
): Promise<{ sent: boolean; error: string | null }> {
  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFromDomain = Deno.env.get("RESEND_FROM_DOMAIN");
  if (!resendApiKey || !resendFromDomain) {
    return { sent: false, error: "Email service is not configured" };
  }

  const acceptUrl = `${SITE_URL}/accept-invite?token=${encodeURIComponent(rawToken)}`;
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: `noreply@${resendFromDomain}`,
        to: [email],
        subject: `You've been invited to join ${organisationName} on BuildNerve`,
        html: inviteEmailHtml(organisationName, role, acceptUrl),
      }),
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return { sent: false, error: typeof data?.message === "string" ? data.message : "Failed to send email" };
    }
    return { sent: true, error: null };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : "Failed to send email" };
  }
}

async function handleCreate(
  admin: Supabase,
  caller: { id: string; email: string | null },
  body: Record<string, unknown>,
): Promise<Response> {
  const organisationId = typeof body.organisation_id === "string" ? body.organisation_id : "";
  const email = typeof body.email === "string" ? body.email.trim() : "";
  const role = typeof body.role === "string" ? body.role : "";

  if (!organisationId) return fail("organisation_id is required");
  if (!email || !isValidEmail(email)) return fail("A valid email address is required");
  if (!ALLOWED_ROLES.includes(role)) return fail("A valid role is required");

  const membership = await getActiveMembership(admin, organisationId, caller.id);
  if (!membership || !ADMIN_ROLES.includes(membership.role)) {
    return fail("Only an owner or admin can invite members", 403);
  }
  if (role === "owner" && membership.role !== "owner") {
    return fail("Only an owner can invite another owner", 403);
  }

  const { data: org } = await admin.from("organisations").select("id, name").eq("id", organisationId).maybeSingle();
  if (!org) return fail("Organisation not found", 404);

  const existingUserId = await findUserIdByEmail(admin, email);
  if (existingUserId) {
    const existingMembership = await getActiveMembership(admin, organisationId, existingUserId);
    if (existingMembership) return fail("That person is already a member of this organisation", 409);
  }

  await admin
    .from("invitations")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("organisation_id", organisationId)
    .ilike("email", email)
    .eq("access_type", "internal_member")
    .eq("status", "pending");

  const rawToken = generateToken();
  const tokenHash = await sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86400000).toISOString();

  const { data: invitation, error: insertError } = await admin
    .from("invitations")
    .insert({
      organisation_id: organisationId,
      email,
      access_type: "internal_member",
      role,
      token_hash: tokenHash,
      status: "pending",
      invited_by: caller.id,
      expires_at: expiresAt,
    })
    .select("id")
    .single();

  if (insertError || !invitation) {
    console.error("team-invitations create failed:", insertError?.message);
    return fail("Could not create the invitation", 500);
  }

  await writeAudit(admin, {
    organisationId,
    actorId: caller.id,
    action: "invitation.created",
    entityType: "invitation",
    entityId: invitation.id,
    changeSummary: { email, role },
  });

  const emailResult = await sendInviteEmail(org.name as string, role, email, rawToken);

  return json({ id: invitation.id, email_sent: emailResult.sent, email_error: emailResult.error });
}

async function handleResend(
  admin: Supabase,
  caller: { id: string },
  body: Record<string, unknown>,
): Promise<Response> {
  const invitationId = typeof body.invitation_id === "string" ? body.invitation_id : "";
  if (!invitationId) return fail("invitation_id is required");

  const { data: invitation } = await admin
    .from("invitations")
    .select("id, organisation_id, email, role, status, access_type")
    .eq("id", invitationId)
    .maybeSingle();
  if (!invitation || invitation.access_type !== "internal_member") return fail("Invitation not found", 404);

  const membership = await getActiveMembership(admin, invitation.organisation_id, caller.id);
  if (!membership || !ADMIN_ROLES.includes(membership.role)) {
    return fail("Only an owner or admin can resend invitations", 403);
  }
  if (invitation.role === "owner" && membership.role !== "owner") {
    return fail("Only an owner can manage an owner invitation", 403);
  }
  if (invitation.status === "accepted") return fail("This invitation has already been accepted", 409);
  if (invitation.status === "revoked") return fail("This invitation has been revoked", 409);

  const { data: org } = await admin.from("organisations").select("name").eq("id", invitation.organisation_id).maybeSingle();
  if (!org) return fail("Organisation not found", 404);

  const rawToken = generateToken();
  const tokenHash = await sha256Hex(rawToken);
  const expiresAt = new Date(Date.now() + INVITE_TTL_DAYS * 86400000).toISOString();

  const { error: updateError } = await admin
    .from("invitations")
    .update({ token_hash: tokenHash, status: "pending", expires_at: expiresAt, accepted_at: null, revoked_at: null })
    .eq("id", invitation.id);
  if (updateError) {
    console.error("team-invitations resend failed:", updateError.message);
    return fail("Could not resend the invitation", 500);
  }

  await writeAudit(admin, {
    organisationId: invitation.organisation_id,
    actorId: caller.id,
    action: "invitation.resent",
    entityType: "invitation",
    entityId: invitation.id,
    changeSummary: { email: invitation.email, role: invitation.role },
  });

  const emailResult = await sendInviteEmail(org.name as string, invitation.role as string, invitation.email as string, rawToken);

  return json({ id: invitation.id, email_sent: emailResult.sent, email_error: emailResult.error });
}

async function handleRevoke(
  admin: Supabase,
  caller: { id: string },
  body: Record<string, unknown>,
): Promise<Response> {
  const invitationId = typeof body.invitation_id === "string" ? body.invitation_id : "";
  if (!invitationId) return fail("invitation_id is required");

  const { data: invitation } = await admin
    .from("invitations")
    .select("id, organisation_id, email, role, status, access_type")
    .eq("id", invitationId)
    .maybeSingle();
  if (!invitation || invitation.access_type !== "internal_member") return fail("Invitation not found", 404);

  const membership = await getActiveMembership(admin, invitation.organisation_id, caller.id);
  if (!membership || !ADMIN_ROLES.includes(membership.role)) {
    return fail("Only an owner or admin can revoke invitations", 403);
  }
  if (invitation.role === "owner" && membership.role !== "owner") {
    return fail("Only an owner can manage an owner invitation", 403);
  }

  const { error: updateError } = await admin
    .from("invitations")
    .update({ status: "revoked", revoked_at: new Date().toISOString() })
    .eq("id", invitation.id);
  if (updateError) {
    console.error("team-invitations revoke failed:", updateError.message);
    return fail("Could not revoke the invitation", 500);
  }

  await writeAudit(admin, {
    organisationId: invitation.organisation_id,
    actorId: caller.id,
    action: "invitation.revoked",
    entityType: "invitation",
    entityId: invitation.id,
    changeSummary: { email: invitation.email, role: invitation.role },
  });

  return json({ id: invitation.id });
}

async function handlePreview(admin: Supabase, body: Record<string, unknown>): Promise<Response> {
  const rawToken = typeof body.token === "string" ? body.token.trim() : "";
  if (!rawToken) return fail("token is required");

  const tokenHash = await sha256Hex(rawToken);
  const { data: invitation } = await admin
    .from("invitations")
    .select("id, organisation_id, email, role, status, expires_at, access_type")
    .eq("token_hash", tokenHash)
    .eq("access_type", "internal_member")
    .maybeSingle();

  if (!invitation) return fail("Invitation not found", 404);

  const { data: org } = await admin.from("organisations").select("name").eq("id", invitation.organisation_id).maybeSingle();
  const expired = invitation.expires_at ? new Date(invitation.expires_at).getTime() < Date.now() : false;

  return json({
    organisation_name: (org?.name as string) ?? null,
    role: invitation.role,
    email: invitation.email,
    status: invitation.status,
    expired,
  });
}

async function handleAccept(
  admin: Supabase,
  caller: { id: string; email: string | null },
  body: Record<string, unknown>,
): Promise<Response> {
  const rawToken = typeof body.token === "string" ? body.token.trim() : "";
  if (!rawToken) return fail("token is required");

  const tokenHash = await sha256Hex(rawToken);
  const { data: invitation } = await admin
    .from("invitations")
    .select("id, organisation_id, email, role, status, expires_at, invited_by, access_type")
    .eq("token_hash", tokenHash)
    .eq("access_type", "internal_member")
    .maybeSingle();

  if (!invitation) return fail("Invitation not found", 404);
  if (invitation.status !== "pending") return fail("This invitation is no longer valid", 409);
  if (invitation.expires_at && new Date(invitation.expires_at).getTime() < Date.now()) {
    return fail("This invitation has expired", 409);
  }

  const callerEmail = (caller.email ?? "").trim().toLowerCase();
  if (!callerEmail || callerEmail !== (invitation.email as string).trim().toLowerCase()) {
    return fail("This invitation was sent to a different email address.", 403);
  }

  const { error: upsertError } = await admin
    .from("organisation_members")
    .upsert(
      {
        organisation_id: invitation.organisation_id,
        user_id: caller.id,
        role: invitation.role,
        status: "active",
        invited_by: invitation.invited_by,
        joined_at: new Date().toISOString(),
      },
      { onConflict: "organisation_id,user_id" },
    );
  if (upsertError) {
    console.error("team-invitations accept membership upsert failed:", upsertError.message);
    return fail("Could not accept the invitation", 500);
  }

  const { error: updateError } = await admin
    .from("invitations")
    .update({ status: "accepted", accepted_at: new Date().toISOString() })
    .eq("id", invitation.id)
    .eq("status", "pending");
  if (updateError) {
    console.error("team-invitations accept update failed:", updateError.message);
    return fail("Could not accept the invitation", 500);
  }

  await writeAudit(admin, {
    organisationId: invitation.organisation_id,
    actorId: caller.id,
    action: "invitation.accepted",
    entityType: "invitation",
    entityId: invitation.id,
    changeSummary: { email: invitation.email, role: invitation.role },
  });

  return json({ organisation_id: invitation.organisation_id });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return fail("Method not allowed", 405);

  try {
    if (!supabaseUrl || !serviceKey) {
      console.error("team-invitations: missing Supabase environment");
      return fail("Invitation service unavailable", 503);
    }

    const admin = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false } });

    const parsed = await req.json().catch(() => null);
    const body: Record<string, unknown> = parsed && typeof parsed === "object" ? parsed : {};
    const action = typeof body.action === "string" ? body.action : "";
    if (!action) return fail("action is required");

    if (action === "preview") {
      return await handlePreview(admin, body);
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return fail("Unauthorized", 401);

    const authClient = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
    const { data: { user }, error: authError } = await authClient.auth.getUser(jwt);
    if (authError || !user) return fail("Invalid auth", 401);

    const caller = { id: user.id, email: user.email ?? null };

    switch (action) {
      case "create":
        return await handleCreate(admin, caller, body);
      case "resend":
        return await handleResend(admin, caller, body);
      case "revoke":
        return await handleRevoke(admin, caller, body);
      case "accept":
        return await handleAccept(admin, caller, body);
      default:
        return fail("Unknown action", 400);
    }
  } catch (err) {
    console.error("team-invitations unexpected error:", err);
    return fail(err instanceof Error ? err.message : "Operation failed", 500);
  }
});
