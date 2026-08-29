import { useState, useEffect, useMemo } from 'react';
import type { Dispute } from '@/types/disputes';
import type { LetterOfClaim, LetterLegalBasis, LetterEvidenceRef, PreActionEvidenceOption } from '@/types/dispute-preaction';
import { LETTER_LEGAL_BASIS_LABELS, LETTER_LEGAL_BASIS_OPTIONS } from '@/types/dispute-preaction';
import { disputePreactionService } from '@/services/dispute-preaction.service';
import { useToast } from '@/components/base/Toast';
import { formatPence } from '@/pages/disputes/helpers';

export interface PartyPrefill {
  claimantName: string;
  claimantAddress: string;
  defendantName: string;
  defendantAddress: string;
}

interface LetterEditorModalProps {
  open: boolean;
  dispute: Dispute;
  letter: LetterOfClaim | null;
  evidenceOptions: PreActionEvidenceOption[];
  partyPrefill: PartyPrefill;
  onClose: () => void;
  onChanged: () => void;
}

interface Fields {
  claimantName: string;
  claimantAddress: string;
  defendantName: string;
  defendantAddress: string;
  contractBasis: string;
  chronology: string;
  claimBasis: string;
  legalProvisions: LetterLegalBasis[];
  otherBasis: string;
  allegedWork: string;
  amount: string;
  calculationBreakdown: string;
  requestedRemedy: string;
  evidenceReferences: LetterEvidenceRef[];
  resolutionAttempts: string;
  adrInvitation: string;
  responseDate: string;
  enclosures: string;
}

const STEPS = ['Parties & case', 'Basis of claim', 'Evidence & resolution', 'Review & draft'];

function composeLetterBody(fields: Fields, dispute: Dispute): string {
  const lines: string[] = [];
  lines.push(fields.claimantName || '[Claimant full name]');
  if (fields.claimantAddress) lines.push(fields.claimantAddress);
  lines.push('');
  lines.push(fields.defendantName || '[Defendant full name]');
  if (fields.defendantAddress) lines.push(fields.defendantAddress);
  lines.push('');
  lines.push(`Case reference: ${dispute.case_reference}`);
  lines.push('');
  lines.push('LETTER OF CLAIM');
  lines.push('');
  if (fields.contractBasis) {
    lines.push('Contract / quotation');
    lines.push(fields.contractBasis);
    lines.push('');
  }
  if (fields.chronology) {
    lines.push('Concise chronology');
    lines.push(fields.chronology);
    lines.push('');
  }
  if (fields.claimBasis) {
    lines.push('Basis of the claim');
    lines.push(fields.claimBasis);
    lines.push('');
  }
  if (fields.legalProvisions.length || fields.otherBasis) {
    lines.push('Principal provisions relied on');
    fields.legalProvisions.forEach((p) => lines.push(`- ${LETTER_LEGAL_BASIS_LABELS[p]}`));
    if (fields.otherBasis) lines.push(`- ${fields.otherBasis}`);
    lines.push('');
  }
  if (fields.allegedWork) {
    lines.push('Work alleged to be defective, incomplete or unpaid');
    lines.push(fields.allegedWork);
    lines.push('');
  }
  lines.push(`Amount claimed: ${fields.amount ? `£${fields.amount}` : '[amount]'}`);
  if (fields.calculationBreakdown) {
    lines.push('Calculation breakdown');
    lines.push(fields.calculationBreakdown);
    lines.push('');
  }
  if (fields.requestedRemedy) {
    lines.push('Remedy requested');
    lines.push(fields.requestedRemedy);
    lines.push('');
  }
  if (fields.evidenceReferences.length) {
    lines.push('Key evidence references');
    fields.evidenceReferences.forEach((e) => lines.push(`- ${e.reference} — ${e.title}`));
    lines.push('');
  }
  if (fields.resolutionAttempts) {
    lines.push('Previous attempts to resolve the dispute');
    lines.push(fields.resolutionAttempts);
    lines.push('');
  }
  if (fields.adrInvitation) {
    lines.push('Alternative dispute resolution');
    lines.push(fields.adrInvitation);
    lines.push('');
  }
  if (fields.responseDate) {
    lines.push(`Please respond by: ${fields.responseDate}`);
    lines.push('');
  }
  if (fields.enclosures) {
    lines.push('Enclosures');
    fields.enclosures.split('\n').filter(Boolean).forEach((e) => lines.push(`- ${e}`));
  }
  return lines.join('\n');
}

