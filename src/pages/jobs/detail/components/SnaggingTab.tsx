import { useState } from 'react';
import type { FullJob } from '@/mocks/jobs';
import {
  getDemoSnagsByJob,
  getSnagStatusColor,
  getSnagSeverityColor,
  getSnagDefectTypeColor,
  getSnagDefectTypeLabel,
  SNAG_STATUS_LABELS,
  SNAG_TRADES,
  type DemoSnag,
  type SnagStatus,
  type SnagSeverity,
  type SnagDefectType,
} from '@/mocks/snagging';
import SnagGeneratorModal, { type GeneratedSnagDraft } from './SnagGeneratorModal';
import { useOrg } from '@/contexts/OrgContext';
import { snaggingService } from '@/services/snagging.service';
import { useToast } from '@/components/base/Toast';

interface SnaggingTabProps {
  jobId: string;
  job: FullJob;
}

type StatusFilter = 'all' | SnagStatus;
type TypeFilter = 'all' | SnagDefectType;

export default function SnaggingTab({ jobId, job }: SnaggingTabProps) {
  const { organisation } = useOrg();
  const { showToast } = useToast();

  const [snags, setSnags] = useState<DemoSnag[]>(() => getDemoSnagsByJob(jobId));
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [generatorOpen, setGeneratorOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [resolveNote, setResolveNote] = useState('');

  const openCount = snags.filter((s) => s.status === 'open').length;
  const inProgressCount = snags.filter((s) => s.status === 'in_progress').length;
  const resolvedCount = snags.filter((s) => s.status === 'resolved' || s.status === 'closed').length;
  const highCount = snags.filter((s) => s.severity === 'high' || s.severity === 'critical').length;

  const filtered = snags.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (typeFilter !== 'all' && s.defectType !== typeFilter) return false;
    return true;
  });

  const handleGenerate = (drafts: GeneratedSnagDraft[]) => {
    const newSnags: DemoSnag[] = drafts.map((d, i) => ({
      id: `sng-${Date.now()}-${i}`,
      reference: `SNG-${String(snags.length + i + 1).padStart(3, '0')}`,
      title: d.title,
      description: d.description,
      area: d.area,
      trade: d.trade,
      defectType: 'snag',
      severity: d.severity,
      status: 'open',
      raisedBy: 'Nerve',
      updatedAt: 'Just now',
    }));
    setSnags((prev) => [...newSnags, ...prev]);
    showToast(`${newSnags.length} snag item${newSnags.length > 1 ? 's' : ''} added for review.`, 'success');

    // Best-effort persist when a real organisation + job exist
    if (organisation?.id) {
      newSnags.forEach((s) => {
        snaggingService
          .createSnag({
            organisationId: organisation.id,
            jobId: job.id,
            reference: s.reference,
            title: s.title,
            description: s.description,
            area: s.area,
            trade: s.trade,
            defectType: s.defectType,
            severity: s.severity,
            raisedBy: s.raisedBy,
          })
          .catch(() => {});
      });
    }
  };

  const advanceStatus = (id: string, current: SnagStatus) => {
    if (current === 'open') {
      setSnags((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'in_progress', updatedAt: 'Just now' } : s)));
      if (organisation?.id) snaggingService.updateSnagStatus(id, 'in_progress').catch(() => {});
      showToast('Snag moved to in progress.', 'info');
    } else if (current === 'in_progress') {
      setResolvingId(id);
      setResolveNote('');
    } else if (current === 'resolved') {
      setSnags((prev) => prev.map((s) => (s.id === id ? { ...s, status: 'closed', updatedAt: 'Just now' } : s)));
      if (organisation?.id) snaggingService.updateSnagStatus(id, 'closed').catch(() => {});
      showToast('Snag closed.', 'success');
    }
  };

  const confirmResolve = () => {
    if (!resolvingId) return;
    setSnags((prev) =>
      prev.map((s) =>
        s.id === resolvingId
          ? { ...s, status: 'resolved', resolutionNote: resolveNote.trim() || undefined, updatedAt: 'Just now' }
          : s,
      ),
    );
    if (organisation?.id) snaggingService.updateSnagStatus(resolvingId, 'resolved', resolveNote.trim() || null).catch(() => {});
    showToast('Snag marked as resolved.', 'success');
    setResolvingId(null);
    setResolveNote('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-base font-bold text-main">Snagging &amp; defects</h2>
          <p className="text-sm text-muted">Track incomplete work and defects from issue to sign-off.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAddOpen(true)}
            className="h-10 px-4 border border-border text-main text-sm font-medium rounded-xl hover:bg-page transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
          >
            <i className="ri-add-line"></i> Add snag
          </button>
          <button
            onClick={() => setGeneratorOpen(true)}
            className="h-10 px-4 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"
          >
            <i className="ri-sparkling-2-line"></i> Generate with Nerve
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <SummaryCard icon="ri-error-warning-line" label="Open" value={openCount} accent="text-status-red" iconBg="bg-status-red-pale" />
        <SummaryCard icon="ri-time-line" label="In progress" value={inProgressCount} accent="text-status-amber" iconBg="bg-status-amber-pale" />
        <SummaryCard icon="ri-check-double-line" label="Resolved" value={resolvedCount} accent="text-primary-600" iconBg="bg-primary-50" />
        <SummaryCard icon="ri-alert-line" label="High severity" value={highCount} accent="text-status-red" iconBg="bg-status-red-pale" />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1 bg-page rounded-full p-1">
          {(['all', 'open', 'in_progress', 'resolved', 'closed'] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer whitespace-nowrap ${
                statusFilter === f ? 'bg-white text-main shadow-sm' : 'text-muted hover:text-main'
              }`}
            >
              {f === 'all' ? 'All' : SNAG_STATUS_LABELS[f]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 bg-page rounded-full p-1">
          {(['all', 'snag', 'defect'] as TypeFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setTypeFilter(f)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors cursor-pointer whitespace-nowrap ${
                typeFilter === f ? 'bg-white text-main shadow-sm' : 'text-muted hover:text-main'
              }`}
            >
              {f === 'all' ? 'Snags & defects' : getSnagDefectTypeLabel(f) + 's'}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted ml-auto">{filtered.length} items</span>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="bg-white border border-border rounded-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-page flex items-center justify-center mx-auto mb-3">
            <i className="ri-list-check-3 text-2xl text-muted"></i>
          </div>
          <h4 className="text-sm font-semibold text-main">No snags here yet</h4>
          <p className="text-sm text-muted mt-1 max-w-md mx-auto">
            Generate a snag list with Nerve or add items manually to start tracking.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => {
            const expanded = expandedId === s.id;
            return (
              <div key={s.id} className="bg-white border border-border rounded-2xl overflow-hidden">
                <button
                  onClick={() => setExpandedId(expanded ? null : s.id)}
                  className="w-full flex items-start gap-4 p-4 text-left cursor-pointer hover:bg-page/50 transition-colors"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${s.defectType === 'defect' ? 'bg-status-red-pale' : 'bg-status-blue-pale'}`}>
                    <i className={`${s.defectType === 'defect' ? 'ri-error-warning-line text-status-red' : 'ri-list-check-3 text-status-blue'} text-xl`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-primary-500">{s.reference}</span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getSnagDefectTypeColor(s.defectType)}`}>
                        {getSnagDefectTypeLabel(s.defectType)}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getSnagStatusColor(s.status)}`}>
                        {SNAG_STATUS_LABELS[s.status]}
                      </span>
                      <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full uppercase ${getSnagSeverityColor(s.severity)}`}>
                        {s.severity}
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-main mt-1">{s.title}</p>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted mt-1">
                      {s.area && <span>{s.area}</span>}
                      <span>{s.trade}</span>
                      <span>Raised by {s.raisedBy}</span>
                      {s.targetDate && <span>Due {s.targetDate}</span>}
                      <span>Updated {s.updatedAt}</span>
                    </div>
                  </div>
                  <i className={`ri-arrow-down-s-line text-muted transition-transform ${expanded ? 'rotate-180' : ''}`}></i>
                </button>

                {expanded && (
                  <div className="px-4 pb-4 pl-[72px] space-y-3">
                    {s.description && (
                      <p className="text-sm text-main">{s.description}</p>
                    )}

                    {s.resolutionNote && (
                      <div className="flex items-start gap-2 p-3 rounded-xl bg-primary-50">
                        <i className="ri-check-double-line text-primary-600 mt-0.5"></i>
                        <p className="text-sm text-primary-700">{s.resolutionNote}</p>
                      </div>
                    )}

                    {/* Status actions */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {s.status === 'open' && (
                        <button
                          onClick={() => advanceStatus(s.id, s.status)}
                          className="h-9 px-3 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Start work
                        </button>
                      )}
                      {s.status === 'in_progress' && resolvingId !== s.id && (
                        <button
                          onClick={() => advanceStatus(s.id, s.status)}
                          className="h-9 px-3 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Mark resolved
                        </button>
                      )}
                      {s.status === 'resolved' && (
                        <button
                          onClick={() => advanceStatus(s.id, s.status)}
                          className="h-9 px-3 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Close
                        </button>
                      )}
                      {s.status === 'closed' && (
                        <span className="text-xs font-medium text-muted flex items-center gap-1.5">
                          <i className="ri-checkbox-circle-line text-primary-500"></i> Completed
                        </span>
                      )}
                      {s.status !== 'closed' && (
                        <button
                          onClick={() => {
                            setSnags((prev) => prev.map((x) => (x.id === s.id ? { ...x, status: 'closed', updatedAt: 'Just now' } : x)));
                            if (organisation?.id) snaggingService.updateSnagStatus(s.id, 'closed').catch(() => {});
                            showToast('Snag closed.', 'success');
                          }}
                          className="h-9 px-3 border border-border text-main text-xs font-medium rounded-lg hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
                        >
                          Skip to close
                        </button>
                      )}
                    </div>

                    {/* Resolve note */}
                    {resolvingId === s.id && (
                      <div className="p-3.5 rounded-xl bg-page border border-border space-y-2.5">
                        <label className="block text-xs font-semibold text-muted uppercase tracking-wider">Resolution note</label>
                        <textarea
                          value={resolveNote}
                          onChange={(e) => setResolveNote(e.target.value)}
                          rows={2}
                          maxLength={500}
                          className="w-full p-3 text-sm rounded-xl border border-border focus:outline-none focus:border-primary-300 resize-none"
                          placeholder="Describe how this was resolved..."
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={confirmResolve}
                            className="h-9 px-4 bg-primary-500 hover:bg-primary-600 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Confirm resolved
                          </button>
                          <button
                            onClick={() => { setResolvingId(null); setResolveNote(''); }}
                            className="h-9 px-4 border border-border text-main text-xs font-medium rounded-lg hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {generatorOpen && (
        <SnagGeneratorModal
          defaultTrade={job.trade}
          defaultScope={job.description}
          onClose={() => setGeneratorOpen(false)}
          onSave={handleGenerate}
        />
      )}

      {addOpen && (
        <AddSnagModal
          defaultTrade={job.trade}
          onClose={() => setAddOpen(false)}
          onAdd={(snag) => {
            setSnags((prev) => [snag, ...prev]);
            if (organisation?.id) {
              snaggingService
                .createSnag({
                  organisationId: organisation.id,
                  jobId: job.id,
                  reference: snag.reference,
                  title: snag.title,
                  description: snag.description,
                  area: snag.area,
                  trade: snag.trade,
                  defectType: snag.defectType,
                  severity: snag.severity,
                  assignedTo: snag.assignedTo,
                  raisedBy: snag.raisedBy,
                  targetDate: snag.targetDate,
                })
                .catch(() => {});
            }
            showToast('Snag added.', 'success');
          }}
        />
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, accent, iconBg }: { icon: string; label: string; value: number; accent: string; iconBg: string }) {
  return (
    <div className="bg-white border border-border rounded-2xl p-4 flex items-center gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
        <i className={`${icon} text-xl ${accent}`}></i>
      </div>
      <div>
        <p className={`text-xl font-bold ${accent}`}>{value}</p>
        <p className="text-[11px] text-muted">{label}</p>
      </div>
    </div>
  );
}

interface AddSnagModalProps {
  defaultTrade: string;
  onClose: () => void;
  onAdd: (snag: DemoSnag) => void;
}

function AddSnagModal({ defaultTrade, onClose, onAdd }: AddSnagModalProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [area, setArea] = useState('');
  const [trade, setTrade] = useState(defaultTrade || SNAG_TRADES[0]);
  const [defectType, setDefectType] = useState<SnagDefectType>('snag');
  const [severity, setSeverity] = useState<SnagSeverity>('low');
  const [assignedTo, setAssignedTo] = useState('');
  const [targetDate, setTargetDate] = useState('');

  const canSave = title.trim().length > 0;

  const handleSubmit = () => {
    if (!canSave) return;
    onAdd({
      id: `sng-${Date.now()}`,
      reference: `SNG-${Date.now().toString().slice(-3)}`,
      title: title.trim(),
      description: description.trim() || 'No description provided.',
      area: area.trim(),
      trade,
      defectType,
      severity,
      status: 'open',
      assignedTo: assignedTo.trim() || undefined,
      raisedBy: 'You',
      targetDate: targetDate || undefined,
      updatedAt: 'Just now',
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center p-4 md:p-8">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto shadow-xl">
        <div className="flex items-start justify-between px-6 pt-5 pb-4 border-b border-border sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-lg font-bold text-main">Add snag</h2>
            <p className="text-xs text-muted">Log an item of incomplete or defective work.</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-page text-muted cursor-pointer" aria-label="Close">
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full h-11 px-3.5 text-sm rounded-xl border border-border focus:outline-none focus:border-primary-300"
              placeholder="e.g. Skirting gap at floor"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              maxLength={500}
              className="w-full p-3.5 text-sm rounded-xl border border-border focus:outline-none focus:border-primary-300 resize-none"
              placeholder="What's wrong and what's needed..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Area</label>
              <input
                value={area}
                onChange={(e) => setArea(e.target.value)}
                className="w-full h-11 px-3.5 text-sm rounded-xl border border-border focus:outline-none focus:border-primary-300"
                placeholder="e.g. Kitchen"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Trade</label>
              <select
                value={trade}
                onChange={(e) => setTrade(e.target.value)}
                className="w-full h-11 px-3 text-sm rounded-xl border border-border bg-white text-main focus:outline-none focus:border-primary-300 cursor-pointer"
              >
                {SNAG_TRADES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Type</label>
              <select
                value={defectType}
                onChange={(e) => setDefectType(e.target.value as SnagDefectType)}
                className="w-full h-11 px-3 text-sm rounded-xl border border-border bg-white text-main focus:outline-none focus:border-primary-300 cursor-pointer"
              >
                <option value="snag">Snag</option>
                <option value="defect">Defect</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Severity</label>
              <select
                value={severity}
                onChange={(e) => setSeverity(e.target.value as SnagSeverity)}
                className="w-full h-11 px-3 text-sm rounded-xl border border-border bg-white text-main focus:outline-none focus:border-primary-300 cursor-pointer"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Assign to</label>
              <input
                value={assignedTo}
                onChange={(e) => setAssignedTo(e.target.value)}
                className="w-full h-11 px-3.5 text-sm rounded-xl border border-border focus:outline-none focus:border-primary-300"
                placeholder="Name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-muted uppercase tracking-wider mb-1.5">Target date</label>
              <input
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full h-11 px-3.5 text-sm rounded-xl border border-border focus:outline-none focus:border-primary-300"
              />
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSave}
            className="w-full h-11 bg-primary-500 hover:bg-primary-600 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
          >
            Add snag
          </button>
        </div>
      </div>
    </div>
  );
}