import { useState, useRef } from 'react';
import { contractsService } from '@/services/contracts.service';
import { demoContractTerms, confidenceLabel, type DemoContractTerm } from '@/mocks/contracts';
import { useToast } from '@/components/base/Toast';
import type { ContractDraftSummary } from '@/mocks/jobs';

interface EditableTerm {
  field_name: string;
  field_label: string;
  value: string;
  confidence: number | null;
}

interface ContractStepProps {
  orgId?: string;
  onApply: (
    commercial: {
      contractType?: string;
      paymentTerms?: string;
      retentionApplies?: boolean;
      retentionPercentage?: number;
    },
    summary: ContractDraftSummary,
  ) => void;
}

type Status = 'idle' | 'extracting' | 'ready' | 'error';

function mapDemoTerms(): EditableTerm[] {
  return demoContractTerms.map((t: DemoContractTerm) => ({
    field_name: t.field_name,
    field_label: t.field_label,
    value: t.extracted_value,
    confidence: t.confidence_score,
  }));
}

function confidenceBadge(score: number | null): { label: string; cls: string } {
  const label = confidenceLabel(score);
  if (label === 'High') return { label, cls: 'bg-primary-50 text-primary-700' };
  if (label === 'Medium') return { label, cls: 'bg-status-amber-pale text-status-amber' };
  return { label, cls: 'bg-status-red-pale text-status-red' };
}

