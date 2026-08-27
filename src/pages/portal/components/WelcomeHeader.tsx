import { useState } from 'react';
import { hubClient, projectTeam } from '@/mocks/clientHub';
import { useToast } from '@/components/base/Toast';

export default function WelcomeHeader() {
  const { showToast } = useToast();
  const [composeOpen, setComposeOpen] = useState(false);
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (!message.trim()) return;
    showToast(`Message sent to ${projectTeam.name}`, 'success');
    setMessage('');
    setComposeOpen(false);
  };

  return (
    <>
      <header className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-5">
        <div>
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
              {hubClient.projectBadge}
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">{hubClient.greeting}</h1>
          <p className="text-sm text-slate-500 mt-1.5">Project: {hubClient.projectName}</p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl cursor-pointer whitespace-nowrap transition-colors"
            onClick={() => setComposeOpen(true)}
          >
            <i className="ri-chat-3-line"></i>
            Message Project Manager
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 h-11 px-5 border border-slate-200 text-slate-700 hover:bg-slate-50 text-sm font-semibold rounded-xl cursor-pointer whitespace-nowrap transition-colors"
            onClick={() => showToast('Preparing your latest progress report…', 'info')}
          >
            <i className="ri-download-2-line"></i>
            Download Progress Report (.PDF)
          </button>
        </div>
      </header>

      {/* Compose message modal */}
      {composeOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-slate-900/40" onClick={() => setComposeOpen(false)}></div>
          <div className="relative bg-white rounded-2xl w-[90vw] max-w-md p-6 z-10">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-sm font-bold">
                {projectTeam.initials}
              </span>
              <div>
                <h3 className="text-base font-semibold text-slate-900">Message {projectTeam.name}</h3>
                <p className="text-xs text-slate-500">{projectTeam.role}</p>
              </div>
            </div>
            <textarea
              className="w-full h-28 px-3 py-2 border border-slate-200 rounded-xl text-sm resize-none focus:outline-none focus:border-indigo-300 focus:ring-1 focus:ring-indigo-300"
              placeholder="Ask a question, request a site update, or raise a query…"
              maxLength={500}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="text-[10px] text-slate-400 text-right mt-1">{message.length}/500</p>
            <div className="flex gap-3 mt-4">
              <button
                className="flex-1 h-11 border border-slate-200 text-slate-700 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                onClick={() => setComposeOpen(false)}
              >
                Cancel
              </button>
              <button
                className="flex-1 h-11 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={!message.trim()}
                onClick={handleSend}
              >
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}