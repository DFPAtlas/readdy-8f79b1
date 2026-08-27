import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { demoComplianceMetrics } from '@/mocks/reports';
import { demoWorkforcePeople, getPassportStatusLabel, computeDaysRemaining, computeExpiryStatus } from '@/mocks/workforce';

export default function ComplianceReport() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [expandedMetric, setExpandedMetric] = useState<string | null>(null);

  const peopleWithIssues = demoWorkforcePeople.filter((p) => p.passportStatus === 'action_required' || p.passportStatus === 'review_needed');

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 md:px-6 py-5 border-b border-border">
        <div className="flex items-center gap-2 mb-1">
          <button onClick={() => navigate('/reports')} className="text-foreground-400 hover:text-foreground-600 cursor-pointer">
            <i className="ri-arrow-left-line"></i>
          </button>
          <h1 className="text-xl font-semibold text-foreground-950">{t('reports.complianceHeading')}</h1>
        </div>
        <p className="text-sm text-foreground-500">{t('reports.complianceDesc')}</p>
      </div>

      <div className="flex-1 overflow-auto p-4 md:p-6">
        {/* Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          {demoComplianceMetrics.map((m) => (
            <button
              key={m.id}
              onClick={() => setExpandedMetric(expandedMetric === m.id ? null : m.id)}
              className="bg-white border border-border rounded-xl p-4 text-left hover:border-primary-200 transition-colors cursor-pointer"
            >
              <p className="text-xs text-foreground-500 mb-1">{m.label}</p>
              <p className="text-xl font-bold text-foreground-950">{m.value}</p>
              {m.denominator && (
                <p className="text-[10px] text-foreground-400 mt-1">{m.denominator}</p>
              )}
              {expandedMetric === m.id && m.explanation && (
                <p className="text-[10px] text-foreground-500 mt-2 p-2 bg-background-50 rounded-lg">{m.explanation}</p>
              )}
            </button>
          ))}
        </div>

        <p className="text-[11px] text-foreground-400 mb-6">{t('reports.calculationNote')}</p>

        {/* Workers needing attention */}
        {peopleWithIssues.length > 0 && (
          <div className="bg-white border border-border rounded-xl p-5">
            <h3 className="text-sm font-semibold text-foreground-950 mb-4">{t('reports.actionRequired')}</h3>
            <div className="space-y-3">
              {peopleWithIssues.map((person) => (
                <div key={person.id} className="flex items-center justify-between p-3 bg-background-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center">
                      <span className="text-xs font-semibold text-amber-700">{person.initials}</span>
                    </div>
                    <div>
                      <button onClick={() => navigate(`/workforce/${person.id}`)} className="text-sm font-medium text-foreground-800 hover:text-primary-600 cursor-pointer">
                        {person.displayName}
                      </button>
                      <p className="text-xs text-foreground-400">
                        {person.companyName || 'Employee'} · {person.primaryTrade}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {person.nextExpiryLabel && (
                      <div className="text-right">
                        <p className="text-[10px] text-foreground-400">{person.nextExpiryLabel}</p>
                        <p className={`text-xs font-semibold ${computeExpiryStatus(person.nextExpiryDate) === 'urgent' ? 'text-red-600' : 'text-amber-600'}`}>
                          {person.nextExpiryDate}
                          {person.nextExpiryDate && (
                            <span className="ml-1 text-[10px]">({computeDaysRemaining(person.nextExpiryDate)}d)</span>
                          )}
                        </p>
                      </div>
                    )}
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                      person.passportStatus === 'action_required' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-700'
                    }`}>
                      {getPassportStatusLabel(person.passportStatus)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}