import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useParams, useNavigate } from 'react-router-dom';
import { demoFullJobs } from '@/mocks/jobs';
import { evidenceJobStages } from '@/mocks/evidence';
import { useToast } from '@/components/base/Toast';

const STEPS = 6;

export default function NewDailyLog() {
  const { t } = useTranslation();
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();

  const job = demoFullJobs.find((j) => j.id === jobId);
  const [step, setStep] = useState(1);
  const [logDate, setLogDate] = useState('2026-08-05');
  const [siteOpen, setSiteOpen] = useState('07:45');
  const [siteClose, setSiteClose] = useState('16:30');
  const [supervisor, setSupervisor] = useState('Martin Hewett');
  const [weather, setWeather] = useState('Sunny with light cloud, 21°C');
  const [temperature, setTemperature] = useState('21°C');
  const [siteConditions, setSiteConditions] = useState('Dry, good visibility.');
  const [accessIssues, setAccessIssues] = useState('');
  const [welfareStatus, setWelfareStatus] = useState('Welfare checked and working.');
  const [workCompleted, setWorkCompleted] = useState('');
  const [stagesAffected, setStagesAffected] = useState<string[]>(['Structure']);
  const [progressEstimate, setProgressEstimate] = useState(68);
  const [plantUsed, setPlantUsed] = useState('');
  const [materialsUsed, setMaterialsUsed] = useState('');
  const [deliveries, setDeliveries] = useState('');
  const [inspections, setInspections] = useState('');
  const [tests, setTests] = useState('');
  const [delays, setDelays] = useState('');
  const [instructions, setInstructions] = useState('');
  const [designQueries, setDesignQueries] = useState('');
  const [safetyObs, setSafetyObs] = useState('');
  const [damage, setDamage] = useState('');
  const [clientDecisions, setClientDecisions] = useState('');
  const [variationsReq, setVariationsReq] = useState('');
  const [plannedWork, setPlannedWork] = useState('');
  const [peopleRequired, setPeopleRequired] = useState('');
  const [materialsRequired, setMaterialsRequired] = useState('');
  const [plantRequired, setPlantRequired] = useState('');
  const [decisionsNeeded, setDecisionsNeeded] = useState('');
  const [risks, setRisks] = useState('');
  const [showClientPreview, setShowClientPreview] = useState(false);

  if (!job) {
    return (
      <div className="max-w-[1440px] mx-auto px-4 md:px-6 py-12 text-center">
        <p className="text-main font-semibold">Job not found</p>
      </div>
    );
  }

  const toggleStage = (stage: string) => {
    setStagesAffected((prev) => prev.includes(stage) ? prev.filter((s) => s !== stage) : [...prev, stage]);
  };

  const handleComplete = (publishClient?: boolean) => {
    if (publishClient) {
      showToast('Daily log completed and client summary published (demo).', 'success');
    } else {
      showToast('Daily log completed (demo).', 'success');
    }
    navigate(`/jobs/${jobId}/daily-logs`);
  };

  const renderStepIndicator = () => (
    <div className="flex items-center gap-2 mb-6">
      {Array.from({ length: STEPS }, (_, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${i + 1 <= step ? 'bg-primary-500 text-white' : 'bg-page text-muted'}`}>
            {i + 1}
          </div>
          {i < STEPS - 1 && <div className={`w-6 h-0.5 ${i + 1 < step ? 'bg-primary-500' : 'bg-page'}`}></div>}
        </div>
      ))}
      <span className="text-xs text-muted ml-2">{t(`evidence.dailyLog.step${step}Number`)}</span>
    </div>
  );

  return (
    <div className="max-w-[900px] mx-auto px-4 md:px-6 py-6 space-y-6">
      <button className="text-sm font-medium text-muted hover:text-main cursor-pointer flex items-center gap-1" onClick={() => navigate(`/jobs/${jobId}/daily-logs`)}>
        <i className="ri-arrow-left-line text-base"></i>Back to daily logs
      </button>

      <h1 className="text-xl font-bold text-main">{t('evidence.dailyLog.newLog')}</h1>
      <p className="text-sm text-muted">{job.project} · {job.reference}</p>

      {renderStepIndicator()}

      <div className="bg-white border border-border rounded-2xl p-5">
        <h2 className="text-lg font-semibold text-main mb-4">{t(`evidence.dailyLog.step${step}Title`)}</h2>

        {/* Step 1: Day & Attendance */}
        {step === 1 && (
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-main block mb-1">{t('evidence.dailyLog.logDate')}</label>
                <input type="date" className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm" value={logDate} onChange={(e) => setLogDate(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-main block mb-1">{t('evidence.dailyLog.supervisor')}</label>
                <input type="text" className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm" value={supervisor} onChange={(e) => setSupervisor(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-main block mb-1">{t('evidence.dailyLog.siteOpenTime')}</label>
                <input type="time" className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm" value={siteOpen} onChange={(e) => setSiteOpen(e.target.value)} />
              </div>
              <div>
                <label className="text-xs font-medium text-main block mb-1">{t('evidence.dailyLog.siteCloseTime')}</label>
                <input type="time" className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm" value={siteClose} onChange={(e) => setSiteClose(e.target.value)} />
              </div>
            </div>
            <div className="text-xs text-muted mt-2">
              <p>Demo attendance (auto-populated):</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {['MH · 8.75h', 'JL · 8h', 'AK · 7.5h'].map((a) => (
                  <span key={a} className="bg-primary-50 text-primary-700 px-2 py-1 rounded-full text-[10px] font-medium">{a}</span>
                ))}
              </div>
              <p className="mt-1">Total: 24.25h</p>
            </div>
          </div>
        )}

        {/* Step 2: Conditions */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-main block mb-1">{t('evidence.dailyLog.weatherDesc')}</label>
              <input type="text" className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm" value={weather} onChange={(e) => setWeather(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-main block mb-1">{t('evidence.dailyLog.temperature')}</label>
              <input type="text" className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm" value={temperature} onChange={(e) => setTemperature(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-main block mb-1">{t('evidence.dailyLog.siteConditions')}</label>
              <textarea className="w-full h-20 bg-page border border-border rounded-xl p-3 text-sm resize-none" value={siteConditions} onChange={(e) => setSiteConditions(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-main block mb-1">{t('evidence.dailyLog.welfareStatus')}</label>
              <input type="text" className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm" value={welfareStatus} onChange={(e) => setWelfareStatus(e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 3: Work Completed */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="text-xs font-medium text-main block mb-1">{t('evidence.dailyLog.workCompleted')}</label>
              <textarea className="w-full h-32 bg-page border border-border rounded-xl p-3 text-sm resize-none" value={workCompleted} onChange={(e) => setWorkCompleted(e.target.value)} placeholder="Describe work completed today..." />
            </div>
            <div>
              <label className="text-xs font-medium text-main block mb-2">{t('evidence.dailyLog.jobStagesAffected')}</label>
              <div className="flex flex-wrap gap-2">
                {evidenceJobStages.map((s) => (
                  <button key={s} onClick={() => toggleStage(s)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full cursor-pointer ${stagesAffected.includes(s) ? 'bg-primary-500 text-white' : 'bg-page text-muted'}`}>
                    {s}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-main block mb-1">{t('evidence.dailyLog.progressEstimate')}</label>
              <input type="number" className="w-24 h-10 px-3 bg-page border border-border rounded-xl text-sm" value={progressEstimate} onChange={(e) => setProgressEstimate(Number(e.target.value))} min={0} max={100} />
            </div>
            <div>
              <label className="text-xs font-medium text-main block mb-1">{t('evidence.dailyLog.plantUsed')}</label>
              <input type="text" className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm" value={plantUsed} onChange={(e) => setPlantUsed(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-main block mb-1">{t('evidence.dailyLog.materialsUsed')}</label>
              <input type="text" className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm" value={materialsUsed} onChange={(e) => setMaterialsUsed(e.target.value)} />
            </div>
            <div>
              <label className="text-xs font-medium text-main block mb-1">{t('evidence.dailyLog.deliveries')}</label>
              <input type="text" className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm" value={deliveries} onChange={(e) => setDeliveries(e.target.value)} />
            </div>
          </div>
        )}

        {/* Step 4: Issues */}
        {step === 4 && (
          <div className="space-y-4">
            {[
              { label: 'delays', val: delays, set: setDelays },
              { label: 'instructions', val: instructions, set: setInstructions },
              { label: 'designQueries', val: designQueries, set: setDesignQueries },
              { label: 'safetyObservations', val: safetyObs, set: setSafetyObs },
              { label: 'damage', val: damage, set: setDamage },
              { label: 'clientDecisions', val: clientDecisions, set: setClientDecisions },
              { label: 'variationsRequired', val: variationsReq, set: setVariationsReq },
            ].map((field) => (
              <div key={field.label}>
                <label className="text-xs font-medium text-main block mb-1">{t(`evidence.dailyLog.${field.label}`)}</label>
                <input type="text" className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm" value={field.val} onChange={(e) => field.set(e.target.value)} />
              </div>
            ))}
          </div>
        )}

        {/* Step 5: Tomorrow */}
        {step === 5 && (
          <div className="space-y-4">
            {[
              { label: 'plannedWork', val: plannedWork, set: setPlannedWork, type: 'textarea' },
              { label: 'peopleRequired', val: peopleRequired, set: setPeopleRequired, type: 'text' },
              { label: 'materialsRequired', val: materialsRequired, set: setMaterialsRequired, type: 'text' },
              { label: 'plantRequired', val: plantRequired, set: setPlantRequired, type: 'text' },
              { label: 'decisionsNeeded', val: decisionsNeeded, set: setDecisionsNeeded, type: 'text' },
              { label: 'risks', val: risks, set: setRisks, type: 'textarea' },
            ].map((field) => (
              <div key={field.label}>
                <label className="text-xs font-medium text-main block mb-1">{t(`evidence.dailyLog.${field.label}`)}</label>
                {field.type === 'textarea' ? (
                  <textarea className="w-full h-24 bg-page border border-border rounded-xl p-3 text-sm resize-none" value={field.val} onChange={(e) => field.set(e.target.value)} />
                ) : (
                  <input type="text" className="w-full h-10 px-3 bg-page border border-border rounded-xl text-sm" value={field.val} onChange={(e) => field.set(e.target.value)} />
                )}
              </div>
            ))}
          </div>
        )}

        {/* Step 6: Review */}
        {step === 6 && (
          <div className="space-y-5">
            {/* Summary */}
            <div className="space-y-3">
              {[
                { label: 'Date & Supervisor', value: `${new Date(logDate).toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} · ${supervisor}` },
                { label: 'Hours', value: `${siteOpen} – ${siteClose} · 24.25h total` },
                { label: 'Weather', value: weather },
                { label: 'Work completed', value: workCompleted || '—' },
                { label: 'Stages affected', value: stagesAffected.join(', ') || '—' },
                { label: 'Delays', value: delays || 'None' },
                { label: 'Planned tomorrow', value: plannedWork || '—' },
              ].map((item) => (
                <div key={item.label} className="flex justify-between text-sm">
                  <span className="text-muted">{item.label}</span>
                  <span className="font-medium text-main text-right max-w-[60%]">{item.value}</span>
                </div>
              ))}
            </div>

            {/* Client Summary Preview */}
            <div>
              <button
                onClick={() => setShowClientPreview(!showClientPreview)}
                className="text-sm font-medium text-primary-500 cursor-pointer hover:text-primary-600 flex items-center gap-1"
              >
                <i className={`ri-${showClientPreview ? 'eye-off' : 'eye'}-line`}></i>
                {showClientPreview ? 'Hide' : 'Show'} {t('evidence.dailyLog.clientSummaryPreview')}
              </button>
              {showClientPreview && (
                <div className="mt-3 bg-primary-50 border border-primary-200 rounded-2xl p-4">
                  <p className="text-[10px] text-muted mb-2">{t('evidence.dailyLog.noInternalCosts')}</p>
                  <div className="text-sm text-main space-y-2">
                    <p><strong>Weather:</strong> {weather}</p>
                    <p><strong>Work completed today:</strong> {workCompleted || '—'}</p>
                    <p><strong>Tomorrow:</strong> {plannedWork || '—'}</p>
                    {delays && <p><strong>Delay:</strong> {delays}</p>}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pt-4 border-t border-border">
          <button
            onClick={() => setStep(step - 1)}
            className={`h-10 px-4 text-sm font-medium rounded-xl cursor-pointer ${step === 1 ? 'invisible' : 'bg-page text-main hover:bg-background-100'}`}
          >
            <i className="ri-arrow-left-line mr-1"></i>Back
          </button>
          <div className="flex items-center gap-2">
            {step === STEPS ? (
              <>
                <button
                  onClick={() => handleComplete()}
                  className="h-10 px-4 text-sm font-medium bg-page text-main rounded-xl cursor-pointer hover:bg-background-100 whitespace-nowrap"
                >
                  <i className="ri-save-line mr-1"></i>{t('evidence.dailyLog.completeLog')}
                </button>
                <button
                  onClick={() => handleComplete(true)}
                  className="h-10 px-4 text-sm font-semibold bg-primary-500 text-white rounded-xl cursor-pointer hover:bg-primary-600 whitespace-nowrap"
                >
                  <i className="ri-send-plane-line mr-1"></i>{t('evidence.dailyLog.completeAndPublish')}
                </button>
              </>
            ) : (
              <button
                onClick={() => setStep(step + 1)}
                className="h-10 px-5 text-sm font-semibold bg-primary-500 text-white rounded-xl cursor-pointer hover:bg-primary-600 whitespace-nowrap"
              >
                Continue<i className="ri-arrow-right-line ml-1"></i>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}