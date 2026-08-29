import type { RouteObject } from "react-router-dom";
import { Outlet, Navigate } from "react-router-dom";
import NotFound from "@/pages/NotFound";
import Home from "@/pages/home/page";
import LandingPage from "@/pages/landing/page";
import DashboardLayout from "@/components/feature/DashboardLayout";
import AuthGuard from "@/components/feature/AuthGuard";
import PlatformAdminGuard from "@/components/feature/PlatformAdminGuard";
import PlatformAdminLayout from "@/components/feature/PlatformAdminLayout";
import JobsWorkspace from "@/pages/jobs/page";
import NewJobWizard from "@/pages/jobs/new/page";
import JobDetail from "@/pages/jobs/detail/page";
import WorkforceWorkspace from "@/pages/workforce/page";
import InviteSubcontractor from "@/pages/workforce/invite/page";
import WorkforceProfile from "@/pages/workforce/profile/page";
import ContractorOnboard from "@/pages/contractor/onboard/page";
import ClientsWorkspace from "@/pages/clients/page";
import ClientDetail from "@/pages/clients/detail/page";
import VariationsWorkspace from "@/pages/variations/page";
import NewVariationWizard from "@/pages/variations/new/page";
import VariationDetail from "@/pages/variations/detail/page";
import ClientPortal from "@/pages/portal/page";
import FullSchedulePage from "@/pages/portal/schedule/page";
import ClientVariationDetail from "@/pages/portal/variation/page";
import ValuationsLedger from "@/pages/portal/valuations-ledger/page";
import DisputeResolutionCentre from "@/pages/disputes/page";
import DisputeDetailPage from "@/pages/disputes/detail/page";
import RaiseDisputePage from "@/pages/disputes/new/page";
import LegalGuidancePage from "@/pages/disputes/legal-guidance/page";
import EvidenceWorkspace from "@/pages/evidence/page";
import EvidenceDetail from "@/pages/evidence/detail/page";
import SiteCapture from "@/pages/capture/page";
import JobTimeline from "@/pages/jobs/timeline/page";
import DailyLogsList from "@/pages/jobs/dailylogs/page";
import NewDailyLog from "@/pages/jobs/dailylogs/new/page";
import EvidencePack from "@/pages/jobs/pack/page";
import SignInPage from "@/pages/auth/sign-in/page";
import SignUpPage from "@/pages/auth/sign-up/page";
import ForgotPasswordPage from "@/pages/auth/forgot-password/page";
import ResetPasswordPage from "@/pages/auth/reset-password/page";
import VerifyEmailPage from "@/pages/auth/verify-email/page";
import AuthConfirmedPage from "@/pages/auth/confirmed/page";
import AcceptInvitePage from "@/pages/auth/accept-invite/page";
import NotificationsPage from "@/pages/notifications/page";
import MessagesPage from "@/pages/messages/page";
import NotificationPreferencesPage from "@/pages/settings/notifications/page";
import CommunicationsAdminPage from "@/pages/settings/communications/page";
import ReportsOverview from "@/pages/reports/overview/page";
import JobPerformanceReport from "@/pages/reports/jobs/page";
import CommercialReport from "@/pages/reports/commercial/page";
import CashFlowReport from "@/pages/reports/cash-flow/page";
import ClientPerformanceReport from "@/pages/reports/clients/page";
import WorkforceReport from "@/pages/reports/workforce/page";
import SiteActivityReport from "@/pages/reports/site-activity/page";
import ComplianceReport from "@/pages/reports/compliance/page";
import ReportBuilder from "@/pages/reports/builder/page";
import SavedReports from "@/pages/reports/saved/page";
import ScheduledReports from "@/pages/reports/scheduled/page";
import JobReport from "@/pages/jobs/reports/page";
import PlatformAdminLogin from "@/pages/platform-admin/login/page";
import PlatformAdminMfa from "@/pages/platform-admin/mfa/page";
import PlatformDashboard from "@/pages/platform-admin/dashboard/page";
import PlatformOrganisations from "@/pages/platform-admin/organisations/page";
import PlatformUsers from "@/pages/platform-admin/users/page";
import PlatformSupport from "@/pages/platform-admin/support/page";
import PlatformAccessRequests from "@/pages/platform-admin/access-requests/page";
import PlatformSecurity from "@/pages/platform-admin/security/page";
import PlatformAudit from "@/pages/platform-admin/audit/page";
import PlatformDisputesPage from "@/pages/platform-admin/disputes/page";
import PlatformDisputeCasePage from "@/pages/platform-admin/disputes/case/page";
import PlatformDisputesLaunchReadiness from "@/pages/platform-admin/disputes/launch-readiness/page";
import PlatformCommunications from "@/pages/platform-admin/communications/page";
import PlatformFeatureFlags from "@/pages/platform-admin/feature-flags/page";
import PlatformSystem from "@/pages/platform-admin/system/page";
import PlatformSettings from "@/pages/platform-admin/settings/page";
import PlatformBillingDashboard from "@/pages/platform-admin/billing/page";
import PlatformBillingPlans from "@/pages/platform-admin/billing/plans/page";
import PlatformBillingSubscriptions from "@/pages/platform-admin/billing/subscriptions/page";
import PlatformBillingEvents from "@/pages/platform-admin/billing/events/page";
import PlatformBillingDiscounts from "@/pages/platform-admin/billing/discounts/page";
import PricingPage from "@/pages/pricing/page";
import PrivacyPolicyPage from "@/pages/legal/privacy/page";
import TermsOfServicePage from "@/pages/legal/terms/page";
import SecurityPage from "@/pages/legal/security/page";
import CookiePolicyPage from "@/pages/legal/cookies/page";
import LegalCentrePage from "@/pages/legal/page";
import AcceptableUsePage from "@/pages/legal/acceptable-use/page";
import BillingPolicyPage from "@/pages/legal/billing/page";
import CompanyInformationPage from "@/pages/legal/company-information/page";
import DpaPage from "@/pages/legal/dpa/page";
import SubprocessorsPage from "@/pages/legal/subprocessors/page";
import DataRetentionPage from "@/pages/legal/data-retention/page";
import AiPolicyPage from "@/pages/legal/ai/page";
import VulnerabilityDisclosurePage from "@/pages/legal/vulnerability-disclosure/page";
import AccessibilityPage from "@/pages/legal/accessibility/page";
import BillingSettingsPage from "@/pages/settings/billing/page";
import BillingPlanPage from "@/pages/settings/billing/plan/page";
import BillingUsagePage from "@/pages/settings/billing/usage/page";
import BillingSuccessPage from "@/pages/settings/billing/success/page";
import BillingCancelledPage from "@/pages/settings/billing/cancelled/page";
import BillingInvoicesPage from "@/pages/settings/billing/invoices/page";
import JobPayments from "@/pages/jobs/payments/page";
import ProcurementDashboard from "@/pages/procurement/dashboard/page";
import SuppliersDirectory from "@/pages/procurement/suppliers/page";
import ProcurementRequisitions from "@/pages/procurement/requisitions/page";
import ProcurementRFQs from "@/pages/procurement/rfqs/page";
import ProcurementPurchaseOrders from "@/pages/procurement/purchase-orders/page";
import ProcurementDeliveries from "@/pages/procurement/deliveries/page";
import ProcurementMaterials from "@/pages/procurement/materials/page";
import ProcurementInventory from "@/pages/procurement/inventory/page";
import ProcurementHire from "@/pages/procurement/hire/page";
import ProcurementSupplierInvoices from "@/pages/procurement/supplier-invoices/page";
import ProcurementReturns from "@/pages/procurement/returns/page";
import ProcurementTemplates from "@/pages/procurement/templates/page";
import IntegrationsHub from "@/pages/settings/integrations/page";
import ConnectionDetail from "@/pages/settings/integrations/connection/page";
import IntegrationMappings from "@/pages/settings/integrations/mappings/page";
import SyncHistoryPage from "@/pages/settings/integrations/sync-history/page";
import ReconciliationPage from "@/pages/settings/integrations/reconciliation/page";
import ImportExportPage from "@/pages/settings/integrations/import-export/page";
import AccountingSettingsPage from "@/pages/settings/integrations/accounting/page";
import PlatformIntegrationsDashboard from "@/pages/platform-admin/integrations/page";
import PlatformIntegrationProviders from "@/pages/platform-admin/integrations/providers/page";
import PlatformIntegrationFailures from "@/pages/platform-admin/integrations/failures/page";
// Phase 17 — Mobile PWA & Offline
import MobileTodayPage from "@/pages/mobile/today/page";
import MobileFieldPage from "@/pages/mobile/field/page";
import MobileJobsPage from "@/pages/mobile/jobs/page";
import MobileJobSitePage from "@/pages/mobile/jobs/site/page";
import MobileTasksPage from "@/pages/mobile/tasks/page";
import MobileMorePage from "@/pages/mobile/more/page";
import MobileSyncPage from "@/pages/mobile/sync/page";
import MobileDevicePage from "@/pages/mobile/devices/page";
import MobileAdminPage from "@/pages/mobile/admin/page";
import OfflineJobsPage from "@/pages/mobile/offline-jobs/page";
import DesktopDeviceSettingsPage from "@/pages/settings/devices/page";
import DesktopMobileAdminPage from "@/pages/settings/mobile-offline/page";
// Phase 18 — AI Assistant & Document Intelligence
import AiAutomationSettingsPage from "@/pages/settings/ai-automation/page";
import PlatformAiMonitorPage from "@/pages/platform-admin/ai-monitor/page";
import DocumentIngestionPage from "@/pages/documents/ingestion/page";
import CompliancePage from "@/pages/compliance/page";
import PaymentsPage from "@/pages/payments/page";
import RetentionLifecyclePage from "@/pages/retention/page";
import ProcurementPortal from "@/pages/procurement/portal/page";
import DeadlinesPage from "@/pages/deadlines/page";

