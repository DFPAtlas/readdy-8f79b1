import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("VITE_PUBLIC_SUPABASE_URL")!;
const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ACTIVE_STATUSES = [
  "open", "awaiting_response", "under_discussion", "evidence_collection",
  "negotiation", "mediation_considered", "pre_action",
];
const ALLOWED_REMINDER_DAYS = [7, 3, 1, 0];
const DEFAULT_PREFS = { email_reminders_enabled: true, reminder_days: [7, 3, 1, 0], overdue_reminder_enabled: true };

function ok(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
function fail(message: string, status = 400) {
  return new Response(JSON.stringify({ error: message }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

type Supabase = ReturnType<typeof createClient>;

interface DeadlineSeed {
  deadline_type: string;
  related_record_type: string;
  related_record_id: string;
  title: string;
  actor_user_id: string | null;
  actor_role: "claimant" | "respondent" | null;
  due_at: string;
}

async function buildDeadlineSeeds(supabase: Supabase, dispute: Record<string, unknown>): Promise<DeadlineSeed[]> {
  const disputeId = dispute.id as string;
  const seeds: DeadlineSeed[] = [];
  const [clarifications, offers, obligations, letters] = await Promise.all([
    supabase.from("dispute_clarifications").select("*").eq("dispute_id", disputeId),
    supabase.from("dispute_settlement_offers").select("*").eq("dispute_id", disputeId),
    supabase.from("dispute_settlement_obligations").select("*").eq("dispute_id", disputeId),
    supabase.from("dispute_letters").select("*").eq("dispute_id", disputeId),
  ]);

  if ((dispute.status === "open" || dispute.status === "awaiting_response") && dispute.response_due_at) {
    seeds.push({
      deadline_type: "initial_response",
      related_record_type: "dispute",
      related_record_id: disputeId,
      title: "Submit a formal response",
      actor_user_id: (dispute.respondent_user_id as string) ?? null,
      actor_role: "respondent",
      due_at: dispute.response_due_at as string,
    });
  }

  for (const c of clarifications.data || []) {
    if (c.status !== "open" || !c.response_due_at) continue;
    const otherUserId = c.requested_by_user_id === dispute.claimant_user_id ? dispute.respondent_user_id : dispute.claimant_user_id;
    seeds.push({
      deadline_type: "clarification_response",
      related_record_type: "dispute_clarification",
      related_record_id: c.id,
      title: "Answer a clarification request",
      actor_user_id: (otherUserId as string) ?? null,
      actor_role: otherUserId === dispute.claimant_user_id ? "claimant" : "respondent",
      due_at: c.response_due_at,
    });
  }

  for (const o of offers.data || []) {
    if (o.status !== "submitted" || !o.response_deadline) continue;
    const otherUserId = o.offered_by_user_id === dispute.claimant_user_id ? dispute.respondent_user_id : dispute.claimant_user_id;
    seeds.push({
      deadline_type: "offer_expiry",
      related_record_type: "dispute_settlement_offer",
      related_record_id: o.id,
      title: "Respond to a settlement offer",
      actor_user_id: (otherUserId as string) ?? null,
      actor_role: otherUserId === dispute.claimant_user_id ? "claimant" : "respondent",
      due_at: o.response_deadline,
    });
  }

  for (const ob of obligations.data || []) {
    if (!ob.due_date) continue;
    if (ob.status === "confirmed_completed") continue;
    seeds.push({
      deadline_type: "settlement_obligation",
      related_record_type: "dispute_settlement_obligation",
      related_record_id: ob.id,
      title: ob.title || "Complete the agreed obligation",
      actor_user_id: null,
      actor_role: null,
      due_at: `${ob.due_date}T23:59:59Z`,
    });
  }

  for (const l of letters.data || []) {
    if (!l.response_date) continue;
    if (!["finalised", "sent_external", "sent_buildnerve"].includes(l.status)) continue;
    const otherUserId = l.created_by_user_id === dispute.claimant_user_id ? dispute.respondent_user_id : dispute.claimant_user_id;
    seeds.push({
      deadline_type: "pre_action_response",
      related_record_type: "dispute_letter",
      related_record_id: l.id,
      title: "Respond to the letter of claim",
      actor_user_id: (otherUserId as string) ?? null,
      actor_role: otherUserId === dispute.claimant_user_id ? "claimant" : "respondent",
      due_at: `${l.response_date}T23:59:59Z`,
    });
  }

  return seeds;
}

function computeDeadlineStatus(dueAt: string): string {
  const due = new Date(dueAt).getTime();
  const now = Date.now();
  if (now >= due) return "overdue";
  const nowStart = new Date();
  nowStart.setHours(0, 0, 0, 0);
  const dueDate = new Date(due);
  const dueStart = new Date(dueDate);
  dueStart.setHours(0, 0, 0, 0);
  if (dueStart.getTime() === nowStart.getTime()) return "due_today";
  if (due - now <= 3 * 86400000) return "due_soon";
  return "scheduled";
}

async function refreshDeadlines(supabase: Supabase, dispute: Record<string, unknown>): Promise<void> {
  const disputeId = dispute.id as string;
  const seeds = await buildDeadlineSeeds(supabase, dispute);
  const { data: existing } = await supabase.from("dispute_deadlines").select("*").eq("dispute_id", disputeId);

  const existingMap = new Map<string, Record<string, unknown>>();
  for (const d of existing || []) existingMap.set(`${d.deadline_type}:${d.related_record_id}`, d);

  const wantedKeys = new Set<string>();
  for (const seed of seeds) {
    const key = `${seed.deadline_type}:${seed.related_record_id}`;
    wantedKeys.add(key);
    const current = existingMap.get(key);
    if (!current) {
      await supabase.from("dispute_deadlines").insert({
        dispute_id: disputeId,
        deadline_type: seed.deadline_type,
        related_record_type: seed.related_record_type,
        related_record_id: seed.related_record_id,
        title: seed.title,
        actor_user_id: seed.actor_user_id,
        actor_role: seed.actor_role,
        due_at: seed.due_at,
        timezone: "Europe/London",
        is_platform_deadline: true,
        status: computeDeadlineStatus(seed.due_at),
      });
    } else {
      const newStatus = computeDeadlineStatus(seed.due_at);
      const terminal = ["completed", "cancelled", "superseded"].includes(current.status as string);
      if (!terminal && current.status !== newStatus) {
        await supabase.from("dispute_deadlines").update({ status: newStatus, updated_at: new Date().toISOString() }).eq("id", current.id);
      }
    }
  }

  for (const [key, d] of existingMap) {
    if (wantedKeys.has(key)) continue;
    if (["completed", "cancelled", "superseded"].includes(d.status as string)) continue;
    const cancelled = dispute.status === "withdrawn" || dispute.status === "closed";
    await supabase.from("dispute_deadlines").update({
      status: cancelled ? "cancelled" : "completed",
      completed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", d.id);
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

function emailTemplate(caseReference: string, title: string, summary: string, deadlineLabel: string, link: string): string {
  const safeLink = link || "https://buildnerve.co.uk";
  return `<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background-color:#F8FAFC;font-family:Arial,Helvetica,sans-serif;">
  <div style="max-width:520px;margin:0 auto;padding:32px 20px;">
    <div style="background:#ffffff;border:1px solid #E2E8F0;border-radius:12px;overflow:hidden;">
      <div style="background:#0F172A;padding:28px 32px;">
        <div style="color:#ffffff;font-size:18px;font-weight:700;">BuildNerve</div>
        <div style="color:#94A3B8;font-size:13px;margin-top:4px;">Dispute resolution &middot; ${escapeHtml(caseReference)}</div>
      </div>
      <div style="padding:32px;">
        <h1 style="margin:0 0 16px;color:#0F172A;font-size:18px;font-weight:700;line-height:1.4;">${escapeHtml(title)}</h1>
        <p style="margin:0 0 18px;color:#334155;font-size:15px;line-height:1.6;">${escapeHtml(summary)}</p>
        <div style="background:#F1F5F9;border:1px solid #E2E8F0;border-radius:8px;padding:16px;margin:0 0 24px;">
          <div style="font-size:12px;color:#64748B;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:6px;">Deadline</div>
          <div style="font-size:15px;color:#0F172A;font-weight:600;">${escapeHtml(deadlineLabel)}</div>
        </div>
        <a href="${safeLink}" style="display:inline-block;background:#0D9488;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;">View dispute</a>
        <p style="margin:24px 0 0;color:#64748B;font-size:13px;line-height:1.6;">
          BuildNerve is a neutral platform and does not determine liability. This email is general
          guidance, not legal advice, and is not formal legal service. Platform deadlines are separate
          from any court or statutory dates, which you should verify independently.
        </p>
      </div>
    </div>
    <p style="text-align:center;color:#94A3B8;font-size:12px;margin:20px 0 0;">
      <a href="https://buildnerve.co.uk/support" style="color:#0D9488;text-decoration:none;">Support</a>
      &middot;
      <a href="https://buildnerve.co.uk/privacy" style="color:#0D9488;text-decoration:none;">Privacy</a>
    </p>
  </div>
</body>
</html>`;
}

async function sendInApp(supabase: Supabase, dispute: Record<string, unknown>, recipientUserId: string, notificationType: string, title: string, body: string, priority: string, dedupKey: string): Promise<void> {
  await supabase.from("notifications").upsert({
    organisation_id: dispute.organisation_id,
    recipient_user_id: recipientUserId,
    notification_type: notificationType,
    category: "system",
    title,
    body,
    priority,
    related_entity_type: "dispute",
    related_entity_id: dispute.id,
    job_id: dispute.project_id,
    action_route: `/disputes/${dispute.id}`,
    action_label: "View dispute",
    deduplication_key: dedupKey,
  }, { onConflict: "deduplication_key", ignoreDuplicates: true });
}

async function sendEmail(supabase: Supabase, dispute: Record<string, unknown>, recipient: { user_id: string; email: string }, subject: string, html: string, idempotencyKey: string, notificationType: string): Promise<void> {
  const siteUrl = Deno.env.get("SITE_URL") || Deno.env.get("VITE_PUBLIC_SITE_URL") || "";
  const link = siteUrl ? `${siteUrl}/disputes/${dispute.id}` : "";

  const { data: inserted } = await supabase.from("notification_outbox").upsert({
    organisation_id: dispute.organisation_id,
    event_type: notificationType,
    recipient_user_id: recipient.user_id,
    recipient_email: recipient.email,
    channel: "email",
    template_key: "dispute_notification",
    template_version: 1,
    payload: { dispute_id: dispute.id, case_reference: dispute.case_reference, title: subject },
    status: "pending",
    idempotency_key: idempotencyKey,
    related_entity_type: "dispute",
    related_entity_id: dispute.id,
    case_reference: dispute.case_reference,
  }, { onConflict: "idempotency_key", ignoreDuplicates: true }).select().maybeSingle();

  const outboxId = inserted?.id as string | undefined;
  if (!outboxId) return;

  const resendApiKey = Deno.env.get("RESEND_API_KEY");
  const resendFromDomain = Deno.env.get("RESEND_FROM_DOMAIN");
  if (!resendApiKey || !resendFromDomain || !recipient.email) {
    await supabase.from("notification_outbox").update({ status: "failed", last_error: "Email service not configured", attempt_count: 1 }).eq("id", outboxId);
    return;
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${resendApiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from: `noreply@${resendFromDomain}`, to: [recipient.email], subject, html }),
    });
    const data = await res.json();
    if (!res.ok) {
      await supabase.from("notification_outbox").update({ status: "failed", last_error: typeof data?.message === "string" ? data.message : "Failed to send email", attempt_count: 1 }).eq("id", outboxId);
      return;
    }
    await supabase.from("notification_outbox").update({ status: "sent", sent_at: new Date().toISOString(), provider_reference: typeof data?.id === "string" ? data.id : null, attempt_count: 1 }).eq("id", outboxId);
  } catch (err) {
    await supabase.from("notification_outbox").update({ status: "failed", last_error: err instanceof Error ? err.message : "Email send error", attempt_count: 1 }).eq("id", outboxId);
  }
}

function formatDeadlineLabel(deadline: Record<string, unknown>): string {
  return new Date(deadline.due_at as string).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function timeRemaining(dueAt: string): string {
  const ms = new Date(dueAt).getTime() - Date.now();
  const days = Math.floor(ms / 86400000);
  if (days >= 1) return days === 1 ? "1 day" : `${days} days`;
  const hours = Math.floor(ms / 3600000);
  if (hours >= 1) return hours === 1 ? "1 hour" : `${hours} hours`;
  const mins = Math.floor(ms / 60000);
  if (ms > 0) return `${Math.max(1, mins)} minutes`;
  return "overdue";
}

async function enqueueReminders(supabase: Supabase, dispute: Record<string, unknown>, deadline: Record<string, unknown>, prefs: Record<string, unknown>, parties: Record<string, unknown>[]): Promise<void> {
  if (["completed", "cancelled", "superseded"].includes(deadline.status as string)) return;

  const dueMs = new Date(deadline.due_at as string).getTime();
  const now = Date.now();
  const emailEnabled = prefs.email_reminders_enabled !== false;
  const reminderDays: number[] = Array.isArray(prefs.reminder_days) ? prefs.reminder_days : [7, 3, 1, 0];

  const actorUserId = deadline.actor_user_id as string | null;
  let recipients = parties;
  if (actorUserId) recipients = parties.filter((p) => p.user_id === actorUserId);
  if (recipients.length === 0) recipients = parties;

  const caseRef = dispute.case_reference as string;

  for (const days of ALLOWED_REMINDER_DAYS) {
    if (!reminderDays.includes(days)) continue;
    const target = dueMs - days * 86400000;
    if (now < target) continue;
    if (days > 0 && now >= dueMs) continue;
    const label = days === 0 ? "today" : `${days} days before the deadline`;
    const title = days === 0 ? "Deadline due today" : "Deadline approaching";
    const body = `${caseRef}: "${deadline.title}" ${label} (${formatDeadlineLabel(deadline)}).`;

    for (const r of recipients) {
      const uid = r.user_id as string;
      const dedup = `dispute-reminder:${deadline.id}:before:${days}:${uid}`;
      await sendInApp(supabase, dispute, uid, "dispute_deadline_approaching", title, body, days <= 1 ? "high" : "normal", dedup);
      const emailAddr = (r.email_snapshot as string) || (r.email as string) || null;
      if (emailEnabled && emailAddr) {
        await sendEmail(supabase, dispute, { user_id: uid, email: emailAddr }, `${title} — ${caseRef}`, emailTemplate(caseRef, title, body, `Due ${formatDeadlineLabel(deadline)}`, ""), `email:${dedup}`, "dispute_deadline_approaching");
      }
    }
  }

  if (now >= dueMs && prefs.overdue_reminder_enabled !== false) {
    const title = "Deadline passed";
    const body = `${caseRef}: "${deadline.title}" has passed (${formatDeadlineLabel(deadline)}). No automatic decision has been made.`;
    for (const r of recipients) {
      const uid = r.user_id as string;
      const dedup = `dispute-reminder:${deadline.id}:after:${uid}`;
      await sendInApp(supabase, dispute, uid, "dispute_deadline_passed", title, body, "normal", dedup);
      const emailAddr = (r.email_snapshot as string) || (r.email as string) || null;
      if (emailEnabled && emailAddr) {
        await sendEmail(supabase, dispute, { user_id: uid, email: emailAddr }, `${title} — ${caseRef}`, emailTemplate(caseRef, title, body, `Due ${formatDeadlineLabel(deadline)}`, ""), `email:${dedup}`, "dispute_deadline_passed");
      }
    }
  }
}

// Fans out reminders for a deadline using each recipient's own preferences.
async function enqueueForDeadline(supabase: Supabase, dispute: Record<string, unknown>, deadline: Record<string, unknown>, parties: Record<string, unknown>[]): Promise<void> {
  const actorUserId = deadline.actor_user_id as string | null;
  let recipients = parties;
  if (actorUserId) recipients = parties.filter((p) => p.user_id === actorUserId);
  if (recipients.length === 0) recipients = parties;

  for (const r of recipients) {
    const { data: pref } = await supabase.from("dispute_notification_preferences").select("*")
      .eq("user_id", r.user_id).eq("organisation_id", dispute.organisation_id).maybeSingle();
    await enqueueReminders(supabase, dispute, deadline, pref || DEFAULT_PREFS, [r]);
  }
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

    if (action === "get_workspace") {
      const disputeId = typeof body?.disputeId === "string" ? body.disputeId : "";
      if (!disputeId) return fail("disputeId is required");

      const { data: dispute } = await supabase.from("disputes").select("*").eq("id", disputeId).maybeSingle();
      if (!dispute) return fail("Dispute not found", 404);

      const isParty = dispute.claimant_user_id === user.id || dispute.respondent_user_id === user.id;
      if (!isParty) {
        const { data: admin } = await supabase.from("organisation_members").select("id")
          .eq("organisation_id", dispute.organisation_id).eq("user_id", user.id).eq("status", "active")
          .in("role", ["owner", "admin"]).maybeSingle();
        if (!admin) return fail("Access denied", 403);
      }

      await refreshDeadlines(supabase, dispute);

      const [{ data: deadlines }, { data: parties }, { data: notifications }, { data: prefs }] = await Promise.all([
        supabase.from("dispute_deadlines").select("*").eq("dispute_id", disputeId).order("due_at", { ascending: true }),
        supabase.from("dispute_parties").select("*").eq("dispute_id", disputeId),
        supabase.from("notifications").select("*").eq("related_entity_type", "dispute").eq("related_entity_id", disputeId)
          .eq("recipient_user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("dispute_notification_preferences").select("*")
          .eq("user_id", user.id).eq("organisation_id", dispute.organisation_id).maybeSingle(),
      ]);

      const userIds = [...new Set((parties || []).map((p) => p.user_id).filter(Boolean))];
      const { data: profiles } = await supabase.from("profiles").select("id, full_name").in("id", userIds);
      const nameMap: Record<string, string | null> = {};
      (profiles || []).forEach((p: { id: string; full_name: string | null }) => { nameMap[p.id] = p.full_name ?? null; });

      const deadlinesView = (deadlines || []).map((d: Record<string, unknown>) => ({
        ...d,
        actor_name: d.actor_user_id ? nameMap[d.actor_user_id as string] ?? null : null,
        time_remaining: ["completed", "cancelled", "superseded"].includes(d.status as string) ? null : timeRemaining(d.due_at as string),
        overdue: d.status === "overdue",
      }));

      for (const d of deadlines || []) {
        await enqueueForDeadline(supabase, dispute, d, parties || []);
      }

      const openDeadlines = deadlinesView.filter((d) => ["scheduled", "due_soon", "due_today", "overdue"].includes(d.status as string));
      const nextDeadline = openDeadlines[0] ?? null;
      const myPrefs = prefs || DEFAULT_PREFS;

      return ok({
        isParty,
        deadlines: deadlinesView,
        summary: {
          nextDeadline,
          openCount: openDeadlines.length,
          overdueCount: deadlinesView.filter((d) => d.overdue).length,
          completedCount: deadlinesView.filter((d) => d.status === "completed").length,
          totalCount: deadlinesView.length,
        },
        preferences: {
          id: (prefs?.id as string) ?? null,
          email_reminders_enabled: (myPrefs.email_reminders_enabled as boolean) ?? true,
          reminder_days: (myPrefs.reminder_days as number[]) ?? [7, 3, 1, 0],
          overdue_reminder_enabled: (myPrefs.overdue_reminder_enabled as boolean) ?? true,
        },
        notifications: (notifications || []).map((n: Record<string, unknown>) => ({
          id: n.id, notification_type: n.notification_type, category: n.category, title: n.title, body: n.body,
          priority: n.priority, action_route: n.action_route, action_label: n.action_label, read_at: n.read_at, created_at: n.created_at,
        })),
        unreadCount: (notifications || []).filter((n) => !n.read_at).length,
      });
    }

    if (action === "update_preferences") {
      const organisationId = typeof body?.organisationId === "string" ? body.organisationId : "";
      const emailRemindersEnabled = body?.emailRemindersEnabled === true;
      const overdueReminderEnabled = body?.overdueReminderEnabled !== false;
      const reminderDays: number[] = Array.isArray(body?.reminderDays)
        ? body.reminderDays.filter((d: number) => ALLOWED_REMINDER_DAYS.includes(d))
        : [7, 3, 1, 0];
      if (!organisationId) return fail("organisationId is required");

      const { data: existing } = await supabase.from("dispute_notification_preferences").select("id")
        .eq("user_id", user.id).eq("organisation_id", organisationId).maybeSingle();

      if (existing) {
        await supabase.from("dispute_notification_preferences").update({
          email_reminders_enabled: emailRemindersEnabled,
          overdue_reminder_enabled: overdueReminderEnabled,
          reminder_days: reminderDays,
          updated_at: new Date().toISOString(),
        }).eq("id", existing.id);
      } else {
        await supabase.from("dispute_notification_preferences").insert({
          user_id: user.id, organisation_id: organisationId,
          email_reminders_enabled: emailRemindersEnabled,
          overdue_reminder_enabled: overdueReminderEnabled,
          reminder_days: reminderDays,
        });
      }

      return ok({ preferences: { email_reminders_enabled: emailRemindersEnabled, reminder_days: reminderDays, overdue_reminder_enabled: overdueReminderEnabled } });
    }

    if (action === "run_sweep") {
      const { data: disputes } = await supabase.from("disputes").select("*").in("status", ACTIVE_STATUSES);
      let processed = 0;
      for (const d of disputes || []) {
        await refreshDeadlines(supabase, d);
        const { data: deadlines } = await supabase.from("dispute_deadlines").select("*").eq("dispute_id", d.id)
          .in("status", ["scheduled", "due_soon", "due_today", "overdue"]);
        const { data: parties } = await supabase.from("dispute_parties").select("*").eq("dispute_id", d.id);
        for (const deadline of deadlines || []) {
          await enqueueForDeadline(supabase, d, deadline, parties || []);
        }
        processed += 1;
      }
      return ok({ processed });
    }

    return fail("Unknown action");
  } catch (err) {
    console.error("dispute-notifications error:", err);
    return fail(err instanceof Error ? err.message : "Operation failed", 500);
  }
});
