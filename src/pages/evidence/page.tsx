import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '@/contexts/OrgContext';
import { evidenceService } from '@/services/evidence.service';
import { useToast } from '@/components/base/Toast';
import {
  getAllEvidence,
  getEvidenceTypeIcon,
  getEvidenceTypeLabel,
  getReviewStatusColor,
  getReviewStatusLabel,
  getVisibilityLabel,
  getVisibilityColor,
  getSyncStateLabel,
  demoOfflineQueue,
  evidenceQuickFilters,
  type EvidenceRecord,
} from '@/mocks/evidence';

type ViewMode = 'grid' | 'list' | 'timeline';

export default function EvidenceWorkspace() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { organisation } = useOrg();

  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [summaryCounts, setSummaryCounts] = useState({
    capturedToday: 0,
    internalOnly: 0,
    clientVisible: 0,
    needsReview: 0,
    offlineQueue: 0,
  });
  const [summaryLoading, setSummaryLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function loadCounts() {
      if (!organisation?.id) return;
      setSummaryLoading(true);
      try {
        const counts = await evidenceService.getSummaryCounts(organisation.id);
        if (!cancelled) {
          setSummaryCounts(counts);
        }
      } catch (err) {
        console.error('Failed to load evidence summary counts:', err);
      } finally {
        if (!cancelled) {
          setSummaryLoading(false);
        }
      }
    }
    loadCounts();
    return () => {
      cancelled = true;
    };
  }, [organisation?.id]);

  const allEvidence = useMemo(() => getAllEvidence(), []);
  const offlineItems = useMemo(() => demoOfflineQueue, []);

  const filtered = useMemo(() => {
    let result = [...allEvidence];
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(
        (e) =>
          e.caption.toLowerCase().includes(s) ||
          e.jobName.toLowerCase().includes(s) ||
          e.jobRef.toLowerCase().includes(s) ||
          e.capturedBy.toLowerCase().includes(s) ||
          e.title.toLowerCase().includes(s),
      );
    }
    if (activeFilters.length > 0 && !activeFilters.includes('all')) {
      if (activeFilters.includes('today')) {
        const today = '2026-08-05';
        result = result.filter((e) => e.capturedAt.startsWith(today));
      }
      if (activeFilters.includes('this_week')) {
        result = result.filter((e) => e.capturedAt >= '2026-08-03');
      }
      if (activeFilters.includes('photos')) {
        result = result.filter((e) => e.evidenceType === 'photo');
      }
      if (activeFilters.includes('instructions')) {
        result = result.filter((e) => e.evidenceType === 'site_instruction');
      }
      if (activeFilters.includes('delays')) {
        result = result.filter((e) => e.evidenceType === 'delay');
      }
      if (activeFilters.includes('inspections')) {
        result = result.filter((e) => e.evidenceType === 'inspection');
      }
      if (activeFilters.includes('client_visible')) {
        result = result.filter((e) => e.visibility === 'client_visible');
      }
      if (activeFilters.includes('needs_review')) {
        result = result.filter(
          (e) => e.reviewStatus === 'awaiting_review' || e.reviewStatus === 'submitted',
        );
      }
      if (activeFilters.includes('offline_queue')) {
        result = [];
      }
    }
    return result;
  }, [search, activeFilters, allEvidence]);

  const toggleFilter = (id: string) => {
    setActiveFilters((prev) => {
      if (id === 'all') return [];
      if (prev.includes(id)) return prev.filter((f) => f !== id);
      const next = prev.filter((f) => f !== 'all');
      return [...next, id];
    });
  };

  const summaryCards = [
    {
      label: 'Captured today',
      value: summaryCounts.capturedToday,
      color: 'bg-primary-50 text-primary-700',
    },
    {
      label: 'Internal only',
      value: summaryCounts.internalOnly,
      color: 'bg-gray-100 text-gray-600',
    },
    {
      label: 'Client visible',
      value: summaryCounts.clientVisible,
      color: 'bg-primary-50 text-primary-700',
    },
    {
      label: 'Needs review',
      value: summaryCounts.needsReview,
      color: 'bg-status-amber-pale text-status-amber',
    },
    {
      label: 'Offline queue',
      value: summaryCounts.offlineQueue,
      color: 'bg-status-amber-pale text-status-amber',
    },
  ];

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
            onClick={() => navigate('/site/sl-1048/capture')}
          >
            <i className="ri-camera-line mr-1.5"></i>
            {t('evidence.captureEvidence')}
          </button>
          <button
            className="h-9 px-4 border border-border text-main text-sm font-medium rounded-xl hover:bg-page cursor-pointer whitespace-nowrap"
            onClick={() => navigate('/jobs/sl-1048/daily-logs/new')}
          >
            <i className="ri-file-list-3-line mr-1.5"></i>
            {t('evidence.createDailyLog')}
          </button>
          <button
            className="h-9 px-4 border border-border text-main text-sm font-medium rounded-xl hover:bg-page cursor-pointer whitespace-nowrap"
            onClick={() => navigate('/jobs/sl-1048/evidence-pack')}
          >
            <i className="ri-archive-line mr-1.5"></i>
            {t('evidence.buildPack')}
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
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
        {/* Quick Filters */}
        <div className="px-4 pb-2 flex items-center gap-1.5 overflow-x-auto flex-wrap">
          {evidenceQuickFilters.map((f) => (
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
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full cursor-pointer whitespace-nowrap transition-colors ${
              showFilters ? 'bg-primary-500 text-white' : 'bg-page text-muted hover:text-main'
            }`}
          >
            <i className="ri-equalizer-line mr-1"></i>Filters
          </button>
          {activeFilters.length > 0 && (
            <button
              onClick={() => setActiveFilters([])}
              className="px-3 py-1.5 text-xs font-medium text-status-red hover:bg-status-red-pale rounded-full cursor-pointer whitespace-nowrap"
            >
              Clear
            </button>
          )}
        </div>
        {/* View Toggle */}
        <div className="px-4 pb-3 flex items-center gap-1">
          {(['grid', 'list', 'timeline'] as ViewMode[]).map((v) => (
            <button
              key={v}
              onClick={() => setViewMode(v)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer ${
                viewMode === v ? 'bg-primary-500 text-white' : 'text-muted hover:bg-page'
              }`}
              title={v}
            >
              <i
                className={`text-sm ${v === 'grid' ? 'ri-layout-grid-line' : v === 'list' ? 'ri-list-check' : 'ri-timeline-view'}`}
              ></i>
            </button>
          ))}
          <span className="text-xs text-muted ml-2">{filtered.length} items</span>
        </div>
      </div>

      {/* No Results */}
      {filtered.length === 0 && (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-page flex items-center justify-center mx-auto mb-4">
              <i className="ri-image-line text-2xl text-muted"></i>
            </div>
            <h3 className="text-base font-semibold text-main">
              {allEvidence.length === 0 ? t('evidence.noEvidence') : t('evidence.noResults')}
            </h3>
            <p className="text-sm text-muted mt-1">
              {allEvidence.length === 0 ? t('evidence.noEvidenceDesc') : t('evidence.noResultsDesc')}
            </p>
          </div>
        </div>
      )}

      {/* Evidence Grid */}
      {viewMode === 'grid' && filtered.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((ev) => renderEvidenceCard(ev, navigate, t))}
        </div>
      )}

      {/* Evidence List */}
      {viewMode === 'list' && filtered.length > 0 && (
        <div className="space-y-2">{filtered.map((ev) => renderEvidenceRow(ev, navigate, t))}</div>
      )}

      {/* Offline Queue Banner */}
      {offlineItems.length > 0 && (
        <div className="bg-status-amber-pale border border-[#F5E0C0] rounded-2xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-status-amber/20 flex items-center justify-center">
              <i className="ri-cloud-off-line text-lg text-status-amber"></i>
            </div>
            <div>
              <p className="text-sm font-semibold text-main">Offline queue</p>
              <p className="text-xs text-muted">{offlineItems.length} items waiting to sync</p>
            </div>
          </div>
          <button
            className="h-9 px-4 bg-status-amber text-white text-sm font-semibold rounded-xl hover:bg-status-amber/90 cursor-pointer whitespace-nowrap"
            onClick={() => showToast('Demo queue processed.', 'success')}
          >
            Process queue
          </button>
        </div>
      )}
    </div>
  );
}

