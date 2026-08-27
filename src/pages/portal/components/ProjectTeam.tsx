import { projectTeam } from '@/mocks/clientHub';
import { useToast } from '@/components/base/Toast';

export default function ProjectTeam() {
  const { showToast } = useToast();

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-5">
      <h2 className="text-base font-semibold text-slate-900">Assigned Project Team</h2>
      <p className="text-xs text-slate-500 mt-1 mb-4">Your dedicated point of contact</p>

      <div className="flex items-center gap-3 mb-4">
        <span className="w-12 h-12 flex items-center justify-center rounded-full bg-indigo-100 text-indigo-600 text-base font-bold">
          {projectTeam.initials}
        </span>
        <div>
          <p className="text-sm font-semibold text-slate-900">{projectTeam.name}</p>
          <p className="text-xs text-slate-500">{projectTeam.role}</p>
        </div>
      </div>

      <div className="flex gap-2">
        <a
          href={`tel:${projectTeam.phone.replace(/\s/g, '')}`}
          className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 border border-slate-200 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-50 cursor-pointer whitespace-nowrap transition-colors"
        >
          <i className="ri-phone-line"></i> Call
        </a>
        <a
          href={`mailto:${projectTeam.email}`}
          className="flex-1 h-10 inline-flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl cursor-pointer whitespace-nowrap transition-colors"
        >
          <i className="ri-mail-line"></i> Email
        </a>
      </div>

      <p className="text-[11px] text-slate-400 mt-3">{projectTeam.phone} · {projectTeam.email}</p>
    </div>
  );
}