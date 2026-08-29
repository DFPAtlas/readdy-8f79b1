import { useEffect, useState, useMemo, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { disputesService } from '@/services/disputes.service';
import { useToast } from '@/components/base/Toast';
import { DISPUTE_CATEGORY_LABELS, DISPUTE_ROLE_LABELS, DISPUTE_RELATIONSHIP_LABELS } from '@/types/disputes';

interface ProjectOption {
  id: string;
  reference: string | null;
  project_name: string | null;
  status: string | null;
}

const CATEGORY_KEYS = Object.keys(DISPUTE_CATEGORY_LABELS) as (keyof typeof DISPUTE_CATEGORY_LABELS)[];
const RAISER_ROLES = ['contractor', 'trader', 'subcontractor', 'business', 'homeowner', 'client'];
const OTHER_ROLES = ['homeowner', 'client', 'contractor', 'trader', 'subcontractor', 'business'];

function deriveRelationship(claimantRole: string, respondentRole: string): string {
  const trader = ['contractor', 'trader', 'subcontractor', 'business'];
  const consumer = ['homeowner', 'client'];
  if (claimantRole === 'business' && respondentRole === 'business') return 'business_business';
  if (claimantRole === 'contractor' && respondentRole === 'subcontractor') return 'contractor_subcontractor';
  if (consumer.includes(claimantRole) && trader.includes(respondentRole)) return 'homeowner_trader';
  if (trader.includes(claimantRole) && consumer.includes(respondentRole)) return 'trader_homeowner';
  if (trader.includes(claimantRole) && trader.includes(respondentRole)) return 'business_business';
  return 'other';
}

export default function RaiseDisputePage() {
  const navigate = useNavigate();
  const { showToast } = useToast();

  const [projects, setProjects] = useState<ProjectOption[]>([]);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [projectError, setProjectError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [projectId, setProjectId] = useState('');
  const [category, setCategory] = useState('defective_work');
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [claimantRole, setClaimantRole] = useState('contractor');
  const [respondentRole, setRespondentRole] = useState('homeowner');
  const [amount, setAmount] = useState('');
  const [desiredResolution, setDesiredResolution] = useState('');
  const [statement, setStatement] = useState('');
  const [remedy, setRemedy] = useState('');

  useEffect(() => {
    (async () => {
      setLoadingProjects(true);
      setProjectError(null);
      try {
        const list = await disputesService.listMyProjects();
        setProjects(list);
      } catch (err) {
        setProjectError(err instanceof Error ? err.message : 'Failed to load projects');
      } finally {
        setLoadingProjects(false);
      }
    })();
  }, []);

  const relationship = useMemo(() => deriveRelationship(claimantRole, respondentRole), [claimantRole, respondentRole]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!projectId) {
      setError('Please select a project.');
      return;
    }
    if (!title.trim()) {
      setError('Please add a title for the issue.');
      return;
    }
    if (!statement.trim()) {
      setError('Please describe your position.');
      return;
    }

    const amountPence = amount.trim() === '' ? null : Math.round(parseFloat(amount) * 100);

    setSubmitting(true);
    try {
      const { dispute } = await disputesService.createDraft({
        projectId,
        title: title.trim(),
        disputeCategory: category,
        relationshipType: relationship,
        claimantRole,
        summary: summary.trim() || undefined,
        amountDisputedPence: amountPence ?? undefined,
        currency: 'GBP',
        desiredResolution: desiredResolution.trim() || undefined,
      });

      await disputesService.submit({
        disputeId: dispute.id,
        respondentRole,
        statement: statement.trim(),
        requestedRemedy: remedy.trim() || undefined,
        amountPence: amountPence ?? undefined,
      });

      showToast('Issue raised and submitted.', 'success');
      navigate(`/disputes/${dispute.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to raise issue');
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[760px] mx-auto px-4 md:px-6 py-6 space-y-6">
      <div>
        <button
          type="button"
          onClick={() => navigate('/disputes')}
          className="text-xs text-muted hover:text-main font-medium transition-colors cursor-pointer flex items-center gap-1"
        >
          <i className="ri-arrow-left-s-line"></i>
          Back to disputes
        </button>
        <h1 className="text-2xl font-bold text-main mt-2">Raise an issue</h1>
        <p className="text-sm text-muted mt-1.5">
          Record a concern about a project in a calm, neutral way. This opens a clear, documented conversation —
          it does not assign blame or decide who is right.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-border rounded-2xl p-5 space-y-6">
        {/* Project + parties */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-medium text-main mb-1.5">Project</label>
            {loadingProjects ? (
              <div className="h-10 flex items-center gap-2 text-sm text-muted">
                <i className="ri-loader-4-line animate-spin"></i> Loading projects…
              </div>
            ) : projectError ? (
              <p className="text-sm text-status-red">{projectError}</p>
            ) : (
              <div className="relative">
                <select
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                  className="w-full h-10 px-3.5 bg-page border border-border rounded-xl text-sm text-main appearance-none focus:outline-none focus:border-primary-300 pr-9 cursor-pointer"
                >
                  <option value="">Select a project…</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.project_name ?? p.reference ?? p.id}
                    </option>
                  ))}
                </select>
                <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"></i>
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-medium text-main mb-1.5">Your role</label>
            <div className="relative">
              <select
                value={claimantRole}
                onChange={(e) => setClaimantRole(e.target.value)}
                className="w-full h-10 px-3.5 bg-page border border-border rounded-xl text-sm text-main appearance-none focus:outline-none focus:border-primary-300 pr-9 cursor-pointer"
              >
                {RAISER_ROLES.map((r) => (
                  <option key={r} value={r}>{DISPUTE_ROLE_LABELS[r]}</option>
                ))}
              </select>
              <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"></i>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-main mb-1.5">Other party role</label>
            <div className="relative">
              <select
                value={respondentRole}
                onChange={(e) => setRespondentRole(e.target.value)}
                className="w-full h-10 px-3.5 bg-page border border-border rounded-xl text-sm text-main appearance-none focus:outline-none focus:border-primary-300 pr-9 cursor-pointer"
              >
                {OTHER_ROLES.map((r) => (
                  <option key={r} value={r}>{DISPUTE_ROLE_LABELS[r]}</option>
                ))}
              </select>
              <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"></i>
            </div>
          </div>

          <div className="sm:col-span-2">
            <p className="text-xs text-muted">
              Relationship: <span className="text-main font-medium">{DISPUTE_RELATIONSHIP_LABELS[relationship as keyof typeof DISPUTE_RELATIONSHIP_LABELS] ?? relationship}</span>
            </p>
          </div>
        </div>

        {/* About the issue */}
        <div className="space-y-4 border-t border-border pt-5">
          <h2 className="text-sm font-semibold text-main">About the issue</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-main mb-1.5">Issue category</label>
              <div className="relative">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-10 px-3.5 bg-page border border-border rounded-xl text-sm text-main appearance-none focus:outline-none focus:border-primary-300 pr-9 cursor-pointer"
                >
                  {CATEGORY_KEYS.map((c) => (
                    <option key={c} value={c}>{DISPUTE_CATEGORY_LABELS[c]}</option>
                  ))}
                </select>
                <i className="ri-arrow-down-s-line absolute right-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none"></i>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-main mb-1.5">Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="w-full h-10 px-3.5 bg-page border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300"
                placeholder="A short title for the issue"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-main mb-1.5">Summary</label>
            <textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              maxLength={500}
              rows={3}
              className="w-full px-3.5 py-2.5 bg-page border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300 resize-none"
              placeholder="A concise summary of the issue…"
            />
            <p className="text-[11px] text-muted text-right mt-1">{summary.length}/500</p>
          </div>
        </div>

        {/* Position */}
        <div className="space-y-4 border-t border-border pt-5">
          <h2 className="text-sm font-semibold text-main">Your position</h2>
          <div>
            <label className="block text-xs font-medium text-main mb-1.5">Statement</label>
            <textarea
              value={statement}
              onChange={(e) => setStatement(e.target.value)}
              required
              maxLength={500}
              rows={4}
              className="w-full px-3.5 py-2.5 bg-page border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300 resize-none"
              placeholder="Describe your position clearly and factually…"
            />
            <p className="text-[11px] text-muted text-right mt-1">{statement.length}/500</p>
          </div>
        </div>

        {/* Amount + outcome */}
        <div className="space-y-4 border-t border-border pt-5">
          <h2 className="text-sm font-semibold text-main">Amount &amp; outcome</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-main mb-1.5">Amount disputed (£)</label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-10 px-3.5 bg-page border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-main mb-1.5">Requested remedy</label>
              <input
                type="text"
                value={remedy}
                onChange={(e) => setRemedy(e.target.value)}
                className="w-full h-10 px-3.5 bg-page border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300"
                placeholder="What outcome do you want?"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-main mb-1.5">Desired resolution</label>
            <textarea
              value={desiredResolution}
              onChange={(e) => setDesiredResolution(e.target.value)}
              maxLength={300}
              rows={2}
              className="w-full px-3.5 py-2.5 bg-page border border-border rounded-xl text-sm text-main placeholder:text-muted focus:outline-none focus:border-primary-300 resize-none"
              placeholder="Describe how you'd like this to be resolved…"
            />
          </div>
        </div>

        {error && (
          <p className="text-sm text-status-red bg-status-red-pale rounded-lg px-3 py-2">{error}</p>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-border pt-5">
          <p className="text-xs text-muted flex items-center gap-1">
            <i className="ri-shield-check-line"></i>
            Neutral and confidential.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => navigate('/disputes')}
              className="h-10 px-4 border border-border bg-white text-main rounded-xl text-sm font-semibold hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="h-10 px-5 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"
            >
              {submitting && <i className="ri-loader-4-line animate-spin"></i>}
              Raise issue
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}