function renderEvidenceCard(
  ev: EvidenceRecord,
  navigate: (path: string) => void,
  t: (key: string) => string,
) {
  const hasImage = ev.attachments?.some((a) => a.previewUrl) ?? false;
  const previewUrl = ev.attachments?.find((a) => a.previewUrl)?.previewUrl;
  return (
    <div
      key={ev.id}
      className="bg-white border border-border rounded-2xl overflow-hidden cursor-pointer hover:border-primary-200 transition-colors group"
      onClick={() => navigate(`/evidence/${ev.id}`)}
    >
      <div className="aspect-[4/3] bg-page relative">
        {previewUrl ? (
          <img src={previewUrl} alt={ev.caption} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <i className={`${getEvidenceTypeIcon(ev.evidenceType)} text-3xl text-muted`}></i>
          </div>
        )}
        <div className="absolute top-2 left-2 flex items-center gap-1.5">
          <span className="text-[10px] font-medium bg-white/90 backdrop-blur-sm text-main px-2 py-0.5 rounded-full">
            {getEvidenceTypeLabel(ev.evidenceType)}
          </span>
        </div>
        <div className="absolute top-2 right-2">
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${getVisibilityColor(ev.visibility)}`}>
            {getVisibilityLabel(ev.visibility)}
          </span>
        </div>
      </div>
      <div className="p-3">
        <p className="text-xs text-main leading-snug line-clamp-2">{ev.caption}</p>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[10px] text-muted">
            {ev.jobRef} · {ev.projectStage}
          </span>
          <span className="text-[10px] text-muted">
            {new Date(ev.capturedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
          </span>
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-muted">{ev.capturedBy}</span>
          <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${getReviewStatusColor(ev.reviewStatus)}`}>
            {getReviewStatusLabel(ev.reviewStatus)}
          </span>
        </div>
      </div>
    </div>
  );
}

