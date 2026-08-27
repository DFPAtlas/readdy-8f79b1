// SiteLedger Phase 13 — Platform Admin Operations
// Server-side platform admin API for sensitive operations
// Requires: aal2, platform_staff status, specific permissions

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const authHeader = req.headers.get("Authorization")!;

    // Create admin client (service role) and user client (JWT)
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const userClient = createClient(supabaseUrl, supabaseServiceKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // 1. Verify the user's JWT and get user info
    const { data: { user }, error: authError } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 2. Check platform staff status
    const { data: staffRecord, error: staffError } = await adminClient
      .from("platform_staff")
      .select("role, status, mfa_enrolled")
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (staffError || !staffRecord) {
      return new Response(JSON.stringify({ error: "Forbidden — not an active platform staff member" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. Verify aal2 (MFA) — check the user's authenticator assurance level
    const { data: factors } = await adminClient.auth.admin.listFactors(user.id);
    const hasAal2 = factors?.totp?.some((f: { status: string }) => f.status === "verified") ?? false;

    if (!staffRecord.mfa_enrolled || !hasAal2) {
      return new Response(JSON.stringify({ error: "Forbidden — aal2 (MFA) required for platform operations" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const { action, payload } = body;

    if (!action) {
      return new Response(JSON.stringify({ error: "Missing action" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const platformRole = staffRecord.role;
    let result;

    // ================================================================
    // ORGANISATION MANAGEMENT
    // ================================================================
    if (action === "suspend_organisation") {
      if (!["platform_owner", "platform_admin", "platform_security"].includes(platformRole)) {
        return new Response(JSON.stringify({ error: "Forbidden — insufficient permissions" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { organisationId, reason } = payload;
      if (!organisationId || !reason) {
        return new Response(JSON.stringify({ error: "Missing organisationId or reason" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Record previous status
      const { data: org } = await adminClient.from("organisations").select("status").eq("id", organisationId).maybeSingle();

      // Suspend
      await adminClient.from("organisations").update({ status: "suspended" }).eq("id", organisationId);

      // Record status history
      await adminClient.from("organisation_status_history").insert({
        organisation_id: organisationId,
        previous_status: org?.status ?? "active",
        new_status: "suspended",
        changed_by: user.id,
        reason,
      });

      // Audit
      await adminClient.from("platform_audit_events").insert({
        actor_id: user.id,
        platform_role: platformRole,
        event_type: "organisation_suspended",
        target_org_id: organisationId,
        reason,
      });

      result = { success: true, message: "Organisation suspended" };
    }

    // ================================================================
    // REACTIVATE ORGANISATION
    // ================================================================
    else if (action === "reactivate_organisation") {
      if (!["platform_owner", "platform_admin"].includes(platformRole)) {
        return new Response(JSON.stringify({ error: "Forbidden — insufficient permissions" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { organisationId, reason } = payload;
      if (!organisationId || !reason) {
        return new Response(JSON.stringify({ error: "Missing organisationId or reason" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      await adminClient.from("organisations").update({ status: "active" }).eq("id", organisationId);

      await adminClient.from("organisation_status_history").insert({
        organisation_id: organisationId,
        previous_status: "suspended",
        new_status: "active",
        changed_by: user.id,
        reason,
      });

      await adminClient.from("platform_audit_events").insert({
        actor_id: user.id,
        platform_role: platformRole,
        event_type: "organisation_reactivated",
        target_org_id: organisationId,
        reason,
      });

      result = { success: true, message: "Organisation reactivated" };
    }

    // ================================================================
    // SUSPEND USER
    // ================================================================
    else if (action === "suspend_user") {
      if (!["platform_owner", "platform_admin", "platform_security"].includes(platformRole)) {
        return new Response(JSON.stringify({ error: "Forbidden — insufficient permissions" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { targetUserId, reason } = payload;
      if (!targetUserId || !reason) {
        return new Response(JSON.stringify({ error: "Missing targetUserId or reason" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      // Suspend in platform_staff if applicable
      await adminClient.from("platform_staff").update({ status: "suspended", suspended_reason: reason, suspended_at: new Date().toISOString() }).eq("user_id", targetUserId);

      // Audit
      await adminClient.from("platform_audit_events").insert({
        actor_id: user.id,
        platform_role: platformRole,
        event_type: "user_suspended",
        target_user_id: targetUserId,
        reason,
      });

      result = { success: true, message: "User suspended" };
    }

    // ================================================================
    // GRANT EMERGENCY ACCESS (break-glass)
    // ================================================================
    else if (action === "grant_emergency_access") {
      if (!["platform_owner", "platform_security"].includes(platformRole)) {
        return new Response(JSON.stringify({ error: "Forbidden — insufficient permissions" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { organisationId, scopeDetails, reason, expiresInHours } = payload;
      if (!organisationId || !reason) {
        return new Response(JSON.stringify({ error: "Missing organisationId or reason" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const expiresAt = new Date(Date.now() + (expiresInHours || 4) * 3600000).toISOString();

      const { data: grant } = await adminClient.from("platform_access_grants").insert({
        staff_user_id: user.id,
        organisation_id: organisationId,
        access_type: "emergency",
        scope_details: scopeDetails || "",
        reason,
        status: "active",
        granted_by: user.id,
        expires_at: expiresAt,
      }).select("id").single();

      await adminClient.from("platform_audit_events").insert({
        actor_id: user.id,
        platform_role: platformRole,
        event_type: "emergency_access_granted",
        target_org_id: organisationId,
        access_grant_id: grant?.id,
        reason,
      });

      result = { success: true, grantId: grant?.id, expiresAt, message: "Emergency access granted" };
    }

    // ================================================================
    // REVOKE ACTIVE ACCESS GRANT
    // ================================================================
    else if (action === "revoke_access_grant") {
      if (!["platform_owner", "platform_admin", "platform_security"].includes(platformRole)) {
        return new Response(JSON.stringify({ error: "Forbidden — insufficient permissions" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { grantId, reason } = payload;
      if (!grantId) {
        return new Response(JSON.stringify({ error: "Missing grantId" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      await adminClient.from("platform_access_grants").update({ status: "revoked", revoked_at: new Date().toISOString() }).eq("id", grantId);

      await adminClient.from("platform_audit_events").insert({
        actor_id: user.id,
        platform_role: platformRole,
        event_type: "access_grant_revoked",
        access_grant_id: grantId,
        reason: reason || "Manual revocation",
      });

      result = { success: true, message: "Access grant revoked" };
    }

    // ================================================================
    // INVITE PLATFORM STAFF
    // ================================================================
    else if (action === "invite_platform_staff") {
      if (!["platform_owner", "platform_admin"].includes(platformRole)) {
        return new Response(JSON.stringify({ error: "Forbidden — insufficient permissions" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { email, role } = payload;
      if (!email || !role) {
        return new Response(JSON.stringify({ error: "Missing email or role" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      if (role === "platform_owner") {
        return new Response(JSON.stringify({ error: "Cannot invite platform_owner via this endpoint" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const invitationHash = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 7 * 86400000).toISOString();

      await adminClient.from("platform_staff_invitations").insert({
        email,
        role,
        invited_by: user.id,
        invitation_hash: invitationHash,
        status: "pending",
        expires_at: expiresAt,
      });

      await adminClient.from("platform_audit_events").insert({
        actor_id: user.id,
        platform_role: platformRole,
        event_type: "staff_invitation_sent",
        reason: `Invited ${email} as ${role}`,
      });

      result = { success: true, invitationHash, expiresAt, message: "Staff invitation created" };
    }

    // ================================================================
    // FEATURE FLAG TOGGLE
    // ================================================================
    else if (action === "toggle_feature_flag") {
      if (!["platform_owner", "platform_admin"].includes(platformRole)) {
        return new Response(JSON.stringify({ error: "Forbidden — insufficient permissions" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      const { flagId, enabled, reason } = payload;
      if (!flagId || enabled === undefined) {
        return new Response(JSON.stringify({ error: "Missing flagId or enabled" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }

      await adminClient.from("platform_feature_flags").update({ enabled, change_reason: reason }).eq("id", flagId);

      await adminClient.from("platform_audit_events").insert({
        actor_id: user.id,
        platform_role: platformRole,
        event_type: "feature_flag_changed",
        reason: `${enabled ? "Enabled" : "Disabled"} flag: ${reason}`,
      });

      result = { success: true, message: `Feature flag ${enabled ? "enabled" : "disabled"}` };
    }

    // ================================================================
    // UNKNOWN ACTION
    // ================================================================
    else {
      return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Platform admin error:", err);
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
