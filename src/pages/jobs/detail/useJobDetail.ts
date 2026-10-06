import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/contexts/OrgContext';
import { jobsService, type JobMember } from '@/services/jobs.service';
import { clientsService } from '@/services/clients.service';
import { evidenceService } from '@/services/evidence.service';
import { timelineService } from '@/services/timeline.service';
import { variationsService } from '@/services/variations.service';
import { documentsService } from '@/services/documents.service';
import { paymentApplicationsService } from '@/services/payment-applications.service';
import { mapJobRowToFullJob } from './job-detail.adapter';
import { buildDemoJobDetail } from './job-detail.demo';
import {
  emptyJobDetailData,
  type DocumentView,
  type JobDetailData,
  type JobDetailState,
  type PanelErrors,
  type VariationView,
} from './job-detail.types';
import type { Database } from '@/types/supabase';

type PaymentApplication = Awaited<ReturnType<typeof paymentApplicationsService.getByJob>>[number];

const APPROVED_VARIATION_STATUSES = ['approved', 'invoiced'];
const INVOICED_PAYMENT_STATUSES = ['submitted', 'certified', 'paid'];
const CERTIFIED_PAYMENT_STATUSES = ['certified', 'paid'];

const initialState: JobDetailState = {
  status: 'loading',
  job: null,
  data: null,
  isDemo: false,
  error: null,
};

export interface UseJobDetailResult extends JobDetailState {
  reload: () => void;
}

/**
 * Loads everything the job detail page needs, in the correct order:
 * authentication → active organisation → the job record → its panels.
 *
 * While any of these resolve the page stays in a loading state, so a
 * "Job not found" message can never flash before the record has loaded.
 * Real jobs load from the backend only — demonstration data is never used.
 */
