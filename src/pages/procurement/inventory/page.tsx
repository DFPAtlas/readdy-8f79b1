import { useState, useEffect } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { inventoryService } from '@/services/procurement.service';

export default function ProcurementInventory() {
  const { organisation } = useOrg();
  const [locations, setLocations] = useState<any[]>([]);
  const [balances, setBalances] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedLocation, setSelectedLocation] = useState<string>('all');

  useEffect(() => {
    if (!organisation?.id) return;
    Promise.all([
      inventoryService.getLocations(organisation.id),
      inventoryService.getBalances(organisation.id),
    ])
      .then(([l, b]) => { setLocations(l); setBalances(b); })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [organisation?.id]);

  const filtered = selectedLocation === 'all'
    ? balances
    : balances.filter((b: any) => b.location_id === selectedLocation);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-foreground-600">Loading inventory...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground-950">Inventory</h1>
          <p className="text-sm text-foreground-600 mt-1">{locations.length} locations, {balances.length} stocked items</p>
        </div>
      </div>

      {/* Location filter */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setSelectedLocation('all')}
          className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${selectedLocation === 'all' ? 'bg-primary-500 text-background-50' : 'bg-background-100 text-foreground-700 hover:bg-background-200'}`}
        >All locations</button>
        {locations.map((loc: any) => (
          <button
            key={loc.id}
            onClick={() => setSelectedLocation(loc.id)}
            className={`px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap cursor-pointer transition-colors ${selectedLocation === loc.id ? 'bg-primary-500 text-background-50' : 'bg-background-100 text-foreground-700 hover:bg-background-200'}`}
          >
            <span className="flex items-center gap-1.5">
              <i className={`text-xs ${loc.location_type === 'main_store' ? 'ri-store-2-line' : loc.location_type === 'job_site' ? 'ri-building-line' : loc.location_type === 'vehicle' ? 'ri-truck-line' : 'ri-archive-line'}`} />
              {loc.name}
            </span>
          </button>
        ))}
      </div>

      {/* Location cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {locations.map((loc: any) => {
          const locBalances = balances.filter((b: any) => b.location_id === loc.id);
          const totalItems = locBalances.reduce((s: number, b: any) => s + Number(b.quantity_on_hand), 0);
          const lowStock = locBalances.filter((b: any) => b.reorder_level > 0 && Number(b.quantity_on_hand) <= Number(b.reorder_level)).length;
          return (
            <button
              key={loc.id}
              onClick={() => setSelectedLocation(loc.id)}
              className={`bg-background-50 border rounded-xl p-4 text-left transition-colors cursor-pointer ${selectedLocation === loc.id ? 'border-primary-400' : 'border-background-200/70 hover:border-background-300/60'}`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-lg bg-background-100 flex items-center justify-center">
                  <i className={`text-sm text-foreground-700 ${loc.location_type === 'main_store' ? 'ri-store-2-line' : loc.location_type === 'job_site' ? 'ri-building-line' : 'ri-archive-line'}`} />
                </div>
                <span className="text-sm font-semibold text-foreground-900">{loc.name}</span>
              </div>
              <p className="text-xl font-bold text-foreground-950">{totalItems}</p>
              <p className="text-xs text-foreground-600">items on hand{lowStock > 0 ? ` · ${lowStock} low stock` : ''}</p>
            </button>
          );
        })}
      </div>

      {/* Inventory table */}
      <div className="bg-background-50 border border-background-200/70 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-background-200/70 bg-background-100">
                <th className="text-left px-4 py-3 font-semibold text-foreground-800">Item</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground-800 whitespace-nowrap">Location</th>
                <th className="text-left px-4 py-3 font-semibold text-foreground-800 whitespace-nowrap">Unit</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground-800 whitespace-nowrap">On hand</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground-800 whitespace-nowrap">Reserved</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground-800 whitespace-nowrap">Available</th>
                <th className="text-right px-4 py-3 font-semibold text-foreground-800 whitespace-nowrap">Min level</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((bal: any) => {
                const available = Number(bal.quantity_on_hand) - Number(bal.reserved_quantity || 0);
                const isLow = bal.reorder_level > 0 && Number(bal.quantity_on_hand) <= Number(bal.reorder_level);
                return (
                  <tr key={bal.id} className={`border-b border-background-200/70 hover:bg-background-100/50 transition-colors ${isLow ? 'bg-amber-50/50' : ''}`}>
                    <td className="px-4 py-3">
                      <p className="text-foreground-900 font-medium">{bal.material_item?.description || '—'}</p>
                      {bal.material_item?.internal_code && (
                        <p className="text-xs text-foreground-500 font-mono">{bal.material_item.internal_code}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-foreground-600 whitespace-nowrap">{bal.location?.name || '—'}</td>
                    <td className="px-4 py-3 text-foreground-600 whitespace-nowrap">{bal.material_item?.unit_of_measure || '—'}</td>
                    <td className={`px-4 py-3 text-right font-medium whitespace-nowrap ${isLow ? 'text-amber-700' : 'text-foreground-900'}`}>
                      {Number(bal.quantity_on_hand).toFixed(2)}
                    </td>
                    <td className="px-4 py-3 text-right text-foreground-600 whitespace-nowrap">{Number(bal.reserved_quantity || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-medium text-foreground-900 whitespace-nowrap">{available.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right text-foreground-600 whitespace-nowrap">{Number(bal.minimum_level || 0).toFixed(2)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div className="text-center py-12">
            <p className="text-sm text-foreground-600">No inventory for this location</p>
          </div>
        )}
      </div>
    </div>
  );
}