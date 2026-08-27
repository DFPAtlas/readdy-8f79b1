# SiteLedger — UK Contractor Operating System

## 1. Project Description
SiteLedger is a contractor operating system designed for the UK construction and trades industry. It connects small contractors, main contractors, subcontractors and clients around one trusted project record. The platform replaces fragmented spreadsheets, paperwork and messaging with a single source of truth for every job.

**Target users:** Sole traders, small trade businesses, main contractors, subcontractors, domestic clients, commercial clients.

## 2. Page Structure
- `/` — Public marketing landing page (no auth) — hero with product mockup, features, how-it-works, product deep-dive, testimonials/stats, demo request form, footer with newsletter
- `/app` — Executive command center dashboard (protected) — portfolio KPI bar, commercial health matrix, pending approvals & statutory deadlines, live field feed, field-to-office ingestion hub, procurement/plant hire leakage, HMRC CIS status, quick-nav footer
- `/sign-in` — Authentication: sign in
- `/sign-up` — Authentication: create account
- `/forgot-password` — Authentication: password reset request
- `/reset-password` — Authentication: set new password
- `/verify-email` — Authentication: email verification
- `/accept-invite` — Authentication: accept organisation invitation
- `/jobs` — Jobs list and management (protected)
- `/jobs/new` — New job wizard (protected)
- `/jobs/:id` — Job detail workspace (protected)
- `/jobs/:id/timeline` — Project timeline (protected)
- `/jobs/:id/daily-logs` — Daily site logs (protected)
- `/jobs/:id/daily-logs/new` — New daily log wizard (protected)
- `/jobs/:id/evidence-pack` — Evidence pack builder (protected)
- `/workforce` — Workforce management (protected)
- `/workforce/invite` — Invite subcontractor wizard (protected)
- `/workforce/:personId` — Workforce profile / Work Passport (protected)
- `/clients` — Client directory (protected)
- `/clients/:clientId` — Client detail (protected)
- `/variations` — Variations workspace (protected)
- `/variations/new` — New variation wizard (protected)
- `/variations/:variationId` — Variation detail (protected)
- `/evidence` — Evidence workspace (protected)
- `/evidence/:evidenceId` — Evidence detail (protected)
- `/messages` — Communication centre / Inbox (protected)
- `/notifications` — Full notification centre (protected)
- `/settings/notifications` — Notification preferences (protected)
- `/settings/billing` — Billing and subscription management (protected)
- `/settings/billing/plan` — Change plan (protected)
- `/settings/billing/usage` — Usage metering (protected)
- `/settings/billing/success` — Stripe checkout success (protected)
- `/settings/billing/cancelled` — Stripe checkout cancelled (protected)
- `/settings/communications` — Admin delivery monitor (protected)
- `/settings/ai-automation` — AI & Automation settings (protected)
- `/settings/devices` — Device management (protected)
- `/settings/mobile-offline` — Mobile & offline admin policy (protected)
- `/payments` — Payments workspace (protected, placeholder)
- `/retention` — Retention lifecycle & milestone release scheduler (protected)
- `/procurement` — Material procurement & supplier financials portal (protected, consolidated PO / requisition / 3-way match / hire)
- `/compliance` — Compliance workspace (protected, placeholder)
- `/client/:accessToken` — Client & Property Owner Project Hub (public, token-based) — welcome header, KPI progress metrics, six-phase timeline, variation sign-off (VO-004), certified payment schedule, live site feed, document library, assigned team, security footer
- `/client/:accessToken/variations/:variationId` — Client variation detail (public)
- `/contractor/invite/:token` — Public contractor onboarding (public)
- `/site/:jobId/capture` — Mobile site capture (protected)
- `/platform-admin/login` — Platform admin authentication (public, MFA-gated)
- `/platform-admin/mfa` — Platform admin MFA challenge (public)
- `/platform-admin` — Platform administration dashboard (platform-staff only, aal2)
- `/platform-admin/organisations` — Organisation management (platform-staff)
- `/platform-admin/users` — User management (platform-staff)
- `/platform-admin/support` — Support cases (platform-staff)
- `/platform-admin/access-requests` — Access requests and grants (platform-staff)
- `/platform-admin/security` — Security centre (platform-staff)
- `/platform-admin/audit` — Platform audit log (platform-staff)
- `/platform-admin/communications` — Announcements and delivery ops (platform-staff)
- `/platform-admin/feature-flags` — Feature flag management (platform-owner/admin)
- `/platform-admin/system` — System health and infrastructure (platform-staff)
- `/platform-admin/ai-monitor` — AI monitoring dashboard (platform-staff)
- `/pricing` — Public pricing page (public, no auth)
- `/platform-admin/billing` — Billing dashboard (platform-staff)
- `/platform-admin/billing/plans` — Plan catalogue management (platform-staff)
- `/platform-admin/billing/subscriptions` — Subscription management (platform-staff)
- `/platform-admin/billing/events` — Webhook event log (platform-staff)
- `/platform-admin/billing/discounts` — Discount references (platform-staff)
- `/app/settings/integrations` — Integration hub (protected)
- `/app/settings/integrations/accounting` — Accounting settings (protected)
- `/app/settings/integrations/:connectionId` — Connection detail (protected)
- `/app/settings/integrations/mappings` — Entity mappings (protected)
- `/app/settings/integrations/sync-history` — Sync history log (protected)
- `/app/settings/integrations/reconciliation` — Reconciliation workspace (protected)
- `/app/settings/integrations/import-export` — CSV import/export (protected)
- `/platform-admin/integrations` — Platform integration monitor (platform-staff)
- `/platform-admin/integrations/providers` — Provider management (platform-staff)
- `/platform-admin/integrations/failures` — Sync failure monitoring (platform-staff)

