import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { demoFullJobs } from '@/mocks/jobs';
import { evidenceTypes, evidenceJobStages, delayCategories, instructionSources, getEvidenceTypeLabel, getEvidenceTypeIcon } from '@/mocks/evidence';
import { useToast } from '@/components/base/Toast';

type CaptureType = 'photo' | 'video' | 'voice_note' | 'written_note' | 'labour_record' | 'material_record' | 'delivery' | 'site_instruction' | 'delay' | 'inspection' | 'completion_signoff';

export default function SiteCapture() {
  const { t } = useTranslation();
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const job = demoFullJobs.find((j) => j.id === jobId);
  const [selectedType, setSelectedType] = useState<CaptureType | null>(null);
  const [caption, setCaption] = useState('');
  const [projectStage, setProjectStage] = useState(job ? 'Structure' : '');
  const [visibility, setVisibility] = useState<'internal_only' | 'client_visible'>('internal_only');
  const [showMore, setShowMore] = useState(false);
  const [internalNote, setInternalNote] = useState('');
  const [locationLabel, setLocationLabel] = useState('');
  const [offlineMode, setOfflineMode] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [voiceSummary, setVoiceSummary] = useState('');

  // Instruction fields
  const [instTitle, setInstTitle] = useState('');
  const [instSource, setInstSource] = useState('Client');
  const [instPerson, setInstPerson] = useState('');
  const [instText, setInstText] = useState('');
  const [instCostImpact, setInstCostImpact] = useState(false);
  const [instProgrammeImpact, setInstProgrammeImpact] = useState(false);

  // Delay fields
  const [delayTitle, setDelayTitle] = useState('');
  const [delayCat, setDelayCat] = useState('');
  const [delayResponsible, setDelayResponsible] = useState('');
  const [delayDesc, setDelayDesc] = useState('');
  const [delayWorkAffected, setDelayWorkAffected] = useState('');
  const [delayHours, setDelayHours] = useState(0);

  // Inspection fields
  const [inspOutcome, setInspOutcome] = useState('');
  const [inspRef, setInspRef] = useState('');

  const captureActions: { type: CaptureType; label: string; icon: string }[] = [
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
  ];

  if (!job) {
    return (
      <div className="min-h-screen bg-page flex items-center justify-center px-4">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-white border border-border flex items-center justify-center mx-auto mb-4">
            <i className="ri-error-warning-line text-2xl text-muted"></i>
          </div>
          <h1 className="text-lg font-bold text-main">Job not found</h1>
        </div>
      </div>
    );
  }

  const handleSave = () => {
    const msg = offlineMode ? 'Saved on device (offline mode).' : 'Evidence captured and synced.';
    showToast(msg, 'success');
    setSelectedType(null);
    setCaption('');
  };

  const handleFileSelect = () => {
    showToast('Demo: file selected for local preview.', 'info');
  };

  const handleStartRecording = () => {
    setIsRecording(true);
    setRecordingDuration(0);
    const interval = setInterval(() => {
      setRecordingDuration((prev) => {
        if (prev >= 60) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 1000);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    showToast('Recording stopped (demo). 34 seconds captured.', 'info');
  };

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
            <div className="w-8 h-8 rounded-lg bg-primary-500 flex items-center justify-center">
              <span className="text-white text-xs font-bold">BN</span>
            </div>
          </div>
          <h1 className="text-lg font-bold text-main">{job.project}</h1>
          <div className="flex items-center gap-2 mt-1 text-xs">
            <span className="text-muted">{job.reference}</span>
            <span className="bg-primary-50 text-primary-700 px-2 py-0.5 rounded-full font-medium">{job.status}</span>
          </div>
          {/* Offline Toggle */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => setOfflineMode(!offlineMode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-medium cursor-pointer ${
                offlineMode ? 'bg-status-amber-pale text-status-amber' : 'bg-page text-muted'
              }`}
            >
              <i className={`${offlineMode ? 'ri-cloud-off-line' : 'ri-cloud-line'} text-xs`}></i>
              {offlineMode ? t('evidence.capture.offlineMode') : 'Online'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-[600px] mx-auto px-4 py-6">
        {!selectedType ? (
          /* Capture type selector */
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
          /* Capture form */
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <button
                className="text-xs font-medium text-muted hover:text-main cursor-pointer flex items-center gap-1"
                onClick={() => setSelectedType(null)}
              >
                <i className="ri-arrow-left-line"></i> Back
              </button>
              <span className="text-xs font-semibold text-main">{getEvidenceTypeLabel(selectedType)}</span>
            </div>

            {/* File attachment area (for photo/video) */}
            {(selectedType === 'photo' || selectedType === 'video') && (
              <div
                className="bg-white border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-primary-300 transition-colors"
                onClick={handleFileSelect}
              >
                <div className="w-14 h-14 rounded-2xl bg-primary-50 flex items-center justify-center mx-auto mb-3">
                  <i className={`${selectedType === 'photo' ? 'ri-camera-line' : 'ri-vidicon-line'} text-2xl text-primary-500`}></i>
                </div>
                <p className="text-sm font-medium text-main">{selectedType === 'photo' ? 'Tap to select photos' : 'Tap to select video'}</p>
                <p className="text-xs text-muted mt-1">Demo: local file selection only</p>
              </div>
            )}

            {/* Voice note recording area */}
            {selectedType === 'voice_note' && (
              <div className="bg-white border border-border rounded-2xl p-6 text-center">
                {!isRecording && recordingDuration === 0 ? (
                  <button onClick={handleStartRecording} className="w-16 h-16 rounded-full bg-status-red flex items-center justify-center mx-auto cursor-pointer hover:bg-status-red/90 transition-colors">
                    <i className="ri-mic-line text-2xl text-white"></i>
                  </button>
                ) : null}
                {isRecording && (
                  <div>
                    <div className="flex items-center justify-center gap-2 mb-4">
                      <span className="w-3 h-3 rounded-full bg-status-red animate-pulse"></span>
                      <span className="text-sm font-semibold text-status-red">{t('evidence.capture.voiceRecording')}</span>
                    </div>
                    <p className="text-2xl font-bold text-main">{recordingDuration}s</p>
                    <button onClick={handleStopRecording} className="mt-4 w-14 h-14 rounded-full bg-gray-800 flex items-center justify-center mx-auto cursor-pointer">
                      <i className="ri-stop-fill text-xl text-white"></i>
                    </button>
                  </div>
                )}
                {!isRecording && recordingDuration > 0 && (
                  <div>
                    <div className="flex items-center justify-center gap-3 mb-4">
                      <button className="w-12 h-12 rounded-full bg-primary-500 flex items-center justify-center cursor-pointer">
                        <i className="ri-play-fill text-xl text-white"></i>
                      </button>
                      <span className="text-sm font-medium text-main">{recordingDuration}s · {t('evidence.capture.voicePlayback')}</span>
                    </div>
                    <button
                      className="text-sm text-status-red cursor-pointer hover:underline"
                      onClick={() => { setRecordingDuration(0); showToast('Recording deleted.', 'info'); }}
                    >
                      {t('evidence.capture.voiceDelete')}
                    </button>
                    <div className="mt-4 text-left">
                      <label className="text-xs font-medium text-main block mb-1">{t('evidence.capture.voiceSummary')}</label>
                      <textarea
                        className="w-full h-20 bg-page border border-border rounded-xl p-3 text-sm resize-none focus:outline-none focus:border-primary-300"
                        placeholder="Write a brief summary of the voice note..."
                        value={voiceSummary}
                        onChange={(e) => setVoiceSummary(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Caption */}
            <div>
              <label className="text-xs font-medium text-main block mb-1">{t('evidence.capture.caption')}</label>
              <input
                type="text"
                className="w-full h-10 px-3 bg-white border border-border rounded-xl text-sm focus:outline-none focus:border-primary-300"
                placeholder="Describe what this evidence shows..."
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
                {evidenceJobStages.map((s) => <option key={s} value={s}>{s}</option>)}
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
                  Internal only
                </button>
                <button
                  onClick={() => setVisibility('client_visible')}
                  className={`flex-1 h-10 rounded-xl text-sm font-medium cursor-pointer border transition-colors ${
                    visibility === 'client_visible' ? 'bg-primary-50 border-primary-300 text-primary-700' : 'bg-white border-border text-muted'
                  }`}
                >
                  Client visible
                </button>
              </div>
            </div>

            {/* Site Instruction specific */}
            {selectedType === 'site_instruction' && (
              <div className="space-y-4 bg-white border border-border rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-main">{t('evidence.capture.instructionTitle')}</h3>
                <div>
                  <label className="text-xs font-medium text-main block mb-1">{t('evidence.capture.instructionSource')}</label>
                  <select className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm cursor-pointer" value={instSource} onChange={(e) => setInstSource(e.target.value)}>
                    {instructionSources.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-main block mb-1">{t('evidence.capture.instructionPerson')}</label>
                  <input type="text" className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm" placeholder="e.g. Sarah Miller" value={instPerson} onChange={(e) => setInstPerson(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-main block mb-1">{t('evidence.capture.exactInstruction')}</label>
                  <textarea className="w-full h-24 bg-page border border-border rounded-xl p-3 text-sm resize-none" value={instText} onChange={(e) => setInstText(e.target.value)} />
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>{t('evidence.capture.costImpactQ')}</span>
                  <button onClick={() => setInstCostImpact(!instCostImpact)} className={`w-10 h-6 rounded-full transition-colors ${instCostImpact ? 'bg-primary-500' : 'bg-gray-200'}`}>
                    <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${instCostImpact ? 'translate-x-4' : 'translate-x-0.5'}`}></span>
                  </button>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span>{t('evidence.capture.programmeImpactQ')}</span>
                  <button onClick={() => setInstProgrammeImpact(!instProgrammeImpact)} className={`w-10 h-6 rounded-full transition-colors ${instProgrammeImpact ? 'bg-primary-500' : 'bg-gray-200'}`}>
                    <span className={`block w-5 h-5 rounded-full bg-white transition-transform ${instProgrammeImpact ? 'translate-x-4' : 'translate-x-0.5'}`}></span>
                  </button>
                </div>
                {(instCostImpact || instProgrammeImpact) && (
                  <button
                    className="w-full h-10 bg-primary-500 text-white text-sm font-semibold rounded-xl cursor-pointer hover:bg-primary-600"
                    onClick={() => showToast('Draft variation created from instruction (demo).', 'success')}
                  >
                    {t('evidence.capture.createVariation')}
                  </button>
                )}
              </div>
            )}

            {/* Delay specific */}
            {selectedType === 'delay' && (
              <div className="space-y-4 bg-white border border-border rounded-2xl p-4">
                <h3 className="text-sm font-semibold text-main">{t('evidence.capture.delayTitle')}</h3>
                <div><label className="text-xs font-medium text-main block mb-1">{t('evidence.capture.delayCategory')}</label>
                  <select className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm cursor-pointer" value={delayCat} onChange={(e) => setDelayCat(e.target.value)}>
                    <option value="">Select...</option>
                    {delayCategories.map((c) => <option key={c} value={c}>{c.replace(/_/g, ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}</option>)}
                  </select>
                </div>
                <div><label className="text-xs font-medium text-main block mb-1">{t('evidence.capture.delayResponsible')}</label>
                  <input type="text" className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm" value={delayResponsible} onChange={(e) => setDelayResponsible(e.target.value)} />
                </div>
                <div><label className="text-xs font-medium text-main block mb-1">{t('evidence.capture.delayDescription')}</label>
                  <textarea className="w-full h-20 bg-page border border-border rounded-xl p-3 text-sm resize-none" value={delayDesc} onChange={(e) => setDelayDesc(e.target.value)} />
                </div>
                <div><label className="text-xs font-medium text-main block mb-1">{t('evidence.capture.delayWorkAffected')}</label>
                  <input type="text" className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm" value={delayWorkAffected} onChange={(e) => setDelayWorkAffected(e.target.value)} />
                </div>
                <div><label className="text-xs font-medium text-main block mb-1">{t('evidence.capture.delayEstimatedHours')}</label>
                  <input type="number" className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm" value={delayHours} onChange={(e) => setDelayHours(Number(e.target.value))} />
                </div>
              </div>
            )}

            {/* Inspection specific */}
            {selectedType === 'inspection' && (
              <div className="space-y-4 bg-white border border-border rounded-2xl p-4">
                <div><label className="text-xs font-medium text-main block mb-1">Outcome</label>
                  <select className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm cursor-pointer" value={inspOutcome} onChange={(e) => setInspOutcome(e.target.value)}>
                    <option value="">Select...</option>
                    <option value="passed">Passed</option>
                    <option value="failed">Failed</option>
                    <option value="partial">Partial pass with conditions</option>
                  </select>
                </div>
                <div><label className="text-xs font-medium text-main block mb-1">Reference</label>
                  <input type="text" className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm" placeholder="e.g. BC-1048-02" value={inspRef} onChange={(e) => setInspRef(e.target.value)} />
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
                  <input type="text" className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm" value={locationLabel} onChange={(e) => setLocationLabel(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs font-medium text-main block mb-1">{t('evidence.capture.internalNote')}</label>
                  <textarea className="w-full h-20 bg-page border border-border rounded-xl p-3 text-sm resize-none" value={internalNote} onChange={(e) => setInternalNote(e.target.value)} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Sticky Save */}
      {selectedType && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-border p-4 z-30">
          <div className="max-w-[600px] mx-auto flex items-center gap-3">
            {offlineMode && (
              <span className="text-[10px] font-medium text-status-amber bg-status-amber-pale px-2 py-1 rounded-full">
                {t('evidence.capture.offlineMode')}
              </span>
            )}
            <button
              onClick={() => { setSelectedType(null); setCaption(''); }}
              className="h-12 px-5 border border-border text-main text-sm font-medium rounded-xl cursor-pointer hover:bg-page"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="flex-1 h-12 bg-primary-500 text-white text-sm font-semibold rounded-xl cursor-pointer hover:bg-primary-600"
            >
              {t('evidence.capture.save')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}