const ProtectedLayout = () => (
  <AuthGuard>
    <DashboardLayout>
      <Outlet />
    </DashboardLayout>
  </AuthGuard>
);

const routes: RouteObject[] = [
  // Public routes (no auth required)
  { path: "/", element: <LandingPage /> },
  { path: "/pricing", element: <PricingPage /> },
  { path: "/legal", element: <LegalCentrePage /> },
  { path: "/legal/terms", element: <TermsOfServicePage /> },
  { path: "/legal/acceptable-use", element: <AcceptableUsePage /> },
  { path: "/legal/billing", element: <BillingPolicyPage /> },
  { path: "/legal/company-information", element: <CompanyInformationPage /> },
  { path: "/legal/privacy", element: <PrivacyPolicyPage /> },
  { path: "/legal/cookies", element: <CookiePolicyPage /> },
  { path: "/legal/dpa", element: <DpaPage /> },
  { path: "/legal/subprocessors", element: <SubprocessorsPage /> },
  { path: "/legal/data-retention", element: <DataRetentionPage /> },
  { path: "/legal/security", element: <SecurityPage /> },
  { path: "/legal/ai", element: <AiPolicyPage /> },
  { path: "/legal/vulnerability-disclosure", element: <VulnerabilityDisclosurePage /> },
  { path: "/legal/accessibility", element: <AccessibilityPage /> },

  // Legacy redirects from previous top-level legal routes
  { path: "/privacy", element: <Navigate to="/legal/privacy" replace /> },
  { path: "/terms", element: <Navigate to="/legal/terms" replace /> },
  { path: "/security", element: <Navigate to="/legal/security" replace /> },
  { path: "/cookies", element: <Navigate to="/legal/cookies" replace /> },

  // Public auth routes
  { path: "/sign-in", element: <SignInPage /> },
  { path: "/sign-up", element: <SignUpPage /> },
  { path: "/forgot-password", element: <ForgotPasswordPage /> },
  { path: "/reset-password", element: <ResetPasswordPage /> },
  { path: "/verify-email", element: <VerifyEmailPage /> },
  { path: "/auth/confirmed", element: <AuthConfirmedPage /> },
  { path: "/accept-invite", element: <AcceptInvitePage /> },

  // Platform Admin — public login/MFA
  { path: "/platform-admin/login", element: <PlatformAdminLogin /> },
  { path: "/platform-admin/mfa", element: <PlatformAdminMfa /> },

  // Platform Admin — protected routes
  {
    path: "/platform-admin",
    element: (
      <PlatformAdminGuard>
        <PlatformAdminLayout />
      </PlatformAdminGuard>
    ),
    children: [
      { index: true, element: <PlatformDashboard /> },
      { path: "organisations", element: <PlatformOrganisations /> },
      { path: "users", element: <PlatformUsers /> },
      { path: "support", element: <PlatformSupport /> },
      { path: "access-requests", element: <PlatformAccessRequests /> },
      { path: "security", element: <PlatformSecurity /> },
      { path: "audit", element: <PlatformAudit /> },
      { path: "disputes", element: <PlatformDisputesPage /> },
      { path: "disputes/launch-readiness", element: <PlatformDisputesLaunchReadiness /> },
      { path: "disputes/:disputeId", element: <PlatformDisputeCasePage /> },
      { path: "communications", element: <PlatformCommunications /> },
      { path: "feature-flags", element: <PlatformFeatureFlags /> },
      { path: "system", element: <PlatformSystem /> },
      { path: "settings", element: <PlatformSettings /> },
      { path: "ai-monitor", element: <PlatformAiMonitorPage /> },
      {
        path: "integrations",
        children: [
          { index: true, element: <PlatformIntegrationsDashboard /> },
          { path: "providers", element: <PlatformIntegrationProviders /> },
          { path: "failures", element: <PlatformIntegrationFailures /> },
        ],
      },
      {
        path: "billing",
        children: [
          { index: true, element: <PlatformBillingDashboard /> },
          { path: "plans", element: <PlatformBillingPlans /> },
          { path: "subscriptions", element: <PlatformBillingSubscriptions /> },
          { path: "events", element: <PlatformBillingEvents /> },
          { path: "discounts", element: <PlatformBillingDiscounts /> },
        ],
      },
    ],
  },

  // Public contractor onboarding (token-based access)
  { path: "/contractor/invite/:token", element: <ContractorOnboard /> },

  // Public client portal (token-based access)
  { path: "/client/:accessToken", element: <ClientPortal /> },
  { path: "/client/:accessToken/schedule", element: <FullSchedulePage /> },
  { path: "/client/:accessToken/variations/:variationId", element: <ClientVariationDetail /> },
  { path: "/client/:accessToken/valuations-ledger", element: <ValuationsLedger /> },

  // Mobile site capture (protected)
  {
    path: "/site/:jobId/capture",
    element: <AuthGuard><SiteCapture /></AuthGuard>,
  },

  // Mobile site mode routes (protected, no sidebar layout)
  {
    path: "/mobile",
    element: <AuthGuard><Outlet /></AuthGuard>,
    children: [
      { index: true, element: <MobileTodayPage /> },
      { path: "today", element: <MobileTodayPage /> },
      { path: "field", element: <MobileFieldPage /> },
      { path: "jobs", element: <MobileJobsPage /> },
      { path: "jobs/:jobId", element: <MobileJobSitePage /> },
      { path: "tasks", element: <MobileTasksPage /> },
      { path: "more", element: <MobileMorePage /> },
      { path: "sync", element: <MobileSyncPage /> },
      { path: "devices", element: <MobileDevicePage /> },
      { path: "admin", element: <MobileAdminPage /> },
      { path: "offline-jobs", element: <OfflineJobsPage /> },
    ],
  },

  // All protected dashboard routes
  {
    element: <ProtectedLayout />,
    children: [
      { path: "/app", element: <Home /> },
      {
        path: "/jobs",
        children: [
          { index: true, element: <JobsWorkspace /> },
          { path: "new", element: <NewJobWizard /> },
          { path: ":jobId", element: <JobDetail /> },
          { path: ":jobId/timeline", element: <JobTimeline /> },
          { path: ":jobId/daily-logs", element: <DailyLogsList /> },
          { path: ":jobId/daily-logs/new", element: <NewDailyLog /> },
          { path: ":jobId/evidence-pack", element: <EvidencePack /> },
          { path: ":jobId/reports", element: <JobReport /> },
          { path: ":jobId/payments", element: <JobPayments /> },
        ],
      },
      {
        path: "/workforce",
        children: [
          { index: true, element: <WorkforceWorkspace /> },
          { path: "invite", element: <InviteSubcontractor /> },
          { path: ":personId", element: <WorkforceProfile /> },
          { path: ":personId/edit", element: <WorkforceProfile /> },
        ],
      },
      {
        path: "/clients",
        children: [
          { index: true, element: <ClientsWorkspace /> },
          { path: ":clientId", element: <ClientDetail /> },
        ],
      },
      {
        path: "/variations",
        children: [
          { index: true, element: <VariationsWorkspace /> },
          { path: "new", element: <NewVariationWizard /> },
          { path: ":variationId", element: <VariationDetail /> },
        ],
      },
      {
        path: "/evidence",
        children: [
          { index: true, element: <EvidenceWorkspace /> },
          { path: ":evidenceId", element: <EvidenceDetail /> },
        ],
      },
      {
        path: "/disputes",
        children: [
          { index: true, element: <DisputeResolutionCentre /> },
          { path: "new", element: <RaiseDisputePage /> },
          { path: "legal-guidance", element: <LegalGuidancePage /> },
          { path: ":disputeId", element: <DisputeDetailPage /> },
        ],
      },
      {
        path: "/payments",
        element: <PaymentsPage />,
      },
      {
        path: "/retention",
        element: <RetentionLifecyclePage />,
      },
      {
        path: "/deadlines",
        element: <DeadlinesPage />,
      },
      {
        path: "/procurement",
        element: <ProcurementPortal />,
      },
      {
        path: "/messages",
        element: <MessagesPage />,
      },
      {
        path: "/notifications",
        element: <NotificationsPage />,
      },
      {
        path: "/settings",
        children: [
          { path: "notifications", element: <NotificationPreferencesPage /> },
          { path: "communications", element: <CommunicationsAdminPage /> },
          { path: "devices", element: <DesktopDeviceSettingsPage /> },
          { path: "mobile-offline", element: <DesktopMobileAdminPage /> },
          { path: "ai-automation", element: <AiAutomationSettingsPage /> },
        ],
      },
      {
        path: "/app/documents/ingestion",
        element: <DocumentIngestionPage />,
      },
      {
        path: "/app/settings/billing",
        children: [
          { index: true, element: <BillingSettingsPage /> },
          { path: "plan", element: <BillingPlanPage /> },
          { path: "usage", element: <BillingUsagePage /> },
          { path: "invoices", element: <BillingInvoicesPage /> },
          { path: "success", element: <BillingSuccessPage /> },
          { path: "cancelled", element: <BillingCancelledPage /> },
        ],
      },
      {
        path: "/app/settings/integrations",
        children: [
          { index: true, element: <IntegrationsHub /> },
          { path: "accounting", element: <AccountingSettingsPage /> },
          { path: ":connectionId", element: <ConnectionDetail /> },
          { path: "mappings", element: <IntegrationMappings /> },
          { path: "sync-history", element: <SyncHistoryPage /> },
          { path: "reconciliation", element: <ReconciliationPage /> },
          { path: "import-export", element: <ImportExportPage /> },
        ],
      },
      {
        path: "/compliance",
        element: <CompliancePage />,
      },
      {
        path: "/app/procurement",
        children: [
          { index: true, element: <ProcurementDashboard /> },
          { path: "requisitions", element: <ProcurementRequisitions /> },
          { path: "rfqs", element: <ProcurementRFQs /> },
          { path: "purchase-orders", element: <ProcurementPurchaseOrders /> },
          { path: "deliveries", element: <ProcurementDeliveries /> },
          { path: "materials", element: <ProcurementMaterials /> },
          { path: "inventory", element: <ProcurementInventory /> },
          { path: "hire", element: <ProcurementHire /> },
          { path: "supplier-invoices", element: <ProcurementSupplierInvoices /> },
          { path: "returns", element: <ProcurementReturns /> },
          { path: "templates", element: <ProcurementTemplates /> },
        ],
      },
      { path: "/app/suppliers", element: <SuppliersDirectory /> },
      {
        path: "/reports",
        children: [
          { index: true, element: <ReportsOverview /> },
          { path: "jobs", element: <JobPerformanceReport /> },
          { path: "commercial", element: <CommercialReport /> },
          { path: "cash-flow", element: <CashFlowReport /> },
          { path: "clients", element: <ClientPerformanceReport /> },
          { path: "workforce", element: <WorkforceReport /> },
          { path: "site-activity", element: <SiteActivityReport /> },
          { path: "compliance", element: <ComplianceReport /> },
          { path: "builder", element: <ReportBuilder /> },
          { path: "saved", element: <SavedReports /> },
          { path: "scheduled", element: <ScheduledReports /> },
        ],
      },
    ],
  },

  {
    path: "*",
    element: <NotFound />,
  },
];

export default routes;