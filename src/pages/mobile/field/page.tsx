// Field Mode — Voice Daily Log & OCR Scanner (PWA view)
import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import VoiceLogTab from './components/VoiceLogTab';
import ScannerTab from './components/ScannerTab';
import FieldBottomNav from './components/FieldBottomNav';
import { useConnectivity } from '@/contexts/ConnectivityContext';
import { fieldJobs } from '@/mocks/field';

type Tab = 'voice' | 'scan';

export default function MobileFieldPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isOnline, syncCounts } = useConnectivity();
  const [activeTab, setActiveTab] = useState<Tab>(
    searchParams.get('tab') === 'scan' ? 'scan' : 'voice',
  );
  const [selectedJob, setSelectedJob] = useState(fieldJobs[0]);
  const [jobMenuOpen, setJobMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close job menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setJobMenuOpen(false);
      }
    }
    if (jobMenuOpen) {
      document.addEventListener('mousedown', handleClick);
    }
    return () => document.removeEventListener('mousedown', handleClick);
  }, [jobMenuOpen]);

  const selectTab = (tab: Tab) => {
    setActiveTab(tab);
    setSearchParams(tab === 'scan' ? { tab: 'scan' } : { tab: 'voice' });
  };

  const selectJob = (job: (typeof fieldJobs)[number]) => {
    setSelectedJob(job);
    setJobMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-24">
      {/* Top bar — dark slate header */}
      <header className="sticky top-0 z-20 bg-slate-900 text-white">
        <div className="px-4 pt-3 pb-3">
          {/* Job selector */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setJobMenuOpen((o) => !o)}
              className="w-full flex items-center gap-3 py-1.5 text-left"
              aria-haspopup="listbox"
              aria-expanded={jobMenuOpen}
            >
              <span className="w-9 h-9 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0">
                <i className="ri-briefcase-line text-white"></i>
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-sm font-semibold truncate">
                  {selectedJob.reference} — {selectedJob.project}
                </span>
                <span className="block text-xs text-slate-400 truncate">{selectedJob.site}</span>
              </span>
              <i className={`ri-arrow-down-s-line transition-transform ${jobMenuOpen ? 'rotate-180' : ''}`}></i>
            </button>

            {/* Offline sync badge */}
            <div className="flex items-center gap-2 mt-2">
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${
                  isOnline ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'
                }`}
              >
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400' : 'bg-amber-400'}`}></span>
                {isOnline ? 'Offline Sync Ready' : 'Offline — queued'}
                {syncCounts.queued > 0 && (
                  <span className="ml-0.5 bg-white/20 px-1.5 py-0.5 rounded-full text-[10px]">
                    {syncCounts.queued}
                  </span>
                )}
              </span>
            </div>

            {/* Job dropdown */}
            {jobMenuOpen && (
              <div
                className="absolute left-0 right-0 top-full mt-2 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden z-30 animate-slide-down"
                role="listbox"
              >
                {fieldJobs.map((job) => (
                  <button
                    key={job.id}
                    onClick={() => selectJob(job)}
                    role="option"
                    aria-selected={job.id === selectedJob.id}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${
                      job.id === selectedJob.id ? 'bg-amber-50' : ''
                    }`}
                  >
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-semibold text-slate-900 truncate">
                        {job.reference} — {job.project}
                      </span>
                      <span className="block text-xs text-slate-500">{job.trade}</span>
                    </span>
                    {job.id === selectedJob.id && (
                      <i className="ri-check-line text-amber-600"></i>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Tab switcher */}
          <div className="flex items-center bg-white/10 rounded-full p-1 mt-3">
            <button
              onClick={() => selectTab('voice')}
              className={`flex-1 h-11 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'voice' ? 'bg-amber-500 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              <i className="ri-mic-line"></i>
              Voice Site Log
            </button>
            <button
              onClick={() => selectTab('scan')}
              className={`flex-1 h-11 rounded-full text-sm font-semibold flex items-center justify-center gap-2 transition-colors ${
                activeTab === 'scan' ? 'bg-amber-500 text-white' : 'text-slate-300 hover:text-white'
              }`}
            >
              <i className="ri-scan-2-line"></i>
              OCR Scanner
            </button>
          </div>
        </div>
      </header>

      {/* Tab content */}
      <main className="px-4 py-4">
        {activeTab === 'voice' ? <VoiceLogTab /> : <ScannerTab />}
      </main>

      <FieldBottomNav />

      <style>{`
        @keyframes pingSlow {
          0% { transform: scale(0.8); opacity: 0.6; }
          70% { transform: scale(1.4); opacity: 0; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        .animate-ping-slow { animation: pingSlow 2s cubic-bezier(0, 0, 0.2, 1) infinite; }

        @keyframes waveBar {
          0%, 100% { transform: scaleY(0.25); }
          50% { transform: scaleY(1); }
        }
        .wave-bar { height: 48px; animation: waveBar 1s ease-in-out infinite; }

        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }

        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-down { animation: slideDown 0.18s ease-out; }

        @keyframes scanline {
          0% { transform: translateY(0); }
          50% { transform: translateY(40px); }
          100% { transform: translateY(0); }
        }
        .scan-line { animation: scanline 1.4s ease-in-out infinite; }
      `}</style>
    </div>
  );
}