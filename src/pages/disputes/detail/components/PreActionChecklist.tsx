import { useState } from 'react';
import type {
  PreActionChecklistItem,
  PreActionChecklistKey,
  PreActionChecklistStatus,
} from '@/types/dispute-preaction';
import {
  PRE_ACTION_CHECKLIST_LABELS,
  PRE_ACTION_CHECKLIST_KEYS,
  PRE_ACTION_CHECKLIST_STATUS_LABELS,
  PRE_ACTION_CHECKLIST_STATUSES,
} from '@/types/dispute-preaction';
import { disputePreactionService } from '@/services/dispute-preaction.service';
import { useToast } from '@/components/base/Toast';
import { formatDateTime } from '@/pages/disputes/helpers';

function statusTone(status: PreActionChecklistStatus): string {
  switch (status) {
    case 'complete':
      return 'bg-status-green-pale text-status-green';
    case 'in_progress':
      return 'bg-status-amber-pale text-status-amber';
    case 'not_applicable':
      return 'bg-page text-muted';
    case 'needs_advice':
      return 'bg-status-red-pale text-status-red';
    default:
      return 'bg-page text-muted';
  }
}

interface ChecklistRowProps {
  item: PreActionChecklistItem;
  canEdit: boolean;
  onChanged: () => void;
}

function ChecklistRow({ item, canEdit, onChanged }: ChecklistRowProps) {
  const { showToast } = useToast();
  const [status, setStatus] = useState<PreActionChecklistStatus>(item.status);
  const [note, setNote] = useState(item.note ?? '');
  const [saving, setSaving] = useState(false);

  const save = async (nextStatus: PreActionChecklistStatus, nextNote: string) => {
    if (!canEdit) return;
    setSaving(true);
    try {
      await disputePreactionService.updateChecklistItem({
        disputeId: item.dispute_id,
        itemKey: item.item_key,
        status: nextStatus,
        note: nextNote || null,
      });
      setStatus(nextStatus);
      setNote(nextNote);
      onChanged();
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Failed to update', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-border p-3.5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm font-medium text-main">{PRE_ACTION_CHECKLIST_LABELS[item.item_key]}</p>
        <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${statusTone(status)}`}>
          {PRE_ACTION_CHECKLIST_STATUS_LABELS[status]}
        </span>
      </div>

      {canEdit ? (
        <div className="mt-3 space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={status}
              disabled={saving}
              onChange={(e) => save(e.target.value as PreActionChecklistStatus, note)}
              className="h-9 px-3 rounded-lg border border-border bg-white text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary-300 cursor-pointer"
            >
              {PRE_ACTION_CHECKLIST_STATUSES.map((s) => (
                <option key={s} value={s}>{PRE_ACTION_CHECKLIST_STATUS_LABELS[s]}</option>
              ))}
            </select>
            {item.updated_by_name && item.updated_at && (
              <span className="text-[11px] text-muted">
                Last updated by {item.updated_by_name} · {formatDateTime(item.updated_at)}
              </span>
            )}
          </div>
          <div className="flex items-start gap-2">
            <input
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onBlur={() => note !== (item.note ?? '') && save(status, note)}
              placeholder="Optional note (who/what/when)"
              className="flex-1 h-9 px-3 rounded-lg border border-border bg-white text-sm text-main focus:outline-none focus:ring-2 focus:ring-primary-300"
            />
          </div>
        </div>
      ) : (
        <div className="mt-2 space-y-1">
          {item.note && <p className="text-xs text-muted">{item.note}</p>}
          {item.updated_by_name && (
            <p className="text-[11px] text-muted">
              Updated by {item.updated_by_name} · {formatDateTime(item.updated_at)}
            </p>
          )}
        </div>
      )}
    </div>
  );
}

interface PreActionChecklistProps {
  items: PreActionChecklistItem[];
  canEdit: boolean;
  onChanged: () => void;
}

export default function PreActionChecklist({ items, canEdit, onChanged }: PreActionChecklistProps) {
  const byKey = new Map(items.map((i) => [i.item_key, i]));

  const completeCount = items.filter(
    (i) => i.status === 'complete' || i.status === 'not_applicable',
  ).length;

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h3 className="text-sm font-semibold text-main">Pre-action readiness checklist</h3>
          <p className="text-xs text-muted mt-0.5">
            A guide to help you prepare — it is not legal compliance certification.
          </p>
        </div>
        <span className="text-xs font-medium text-muted bg-page px-2.5 py-1 rounded-full">
          {completeCount} of {PRE_ACTION_CHECKLIST_KEYS.length} addressed
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mt-3">
        {PRE_ACTION_CHECKLIST_KEYS.map((key: PreActionChecklistKey) => {
          const item = byKey.get(key);
          if (!item) return null;
          return <ChecklistRow key={key} item={item} canEdit={canEdit} onChanged={onChanged} />;
        })}
      </div>

      <p className="mt-3 text-[11px] text-muted flex items-start gap-1.5">
        <i className="ri-information-line flex-shrink-0 mt-0.5"></i>
        <span>
          Completing this checklist is guidance only and is not a statement that you are ready or
          required to start court proceedings, nor that you are legally compliant.
        </span>
      </p>
    </div>
  );
}