## 3. Core Features
- [x] Phase 1: Application shell with sidebar, top bar, mobile nav
- [x] Phase 1: Dashboard with summary cards, live jobs, needs attention, today on site
- [x] Phase 2: Jobs workspace with list/grid views, new job wizard, job detail with tabs
- [x] Phase 3: Workforce workspace, contractor work passport, subcontractor invitations, document expiry tracking
- [x] Phase 4: Clients workspace, client detail, secure project portal, variation creation and approval
- [x] Phase 5: Site evidence, daily logs, project timeline, mobile capture, evidence packs, delay/instruction records
- [x] Phase 7: Supabase production foundation, authentication, multi-tenant security, database schema, RLS, service layer
- [x] Phase 8: Communication centre, notifications, automated reminders, message inbox, email delivery system
- [x] Phase 9: Reports & analytics — overview dashboard, job performance, commercial, cash flow, client performance, workforce, site activity, compliance, report builder, saved/scheduled reports, individual job reports
- [x] Phase 13: Platform administration — separate MFA-protected control plane with platform roles, organisation/user management, support access, emergency break-glass, immutable audit log, feature flags, announcements, security centre

- [x] Phase 14: Stripe subscription billing — pricing page, plan catalogue, Stripe Checkout, Customer Portal, webhook handler, entitlements, usage metering, invoice history, platform admin billing dashboard
- [x] Phase 15: Suppliers, procurement and materials management — 35 database tables, supplier directory, materials catalogue, purchase requisitions with approval rules, RFQ management, purchase orders with versioning, goods receipts and delivery issues, supplier returns, inventory with locations and stock movements, material allocations, plant and tool hire, supplier invoice matching (2-way and 3-way), procurement dashboard with committed vs actual cost tracking
- [x] Phase 16: Accounting integrations, sync engine and reconciliation — 15 database tables with RLS, 7 integration providers (Xero, QuickBooks, Sage, FreeAgent, Companies House, HMRC CIS, CSV), OAuth 2.0 edge function (accounting-oauth), Companies House lookup edge function, sync engine edge function with queue and idempotency, integration hub with provider cards and connection management, connection detail with sync configuration, entity mappings (accounts/tax/tracking), sync history viewer, reconciliation workspace with category filtering, CSV import/export, accounting settings page, 3 platform admin integration monitoring pages
- [x] Phase 17: Mobile PWA and offline site working — PWA manifest, versioned service worker with app shell caching, offline fallback page, install handling, connectivity context, IndexedDB service layer (tenant-scoped, versioned stores for job packs, mutations, cached data, uploads, device meta), 11 new database tables with RLS (registered_devices, device_organisation_grants, offline_job_packs, offline_mutations, mutation_receipts, sync_conflicts, upload_sessions, push_subscriptions, app_versions, device_sync_state, organisation_mobile_config), mobile site mode with bottom navigation (Today, Jobs, Capture, Tasks, More), mobile Today page with clock-in/out, tasks, safety actions, site visits, messages, emergency info, job site mode with tabbed view (Overview, People, Tasks, Safety, Evidence), sync centre with connection status, queued items, uploads, conflicts, device management with revoke, offline jobs management with download/remove/storage quota, desktop device settings page, desktop mobile & offline policy admin page, organisation mobile config with feature toggles and limits
- [x] Phase 18: AI Assistant and Document Intelligence — 16 new database tables with RLS (ai_organisation_settings, ai_provider_configs, ai_conversations, ai_messages, ai_runs, ai_run_sources, ai_feedback, document_ingestion_jobs, document_extractions, document_extracted_fields, document_chunks, embedding_jobs, ai_usage_ledger, ai_budget_limits, ai_prompt_templates, ai_draft_links), 6 new enums, 38 indexes, SiteLedger Assist edge function (site-ledger-assist) with RAG, chat, conversations, feedback, settings, usage monitoring, prompt injection detection, emergency pattern detection, budget enforcement, output sanitisation, global Assist panel (desktop resizable panel + mobile full-height sheet) with conversation history, source citations, feedback, contextual scope, AI & Automation admin settings page (feature toggles, budget, role-based access, redaction rules, data controls, privacy notice), platform admin AI monitoring page (aggregate adoption, runs, cost, safety blocks, queue health, feedback overview), AI & Automation sidebar nav entry, Assist button in TopBar, 5 seeded prompt templates (job briefing, document Q&A, invoice extraction, certificate extraction, RAMS extraction), OpenAI provider config seeded

