import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '@/contexts/OrgContext';
import { materialService } from '@/services/procurement.service';

export default function ProcurementMaterials() {
  const navigate = useNavigate();
  const { organisation } = useOrg();
  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    if (!organisation?.id) return;
    materialService.getActiveMaterials(organisation.id)
      .then(setMaterials)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [organisation?.id]);

  const categories = Array.from(new Set((materials || []).map((m: any) => m.category).filter(Boolean))) as string[];

  const filtered = (materials || []).filter((m: any) => {
    if (categoryFilter !== 'all' && m.category !== categoryFilter) return false;
    if (search && !m.description.toLowerCase().includes(search.toLowerCase()) && !(m.internal_code || '').toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-foreground-600">Loading materials...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground-950">Materials Catalogue</h1>
          <p className="text-sm text-foreground-600 mt-1">{materials.length} items in your catalogue</p>
        </div>
        <button className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors whitespace-nowrap cursor-pointer">
          <i className="ri-add-line text-base" />
          Add material
        </button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-500 text-sm" />
          <input
            type="text"
            placeholder="Search by description or code..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-400"
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setCategoryFilter('all')}
            className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${categoryFilter === 'all' ? 'bg-primary-500 text-background-50' : 'bg-background-100 text-foreground-700 hover:bg-background-200'}`}
          >All</button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${categoryFilter === cat ? 'bg-primary-500 text-background-50' : 'bg-background-100 text-foreground-700 hover:bg-background-200'}`}
            >{cat}</button>
          ))}
        </div>
      </div>

      <div className="bg-background-50 border border-background-200/70 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-background-200/70 bg-background-100">
                <th className="text-left px-4 py-3 font-semibold text-foreground-800 whitespace-nowrap">Code</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground-800">Description</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground-800 whitespace-nowrap">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground-800 whitespace-nowrap">Unit</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground-800 whitespace-nowrap">Supplier</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground-800 whitespace-nowrap">Latest cost</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item: any) => (
                <tr key={item.id} className="border-b border-background-200/70 hover:bg-background-100/50 transition-colors cursor-pointer">
                  <td className="px-4 py-3 text-foreground-600 font-mono text-xs whitespace-nowrap">{item.internal_code || '—'}</td>
                  <td className="px-4 py-3 text-foreground-900 font-medium">{item.description}</td>
                  <td className="px-4 py-3 text-foreground-600 whitespace-nowrap">{item.category || '—'}</td>
                  <td className="px-4 py-3 text-foreground-600 whitespace-nowrap">{item.unit_of_measure}</td>
                  <td className="px-4 py-3 text-foreground-700 whitespace-nowrap">{item.preferred_supplier?.trading_name || '—'}</td>
                  <td className="px-4 py-3 text-right text-foreground-900 font-medium whitespace-nowrap">
                    {item.latest_cost_pence != null ? `£${(item.latest_cost_pence / 100).toFixed(2)}` : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-foreground-600">No materials match your search</p>
          </div>
        )}
      </div>
    </div>
  );
}