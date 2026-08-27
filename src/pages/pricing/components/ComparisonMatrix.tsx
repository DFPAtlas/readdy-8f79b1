import { useState } from 'react';
import { comparisonCategories, plans, type ComparisonCell } from '@/mocks/pricing';

function renderCell(cell: ComparisonCell) {
  if (cell === true) {
    return <i className="ri-check-line text-status-green text-lg"></i>;
  }
  if (cell === false) {
    return <span className="text-muted/40">—</span>;
  }
  return <span className="text-xs font-medium text-main">{cell}</span>;
}

export default function ComparisonMatrix() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="max-w-6xl mx-auto px-4 md:px-6 py-16 md:py-24">
      <div className="text-center mb-10">
        <h2 className="text-2xl md:text-3xl font-bold text-main font-display tracking-tight">
          Compare All Platform Capabilities Side-by-Side
        </h2>
        <p className="text-sm text-muted mt-3 max-w-xl mx-auto leading-relaxed">
          Expand each category to see exactly what&apos;s included at every tier.
        </p>
      </div>

      <div className="space-y-3">
        {comparisonCategories.map((category, idx) => {
          const isOpen = openIndex === idx;
          return (
            <div key={category.title} className="bg-white rounded-2xl border border-border overflow-hidden">
              <button
                onClick={() => setOpenIndex(isOpen ? null : idx)}
                className="w-full flex items-center justify-between gap-4 px-5 md:px-6 py-4 cursor-pointer text-left hover:bg-page transition-colors"
              >
                <span className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-lg bg-primary-50 text-primary-500 flex items-center justify-center">
                    <i className={category.icon}></i>
                  </span>
                  <span className="text-sm md:text-base font-semibold text-main">{category.title}</span>
                </span>
                <i
                  className={`ri-arrow-down-s-line text-muted text-lg transition-transform ${isOpen ? 'rotate-180' : ''}`}
                ></i>
              </button>

              {isOpen && (
                <div className="overflow-x-auto border-t border-border">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="bg-page/60">
                        <th className="text-left py-3 px-6 text-xs text-muted uppercase tracking-wider font-medium w-72">
                          Feature
                        </th>
                        {plans.map((plan) => (
                          <th
                            key={plan.key}
                            className={`text-center py-3 px-4 text-xs uppercase tracking-wider font-medium ${
                              plan.featured ? 'text-primary-500' : 'text-muted'
                            }`}
                          >
                            {plan.shortName}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {category.rows.map((row) => (
                        <tr key={row.label} className="border-t border-border first:border-t-0">
                          <td className="py-3 px-6 font-medium text-main">{row.label}</td>
                          {row.cells.map((cell, i) => (
                            <td key={i} className="py-3 px-4 text-center">
                              {renderCell(cell)}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}