## 4. Data Model Design

### Supabase Database Schema (Phase 7)
All tables are in the `public` schema with Row Level Security enabled. Every tenant-owned table includes `organisation_id` for multi-tenancy.

#### Auth & Profiles
| Table | Description |
|-------|-------------|
| profiles | Extended user profile (references auth.users) |
| organisations | Multi-tenant organisations |
| organisation_members | Membership with roles (owner, admin, PM, supervisor, finance, employee) |

#### Clients & Jobs
| Table | Description |
|-------|-------------|
| clients | Client records (individual/business) |
| client_contacts | Multiple contacts per client |
| jobs | Projects with full scope, commercial, programme data |
| job_members | Team assignments per job |
| job_client_contacts | Client contact links to specific jobs |

#### Workforce
| Table | Description |
|-------|-------------|
| workforce_people | Worker/subcontractor records |
| workforce_assignments | Job assignments |
| qualifications | Trade qualifications with expiry |
| insurance_policies | Insurance with expiry tracking |
| workforce_documents | Compliance documents |
| passport_checks | Per-person readiness checks |

#### Site Records
| Table | Description |
|-------|-------------|
| daily_logs | Daily site activity logs |
| daily_log_labour | Labour hours per log |
| daily_log_deliveries | Delivery records per log |
| evidence_records | Photos, videos, notes, instructions |
| evidence_files | File metadata for storage objects |
| timeline_events | Chronological project events |
| project_documents | General project files |

#### Commercial
| Table | Description |
|-------|-------------|
| variations | Variation orders with versioning |
| variation_versions | Immutable variation history |
| variation_responses | Client approvals/declines |
| payment_applications | Applications for payment |
| cis_records | CIS deduction tracking |
| retention_records | Retention money tracking |

