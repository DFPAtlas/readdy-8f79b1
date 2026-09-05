// BuildNerve Disputes 12 — Launch-readiness types.

export type ReadinessStatus = 'pass' | 'fail' | 'manual' | 'not_configured';
export type ReadinessVerdict = 'GO' | 'CONDITIONAL_GO' | 'NO_GO';
export type ReadinessGroup = 'critical_security' | 'critical_functional' | 'legal_governance';

export interface ReadinessCheck {
  id: string;
  group: ReadinessGroup;
  title: string;
  status: ReadinessStatus;
  evidence: string;
  automated: boolean;
  blocking: boolean;
  remediation: string;
  last_checked: string;
}

export interface BehaviouralTest {
  id: string;
  group: string;
  title: string;
  pass: boolean;
  skipped: boolean;
  evidence: string;
}

export interface ManualGate {
  gate_key: string;
  label: string;
  legal: boolean;
  approved: boolean;
  approved_by_name: string | null;
  approved_at: string | null;
  note: string | null;
}

export interface TestSuiteSummary {
  total: number;
  passed: number;
  failed: number;
  ready: boolean;
}

export interface TestSuiteResult {
  summary: TestSuiteSummary;
  ready: boolean;
  reason: string;
  tests: BehaviouralTest[];
  generated_at: string;
}

export interface ReadinessResult {
  verdict: ReadinessVerdict;
  blocking: string[];
  controlling: string[];
  checks: ReadinessCheck[];
  tests: BehaviouralTest[];
  suiteReady: boolean;
  suiteReason: string;
  gates: ManualGate[];
  gatesApproved: boolean;
  generated_at: string;
  canApproveLegal: boolean;
  canApproveOperational: boolean;
  myPermissions: string[];
}