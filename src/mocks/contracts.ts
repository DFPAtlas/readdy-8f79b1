// Phase 20 — AI Contract Parsing demo data
// Used as a clearly-labelled fallback when AI extraction isn't configured,
// and to power the job-detail contract terms summary.

export interface DemoContractTerm {
  field_name: string;
  field_label: string;
  extracted_value: string;
  confidence_score: number;
}

export const demoContractTerms: DemoContractTerm[] = [
  { field_name: 'contract_type', field_label: 'Contract type', extracted_value: 'JCT', confidence_score: 0.92 },
  { field_name: 'payment_period_days', field_label: 'Payment period (days)', extracted_value: '30', confidence_score: 0.85 },
  { field_name: 'notice_period_days', field_label: 'Notice period (days)', extracted_value: '5', confidence_score: 0.8 },
  { field_name: 'final_date_for_payment_days', field_label: 'Final date for payment (days)', extracted_value: '14', confidence_score: 0.88 },
  { field_name: 'retention_percentage', field_label: 'Retention (%)', extracted_value: '5', confidence_score: 0.9 },
  { field_name: 'retention_release_stages', field_label: 'Retention release stages', extracted_value: '50% at practical completion, 50% after defects liability period', confidence_score: 0.7 },
  { field_name: 'defects_liability_months', field_label: 'Defects liability period (months)', extracted_value: '12', confidence_score: 0.82 },
  { field_name: 'liquidated_damages', field_label: 'Liquidated damages', extracted_value: '£100 per week', confidence_score: 0.65 },
  { field_name: 'payment_terms', field_label: 'Payment terms', extracted_value: 'Monthly interim payments, 14 days from certification', confidence_score: 0.78 },
  { field_name: 'insurance_requirements', field_label: 'Insurance requirements', extracted_value: 'Public liability £5m, employer\u2019s liability £10m', confidence_score: 0.72 },
  { field_name: 'governing_law', field_label: 'Governing law', extracted_value: 'England and Wales', confidence_score: 0.9 },
  { field_name: 'adjudication', field_label: 'Dispute resolution', extracted_value: 'Housing Grants, Construction and Regeneration Act 1996', confidence_score: 0.6 },
];

export function confidenceLabel(score: number | null): 'High' | 'Medium' | 'Low' {
  if (score === null) return 'Low';
  if (score >= 0.8) return 'High';
  if (score >= 0.5) return 'Medium';
  return 'Low';
}