function renderEvidenceRow(
  ev: EvidenceRecord,
  navigate: (path: string) => void,
  t: (key: string) => string,
) {
  return (
    <div
      key={ev.id}
      className="bg-white border border-border rounded-2xl p-4 cursor-pointer hover:border-primary-200 transition-colors flex items-center gap-4"
      onClick={() => navigate(`/evidence/${ev.id}`)}
    >
      <div className="w-12 h-12 rounded-xl bg-page flex items-center justify-center flex-shrink-0 overflow-hidden">
        {ev.attachments?.find((a) => a.previewUrl) ? (
          <img
            src={ev.attachments?.find((a) => a.previewUrl)?.previewUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <i className={`${getEvidenceTypeIcon(ev.evidenceType)} text-lg text-muted`}></i>
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium text-main truncate">{ev.title}</span>
          <span className="text-[10px] text-primary-500 font-medium">{ev.jobRef}</span>
        </div>
        <p className="text-[11px] text-muted truncate">{ev.caption}</p>
      </div>
      <div className="hidden sm:block text-xs text-muted">{getEvidenceTypeLabel(ev.evidenceType)}</div>
      <div className="hidden sm:block text-xs text-muted">{ev.projectStage}</div>
      <span className={`text-[9px] font-medium px-1.5 py-0.5 rounded-full ${getReviewStatusColor(ev.reviewStatus)}`}>
        {getReviewStatusLabel(ev.reviewStatus)}
      </span>
      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${getVisibilityColor(ev.visibility)}`}>
        {getVisibilityLabel(ev.visibility)}
      </span>
      <span className="hidden sm:block text-[10px] text-muted">{ev.capturedBy}</span>
      <span className="text-[10px] text-muted whitespace-nowrap">
        {new Date(ev.capturedAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
      </span>
      <i className="ri-arrow-right-s-line text-muted flex-shrink-0"></i>
    </div>
  );
}