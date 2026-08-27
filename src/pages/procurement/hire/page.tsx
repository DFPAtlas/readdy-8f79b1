import { useState, useEffect } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { hireService } from '@/services/procurement.service';
import type { PlantHireRecord } from '@/services/procurement.service';

const STATUS_COLORS: Record<string, string> = {
  requested: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-secondary-100 text-secondary-700',
  on_hire: 'bg-green-100 text-green-700',
  off_hired: 'bg-background-200 text-foreground-600',
  disputed: 'bg-red-100 text-red-700',
  closed: 'bg-background-200 text-foreground-500',
};

export default function ProcurementHire() {
  const { organisation } = useOrg();
  const [records, setRecords] = useState<PlantHireRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!organisation?.id) return;
    hireService.getHireRecords(organisation.id)
      .then(setRecords)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [organisation?.id]);

  const onHire = records.filter((r) => r.status === 'on_hire');
  const dueBack = onHire.filter((r) => {
    if (!r.hire_end_date) return false;
    const d = new Date(r.hire_end_date);
    const now = new Date();
    const weekEnd = new Date(now);
    weekEnd.setDate(weekEnd.getDate() + 7);
    return d <= weekEnd;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-foreground-600">Loading hire records...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground-950">Plant &amp; Tool Hire</h1>
          <p className="text-sm text-foreground-600 mt-1">{onHire.length} currently on hire, {dueBack.length} due back this week</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors whitespace-nowrap cursor-pointer">
          <i className="ri-add-line text-base" />
          Record hire
        </button>
      </div>

      {/* Due back alert */}
      {dueBack.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2">
            <i className="ri-alert-line text-amber-600 text-lg" />
            <span className="text-sm font-medium text-amber-800">{dueBack.length} item{dueBack.length !== 1 ? 's' : ''} due back this week</span>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {records.map((record) => (
          <div key={record.id} className="bg-background-50 border border-background-200/70 rounded-xl p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[record.status] || ''}`}>
                    {record.status.replace('_', ' ')}
                  </span>
                  <span className="font-semibold text-foreground-900">{record.equipment_description}</span>
                  {record.hire_reference && (
                    <span className="font-mono text-xs text-foreground-600">Ref: {record.hire_reference}</span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 text-sm text-foreground-700">
                  <span className="flex items-center gap-1">
                    <i className="ri-building-2-line text-xs" />
                    {record.supplier?.trading_name || '—'}
                  </span>
                  <span className="flex items-center gap-1">
                    <i className="ri-calendar-line text-xs" />
                    {new Date(record.hire_start_date).toLocaleDateString('en-GB')}
                    {record.hire_end_date ? ` — ${new Date(record.hire_end_date).toLocaleDateString('en-GB')}` : ''}
                  </span>
                  {record.rate_pence != null && (
                    <span className="font-medium">
                      £{(record.rate_pence / 100).toFixed(2)}/{record.charging_unit.replace('per_', '')}
                    </span>
                  )}
                </div>
                {record.operator_required && (
                  <div className="mt-2">
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Operator required</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {records.length === 0 && (
        <div className="text-center py-16 bg-background-50 border border-background-200/70 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-4">
            <i className="ri-tools-line text-2xl text-foreground-500" />
          </div>
          <h3 className="text-base font-semibold text-foreground-900">No hire records</h3>
          <p className="text-sm text-foreground-600 mt-1">Record external plant, equipment and tool hire here</p>
        </div>
      )}
    </div>
  );
}