export default function ContractStep({ orgId, onApply }: ContractStepProps) {
  const { showToast } = useToast();
  const [file, setFile] = useState<File | null>(null);
  const [fileName, setFileName] = useState('');
  const [status, setStatus] = useState<Status>('idle');
  const [terms, setTerms] = useState<EditableTerm[]>([]);
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [demoMode, setDemoMode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setTerms([]);
    setDocumentId(null);
    setDemoMode(false);
    setError(null);
    setStatus('idle');
  };

  const clearFile = () => {
    setFile(null);
    setFileName('');
    reset();
  };

  const handleFile = (f: File | null) => {
    if (!f) return;
    if (!/\.(pdf|png|jpg|jpeg|webp)$/i.test(f.name)) {
      showToast('Please upload a PDF or image file.', 'error');
      return;
    }
    setFile(f);
    setFileName(f.name);
    reset();
  };

  const handleExtract = async () => {
    if (!file) return;
    setStatus('extracting');
    setError(null);

    // No backend / org — fall back to demo terms so the wizard stays usable
    if (!orgId) {
      setTerms(mapDemoTerms());
      setDemoMode(true);
      setStatus('ready');
      showToast('AI extraction not connected — showing sample terms.', 'info');
      return;
    }

    try {
      const uploadRes = await contractsService.uploadContract(file, orgId);
      setDocumentId(uploadRes.documentId);
      try {
        const extractRes = await contractsService.extractContract(uploadRes.documentId);
        setTerms(
          extractRes.terms.map((t) => ({
            field_name: t.field_name,
            field_label: t.field_label,
            value: t.extracted_value ?? '',
            confidence: t.confidence_score ?? null,
          })),
        );
        setDemoMode(false);
        setStatus('ready');
      } catch {
        setTerms(mapDemoTerms());
        setDemoMode(true);
        setStatus('ready');
        showToast('AI extraction unavailable — showing sample terms.', 'info');
      }
    } catch {
      setTerms(mapDemoTerms());
      setDemoMode(true);
      setStatus('ready');
      showToast('Could not reach the backend — showing sample terms.', 'info');
    }
  };

  const updateTerm = (fieldName: string, value: string) => {
    setTerms((prev) => prev.map((t) => (t.field_name === fieldName ? { ...t, value } : t)));
  };

  const handleApply = async () => {
    if (terms.length === 0) return;
    const get = (key: string) => terms.find((t) => t.field_name === key)?.value ?? '';

    const retentionStr = get('retention_percentage');
    const retentionNum = parseFloat(retentionStr);
    const commercial = {
      contractType: get('contract_type') || undefined,
      paymentTerms: get('payment_terms') || undefined,
      retentionApplies: !Number.isNaN(retentionNum) && retentionStr !== '',
      retentionPercentage: !Number.isNaN(retentionNum) ? retentionNum : undefined,
    };
    const summary: ContractDraftSummary = {
      fileName,
      contractType: get('contract_type') || undefined,
      termCount: terms.length,
      documentId: documentId ?? undefined,
    };

    onApply(commercial, summary);

    // Persist confirmed terms if we have a real document
    if (documentId) {
      try {
        await contractsService.confirmContract(
          documentId,
          terms.map((t) => ({ field_name: t.field_name, confirmed_value: t.value })),
          null,
        );
      } catch {
        // non-fatal — the draft is already updated locally
      }
    }

    showToast('Contract terms applied to commercial details.', 'success');
  };

  const confidentCount = terms.filter((t) => confidenceLabel(t.confidence) === 'High').length;

  return (
    <div className="space-y-6">
      {/* Intro */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary-50 flex items-center justify-center flex-shrink-0">
          <i className="ri-file-text-line text-xl text-primary-600"></i>
        </div>
        <div>
          <p className="text-sm font-semibold text-main">Let Nerve read your contract</p>
          <p className="text-xs text-muted mt-0.5">
            Upload a JCT, NEC or bespoke contract and Nerve will extract the commercial terms so you can confirm them instead of typing them out.
          </p>
        </div>
      </div>

      {/* Dropzone / file state */}
      {!file ? (
        <div
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0] || null); }}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-colors ${
            dragOver ? 'border-primary-400 bg-primary-50/50' : 'border-border hover:border-primary-300 hover:bg-page'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg,.webp"
            className="hidden"
            onChange={(e) => handleFile(e.target.files?.[0] || null)}
          />
          <div className="w-12 h-12 rounded-2xl bg-page flex items-center justify-center mx-auto mb-3">
            <i className="ri-file-upload-line text-xl text-muted"></i>
          </div>
          <p className="text-sm font-medium text-main">Drop your contract PDF here, or click to browse</p>
          <p className="text-xs text-muted mt-1">JCT / NEC / bespoke — PDF or image, up to 20MB</p>
        </div>
      ) : (
        <div className="flex items-center gap-3 p-4 bg-page rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center flex-shrink-0">
            <i className="ri-file-pdf-line text-lg text-primary-600"></i>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-main truncate">{fileName}</p>
            <p className="text-[11px] text-muted">
              {status === 'ready' ? `${terms.length} terms extracted${demoMode ? ' · sample terms' : ''}` : status === 'extracting' ? 'Reading the contract…' : 'Ready to extract'}
            </p>
          </div>
          {status === 'idle' ? (
            <button
              onClick={handleExtract}
              className="h-9 px-4 bg-primary-500 text-white text-sm font-semibold rounded-xl hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-1.5"
            >
              <i className="ri-sparkling-2-line text-sm"></i>
              Extract with Nerve
            </button>
          ) : (
            <button
              onClick={clearFile}
              className="w-9 h-9 flex items-center justify-center rounded-lg text-muted hover:bg-border/50 hover:text-main transition-colors cursor-pointer"
              title="Remove file"
            >
              <i className="ri-close-line"></i>
            </button>
          )}
        </div>
      )}

      {/* Extracting state */}
      {status === 'extracting' && (
        <div className="flex items-center gap-3 p-4 bg-page rounded-2xl">
          <i className="ri-loader-4-line animate-spin text-primary-500 text-lg"></i>
          <div>
            <p className="text-sm font-medium text-main">Reading the contract…</p>
            <p className="text-xs text-muted">Extracting commercial terms with Nerve</p>
          </div>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && error && (
        <div className="p-4 bg-status-red-pale border border-[#F5D4D4] rounded-2xl">
          <p className="text-sm text-status-red">{error}</p>
        </div>
      )}

      {/* Terms review */}
      {status === 'ready' && terms.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-sm font-semibold text-main">Extracted terms</h4>
              <p className="text-xs text-muted mt-0.5">Review and correct anything before applying.</p>
            </div>
            <span className="text-[11px] font-medium text-muted bg-page px-2.5 py-1 rounded-full">
              {confidentCount} of {terms.length} high confidence
            </span>
          </div>

          {demoMode && (
            <div className="flex items-start gap-2.5 p-3 bg-status-amber-pale border border-[#F5E0C0] rounded-xl">
              <i className="ri-information-line text-status-amber mt-0.5"></i>
              <p className="text-xs text-main">
                <strong className="font-semibold">Sample terms.</strong> AI extraction isn&apos;t connected yet, so these are example values to show how pre-fill works. Connect Nerve to use real contract parsing.
              </p>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {terms.map((t) => {
              const badge = confidenceBadge(t.confidence);
              return (
                <div key={t.field_name} className="p-3.5 border border-border rounded-xl">
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <label className="text-xs font-semibold text-main">{t.field_label}</label>
                    <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>
                  <input
                    type="text"
                    value={t.value}
                    onChange={(e) => updateTerm(t.field_name, e.target.value)}
                    className="w-full h-9 px-3 bg-page rounded-lg text-sm text-main border border-transparent focus:border-primary-200 focus:ring-2 focus:ring-primary-50 outline-none"
                  />
                </div>
              );
            })}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleApply}
              className="h-10 px-5 bg-primary-500 text-white text-sm font-semibold rounded-xl hover:bg-primary-600 transition-colors cursor-pointer whitespace-nowrap flex items-center gap-2"
            >
              <i className="ri-check-line text-base"></i>
              Apply to commercial details
            </button>
            <button
              onClick={clearFile}
              className="h-10 px-4 border border-border text-main text-sm font-medium rounded-xl hover:bg-page transition-colors cursor-pointer whitespace-nowrap"
            >
              Remove &amp; start over
            </button>
          </div>
        </div>
      )}
    </div>
  );
}