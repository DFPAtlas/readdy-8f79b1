// BuildNerve — Dispute Resolution UI helpers (formatting + status tones).
import type { DisputeStatus } from '@/types/disputes';

export function formatPence(pence: number | null | undefined, currency = 'GBP'): string {
  if (pence === null || pence === undefined) return '—';
  const symbol = currency === 'EUR' ? '€' : currency === 'USD' ? '$' : '£';
  const value = pence / 100;
  return `${symbol}${value.toLocaleString('en-GB', {
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  })}`;
}

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function daysUntil(iso: string | null | undefined): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const now = Date.now();
  return Math.ceil((d.getTime() - now) / (1000 * 60 * 60 * 24));
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export interface Tone {
  text: string;
  bg: string;
  dot: string;
}

const TONES: Record<DisputeStatus, Tone> = {
  draft: { text: 'text-muted', bg: 'bg-page', dot: 'bg-border' },
  open: { text: 'text-primary-700', bg: 'bg-primary-100', dot: 'bg-primary-500' },
  awaiting_response: { text: 'text-status-amber', bg: 'bg-status-amber-pale', dot: 'bg-status-amber' },
  under_discussion: { text: 'text-status-amber', bg: 'bg-status-amber-pale', dot: 'bg-status-amber' },
  evidence_collection: { text: 'text-status-green', bg: 'bg-status-green-pale', dot: 'bg-status-green' },
  negotiation: { text: 'text-status-amber', bg: 'bg-status-amber-pale', dot: 'bg-status-amber' },
  mediation_considered: { text: 'text-status-amber', bg: 'bg-status-amber-pale', dot: 'bg-status-amber' },
  pre_action: { text: 'text-status-red', bg: 'bg-status-red-pale', dot: 'bg-status-red' },
  resolved: { text: 'text-status-green', bg: 'bg-status-green-pale', dot: 'bg-status-green' },
  withdrawn: { text: 'text-muted', bg: 'bg-page', dot: 'bg-border' },
  closed: { text: 'text-muted', bg: 'bg-page', dot: 'bg-border' },
};

export function statusTone(status: string): Tone {
  return TONES[status as DisputeStatus] ?? TONES.open;
}