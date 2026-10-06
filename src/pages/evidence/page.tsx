import { useState, useMemo, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '@/contexts/OrgContext';
import { evidenceService, type EvidenceJobItem } from '@/services/evidence.service';
import { jobsService } from '@/services/jobs.service';
import {
  evidenceTypeIcon,
  evidenceTypeLabel,
  reviewStatusColor,
  reviewStatusLabel,
  visibilityColor,
  visibilityLabel,
} from '@/lib/evidence';
import JobPickerDialog, { type PickerJob } from './components/JobPickerDialog';

type ViewMode = 'grid' | 'list';
type PickerMode = 'capture' | 'dailyLog' | 'pack' | null;

const quickFilters = [
  { id: 'all', label: 'All evidence' },
  { id: 'today', label: 'Today' },
  { id: 'this_week', label: 'This week' },
  { id: 'photos', label: 'Photos' },
  { id: 'instructions', label: 'Instructions' },
  { id: 'delays', label: 'Delays' },
  { id: 'inspections', label: 'Inspections' },
  { id: 'client_visible', label: 'Client visible' },
  { id: 'needs_review', label: 'Needs review' },
];

function startOfToday(): string {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

function startOfWeek(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = (day + 6) % 7; // Monday-based
  d.setDate(d.getDate() - diff);
  d.setHours(0, 0, 0, 0);
  return d.toISOString();
}

export default function EvidenceWorkspace() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { organisation, status: orgStatus, refreshOrganisations } = useOrg();
  const orgId = organisation?.id ?? null;

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const [items, setItems] = useState<EvidenceJobItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [jobs, setJobs] = useState<PickerJob[]>([]);
  const [pickerMode, setPickerMode] = useState<PickerMode>(null);

  const [summaryCounts, setSummaryCounts] = useState({
    capturedToday: 0,
    internalOnly: 0,
    clientVisible: 0,
    needsReview: 0,
    offlineQueue: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);

  const loadEvidence = useCallback(async () => {
    if (!orgId) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setLoadError(null);
    try {
      const data = await evidenceService.listByOrg(orgId);
      setItems(data);
    } catch (err) {
      console.error('Failed to load evidence:', err);
      setLoadError(t('evidence.loadError'));
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [orgId, t]);

  const loadSummary = useCallback(async () => {
    if (!orgId) {
      setSummaryLoading(false);
      return;
    }
    setSummaryLoading(true);
    try {
      const counts = await evidenceService.getSummaryCounts(orgId);
      setSummaryCounts(counts);
    } catch (err) {
      console.error('Failed to load evidence summary counts:', err);
    } finally {
      setSummaryLoading(false);
    }
  }, [orgId]);

  const loadJobs = useCallback(async () => {
    if (!orgId) {
      setJobs([]);
      return;
    }
    try {
      const rows = await jobsService.getJobs(orgId);
      setJobs(rows.map((j) => ({ id: j.id, reference: j.reference, project_name: j.project_name })));
    } catch (err) {
      console.error('Failed to load jobs for picker:', err);
      setJobs([]);
    }
  }, [orgId]);

  useEffect(() => {
    loadEvidence();
    loadSummary();
    loadJobs();
  }, [loadEvidence, loadSummary, loadJobs]);

  const filtered = useMemo(() => {
    let result = [...items];
    if (search.trim()) {
      const s = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.caption.toLowerCase().includes(s) ||
          e.jobName.toLowerCase().includes(s) ||
          e.jobRef.toLowerCase().includes(s) ||
          e.capturedBy.toLowerCase().includes(s) ||
          evidenceTypeLabel(e.evidenceType).toLowerCase().includes(s),
      );
    }
    if (activeFilters.length > 0 && !activeFilters.includes('all')) {
      const today = startOfToday();
      const week = startOfWeek();
      if (activeFilters.includes('today')) result = result.filter((e) => e.capturedAt >= today);
      if (activeFilters.includes('this_week')) result = result.filter((e) => e.capturedAt >= week);
      if (activeFilters.includes('photos')) result = result.filter((e) => e.evidenceType === 'photo');
      if (activeFilters.includes('instructions')) result = result.filter((e) => e.evidenceType === 'site_instruction');
      if (activeFilters.includes('delays')) result = result.filter((e) => e.evidenceType === 'delay');
      if (activeFilters.includes('inspections')) result = result.filter((e) => e.evidenceType === 'inspection');
      if (activeFilters.includes('client_visible')) result = result.filter((e) => e.visibility === 'client_visible');
      if (activeFilters.includes('needs_review')) {
        result = result.filter((e) => ['awaiting_review', 'submitted'].includes(e.reviewStatus));
      }
    }
    return result;
  }, [search, activeFilters, items]);

  const toggleFilter = (id: string) => {
    setActiveFilters((prev) => {
      if (id === 'all') return [];
      if (prev.includes(id)) return prev.filter((f) => f !== id);
      const next = prev.filter((f) => f !== 'all');
      return [...next, id];
    });
  };

  const summaryCards = [
    { label: t('evidence.capturedToday'), value: summaryCounts.capturedToday, color: 'bg-primary-50 text-primary-700' },
    { label: t('evidence.internalOnly'), value: summaryCounts.internalOnly, color: 'bg-gray-100 text-gray-600' },
    { label: t('evidence.clientVisible'), value: summaryCounts.clientVisible, color: 'bg-primary-50 text-primary-700' },
    { label: t('evidence.needsReview'), value: summaryCounts.needsReview, color: 'bg-status-amber-pale text-status-amber' },
  ];

  const handlePickerSelect = (jobId: string) => {
    const mode = pickerMode;
    setPickerMode(null);
    if (mode === 'capture') navigate(`/site/${jobId}/capture`);
    if (mode === 'dailyLog') navigate(`/jobs/${jobId}/daily-logs/new`);
    if (mode === 'pack') navigate(`/jobs/${jobId}/evidence-pack`);
  };

  if (orgStatus === 'error') {
    return (
      <CentreMessage
        icon="ri-error-warning-line"
        title={t('evidence.loadError')}
        description={t('evidence.loadErrorDesc')}
        actionLabel={t('evidence.retry')}
        onAction={() => refreshOrganisations()}
      />
    );
  }

  if (orgStatus === 'empty' || (!orgId && !loading)) {
    return (
      <CentreMessage
        icon="ri-building-2-line"
        title={t('evidence.noOrg')}
        description={t('evidence.noOrgDesc')}
      />
    );
  }

  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-main">{t('evidence.heading')}</h1>
          <p className="text-sm text-muted mt-1">{t('evidence.subheading')}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            className="h-9 px-4 border border-border text-main text-sm font-medium rounded-xl hover:bg-page cursor-pointer whitespace-nowrap"
            onClick={() => setPickerMode('capture')}
          >
            <i className="ri-camera-line mr-1.5"></i>
            {t('evidence.captureEvidence')}
          </button>
          <button
            className="h-9 px-4 border border-border text-main text-sm font-medium rounded-xl hover:bg-page cursor-pointer whitespace-nowrap"
            onClick={() => setPickerMode('dailyLog')}
          >
            <i className="ri-file-list-3-line mr-1.5"></i>
            {t('evidence.createDailyLog')}
          </button>
          <button
            className="h-9 px-4 border border-border text-main text-sm font-medium rounded-xl hover:bg-page cursor-pointer whitespace-nowrap"
            onClick={() => setPickerMode('pack')}
          >
            <i className="ri-archive-line mr-1.5"></i>
            {t('evidence.buildPack')}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {summaryCards.map((card) => (
          <div key={card.label} className="bg-white border border-border rounded-2xl p-4">
            <p className="text-2xl font-bold text-main">
              {summaryLoading ? (
                <span className="inline-block w-6 h-6 rounded-full border-2 border-primary-300 border-t-primary-600 animate-spin" />
              ) : (
                card.value
              )}
            </p>
            <p className="text-xs text-muted mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Search + Filters */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        <div className="p-4">
          <div className="relative">
            <i className="ri-search-line absolute left-3.5 top-1/2 -translate-y-1/2 text-muted text-sm"></i>
            <input
              type="text"
              className="w-full h-10 pl-10 pr-4 bg-page border border-border rounded-xl text-sm placeholder:text-muted focus:outline-none focus:border-primary-300"
              placeholder={t('evidence.searchPlaceholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="px-4 pb-2 flex items-center gap-1.5 overflow-x-auto flex-wrap">
          {quickFilters.map((f) => (
            <button
              key={f.id}
              onClick={() => toggleFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full cursor-pointer whitespace-nowrap transition-colors ${
                (activeFilters.length === 0 && f.id === 'all') || activeFilters.includes(f.id)
                  ? 'bg-primary-500 text-white'
                  : 'bg-page text-muted hover:text-main hover:bg-background-100'
              }`}
            >
              {f.label}
            </button>
          ))}
          {activeFilters.length > 0 && (
            <button
              onClick={() => setActiveFilters([])}
              className="px-3 py-1.5 text-xs font-medium text-status-red hover:bg-status-red-pale rounded-full cursor-pointer whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </div>
        <div className="px-4 pb-3 flex items-center gap-1">
          {(['grid', 'list'] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer ${
                viewMode === v ? 'bg-primary-500 text-white' : 'text-muted hover:bg-page'
              }`}
              title={v}
            >
              <i className={`text-sm ${v === 'grid' ? 'ri-layout-grid-line' : 'ri-list-check'}`}></i>
            </button>
          ))}
          <span className="text-xs text-muted ml-2">{filtered.length} items</span>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="bg-white border border-border rounded-2xl overflow-hidden animate-pulse">
              <div className="aspect-[4/3] bg-page" />
              <div className="p-3 space-y-2">
                <div className="h-3 bg-page rounded w-3/4" />
                <div className="h-3 bg-page rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && loadError && (
        <div className="bg-white border border-border rounded-2xl p-12 text-center">
          <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
            <i className="ri-error-warning-line text-2xl text-status-red"></i>
          </div>
          <h3 className="text-lg font-semibold text-main mb-2">{loadError}</h3>
          <p className="text-sm text-muted mb-4">{t('evidence.loadErrorDesc')}</p>
          <button
            className="h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl cursor-pointer whitespace-nowrap"
            onClick={loadEvidence}
          >
            {t('evidence.retry')}
          </button>
        </div>
      )}

      {/* Empty / No results */}
      {!loading && !loadError && filtered.length === 0 && (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
              <i className="ri-image-line text-2xl text-muted"></i>
            </div>
            <h3 className="text-base font-semibold text-main">
              {items.length === 0 ? t('evidence.noEvidence') : t('evidence.noResults')}
            </h3>
            <p className="text-sm text-muted mt-1">
              {items.length === 0 ? t('evidence.noEvidenceDesc') : t('evidence.noResultsDesc')}
            </p>
            {items.length === 0 && (
              <button
                className="mt-4 h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl cursor-pointer whitespace-nowrap"
                onClick={() => setPickerMode('capture')}
              >
                <i className="ri-camera-line mr-1.5"></i>
                {t('evidence.captureFirst')}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Grid */}
      {!loading && !loadError && viewMode === 'grid' && filtered.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((ev) => (
            <EvidenceCard key={ev.id} ev={ev} onOpen={() => navigate(`/evidence/${ev.id}`)} />
          ))}
        </div>
      )}

      {/* List */}
      {!loading && !loadError && viewMode === 'list' && filtered.length > 0 && (
        <div className="space-y-2">
          {filtered.map((ev) => (
            <EvidenceRow key={ev.id} ev={ev} onOpen={() => navigate(`/evidence/${ev.id}`)} />
          ))}
        </div>
      )}

      <JobPickerDialog
        open={pickerMode !== null}
        jobs={jobs}
        title={t('evidence.pickJobTitle')}
        description={t('evidence.pickJobDesc')}
        emptyText={jobs.length === 0 ? t('evidence.noJobsDesc') : t('evidence.noResults')}
        searchPlaceholder={t('evidence.searchPlaceholder')}
        selectLabel={t('evidence.openJob')}
        cancelLabel={t('dashboard.cancel')}
        onSelect={handlePickerSelect}
        onCancel={() => setPickerMode(null)}
      />
    </div>
  );
}

function CentreMessage({
  icon,
  title,
  description,
  actionLabel,
  onAction,
}: {
  icon: string;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-16">
      <div className="bg-white border border-border rounded-2xl p-12 text-center">
        <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
          <i className={`${icon} text-2xl text-muted`}></i>
        </div>
        <h3 className="text-lg font-semibold text-main mb-2">{title}</h3>
        <p className="text-sm text-muted mb-4">{description}</p>
        {actionLabel && onAction && (
          <button
            className="h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl cursor-pointer whitespace-nowrap"
            onClick={onAction}
          >
            {actionLabel}
          </button>
        )}
      </div>
    </div>
  );
}

function formatDate(value: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

function EvidenceCard({ ev, onOpen }: { ev: EvidenceJobItem; onOpen: () => void }) {
  return (
    <div
      className="bg-white border border-border rounded-2xl overflow-hidden cursor-pointer hover:border-primary-200 transition-colors group"
      onClick={onOpen}
    >
      <div className="aspect-[4/3] bg-page relative">
        {ev.previewUrl ? (
          <img src={ev.previewUrl} alt={ev.caption || 'Evidence'} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <i className={`${evidenceTypeIcon(ev.evidenceType)} text-3xl text-muted`}></i>
          </div>
        )}
        <div className="absolute top-2 left-2">
          <span className="text-[10px] font-medium bg-white/90 backdrop-blur-sm text-main px-2 py-0.5 rounded-full">
            {evidenceTypeLabel(ev.evidenceType)}
          </span>
        </div>
        <div className="absolute top-2 right-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${visibilityColor(ev.visibility)}`}>
            {visibilityLabel(ev.visibility)}
          </span>
        </div>
      </div>
      <div className="p-3">
        <p className="text-xs text-main leading-snug line-clamp-2">{ev.caption || 'No caption'}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-muted truncate">
            {ev.jobRef || '—'}
            {ev.projectStage ? ` · ${ev.projectStage}` : ''}
          </span>
          <span className="text-[10px] text-muted whitespace-nowrap">{formatDate(ev.capturedAt)}</span>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-muted truncate">{ev.capturedBy}</span>
          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${reviewStatusColor(ev.reviewStatus)}`}>
            {reviewStatusLabel(ev.reviewStatus)}
          </span>
        </div>
      </div>
    </div>
  );
}

function EvidenceRow({ ev, onOpen }: { ev: EvidenceJobItem; onOpen: () => void }) {
  return (
    <div
      className="bg-white border border-border rounded-2xl p-4 cursor-pointer hover:border-primary-200 transition-colors flex items-center gap-4"
      onClick={onOpen}
    >
      <div className="w-12 h-12 rounded-xl bg-page flex items-center justify-center flex-shrink-0 overflow-hidden">
        {ev.previewUrl ? (
          <img src={ev.previewUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <i className={`${evidenceTypeIcon(ev.evidenceType)} text-lg text-muted`}></i>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium text-main truncate">{evidenceTypeLabel(ev.evidenceType)}</span>
          {ev.jobRef && <span className="text-[10px] text-primary-500 font-medium">{ev.jobRef}</span>}
        </div>
        <p className="text-[11px] text-muted truncate">{ev.caption || 'No caption'}</p>
      </div>
      <div className="hidden sm:block text-xs text-muted truncate max-w-[160px]">{ev.capturedBy}</div>
      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap ${reviewStatusColor(ev.reviewStatus)}`}>
        {reviewStatusLabel(ev.reviewStatus)}
      </span>
      <span className={`text-[9px] px-1.5 py-0.5 rounded-full whitespace-nowrap ${visibilityColor(ev.visibility)}`}>
        {visibilityLabel(ev.visibility)}
      </span>
      <span className="text-[10px] text-muted whitespace-nowrap">{formatDate(ev.capturedAt)}</span>
      <i className="ri-arrow-right-s-line text-muted flex-shrink-0"></i>
    </div>
  );
}