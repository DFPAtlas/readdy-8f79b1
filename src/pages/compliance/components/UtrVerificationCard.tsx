import { useState, useRef } from 'react';
import { findSubcontractorByUtr } from '@/mocks/cis';

interface VerificationResult {
  name: string;
  status: string;
  statusColor: string;
  verNumber: string;
  stampDate: string;
}

export default function UtrVerificationCard() {
  const [utr, setUtr] = useState('');
  const [identifier, setIdentifier] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [error, setError] = useState('');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleVerify = () => {
    const cleanUtr = utr.replace(/\s/g, '');
    if (cleanUtr.length !== 10 || !/^\d{10}$/.test(cleanUtr)) {
      setError('Enter a valid 10-digit UTR number.');
      setResult(null);
      return;
    }
    setError('');
    setResult(null);
    setVerifying(true);

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const match = findSubcontractorByUtr(cleanUtr);
      const name = match?.name ?? 'Apex Brickwork Ltd';
      const rate = match?.deductionRate ?? '20%';
      const isGross = match?.verificationStatus === 'gross';
      const isUnverified = match?.verificationStatus === 'unverified';

      let status: string;
      let statusColor: string;
      if (isGross) {
        status = 'VERIFIED — GROSS PAYMENT STATUS (0%)';
        statusColor = 'bg-status-blue-pale text-status-blue';
      } else if (isUnverified) {
        status = 'UNVERIFIED — HIGHER RATE 30%';
        statusColor = 'bg-status-red-pale text-status-red';
      } else {
        status = `VERIFIED — STANDARD ${rate}`;
        statusColor = 'bg-status-green-pale text-status-green';
      }

      setResult({
        name,
        status,
        statusColor,
        verNumber: match?.verRegNo !== '—' ? match.verRegNo : 'V000984721',
        stampDate: new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: 'short',
          year: 'numeric',
        }),
      });
      setVerifying(false);
    }, 1200);
  };

  const handleUtrChange = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 10);
    setUtr(digits.replace(/(\d{5})(?=\d)/g, '$1 '));
  };

  return (
    <div className="bg-white border border-status-amber/30 rounded-xl p-5 md:p-6 relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-status-amber to-primary-500"></div>

      <div className="flex items-start gap-3">
        <div className="w-11 h-11 rounded-xl bg-status-amber-pale text-status-amber flex items-center justify-center flex-shrink-0">
          <i className="ri-fingerprint-line text-xl"></i>
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="text-base font-semibold text-main">HMRC Automated UTR Verification</h2>
          <p className="text-sm text-muted mt-0.5">
            Instant look-up against HMRC's CIS register to confirm deduction status before payments.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
        <div>
          <label htmlFor="cis-utr" className="block text-xs font-medium text-main mb-1.5">
            Subcontractor UTR
          </label>
          <input
            id="cis-utr"
            type="text"
            inputMode="numeric"
            value={utr}
            onChange={(e) => handleUtrChange(e.target.value)}
            placeholder="e.g. 38729 14056"
            className="w-full h-11 px-4 bg-page rounded-lg text-sm text-main placeholder:text-muted border border-border focus:border-primary-300 focus:ring-2 focus:ring-primary-50 outline-none transition-all tabular-nums"
          />
        </div>
        <div>
          <label htmlFor="cis-ni" className="block text-xs font-medium text-main mb-1.5">
            NI Number / Company Reg No.
          </label>
          <input
            id="cis-ni"
            type="text"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            placeholder="e.g. QQ 12 34 56 C"
            className="w-full h-11 px-4 bg-page rounded-lg text-sm text-main placeholder:text-muted border border-border focus:border-primary-300 focus:ring-2 focus:ring-primary-50 outline-none transition-all"
          />
        </div>
        <div className="flex items-end">
          <button
            onClick={handleVerify}
            disabled={verifying}
            className="w-full h-11 px-4 bg-primary-500 hover:bg-primary-600 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors whitespace-nowrap flex items-center justify-center gap-2 cursor-pointer"
          >
            {verifying ? (
              <>
                <span className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin"></span>
                Verifying…
              </>
            ) : (
              <>
                <i className="ri-search-line text-base"></i>
                Verify via HMRC API
              </>
            )}
          </button>
        </div>
      </div>

      {error && (
        <div className="mt-4 flex items-center gap-2 text-sm text-status-red bg-status-red-pale rounded-lg px-4 py-3">
          <i className="ri-error-warning-line text-base"></i>
          {error}
        </div>
      )}

      {result && (
        <div className="mt-4 rounded-lg border border-border bg-page/60 p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-semibold text-muted uppercase tracking-wider">HMRC API Response</span>
            <span className="text-xs text-muted flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-status-green"></span>
              Live response
            </span>
          </div>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
            <div>
              <dt className="text-xs text-muted">Subcontractor name</dt>
              <dd className="text-sm font-semibold text-main mt-0.5">{result.name}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Match status</dt>
              <dd className="mt-0.5">
                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold rounded-full px-2.5 py-1 ${result.statusColor} whitespace-nowrap`}>
                  <i className="ri-shield-check-line text-sm"></i>
                  {result.status}
                </span>
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted">HMRC verification number</dt>
              <dd className="text-sm font-semibold text-main mt-0.5 tabular-nums">{result.verNumber}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Stamp date</dt>
              <dd className="text-sm font-semibold text-main mt-0.5">{result.stampDate}</dd>
            </div>
          </dl>
        </div>
      )}
    </div>
  );
}