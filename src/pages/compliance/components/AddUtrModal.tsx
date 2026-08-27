import { useState } from 'react';
import { useToast } from '@/components/base/Toast';

interface AddUtrModalProps {
  open: boolean;
  onClose: () => void;
}

export default function AddUtrModal({ open, onClose }: AddUtrModalProps) {
  const { showToast } = useToast();
  const [name, setName] = useState('');
  const [trade, setTrade] = useState('Masonry');
  const [utr, setUtr] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [drcActive, setDrcActive] = useState(true);
  const [error, setError] = useState('');

  if (!open) return null;

  const trades = [
    'Masonry',
    'Electrical',
    'Plumbing',
    'Scaffolding',
    'Plastering',
    'Groundworks',
    'Roofing',
    'Steel fixing',
    'Joinery',
    'Mechanical / HVAC',
    'Painting & Decorating',
    'Drylining',
  ];

  const handleSubmit = () => {
    const cleanUtr = utr.replace(/\s/g, '');
    if (!name.trim()) {
      setError('Enter a subcontractor or trading name.');
      return;
    }
    if (cleanUtr.length !== 10 || !/^\d{10}$/.test(cleanUtr)) {
      setError('Enter a valid 10-digit UTR number.');
      return;
    }
    setError('');
    showToast(`${name} added to the compliance register.`, 'success');
    resetAndClose();
  };

  const resetAndClose = () => {
    setName('');
    setTrade('Masonry');
    setUtr('');
    setIdentifier('');
    setVatNumber('');
    setDrcActive(true);
    setError('');
    onClose();
  };

  const handleUtrChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    setUtr(digits.replace(/(\d{5})(?=\d)/g, '$1 '));
  };

  return (
    <div className="fixed inset-0 z-[70]" role="dialog" aria-modal="true" aria-labelledby="add-utr-title">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-white rounded-2xl shadow-xl w-[92vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between p-5 md:p-6 border-b border-border">
          <div>
            <h2 id="add-utr-title" className="text-lg font-semibold text-main">Add subcontractor UTR</h2>
            <p className="text-sm text-muted mt-0.5">Register a subcontractor for CIS verification and deduction tracking.</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-lg text-muted hover:bg-page hover:text-main transition-colors cursor-pointer"
            aria-label="Close"
          >
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        <div className="p-5 md:p-6 space-y-4">
          <div>
            <label htmlFor="add-name" className="block text-xs font-medium text-main mb-1.5">Trading / company name</label>
            <input
              id="add-name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Apex Brickwork Ltd"
              className="w-full h-11 px-4 bg-page rounded-lg text-sm text-main placeholder:text-muted border border-border focus:border-primary-300 focus:ring-2 focus:ring-primary-50 outline-none transition-all"
            />
          </div>

          <div>
            <label htmlFor="add-trade" className="block text-xs font-medium text-main mb-1.5">Trade</label>
            <select
              id="add-trade"
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
              className="w-full h-11 px-4 bg-page rounded-lg text-sm text-main border border-border focus:border-primary-300 focus:ring-2 focus:ring-primary-50 outline-none transition-all cursor-pointer"
            >
              {trades.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label htmlFor="add-utr" className="block text-xs font-medium text-main mb-1.5">UTR number</label>
              <input
                id="add-utr"
                type="text"
                inputMode="numeric"
                value={utr}
                onChange={(e) => handleUtrChange(e.target.value)}
                placeholder="10 digits"
                className="w-full h-11 px-4 bg-page rounded-lg text-sm text-main placeholder:text-muted border border-border focus:border-primary-300 focus:ring-2 focus:ring-primary-50 outline-none transition-all tabular-nums"
              />
            </div>
            <div>
              <label htmlFor="add-ni" className="block text-xs font-medium text-main mb-1.5">NI / Company reg no.</label>
              <input
                id="add-ni"
                type="text"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                placeholder="e.g. QQ 12 34 56 C"
                className="w-full h-11 px-4 bg-page rounded-lg text-sm text-main placeholder:text-muted border border-border focus:border-primary-300 focus:ring-2 focus:ring-primary-50 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label htmlFor="add-vat" className="block text-xs font-medium text-main mb-1.5">VAT registration number</label>
            <input
              id="add-vat"
              type="text"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              placeholder="e.g. GB 287 4410 92"
              className="w-full h-11 px-4 bg-page rounded-lg text-sm text-main placeholder:text-muted border border-border focus:border-primary-300 focus:ring-2 focus:ring-primary-50 outline-none transition-all"
            />
          </div>

          <button
            onClick={() => setDrcActive(!drcActive)}
            className="w-full flex items-center justify-between px-4 py-3 bg-page rounded-lg border border-border cursor-pointer"
            aria-pressed={drcActive}
          >
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${drcActive ? 'bg-status-green-pale text-status-green' : 'bg-page text-muted'}`}>
                <i className="ri-percent-line text-lg"></i>
              </div>
              <div className="text-left">
                <p className="text-sm font-medium text-main">Domestic Reverse Charge (DRC)</p>
                <p className="text-xs text-muted">VAT accounted for by the contractor, not the subcontractor</p>
              </div>
            </div>
            <i className={`${drcActive ? 'ri-toggle-fill text-status-green' : 'ri-toggle-line text-muted'} text-2xl`}></i>
          </button>

          {error && (
            <div className="flex items-center gap-2 text-sm text-status-red bg-status-red-pale rounded-lg px-4 py-3">
              <i className="ri-error-warning-line text-base"></i>
              {error}
            </div>
          )}
        </div>

        <div className="flex gap-3 p-5 md:p-6 border-t border-border">
          <button
            onClick={onClose}
            className="flex-1 h-11 border border-border bg-white text-main rounded-xl text-sm font-semibold hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="flex-1 h-11 bg-primary-500 hover:bg-primary-600 text-white rounded-xl text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            Add & verify
          </button>
        </div>
      </div>
    </div>
  );
}