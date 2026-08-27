import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '@/contexts/OrgContext';
import { supplierService } from '@/services/procurement.service';
import type { Supplier } from '@/services/procurement.service';

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-green-100 text-green-700',
  suspended: 'bg-amber-100 text-amber-700',
  archived: 'bg-background-200 text-foreground-600',
};

export default function SuppliersDirectory() {
  const navigate = useNavigate();
  const { organisation } = useOrg();
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    if (!organisation?.id) return;
    supplierService.getSuppliers(organisation.id)
      .then(setSuppliers)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [organisation?.id]);

  const filtered = suppliers.filter((s) => {
    if (statusFilter !== 'all' && s.status !== statusFilter) return false;
    if (search && !s.trading_name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm text-foreground-600">Loading suppliers...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-foreground-950">Suppliers</h1>
          <p className="text-sm text-foreground-600 mt-1">{suppliers.length} suppliers in your directory</p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2.5 bg-primary-500 text-background-50 rounded-lg text-sm font-medium hover:bg-primary-600 transition-colors whitespace-nowrap cursor-pointer"
        >
          <i className="ri-add-line text-base" />
          Add supplier
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <i className="ri-search-line absolute left-3 top-1/2 -translate-y-1/2 text-foreground-500 text-sm" />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-background-50 border border-background-200/70 rounded-lg text-sm text-foreground-900 focus:outline-none focus:border-primary-400"
          />
        </div>
        <div className="flex gap-2">
          {['all', 'active', 'suspended', 'archived'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === status
                  ? 'bg-primary-500 text-background-50'
                  : 'bg-background-100 text-foreground-700 hover:bg-background-200'
              }`}
            >
              {status.charAt(0).toUpperCase() + status.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Supplier grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((supplier) => (
          <div
            key={supplier.id}
            className="bg-background-50 border border-background-200/70 rounded-xl p-5 hover:border-background-300/60 transition-colors cursor-pointer"
          >
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-semibold text-foreground-950">{supplier.trading_name}</h3>
                {supplier.supplier_reference && (
                  <p className="text-xs text-foreground-600 mt-0.5">Ref: {supplier.supplier_reference}</p>
                )}
              </div>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[supplier.status] || ''}`}>
                {supplier.status}
              </span>
            </div>

            {supplier.contacts && supplier.contacts.length > 0 && (
              <div className="text-sm text-foreground-600 space-y-1 mb-3">
                {supplier.contacts.slice(0, 2).map((c) => (
                  <div key={c.id} className="flex items-center gap-2">
                    <i className="ri-user-line text-xs" />
                    <span>{c.first_name} {c.last_name}{c.job_title ? ` · ${c.job_title}` : ''}</span>
                    {c.is_primary && <span className="text-xs text-primary-600 bg-primary-100 px-1.5 py-0.5 rounded">Primary</span>}
                  </div>
                ))}
                {supplier.contacts.length > 2 && (
                  <p className="text-xs text-foreground-500">+{supplier.contacts.length - 2} more contacts</p>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2 text-xs text-foreground-600">
              {supplier.payment_terms && (
                <span className="flex items-center gap-1">
                  <i className="ri-time-line" />
                  {supplier.payment_terms}
                </span>
              )}
              {supplier.is_approved && (
                <span className="flex items-center gap-1 text-green-600">
                  <i className="ri-checkbox-circle-line" />
                  Approved
                </span>
              )}
              {supplier.internal_rating && (
                <span className="flex items-center gap-1">
                  <i className="ri-star-line" />
                  {supplier.internal_rating}/5
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 bg-background-50 border border-background-200/70 rounded-xl">
          <div className="w-14 h-14 rounded-full bg-background-100 flex items-center justify-center mx-auto mb-4">
            <i className="ri-building-2-line text-2xl text-foreground-500" />
          </div>
          <h3 className="text-base font-semibold text-foreground-900">No suppliers found</h3>
          <p className="text-sm text-foreground-600 mt-1">Add your first supplier to start procurement</p>
        </div>
      )}
    </div>
  );
}