#### Access & Governance
| Table | Description |
|-------|-------------|
| invitations | Secure invitation tokens |
| portal_access | Active portal grants |
| audit_events | Immutable audit trail |
| notifications | User notifications |

#### Billing (Phase 14)
| Table | Description |
|-------|-------------|
| billing_plans | Plan catalogue with keys, trials, status |
| billing_plan_prices | Stripe Price ID mappings per plan/interval |
| billing_features | Feature definitions for entitlement checks |
| billing_plan_entitlements | Plan-to-feature mappings with limits |
| organisation_billing_customers | One Stripe Customer per organisation |
| organisation_subscriptions | Current subscription state per org |
| organisation_entitlements | Active entitlement snapshot per org |
| organisation_usage_snapshots | Usage metering data |
| billing_checkout_attempts | Audit trail for checkout sessions |
| billing_invoices | Stripe invoice mirror |
| billing_webhook_events | Stripe webhook event processing log |
| billing_status_history | Subscription status change audit |
| billing_trial_history | Trial tracking per org |
| billing_discount_references | Promotion code references |


| Table | Description |
|-------|-------------|
| saved_reports | Saved report configurations |
| report_schedules | Scheduled report delivery |
| report_runs | Record of every report generation |
| report_snapshots | Immutable issued report versions |
| report_exports | Export audit governance log |
| report_recipients | Scheduled report recipient list |
| Table | Description |
|-------|-------------|
| conversations | Organised message threads |
| conversation_participants | Who has access to each conversation |
| messages | Individual messages within conversations |
| message_attachments | Files attached to messages |
| message_mentions | @mentions within messages |
| notification_preferences | Per-user, per-category delivery settings |
| notification_outbox | Outbound email queue with retry |
| notification_templates | Reusable email templates |

### Key Design Decisions
- **Money**: Stored as integer pence (minor units), never floats
- **Currency**: ISO codes, default GBP
- **Keys**: UUID primary keys throughout
- **Timestamps**: `timestamptz` for all temporal data
- **Soft delete**: `archived_at` for recoverable archiving
- **Versioning**: Commercial records versioned, never silently overwritten
- **RLS**: Every table protected; authentication alone is not authorisation

## 5. Backend / Third-party Integration Plan
- **Supabase**: Authentication, database, storage, RLS — Phase 7 foundation
- **Stripe**: Payment processing (future)
- **Shopify**: Not required
- **Resend**: Email notifications (future)

## 6. Development Phase Plan

### Phase 1-6: Complete (see history)

### Phase 7: Supabase Production Foundation
- Goal: Connect to Supabase, implement auth, multi-tenancy, database schema, RLS, service layer
- Deliverable: Production-ready security architecture with typed services, SQL migrations, and auth flows
- Status: Code complete — pending Supabase connection to execute migrations

### Phase 8: Communication Centre and Notifications
- Goal: Build complete communication system with conversations, notifications, email delivery, and automated reminders
- Deliverable: Messages inbox, notification centre, notification preferences, admin delivery monitor, email edge function, reminder rules
- Status: Code complete — pending Supabase connection for real-time and email delivery

### Phase 9: Production Data Migration
- Goal: Replace all demo/mock data with Supabase queries across all pages
- Deliverable: Full CRUD operations with loading/error/empty states

### Phase 9: Reporting & Analytics ✅
- Goal: Turn operational records into management information with reports, charts, builder and export capability
- Deliverable: Full reporting suite with 11 report pages, report builder, saved/scheduled reports, coverage calendar, cash flow forecast, job health, client performance, subcontractor performance, compliance drill-down
- Status: Code complete — demo data powers all reports

### Phase 9+: Incremental feature additions per roadmap

### Phase 13: Platform Administration ✅
- Goal: Create separate MFA-protected platform control plane with roles, permissions, audit
- Deliverable: 13 database tables, 12 admin pages, platform auth guard, admin layout, edge function, roles, MFA enforcement
- Status: Code complete — 15 tables in Supabase with RLS, edge function deployed