export function useJobDetail(jobId: string | undefined): UseJobDetailResult {
  const { user } = useAuth();
  const { organisation, status: orgStatus, refreshOrganisations } = useOrg();
  const orgId = organisation?.id ?? null;
  const userId = user?.id ?? null;

  const [state, setState] = useState<JobDetailState>(initialState);
  const [refreshKey, setRefreshKey] = useState(0);

  const reload = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    // Always clear the previous job's data when switching jobs.
    setState(initialState);

    if (!jobId) {
      setState({ status: 'notfound', job: null, data: null, isDemo: false, error: null });
      return undefined;
    }

    // Built-in demo jobs use their own scoped demonstration data.
    const demo = buildDemoJobDetail(jobId);
    if (demo) {
      setState({ status: 'ready', job: demo.job, data: demo.data, isDemo: true, error: null });
      return undefined;
    }

    if (!userId) return undefined; // AuthGuard will resolve
    if (orgStatus === 'loading') return undefined; // keep showing loading
    if (orgStatus === 'error') {
      setState({
        status: 'error',
        job: null,
        data: null,
        isDemo: false,
        error: 'Your organisation could not be loaded.',
      });
      return undefined;
    }
    if (orgStatus === 'empty' || !orgId) {
      setState({ status: 'no-org', job: null, data: null, isDemo: false, error: null });
      return undefined;
    }

    (async () => {
      try {
        const row = await jobsService.getJob(jobId, orgId);
        if (cancelled) return;

        if (!row) {
          setState({ status: 'notfound', job: null, data: null, isDemo: false, error: null });
          return;
        }

        const clientId = row.client_id ?? null;
        const results = await Promise.allSettled([
          clientId ? clientsService.getClient(clientId, orgId) : Promise.resolve(null),
          jobsService.getJobMembers(orgId),
          evidenceService.listByJob(orgId, jobId),
          timelineService.listByJob(orgId, jobId),
          variationsService.getVariations(orgId, jobId),
          documentsService.getProjectDocuments(orgId, jobId),
          documentsService.getContractTerms(orgId, jobId),
          paymentApplicationsService.getByJob(jobId, orgId),
        ]);
        if (cancelled) return;

        const [
          clientResult,
          membersResult,
          evidenceResult,
          timelineResult,
          variationsResult,
          documentsResult,
          termsResult,
          paymentsResult,
        ] = results;

        const panelErrors: PanelErrors = {};

        const client = clientResult.status === 'fulfilled' ? clientResult.value : null;

        let members: JobMember[] = [];
        if (membersResult.status === 'fulfilled') {
          members = membersResult.value;
        } else {
          panelErrors.team = true;
        }

        const data: JobDetailData = emptyJobDetailData();
        data.panelErrors = panelErrors;

        if (evidenceResult.status === 'fulfilled') {
          data.evidence = evidenceResult.value;
        } else {
          panelErrors.evidence = true;
        }

        if (timelineResult.status === 'fulfilled') {
          data.timeline = timelineResult.value;
        } else {
          panelErrors.timeline = true;
        }

        let variationRows: Database['public']['Tables']['variations']['Row'][] = [];
        if (variationsResult.status === 'fulfilled') {
          variationRows = variationsResult.value;
          data.variations = variationRows.map<VariationView>((v) => ({
            id: v.id,
            reference: v.reference,
            title: v.title,
            status: v.status,
            totalPence: v.total_pence,
            programmeDays: v.programme_days ?? null,
            approvalDeadline: v.approval_deadline ?? null,
            updatedAt: v.updated_at,
          }));
        } else {
          panelErrors.variations = true;
        }

        if (documentsResult.status === 'fulfilled') {
          data.documents = documentsResult.value.map<DocumentView>((d) => ({
            id: d.id,
            name: d.name,
            category: d.category,
            mimeType: d.mime_type,
            sizeBytes: d.size_bytes,
            version: d.version,
          }));
        } else {
          panelErrors.documents = true;
        }

        if (termsResult.status === 'fulfilled') {
          data.contractTerms = termsResult.value;
        } else {
          panelErrors.documents = true;
        }

        let paymentApps: PaymentApplication[] = [];
        if (paymentsResult.status === 'fulfilled') {
          paymentApps = paymentsResult.value;
        } else {
          panelErrors.financials = true;
        }

        data.financialsAvailable = true;

        const job = mapJobRowToFullJob(row, client, members.filter((m) => m.job_id === row.id));

        // Derive the financial position from this job's own saved records.
        const contractPence = row.estimated_value_pence ?? 0;
        const approvedVariationPence = variationRows
          .filter((v) => APPROVED_VARIATION_STATUSES.includes(v.status))
          .reduce((sum, v) => sum + v.total_pence, 0);
        const invoicedPence = paymentApps
          .filter((a) => INVOICED_PAYMENT_STATUSES.includes(a.status))
          .reduce((sum, a) => sum + a.amount_due_pence, 0);
        const paidPence = paymentApps
          .filter((a) => a.status === 'paid')
          .reduce((sum, a) => sum + a.amount_due_pence, 0);
        const retentionPence = paymentApps
          .filter((a) => CERTIFIED_PAYMENT_STATUSES.includes(a.status))
          .reduce((sum, a) => sum + a.retention_pence, 0);

        const contractPounds = contractPence / 100;
        const approvedPounds = approvedVariationPence / 100;

        job.financials = {
          contractValue: contractPounds,
          approvedVariations: approvedPounds,
          revisedContract: contractPounds + approvedPounds,
          invoiced: invoicedPence / 100,
          paid: paidPence / 100,
          outstanding: (invoicedPence - paidPence) / 100,
          retentionHeld: retentionPence / 100,
        };

        setState({ status: 'ready', job, data, isDemo: false, error: null });
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load job detail:', err);
        setState({
          status: 'error',
          job: null,
          data: null,
          isDemo: false,
          error: err instanceof Error ? err.message : 'Failed to load this job.',
        });
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [jobId, userId, orgId, orgStatus, refreshKey]);

  const retry = useCallback(() => {
    if (orgStatus === 'error') {
      void refreshOrganisations();
    }
    reload();
  }, [orgStatus, refreshOrganisations, reload]);

  return { ...state, reload: retry };
}