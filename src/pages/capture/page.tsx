import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useOrg } from '@/contexts/OrgContext';
import { jobsService } from '@/services/jobs.service';
import { evidenceService } from '@/services/evidence.service';
import { useToast } from '@/components/base/Toast';
import {
  evidenceJobStages,
  delayCategories,
  instructionSources,
  evidenceTypeLabel,
  createFileKey,
  type CaptureType,
  type SelectedEvidenceFile,
} from '@/lib/evidence';
import type { Json } from '@/types/supabase';
import SelectedFilesList from './components/SelectedFilesList';

type JobRow = NonNullable<Awaited<ReturnType<typeof jobsService.getJob>>>;

type JobStatus = 'loading' | 'ready' | 'error' | 'notfound' | 'no-org';

export default function SiteCapture() {
  const { t } = useTranslation();
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { user } = useAuth();
  const { organisation, status: orgStatus } = useOrg();
  const orgId = organisation?.id ?? null;
  const userId = user?.id ?? null;

  const [jobStatus, setJobStatus] = useState<JobStatus>('loading');
  const [job, setJob] = useState<JobRow | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const [selectedType, setSelectedType] = useState<CaptureType | null>(null);
  const [caption, setCaption] = useState('');
  const [projectStage, setProjectStage] = useState('');
  const [visibility, setVisibility] = useState<'internal_only' | 'client_visible'>('internal_only');
  const [showMore, setShowMore] = useState(false);
  const [internalNote, setInternalNote] = useState('');
  const [locationLabel, setLocationLabel] = useState('');

  // Files + voice
  const [selectedFiles, setSelectedFiles] = useState<SelectedEvidenceFile[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [voiceSummary, setVoiceSummary] = useState('');
  const [recordingError, setRecordingError] = useState<string | null>(null);

  // Instruction fields
  const [instSource, setInstSource] = useState('Client');
  const [instPerson, setInstPerson] = useState('');
  const [instText, setInstText] = useState('');
  const [instCostImpact, setInstCostImpact] = useState(false);
  const [instProgrammeImpact, setInstProgrammeImpact] = useState(false);

  // Delay fields
  const [delayCat, setDelayCat] = useState('');
  const [delayResponsible, setDelayResponsible] = useState('');
  const [delayDesc, setDelayDesc] = useState('');
  const [delayWorkAffected, setDelayWorkAffected] = useState('');
  const [delayHours, setDelayHours] = useState(0);

  // Inspection fields
  const [inspOutcome, setInspOutcome] = useState('');
  const [inspRef, setInspRef] = useState('');

  // Save state
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);
  const recordIdRef = useRef<string | null>(null);
  const captureTimeRef = useRef<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<number | null>(null);

  const captureActions: { type: CaptureType; label: string; icon: string }[] = useMemo(
    () => [
      { type: 'photo', label: t('evidence.capture.takePhoto'), icon: 'ri-camera-line' },
      { type: 'video', label: t('evidence.capture.recordVideo'), icon: 'ri-vidicon-line' },
      { type: 'voice_note', label: t('evidence.capture.voiceNote'), icon: 'ri-mic-line' },
      { type: 'written_note', label: t('evidence.capture.addNote'), icon: 'ri-file-text-line' },
      { type: 'labour_record', label: t('evidence.capture.recordLabour'), icon: 'ri-user-line' },
      { type: 'material_record', label: t('evidence.capture.recordMaterials'), icon: 'ri-stack-line' },
      { type: 'delivery', label: t('evidence.capture.recordDelivery'), icon: 'ri-truck-line' },
      { type: 'site_instruction', label: t('evidence.capture.siteInstruction'), icon: 'ri-chat-check-line' },
      { type: 'delay', label: t('evidence.capture.recordDelay'), icon: 'ri-timer-line' },
      { type: 'inspection', label: t('evidence.capture.inspection'), icon: 'ri-clipboard-line' },
      { type: 'completion_signoff', label: t('evidence.capture.signOff'), icon: 'ri-check-double-line' },
    ],
    [t],
  );

  // Track connectivity so we never claim an offline save that did not happen.
  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  // Load the real job from the backend, gated on auth + active organisation.
  useEffect(() => {
    let cancelled = false;
    setJobStatus('loading');
    setJob(null);
    recordIdRef.current = null;
    captureTimeRef.current = null;

    if (!jobId) {
      setJobStatus('notfound');
      return undefined;
    }
    if (!userId) return undefined;
    if (orgStatus === 'loading') return undefined;
    if (orgStatus === 'error') {
      setJobStatus('error');
      return undefined;
    }
    if (orgStatus === 'empty' || !orgId) {
      setJobStatus('no-org');
      return undefined;
    }

    (async () => {
      try {
        const row = await jobsService.getJob(jobId, orgId);
        if (cancelled) return;
        if (!row) {
          setJobStatus('notfound');
          return;
        }
        setJob(row);
        setJobStatus('ready');
      } catch (err) {
        if (cancelled) return;
        console.error('Failed to load job for capture:', err);
        setJobStatus('error');
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [jobId, userId, orgId, orgStatus, reloadKey]);

  // Clean up any recording timer on unmount.
  useEffect(() => () => {
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  }, []);

  const resetForm = useCallback(() => {
    setSelectedType(null);
    setCaption('');
    setProjectStage('');
    setVisibility('internal_only');
    setShowMore(false);
    setInternalNote('');
    setLocationLabel('');
    setSelectedFiles([]);
    setVoiceSummary('');
    setRecordingDuration(0);
    setIsRecording(false);
    setRecordingError(null);
    setSaveError(null);
    setInstPerson('');
    setInstText('');
    setInstCostImpact(false);
    setInstProgrammeImpact(false);
    setDelayCat('');
    setDelayResponsible('');
    setDelayDesc('');
    setDelayWorkAffected('');
    setDelayHours(0);
    setInspOutcome('');
    setInspRef('');
    recordIdRef.current = null;
    captureTimeRef.current = null;
  }, []);

  const handleCancel = useCallback(async () => {
    // Clean up a partially-saved record so cancelling leaves nothing orphaned.
    if (orgId && recordIdRef.current) {
      await evidenceService.archiveRecord(orgId, recordIdRef.current);
    }
    resetForm();
  }, [orgId, resetForm]);

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFilesPicked = (event: ChangeEvent<HTMLInputElement>) => {
    const picked = Array.from(event.target.files || []);
    if (picked.length === 0) return;
    const isVideo = selectedType === 'video';
    const next = picked.slice(0, isVideo ? 1 : 20).map((file) => ({ id: createFileKey(), file }));
    setSelectedFiles((prev) => (isVideo ? next : [...prev, ...next]));
    event.target.value = '';
  };

  const removeFile = (id: string) => {
    setSelectedFiles((prev) => prev.filter((f) => f.id !== id));
  };

  const handleStartRecording = async () => {
    setRecordingError(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === 'undefined') {
      setRecordingError(t('evidence.capture.micUnavailable'));
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || 'audio/webm' });
        if (blob.size > 0) {
          const file = new File([blob], `voice-note-${Date.now()}.webm`, {
            type: blob.type || 'audio/webm',
          });
          setSelectedFiles((prev) => [...prev, { id: createFileKey(), file }]);
        }
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setIsRecording(true);
      setRecordingDuration(0);
      timerRef.current = window.setInterval(() => {
        setRecordingDuration((prev) => (prev >= 600 ? prev : prev + 1));
      }, 1000);
    } catch (err) {
      console.error('Failed to start voice recording:', err);
      setRecordingError(t('evidence.capture.micUnavailable'));
    }
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    const recorder = mediaRecorderRef.current;
    if (recorder && recorder.state !== 'inactive') recorder.stop();
  };

  const handleDeleteRecording = () => {
    setSelectedFiles((prev) => prev.filter((f) => !f.file.type.startsWith('audio/')));
    setRecordingDuration(0);
  };

  const buildMetadata = (): Json | null => {
    const meta: Record<string, Json> = {};
    if (selectedType === 'site_instruction') {
      meta.siteInstruction = {
        source: instSource,
        person: instPerson,
        text: instText,
        costImpact: instCostImpact,
        programmeImpact: instProgrammeImpact,
      };
    }
    if (selectedType === 'delay') {
      meta.delay = {
        category: delayCat,
        responsible: delayResponsible,
        description: delayDesc,
        workAffected: delayWorkAffected,
        estimatedHours: delayHours,
      };
    }
    if (selectedType === 'inspection') {
      meta.inspection = { outcome: inspOutcome, reference: inspRef };
    }
    if (selectedType === 'voice_note') {
      meta.voice = { summary: voiceSummary, durationSeconds: recordingDuration };
    }
    return Object.keys(meta).length > 0 ? meta : null;
  };

  const handleSave = async () => {
    if (savingRef.current || !selectedType) return;
    setSaveError(null);

    if (!caption.trim()) {
      setSaveError(t('evidence.capture.captionRequired'));
      return;
    }
    if (!online) {
      setSaveError(t('evidence.capture.offlineNotice'));
      return;
    }
    if (!orgId || !userId || !jobId) {
      setSaveError(t('evidence.capture.saveErrorTitle'));
      return;
    }

    savingRef.current = true;
    setIsSaving(true);
    try {
      // Preserve the original capture time across retries.
      if (!captureTimeRef.current) captureTimeRef.current = new Date().toISOString();

      const { id } = await evidenceService.saveRecord({
        orgId,
        userId,
        recordId: recordIdRef.current,
        jobId,
        captureType: selectedType,
        caption,
        projectStage,
        visibility,
        capturedAt: captureTimeRef.current,
        locationLabel,
        internalNote,
        metadata: buildMetadata(),
      });
      recordIdRef.current = id;

      await evidenceService.attachFiles({
        orgId,
        userId,
        jobId,
        recordId: id,
        visibility,
        files: selectedFiles,
      });

      showToast(t('evidence.capture.capturedSuccess'), 'success');
      const savedId = id;
      resetForm();
      navigate(`/evidence/${savedId}`);
    } catch (err) {
      console.error('Failed to save evidence:', err);
      setSaveError(t('evidence.capture.saveErrorTitle'));
    } finally {
      savingRef.current = false;
      setIsSaving(false);
    }
  };

  if (jobStatus !== 'ready' || !job) {
    return renderStatusScreen(jobStatus, {
      onRetry: () => setReloadKey((k) => k + 1),
      onBack: () => navigate('/jobs'),
      t,
    });
  }

  const acceptAttr = selectedType === 'video' ? 'video/*' : 'image/*';

  return (
    <div className="min-h-screen bg-page pb-24">
      {/* Header */}
      <div className="bg-white border-b border-border sticky top-0 z-20">
        <div className="max-w-[600px] mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-2">
            <button
              className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-page cursor-pointer"
              onClick={() => navigate('/evidence')}
            >
              <i className="ri-arrow-left-line text-lg text-main"></i>
            </button>
            <div className="w-8 h-8 rounded-lg bg-[#1B2A3E] flex items-center justify-center">
              <i className="ri-hard-drive-2-line text-white text-sm"></i>
            </div>
          </div>
          <h1 className="text-lg font-bold text-main">{job.project_name}</h1>
          <div className="flex items-center gap-2 mt-1 text-xs">
            <span className="text-muted">{job.reference}</span>
            <span className="bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full font-medium capitalize">
              {job.status.replace(/_/g, ' ')}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-3">
            <span
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium ${
                online ? 'bg-primary-50 text-primary-700' : 'bg-status-amber-pale text-status-amber'
              }`}
            >
              <i className={`${online ? 'ri-cloud-line' : 'ri-cloud-off-line'} text-xs`}></i>
              {online ? t('evidence.capture.online') : t('evidence.capture.offlineLabel')}
            </span>
          </div>
          {!online && (
            <p className="text-[11px] text-status-amber mt-2 flex items-center gap-1">
              <i className="ri-information-line"></i>
              {t('evidence.capture.offlineNotice')}
            </p>
          )}
        </div>
      </div>

      <div className="max-w-[600px] mx-auto px-4 py-6">
        {!selectedType ? (
          <div>
            <p className="text-sm text-muted mb-4">{t('evidence.capture.subheading')}</p>
            <div className="grid grid-cols-2 gap-3">
              {captureActions.map((act) => (
                <button
                  key={act.type}
                  onClick={() => setSelectedType(act.type)}
                  className="bg-white border border-border rounded-2xl p-4 text-left cursor-pointer hover:border-primary-200 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center mb-2">
                    <i className={`${act.icon} text-lg text-primary-500`}></i>
                  </div>
                  <span className="text-sm font-semibold text-main">{act.label}</span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <button
                className="text-xs font-medium text-muted hover:text-main cursor-pointer flex items-center gap-1"
                onClick={handleCancel}
              >
                <i className="ri-arrow-left-line"></i> {t('evidence.capture.back')}
              </button>
              <span className="text-xs font-semibold text-main">{evidenceTypeLabel(selectedType)}</span>
            </div>

            {/* File attachment area (photo/video) */}
            {(selectedType === 'photo' || selectedType === 'video') && (
              <>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept={acceptAttr}
                  multiple={selectedType === 'photo'}
                  className="hidden"
                  onChange={handleFilesPicked}
                />
                <div
                  className="bg-white border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-primary-300 transition-colors"
                  onClick={handleFileSelect}
                >
                  <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-3">
                    <i className={`${selectedType === 'photo' ? 'ri-camera-line' : 'ri-vidicon-line'} text-2xl text-primary-500`}></i>
                  </div>
                  <p className="text-sm font-medium text-main">
                    {selectedType === 'photo' ? t('evidence.capture.tapSelectPhotos') : t('evidence.capture.tapSelectVideo')}
                  </p>
                  <p className="text-xs text-muted mt-1">{t('evidence.capture.uploadHint')}</p>
                </div>
              </>
            )}

            {/* Voice note recording area */}
            {selectedType === 'voice_note' && (
              <div className="bg-white border border-border rounded-2xl p-6 text-center">
                {!isRecording && recordingDuration === 0 && (
                  <button
                    onClick={handleStartRecording}
                    className="w-16 h-16 rounded-full bg-status-red flex items-center justify-center mx-auto cursor-pointer hover:bg-status-red/90 transition-colors"
                  >
                    <i className="ri-mic-line text-2xl text-white"></i>
                  </button>
                )}
                {isRecording && (
                  <div>
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <span className="w-3 h-3 rounded-full bg-status-red animate-pulse"></span>
                      <span className="text-sm font-semibold text-status-red">{t('evidence.capture.voiceRecording')}</span>
                    </div>
                    <p className="text-2xl font-bold text-main">{recordingDuration}s</p>
                    <button
                      onClick={handleStopRecording}
                      className="mt-4 w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mx-auto cursor-pointer"
                    >
                      <i className="ri-stop-fill text-xl text-white"></i>
                    </button>
                  </div>
                )}
                {!isRecording && recordingDuration > 0 && (
                  <div>
                    <p className="text-sm font-medium text-main mb-2">
                      {t('evidence.capture.voiceRecorded', { seconds: recordingDuration })}
                    </p>
                    <button
                      className="text-sm text-status-red cursor-pointer hover:underline"
                      onClick={handleDeleteRecording}
                    >
                      {t('evidence.capture.voiceDelete')}
                    </button>
                    <div className="mt-4 text-left">
                      <label className="text-xs font-medium text-main block mb-1">{t('evidence.capture.voiceSummary')}</label>
                      <textarea
                        className="w-full h-20 bg-page border border-border rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-primary-300"
                        placeholder={t('evidence.capture.voiceSummaryPlaceholder')}
                        value={voiceSummary}
                        onChange={(e) => setVoiceSummary(e.target.value)}
                      />
                    </div>
                  </div>
                )}
                {recordingError && (
                  <p className="text-xs text-status-amber mt-3 flex items-center justify-center gap-1">
                    <i className="ri-error-warning-line"></i>
                    {recordingError}
                  </p>
                )}
              </div>
            )}

            <SelectedFilesList
              files={selectedFiles}
              onRemove={removeFile}
              labels={{ heading: t('evidence.capture.filesSelected'), remove: t('evidence.capture.removeFile') }}
            />

            {/* Caption */}
            <div>
              <label className="text-xs font-medium text-main block mb-1">{t('evidence.capture.caption')}</label>
              <input
                type="text"
                className="w-full h-10 px-3 bg-white border border-border rounded-xl text-sm focus:outline-none focus:border-primary-300"
                placeholder={t('evidence.capture.captionPlaceholder')}
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
              />
            </div>

            {/* Project Stage */}
            <div>
              <label className="text-xs font-medium text-main block mb-1">{t('evidence.capture.projectStage')}</label>
              <select
                className="w-full h-10 px-3 bg-white border border-border rounded-xl text-sm focus:outline-none focus:border-primary-300 cursor-pointer"
                value={projectStage}
                onChange={(e) => setProjectStage(e.target.value)}
              >
                <option value="">{t('evidence.capture.selectStage')}</option>
                {evidenceJobStages.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {/* Visibility */}
            <div>
              <label className="text-xs font-medium text-main block mb-1">{t('evidence.capture.visibility')}</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setVisibility('internal_only')}
                  className={`flex-1 h-10 rounded-xl text-sm font-medium cursor-pointer border transition-colors ${
                    visibility === 'internal_only' ? 'bg-gray-100 border-gray-300 text-main' : 'bg-white border-border text-muted'
                  }`}
                >
                  {t('evidence.internalOnly')}
                </button>
                <button
                  onClick={() => setVisibility('client_visible')}
                  className={`flex-1 h-10 rounded-xl text-sm font-medium cursor-pointer border transition-colors ${
                    visibility === 'client_visible' ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-border text-muted'
                  }`}
                >
                  {t('evidence.clientVisible')}
                </button>
              </div>
            </div>

            {/* Site Instruction specific */}
            {selectedType === 'site_instruction' && (
              <div className="space-y-4 bg-white border border-border rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-main">{t('evidence.capture.instructionTitle')}</h3>
                <div>
                  <label className="text-xs font-medium text-main block mb-1">{t('evidence.capture.instructionSource')}</label>
                  <select
                    className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm cursor-pointer"
                    value={instSource}
                    onChange={(e) => setInstSource(e.target.value)}
                  >
                    {instructionSources.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-main block mb-1">{t('evidence.capture.instructionPerson')}</label>
                  <input
                    type="text"
                    className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm"
                    placeholder={t('evidence.capture.instructionPersonPlaceholder')}
                    value={instPerson}
                    onChange={(e) => setInstPerson(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-main block mb-1">{t('evidence.capture.exactInstruction')}</label>
                  <textarea
                    className="w-full h-24 bg-page border border-border rounded-xl p-3 text-sm resize-none"
                    value={instText}
                    onChange={(e) => setInstText(e.target.value)}
                  />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>{t('evidence.capture.costImpactQ')}</span>
                  <button
                    onClick={() => setInstCostImpact(!instCostImpact)}
                    className={`w-10 h-6 rounded-full transition-colors ${instCostImpact ? 'bg-primary-500' : 'bg-gray-200'}`}
                  >
                    <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${instCostImpact ? 'translate-x-4' : 'translate-x-0.5'}`}></span>
                  </button>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>{t('evidence.capture.programmeImpactQ')}</span>
                  <button
                    onClick={() => setInstProgrammeImpact(!instProgrammeImpact)}
                    className={`w-10 h-6 rounded-full transition-colors ${instProgrammeImpact ? 'bg-primary-500' : 'bg-gray-200'}`}
                  >
                    <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${instProgrammeImpact ? 'translate-x-4' : 'translate-x-0.5'}`}></span>
                  </button>
                </div>
              </div>
            )}

            {/* Delay specific */}
            {selectedType === 'delay' && (
              <div className="space-y-4 bg-white border border-border rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-main">{t('evidence.capture.delayTitle')}</h3>
                <div>
                  <label className="text-xs font-medium text-main block mb-1">{t('evidence.capture.delayCategory')}</label>
                  <select
                    className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm cursor-pointer"
                    value={delayCat}
                    onChange={(e) => setDelayCat(e.target.value)}
                  >
                    <option value="">{t('evidence.capture.selectStage')}</option>
                    {delayCategories.map((c) => (
                      <option key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase())}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-main block mb-1">{t('evidence.capture.delayResponsible')}</label>
                  <input
                    type="text"
                    className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm"
                    value={delayResponsible}
                    onChange={(e) => setDelayResponsible(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-main block mb-1">{t('evidence.capture.delayDescription')}</label>
                  <textarea
                    className="w-full h-20 bg-page border border-border rounded-xl p-3 text-sm resize-none"
                    value={delayDesc}
                    onChange={(e) => setDelayDesc(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-main block mb-1">{t('evidence.capture.delayWorkAffected')}</label>
                  <input
                    type="text"
                    className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm"
                    value={delayWorkAffected}
                    onChange={(e) => setDelayWorkAffected(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-main block mb-1">{t('evidence.capture.delayEstimatedHours')}</label>
                  <input
                    type="number"
                    className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm"
                    value={delayHours}
                    onChange={(e) => setDelayHours(Number(e.target.value))}
                  />
                </div>
              </div>
            )}

            {/* Inspection specific */}
            {selectedType === 'inspection' && (
              <div className="space-y-4 bg-white border border-border rounded-2xl p-4">
                <div>
                  <label className="text-xs font-medium text-main block mb-1">{t('evidence.capture.inspectionOutcome')}</label>
                  <select
                    className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm cursor-pointer"
                    value={inspOutcome}
                    onChange={(e) => setInspOutcome(e.target.value)}
                  >
                    <option value="">{t('evidence.capture.selectStage')}</option>
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                    <option value="partial">Partial pass with conditions</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-main block mb-1">{t('evidence.capture.inspectionReference')}</label>
                  <input
                    type="text"
                    className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm"
                    placeholder="e.g. BC-1048-02"
                    value={inspRef}
                    onChange={(e) => setInspRef(e.target.value)}
                  />
                </div>
              </div>
            )}

            {/* Add more info toggle */}
            <div>
              <button
                onClick={() => setShowMore(!showMore)}
                className="text-sm font-medium text-muted hover:text-main cursor-pointer flex items-center gap-1"
              >
                <i className={`ri-${showMore ? 'subtract' : 'add'}-line`}></i>
                {t('evidence.capture.addMoreInfo')}
              </button>
            </div>

            {showMore && (
              <div className="space-y-3 bg-white border border-border rounded-2xl p-4">
                <div>
                  <label className="text-xs font-medium text-main block mb-1">{t('evidence.capture.locationLabel')}</label>
                  <input
                    type="text"
                    className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm"
                    value={locationLabel}
                    onChange={(e) => setLocationLabel(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-main block mb-1">{t('evidence.capture.internalNote')}</label>
                  <textarea
                    className="w-full h-20 bg-page border border-border rounded-xl p-3 text-sm resize-none"
                    value={internalNote}
                    onChange={(e) => setInternalNote(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky Save */}
      {selectedType && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4 z-30">
          <div className="max-w-[600px] mx-auto">
            {saveError && (
              <div className="mb-3 flex items-start gap-2 bg-status-red-pale border border-[#F3C6C6] rounded-xl px-3 py-2">
                <i className="ri-error-warning-line text-status-red text-sm mt-0.5"></i>
                <p className="text-xs text-status-red flex-1">{saveError}</p>
              </div>
            )}
            <div className="flex items-center gap-3">
              {!online && (
                <span className="text-[10px] font-medium text-status-amber bg-status-amber-pale px-2 py-1 rounded-full whitespace-nowrap">
                  {t('evidence.capture.offlineLabel')}
                </span>
              )}
              <button
                onClick={handleCancel}
                disabled={isSaving}
                className="h-12 px-5 border border-border text-main text-sm font-medium rounded-xl cursor-pointer hover:bg-page disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
              >
                {t('evidence.capture.cancel')}
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving || !online}
                className="flex-1 h-12 bg-primary-500 text-white text-sm font-semibold rounded-xl cursor-pointer hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap flex items-center justify-center gap-2"
              >
                {isSaving && (
                  <span className="inline-block w-4 h-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
                )}
                {isSaving ? t('evidence.capture.saving') : saveError ? t('evidence.capture.retry') : t('evidence.capture.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface StatusScreenHandlers {
  onRetry: () => void;
  onBack: () => void;
  t: (key: string) => string;
}

function renderStatusScreen(status: JobStatus, { onRetry, onBack, t }: StatusScreenHandlers) {
  const copy: Record<JobStatus, { icon: string; title: string; desc: string; retry: boolean }> = {
    loading: { icon: 'ri-loader-4-line', title: t('evidence.capture.loadingJob'), desc: '', retry: false },
    error: { icon: 'ri-error-warning-line', title: t('evidence.capture.jobLoadError'), desc: t('evidence.capture.jobLoadErrorDesc'), retry: true },
    notfound: { icon: 'ri-file-unknow-line', title: t('evidence.capture.jobNotFound'), desc: t('evidence.capture.jobNotFoundDesc'), retry: false },
    'no-org': { icon: 'ri-building-2-line', title: t('evidence.capture.noOrg'), desc: t('evidence.capture.noOrgDesc'), retry: false },
    ready: { icon: 'ri-loader-4-line', title: '', desc: '', retry: false },
  };
  const c = copy[status];
  return (
    <div className="min-h-screen bg-page flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 rounded-2xl bg-white border border-border flex items-center justify-center mx-auto mb-4">
          <i className={`${c.icon} text-2xl text-muted ${status === 'loading' ? 'animate-spin' : ''}`}></i>
        </div>
        <h1 className="text-lg font-bold text-main">{c.title}</h1>
        {c.desc && <p className="text-sm text-muted mt-1">{c.desc}</p>}
        <div className="flex items-center justify-center gap-2 mt-5">
          {c.retry && (
            <button
              onClick={onRetry}
              className="h-10 px-5 bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold rounded-xl cursor-pointer whitespace-nowrap"
            >
              {t('evidence.capture.retry')}
            </button>
          )}
          <button
            onClick={onBack}
            className="h-10 px-5 border border-border text-main text-sm font-medium rounded-xl hover:bg-white cursor-pointer whitespace-nowrap"
          >
            {t('evidence.capture.backToJobs')}
          </button>
        </div>
      </div>
    </div>
  );
}