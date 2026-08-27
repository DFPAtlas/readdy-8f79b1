import { useNavigate } from 'react-router-dom';
import { quickNavLinks } from '@/mocks/commandCenter';

export default function QuickNavFooter() {
  const navigate = useNavigate();

  return (
    <div className="bg-primary-700 rounded-xl p-5 md:p-6 relative overflow-hidden">
      {/* Decorative pattern */}
      <div className="absolute inset-0 opacity-[0.05] pointer-events-none">
        <div className="absolute top-4 left-6 w-2 h-2 rounded-full bg-white" />
        <div className="absolute top-8 left-24 w-1.5 h-1.5 rounded-full bg-white" />
        <div className="absolute bottom-6 right-12 w-2 h-2 rounded-full bg-white" />
        <div className="absolute top-10 right-28 w-1.5 h-1.5 rounded-full bg-white" />
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-base">Quick Navigation</h3>
          <span className="text-white/50 text-xs">Jump straight into a module</span>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {quickNavLinks.map((link) => (
            <button
              key={link.id}
              onClick={() => navigate(link.route)}
              className="group bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg p-4 text-left transition-colors cursor-pointer"
            >
              <span className="w-9 h-9 rounded-lg bg-white/15 text-white flex items-center justify-center mb-3 group-hover:bg-white/25 transition-colors">
                <i className={`${link.icon} text-lg`}></i>
              </span>
              <p className="text-white text-sm font-medium leading-snug">{link.label}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}