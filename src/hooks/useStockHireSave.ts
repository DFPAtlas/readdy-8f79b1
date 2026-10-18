import { useRef, useState } from 'react';
import { useOrg } from '@/contexts/OrgContext';
import { writeStockHire, type StockHireAction } from '@/services/procurement-writes.service';
import type { Json } from '@/types/supabase';
export function useStockHireSave(onSaved: () => void) {
    const { organisation, isReadOnly } = useOrg();
    const [error, setError] = useState('');
    const [saving, setSaving] = useState(false);
    const busy = useRef(false);
    const request = useRef({ payload: '', id: crypto.randomUUID() });
    async function save(action: StockHireAction, payload: Json) {
        if (!organisation || isReadOnly || busy.current)
            return;
        const serialized = JSON.stringify({ org: organisation.id, action, payload });
        if (request.current.payload !== serialized)
            request.current = { payload: serialized, id: crypto.randomUUID() };
        busy.current = true;
        setSaving(true);
        setError('');
        try {
            await writeStockHire(organisation.id, request.current.id, action, payload);
            onSaved();
        }
        catch (reason) {
            setError(reason instanceof Error ? reason.message : 'Could not save.');
        }
        finally {
            busy.current = false;
            setSaving(false);
        }
    }
    return { save, error, saving, isReadOnly };
}
