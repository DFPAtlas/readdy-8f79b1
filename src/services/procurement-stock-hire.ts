import type { StockHireAction } from './procurement-writes.service';
export const hireActions: Partial<Record<string, {
    action: StockHireAction;
    label: string;
}[]>> = { requested: [{ action: 'confirm_hire', label: 'Record supplier confirmation' }, { action: 'cancel_hire', label: 'Cancel request' }], confirmed: [{ action: 'start_hire', label: 'Record arrival / start' }, { action: 'extend_hire', label: 'Record agreed extension' }, { action: 'cancel_hire', label: 'Record supplier cancellation' }, { action: 'dispute_hire', label: 'Record dispute' }], on_hire: [{ action: 'extend_hire', label: 'Record agreed extension' }, { action: 'off_hire', label: 'Record supplier-confirmed off-hire' }, { action: 'dispute_hire', label: 'Record dispute' }], off_hired: [{ action: 'close_hire', label: 'Record collection / close' }, { action: 'dispute_hire', label: 'Record dispute' }], disputed: [{ action: 'resolve_hire', label: 'Resolve dispute' }] };