export default function LetterEditorModal({
  open,
  dispute,
  letter,
  evidenceOptions,
  partyPrefill,
  onClose,
  onChanged,
}: LetterEditorModalProps) {
  const { showToast } = useToast();
  const [step, setStep] = useState(0);
  const [fields, setFields] = useState<Fields>({
    claimantName: partyPrefill.claimantName,
    claimantAddress: partyPrefill.claimantAddress,
    defendantName: partyPrefill.defendantName,
    defendantAddress: partyPrefill.defendantAddress,
    contractBasis: '',
    chronology: '',
    claimBasis: '',
    legalProvisions: [],
    otherBasis: '',
    allegedWork: '',
    amount: '',
    calculationBreakdown: '',
    requestedRemedy: '',
    evidenceReferences: [],
    resolutionAttempts: '',
    adrInvitation: '',
    responseDate: '',
    enclosures: '',
  });
  const [letterBody, setLetterBody] = useState('');
  const [verified, setVerified] = useState(false);
  const [identityConfirmed, setIdentityConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Merge prefill + existing letter into fields when the modal opens.
    if (!open) return;
    setFields({
      claimantName: letter?.claimant_name ?? partyPrefill.claimantName,
      claimantAddress: letter?.claimant_address ?? partyPrefill.claimantAddress,
      defendantName: letter?.defendant_name ?? partyPrefill.defendantName,
      defendantAddress: letter?.defendant_address ?? partyPrefill.defendantAddress,
      contractBasis: letter?.contract_basis ?? '',
      chronology: letter?.chronology ?? '',
      claimBasis: letter?.claim_basis ?? '',
      legalProvisions: letter?.legal_provisions ?? [],
      otherBasis: letter?.other_basis ?? '',
      allegedWork: letter?.alleged_work ?? '',
      amount: letter?.amount_pence != null ? String(letter.amount_pence / 100) : '',
      calculationBreakdown: letter?.calculation_breakdown ?? '',
      requestedRemedy: letter?.requested_remedy ?? '',
      evidenceReferences: letter?.evidence_references ?? [],
      resolutionAttempts: letter?.resolution_attempts ?? '',
      adrInvitation: letter?.adr_invitation ?? '',
      responseDate: letter?.response_date ?? '',
      enclosures: (letter?.enclosures ?? []).join('\n'),
    });
    setLetterBody(letter?.letter_body ?? '');
    setStep(0);
    setVerified(false);
    setIdentityConfirmed(false);
    setError(null);
  }, [open, letter, partyPrefill]);

  const missingFlags = useMemo(() => {
    const flags: string[] = [];
    if (!fields.claimantName) flags.push('Claimant full name is missing');
    if (!fields.defendantName) flags.push('Defendant full name is missing');
    if (!fields.claimantAddress) flags.push('Claimant service address is missing');
    if (!fields.defendantAddress) flags.push('Defendant service address is missing');
    if (!fields.chronology) flags.push('Chronology / important dates are missing');
    if (!fields.amount) flags.push('Amount claimed is missing');
    if (fields.evidenceReferences.length === 0) flags.push('No key evidence has been selected');
    if (!fields.responseDate) flags.push('Requested response date is missing');
    return flags;
  }, [fields]);

  if (!open) return null;

  const update = (patch: Partial<Fields>) => setFields((prev) => ({ ...prev, ...patch }));

  const toggleProvision = (p: LetterLegalBasis) =>
    update({
      legalProvisions: fields.legalProvisions.includes(p)
        ? fields.legalProvisions.filter((x) => x !== p)
        : [...fields.legalProvisions, p],
    });

  const toggleEvidence = (e: PreActionEvidenceOption) =>
    update({
      evidenceReferences: fields.evidenceReferences.some((r) => r.id === e.id)
        ? fields.evidenceReferences.filter((r) => r.id !== e.id)
        : [...fields.evidenceReferences, { id: e.id, reference: e.reference, title: e.title }],
    });

  const regenerateBody = () => {
    const body = composeLetterBody(fields, dispute);
    setLetterBody(body);
  };

  const next = () => {
    if (step === 2) regenerateBody();
    setStep((s) => Math.min(3, s + 1));
  };
  const back = () => setStep((s) => Math.max(0, s - 1));

  const amountPence = fields.amount.trim() === '' ? null : Math.round(parseFloat(fields.amount) * 100);

  const save = async (thenFinalise: boolean) => {
    if (!verified || !identityConfirmed) {
      setError('Please confirm that you have verified the facts and that the claimant details are your own.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        disputeId: dispute.id,
        letterId: letter?.id ?? null,
        status: (thenFinalise ? 'ready_for_review' : 'draft') as 'draft' | 'ready_for_review',
        title: 'Letter of Claim',
        claimantName: fields.claimantName || null,
        claimantAddress: fields.claimantAddress || null,
        defendantName: fields.defendantName || null,
        defendantAddress: fields.defendantAddress || null,
        contractBasis: fields.contractBasis || null,
        chronology: fields.chronology || null,
        claimBasis: fields.claimBasis || null,
        legalProvisions: fields.legalProvisions.length ? fields.legalProvisions : null,
        otherBasis: fields.otherBasis || null,
        allegedWork: fields.allegedWork || null,
        amountPence: Number.isFinite(amountPence) ? amountPence : null,
        calculationBreakdown: fields.calculationBreakdown || null,
        requestedRemedy: fields.requestedRemedy || null,
        evidenceReferences: fields.evidenceReferences.length ? fields.evidenceReferences : null,
        resolutionAttempts: fields.resolutionAttempts || null,
        adrInvitation: fields.adrInvitation || null,
        responseDate: fields.responseDate || null,
        enclosures: fields.enclosures ? fields.enclosures.split('\n').map((s) => s.trim()).filter(Boolean) : null,
        letterBody: letterBody || null,
      };
      const res = await disputePreactionService.saveLetter(payload);
      if (thenFinalise) {
        await disputePreactionService.finaliseLetter(res.letter.id);
        showToast('Letter finalised. It is now read-only.', 'success');
      } else {
        showToast('Letter saved as draft.', 'success');
      }
      onChanged();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save letter');
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass =
    'mt-1 w-full px-3 rounded-lg border border-border bg-white text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary-300';

  return (
    <div className="fixed inset-0 z-[85] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
      <div className="relative bg-white rounded-2xl w-full max-w-3xl max-h-[92vh] flex flex-col shadow-xl">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <h3 className="text-base font-semibold text-main">
            {letter ? 'Edit Letter of Claim' : 'Draft a Letter of Claim'}
          </h3>
          <button type="button" onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-page flex items-center justify-center text-muted cursor-pointer">
            <i className="ri-close-line text-lg"></i>
          </button>
        </div>

        {/* Stepper */}
        <div className="flex items-center gap-1 px-5 py-3 border-b border-border overflow-x-auto">
          {STEPS.map((label, i) => (
            <div key={label} className="flex items-center gap-1 flex-shrink-0">
              <button
                type="button"
                onClick={() => i < step && setStep(i)}
                className={`h-8 px-3 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                  i === step ? 'bg-primary-500 text-white' : i < step ? 'bg-primary-100 text-primary-700 cursor-pointer' : 'bg-page text-muted'
                }`}
              >
                {i + 1}. {label}
              </button>
              {i < STEPS.length - 1 && <span className="text-border text-xs">·</span>}
            </div>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {step === 0 && (
            <>
              <p className="text-xs text-muted">
                These details are used as the letter heading. They are drawn from the dispute record — please verify them.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted">Claimant full name</label>
                  <input value={fields.claimantName} onChange={(e) => update({ claimantName: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted">Defendant full name</label>
                  <input value={fields.defendantName} onChange={(e) => update({ defendantName: e.target.value })} className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted">Claimant service address</label>
                  <textarea value={fields.claimantAddress} onChange={(e) => update({ claimantAddress: e.target.value })} rows={3} className={`${inputClass} py-2 resize-none`} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted">Defendant service address</label>
                  <textarea value={fields.defendantAddress} onChange={(e) => update({ defendantAddress: e.target.value })} rows={3} className={`${inputClass} py-2 resize-none`} />
                </div>
              </div>
            </>
          )}

          {step === 1 && (
            <>
              <div>
                <label className="text-xs font-medium text-muted">Relevant contract or quotation</label>
                <textarea value={fields.contractBasis} onChange={(e) => update({ contractBasis: e.target.value })} rows={3} maxLength={5000} className={`${inputClass} py-2 resize-none`} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted">Concise chronology (key dates and events)</label>
                <textarea value={fields.chronology} onChange={(e) => update({ chronology: e.target.value })} rows={4} maxLength={10000} className={`${inputClass} py-2 resize-none`} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted">Basis of the claim</label>
                <textarea value={fields.claimBasis} onChange={(e) => update({ claimBasis: e.target.value })} rows={3} maxLength={10000} className={`${inputClass} py-2 resize-none`} />
              </div>

              <div>
                <label className="text-xs font-medium text-muted">Principal contractual or statutory provisions</label>
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  {LETTER_LEGAL_BASIS_OPTIONS.map((p) => {
                    const active = fields.legalProvisions.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => toggleProvision(p)}
                        className={`h-8 px-3 rounded-full text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                          active ? 'bg-primary-100 border-primary-300 text-primary-700' : 'border-border text-muted hover:text-main'
                        }`}
                      >
                        {LETTER_LEGAL_BASIS_LABELS[p]}
                      </button>
                    );
                  })}
                </div>
                {fields.legalProvisions.includes('other') && (
                  <input
                    value={fields.otherBasis}
                    onChange={(e) => update({ otherBasis: e.target.value })}
                    placeholder="Describe the other basis"
                    className={`${inputClass} mt-2`}
                  />
                )}
                <p className="mt-2 text-[11px] text-status-amber flex items-start gap-1.5">
                  <i className="ri-error-warning-line flex-shrink-0 mt-0.5"></i>
                  <span>BuildNerve cannot confirm which legal basis applies. Review this selection carefully and obtain legal advice where necessary.</span>
                </p>
              </div>

              <div>
                <label className="text-xs font-medium text-muted">Work alleged to be defective, incomplete or unpaid</label>
                <textarea value={fields.allegedWork} onChange={(e) => update({ allegedWork: e.target.value })} rows={3} maxLength={10000} className={`${inputClass} py-2 resize-none`} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted">Amount claimed (£)</label>
                  <input value={fields.amount} onChange={(e) => update({ amount: e.target.value })} inputMode="decimal" placeholder="0.00" className={inputClass} />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted">Remedy requested</label>
                  <input value={fields.requestedRemedy} onChange={(e) => update({ requestedRemedy: e.target.value })} className={inputClass} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted">Calculation breakdown (proportionate)</label>
                <textarea value={fields.calculationBreakdown} onChange={(e) => update({ calculationBreakdown: e.target.value })} rows={3} maxLength={5000} className={`${inputClass} py-2 resize-none`} />
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div>
                <label className="text-xs font-medium text-muted">Key evidence references (only what you deliberately select)</label>
                <div className="mt-1.5 flex items-center gap-2 flex-wrap">
                  {evidenceOptions.length === 0 ? (
                    <p className="text-xs text-muted">No evidence has been added to this dispute yet.</p>
                  ) : (
                    evidenceOptions.map((e) => {
                      const active = fields.evidenceReferences.some((r) => r.id === e.id);
                      return (
                        <button
                          key={e.id}
                          type="button"
                          onClick={() => toggleEvidence(e)}
                          className={`h-8 px-3 rounded-full text-xs font-medium border transition-colors cursor-pointer whitespace-nowrap ${
                            active ? 'bg-primary-100 border-primary-300 text-primary-700' : 'border-border text-muted hover:text-main'
                          }`}
                        >
                          {e.reference}
                        </button>
                      );
                    })
                  )}
                </div>
              </div>

              <div>
                <label className="text-xs font-medium text-muted">Previous attempts to resolve the dispute</label>
                <textarea value={fields.resolutionAttempts} onChange={(e) => update({ resolutionAttempts: e.target.value })} rows={3} maxLength={10000} className={`${inputClass} py-2 resize-none`} />
              </div>
              <div>
                <label className="text-xs font-medium text-muted">ADR invitation</label>
                <textarea value={fields.adrInvitation} onChange={(e) => update({ adrInvitation: e.target.value })} rows={2} maxLength={5000} className={`${inputClass} py-2 resize-none`} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted">Requested response date</label>
                  <input type="date" value={fields.responseDate} onChange={(e) => update({ responseDate: e.target.value })} className={inputClass} />
                  <p className="text-[11px] text-muted mt-1">Confirm the date yourself — BuildNerve does not guarantee a selected period satisfies any protocol.</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted">Enclosures (one per line)</label>
                  <textarea value={fields.enclosures} onChange={(e) => update({ enclosures: e.target.value })} rows={3} className={`${inputClass} py-2 resize-none`} />
                </div>
              </div>
            </>
          )}

          {step === 3 && (
            <>
              <div className="rounded-xl border border-status-amber/30 bg-status-amber-pale p-3">
                <p className="text-xs text-main">
                  Review every source record below. Missing information is flagged rather than invented.
                  Creating a draft does not mean you are ready or required to start court proceedings.
                </p>
              </div>

              <div className="rounded-xl border border-border p-3 space-y-1">
                <p className="text-[11px] uppercase tracking-wider text-muted font-semibold">Source records used</p>
                <p className="text-xs text-main">Case reference: <span className="font-semibold">{dispute.case_reference}</span></p>
                <p className="text-xs text-main">Dispute amount: <span className="font-semibold">{formatPence(dispute.amount_disputed_pence, dispute.currency)}</span></p>
                <p className="text-xs text-main">Category: <span className="font-semibold">{dispute.dispute_category}</span></p>
                <p className="text-xs text-main">Claimant: <span className="font-semibold">{fields.claimantName || '—'}</span></p>
                <p className="text-xs text-main">Defendant: <span className="font-semibold">{fields.defendantName || '—'}</span></p>
              </div>

              {missingFlags.length > 0 && (
                <div className="rounded-xl border border-status-red/30 bg-status-red-pale p-3">
                  <p className="text-xs font-semibold text-status-red mb-1">Missing information</p>
                  <ul className="list-disc list-inside text-xs text-main space-y-0.5">
                    {missingFlags.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                </div>
              )}

              <div className="rounded-xl border border-border p-3">
                <p className="text-xs font-medium text-muted mb-1">Editable draft</p>
                <textarea
                  value={letterBody}
                  onChange={(e) => setLetterBody(e.target.value)}
                  rows={14}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-white text-xs text-main font-mono focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none"
                />
                <button type="button" onClick={regenerateBody} className="mt-2 h-8 px-3 border border-border text-xs font-medium rounded-lg hover:bg-page cursor-pointer whitespace-nowrap">
                  Regenerate from fields
                </button>
              </div>

              <div className="space-y-2">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={verified} onChange={(e) => setVerified(e.target.checked)} className="mt-0.5" />
                  <span className="text-xs text-main">I have verified that all facts, addresses, amounts and dates in this letter are correct.</span>
                </label>
                <label className="flex items-start gap-2 cursor-pointer">
                  <input type="checkbox" checked={identityConfirmed} onChange={(e) => setIdentityConfirmed(e.target.checked)} className="mt-0.5" />
                  <span className="text-xs text-main">I am the claimant named above, and these details are my own.</span>
                </label>
              </div>

              <p className="text-[11px] text-muted flex items-start gap-1.5">
                <i className="ri-shield-check-line flex-shrink-0 mt-0.5"></i>
                <span>
                  If the selected procedure may require specialist advice, consider obtaining independent legal advice before relying on this draft.
                  BuildNerve does not decide liability or confirm legal compliance.
                </span>
              </p>
            </>
          )}
        </div>

        {error && <p className="px-5 pb-2 text-sm text-status-red">{error}</p>}

        <div className="flex items-center justify-between gap-2 px-5 py-4 border-t border-border">
          <button type="button" onClick={step === 0 ? onClose : back} className="h-10 px-4 rounded-xl border border-border text-main text-sm font-medium hover:bg-page cursor-pointer whitespace-nowrap">
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          <div className="flex items-center gap-2">
            {step < 3 ? (
              <button type="button" onClick={next} className="h-10 px-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold cursor-pointer whitespace-nowrap">
                Next
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => save(false)}
                  disabled={submitting}
                  className="h-10 px-4 rounded-xl border border-border text-main text-sm font-semibold hover:bg-page disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  {submitting ? 'Saving…' : 'Save as draft'}
                </button>
                <button
                  type="button"
                  onClick={() => save(true)}
                  disabled={submitting}
                  className="h-10 px-4 rounded-xl bg-primary-500 hover:bg-primary-600 text-white text-sm font-semibold disabled:opacity-50 cursor-pointer whitespace-nowrap"
                >
                  {submitting ? 'Finalising…' : 'Finalise'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}